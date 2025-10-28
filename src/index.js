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

import { createProvider } from './provider.js';
import loginRouter from './routes/login.js';
import interactionRouter from './routes/interaction.js';
import logoutRouter from './routes/logout.js';

// Configuration
const PORT = process.env.PORT || 3000;
const ISSUER = process.env.ISSUER || `http://localhost:${PORT}`;

// Create Express app
const app = express();

// Session configuration
const sessionConfig = {
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2d3748;
          font-size: 32px;
          margin-bottom: 10px;
        }
        .header p {
          color: #718096;
          font-size: 16px;
        }
        .user-info {
          background: #edf2f7;
          padding: 15px 20px;
          border-radius: 5px;
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .card {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .card h2 {
          color: #2d3748;
          font-size: 20px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .card ul {
          list-style: none;
        }
        .card li {
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .card li:last-child {
          border-bottom: none;
        }
        .card a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }
        .card a:hover {
          text-decoration: underline;
        }
        .endpoint {
          background: #f7fafc;
          padding: 8px 12px;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          color: #2d3748;
          margin: 5px 0;
          display: block;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border-radius: 5px;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #5a67d8;
        }
        .btn-secondary {
          background: #e2e8f0;
          color: #4a5568;
        }
        .btn-secondary:hover {
          background: #cbd5e0;
        }
        .footer {
          background: white;
          padding: 20px;
          border-radius: 10px;
          text-align: center;
          color: #718096;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 OAuth 2.0 Authorization Server</h1>
          <p>OpenID Connect Provider - Hệ thống xác thực và ủy quyền</p>
          
          ${user ? `
            <div class="user-info">
              <span>👤 Xin chào, <strong>${user.name || user.username}</strong>!</span>
              <a href="/session/logout" class="btn btn-secondary">Đăng xuất</a>
            </div>
          ` : `
            <div class="user-info">
              <span>Bạn chưa đăng nhập</span>
              <a href="/login" class="btn">Đăng nhập</a>
            </div>
          `}
        </div>
        
        <div class="grid">
          <div class="card">
            <h2>📋 OIDC Endpoints</h2>
            <ul>
              <li><a href="/.well-known/openid-configuration" target="_blank">Discovery Document</a></li>
              <li><a href="/jwks.json" target="_blank">JWKS (Public Keys)</a></li>
              <li><a href="/authorize">Authorization Endpoint</a></li>
              <li><code class="endpoint">POST /token</code></li>
              <li><code class="endpoint">GET /userinfo</code></li>
              <li><a href="/logout">End Session (Logout)</a></li>
            </ul>
          </div>
          
          <div class="card">
            <h2>🔑 Supported Flows</h2>
            <ul>
              <li>✅ Authorization Code Flow</li>
              <li>✅ Authorization Code + PKCE</li>
              <li>✅ Client Credentials</li>
              <li>✅ Refresh Token</li>
              <li>❌ Implicit Flow (deprecated)</li>
              <li>❌ Resource Owner Password (not recommended)</li>
            </ul>
          </div>
          
          <div class="card">
            <h2>🎯 Supported Scopes</h2>
            <ul>
              <li><strong>openid</strong> - OpenID authentication</li>
              <li><strong>profile</strong> - Profile information</li>
              <li><strong>email</strong> - Email address</li>
              <li><strong>offline_access</strong> - Refresh tokens</li>
              <li><strong>api:read</strong> - API read access</li>
              <li><strong>api:write</strong> - API write access</li>
            </ul>
          </div>
          
          <div class="card">
            <h2>🔧 Demo Clients</h2>
            <ul>
              <li><strong>demo-client</strong><br><small>Authorization Code Flow</small></li>
              <li><strong>spa-client</strong><br><small>SPA with PKCE</small></li>
              <li><strong>service-client</strong><br><small>Client Credentials</small></li>
              <li><strong>mobile-app</strong><br><small>Native App with PKCE</small></li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>OAuth 2.0 & OpenID Connect Authorization Server</p>
          <p>Powered by <strong>oidc-provider</strong> | Node.js + Express</p>
          <p style="margin-top: 10px;">
            <a href="https://github.com/panva/node-oidc-provider" target="_blank" style="color: #667eea;">Documentation</a>
          </p>
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
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📴 SIGINT signal received: closing server');
  process.exit(0);
});

// Start the server
start();

