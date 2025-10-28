/**
 * OIDC Provider Configuration and Initialization
 * 
 * File này khởi tạo và cấu hình oidc-provider
 */

import { Provider } from 'oidc-provider';
import { generateKeyPair, exportJWK } from 'jose';
import path from 'path';

import settings from './config/settings.js';
import clients from './config/clients.js';
import { Account } from './services/userService.js';
import { createAdapter } from './utils/db.js';

/**
 * Sinh cặp key RSA cho signing JWT
 * Trong production, nên lưu key này vào file hoặc secrets manager
 */
async function generateJWKS() {
  console.log('Generating RSA key pair for JWT signing...');
  
  const { publicKey, privateKey } = await generateKeyPair('RS256', {
    modulusLength: 2048,
  });

  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);

  return {
    keys: [
      {
        ...privateJwk,
        kid: 'signing-key-1',
        use: 'sig',
        alg: 'RS256',
      },
    ],
  };
}

/**
 * Khởi tạo OIDC Provider
 */
async function createProvider(issuer) {
  // Generate JWKS cho signing
  const jwks = await generateJWKS();
  
  // Cấu hình settings
  const configuration = {
    ...settings,
    
    // Set JWKS
    jwks,
    
    // Find account function
    findAccount: Account.findAccount,
    
    // Storage adapter
    adapter: createAdapter,
    
    // Client loader - load clients từ config
    clients,
    
    // Extra params
    extraParams: ['lang', 'ui_locales'],
    
    // Token format
    formats: {
      AccessToken: 'jwt',
      ClientCredentials: 'jwt',
    },
    
    // Conformance
    conformIdTokenClaims: false,
    
    // CORS
    clientBasedCORS: (ctx, origin, client) => {
      // Allow all origins in development
      return true;
    },
    
    // Claims configuration
    claims: {
      openid: ['sub'],
      profile: [
        'name',
        'family_name',
        'given_name',
        'middle_name',
        'nickname',
        'preferred_username',
        'profile',
        'picture',
        'website',
        'gender',
        'birthdate',
        'zoneinfo',
        'locale',
        'updated_at',
      ],
      email: ['email', 'email_verified'],
      address: ['address'],
      phone: ['phone_number', 'phone_number_verified'],
    },
    
    // Custom claims injector
    extraTokenClaims: async (ctx, token) => {
      if (token.kind === 'AccessToken') {
        // Có thể thêm custom claims vào access token
        return {
          // aud: 'my-api',
        };
      }
      return {};
    },
    
    // Issue refresh token khi có offline_access scope
    issueRefreshToken: async (ctx, client, code) => {
      if (!client.grantTypeAllowed('refresh_token')) {
        return false;
      }
      
      return code && code.scopes.has('offline_access');
    },
    
    // Rotate refresh token mỗi lần sử dụng (security best practice)
    rotateRefreshToken: (ctx) => {
      const { RefreshToken: refreshToken, Client: client } = ctx.oidc.entities;
      
      // Rotate refresh token for public clients
      if (client.tokenEndpointAuthMethod === 'none') {
        return true;
      }
      
      // Rotate after 7 days
      if (refreshToken.totalLifetime() > 7 * 24 * 60 * 60) {
        return true;
      }
      
      return false;
    },
    
    // Render error page
    renderError: async (ctx, out, error) => {
      ctx.type = 'html';
      ctx.body = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lỗi - OAuth Server</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .error-container {
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              max-width: 500px;
              width: 100%;
            }
            h1 {
              color: #e53e3e;
              margin-bottom: 20px;
              font-size: 24px;
            }
            .error-code {
              background: #fed7d7;
              color: #c53030;
              padding: 10px 15px;
              border-radius: 5px;
              font-family: 'Courier New', monospace;
              margin-bottom: 15px;
              font-size: 14px;
            }
            .error-message {
              color: #4a5568;
              line-height: 1.6;
              margin-bottom: 20px;
            }
            .back-button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 12px 24px;
              border-radius: 5px;
              text-decoration: none;
              transition: background 0.3s;
            }
            .back-button:hover {
              background: #5a67d8;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>❌ Đã xảy ra lỗi</h1>
            <div class="error-code">
              <strong>Mã lỗi:</strong> ${error.name || 'Error'}
            </div>
            <div class="error-message">
              <strong>Chi tiết:</strong><br>
              ${error.message || 'Đã xảy ra lỗi không xác định'}
              ${error.error_description ? `<br><br>${error.error_description}` : ''}
            </div>
            <a href="/" class="back-button">← Quay lại trang chủ</a>
          </div>
        </body>
        </html>
      `;
    },
  };

  // Tạo provider instance
  const provider = new Provider(issuer, configuration);

  // Event listeners
  provider.on('grant.success', (ctx) => {
    console.log('✅ Grant success:', {
      client: ctx.oidc.client?.clientId,
      user: ctx.oidc.session?.accountId,
    });
  });

  provider.on('grant.error', (ctx, error) => {
    console.error('❌ Grant error:', error.message);
  });

  provider.on('grant.revoked', (ctx, grantId) => {
    console.log('🔄 Grant revoked:', grantId);
  });

  provider.on('authorization.success', (ctx) => {
    console.log('✅ Authorization success:', {
      client: ctx.oidc.client?.clientId,
      params: ctx.oidc.params,
    });
  });

  provider.on('authorization.error', (ctx, error) => {
    console.error('❌ Authorization error:', error.message);
  });

  provider.on('end_session.success', (ctx) => {
    console.log('👋 Logout success');
  });

  provider.on('access_token.saved', (accessToken) => {
    console.log('💾 Access token saved:', {
      jti: accessToken.jti,
      client: accessToken.clientId,
      expiresIn: accessToken.expiresIn,
    });
  });

  provider.on('access_token.destroyed', (accessToken) => {
    console.log('🗑️  Access token destroyed:', accessToken.jti);
  });

  provider.on('authorization_code.saved', (code) => {
    console.log('💾 Authorization code saved');
  });

  provider.on('authorization_code.consumed', (code) => {
    console.log('✅ Authorization code consumed');
  });

  provider.on('refresh_token.saved', (refreshToken) => {
    console.log('💾 Refresh token saved');
  });

  provider.on('refresh_token.destroyed', (refreshToken) => {
    console.log('🗑️  Refresh token destroyed');
  });

  provider.on('interaction.started', (ctx, interaction) => {
    console.log('🔄 Interaction started:', interaction.uid);
  });

  provider.on('interaction.ended', (ctx) => {
    console.log('✅ Interaction ended');
  });

  provider.on('server_error', (ctx, error) => {
    console.error('💥 Server error:', error);
  });

  console.log('✅ OIDC Provider initialized successfully');
  console.log('📍 Issuer:', issuer);
  console.log('🔑 JWKS generated with kid:', jwks.keys[0].kid);
  console.log('👥 Loaded', clients.length, 'client(s)');

  return provider;
}

export { createProvider };

