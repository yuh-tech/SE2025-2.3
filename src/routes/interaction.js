/**
 * Interaction Route Handler
 * 
 * Xử lý OIDC interactions (login prompt, consent, etc.)
 */

const express = require('express');
const { getScopeDescription } = require('../config/scopes');

const router = express.Router();

/**
 * GET /interaction/:uid - Xử lý interaction
 */
router.get('/interaction/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { provider } = req.app.locals;
    
    // Lấy interaction details từ provider
    const details = await provider.interactionDetails(req, res);
    const { prompt, params, session } = details;
    
    console.log('📋 Interaction details:', {
      uid,
      prompt: prompt.name,
      client: params.client_id,
      scopes: params.scope,
    });
    
    // Xử lý theo loại prompt
    switch (prompt.name) {
      case 'login': {
        // Cần đăng nhập
        // Kiểm tra xem user đã login chưa (qua session)
        if (req.session.userId) {
          // Đã login, submit login result
          const result = {
            login: {
              accountId: req.session.userId,
            },
          };
          
          await provider.interactionFinished(req, res, result, { 
            mergeWithLastSubmission: false 
          });
          return;
        }
        
        // Chưa login, redirect đến login page
        return res.redirect(`/login?uid=${uid}`);
      }
      
      case 'consent': {
        // Cần consent (đồng ý cấp quyền)
        // Kiểm tra xem user đã login chưa
        if (!req.session.userId) {
          return res.redirect(`/login?uid=${uid}`);
        }
        
        // Hiển thị consent page
        return renderConsentPage(req, res, details);
      }
      
      default:
        return res.status(400).send(`Unknown prompt: ${prompt.name}`);
    }
  } catch (err) {
    console.error('Error in interaction:', err);
    return next(err);
  }
});

/**
 * POST /interaction/:uid/confirm - Xác nhận consent
 */
router.post('/interaction/:uid/confirm', express.urlencoded({ extended: false }), async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { provider } = req.app.locals;
    
    const details = await provider.interactionDetails(req, res);
    const { prompt, params, session } = details;
    
    if (!req.session.userId) {
      return res.redirect(`/login?uid=${uid}`);
    }
    
    // Lấy scopes được user đồng ý
    // Trong production, nên cho phép user chọn từng scope
    const grant = new provider.Grant({
      accountId: req.session.userId,
      clientId: params.client_id,
    });
    
    // Add scopes
    if (params.scope) {
      grant.addOIDCScope(params.scope);
      // grant.addResourceScope('https://api.example.com', params.scope);
    }
    
    // Add claims
    // grant.addOIDCClaims(['email', 'profile']);
    
    const grantId = await grant.save();
    
    const result = {
      consent: {
        grantId,
      },
    };
    
    await provider.interactionFinished(req, res, result, { 
      mergeWithLastSubmission: true 
    });
  } catch (err) {
    console.error('Error confirming interaction:', err);
    return next(err);
  }
});

/**
 * POST /interaction/:uid/abort - Từ chối consent
 */
router.post('/interaction/:uid/abort', express.urlencoded({ extended: false }), async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { provider } = req.app.locals;
    
    const result = {
      error: 'access_denied',
      error_description: 'User denied authorization',
    };
    
    await provider.interactionFinished(req, res, result, { 
      mergeWithLastSubmission: false 
    });
  } catch (err) {
    console.error('Error aborting interaction:', err);
    return next(err);
  }
});

/**
 * Render consent page
 */
function renderConsentPage(req, res, details) {
  const { uid } = req.params;
  const { params, prompt, session } = details;
  
  // Parse scopes
  const scopes = params.scope ? params.scope.split(' ') : [];
  
  // Get client info (trong thực tế nên load từ database)
  const client = {
    client_id: params.client_id,
    name: params.client_id,
  };
  
  res.type('html');
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác nhận quyền truy cập - OAuth Server</title>
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
        .consent-container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 500px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2d3748;
          font-size: 24px;
          margin-bottom: 10px;
        }
        .header p {
          color: #718096;
          font-size: 14px;
        }
        .client-info {
          background: #f7fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 25px;
        }
        .client-info h2 {
          color: #2d3748;
          font-size: 18px;
          margin-bottom: 10px;
        }
        .client-info p {
          color: #4a5568;
          font-size: 14px;
        }
        .permissions {
          margin-bottom: 25px;
        }
        .permissions h3 {
          color: #2d3748;
          font-size: 16px;
          margin-bottom: 15px;
        }
        .permission-item {
          display: flex;
          align-items: start;
          padding: 12px;
          background: #f7fafc;
          border-radius: 5px;
          margin-bottom: 10px;
        }
        .permission-item .icon {
          font-size: 20px;
          margin-right: 12px;
        }
        .permission-item .text {
          flex: 1;
        }
        .permission-item .text strong {
          display: block;
          color: #2d3748;
          font-size: 14px;
          margin-bottom: 3px;
        }
        .permission-item .text span {
          color: #718096;
          font-size: 13px;
        }
        .user-info {
          background: #edf2f7;
          padding: 12px 15px;
          border-radius: 5px;
          margin-bottom: 25px;
          font-size: 14px;
          color: #4a5568;
        }
        .actions {
          display: flex;
          gap: 15px;
        }
        .btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-confirm {
          background: #48bb78;
          color: white;
        }
        .btn-confirm:hover {
          background: #38a169;
        }
        .btn-deny {
          background: #e2e8f0;
          color: #4a5568;
        }
        .btn-deny:hover {
          background: #cbd5e0;
        }
      </style>
    </head>
    <body>
      <div class="consent-container">
        <div class="header">
          <h1>🔐 Xác nhận quyền truy cập</h1>
          <p>Ứng dụng yêu cầu quyền truy cập thông tin của bạn</p>
        </div>
        
        <div class="client-info">
          <h2>📱 ${escapeHtml(client.name)}</h2>
          <p><strong>Client ID:</strong> ${escapeHtml(client.client_id)}</p>
        </div>
        
        ${req.session.user ? `
          <div class="user-info">
            👤 Đăng nhập với tài khoản: <strong>${escapeHtml(req.session.user.name || req.session.user.username)}</strong>
          </div>
        ` : ''}
        
        <div class="permissions">
          <h3>Ứng dụng yêu cầu các quyền sau:</h3>
          ${scopes.map(scope => renderPermissionItem(scope)).join('')}
        </div>
        
        <div class="actions">
          <form method="POST" action="/interaction/${uid}/confirm" style="flex: 1;">
            <button type="submit" class="btn btn-confirm">✓ Cho phép</button>
          </form>
          <form method="POST" action="/interaction/${uid}/abort" style="flex: 1;">
            <button type="submit" class="btn btn-deny">✗ Từ chối</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
}

/**
 * Render một permission item
 */
function renderPermissionItem(scope) {
  const scopeInfo = {
    'openid': { icon: '🔑', name: 'OpenID Authentication', desc: 'Xác thực danh tính của bạn' },
    'profile': { icon: '👤', name: 'Profile Information', desc: 'Tên, ảnh đại diện và thông tin cá nhân' },
    'email': { icon: '📧', name: 'Email Address', desc: 'Địa chỉ email của bạn' },
    'phone': { icon: '📱', name: 'Phone Number', desc: 'Số điện thoại của bạn' },
    'address': { icon: '🏠', name: 'Address', desc: 'Địa chỉ liên hệ của bạn' },
    'offline_access': { icon: '🔄', name: 'Offline Access', desc: 'Truy cập khi bạn offline (refresh token)' },
    'api:read': { icon: '📖', name: 'API Read Access', desc: 'Đọc dữ liệu từ API' },
    'api:write': { icon: '✏️', name: 'API Write Access', desc: 'Ghi dữ liệu vào API' },
  };
  
  const info = scopeInfo[scope] || { 
    icon: '🔹', 
    name: scope, 
    desc: getScopeDescription(scope) 
  };
  
  return `
    <div class="permission-item">
      <div class="icon">${info.icon}</div>
      <div class="text">
        <strong>${escapeHtml(info.name)}</strong>
        <span>${escapeHtml(info.desc)}</span>
      </div>
    </div>
  `;
}

/**
 * Escape HTML để tránh XSS
 */
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = router;

