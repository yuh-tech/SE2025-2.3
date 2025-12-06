# OAuth 2.0 / OpenID Connect System

Hệ thống OAuth 2.0 & OpenID Connect hoàn chỉnh gồm Authorization Server và Client Application.

## 📁 Cấu Trúc

- `oauth-server/` - OAuth 2.0 / OIDC Authorization Server
- `client-app/` - Client Application (đang phát triển)
- `docs/` - Tài liệu chung

## 🚀 Quick Start

### Setup

```bash
npm run setup
```

### Development

```bash
# Run OAuth server
npm run dev:server

# Run client app (khi đã có)
npm run dev:client

# Run cả 2 (khi đã có client app)
npm run dev
```

## 📚 Documentation

- [Git Workflow](./docs/GIT_WORKFLOW.md)
- [Project Structure](./docs/PROJECT_STRUCTURE.md)
- [Migration Guide](./docs/MIGRATION_GUIDE.md)
- [Migration Status](./docs/MIGRATION_STATUS.md)
- [OAuth Server](./oauth-server/README.md)

## 🔗 Links

- OAuth Server: http://localhost:3000
- Client App: http://localhost:3001 (khi đã có)

## 📦 Workspaces

This project uses npm workspaces to manage multiple packages:

- `oauth-server` - The OAuth 2.0 / OIDC Authorization Server
- `client-app` - Client application (future)

