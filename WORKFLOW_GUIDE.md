# 🎯 Hướng Dẫn Workflow Với Monorepo

## ✅ Trả Lời Câu Hỏi Của Bạn

**Câu hỏi:** Có thể sửa trong branch oauth-server, upload lên branch của oauth-server, rồi thực hiện merge request cho main được không?

**Trả lời:** ✅ **CÓ, hoàn toàn được!** Đây chính là workflow đúng với monorepo.

## 🔄 Workflow Đúng

### Bước 1: Cập Nhật Feature Branch Từ Main

```bash
# 1. Đang ở main (đã có monorepo structure)
git checkout main
git pull origin main

# 2. Chuyển sang feature branch
git checkout feature/oauth_server

# 3. Merge main vào feature branch để có cấu trúc monorepo
git merge main --no-ff

# 4. Resolve conflicts (nếu có)
# - Chấp nhận cấu trúc monorepo từ main
# - Code của bạn nằm trong oauth-server/ folder

# 5. Push lên remote
git push origin feature/oauth_server
```

### Bước 2: Làm Việc Và Commit

```bash
# 1. Đảm bảo đang ở feature branch
git checkout feature/oauth_server

# 2. Sửa code trong folder oauth-server/
cd oauth-server
# ... edit files ...
cd ..

# 3. Commit changes
git add oauth-server/
git commit -m "feat(oauth-server): Add new feature"

# 4. Push lên remote branch
git push origin feature/oauth_server
```

### Bước 3: Tạo Pull Request

1. Vào GitHub repository
2. Tạo Pull Request:
   - **Base branch**: `main`
   - **Compare branch**: `feature/oauth_server`
3. Review và merge

## 📁 Điểm Quan Trọng

### ✅ ĐÚNG (Với Monorepo)
```
feature/oauth_server branch:
├── oauth-server/          ← Sửa code ở đây
│   ├── src/
│   └── package.json
├── client-app/
├── docs/
├── package.json           ← Root workspace
└── README.md
```

### ❌ SAI (Cấu Trúc Cũ)
```
feature/oauth_server branch:
├── src/                   ← Không còn cấu trúc này
├── package.json
└── README.md
```

## 🚀 Quick Start

### Lần Đầu Tiên Cập Nhật Feature Branch

```bash
# 1. Từ main
git checkout main
git pull origin main

# 2. Cập nhật feature branch
git checkout feature/oauth_server
git merge main

# 3. Resolve conflicts (nếu có)
# Giữ cấu trúc monorepo, giữ code changes

# 4. Push
git push origin feature/oauth_server
```

### Mỗi Lần Làm Việc

```bash
# 1. Sync với main trước
git checkout feature/oauth_server
git pull origin main
git merge main

# 2. Làm việc
cd oauth-server
# ... code changes ...

# 3. Commit và push
cd ..
git add oauth-server/
git commit -m "feat: Description"
git push origin feature/oauth_server

# 4. Tạo PR trên GitHub (nếu cần)
```

## ⚠️ Lưu Ý

1. **Code location**: Code OAuth server phải nằm trong `oauth-server/` folder
2. **Paths**: Đã được cập nhật cho monorepo, không cần sửa
3. **Conflicts**: Ưu tiên cấu trúc monorepo từ main

