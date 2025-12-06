# 🌿 Git Workflow & Branch Strategy

## 📋 Tổng Quan Cấu Trúc Dự Án

Dự án này là một **OAuth 2.0 & OpenID Connect** system gồm 2 phần chính:
1. **Authorization Server** (`feature/oauth_server`) - OAuth/OIDC server
2. **Client Application** (`feature/client_app`) - Client app để test OAuth server

---

## 🌳 Branch Strategy

### Cấu Trúc Branches

```
main (production-ready)
├── feature/oauth_server (OAuth Server)
└── feature/client_app (Client Application)
```

### Mô Tả Các Branches

#### 1. **`main`** - Production Branch
- **Mục đích:** Chứa code ổn định, đã test, sẵn sàng production
- **Quy tắc:**
  - Chỉ merge từ feature branches đã hoàn thành và tested
  - Luôn ở trạng thái deployable
  - Không commit trực tiếp vào main
  - Mỗi merge phải có PR (Pull Request) và review

#### 2. **`feature/oauth_server`** - OAuth Server Feature
- **Mục đích:** Phát triển OAuth 2.0 / OpenID Connect Authorization Server
- **Nội dung:**
  - OAuth/OIDC server implementation
  - Login, consent, token endpoints
  - User management
  - Client registration
- **Status:** ✅ Đang phát triển, đã có cơ bản

#### 3. **`feature/client_app`** - Client Application Feature
- **Mục đích:** Phát triển client app để test OAuth server
- **Nội dung:**
  - Client app (React/Vue/Node.js)
  - OAuth flow implementation
  - Token management
  - User info display
- **Status:** 🔄 Đang phát triển

---

## 📁 Cấu Trúc Thư Mục Đề Xuất cho `main`

```
Final_Project/
├── README.md                 # Tổng quan dự án
├── .gitignore               # Git ignore rules
├── package.json             # Root package.json (workspace)
│
├── oauth-server/            # OAuth Server (từ feature/oauth_server)
│   ├── src/
│   ├── package.json
│   ├── README.md
│   └── .env.example
│
├── client-app/              # Client App (từ feature/client_app)
│   ├── src/
│   ├── package.json
│   ├── README.md
│   └── .env.example
│
├── docs/                    # Tài liệu chung
│   ├── GIT_WORKFLOW.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
└── scripts/                 # Scripts tiện ích
    ├── setup.sh
    └── deploy.sh
```

---

## 🔄 Workflow Đề Xuất

### 1. **Phát Triển Feature**

```bash
# Tạo feature branch từ main
git checkout main
git pull origin main
git checkout -b feature/oauth_server

# Phát triển feature
# ... code changes ...

# Commit và push
git add .
git commit -m "feat: Add OAuth server implementation"
git push origin feature/oauth_server
```

### 2. **Merge Feature vào Main**

```bash
# Option 1: Merge trực tiếp (nếu là solo project)
git checkout main
git pull origin main
git merge feature/oauth_server
git push origin main

# Option 2: Tạo Pull Request (khuyến nghị)
# - Tạo PR trên GitHub/GitLab
# - Review code
# - Merge sau khi approved
```

### 3. **Cập Nhật Feature Branch từ Main**

```bash
# Khi main có updates mới
git checkout feature/oauth_server
git pull origin main
git merge main
# Resolve conflicts nếu có
git push origin feature/oauth_server
```

---

## 📝 Commit Message Convention

Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Ví dụ:
```bash
git commit -m "feat(oauth): Add PKCE support"
git commit -m "fix(auth): Fix token expiration issue"
git commit -m "docs: Update README with setup instructions"
```

---

## 🎯 Chiến Lược Merge vào Main

### Khi Nào Merge vào Main?

1. ✅ Feature đã hoàn thành và tested
2. ✅ Code đã được review (nếu có team)
3. ✅ Không có breaking changes hoặc đã document
4. ✅ Documentation đã được cập nhật

### Quy Trình Merge

#### Bước 1: Chuẩn Bị Feature Branch
```bash
# Đảm bảo feature branch up-to-date với main
git checkout feature/oauth_server
git pull origin main
git merge main
# Fix conflicts nếu có
git push origin feature/oauth_server
```

#### Bước 2: Tạo Pull Request
- Tạo PR trên GitHub/GitLab
- Mô tả rõ ràng những gì đã thay đổi
- Link đến issues nếu có
- Request review nếu có team

#### Bước 3: Review & Merge
- Review code
- Test locally nếu cần
- Approve và merge

#### Bước 4: Cleanup
```bash
# Sau khi merge, xóa feature branch (optional)
git checkout main
git pull origin main
git branch -d feature/oauth_server
git push origin --delete feature/oauth_server
```

---

## 🏗️ Tổ Chức Main Branch

### Option 1: Monorepo (Khuyến Nghị)

Giữ cả 2 projects trong cùng 1 repo:

```
Final_Project/
├── oauth-server/     # Từ feature/oauth_server
├── client-app/       # Từ feature/client_app
└── docs/             # Tài liệu chung
```

**Ưu điểm:**
- Dễ quản lý dependencies chung
- Dễ test integration
- Version control đồng bộ

**Nhược điểm:**
- Repo lớn hơn
- Cần cấu hình workspace

### Option 2: Separate Repos

Tách thành 2 repos riêng:
- `oauth-server` repo
- `client-app` repo

**Ưu điểm:**
- Tách biệt rõ ràng
- Dễ deploy độc lập

**Nhược điểm:**
- Khó quản lý version
- Cần sync dependencies

---

## 📋 Checklist Trước Khi Merge vào Main

### Code Quality
- [ ] Code đã được format (Prettier/ESLint)
- [ ] Không có linter errors
- [ ] Code đã được review
- [ ] Tests đã pass (nếu có)

### Documentation
- [ ] README đã được cập nhật
- [ ] API documentation đã được cập nhật
- [ ] Changelog đã được cập nhật

### Configuration
- [ ] Environment variables đã được document
- [ ] `.env.example` đã được cập nhật
- [ ] Dependencies đã được cập nhật trong package.json

### Testing
- [ ] Đã test locally
- [ ] Đã test integration với các components khác
- [ ] Không có breaking changes hoặc đã document

---

## 🔧 Scripts Hữu Ích

### Setup Script (`scripts/setup.sh`)

```bash
#!/bin/bash
# Setup cả 2 projects
cd oauth-server && npm install
cd ../client-app && npm install
```

### Deploy Script (`scripts/deploy.sh`)

```bash
#!/bin/bash
# Deploy OAuth server
cd oauth-server && npm run build && npm start
```

---

## 🚀 Next Steps

1. **Quyết định cấu trúc:**
   - [ ] Monorepo (Option 1) - Khuyến nghị
   - [ ] Separate repos (Option 2)

2. **Chuẩn bị main branch:**
   - [ ] Tạo cấu trúc thư mục
   - [ ] Merge feature/oauth_server vào main
   - [ ] Tổ chức lại code nếu cần

3. **Thiết lập workflow:**
   - [ ] Tạo PR template
   - [ ] Setup CI/CD (nếu cần)
   - [ ] Tạo issue templates

---

## 📚 Tài Liệu Tham Khảo

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

