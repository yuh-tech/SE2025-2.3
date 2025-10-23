/**
 * Logout Route Handler
 * 
 * Xử lý đăng xuất người dùng
 */

const express = require('express');

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
  res.type('html');
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Đã đăng xuất - OAuth Server</title>
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
        .success-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }
        h1 {
          color: #48bb78;
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
      <div class="success-container">
        <h1>✅ Đăng xuất thành công</h1>
        <p>Bạn đã đăng xuất khỏi hệ thống. Cảm ơn bạn đã sử dụng dịch vụ!</p>
        <a href="/login" class="btn">Đăng nhập lại</a>
      </div>
    </body>
    </html>
  `);
});

module.exports = router;

