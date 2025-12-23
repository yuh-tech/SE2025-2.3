/**
 * OAuth 2.0 & OpenID Connect Authorization Server
 * 
 * Entry point chính của ứng dụng
 */

import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import session from 'express-session';
import path from 'path';
import { parse as urlParse } from 'url';

// Polyfill URL.parse for oidc-provider on newer Node (URL.parse deprecated/absent)
if (typeof URL.parse !== 'function') {
  URL.parse = urlParse;
}

import { createProvider } from './provider.js';
import loginRouter from './routes/login.js';
import interactionRouter from './routes/interaction.js';
import logoutRouter from './routes/logout.js';
import { assertDbConnection, disconnectPrisma } from './utils/prisma.js';

// Configuration
const PORT = process.env.PORT || 3000;
const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;

// Create Express app
const app = express();

// Session configuration
const sessionConfig = {
  name: 'oauth.sid', // tránh trùng cookie name với client-app (cùng domain localhost)
  secret: process.env.SESSION_SECRET || ['secret-key-1', 'secret-key-2'],
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
};

// Optional: Use Redis for session storage
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
if (process.env.USE_REDIS === 'true' && process.env.REDIS_URL) {
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL,
      legacyMode: false,
    });
    
    redisClient.connect().catch(console.error);
    
    redisClient.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Connected to Redis for session storage');
    });
    
    sessionConfig.store = new RedisStore({ 
      client: redisClient,
      prefix: 'sess:',
    });
    
    console.log('🔄 Using Redis session store');
  } catch (error) {
    console.warn('⚠️  Redis not available, using memory session store');
  }
} else {
  console.log('📦 Using in-memory session store (not recommended for production)');
}

// Apply session middleware
app.use(session(sessionConfig));

// Trust proxy (for production behind reverse proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Body parser for non-OIDC routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Initialize OIDC Provider
let provider;

async function initializeProvider() {
  try {
    console.log('🚀 Initializing OAuth/OIDC Provider...');
    provider = await createProvider(ISSUER);
    
    // Store provider in app.locals for access in routes
    app.locals.provider = provider;
    
    console.log('✅ Provider initialized successfully');
    return provider;
  } catch (error) {
    console.error('❌ Failed to initialize provider:', error);
    throw error;
  }
}

// Home page
app.get('/', (req, res) => {
  const user = req.session.user;
  
  res.type('html');
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OAuth 2.0 Authorization Server</title>
      <style>
        :root {
          --bg: #0f172a;
          --card: #0b1220;
          --muted: #94a3b8;
          --text: #e2e8f0;
          --accent: #8b5cf6;
          --border: #1f2937;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: radial-gradient(circle at 20% 20%, rgba(139,92,246,0.18), transparent 24%),
                      radial-gradient(circle at 80% 0%, rgba(34,197,94,0.12), transparent 20%),
                      var(--bg);
          color: var(--text);
          min-height: 100vh;
          padding: 32px 16px;
          display: flex;
          justify-content: center;
        }
        .container {
          width: 100%;
          max-width: 1080px;
        }
        .hero {
          background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 18px;
          padding: 24px 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          backdrop-filter: blur(10px);
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .brand h1 { margin: 0; font-size: 26px; letter-spacing: -0.2px; }
        .brand p { margin: 6px 0 0 0; color: var(--muted); }
        .user-box {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 14px;
          color: #cbd5e1;
        }
        .btn {
          display: inline-block;
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.18s ease;
          border: 1px solid rgba(255,255,255,0.12);
          background: #0f172a;
          color: var(--text);
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(0,0,0,0.25); }
        .btn.primary {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          border: none;
          color: #fff;
          box-shadow: 0 12px 30px rgba(99,102,241,0.35);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 14px;
        }
        .card {
          background: #0b1220;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }
        .card h2 {
          margin: 0 0 10px 0;
          font-size: 16px;
          letter-spacing: 0.2px;
        }
        ul { list-style: none; padding: 0; margin: 0; }
        li { padding: 6px 0; color: var(--muted); }
        a { color: #a5b4fc; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .endpoint {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 13px;
          color: #e2e8f0;
          background: #0f172a;
          padding: 6px 8px;
          border-radius: 8px;
          display: inline-block;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .muted { color: var(--muted); font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          <div class="brand">
            <h1>OAuth 2.0 Authorization Server</h1>
            <p>OpenID Connect Provider — Authentication & Authorization</p>
          </div>
          <div class="user-box">
            ${user ? `
              👤 ${user.name || user.username} &nbsp;|&nbsp;
              <a class="btn" href="/session/logout">Đăng xuất</a>
            ` : `
              Bạn chưa đăng nhập &nbsp;|&nbsp;
              <a class="btn primary" href="/login">Đăng nhập</a>
            `}
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h2>OIDC Endpoints</h2>
            <ul>
              <li><a href="/.well-known/openid-configuration" target="_blank">Discovery Document</a></li>
              <li><a href="/jwks.json" target="_blank">JWKS (Public Keys)</a></li>
              <li><a href="/authorize">Authorization Endpoint</a></li>
              <li><span class="endpoint">POST /token</span></li>
              <li><span class="endpoint">GET /userinfo</span></li>
              <li><a href="/logout">End Session</a></li>
            </ul>
          </div>
          <div class="card">
            <h2>Supported Flows</h2>
            <ul>
              <li>Authorization Code (+ PKCE)</li>
              <li>Client Credentials</li>
              <li>Refresh Token</li>
              <li><span class="muted">Implicit (deprecated)</span></li>
              <li><span class="muted">Resource Owner Password (not recommended)</span></li>
            </ul>
          </div>
          <div class="card">
            <h2>Supported Scopes</h2>
            <ul>
              <li>openid · profile · email</li>
              <li>offline_access (refresh)</li>
              <li>api:read · api:write</li>
            </ul>
          </div>
          <div class="card">
            <h2>Quick Links</h2>
            <ul>
              <li><a href="/login">Login UI</a></li>
              <li><a href="/health" target="_blank">Health Check</a></li>
              <li><a href="https://github.com/panva/node-oidc-provider" target="_blank">oidc-provider docs</a></li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Custom routes (login, interaction, logout)
app.use(loginRouter);
app.use(interactionRouter);
app.use(logoutRouter);

// Mount OIDC Provider
async function start() {
  try {
    // Fail fast nếu DB không kết nối được
    await assertDbConnection();
    console.log('✅ Connected to database');

    await initializeProvider();
    
    // Mount provider routes
    app.use(provider.callback());
    
    // Error handler
    app.use((err, req, res, next) => {
      console.error('❌ Error:', err);
      
      res.status(err.status || 500);
      res.type('html');
      res.send(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
            }
            .error {
              background: #fee;
              border: 1px solid #fcc;
              padding: 20px;
              border-radius: 5px;
            }
            h1 { color: #c00; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Server Error</h1>
            <p><strong>${err.message}</strong></p>
            ${process.env.NODE_ENV === 'development' ? `<pre>${err.stack}</pre>` : ''}
          </div>
        </body>
        </html>
      `);
    });
    
    // Start server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(70));
      console.log('🚀 OAuth 2.0 / OpenID Connect Authorization Server');
      console.log('='.repeat(70));
      console.log(`📍 Server URL: ${ISSUER}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔑 Issuer: ${ISSUER}`);
      console.log('\n📋 Available Endpoints:');
      console.log(`   - Home: ${ISSUER}/`);
      console.log(`   - Login: ${ISSUER}/login`);
      console.log(`   - Discovery: ${ISSUER}/.well-known/openid-configuration`);
      console.log(`   - Authorization: ${ISSUER}/authorize`);
      console.log(`   - Token: ${ISSUER}/token`);
      console.log(`   - UserInfo: ${ISSUER}/userinfo`);
      console.log(`   - JWKS: ${ISSUER}/jwks.json`);
      console.log(`   - Logout: ${ISSUER}/logout`);
      console.log('\n👥 Demo Users:');
      console.log('   - admin / admin123');
      console.log('   - user / user123');
      console.log('   - demo / demo123');
      console.log('\n🔧 Demo Clients:');
      console.log('   - demo-client (Authorization Code)');
      console.log('   - spa-client (PKCE)');
      console.log('   - service-client (Client Credentials)');
      console.log('='.repeat(70) + '\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 SIGTERM signal received: closing server');
  disconnectPrisma().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\n📴 SIGINT signal received: closing server');
  disconnectPrisma().finally(() => process.exit(0));
});

// Start the server
start();

