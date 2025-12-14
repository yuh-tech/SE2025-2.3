const path = require('path'); // khai báo path đầu tiên
console.log('server.js loaded');
console.log('SERVER FILE:', __filename);
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // dùng path ngay sau đó


const slugify = require('slugify');
const fs = require('fs');
const crypto = require('crypto');

const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Lưu tạm vào thư mục uploads chung (tránh dùng req.body trong destination)
    const dir = path.join(__dirname, 'public', 'uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});


const upload = multer({ storage: storage });

const express = require('express');
const session = require('express-session');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/customers.db');
const productDB = new sqlite3.Database('./database/products.db');


const app = express();
const PORT = process.env.PORT || 8080;
// Export the app for external start scripts / tests
module.exports = app;

// ========== MIDDLEWARE CƠ BẢN ==========
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret-key-very-hard-to-guess',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);

// Log session id (hữu ích khi debug)
app.use((req, res, next) => {
  try {
    console.log('SESSION ID:', req.sessionID);
  } catch (e) {}
  next();
});

// Request logger (help debug routes like delete)
app.use((req, res, next) => {
  if (req.path.startsWith('/admin/products/delete')) {
    console.log('>>> INCOMING REQ:', req.method, req.path, 'from', req.ip);
    console.log('Headers:', { host: req.headers.host, referer: req.headers.referer });
  }
  next();
});
// Gắn currentUser và cart vào locals cho EJS (để partial header dùng)
app.use((req, res, next) => {
  res.locals.currentUser = req.session?.user || null;
  res.locals.cart = req.session?.cart || [];
  next();
});

console.log('checkpoint A - middleware configured');
// ==================================
// OAuth 2.0 Configuration
// ==================================
const OAUTH_CONFIG = {
  issuer: process.env.OAUTH_ISSUER || 'http://localhost:3000',
  client_id: process.env.OAUTH_CLIENT_ID || 'my_app',
  client_secret: process.env.OAUTH_CLIENT_SECRET || 'demo-client-secret',
  redirect_uri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:8080/callback',
  scope: 'openid profile email offline_access',
  authorization_endpoint: '/authorize',
  token_endpoint: '/token',
  userinfo_endpoint: '/userinfo',
  logout_endpoint: '/logout',
};


db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      displayName TEXT,
      password TEXT,
      role TEXT
    )
  `);
});

// Tạo bảng products
productDB.serialize(() => {

  // NOTE: Do not drop tables on startup to preserve data between restarts.

  // BẢNG PRODUCTS
  productDB.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      shortDescription TEXT,
      description TEXT,
      price INTEGER,
      salePrice INTEGER DEFAULT 0,
      category TEXT,
      status TEXT CHECK(status IN ('normal','sale','hidden')) DEFAULT 'normal',
      createdAt TEXT,
      colors TEXT,
      image TEXT,
      images TEXT
    )
  `);

  // BẢNG SỐ LƯỢNG
  productDB.run(`
    CREATE TABLE IF NOT EXISTS product_quantity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      color TEXT,
      size TEXT,
      quantity INTEGER,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

});

console.log('checkpoint B - productDB schema ensured');

// ==================================
// 2. PHÂN QUYỀN ADMIN
// ==================================
function isAdmin(req, res, next) {
  console.log('isAdmin check - sessionID:', req.sessionID, 'user:', req.session?.user);
  if (!req.session.user || req.session.user.role !== 'admin') {
    console.log('isAdmin DENY - sessionID:', req.sessionID, 'user:', req.session?.user);
    return res.status(403).send('<h1>403 - Không có quyền truy cập</h1><a href="/">Quay lại shop</a>');
  }
  next();
}

// ==================================
// 3. LOAD JSON DATABASE
// ==================================
const productsPath = path.join(__dirname, 'products.json');
const ordersPath = path.join(__dirname, 'orders.json');
const reviewsPath = path.join(__dirname, 'reviews.json');
const returnsPath = path.join(__dirname, 'returns.json');

// Helper đọc file JSON
function loadJSON(path) {
  return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : [];
}

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Load dữ liệu
let allProducts = loadJSON(productsPath);
let orders = loadJSON(ordersPath);
let reviews = loadJSON(reviewsPath);
let returnsList = loadJSON(returnsPath);

// Thêm 4 sản phẩm demo nếu file trống
if (allProducts.length === 0) {
  allProducts = [
    {
      id: 101,
      name: 'Áo Phao Nữ',
      price: 450000,
      image: '/images/ao_phap_nu.png',
      category: 'Áo khoác'
    },
    {
      id: 102,
      name: 'Quần Jean Ống Suông',
      price: 380000,
      image: '/images/quan_jean.png',
      category: 'Quần'
    },
    {
      id: 103,
      name: 'Váy Xòe Hoa',
      price: 320000,
      image: '/images/vay.png',
      category: 'Váy'
    },
    {
      id: 104,
      name: 'Giày Sneakers Trắng',
      price: 650000,
      image: '/images/giay.png',
      category: 'Giày'
    }
  ];
}

// ==================================
// 4. USER DEMO
// ==================================
const demoUsers = [
  {
    username: 'admin',
    password: '123456',
    displayName: 'Admin',
    role: 'admin'
  },
  {
    username: 'minhhang',
    password: '123456',
    displayName: 'Hằng Minh',
    role: 'customer'
  }
];

// ==================================
// 5. EJS CONFIG
// ==================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

console.log('checkpoint C - EJS configured, views path set');

// ==================================
// 6. ROUTES — KHÁCH HÀNG
// ==================================
app.get(['/', '/home'], (req, res) => {
  res.render('home', {
    title: 'Sunshine Boutique – Thời trang nhẹ nhàng',
    products: allProducts
  });
});

// ----- LOGIN -----
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM customers WHERE username = ? AND password = ?`;

  db.get(query, [username, password], (err, user) => {
    if (err) return res.send("DB Error");

    if (!user) {
      return res.render('login', { 
        title: 'Đăng nhập',
        error: 'Sai tên đăng nhập hoặc mật khẩu!'
      });
    }

    req.session.user = user;
    res.redirect('/');
  });
});

// Hiển thị trang đăng nhập (GET) - nếu thiếu sẽ gây 404 khi bấm link
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Đăng nhập',
    error: null,
    success: req.query.success || null
  });
});

// ==================================
// OAuth 2.0 LOGIN FLOW
// ==================================

/**
 * Helper: Generate PKCE code verifier and challenge
 */
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * GET /auth/oauth - Redirect to OAuth Server for login
 */
app.get('/auth/oauth', (req, res) => {
  // Generate state để chống CSRF
  const state = crypto.randomBytes(16).toString('hex');
  
  // Generate PKCE
  const { codeVerifier, codeChallenge } = generatePKCE();
  
  // Lưu state và code_verifier vào session để verify sau
  req.session.oauth_state = state;
  req.session.code_verifier = codeVerifier;
  
  // Tạo authorization URL
  const authUrl = new URL(OAUTH_CONFIG.authorization_endpoint, OAUTH_CONFIG.issuer);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', OAUTH_CONFIG.client_id);
  authUrl.searchParams.set('redirect_uri', OAUTH_CONFIG.redirect_uri);
  authUrl.searchParams.set('scope', OAUTH_CONFIG.scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  console.log('🔐 Redirecting to OAuth Server:', authUrl.toString());
  
  res.redirect(authUrl.toString());
});

/**
 * GET /callback - Handle OAuth callback with authorization code
 */
app.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  // Kiểm tra lỗi từ OAuth server
  if (error) {
    console.error('❌ OAuth Error:', error, error_description);
    return res.render('error', { 
      title: 'OAuth Error',
      message: error_description || error 
    });
  }
  
  // Verify state
  if (state !== req.session.oauth_state) {
    console.error('❌ Invalid state parameter');
    return res.render('error', { 
      title: 'Security Error',
      message: 'Invalid state parameter - possible CSRF attack' 
    });
  }
  
  // Lấy code_verifier từ session
  const codeVerifier = req.session.code_verifier;
  
  if (!code || !codeVerifier) {
    console.error('❌ Missing code or code_verifier');
    return res.render('error', { 
      title: 'OAuth Error',
      message: 'Missing authorization code or PKCE verifier' 
    });
  }
  
  try {
    // Exchange authorization code for tokens
    const tokenUrl = new URL(OAUTH_CONFIG.token_endpoint, OAUTH_CONFIG.issuer);
    
    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          `${OAUTH_CONFIG.client_id}:${OAUTH_CONFIG.client_secret}`
        ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OAUTH_CONFIG.redirect_uri,
        code_verifier: codeVerifier,
      }).toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error('❌ Token exchange failed:', errorData);
      return res.render('error', { 
        title: 'Token Error',
        message: errorData.error_description || 'Failed to exchange code for token' 
      });
    }
    
    const tokens = await tokenResponse.json();
    console.log('✅ Tokens received:', {
      access_token: tokens.access_token ? '***exists***' : 'missing',
      id_token: tokens.id_token ? '***exists***' : 'missing',
      refresh_token: tokens.refresh_token ? '***exists***' : 'missing',
      expires_in: tokens.expires_in,
    });
    
    // Lấy thông tin user từ userinfo endpoint
    const userinfoUrl = new URL(OAUTH_CONFIG.userinfo_endpoint, OAUTH_CONFIG.issuer);
    
    const userinfoResponse = await fetch(userinfoUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!userinfoResponse.ok) {
      console.error('❌ Failed to get userinfo');
      return res.render('error', { 
        title: 'Userinfo Error',
        message: 'Failed to get user information' 
      });
    }
    
    const userinfo = await userinfoResponse.json();
    console.log('✅ Userinfo received:', userinfo);
    
    // Lưu thông tin user vào session
    req.session.user = {
      id: userinfo.sub,
      username: userinfo.preferred_username || userinfo.nickname || userinfo.name,
      displayName: userinfo.name || userinfo.given_name,
      email: userinfo.email,
      role: userinfo.role || 'customer',
      oauth: true, // Đánh dấu đây là user đăng nhập qua OAuth
    };
    
    // Lưu tokens vào session (có thể dùng để refresh hoặc call API)
    req.session.tokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
    };
    
    // Xóa state và code_verifier
    delete req.session.oauth_state;
    delete req.session.code_verifier;
    
    req.session.cart = req.session.cart || [];
    
    console.log('✅ User logged in via OAuth:', req.session.user);
    
    res.redirect('/home');
    
  } catch (err) {
    console.error('❌ OAuth callback error:', err);
    res.render('error', { 
      title: 'OAuth Error',
      message: 'An error occurred during authentication' 
    });
  }
});

console.log('checkpoint D - OAuth routes set');
console.log('checkpoint D.1 - continuing after OAuth routes');
console.log('marker: after checkpoint D.1');

/**
 * GET /auth/logout - Logout from both app and OAuth server
 */
app.get('/auth/logout', (req, res) => {
  const idToken = req.session.tokens?.id_token;
  
  // Xóa session local
  req.session.destroy(() => {
    // Redirect đến OAuth server logout endpoint
    const logoutUrl = new URL(OAUTH_CONFIG.logout_endpoint, OAUTH_CONFIG.issuer);
    logoutUrl.searchParams.set('post_logout_redirect_uri', 'http://localhost:8080');
    
    if (idToken) {
      logoutUrl.searchParams.set('id_token_hint', idToken);
    }
    
    res.redirect(logoutUrl.toString());
  });
});

// ----- SIGNUP -----
console.log('marker: before signup GET');
app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Đăng ký', error: null, success: null });
});



// ----- SIGNUP -----
app.post('/signup', (req, res) => {
  const { username, displayName, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('signup', { 
      title: 'Đăng ký',
      error: 'Mật khẩu nhập lại không khớp!',
      success: null
    });
  }

  const checkQuery = `SELECT * FROM customers WHERE username = ?`;

  db.get(checkQuery, [username], (err, row) => {
    if (err) return res.send("DB Error");

    if (row) {
      return res.render('signup', { 
        title: 'Đăng ký',
        error: 'Tên đăng nhập đã tồn tại!',
        success: null
      });
    }

    const insertQuery = `
      INSERT INTO customers (username, displayName, password, role)
      VALUES (?, ?, ?, 'customer')
    `;

    db.run(insertQuery, [username, displayName, password], (err) => {
      if (err) return res.send("Lỗi thêm user");

      res.render('signup', {
        title: 'Đăng ký',
        error: null,
        success: 'Đăng ký thành công, hãy đăng nhập!'
      });
    });
  });
});
// Hiển thị form đăng ký
app.get('/signup', (req, res) => {
  res.render('signup', { 
    title: 'Đăng ký', 
    error: null, 
    success: null 
  });
});



// ----- LOGOUT -----
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ----- PRODUCTS -----
app.get('/products', (req, res) => {
  console.log('marker: inside /products route definition');
  const query = "SELECT * FROM products";

  productDB.all(query, [], (err, rows) => {
    if (err) {
      console.error('Lỗi khi đọc products từ DB:', err);
      const categories = ['all', ...new Set(allProducts.map(p => p.category))];
      return res.render('products', {
        title: 'Tất cả sản phẩm',
        products: allProducts,
        categories
      });
    }

    // Nếu DB rỗng (ví dụ môi trường dev chưa có seed), fallback sang products.json
    const productsToRender = (rows && rows.length > 0) ? rows : allProducts;
    const categories = ['all', ...new Set(productsToRender.map(p => p.category))];

    res.render('products', {
      title: 'Tất cả sản phẩm',
      products: productsToRender,
      categories
    });
  });
});


// ----- PRODUCT DETAIL -----
app.get('/product/:id', (req, res) => {
  console.log('marker: inside /product/:id route definition');
  const id = req.params.id;

  productDB.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
    if (err) return res.send("DB Error");
    if (!product) return res.send("Không tìm thấy sản phẩm");

    // Convert colors/sizes từ string → array  
    product.colors = product.colors ? product.colors.split(',') : [];
    product.sizes = product.sizes ? product.sizes.split(',') : [];

    const productReviews = reviews.filter((r) => r.productId == id);

    res.render('product', {
      title: product.name,
      product,
      reviews: productReviews
    });
  });
});

// LẤY SỐ LƯỢNG GIỎ HÀNG — Fix cho header
app.get('/cart/count', (req, res) => {
  console.log('marker: inside /cart/count route definition');
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ count: total });
});

// ==================================
// 7. GIỎ HÀNG
// ==================================
app.get('/cart', (req, res) => {
  console.log('marker: inside /cart route definition');
  const cart = req.session.cart || [];
  res.render('cart', { title: 'Giỏ hàng', cart });
});

app.post('/cart/add/:id', (req, res) => {
  if (!req.session.user) return res.json({ success: false, message: 'Chưa đăng nhập' });

  const id = Number(req.params.id);
  const product = allProducts.find((p) => p.id === id);
  const { color, size } = req.body;

  req.session.cart = req.session.cart || [];

  const existing = req.session.cart.find((i) => i.id === id && i.color === color && i.size === size);

  if (existing) existing.quantity++;
  else
    req.session.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      color,
      size,
      quantity: 1
    });

  const total = req.session.cart.reduce((s, i) => s + i.quantity, 0);
  res.json({ success: true, cartCount: total });
});

app.post('/cart/remove/:index', (req, res) => {
  req.session.cart.splice(Number(req.params.index), 1);
  res.json({ success: true });
});

app.post('/cart/update', (req, res) => {
  const { index, quantity } = req.body;
  req.session.cart[index].quantity = Number(quantity);
  res.json({ success: true });
});

// ==================================
// 8. CHECKOUT → TẠO ĐƠN HÀNG
// ==================================
app.get('/checkout', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('checkout', { title: 'Thanh toán' });
});

app.post('/checkout', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');

  const newOrder = {
    id: Date.now(),
    user: req.session.user.username,
    items: cart,
    total: cart.reduce((s, i) => s + i.price * i.quantity, 0),
    status: 'processing',
    tracking: ['Đơn hàng đã được tạo'],
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  saveJSON(ordersPath, orders);

  req.session.cart = [];

  res.redirect('/orders/' + newOrder.id);
});

// ==================================
// 9. TRACKING ĐƠN HÀNG
// ==================================
app.get('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const order = orders.find((o) => o.id === id);

  if (!order) return res.send('Không tìm thấy đơn hàng');

  res.render('order-detail', { title: 'Chi tiết đơn hàng', order });
});

// ==================================
// 10. REVIEW SẢN PHẨM
// ==================================
app.post('/product/:id/review', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const id = Number(req.params.id);
  const { rating, comment } = req.body;

  reviews.push({
    id: Date.now(),
    productId: id,
    user: req.session.user.username,
    rating,
    comment,
    createdAt: new Date().toISOString()
  });

  saveJSON(reviewsPath, reviews);

  res.redirect('/product/' + id);
});

// ==================================
// 11. RETURN / YÊU CẦU TRẢ HÀNG
// ==================================
app.post('/orders/:id/return', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const id = Number(req.params.id);

  returnsList.push({
    id: Date.now(),
    orderId: id,
    user: req.session.user.username,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  saveJSON(returnsPath, returnsList);

  res.redirect('/orders/' + id);
});

// ==================================

// ==================================
// 12. ADMIN — DASHBOARD
// ==================================
app.get('/admin', isAdmin, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    productsCount: allProducts.length,
    ordersCount: orders.length,
    returnsCount: returnsList.length
  });
});


// ==================================
// 13. ADMIN — QUẢN LÝ SẢN PHẨM
// ==================================
app.get('/admin/products', isAdmin, (req, res) => {
  const sql = `
    SELECT 
      p.*,
      -- unique colors
      (SELECT GROUP_CONCAT(DISTINCT pq.color)
         FROM product_quantity pq 
         WHERE pq.product_id = p.id) AS colors,

      -- list variants: "color|size|quantity" → sau dùng split trong EJS
      (SELECT GROUP_CONCAT(pq.color || '|' || pq.size || '|' || pq.quantity)
         FROM product_quantity pq 
         WHERE pq.product_id = p.id) AS variants
    FROM products p
    ORDER BY p.id DESC;
  `;

  productDB.all(sql, [], (err, products) => {
    if (err) {
      console.error("Lỗi truy vấn DB:", err);
      return res.send("DB ERROR");
    }

    // Convert variants thành array of objects
    products = products.map(p => {
      p.colors = p.colors ? p.colors.split(",") : [];

      p.variants = p.variants
        ? p.variants.split(",").map(v => {
            const [color, size, quantity] = v.split("|");
            return { color, size, quantity };
          })
        : [];

      return p;
    });

    // #region agent log: admin/products variants shape
    products.forEach(p => {
      fetch('http://127.0.0.1:7242/ingest/74da59a2-5dcd-4fb6-a048-a86c62e73f32', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'srv-rerun1',
          hypothesisId: 'H_srv_variants',
          location: 'server.js:/admin/products',
          message: 'variants shape before render',
          data: {
            id: p.id,
            type: typeof p.variants,
            isArray: Array.isArray(p.variants),
            sample: p.variants
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
    });
    // #endregion

    res.render('admin/products', {
      title: 'Quản lý sản phẩm',
      products
    });
  });
});


app.post(
  "/admin/products/add",
  isAdmin,
  upload.array("images[]", 10), // ⭐ MATCH ĐÚNG name
  (req, res) => {
    console.log('FILES:', req.files); // test
    const { 
      name, 
      price, 
      salePrice, 
      shortDesc,
      description, 
      category, 
      status 
    } = req.body;

    // Debug: log body and variant fields
    console.log('BODY keys:', Object.keys(req.body));
    console.log('raw variant_color[]:', req.body['variant_color[]']);
    console.log('raw variant_size[]:', req.body['variant_size[]']);
    console.log('raw variant_quantity[]:', req.body['variant_quantity[]']);

    // Xử lý file đã upload: lưu đường dẫn relative (từ /public)
    const files = req.files || [];
    const imagePaths = files.map(f => f.path.replace(/\\/g, '/').replace(/^.*public/, ''));
    const mainImage = imagePaths[0] || null;

    // Normalize variant fields: accept variant_color[], variant_color, or variant_color[] as keys
    function normalizeField(keyBase) {
      const candidates = [keyBase + '[]', keyBase, keyBase.replace(/\[\]$/, '')];
      for (const k of candidates) {
        if (Object.prototype.hasOwnProperty.call(req.body, k)) {
          const v = req.body[k];
          if (Array.isArray(v)) return v;
          if (typeof v === 'string') return [v];
        }
      }
      return [];
    }

    let colors = normalizeField('variant_color');
    let sizes = normalizeField('variant_size');
    let quantities = normalizeField('variant_quantity');

    const uniqueColors = [...new Set(colors)];
    const createdAt = new Date().toISOString();

    // Determine status: prefer explicit status field, else infer from salePrice
    const finalStatus = (status && String(status).trim()) ? String(status).trim() : (Number(salePrice) > 0 ? 'sale' : 'normal');

    // Prevent duplicate product names
    productDB.get('SELECT id FROM products WHERE name = ?', [name], (dupErr, dupRow) => {
      if (dupErr) {
        console.error('Duplicate check error:', dupErr);
        return res.send('DB ERROR');
      }
      if (dupRow) {
        return res.send('Product with same name already exists');
      }

      productDB.run(
      `
      INSERT INTO products
      (name, shortDescription, description, price, salePrice, category, status, createdAt, colors, image, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        shortDesc,
        description,
        Number(price),
        Number(salePrice || 0),
        category,
        finalStatus,
        createdAt,
        uniqueColors.join(","),
        mainImage,
        imagePaths.join(',')
      ],
      function (err) {
        if (err) {
          console.error(err);
          return res.send("SQL ERROR");
        }

        const productId = this.lastID;

        const sqlVariant = `
          INSERT INTO product_quantity (product_id, color, size, quantity)
          VALUES (?, ?, ?, ?)
        `;

        // Insert each variant with error logging
        for (let i = 0; i < colors.length; i++) {
          const color = colors[i] || '';
          const size = sizes[i] || '';
          const qty = Number(quantities[i] || 0);

          productDB.run(sqlVariant, [productId, color, size, qty], (verr) => {
            if (verr) console.error('Variant insert error:', verr, { productId, color, size, qty });
          });
        }

        res.redirect('/admin/products');
      }
    );
  }
);

console.log('checkpoint E - admin products add route defined');


// DELETE product route (remove variants then product)
console.log('REGISTER DELETE ROUTE');
app.post('/admin/products/delete/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  console.log('Admin delete request, user=', req.session?.user?.username, 'id=', id);
  if (!id) return res.status(400).send('Invalid id');

  // Verify product exists and remove any uploaded image files
  productDB.get('SELECT image, images FROM products WHERE id = ?', [id], (gErr, row) => {
    if (gErr) {
      console.error('Error querying product before delete:', gErr);
      return res.status(500).send('DB error');
    }
    if (!row) return res.status(404).send('Product not found');

    const filesToRemove = [];
    if (row.image) filesToRemove.push(row.image);
    if (row.images) {
      String(row.images).split(',').forEach(f => { if (f && f.trim()) filesToRemove.push(f.trim()); });
    }

    // Try to unlink files (best-effort)
    filesToRemove.forEach(f => {
      try {
        const candidate = f.startsWith('/') ? path.join(__dirname, f) : path.join(__dirname, 'public', 'uploads', f);
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
          console.log('Removed file:', candidate);
        }
      } catch (ue) {
        console.error('Failed to remove file', f, ue);
      }
    });

    // Now remove variants then product
    productDB.serialize(() => {
      productDB.run('DELETE FROM product_quantity WHERE product_id = ?', [id], (err) => {
        if (err) console.error('Error deleting variants:', err);
        productDB.run('DELETE FROM products WHERE id = ?', [id], (err2) => {
          if (err2) {
            console.error('Error deleting product:', err2);
            return res.status(500).send('Error deleting product');
          }
          console.log('Deleted product', id);
          res.redirect('/admin/products');
        });
      });
    });
  });
});


// ==================================
// 15. ADMIN — QUẢN LÝ TRẢ HÀNG
// ==================================
app.get('/admin/returns', isAdmin, (req, res) => {
  res.render('admin/returns', {
    title: 'Yêu cầu trả hàng',
    returns: returnsList
  });
});

app.post('/admin/returns/approve/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);

  const r = returnsList.find((x) => x.id === id);
  r.status = 'approved';

  saveJSON(returnsPath, returnsList);
  res.redirect('/admin/returns');
});

// DEBUG: allow local non-auth deletion when in development for testing only
if (process.env.NODE_ENV !== 'production') {
  app.post('/__debug__/admin/delete/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).send('Invalid id');
    console.log('DEBUG delete invoked for id', id);

    productDB.get('SELECT image, images FROM products WHERE id = ?', [id], (gErr, row) => {
      if (gErr) {
        console.error('Error querying product before debug-delete:', gErr);
        return res.status(500).send('DB error');
      }
      if (!row) return res.status(404).send('Product not found');

      const filesToRemove = [];
      if (row.image) filesToRemove.push(row.image);
      if (row.images) {
        String(row.images).split(',').forEach(f => { if (f && f.trim()) filesToRemove.push(f.trim()); });
      }

      filesToRemove.forEach(f => {
        try {
          const candidate = f.startsWith('/') ? path.join(__dirname, f) : path.join(__dirname, 'public', 'uploads', f);
          if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
        } catch (ue) { console.error('Unlink error (debug):', ue); }
      });

      productDB.serialize(() => {
        productDB.run('DELETE FROM product_quantity WHERE product_id = ?', [id], (err) => {
          if (err) console.error('Error deleting variants (debug):', err);
          productDB.run('DELETE FROM products WHERE id = ?', [id], (err2) => {
            if (err2) {
              console.error('Error deleting product (debug):', err2);
              return res.status(500).send('Error deleting product');
            }
            console.log('DEBUG deleted product', id);
            res.send('OK');
          });
        });
      });
    });
  });
}

// Dev-only: list registered routes for debugging
if (process.env.NODE_ENV !== 'production') {
  app.get('/__debug__/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(mw => {
      if (mw.route && mw.route.path) {
        const methods = Object.keys(mw.route.methods).join(',').toUpperCase();
        routes.push({ path: mw.route.path, methods });
      }
    });
    res.json({ routes });
  });
}

// Dev-only: add product via JSON (bypass isAdmin) for testing add flow
if (process.env.NODE_ENV !== 'production') {
  app.post('/__debug__/admin/add', express.json(), (req, res) => {
    const { name, price=0, salePrice=0, shortDesc='', description='', category='', status='normal', colors=[], images=[] , variants=[] } = req.body || {};

    if (!name) return res.status(400).send('Missing name');

    const createdAt = new Date().toISOString();
    const imageStr = Array.isArray(images) ? images.join(',') : (images || '');
    const colorsStr = Array.isArray(colors) ? colors.join(',') : (colors || '');

    productDB.get('SELECT id FROM products WHERE name = ?', [name], (derr, drow) => {
      if (derr) return res.status(500).send('DB ERR');
      if (drow) return res.status(409).send('Duplicate');

      productDB.run(`INSERT INTO products (name, shortDescription, description, price, salePrice, category, status, createdAt, colors, image, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, shortDesc, description, Number(price), Number(salePrice), category, status, createdAt, colorsStr, images[0] || null, imageStr], function(err) {
          if (err) return res.status(500).send('INSERT ERR');
          const productId = this.lastID;

          const sqlVariant = `INSERT INTO product_quantity (product_id, color, size, quantity) VALUES (?, ?, ?, ?)`;
          (variants || []).forEach(v => {
            const color = v.color || '';
            const size = v.size || '';
            const qty = Number(v.quantity || 0);
            productDB.run(sqlVariant, [productId, color, size, qty], (ve) => { if (ve) console.error('variant insert err', ve); });
          });

          res.json({ ok: true, id: productId });
        });
    });
  });
}

// ==================================
// 16. START SERVER
// ==================================
console.log('REGISTER DELETE ROUTE');
app.post('/admin/products/delete/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  console.log('Admin delete request, user=', req.session?.user?.username, 'id=', id);
  if (!id) return res.status(400).send('Invalid id');

  // Verify product exists and remove any uploaded image files
  productDB.get('SELECT image, images FROM products WHERE id = ?', [id], (gErr, row) => {
    if (gErr) {
      console.error('Error querying product before delete:', gErr);
      return res.status(500).send('DB error');
    }
    if (!row) return res.status(404).send('Product not found');

    const filesToRemove = [];
    if (row.image) filesToRemove.push(row.image);
    if (row.images) {
      String(row.images).split(',').forEach(f => { if (f && f.trim()) filesToRemove.push(f.trim()); });
    }

    // Try to unlink files (best-effort)
    filesToRemove.forEach(f => {
      try {
        const candidate = f.startsWith('/') ? path.join(__dirname, f) : path.join(__dirname, 'public', 'uploads', f);
        if (fs.existsSync(candidate)) {
          fs.unlinkSync(candidate);
          console.log('Removed file:', candidate);
        }
      } catch (ue) {
        console.error('Failed to remove file', f, ue);
      }
    });

    // Now remove variants then product
    productDB.serialize(() => {
      productDB.run('DELETE FROM product_quantity WHERE product_id = ?', [id], (err) => {
        if (err) console.error('Error deleting variants:', err);
        productDB.run('DELETE FROM products WHERE id = ?', [id], (err2) => {
          if (err2) {
            console.error('Error deleting product:', err2);
            return res.status(500).send('Error deleting product');
          }
          console.log('Deleted product', id);
          res.redirect('/admin/products');
        });
      });
    });
  });
});


// ==================================
// 15. ADMIN — QUẢN LÝ TRẢ HÀNG
// ==================================
app.get('/admin/returns', isAdmin, (req, res) => {
  res.render('admin/returns', {
    title: 'Yêu cầu trả hàng',
    returns: returnsList
  });
});

app.post('/admin/returns/approve/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);

  const r = returnsList.find((x) => x.id === id);
  r.status = 'approved';

  saveJSON(returnsPath, returnsList);
  res.redirect('/admin/returns');
});

// DEBUG: allow local non-auth deletion when in development for testing only
if (process.env.NODE_ENV !== 'production') {
  app.post('/__debug__/admin/delete/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).send('Invalid id');
    console.log('DEBUG delete invoked for id', id);

    productDB.get('SELECT image, images FROM products WHERE id = ?', [id], (gErr, row) => {
      if (gErr) {
        console.error('Error querying product before debug-delete:', gErr);
        return res.status(500).send('DB error');
      }
      if (!row) return res.status(404).send('Product not found');

      const filesToRemove = [];
      if (row.image) filesToRemove.push(row.image);
      if (row.images) {
        String(row.images).split(',').forEach(f => { if (f && f.trim()) filesToRemove.push(f.trim()); });
      }

      filesToRemove.forEach(f => {
        try {
          const candidate = f.startsWith('/') ? path.join(__dirname, f) : path.join(__dirname, 'public', 'uploads', f);
          if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
        } catch (ue) { console.error('Unlink error (debug):', ue); }
      });

      productDB.serialize(() => {
        productDB.run('DELETE FROM product_quantity WHERE product_id = ?', [id], (err) => {
          if (err) console.error('Error deleting variants (debug):', err);
          productDB.run('DELETE FROM products WHERE id = ?', [id], (err2) => {
            if (err2) {
              console.error('Error deleting product (debug):', err2);
              return res.status(500).send('Error deleting product');
            }
            console.log('DEBUG deleted product', id);
            res.send('OK');
          });
        });
      });
    });
  });
}

// Dev-only: list registered routes for debugging
if (process.env.NODE_ENV !== 'production') {
  app.get('/__debug__/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(mw => {
      if (mw.route && mw.route.path) {
        const methods = Object.keys(mw.route.methods).join(',').toUpperCase();
        routes.push({ path: mw.route.path, methods });
      }
    });
    res.json({ routes });
  });
}

// Note: listening is performed by start_server.js in development.
// Remove direct app.listen here to avoid double-listen when required.

// server listening is handled by `start_server.js` in development

// Small balancing closers (fix module parse if any wrapper left open)
});

