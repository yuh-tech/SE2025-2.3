/**
 * Danh sách clients được phép kết nối với Authorization Server
 * 
 * Trong production, dữ liệu này nên lưu trong database và có thể
 * đăng ký động thông qua Dynamic Client Registration endpoint
 */

const clients = [
  {
    client_id: 'demo-client',
    client_secret: 'demo-client-secret',
    redirect_uris: ['http://localhost:3000/callback', 'http://localhost:8080/callback'],
    post_logout_redirect_uris: ['http://localhost:3000'],
    response_types: ['code'], // Authorization Code Flow
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid profile email offline_access',
    token_endpoint_auth_method: 'client_secret_basic',
  },
  {
    client_id: 'spa-client',
    // SPA client không có secret (public client)
    redirect_uris: ['http://localhost:4200/callback'],
    post_logout_redirect_uris: ['http://localhost:4200'],
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid profile email',
    token_endpoint_auth_method: 'none', // Public client
    application_type: 'web',
  },
  {
    client_id: 'service-client',
    client_secret: 'service-client-secret',
    grant_types: ['client_credentials'],
    scope: 'api:read api:write',
    token_endpoint_auth_method: 'client_secret_post',
    response_types: [],
  },
  {
    client_id: 'mobile-app',
    redirect_uris: ['myapp://callback'],
    post_logout_redirect_uris: ['myapp://logout'],
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid profile email offline_access',
    token_endpoint_auth_method: 'none',
    application_type: 'native',
  }
];

module.exports = clients;

