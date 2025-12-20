/**
 * Danh sách clients được phép kết nối với Authorization Server
 * 
 * Trong production, dữ liệu này nên lưu trong database và có thể
 * đăng ký động thông qua Dynamic Client Registration endpoint
 */

// Đây là phần đăng kí của client app vào Authorization Server bằng form đăng kí
// Tuy nhiên đang test ở đây là form đăng kí được tạo sẵn 

const clients = [
  {
    // Client App - E-commerce Sunshine Boutique
    client_id: 'my_app',
    client_secret: 'demo-client-secret', // phần này sau này sẽ lưu vào DB và hash bằng bcrypt
    client_name: 'Sunshine Boutique',
    redirect_uris: ['http://localhost:3001/callback'],
    post_logout_redirect_uris: ['http://localhost:3001', 'http://localhost:3001/login'],
    response_types: ['code'], // Authorization Code Flow
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid profile email offline_access',
    token_endpoint_auth_method: 'client_secret_basic',
    logo_uri: 'http://localhost:3001/images/logo.png',
  },  
  {
    client_id: 'mobile_app',
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
    client_id: 'service_client',
    client_secret: 'service-client-secret',
    grant_types: ['client_credentials'],
    scope: 'api:read api:write',
    token_endpoint_auth_method: 'client_secret_post',
    response_types: [],
  },
  {
    client_id: 'native_app',
    redirect_uris: ['myapp://callback'],
    post_logout_redirect_uris: ['myapp://logout'],
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid profile email offline_access',
    token_endpoint_auth_method: 'none',
    application_type: 'native',
  }
];

export default clients;

