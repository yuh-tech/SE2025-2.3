# 🔄 Migration Guide: Tổ Chức Main Branch

## 🎯 Mục Tiêu

Tổ chức lại `main` branch thành monorepo với cấu trúc:
```
Final_Project/
├── oauth-server/    # Từ feature/oauth_server
├── client-app/      # Từ feature/client_app (sau này)
└── docs/            # Tài liệu chung
```

---

## 📋 Checklist Migration

### Phase 1: Chuẩn Bị Main Branch

- [ ] Backup code hiện tại
- [ ] Checkout main branch
- [ ] Pull latest từ remote
- [ ] Tạo cấu trúc thư mục mới

### Phase 2: Merge OAuth Server

- [ ] Merge feature/oauth_server vào main
- [ ] Di chuyển files vào oauth-server/
- [ ] Update paths nếu cần
- [ ] Test OAuth server vẫn hoạt động

### Phase 3: Setup Monorepo

- [ ] Tạo root package.json (workspace)
- [ ] Tạo root README.md
- [ ] Update .gitignore
- [ ] Tạo setup scripts

### Phase 4: Documentation

- [ ] Di chuyển docs vào docs/
- [ ] Update README files
- [ ] Tạo ARCHITECTURE.md

---

## 🚀 Hướng Dẫn Thực Hiện

### Bước 1: Backup và Chuẩn Bị

```bash
# Đảm bảo đã commit tất cả changes
git status

# Backup branch hiện tại (optional)
git branch backup-oauth-server feature/oauth_server

# Checkout main
git checkout main
git pull origin main
```

### Bước 2: Tạo Cấu Trúc Thư Mục

```bash
# Tạo các thư mục
mkdir -p oauth-server/docs
mkdir -p client-app
mkdir -p docs
mkdir -p scripts
```

### Bước 3: Merge OAuth Server Feature

```bash
# Merge feature branch
git merge feature/oauth_server --no-ff -m "Merge feature/oauth_server into main"

# Nếu có conflicts, resolve và commit
```

### Bước 4: Di Chuyển Files

```bash
# Di chuyển source code
git mv src oauth-server/
git mv package.json oauth-server/
git mv package-lock.json oauth-server/ 2>/dev/null || true

# Di chuyển README (sẽ tạo mới cho root)
git mv README.md oauth-server/README.md

# Di chuyển documentation
git mv FEATURES_ANALYSIS.md oauth-server/docs/ 2>/dev/null || true
git mv CLIENT_REGISTRATION_GUIDE.md oauth-server/docs/ 2>/dev/null || true
git mv COMPATIBILITY_CHECK.md oauth-server/docs/ 2>/dev/null || true

# Di chuyển workflow docs vào docs/
git mv GIT_WORKFLOW.md docs/ 2>/dev/null || true
git mv PROJECT_STRUCTURE.md docs/ 2>/dev/null || true
git mv MIGRATION_GUIDE.md docs/ 2>/dev/null || true
```

### Bước 5: Tạo Root Files

#### Root `package.json`

```json
{
  "name": "oauth-oidc-system",
  "version": "1.0.0",
  "description": "OAuth 2.0 & OpenID Connect System - Authorization Server + Client App",
  "private": true,
  "workspaces": [
    "oauth-server",
    "client-app"
  ],
  "scripts": {
    "setup": "npm install && cd oauth-server && npm install",
    "dev:server": "cd oauth-server && npm run dev",
    "dev:client": "cd client-app && npm run dev",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "test": "npm run test --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### Root `README.md`

```markdown
# OAuth 2.0 / OpenID Connect System

Hệ thống OAuth 2.0 & OpenID Connect hoàn chỉnh gồm Authorization Server và Client Application.

## 📁 Cấu Trúc

- \`oauth-server/\` - OAuth 2.0 / OIDC Authorization Server
- \`client-app/\` - Client Application (đang phát triển)
- \`docs/\` - Tài liệu chung

## 🚀 Quick Start

### Setup
\`\`\`bash
npm run setup
\`\`\`

### Development
\`\`\`bash
# Run OAuth server
npm run dev:server

# Run client app (khi đã có)
npm run dev:client

# Run cả 2 (khi đã có client app)
npm run dev
\`\`\`

## 📚 Documentation

- [Git Workflow](./docs/GIT_WORKFLOW.md)
- [Project Structure](./docs/PROJECT_STRUCTURE.md)
- [OAuth Server](./oauth-server/README.md)

## 🔗 Links

- OAuth Server: http://localhost:3000
- Client App: http://localhost:3001 (khi đã có)
```

### Bước 6: Update .gitignore

Thêm vào `.gitignore`:
```
# Workspace
node_modules/
.pnpm-store/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
```

### Bước 7: Test và Commit

```bash
# Test OAuth server vẫn hoạt động
cd oauth-server
npm install
npm run dev
# Test trong browser: http://localhost:3000

# Quay lại root
cd ..

# Commit changes
git add .
git commit -m "refactor: Reorganize project as monorepo

- Move oauth-server code into oauth-server/
- Create root workspace package.json
- Add documentation structure
- Prepare for client-app integration"

# Push
git push origin main
```

---

## 🔄 Sau Khi Migration

### Update Feature Branches

```bash
# Update feature/oauth_server từ main
git checkout feature/oauth_server
git pull origin main
# Resolve conflicts nếu có
git push origin feature/oauth_server
```

### Tiếp Tục Phát Triển

```bash
# Tạo feature branch mới từ main
git checkout main
git checkout -b feature/new-feature

# Hoặc tiếp tục trên feature/oauth_server
git checkout feature/oauth_server
```

---

## ⚠️ Lưu Ý

1. **Backup trước khi migrate:** Đảm bảo đã backup code
2. **Test kỹ:** Test OAuth server sau khi di chuyển
3. **Update paths:** Kiểm tra các import paths có đúng không
4. **Documentation:** Update tất cả links trong docs

---

## 🆘 Troubleshooting

### Lỗi: Module not found
- Kiểm tra paths trong imports
- Đảm bảo đã chạy `npm install` trong oauth-server/

### Lỗi: Workspace không hoạt động
- Kiểm tra `package.json` có `workspaces` không
- Chạy `npm install` ở root level

### Conflicts khi merge
- Resolve conflicts cẩn thận
- Test lại sau khi resolve

---

## ✅ Verification Checklist

Sau khi migration, kiểm tra:

- [ ] OAuth server chạy được: `cd oauth-server && npm run dev`
- [ ] Tất cả endpoints hoạt động
- [ ] Documentation links đúng
- [ ] Git history được giữ nguyên
- [ ] Feature branches có thể update từ main

