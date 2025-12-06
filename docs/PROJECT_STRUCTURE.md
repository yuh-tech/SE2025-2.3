# 📁 Cấu Trúc Dự Án Đề Xuất

## 🎯 Mục Tiêu

Tổ chức dự án OAuth 2.0 / OpenID Connect system với 2 components chính:
1. **OAuth Server** - Authorization Server
2. **Client App** - Client application để test

---

## 📂 Cấu Trúc Monorepo (Khuyến Nghị)

```
Final_Project/
│
├── 📄 README.md                    # Tổng quan dự án
├── 📄 .gitignore                  # Git ignore rules
├── 📄 package.json                # Root workspace config
├── 📄 .env.example                # Environment variables template
│
├── 📁 oauth-server/               # OAuth 2.0 / OIDC Authorization Server
│   ├── 📄 README.md
│   ├── 📄 package.json
│   ├── 📄 .env.example
│   ├── 📁 src/
│   │   ├── index.js
│   │   ├── provider.js
│   │   ├── config/
│   │   │   ├── settings.js
│   │   │   ├── clients.js
│   │   │   ├── scopes.js
│   │   │   └── claims.js
│   │   ├── routes/
│   │   │   ├── login.js
│   │   │   ├── interaction.js
│   │   │   └── logout.js
│   │   ├── services/
│   │   │   └── userService.js
│   │   └── utils/
│   │       └── db.js
│   └── 📁 docs/
│       ├── FEATURES_ANALYSIS.md
│       ├── CLIENT_REGISTRATION_GUIDE.md
│       └── COMPATIBILITY_CHECK.md
│
├── 📁 client-app/                 # Client Application
│   ├── 📄 README.md
│   ├── 📄 package.json
│   ├── 📄 .env.example
│   ├── 📁 src/
│   │   ├── index.js / App.jsx
│   │   ├── components/
│   │   ├── services/
│   │   │   └── oauthService.js
│   │   └── utils/
│   └── 📁 public/
│
├── 📁 docs/                       # Tài liệu chung
│   ├── GIT_WORKFLOW.md
│   ├── PROJECT_STRUCTURE.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
└── 📁 scripts/                    # Scripts tiện ích
    ├── setup.sh
    ├── deploy.sh
    └── test.sh
```

---

## 📋 Chi Tiết Các Thành Phần

### 1. Root Level

#### `package.json` (Workspace)
```json
{
  "name": "oauth-oidc-system",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "oauth-server",
    "client-app"
  ],
  "scripts": {
    "setup": "npm install && cd oauth-server && npm install && cd ../client-app && npm install",
    "dev:server": "cd oauth-server && npm run dev",
    "dev:client": "cd client-app && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\""
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

#### `.env.example`
```env
# OAuth Server
OAUTH_SERVER_PORT=3000
OAUTH_SERVER_ISSUER=http://localhost:3000

# Client App
CLIENT_APP_PORT=3001
CLIENT_APP_REDIRECT_URI=http://localhost:3001/callback
```

---

### 2. `oauth-server/`

Chứa toàn bộ code từ `feature/oauth_server` branch.

**Cấu trúc hiện tại:**
- ✅ Đã có đầy đủ
- ✅ Đã tương thích với oidc-provider v9.5.2
- ✅ Có documentation

**Cần làm:**
- Di chuyển vào thư mục `oauth-server/`
- Cập nhật paths nếu cần

---

### 3. `client-app/`

Sẽ chứa code từ `feature/client_app` branch.

**Cấu trúc đề xuất:**
```
client-app/
├── src/
│   ├── App.jsx / index.js
│   ├── components/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   └── Callback.jsx
│   ├── services/
│   │   └── oauthService.js
│   └── utils/
│       └── pkce.js
├── package.json
└── README.md
```

---

### 4. `docs/`

Tài liệu chung cho cả dự án:
- `GIT_WORKFLOW.md` - Git workflow
- `PROJECT_STRUCTURE.md` - Cấu trúc dự án
- `ARCHITECTURE.md` - Kiến trúc hệ thống
- `DEPLOYMENT.md` - Hướng dẫn deploy

---

## 🔄 Migration Plan

### Bước 1: Chuẩn Bị Main Branch

```bash
# Checkout main
git checkout main
git pull origin main

# Tạo cấu trúc thư mục
mkdir -p oauth-server client-app docs scripts
```

### Bước 2: Merge OAuth Server

```bash
# Merge feature branch
git merge feature/oauth_server

# Di chuyển files vào oauth-server/
git mv src oauth-server/
git mv package.json oauth-server/
git mv README.md oauth-server/
git mv .env.example oauth-server/ 2>/dev/null || true

# Di chuyển docs
git mv FEATURES_ANALYSIS.md oauth-server/docs/
git mv CLIENT_REGISTRATION_GUIDE.md oauth-server/docs/
git mv COMPATIBILITY_CHECK.md oauth-server/docs/
```

### Bước 3: Tạo Root Files

```bash
# Tạo root README.md
# Tạo root package.json (workspace)
# Tạo root .env.example
```

### Bước 4: Commit và Push

```bash
git add .
git commit -m "refactor: Reorganize project structure as monorepo"
git push origin main
```

---

## 📝 Root README.md Template

```markdown
# OAuth 2.0 / OpenID Connect System

Hệ thống OAuth 2.0 & OpenID Connect hoàn chỉnh gồm:
- **OAuth Server** - Authorization Server
- **Client App** - Client application để test

## 🚀 Quick Start

### Setup
\`\`\`bash
npm run setup
\`\`\`

### Development
\`\`\`bash
# Run cả 2 services
npm run dev

# Hoặc chạy riêng
npm run dev:server  # OAuth server trên port 3000
npm run dev:client  # Client app trên port 3001
\`\`\`

## 📁 Cấu Trúc

- \`oauth-server/\` - OAuth 2.0 / OIDC Authorization Server
- \`client-app/\` - Client Application
- \`docs/\` - Tài liệu

## 📚 Documentation

- [Git Workflow](./docs/GIT_WORKFLOW.md)
- [Project Structure](./docs/PROJECT_STRUCTURE.md)
- [OAuth Server README](./oauth-server/README.md)
- [Client App README](./client-app/README.md)
```

---

## ✅ Checklist Migration

- [ ] Tạo cấu trúc thư mục
- [ ] Merge feature/oauth_server
- [ ] Di chuyển files vào oauth-server/
- [ ] Tạo root package.json (workspace)
- [ ] Tạo root README.md
- [ ] Update .gitignore nếu cần
- [ ] Test setup script
- [ ] Commit và push
- [ ] Update feature branches nếu cần

---

## 🎯 Lợi Ích Cấu Trúc Này

1. **Tổ chức rõ ràng:** Mỗi component có thư mục riêng
2. **Dễ quản lý:** Monorepo giúp quản lý dependencies chung
3. **Dễ test:** Có thể test integration giữa server và client
4. **Scalable:** Dễ thêm components mới sau này
5. **Documentation:** Tài liệu tập trung ở docs/

