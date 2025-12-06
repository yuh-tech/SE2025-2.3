/**
 * OIDC Provider Configuration and Initialization
 * 
 * File này khởi tạo và cấu hình oidc-provider
 */

const { Provider } = require('oidc-provider');
const { generateKeyPair, exportJWK } = require('jose');
const path = require('path');

const settings = require('./config/settings');
const clients = require('./config/clients');
const { Account } = require('./services/userService');
const { createAdapter } = require('./utils/db');

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
  
  // Cấu hình settings - merge với các cấu hình động
  const configuration = {
    ...settings,
    
    // Các cấu hình động (không thể đặt trong settings.js)
    jwks,                    // Generated mỗi lần khởi động
    findAccount: Account.findAccount,  // Function từ userService
    adapter: createAdapter,  // Factory function từ db.js
    clients,                 // Load từ config/clients.js
    
    // Override một số cấu hình nếu cần
    // (Các cấu hình khác đã được định nghĩa trong settings.js)
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

module.exports = {
  createProvider,
};

