/**
 * Interaction Route Handler
 * 
 * Xử lý OIDC interactions (login prompt, consent, etc.)
 */

import express from 'express';
import { getScopeDescription } from '../config/scopes.js';

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
        :root {
          --bg: #0f172a;
          --card: #0b1220;
          --muted: #94a3b8;
          --text: #e2e8f0;
          --accent: #8b5cf6;
          --accent-2: #22c55e;
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
        .shell {
          width: 100%;
          max-width: 540px;
          background: linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          backdrop-filter: blur(10px);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .client-avatar {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, var(--accent), #6366f1);
          display: grid;
          place-items: center;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          font-size: 18px;
        }
        h1 { margin: 0; font-size: 22px; letter-spacing: -0.2px; }
        .muted { color: var(--muted); font-size: 14px; margin: 4px 0 0 0; }
        .user {
          margin: 16px 0;
          padding: 12px 14px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          background: rgba(255,255,255,0.02);
          font-size: 14px;
          color: #cbd5e1;
        }
        .section-title {
          margin: 18px 0 10px 0;
          font-size: 14px;
          color: var(--muted);
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }
        .scope {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .scope-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: #0b1220;
        }
        .scope-icon {
          font-size: 18px;
          opacity: 0.9;
        }
        .scope-text strong { display: block; color: #e2e8f0; }
        .scope-text span { color: var(--muted); font-size: 13px; }
        .actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
          margin-top: 22px;
        }
        .btn {
          padding: 12px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .btn:focus { outline: none; }
        .btn-approve {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          box-shadow: 0 12px 26px rgba(22,163,74,0.35);
          border-color: rgba(34,197,94,0.6);
        }
        .btn-deny {
          background: #0f172a;
          color: #e2e8f0;
          border: 1px solid rgba(255,255,255,0.12);
        }
        .btn:hover { transform: translateY(-1px); }
      </style>
    </head>
    <body>
      <div class="shell">
        <div class="header">
          <div class="client-avatar">${escapeHtml(client.name?.[0] || 'A')}</div>
          <div>
            <h1>Xác nhận quyền truy cập</h1>
            <p class="muted">Ứng dụng yêu cầu truy cập thông tin của bạn</p>
          </div>
        </div>
        
        <div class="user">
          <strong>Ứng dụng:</strong> ${escapeHtml(client.name)}<br/>
          <span style="color:${escapeHtml('#94a3b8')}">Client ID: ${escapeHtml(client.client_id)}</span><br/>
          ${req.session.user ? `Đăng nhập với: <strong>${escapeHtml(req.session.user.name || req.session.user.username)}</strong>` : 'Chưa đăng nhập'}
        </div>
        
        <div class="section-title">Quyền truy cập yêu cầu</div>
        <div class="scope">
          ${scopes.map(scope => renderPermissionItem(scope)).join('')}
        </div>
        
        <div class="actions">
          <form method="POST" action="/interaction/${uid}/confirm">
            <button type="submit" class="btn btn-approve">Cho phép</button>
          </form>
          <form method="POST" action="/interaction/${uid}/abort">
            <button type="submit" class="btn btn-deny">Từ chối</button>
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
    <div class="scope-item">
      <div class="scope-icon">${info.icon}</div>
      <div class="scope-text">
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

export default router;

