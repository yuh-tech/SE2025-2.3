/**
 * Logout Route Handler
 * 
 * Xử lý đăng xuất người dùng
 */

import express from 'express';

const router = express.Router();

/**
 * GET /session/logout - Hiển thị trang logout
 */
router.get('/session/logout', (req, res) => {
  res.type('html');
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đăng xuất - OAuth Server</title>
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
        .logout-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        h1 {
          color: #2d3748;
          margin-bottom: 20px;
          font-size: 24px;
        }
        p {
          color: #718096;
          margin-bottom: 30px;
          line-height: 1.6;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #5a67d8;
        }
      </style>
    </head>
    <body>
      <div class="logout-container">
        <h1>👋 Đăng xuất</h1>
        <p>Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?</p>
        <form method="POST" action="/session/logout">
          <button type="submit" class="btn">Xác nhận đăng xuất</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

/**
 * POST /session/logout - Xử lý đăng xuất
 */
router.post('/session/logout', express.urlencoded({ extended: false }), async (req, res) => {
  // Xóa session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
  });
  
  // Redirect về trang chủ hoặc logout success page
  return res.redirect('/logout/success');
});

/**
 * GET /logout/success - Trang xác nhận end-session/logout (có nút quay lại đăng nhập)
 */
router.get('/logout/success', (req, res) => {
  res.type('html');
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign-out Success - OAuth Server</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          color: #2d3748;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .card {
          background: white;
          padding: 36px 40px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          max-width: 420px;
          text-align: center;
        }
        h1 {
          font-size: 26px;
          margin-bottom: 12px;
          color: #2d3748;
        }
        p { margin-bottom: 22px; color: #4a5568; line-height: 1.6; }
        .btn {
          display: inline-block;
          padding: 12px 18px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 0 6px;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #667eea;
          color: white;
        }
        .btn-primary:hover { background: #5a67d8; }
        .btn-secondary {
          background: #e2e8f0;
          color: #2d3748;
        }
        .btn-secondary:hover { background: #cbd5e0; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✅ Đăng xuất thành công</h1>
        <p>Bạn đã đăng xuất khỏi hệ thống.</p>
        <a class="btn btn-secondary" href="/">Về trang chủ OAuth</a>
      </div>
    </body>
    </html>
  `);
});

export default router;

