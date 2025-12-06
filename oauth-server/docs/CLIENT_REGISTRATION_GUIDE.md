# 📝 Hướng Dẫn Đăng Ký Client App với OAuth Server

## 🎯 Tổng Quan

Hiện tại OAuth Server của bạn hỗ trợ **2 cách đăng ký client**:

1. **Static Registration (Đăng ký tĩnh)** - ✅ Đang sử dụng
2. **Dynamic Client Registration** - ❌ Đang tắt (có thể bật)

---

## 1️⃣ Static Registration (Cách Hiện Tại)

### Cách Hoạt Động

Clients được định nghĩa trước trong file `src/config/clients.js`. Đây là cách đơn giản nhất và phù hợp cho:
- Development/Testing
- Số lượng clients ít
- Cần kiểm soát chặt chẽ clients

### Các Bước Đăng Ký Client

#### Bước 1: Mở file `src/config/clients.js`

#### Bước 2: Thêm client mới vào mảng `clients`

**Ví dụ: Thêm một Web Application Client**

```javascript
const clients = [
  // ... các clients hiện có ...
  
  {
    client_id: 'my-web-app',
    client_secret: 'my-secret-key-change-in-production',
    redirect_uris: [
      'http://localhost:3001/callback',
      'https://myapp.com/callback'
    ],
    post_logout_redirect_uris: [
      'http://localhost:3001',
      'https://myapp.com'
    ],
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    scope: 'openid profile email offline_access',
    token_endpoint_auth_method: 'client_secret_basic',
  }
];
```

#### Bước 3: Restart server

```bash
npm run dev
```

### Các Loại Client Có Thể Đăng Ký

#### 1. **Confidential Client (Web Application)**
```javascript
{
  client_id: 'web-app',
  client_secret: 'secret-key',
  redirect_uris: ['https://myapp.com/callback'],
  response_types: ['code'],
  grant_types: ['authorization_code', 'refresh_token'],
  scope: 'openid profile email offline_access',
  token_endpoint_auth_method: 'client_secret_basic', // hoặc 'client_secret_post'
}
```

**Đặc điểm:**
- Có `client_secret`
- Sử dụng `client_secret_basic` hoặc `client_secret_post` để authenticate
- Bảo mật hơn vì secret không lộ ra client-side

#### 2. **Public Client (SPA - Single Page Application)**
```javascript
{
  client_id: 'spa-app',
  // KHÔNG có client_secret
  redirect_uris: ['http://localhost:4200/callback'],
  response_types: ['code'],
  grant_types: ['authorization_code', 'refresh_token'],
  scope: 'openid profile email',
  token_endpoint_auth_method: 'none', // Public client
  application_type: 'web',
}
```

**Đặc điểm:**
- Không có `client_secret`
- `token_endpoint_auth_method: 'none'`
- **BẮT BUỘC** phải dùng PKCE (theo cấu hình hiện tại)
- Phù hợp cho React, Vue, Angular apps

#### 3. **Native Application (Mobile App)**
```javascript
{
  client_id: 'mobile-app',
  // KHÔNG có client_secret
  redirect_uris: ['myapp://callback'],
  post_logout_redirect_uris: ['myapp://logout'],
  response_types: ['code'],
  grant_types: ['authorization_code', 'refresh_token'],
  scope: 'openid profile email offline_access',
  token_endpoint_auth_method: 'none',
  application_type: 'native',
}
```

**Đặc điểm:**
- Custom URL scheme (`myapp://`)
- Public client (không có secret)
- Bắt buộc PKCE

#### 4. **Service Client (Server-to-Server)**
```javascript
{
  client_id: 'service-app',
  client_secret: 'service-secret',
  grant_types: ['client_credentials'],
  scope: 'api:read api:write',
  token_endpoint_auth_method: 'client_secret_post',
  response_types: [], // Không cần vì không dùng authorization flow
}
```

**Đặc điểm:**
- Chỉ dùng Client Credentials Grant
- Không có `redirect_uris` (vì không có user interaction)
- Dùng để authenticate server-to-server

### Các Tham Số Quan Trọng

| Tham số | Bắt buộc | Mô tả |
|--------|-----------|-------|
| `client_id` | ✅ | Unique identifier cho client |
| `client_secret` | ⚠️ | Chỉ cần cho confidential clients |
| `redirect_uris` | ✅ | Danh sách redirect URIs hợp lệ |
| `response_types` | ✅ | `['code']` cho Authorization Code Flow |
| `grant_types` | ✅ | Các grant types được phép |
| `scope` | ❌ | Default scopes (có thể override trong request) |
| `token_endpoint_auth_method` | ✅ | Cách authenticate tại token endpoint |
| `application_type` | ❌ | `'web'` hoặc `'native'` |

### Token Endpoint Auth Methods

1. **`client_secret_basic`** - HTTP Basic Auth
   ```
   Authorization: Basic base64(client_id:client_secret)
   ```

2. **`client_secret_post`** - POST body
   ```
   client_id=xxx&client_secret=yyy
   ```

3. **`none`** - Không authenticate (public clients)
   - Phải dùng PKCE

---

## 2️⃣ Dynamic Client Registration (Nếu Bật)

### Cách Bật Dynamic Registration

#### Bước 1: Sửa `src/config/settings.js`

```javascript
features: {
  registration: { 
    enabled: true,
    initialAccessToken: 'your-secret-initial-access-token' // Bảo vệ endpoint
  }
}
```

#### Bước 2: Restart server

### Cách Client App Đăng Ký

#### Bước 1: Client gửi POST request đến `/registration`

```bash
POST /registration
Content-Type: application/json
Authorization: Bearer your-initial-access-token

{
  "redirect_uris": ["https://myapp.com/callback"],
  "response_types": ["code"],
  "grant_types": ["authorization_code", "refresh_token"],
  "application_type": "web",
  "client_name": "My Awesome App",
  "scope": "openid profile email"
}
```

#### Bước 2: Server trả về client credentials

```json
{
  "client_id": "auto-generated-id",
  "client_secret": "auto-generated-secret",
  "client_id_issued_at": 1234567890,
  "client_secret_expires_at": 0,
  "redirect_uris": ["https://myapp.com/callback"],
  "response_types": ["code"],
  "grant_types": ["authorization_code", "refresh_token"]
}
```

#### Bước 3: Client lưu `client_id` và `client_secret`

---

## 3️⃣ Ví Dụ: Tạo Client App để Test

### Ví Dụ 1: React SPA Client

#### Bước 1: Đăng ký client trong `src/config/clients.js`

```javascript
{
  client_id: 'react-spa',
  redirect_uris: ['http://localhost:3001/callback'],
  post_logout_redirect_uris: ['http://localhost:3001'],
  response_types: ['code'],
  grant_types: ['authorization_code', 'refresh_token'],
  scope: 'openid profile email',
  token_endpoint_auth_method: 'none',
  application_type: 'web',
}
```

#### Bước 2: Trong React app, implement OAuth flow

```javascript
// 1. Generate PKCE challenge
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);

// 2. Redirect user to authorization endpoint
const authUrl = `http://localhost:3000/authorize?` +
  `client_id=react-spa&` +
  `redirect_uri=http://localhost:3001/callback&` +
  `response_type=code&` +
  `scope=openid profile email&` +
  `state=random-state&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

window.location.href = authUrl;

// 3. Handle callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

// 4. Exchange code for tokens
const tokenResponse = await fetch('http://localhost:3000/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'http://localhost:3001/callback',
    client_id: 'react-spa',
    code_verifier: codeVerifier, // PKCE verification
  }),
});

const tokens = await tokenResponse.json();
// { access_token, id_token, refresh_token, ... }
```

---

### Ví Dụ 2: Node.js Backend Client

#### Bước 1: Đăng ký client

```javascript
{
  client_id: 'nodejs-backend',
  client_secret: 'backend-secret-key',
  redirect_uris: ['http://localhost:3002/callback'],
  response_types: ['code'],
  grant_types: ['authorization_code', 'refresh_token'],
  scope: 'openid profile email offline_access',
  token_endpoint_auth_method: 'client_secret_basic',
}
```

#### Bước 2: Implement trong Node.js

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

// Authorization URL
app.get('/login', (req, res) => {
  const authUrl = `http://localhost:3000/authorize?` +
    `client_id=nodejs-backend&` +
    `redirect_uri=http://localhost:3002/callback&` +
    `response_type=code&` +
    `scope=openid profile email offline_access&` +
    `state=random-state`;
  
  res.redirect(authUrl);
});

// Callback handler
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for tokens
  const tokenResponse = await axios.post(
    'http://localhost:3000/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'http://localhost:3002/callback',
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      auth: {
        username: 'nodejs-backend',
        password: 'backend-secret-key',
      },
    }
  );
  
  const tokens = tokenResponse.data;
  // Lưu tokens vào session hoặc database
  req.session.tokens = tokens;
  
  res.redirect('/dashboard');
});

// Use access token to call UserInfo
app.get('/userinfo', async (req, res) => {
  const { access_token } = req.session.tokens;
  
  const userInfo = await axios.get(
    'http://localhost:3000/userinfo',
    {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    }
  );
  
  res.json(userInfo.data);
});
```

---

## 4️⃣ Best Practices

### 1. **Client Secret Management**
- ❌ KHÔNG commit `client_secret` vào Git
- ✅ Sử dụng environment variables
- ✅ Rotate secrets định kỳ

### 2. **Redirect URIs**
- ✅ Chỉ whitelist các URIs bạn kiểm soát
- ✅ Sử dụng HTTPS trong production
- ✅ Validate redirect_uri trong client app

### 3. **PKCE**
- ✅ LUÔN sử dụng PKCE cho public clients
- ✅ Sử dụng S256 (không dùng 'plain')
- ✅ Generate code_verifier ngẫu nhiên mỗi lần

### 4. **Scopes**
- ✅ Chỉ request scopes cần thiết
- ✅ Giải thích rõ ràng cho user về từng scope

### 5. **Token Storage**
- ✅ Lưu tokens an toàn (encrypted storage)
- ✅ Không lưu trong localStorage (cho SPA)
- ✅ Sử dụng httpOnly cookies hoặc secure storage

---

## 5️⃣ Testing Client Registration

### Test với curl

#### 1. Test Authorization Code Flow

```bash
# Bước 1: Mở browser và truy cập
http://localhost:3000/authorize?client_id=demo-client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid profile email&state=test123

# Bước 2: Login và consent

# Bước 3: Copy authorization code từ redirect URL

# Bước 4: Exchange code
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "demo-client:demo-client-secret" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:3000/callback"
```

#### 2. Test Client Credentials

```bash
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "service-client:service-client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=api:read api:write"
```

---

## 📚 Tài Liệu Tham Khảo

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [Dynamic Client Registration RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591)
- [oidc-provider Documentation](https://github.com/panva/node-oidc-provider)

