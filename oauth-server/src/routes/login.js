/**
 * Login Route Handler
 * 
 * Xử lý form login và xác thực người dùng
 */

import express from 'express';
import { authenticate } from '../services/userService.js';

const router = express.Router();

/**
 * GET /login - Hiển thị form login
 */
router.get('/login', async (req, res) => {
  // Lấy interaction uid từ session hoặc query
  const { uid } = req.query;
  
  res.type('html');
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đăng nhập - OAuth Server</title>
      <style>
        :root {
          --bg: #0f172a;
          --card: #0b1220;
          --accent: #7c3aed;
          --accent-2: #22c55e;
          --text: #e2e8f0;
          --muted: #94a3b8;
          --border: #1f2937;
          --danger: #f87171;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: radial-gradient(circle at 20% 20%, rgba(124,58,237,0.2), transparent 25%),
                      radial-gradient(circle at 80% 0%, rgba(34,197,94,0.15), transparent 20%),
                      var(--bg);
          color: var(--text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
        }
        .card {
          width: 100%;
          max-width: 440px;
          background: linear-gradient(145deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00));
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          border-radius: 16px;
          padding: 28px;
          backdrop-filter: blur(12px);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), #6366f1);
          display: grid;
          place-items: center;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }
        h1 {
          margin: 0;
          font-size: 24px;
          letter-spacing: -0.3px;
        }
        .subtitle {
          margin: 0 0 18px 0;
          color: var(--muted);
          font-size: 14px;
        }
        form { margin-top: 12px; }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #cbd5e1;
        }
        .field {
          margin-bottom: 18px;
        }
        input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: #0b1220;
          color: var(--text);
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        input:focus {
          outline: none;
          border-color: rgba(124,58,237,0.8);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.18);
        }
        .btn {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          font-weight: 700;
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 12px 30px rgba(99,102,241,0.35);
        }
        .btn:hover { transform: translateY(-1px); }
        .alert {
          padding: 12px 14px;
          border-radius: 10px;
          margin-bottom: 14px;
          font-size: 13px;
          line-height: 1.5;
        }
        .alert.error {
          background: rgba(248,113,113,0.1);
          border: 1px solid rgba(248,113,113,0.3);
          color: #fecaca;
        }
        .demo {
          margin-top: 20px;
          padding: 14px;
          border-radius: 12px;
          border: 1px dashed rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
        }
        .demo h3 {
          margin: 0 0 10px 0;
          font-size: 13px;
          color: var(--muted);
          letter-spacing: 0.2px;
        }
        .demo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 8px;
        }
        .demo-item {
          background: #0f172a;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          color: var(--muted);
        }
        .demo-item strong { color: var(--text); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">
          <div class="avatar">ID</div>
          <div>
            <h1>OAuth Server</h1>
            <p class="subtitle">Authorization & Identity for your apps</p>
          </div>
        </div>

        ${req.query.error ? `<div class="alert error">❌ ${req.query.error}</div>` : ''}

        <form method="POST" action="/login${uid ? `?uid=${uid}` : ''}">
          <div class="field">
            <label for="username">Tên đăng nhập</label>
            <input id="username" name="username" type="text" required autofocus placeholder="admin / user / demo" />
          </div>
          <div class="field">
            <label for="password">Mật khẩu</label>
            <input id="password" name="password" type="password" required placeholder="Nhập mật khẩu" />
          </div>
          <button type="submit" class="btn">Đăng nhập</button>
        </form>

        <div class="demo">
          <h3>Tài khoản demo</h3>
          <div class="demo-grid">
            <div class="demo-item"><strong>admin</strong><br/>admin123</div>
            <div class="demo-item"><strong>user</strong><br/>user123</div>
            <div class="demo-item"><strong>demo</strong><br/>demo123</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

/**
 * POST /login - Xử lý đăng nhập
 */
router.post('/login', express.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  const { uid } = req.query;
  
  // Xác thực username/password
  const user = await authenticate(username, password);
  
  if (!user) {
    // Đăng nhập thất bại
    return res.redirect(`/login?error=${encodeURIComponent('Tên đăng nhập hoặc mật khẩu không đúng')}${uid ? `&uid=${uid}` : ''}`);
  }
  
  // Đăng nhập thành công
  // Lưu user vào session
  req.session.userId = user.id;
  req.session.user = user;
  
  // Nếu có uid (từ OIDC interaction), chuyển đến interaction
  if (uid) {
    return res.redirect(`/interaction/${uid}`);
  }
  
  // Nếu không có uid, chuyển về home
  res.redirect('/');
});

export default router;

