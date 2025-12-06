# 🔐 OAuth 2.0 & OpenID Connect Authorization Server

Authorization Server hoàn chỉnh tuân thủ chuẩn **OAuth 2.0** và **OpenID Connect**, xây dựng bằng **Node.js** và thư viện **oidc-provider**.

## 📋 Mục lục

- [Tính năng](#-tính-năng)
- [Kiến trúc](#-kiến-trúc)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [Kiểm thử](#-kiểm-thử)
- [Flow Authorization Code](#-flow-authorization-code)
- [API Endpoints](#-api-endpoints)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Tài liệu tham khảo](#-tài-liệu-tham-khảo)

## ✨ Tính năng

### OAuth 2.0 Flows
- ✅ **Authorization Code Flow** - Flow chuẩn cho web applications
- ✅ **Authorization Code + PKCE** - Bảo mật cho SPA và Mobile apps
- ✅ **Client Credentials Flow** - Cho server-to-server authentication
- ✅ **Refresh Token Flow** - Gia hạn access token

### OpenID Connect
- ✅ **ID Token** (JWT) - Chứa thông tin xác thực người dùng
- ✅ **UserInfo Endpoint** - Lấy thông tin chi tiết người dùng
- ✅ **Discovery Document** - Tự động khám phá cấu hình
- ✅ **JWKS Endpoint** - Public keys để verify JWT

### Token Types
- 🔑 **Access Token** - JWT signed bằng RS256
- 🆔 **ID Token** - JWT chứa claims người dùng
- 🔄 **Refresh Token** - Long-lived token để gia hạn
- 📝 **Authorization Code** - Short-lived code đổi lấy tokens

### Security Features
- 🔒 **PKCE** (Proof Key for Code Exchange) - Bắt buộc cho public clients
- 🔐 **JWT Signing** - RSA key pair (RS256)
- 🍪 **Secure Cookies** - HttpOnly, SameSite
- 🔄 **Token Rotation** - Refresh token rotation
- ⏰ **Token Expiration** - Configurable TTL

### User Interface
- 🎨 **Modern UI** - Responsive design với gradient backgrounds
- 📱 **Mobile Friendly** - Tối ưu cho mọi kích thước màn hình
- 🌐 **Đa ngôn ngữ** - Hỗ trợ tiếng Việt
- ✅ **Login Form** - Giao diện đăng nhập đẹp mắt
- 🔐 **Consent Screen** - Xác nhận quyền truy cập rõ ràng

## 🏗️ Kiến trúc

```
┌─────────────┐          ┌──────────────────┐          ┌─────────────┐
│             │          │                  │          │             │
│   Client    │◄────────►│  Authorization   │◄────────►│   Resource  │
│ Application │          │     Server       │          │    Owner    │
│             │          │   (This Server)  │          │    (User)   │
└─────────────┘          └──────────────────┘          └─────────────┘
                                  │
                                  │
                                  ▼
                         ┌─────────────────┐
                         │                 │
                         │  Token Storage  │
                         │  (In-Memory /   │
                         │     Redis)      │
                         └─────────────────┘
```

### Luồng hoạt động Authorization Code Flow

```
┌──────┐                                           ┌──────────┐
│      │                                           │          │
│      │──(1) Authorization Request──────────────►│          │
│      │                                           │          │
│      │◄─(2) Login & Consent Form─────────────────│  Auth    │
│      │                                           │  Server  │
│ User │──(3) Submit Credentials & Approval───────►│          │
│Agent │                                           │          │
│      │◄─(4) Authorization Code──────────────────┤          │
│      │                                           │          │
│      │──(5) Token Request (code + client_id)───►│          │
│      │                                           │          │
│      │◄─(6) Access Token + ID Token + Refresh──┤          │
│      │                                           │          │
└──────┘                                           └──────────┘
```

## 💻 Yêu cầu hệ thống

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Redis** (tùy chọn, cho production)

## 📦 Cài đặt

### 1. Clone repository và cài đặt dependencies

```bash
# Di chuyển vào thư mục dự án
cd Final_Project

# Cài đặt dependencies
npm install
```

### 2. Tạo file .env

```bash
# Copy file .env.example
cp .env.example .env
```

### 3. Chỉnh sửa file .env (tùy chọn)

```env
PORT=3000
ISSUER=http://localhost:3000
COOKIE_KEYS=your-secret-key-1,your-secret-key-2
SESSION_SECRET=your-session-secret

# Redis (optional)
# USE_REDIS=true
# REDIS_URL=redis://localhost:6379
```

## ⚙️ Cấu hình

### Clients Configuration

Chỉnh sửa file `src/config/clients.js` để thêm/sửa clients:

```javascript
{
  client_id: 'your-client-id',
  client_secret: 'your-client-secret',
  redirect_uris: ['http://localhost:3000/callback'],
  grant_types: ['authorization_code', 'refresh_token'],
  scope: 'openid profile email'
}
```

### Scopes Configuration

Chỉnh sửa file `src/config/scopes.js` để định nghĩa scopes:

```javascript
'custom:scope': {
  description: 'Your custom scope description',
  claims: ['custom_claim']
}
```

### Users Database

Chỉnh sửa file `src/services/userService.js` để thêm users demo hoặc kết nối database thực:

```javascript
const USERS_DB = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // Hash trong production!
    email: 'admin@example.com',
    name: 'Administrator'
  }
];
```

## 🚀 Chạy ứng dụng

### Development Mode

```bash
npm start
```

hoặc với nodemon (auto-reload):

```bash
npm run dev
```

Server sẽ chạy tại: **http://localhost:3000**

### Production Mode

```bash
NODE_ENV=production npm start
```

**Lưu ý:** Trong production nên:
- Sử dụng Redis cho session storage
- Sử dụng HTTPS (secure cookies)
- Hash passwords (bcrypt)
- Lưu clients và users trong database
- Set COOKIE_KEYS và SESSION_SECRET mạnh

## 🧪 Kiểm thử

### 1. Kiểm tra Discovery Document

```bash
curl http://localhost:3000/.well-known/openid-configuration
```

### 2. Kiểm tra JWKS

```bash
curl http://localhost:3000/jwks.json
```

### 3. Test Authorization Code Flow với curl

#### Bước 1: Lấy Authorization Code

Mở trình duyệt và truy cập:

```
http://localhost:3000/authorize?client_id=demo-client&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid%20profile%20email&state=abc123
```

Đăng nhập với tài khoản demo:
- Username: `admin`
- Password: `admin123`

Sau khi consent, bạn sẽ được redirect đến:
```
http://localhost:3000/callback?code=AUTHORIZATION_CODE&state=abc123
```

Copy `AUTHORIZATION_CODE` từ URL.

#### Bước 2: Đổi Code lấy Tokens

```bash
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "demo-client:demo-client-secret" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:3000/callback"
```

Response:
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "eyJhbGci...",
  "refresh_token": "...",
  "scope": "openid profile email"
}
```

#### Bước 3: Lấy UserInfo

```bash
curl http://localhost:3000/userinfo \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Response:
```json
{
  "sub": "1",
  "name": "Administrator",
  "email": "admin@example.com",
  "email_verified": true,
  "given_name": "Admin",
  "family_name": "User"
}
```

#### Bước 4: Refresh Token

```bash
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "demo-client:demo-client-secret" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=REFRESH_TOKEN"
```

### 4. Test Client Credentials Flow

```bash
curl -X POST http://localhost:3000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "service-client:service-client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=api:read api:write"
```

### 5. Test với Postman

Import collection này vào Postman:

#### Authorization Code Flow - Step 1: Authorization URL

- Method: GET
- URL: `http://localhost:3000/authorize`
- Params:
  - client_id: `demo-client`
  - redirect_uri: `http://localhost:3000/callback`
  - response_type: `code`
  - scope: `openid profile email`
  - state: `random-state-string`

#### Authorization Code Flow - Step 2: Token Request

- Method: POST
- URL: `http://localhost:3000/token`
- Auth: Basic Auth
  - Username: `demo-client`
  - Password: `demo-client-secret`
- Body (x-www-form-urlencoded):
  - grant_type: `authorization_code`
  - code: `[CODE_FROM_STEP_1]`
  - redirect_uri: `http://localhost:3000/callback`

#### UserInfo Request

- Method: GET
- URL: `http://localhost:3000/userinfo`
- Headers:
  - Authorization: `Bearer [ACCESS_TOKEN]`

## 📖 Flow Authorization Code (Chi tiết)

### 1. Authorization Request

Client gửi request đến authorization endpoint:

```
GET /authorize?
  response_type=code&
  client_id=demo-client&
  redirect_uri=http://localhost:3000/callback&
  scope=openid profile email&
  state=abc123
```

### 2. User Authentication

Server kiểm tra session, nếu chưa login thì redirect đến `/login`.

User nhập username/password và submit form.

### 3. Consent

Sau khi login thành công, server hiển thị consent screen yêu cầu user xác nhận cấp quyền cho client.

### 4. Authorization Code

Khi user đồng ý, server tạo authorization code và redirect về client:

```
HTTP/1.1 302 Found
Location: http://localhost:3000/callback?code=xxx&state=abc123
```

### 5. Token Request

Client gửi code đến token endpoint để đổi lấy tokens:

```
POST /token HTTP/1.1
Host: localhost:3000
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=xxx&
redirect_uri=http://localhost:3000/callback
```

### 6. Token Response

Server trả về tokens:

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "eyJhbGci...",
  "refresh_token": "...",
  "scope": "openid profile email"
}
```

### 7. Access Protected Resource

Client sử dụng access token để gọi UserInfo endpoint:

```
GET /userinfo HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGci...
```

## 🔌 API Endpoints

### Discovery & Metadata

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/openid-configuration` | GET | OpenID Connect Discovery Document |
| `/jwks.json` | GET | JSON Web Key Set (public keys) |

### OAuth/OIDC Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/authorize` | GET | Authorization endpoint (OAuth 2.0) |
| `/token` | POST | Token endpoint |
| `/userinfo` | GET | UserInfo endpoint (OIDC) |
| `/revoke` | POST | Token revocation endpoint |
| `/introspect` | POST | Token introspection endpoint |
| `/logout` | GET/POST | End session endpoint |

### Custom Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Home page |
| `/login` | GET/POST | Login page |
| `/interaction/:uid` | GET/POST | Interaction handling |
| `/session/logout` | GET/POST | User logout |
| `/health` | GET | Health check |

## 📁 Cấu trúc dự án

```
Final_Project/
├── src/
│   ├── index.js              # Entry point, khởi tạo Express server
│   ├── provider.js           # Cấu hình và khởi tạo oidc-provider
│   │
│   ├── config/               # Configuration files
│   │   ├── clients.js        # Danh sách OAuth clients
│   │   ├── scopes.js         # Định nghĩa scopes
│   │   ├── claims.js         # Định nghĩa claims
│   │   └── settings.js       # Provider settings
│   │
│   ├── routes/               # Express routes
│   │   ├── login.js          # Login form và xác thực
│   │   ├── interaction.js    # OIDC interactions (consent, etc.)
│   │   └── logout.js         # Logout handling
│   │
│   ├── services/             # Business logic
│   │   └── userService.js    # User authentication & management
│   │
│   └── utils/                # Utilities
│       └── db.js             # Database adapter (in-memory/Redis)
│
├── node-oidc-provider/       # oidc-provider library (local)
│
├── package.json              # Dependencies
├── .env                      # Environment variables (create from .env.example)
├── .env.example              # Environment variables template
└── README.md                 # This file
```

### Giải thích các file chính

#### `src/index.js`
Entry point của ứng dụng. Khởi tạo Express server, session middleware, mount OIDC provider và custom routes.

#### `src/provider.js`
Khởi tạo và cấu hình `oidc-provider`. Sinh RSA key pair cho JWT signing, cấu hình JWKS, claims, scopes, TTL, và các event listeners.

#### `src/config/clients.js`
Danh sách các OAuth clients được phép kết nối. Mỗi client có:
- `client_id`: ID duy nhất
- `client_secret`: Secret (cho confidential clients)
- `redirect_uris`: Danh sách redirect URIs hợp lệ
- `grant_types`: Các grant types được phép
- `scope`: Scopes mặc định

#### `src/config/scopes.js`
Định nghĩa các OAuth scopes và claims tương ứng. Ví dụ: scope `profile` bao gồm claims `name`, `given_name`, `family_name`, etc.

#### `src/config/claims.js`
Định nghĩa các OIDC claims (user attributes) với type và description.

#### `src/config/settings.js`
Cấu hình tổng thể cho oidc-provider:
- Features (PKCE, revocation, introspection, etc.)
- TTL cho các loại tokens
- Response types & grant types
- Cookie configuration
- Interactions configuration

#### `src/services/userService.js`
Xử lý xác thực user và quản lý user data. Trong demo sử dụng in-memory database, production nên kết nối database thực và hash passwords.

#### `src/routes/login.js`
Xử lý login form. Hiển thị form đăng nhập, xác thực credentials, lưu user vào session.

#### `src/routes/interaction.js`
Xử lý OIDC interactions như login prompt và consent. Hiển thị consent screen với danh sách scopes/permissions, xử lý user approval/denial.

#### `src/routes/logout.js`
Xử lý logout. Xóa session và hiển thị trang logout thành công.

#### `src/utils/db.js`
Cung cấp adapter cho OIDC provider storage. Mặc định sử dụng in-memory, có thể mở rộng cho Redis hoặc database.

## 🔐 Security Best Practices

### Development
- ✅ In-memory session storage
- ✅ Self-signed certificates OK
- ✅ Plain text secrets trong .env
- ✅ Detailed error messages

### Production
- ⚠️ **PHẢI** sử dụng HTTPS
- ⚠️ **PHẢI** sử dụng Redis cho session storage
- ⚠️ **PHẢI** hash passwords (bcrypt, argon2)
- ⚠️ **PHẢI** sử dụng strong secrets (crypto.randomBytes)
- ⚠️ **PHẢI** lưu clients trong database
- ⚠️ **PHẢI** implement rate limiting
- ⚠️ **PHẢI** enable CORS restrictions
- ⚠️ **PHẢI** validate redirect_uris strictly
- ⚠️ **NÊN** implement audit logging
- ⚠️ **NÊN** monitor suspicious activities

## 🎓 Demo Credentials

### Demo Users

| Username | Password | Role | Email |
|----------|----------|------|-------|
| admin | admin123 | admin | admin@example.com |
| user | user123 | user | user@example.com |
| demo | demo123 | user | demo@example.com |

### Demo Clients

| Client ID | Client Secret | Flow | Redirect URI |
|-----------|---------------|------|--------------|
| demo-client | demo-client-secret | Authorization Code | http://localhost:3000/callback |
| spa-client | (none - public) | Authorization Code + PKCE | http://localhost:4200/callback |
| service-client | service-client-secret | Client Credentials | N/A |
| mobile-app | (none - public) | Authorization Code + PKCE | myapp://callback |

## 📚 Tài liệu tham khảo

### Specifications
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)

### Libraries
- [oidc-provider](https://github.com/panva/node-oidc-provider)
- [jose](https://github.com/panva/jose)
- [Express](https://expressjs.com/)
- [express-session](https://github.com/expressjs/session)

### Tools
- [jwt.io](https://jwt.io/) - JWT Debugger
- [oauth.tools](https://oauth.tools/) - OAuth Testing
- [Postman](https://www.postman.com/) - API Testing

## ❓ Troubleshooting

### Server không khởi động

```bash
# Kiểm tra port đã được sử dụng chưa
lsof -i :3000

# Hoặc thay đổi port trong .env
PORT=3001
```

### Lỗi "Cannot find module"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Session không persist

Kiểm tra session configuration trong `src/index.js`. Nếu dùng Redis, đảm bảo Redis đang chạy:

```bash
redis-cli ping
# Response: PONG
```

### CORS errors

Trong production, cấu hình CORS trong `src/config/settings.js`:

```javascript
clientBasedCORS: (ctx, origin, client) => {
  // Chỉ allow specific origins
  return ['https://myapp.com'].includes(origin);
}
```

## 📄 License

MIT License - Tự do sử dụng cho mục đích học tập và thương mại.

## 👨‍💻 Author

Dự án demo OAuth 2.0 & OpenID Connect Authorization Server

---

**⚠️ Lưu ý:** Đây là server demo cho mục đích học tập. Trong production, cần implement thêm nhiều security measures và sử dụng database thực.

**Happy Coding! 🚀**

