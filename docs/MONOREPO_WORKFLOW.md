# 🔄 Monorepo Workflow Guide

## 📋 Tổng Quan

Dự án hiện tại đã chuyển sang **monorepo structure** với:
- `main` branch: Chứa cấu trúc monorepo hoàn chỉnh
- `feature/oauth_server`: Cần cập nhật để đồng bộ với monorepo
- `feature/client_app`: Cần cập nhật khi có

## 🌳 Cấu Trúc Monorepo

```
Final_Project/
├── oauth-server/     # OAuth Server code
├── client-app/       # Client App code (future)
├── docs/             # General documentation
├── package.json      # Root workspace config
└── README.md         # Root README
```

## 🔄 Workflow Với Monorepo

### Bước 1: Cập Nhật Feature Branch Từ Main

Khi `main` đã có cấu trúc monorepo, các feature branches cần được cập nhật:

```bash
# 1. Đảm bảo main đã có code mới nhất
git checkout main
git pull origin main

# 2. Checkout feature branch
git checkout feature/oauth_server

# 3. Merge main vào feature branch
git merge main --no-ff

# 4. Resolve conflicts (nếu có)
# - Giữ cấu trúc monorepo từ main
# - Code changes nằm trong oauth-server/ folder

# 5. Push lên remote
git push origin feature/oauth_server
```

### Bước 2: Làm Việc Trên Feature Branch

Khi làm việc trên `feature/oauth_server`:

```bash
# 1. Đảm bảo đang ở feature branch
git checkout feature/oauth_server

# 2. Cập nhật từ main nếu cần
git pull origin main
git merge main  # hoặc git rebase main

# 3. Sửa code trong folder oauth-server/
cd oauth-server
# ... make changes ...

# 4. Commit changes
git add oauth-server/
git commit -m "feat(oauth-server): Add new feature"

# 5. Push lên remote
git push origin feature/oauth_server
```

### Bước 3: Tạo Pull Request

```bash
# 1. Đảm bảo feature branch đã up-to-date với main
git checkout feature/oauth_server
git pull origin main
git merge main

# 2. Push lên remote
git push origin feature/oauth_server

# 3. Tạo Pull Request trên GitHub
# - Base: main
# - Compare: feature/oauth_server
# - Review và merge
```

## ⚠️ Lưu Ý Quan Trọng

### 1. Code Location
- ✅ **ĐÚNG**: Code OAuth server nằm trong `oauth-server/` folder
- ❌ **SAI**: Code ở root level như cấu trúc cũ

### 2. Path Changes
- Tất cả imports và paths đã được cập nhật cho monorepo
- Không cần thay đổi gì trong code

### 3. Conflicts Resolution
Khi merge từ main, nếu có conflicts:
- **Giữ cấu trúc monorepo** (files trong `oauth-server/`)
- **Giữ code changes** từ feature branch
- **Không revert** cấu trúc monorepo về cấu trúc cũ

## 📝 Ví Dụ Workflow Hoàn Chỉnh

### Scenario: Thêm feature mới vào OAuth Server

```bash
# 1. Bắt đầu từ main
git checkout main
git pull origin main

# 2. Tạo/tạo lại feature branch từ main
git checkout -b feature/oauth_server
# HOẶC nếu branch đã tồn tại
git checkout feature/oauth_server
git merge main  # Đồng bộ với main

# 3. Làm việc với code trong oauth-server/
cd oauth-server
# ... edit files in oauth-server/src/ ...

# 4. Commit
cd ..
git add oauth-server/
git commit -m "feat(oauth-server): Add user profile endpoint"

# 5. Push
git push origin feature/oauth_server

# 6. Tạo Pull Request trên GitHub
# - Base branch: main
# - Head branch: feature/oauth_server
```

## 🎯 Best Practices

1. **Luôn sync với main trước khi bắt đầu**:
   ```bash
   git checkout feature/oauth_server
   git pull origin main
   git merge main
   ```

2. **Chỉ sửa code trong folder tương ứng**:
   - OAuth server: `oauth-server/`
   - Client app: `client-app/`
   - Docs: `docs/`

3. **Commit message rõ ràng**:
   ```bash
   git commit -m "feat(oauth-server): Add PKCE support"
   git commit -m "fix(oauth-server): Fix token expiration bug"
   git commit -m "docs: Update setup instructions"
   ```

4. **Test trước khi push**:
   ```bash
   cd oauth-server
   npm install
   npm run dev
   # Test functionality
   ```

## 🔧 Troubleshooting

### Problem: Feature branch có cấu trúc cũ

**Giải pháp**: Merge từ main để cập nhật cấu trúc
```bash
git checkout feature/oauth_server
git merge main
# Resolve conflicts nếu có
git push origin feature/oauth_server
```

### Problem: Conflicts khi merge

**Giải pháp**: Ưu tiên cấu trúc monorepo từ main
```bash
# Trong conflict resolution:
# - Accept monorepo structure từ main
# - Keep code changes từ feature branch
# - Files should be in oauth-server/ folder
```

## 📚 Tài Liệu Liên Quan

- [Git Workflow](./GIT_WORKFLOW.md) - Git workflow chi tiết
- [Project Structure](./PROJECT_STRUCTURE.md) - Cấu trúc dự án
- [Migration Guide](./MIGRATION_GUIDE.md) - Hướng dẫn migration

