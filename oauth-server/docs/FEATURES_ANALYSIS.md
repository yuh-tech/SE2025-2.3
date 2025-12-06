# 📊 Phân Tích Features và Cấu Hình OAuth/OIDC Server

## 🔍 Tổng Quan Dự Án

Dự án này là một **OAuth 2.0 & OpenID Connect Authorization Server** được xây dựng với:
- **Node.js** + **Express**
- **oidc-provider v9.5.2**
- **CommonJS** (require/module.exports)

---

## ✅ Các Features Đang Được Bật

### 1. **PKCE (Proof Key for Code Exchange)** 🔐
**Trạng thái:** ✅ BẬT (bắt buộc cho tất cả clients)

**Cấu hình:**
```javascript
pkce: {
  methods: ['S256'],  // Chỉ hỗ trợ S256 (SHA256), không hỗ trợ 'plain'
  required: () => true,  // Bắt buộc cho TẤT CẢ clients
}
```

**Ý nghĩa:**
- PKCE là một extension của OAuth 2.0 để bảo mật Authorization Code Flow
- Bảo vệ chống lại authorization code interception attacks
- **S256**: Sử dụng SHA256 để hash code verifier
- **required: () => true**: Tất cả clients (kể cả confidential) đều phải dùng PKCE

**Endpoint liên quan:**
- `/authorize` - Client phải gửi `code_challenge` và `code_challenge_method=S256`
- `/token` - Client phải gửi `code_verifier` để verify

---

### 2. **Revocation Endpoint** 🔄
**Trạng thái:** ✅ BẬT

**Cấu hình:**
```javascript
features: {
  revocation: { enabled: true }
}
```

**Endpoint:** `POST /revoke`

**Chức năng:**
- Cho phép client revoke (thu hồi) access tokens và refresh tokens
- Client gửi request với token cần revoke
- Token sẽ bị vô hiệu hóa ngay lập tức

**Ví dụ sử dụng:**
```bash
POST /revoke
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

token=ACCESS_TOKEN&token_type_hint=access_token
```

---

### 3. **Introspection Endpoint** 🔍
**Trạng thái:** ✅ BẬT

**Cấu hình:**
```javascript
features: {
  introspection: { enabled: true }
}
```

**Endpoint:** `POST /introspect`

**Chức năng:**
- Cho phép resource server kiểm tra tính hợp lệ của access token
- Trả về thông tin chi tiết về token (active, expires_at, scopes, etc.)

**Ví dụ sử dụng:**
```bash
POST /introspect
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

token=ACCESS_TOKEN&token_type_hint=access_token
```

**Response:**
```json
{
  "active": true,
  "scope": "openid profile email",
  "client_id": "demo-client",
  "username": "admin",
  "exp": 1234567890
}
```

---

### 4. **UserInfo Endpoint** 👤
**Trạng thái:** ✅ BẬT

**Cấu hình:**
```javascript
features: {
  userinfo: { enabled: true }
}
```

**Endpoint:** `GET /userinfo`

**Chức năng:**
- Trả về thông tin người dùng dựa trên access token
- Claims được trả về phụ thuộc vào scopes được cấp

**Ví dụ sử dụng:**
```bash
GET /userinfo
Authorization: Bearer ACCESS_TOKEN
```

**Response:**
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

---

### 5. **Client Credentials Grant** 🔑
**Trạng thái:** ✅ BẬT

**Cấu hình:**
```javascript
features: {
  clientCredentials: { enabled: true }
}
```

**Chức năng:**
- Cho phép server-to-server authentication
- Client sử dụng `client_id` và `client_secret` để lấy access token
- Không cần user interaction

**Ví dụ sử dụng:**
```bash
POST /token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=client_credentials&scope=api:read api:write
```

---

## ❌ Các Features Đang TẮT

### 1. **Dynamic Client Registration** 📝
**Trạng thái:** ❌ TẮT

**Cấu hình:**
```javascript
features: {
  registration: { enabled: false }
}
```

**Ý nghĩa:**
- Hiện tại clients phải được đăng ký thủ công trong `src/config/clients.js`
- Nếu bật, clients có thể tự đăng ký qua endpoint `/registration`

**Cách bật (nếu cần):**
```javascript
registration: { 
  enabled: true,
  initialAccessToken: 'your-initial-access-token' // Bảo vệ endpoint
}
```

---

### 2. **Pushed Authorization Requests (PAR)** 📤
**Trạng thái:** ❌ TẮT

**Ý nghĩa:**
- Cho phép client push authorization request lên server trước
- Tăng bảo mật bằng cách giảm kích thước URL

---

### 3. **Encryption** 🔒
**Trạng thái:** ❌ TẮT

**Ý nghĩa:**
- ID tokens và UserInfo responses không được mã hóa
- Chỉ có signing (JWT), không có encryption

---

## 🔧 Các Cấu Hình Quan Trọng Khác

### **Token Formats**
```javascript
formats: {
  AccessToken: 'jwt',        // Access tokens là JWT (có thể verify)
  ClientCredentials: 'jwt'   // Client credentials tokens là JWT
}
```

**Lợi ích:**
- JWT tokens có thể được verify mà không cần gọi introspection endpoint
- Chứa thông tin về scopes, expiration, etc. ngay trong token

---

### **Response Types**
```javascript
responseTypes: ['code', 'code id_token']
```

**Hỗ trợ:**
- `code`: Authorization Code Flow (chính)
- `code id_token`: Hybrid Flow (code + id_token ngay lập tức)

---

### **Grant Types**
```javascript
grantTypes: [
  'authorization_code',  // Authorization Code Flow
  'refresh_token',       // Refresh Token Flow
  'client_credentials'   // Client Credentials Flow
]
```

---

### **Token TTL (Time To Live)**
```javascript
ttl: {
  AccessToken: 3600,           // 1 giờ
  AuthorizationCode: 600,       // 10 phút
  IdToken: 3600,               // 1 giờ
  RefreshToken: 1209600,       // 14 ngày
  ClientCredentials: 600,       // 10 phút
  Interaction: 3600,           // 1 giờ
  Session: 1209600,            // 14 ngày
  Grant: 1209600                // 14 ngày
}
```

---

### **Refresh Token Configuration**
```javascript
issueRefreshToken: async (ctx, client, code) => {
  if (!code) return false;
  return code.scopes.has('offline_access');  // Chỉ issue khi có offline_access scope
}

rotateRefreshToken: true  // Rotate refresh token mỗi lần sử dụng
```

**Ý nghĩa:**
- Refresh token chỉ được cấp khi client request scope `offline_access`
- Refresh token được rotate (thay đổi) mỗi lần sử dụng để tăng bảo mật

---

### **Claims Configuration**
```javascript
claims: {
  openid: ['sub'],
  profile: ['name', 'family_name', 'given_name', ...],
  email: ['email', 'email_verified'],
  address: ['address'],
  phone: ['phone_number', 'phone_number_verified']
}
```

**Mapping:**
- Mỗi scope map với một danh sách claims
- Khi client request scope `profile`, user sẽ nhận các claims: name, family_name, given_name, etc.

---

## 📋 Danh Sách Endpoints

| Endpoint | Method | Mô tả | Feature |
|----------|--------|-------|---------|
| `/.well-known/openid-configuration` | GET | Discovery document | Tự động |
| `/jwks.json` | GET | Public keys (JWKS) | Tự động |
| `/authorize` | GET | Authorization endpoint | Core |
| `/token` | POST | Token endpoint | Core |
| `/userinfo` | GET | UserInfo endpoint | ✅ userinfo |
| `/revoke` | POST | Token revocation | ✅ revocation |
| `/introspect` | POST | Token introspection | ✅ introspection |
| `/logout` | GET/POST | End session | Core |
| `/registration` | POST | Client registration | ❌ (tắt) |

---

## 🔐 Security Features

1. **PKCE bắt buộc** - Tất cả clients phải dùng PKCE
2. **JWT Signing** - Tokens được ký bằng RS256
3. **Token Rotation** - Refresh tokens được rotate
4. **Secure Cookies** - HttpOnly, SameSite
5. **CORS** - Hiện tại cho phép tất cả origins (development)

---

## 📝 Lưu Ý Quan Trọng

1. **PKCE required: () => true** - Hiện tại BẮT BUỘC tất cả clients dùng PKCE
   - Nếu muốn chỉ bắt buộc cho public clients: `required: (ctx, client) => client.tokenEndpointAuthMethod === 'none'`

2. **Token Storage** - Hiện tại dùng in-memory adapter
   - Production nên dùng Redis hoặc database

3. **Client Storage** - Clients được lưu trong file `src/config/clients.js`
   - Production nên lưu trong database

4. **User Storage** - Users được lưu trong memory (src/services/userService.js)
   - Production nên kết nối database và hash passwords

