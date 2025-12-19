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
        :root {
          --bg: #0f172a;
          --card: #0b1220;
          --muted: #94a3b8;
          --text: #e2e8f0;
          --accent: #8b5cf6;
          --border: #1f2937;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: radial-gradient(circle at 18% 18%, rgba(139,92,246,0.22), transparent 24%),
                      radial-gradient(circle at 82% 8%, rgba(34,197,94,0.15), transparent 20%),
                      var(--bg);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          color: var(--text);
        }
        .logout-container {
          width: 100%;
          max-width: 420px;
          background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          backdrop-filter: blur(10px);
        }
        h1 {
          color: #e2e8f0;
          margin: 0 0 12px 0;
          font-size: 24px;
          letter-spacing: -0.2px;
        }
        p {
          color: var(--muted);
          margin: 0 0 22px 0;
          line-height: 1.6;
          font-size: 14px;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
          box-shadow: 0 12px 30px rgba(99,102,241,0.35);
        }
        .btn:hover { transform: translateY(-1px); }
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
        :root {
          --bg: #0f172a;
          --card: #0b1220;
          --muted: #94a3b8;
          --text: #e2e8f0;
          --accent: #8b5cf6;
          --border: #1f2937;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: radial-gradient(circle at 18% 18%, rgba(139,92,246,0.22), transparent 24%),
                      radial-gradient(circle at 82% 8%, rgba(34,197,94,0.15), transparent 20%),
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
          max-width: 460px;
          background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          backdrop-filter: blur(10px);
          text-align: center;
        }
        h1 {
          font-size: 24px;
          margin: 0 0 12px 0;
          letter-spacing: -0.2px;
        }
        p { margin: 0 0 22px 0; color: var(--muted); line-height: 1.6; }
        .btn {
          display: inline-block;
          padding: 12px 18px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          transition: all 0.18s ease;
          border: 1px solid rgba(255,255,255,0.12);
          background: #0f172a;
          color: var(--text);
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(0,0,0,0.25); }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>✅ Đăng xuất thành công</h1>
        <p>Bạn đã đăng xuất khỏi hệ thống.</p>
        <a class="btn" href="/">Về trang chủ OAuth</a>
      </div>
    </body>
    </html>
  `);
});

export default router;

