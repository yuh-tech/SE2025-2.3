/**
 * Cấu hình chính cho OIDC Provider
 * * File này chứa tất cả các cấu hình cho oidc-provider
 * ĐÃ ĐƯỢC CẬP NHẬT HOÀN CHỈNH CHO PHIÊN BẢN v9.x
 * Tham khảo: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md
 */

import { getAllScopes } from './scopes.js';
import { claims } from './claims.js';

// TTL (Time To Live) cho các loại token (đơn vị: giây)
const TTL = {
  AccessToken: 60 * 60, // 1 hour
  AuthorizationCode: 10 * 60, // 10 minutes
  IdToken: 60 * 60, // 1 hour
  RefreshToken: 14 * 24 * 60 * 60, // 14 days
  ClientCredentials: 10 * 60, // 10 minutes
  Interaction: 60 * 60, // 1 hour
  Session: 14 * 24 * 60 * 60, // 14 days
  Grant: 14 * 24 * 60 * 60, // 14 days
};

/**
 * Cấu hình OIDC Provider
 */
const settings = {
  devInteractions: false,
  features: {
    // Client Credentials Grant
    clientCredentials: { enabled: true },
    
    // Resource Indicators (RFC 8707)
    resourceIndicators: { 
      enabled: true,
      defaultResource: (ctx) => {
        return undefined;
      },
      getResourceServerInfo: async (ctx, resourceIndicator) => {
        return {
          scope: 'api:read api:write',
          audience: resourceIndicator,
        };
      },
    },
    
    // Revocation endpoint
    revocation: { enabled: true },
    
    // Introspection endpoint
    introspection: { enabled: true },
    
    // User info endpoint
    userinfo: { enabled: true },

    // Encrypted ID Tokens
    encryption: { enabled: false },
    
  },
  
  // Registration Management
  registrationManagement: { 
    enabled: false 
  },
  
  // Session management
  sessionManagement: { 
    enabled: true 
  },
  
  // Back-channel logout
  backchannelLogout: { 
    enabled: false 
  },
  
  // Front-channel logout  
  frontchannelLogout: { 
    enabled: false 
  },

  // Pushed Authorization Requests (PAR)
  pushedAuthorizationRequests: { 
    enabled: false 
  },
  
  // JWT Response Modes
  jwtResponseModes: { 
    enabled: false 
  },
  
  // Request Objects
  request: { 
    enabled: false 
  },
  requestUri: { 
    enabled: false 
  },
  
  // Rich Authorization Requests
  richAuthorizationRequests: { 
    enabled: false 
  },
  
  // Mutual TLS
  mTLS: { 
    enabled: false 
  },
  
  // DPoP (Demonstrating Proof-of-Possession)
  dPoP: { 
    enabled: false 
  },

  // PKCE
  pkce: {
    methods: ['S256', 'plain'],
    required: (ctx, client) => {
      return client.tokenEndpointAuthMethod === 'none';
    },
  },

  // Formats
  formats: {
    AccessToken: 'jwt',
    ClientCredentials: 'jwt',
  },

  // --- CÁC CẤU HÌNH CÒN LẠI ---

  // Claims mapping theo scope (cho ID Token và UserInfo)
  claims: {
    openid: ['sub'],
    profile: [
      'name', 'family_name', 'given_name', 'middle_name', 'nickname',
      'preferred_username', 'profile', 'picture', 'website', 'gender',
      'birthdate', 'zoneinfo', 'locale', 'updated_at',
    ],
    email: ['email', 'email_verified'],
    address: ['address'],
    phone: ['phone_number', 'phone_number_verified'],
  },

  // Cấu hình cookies
  cookies: {
    keys: process.env.COOKIE_KEYS?.split(',') || ['secret-key-1', 'secret-key-2'],
    long: { 
      signed: true, 
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      httpOnly: true,
      sameSite: 'lax',
    },
    short: { 
      signed: true, 
      maxAge: 10 * 60 * 1000, // 10 minutes
      httpOnly: true,
      sameSite: 'lax',
    },
  },

  // TTL configuration
  ttl: TTL,

  // Các response types được hỗ trợ
  responseTypes: [
    'code', // Authorization Code Flow
    'id_token', // Implicit Flow (không khuyến nghị)
    'code id_token', // Hybrid Flow
  ],

  // Các grant types được hỗ trợ
  grantTypes: [
    'authorization_code',
    'refresh_token',
    'client_credentials',
  ],

  // Scopes được hỗ trợ
  scopes: getAllScopes(),

  // Claims mapping theo scope
  claimsSupported: Object.keys(claims),

  // Subject types được hỗ trợ
  subjectTypes: ['public'],

  // Token endpoint authentication methods
  tokenEndpointAuthMethods: [
    'client_secret_basic',
    'client_secret_post',
    'client_secret_jwt',
    'private_key_jwt',
    'none', // for public clients
  ],

  // Routing
  routes: {
    authorization: '/authorize',
    token: '/token',
    userinfo: '/userinfo',
    revocation: '/revoke',
    introspection: '/introspect',
    end_session: '/logout',
    jwks: '/jwks.json',
  },

  // Interactions (login, consent, etc.)
  interactions: {
    url: async (ctx, interaction) => {
      return `/interaction/${interaction.uid}`;
    },
  },

  // Render errors
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

  // JWKS configuration
  jwks: undefined, // Will be set in provider.js

  // Discovery metadata
  discovery: {
    service_documentation: 'https://github.com/panva/node-oidc-provider',
    ui_locales_supported: ['en-US', 'vi-VN'],
    claim_types_supported: ['normal'],
  },

  // Extra token claims
  extraTokenClaims: async (ctx, token) => {
    // Có thể thêm custom claims vào token ở đây
    return {};
  },

  // Find account by ID
  findAccount: undefined, // Will be set in provider.js

  // Adapter (storage)
  adapter: undefined, // Will be set in provider.js

  // Conformance
  conformIdTokenClaims: false,

  // Issues (token issuance configuration)
  issueRefreshToken: async (ctx, client, code) => {
    // Chỉ issue refresh token khi có offline_access scope
    if (!code) return false;
    return code.scopes.has('offline_access');
  },

  // Rotate refresh tokens
  rotateRefreshToken: true,

  // Extra client metadata
  extraClientMetadata: {
    properties: ['logo_uri', 'policy_uri', 'tos_uri'],
  },

  // Client-based CORS
  clientBasedCORS: (ctx, origin, client) => {
    return true; // Allow all origins in development
  },

  // HTTP options
  httpOptions: (options) => {
    options.timeout = 5000;
    return options;
  },
};

export default settings;