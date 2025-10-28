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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .login-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 400px;
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #667eea;
          font-size: 28px;
          margin-bottom: 5px;
        }
        .logo p {
          color: #718096;
          font-size: 14px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          color: #2d3748;
          font-weight: 500;
          font-size: 14px;
        }
        input {
          width: 100%;
          padding: 12px 15px;
          border: 2px solid #e2e8f0;
          border-radius: 5px;
          font-size: 14px;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
        }
        .btn {
          width: 100%;
          padding: 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #5a67d8;
        }
        .error {
          background: #fed7d7;
          color: #c53030;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .info {
          background: #bee3f8;
          color: #2c5282;
          padding: 12px;
          border-radius: 5px;
          margin-bottom: 20px;
          font-size: 14px;
        }
        .demo-accounts {
          margin-top: 25px;
          padding-top: 25px;
          border-top: 1px solid #e2e8f0;
        }
        .demo-accounts h3 {
          font-size: 14px;
          color: #4a5568;
          margin-bottom: 10px;
        }
        .demo-account {
          background: #f7fafc;
          padding: 8px 12px;
          border-radius: 5px;
          margin-bottom: 8px;
          font-size: 12px;
          color: #4a5568;
        }
        .demo-account code {
          background: #edf2f7;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <div class="logo">
          <h1>🔐 OAuth Server</h1>
          <p>Authorization & Authentication</p>
        </div>
        
        ${req.query.error ? `<div class="error">❌ ${req.query.error}</div>` : ''}
        
        <form method="POST" action="/login${uid ? `?uid=${uid}` : ''}">
          <div class="form-group">
            <label for="username">Tên đăng nhập</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              required 
              autofocus
              placeholder="Nhập tên đăng nhập"
            >
          </div>
          
          <div class="form-group">
            <label for="password">Mật khẩu</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required
              placeholder="Nhập mật khẩu"
            >
          </div>
          
          <button type="submit" class="btn">Đăng nhập</button>
        </form>
        
        <div class="demo-accounts">
          <h3>📝 Tài khoản demo:</h3>
          <div class="demo-account">
            <strong>Admin:</strong> <code>admin</code> / <code>admin123</code>
          </div>
          <div class="demo-account">
            <strong>User:</strong> <code>user</code> / <code>user123</code>
          </div>
          <div class="demo-account">
            <strong>Demo:</strong> <code>demo</code> / <code>demo123</code>
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

