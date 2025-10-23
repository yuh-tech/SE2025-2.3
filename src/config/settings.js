/**
 * Cấu hình chính cho OIDC Provider
 * 
 * File này chứa tất cả các cấu hình cho oidc-provider
 * Tham khảo: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md
 */

const { getAllScopes } = require('./scopes');
const { claims } = require('./claims');

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
  // Các tính năng được bật
  features: {
    // Device Flow - cho thiết bị IoT
    deviceFlow: { enabled: false },
    
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
    
    // PKCE (Proof Key for Code Exchange) - bắt buộc cho public clients
    pkce: {
      required: (ctx, client) => {
        // Bắt buộc PKCE cho public clients (SPA, Mobile)
        return client.tokenEndpointAuthMethod === 'none';
      },
    },
    
    // Registration endpoint - Dynamic Client Registration
    registration: { 
      enabled: false, // Tắt trong demo, bật trong production nếu cần
    },
    
    // Registration Management
    registrationManagement: { enabled: false },
    
    // User info endpoint
    userinfo: { enabled: true },
    
    // JWT Access Tokens
    jwtAccessTokens: { enabled: false },
    
    // Encrypted ID Tokens
    encryption: { enabled: false },
    
    // Session management
    sessionManagement: { enabled: true },
    
    // Back-channel logout
    backchannelLogout: { enabled: false },
    
    // Front-channel logout  
    frontchannelLogout: { enabled: false },
    
    // Pushed Authorization Requests (PAR)
    pushedAuthorizationRequests: { enabled: false },
    
    // JWT Response Modes
    jwtResponseModes: { enabled: false },
    
    // Request Objects
    request: { enabled: false },
    requestUri: { enabled: false },
    
    // Rich Authorization Requests
    richAuthorizationRequests: { enabled: false },
    
    // Mutual TLS
    mTLS: { enabled: false },
    
    // DPoP (Demonstrating Proof-of-Possession)
    dPoP: { enabled: false },
  },

  // Các claims được hỗ trợ
  claims: Object.keys(claims).reduce((acc, key) => {
    acc[key] = null;
    return acc;
  }, {}),

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
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 5px; }
          h1 { color: #c00; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Error</h1>
          <p><strong>${error.name}:</strong> ${error.message}</p>
          ${error.error_description ? `<p>${error.error_description}</p>` : ''}
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

  // Formats
  formats: {
    AccessToken: 'jwt', // hoặc 'opaque'
    ClientCredentials: 'jwt',
  },

  // Conformance
  conformIdTokenClaims: false,

  // PKCE methods
  pkceMethods: ['S256', 'plain'],

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

module.exports = settings;

