/**
 * Cấu hình chính cho OIDC Provider
 * 
 * File này chứa tất cả các cấu hình cho oidc-provider
 * Tham khảo: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md
 */

import { getAllScopes } from './scopes.js';
import { claims } from './claims.js';

const TTL = {
  AccessToken: 60 * 60,
  AuthorizationCode: 10 * 60,
  IdToken: 60 * 60,
  RefreshToken: 14 * 24 * 60 * 60,
  ClientCredentials: 10 * 60,
  Interaction: 60 * 60,
  Session: 14 * 24 * 60 * 60,
  Grant: 14 * 24 * 60 * 60,
};

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
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    },
    short: {
      signed: true,
      maxAge: 10 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    },
  },

  ttl: TTL,

  responseTypes: ['code', 'code id_token'],

  grantTypes: [
    'authorization_code',
    'refresh_token',
    'client_credentials',
  ],

  scopes: getAllScopes(),

  // Danh sách tất cả claims được hỗ trợ (cho discovery document)
  // Sử dụng claims từ import './claims.js' ở đầu file
  claimsSupported: Object.keys(claims),

  subjectTypes: ['public'],

  tokenEndpointAuthMethods: [
    'client_secret_basic',
    'client_secret_post',
    'client_secret_jwt',
    'private_key_jwt',
    'none',
  ],

  /* ---------------------------- ROUTES ---------------------------- */
  routes: {
    authorization: '/authorize',
    token: '/token',
    userinfo: '/userinfo',
    revocation: '/revoke',
    introspection: '/introspect',
    end_session: '/logout',
    jwks: '/jwks.json',
  },

  interactions: {
    url: async (ctx, interaction) => `/interaction/${interaction.uid}`,
  },

  renderError: async (ctx, out, error) => {
    ctx.type = 'html';
    ctx.body = `
      <html><body>
        <h1>${error.name}</h1>
        <p>${error.message}</p>
      </body></html>
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

  issueRefreshToken: async (ctx, client, code) => {
    if (!code) return false;
    return code.scopes.has('offline_access');
  },

  rotateRefreshToken: true,

  extraClientMetadata: {
    properties: ['logo_uri', 'policy_uri', 'tos_uri'],
  },

  clientBasedCORS: () => true,

  httpOptions: (options) => {
    options.timeout = 5000;
    return options;
  },
};

export default settings;

