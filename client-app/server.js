const path = require('path'); // khai báo path đầu tiên
console.log('SERVER.JS ACTUAL FILE:', __filename);
// console.log('server.js loaded');
// console.log('SERVER FILE:', __filename);
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // dùng path ngay sau đó


const slugify = require('slugify');
const fs = require('fs');
const crypto = require('crypto');

const { promisify } = require('util');

const express = require('express');
const session = require('express-session');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/customers.db');
const orderDB = new sqlite3.Database('./database/orders.db'); // tạo DB orders
const productDB = new sqlite3.Database('./database/products.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) console.error('Cannot open products.db:', err.message);
  else console.log('Opened products.db successfully');
})

productDB.serialize(() => {
  productDB.run("ATTACH DATABASE './database/orders.db' AS ordersDB");
  productDB.run("ATTACH DATABASE './database/customers.db' AS customersDB");
});

const dbGet = promisify(productDB.get.bind(productDB));
const dbAll = promisify(productDB.all.bind(productDB));

const dbCustomerAll = promisify(db.all.bind(db));
const dbCustomerGet = promisify(db.get.bind(db));           // customers.db
const dbCustomerRun = promisify(db.run.bind(db));

const dbOrderGet = promisify(orderDB.get.bind(orderDB));    // orders.db
const dbOrderAll = promisify(orderDB.all.bind(orderDB));
const dbOrderRun = promisify(orderDB.run.bind(orderDB));

function runWithLastId(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}


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




const app = express();
const PORT = process.env.PORT || 3001;
// Export the app for external start scripts / tests
module.exports = app;


// Request logger (general)
app.use((req, res, next) => {
  console.log('>>> REQ', req.method, req.url);
  next();
});


// ========== MIDDLEWARE CƠ BẢN ==========
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    name: 'clientapp.sid', // tránh đè cookie với oauth-server (cùng domain localhost)
    secret: process.env.SESSION_SECRET || 'secret-key-very-hard-to-guess',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,        // set true nếu dùng HTTPS
      sameSite: 'lax',      // cho phép redirect OAuth nhưng vẫn chặn CSRF cơ bản
      httpOnly: true,
    }
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
  redirect_uri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3001/callback',
  scope: 'openid profile email offline_access',
  authorization_endpoint: '/authorize',
  token_endpoint: '/token',
  userinfo_endpoint: '/userinfo',
  logout_endpoint: '/logout',
};


// Helper: add column if missing
function ensureColumn(database, table, column, type) {
  database.all(`PRAGMA table_info(${table})`, (err, rows) => {
    if (err) return console.error(err);
    const exists = rows.some(r => r.name === column);
    if (!exists) {
      database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, (e) => {
        if (e) console.error(`Cannot add column ${column} on ${table}:`, e.message);
        else console.log(`Added column ${column} to ${table}`);
      });
    }
  });
}

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

  // Bổ sung phone/address nếu chưa có (lưu info giao hàng)
  ensureColumn(db, 'customers', 'phone', 'TEXT');
  ensureColumn(db, 'customers', 'address', 'TEXT');
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

  // Orders
  productDB.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
  `);


   // Order items
  productDB.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      price INTEGER,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

});

orderDB.serialize(() => {
  orderDB.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      created_at TEXT,
      FOREIGN KEY(customer_id) REFERENCES customers(id)
    )
  `);

  orderDB.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      price INTEGER,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  // Bổ sung metadata đơn hàng + biến thể
  ensureColumn(orderDB, 'orders', 'status', "TEXT DEFAULT 'pending'");
  ensureColumn(orderDB, 'orders', 'total', 'INTEGER');
  ensureColumn(orderDB, 'orders', 'phone', 'TEXT');
  ensureColumn(orderDB, 'orders', 'address', 'TEXT');
  ensureColumn(orderDB, 'orders', 'payment_method', 'TEXT');
  ensureColumn(orderDB, 'order_items', 'color', 'TEXT');
  ensureColumn(orderDB, 'order_items', 'size', 'TEXT');
  ensureColumn(orderDB, 'orders', 'shipped_at', 'TEXT');        // lúc admin chuyển sang shipping
  ensureColumn(orderDB, 'orders', 'delivered_at', 'TEXT');      // lúc admin chuyển done
  ensureColumn(orderDB, 'orders', 'eta_date', 'TEXT');          // ngày dự kiến nhận trước (lưu lại để luôn ổn định)
  ensureColumn(orderDB, 'orders', 'eta_extended', "INTEGER DEFAULT 0"); // đã gia hạn +2 ngày chưa
  ensureColumn(orderDB, 'orders', 'delay_notified', "INTEGER DEFAULT 0"); // đã “xin lỗi” chưa (tránh spam)
  ensureColumn(orderDB, 'orders', 'reviewed', 'INTEGER DEFAULT 0');

  orderDB.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      customer_id INTEGER,
      product_id INTEGER,
      rating INTEGER,
      comment TEXT,
      created_at TEXT,
      has_media INTEGER DEFAULT 0
    )
  `);


  orderDB.run(`
    CREATE TABLE IF NOT EXISTS review_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      type TEXT NOT NULL,     -- 'image' | 'video'
      url TEXT NOT NULL,
      FOREIGN KEY(review_id) REFERENCES reviews(id)
    )
  `);

  orderDB.run(`
    CREATE TABLE IF NOT EXISTS return_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(order_id, product_id, customer_id)
    )
  `);

  orderDB.run(`ALTER TABLE orders ADD COLUMN return_requested INTEGER DEFAULT 0`, (err) => {
    if (err) console.log('return_requested exists:', err.message);
  });
  orderDB.run(`ALTER TABLE orders ADD COLUMN return_blocked INTEGER DEFAULT 0`, (err) => {
    if (err) console.log('return_blocked exists:', err.message);
  });

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
app.get(['/', '/home'], async (req, res) => {
  const effectivePriceSql = `CASE WHEN status='sale' AND salePrice > 0 THEN salePrice ELSE price END`;
  try {
    const rows = await dbAll(
      `SELECT *, ${effectivePriceSql} AS effectivePrice FROM products ORDER BY createdAt DESC LIMIT 8`
    );
    const products = rows && rows.length ? rows : allProducts;
    res.render('home', {
      title: 'Sunshine Boutique – Thời trang nhẹ nhàng',
      products
    });
  } catch (err) {
    console.error('home query error:', err);
    res.render('home', {
      title: 'Sunshine Boutique – Thời trang nhẹ nhàng',
      products: allProducts
    });
  }
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
  
  // Đảm bảo session được ghi trước khi redirect (tránh mất state)
  req.session.save(() => {
    res.redirect(authUrl.toString());
  });
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
    
  // Persist/lookup user in local DB (customers) so OAuth login cũng có bản ghi
  try {
    const oauthUsername =
      userinfo.preferred_username ||
      userinfo.nickname ||
      userinfo.email ||
      `oauth_${userinfo.sub}`;
    const displayName = userinfo.name || oauthUsername;

    let existing = await dbCustomerGet(
      `SELECT * FROM customers WHERE username = ?`,
      [oauthUsername]
    );

    if (!existing) {
      // Tạo user mới với password rỗng, role customer
      const insertSql = `
        INSERT INTO customers (username, displayName, password, role)
        VALUES (?, ?, ?, 'customer')
      `;
      const insertResult = await dbCustomerRun(insertSql, [
        oauthUsername,
        displayName,
        '',
      ]);

      // Lấy lại bản ghi vừa tạo
      existing = await dbCustomerGet(
        `SELECT * FROM customers WHERE id = ?`,
        [insertResult.lastID]
      );
    }

    // Nếu thiếu displayName, bổ sung để hiển thị đẹp
    if (existing && !existing.displayName) {
      existing.displayName = displayName;
    }

    // Lưu thông tin user vào session
    req.session.user = existing;
  } catch (dbErr) {
    console.error('❌ OAuth user persistence error:', dbErr);
    // Dù lỗi DB, vẫn cho login session từ OAuth để không chặn người dùng
    req.session.user = {
      id: userinfo.sub,
      username: userinfo.preferred_username || userinfo.nickname || userinfo.email,
      displayName: userinfo.name || userinfo.nickname,
      email: userinfo.email,
      role: 'customer',
      oauth: true,
    };
  }
  
    // Lưu thông tin user vào session
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
    logoutUrl.searchParams.set('post_logout_redirect_uri', 'http://localhost:3001');
    
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
app.get('/products', async (req, res) => {
  console.log('marker: inside /products route definition');

  // Filters
  const { search = '', category = 'all', min = '', max = '', sort = '' } = req.query;
  const searchNorm = String(search || '').trim();

  // "Giá thực" = salePrice nếu đang sale và salePrice > 0, ngược lại dùng price
  const effectivePriceSql = `CASE WHEN status='sale' AND salePrice > 0 THEN salePrice ELSE price END`;

  const where = [];
  const params = [];

  if (searchNorm) {
    where.push('(LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(shortDescription) LIKE ?)');
    const q = `%${searchNorm.toLowerCase()}%`;
    params.push(q, q, q);
  }

  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }

  const minNum = min === '' ? null : Number(min);
  const maxNum = max === '' ? null : Number(max);
  if (Number.isFinite(minNum)) {
    where.push(`${effectivePriceSql} >= ?`);
    params.push(minNum);
  }
  if (Number.isFinite(maxNum)) {
    where.push(`${effectivePriceSql} <= ?`);
    params.push(maxNum);
  }

  const orderBy =
    sort === 'asc' ? `ORDER BY ${effectivePriceSql} ASC` :
    sort === 'desc' ? `ORDER BY ${effectivePriceSql} DESC` : '';

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT
      *,
      ${effectivePriceSql} AS effectivePrice
    FROM products
    ${whereClause}
    ${orderBy}
  `;

  try {
    const rows = await dbAll(sql, params);
    const productsToRender = (rows && rows.length > 0) ? rows : allProducts;

    // categories list (prefer DB)
    let categories = ['all', ...new Set(productsToRender.map(p => p.category).filter(Boolean))];
    try {
      const catRows = await dbAll('SELECT DISTINCT category FROM products');
      const catList = (catRows || []).map(r => r.category).filter(Boolean);
      if (catList.length > 0) categories = ['all', ...catList];
    } catch (e) {
      // ignore - fallback already computed
    }

    res.render('products', {
      title: 'Tất cả sản phẩm',
      products: productsToRender,
      categories,
      filters: { search: searchNorm, category, min, max, sort }
    });
  } catch (err) {
    console.error('Lỗi khi đọc products từ DB:', err);
    const categories = ['all', ...new Set(allProducts.map(p => p.category).filter(Boolean))];
    res.render('products', {
      title: 'Tất cả sản phẩm',
      products: allProducts,
      categories,
      filters: { search: searchNorm, category, min, max, sort }
    });
  }
});

// API LẤY TÙY CHỌN SẢN PHẨM (MÀU, SIZE, SỐ LƯỢNG)
app.get('/api/product-options/:id', (req, res) => {
  const productId = req.params.id;

  productDB.all(
    `
    SELECT color, size, quantity
    FROM product_quantity
    WHERE product_id = ?
    `,
    [productId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'DB ERROR' });
      }
      res.json(rows);
    }
  );
});


// ----- PRODUCT DETAIL -----
app.get('/product/:id', (req, res) => {
  const id = Number(req.params.id);

  productDB.get("SELECT * FROM products WHERE id = ?", [id], (err, product) => {
    if (err) return res.status(500).send("DB Error");
    if (!product) return res.status(404).send("Không tìm thấy sản phẩm");

    // Gallery từ DB
    const images = product.images ? String(product.images).split(",").filter(Boolean) : [];
    product.gallery = images.length ? images : (product.image ? [product.image] : []);

    // Variants từ product_quantity
    productDB.all(
      `SELECT color, size, quantity
       FROM product_quantity
       WHERE product_id = ?`,
      [id],
      (vErr, variants) => {
        if (vErr) variants = [];

        orderDB.all(
          `SELECT rating, comment, created_at, customer_id
          FROM reviews
          WHERE product_id = ?
          ORDER BY datetime(created_at) DESC`,
          [id],
          async (rErr, rows) => {
            if (rErr) rows = [];

            const mappedReviews = [];

            for (const r of rows) {
              let user = null;
              try {
                user = await dbCustomerGet(
                  'SELECT displayName FROM customers WHERE id = ?',
                  [r.customer_id]
                );
              } catch (e) {
                user = null;
              }

              mappedReviews.push({
                rating: r.rating,
                comment: r.comment,
                created_at: r.created_at,
                displayName: user?.displayName || 'Khách hàng'
              });
            }

            res.render('product', {
              title: product.name,
              product,
              variants,
              reviews: mappedReviews
            });
          }
        );

      }
    );
  });
});


// ----- GIỎ HÀNG -----
app.get('/cart', (req, res) => {
  console.log('marker: inside /cart route definition');
  const cart = req.session.cart || [];
  res.render('cart', { title: 'Giỏ hàng', cart });
});


// LẤY SỐ LƯỢNG GIỎ HÀNG — Fix cho header
app.get('/cart/count', (req, res) => {
  console.log('marker: inside /cart/count route definition');
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ count: total });
});

// ==================================

app.post('/cart/add/:id', (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Chưa đăng nhập' });
  }

  const id = Number(req.params.id);
  const { color, size } = req.body;

  if (!color || !size) {
    return res.status(400).json({ success: false, message: 'Thiếu màu hoặc size' });
  }

  // 1) Lấy product từ DB (đúng nguồn)
  productDB.get(
    "SELECT id, name, price, salePrice, image FROM products WHERE id = ?",
    [id],
    (err, product) => {
      if (err) return res.status(500).json({ success: false, message: 'DB Error' });
      if (!product) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });

      const finalPrice =
        product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;

      // 2) Check tồn kho theo variant
      productDB.get(
        `SELECT quantity
         FROM product_quantity
         WHERE product_id = ? AND color = ? AND size = ?`,
        [id, color, size],
        (qErr, row) => {
          if (qErr) return res.status(500).json({ success: false, message: 'DB Error (qty)' });
          if (!row) return res.status(400).json({ success: false, message: 'Biến thể không tồn tại' });
          if (row.quantity <= 0) return res.status(400).json({ success: false, message: 'Hết hàng' });

          req.session.cart = req.session.cart || [];

          const existing = req.session.cart.find(
            i => i.id === id && i.color === color && i.size === size
          );

          if (existing) {
            existing.quantity++;
          } else {
            req.session.cart.push({
              id: product.id,
              name: product.name,
              price: finalPrice,
              image: product.image,
              color,
              size,
              quantity: 1
            });
          }

          const total = req.session.cart.reduce((s, i) => s + i.quantity, 0);
          return res.json({ success: true, cartCount: total });
        }
      );
    }
  );
});

// CẬP NHẬT SỐ LƯỢNG TRONG GIỎ HÀNG
app.post('/cart/update', (req, res) => {
  const { id, color, size, quantity } = req.body;

  req.session.cart = req.session.cart || [];

  const item = req.session.cart.find(i =>
    i.id === Number(id) &&
    i.color === color &&
    i.size === size
  );

  if (!item) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ' });
  }

  item.quantity = Number(quantity);
  res.json({ success: true });
});

// XÓA SẢN PHẨM KHỎI GIỎ HÀNG
app.post('/cart/remove', (req, res) => {
  const { id, color, size } = req.body;

  req.session.cart = req.session.cart || [];

  req.session.cart = req.session.cart.filter(i =>
    !(i.id === Number(id) && i.color === color && i.size === size)
  );

  res.json({ success: true });
});

// ==================================
// 8. CHECKOUT → TẠO ĐƠN HÀNG
// ==================================
app.get('/checkout', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');

  const username = req.session.user.username;
  let customer;
  try {
    customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
  } catch (e) {
    customer = null;
  }
  if (!customer) return res.redirect('/login');

  // saved shipping (nếu có)
  let saved = { phone: '', address: '' };
  try {
    const row = await dbCustomerGet('SELECT phone, address FROM customers WHERE id = ?', [customer.id]);
    saved = { phone: row?.phone || '', address: row?.address || '' };
  } catch (e) {
    saved = { phone: '', address: '' };
  }

  // đã từng mua? (orders.db)
  let hasOrders = false;
  try {
    const r = await dbOrderGet('SELECT COUNT(*) AS c FROM orders WHERE customer_id = ?', [customer.id]);
    hasOrders = Number(r?.c || 0) > 0;
  } catch (e) {
    hasOrders = false;
  }

  const total = cart.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const canUseSaved = !!(saved.phone && saved.address);

  res.render('checkout', {
    title: 'Thanh toán',
    cart,
    error: null,
    checkoutData: {
      useSaved: canUseSaved || hasOrders,
      phone: canUseSaved ? saved.phone : '',
      address: canUseSaved ? saved.address : '',
      paymentMethod: 'cod',
      total
    }
  });
});

app.get('/checkout/success/:id', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('checkout-success', { title: 'Đặt hàng thành công', orderId: req.params.id });
});

app.post('/checkout', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');

  const username = req.session.user.username;

  let customer;
  try {
    customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
  } catch (e) {
    customer = null;
  }

  if (!customer) return res.redirect('/login');

  // Tính tổng
  const total = cart.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);

  // Payment method (hiện tại: COD)
  const paymentMethod = (req.body.payment_method || 'cod').toLowerCase();

  // Lấy thông tin giao hàng: ưu tiên dùng đã lưu nếu user chọn
  const useSaved = String(req.body.use_saved || '') === '1';
  let phone = '';
  let address = '';

  // Thử đọc phone/address từ DB (nếu chưa migrate kịp thì catch)
  let saved = { phone: null, address: null };
  try {
    const row = await dbCustomerGet('SELECT phone, address FROM customers WHERE id = ?', [customer.id]);
    saved = { phone: row?.phone || null, address: row?.address || null };
  } catch (e) {
    saved = { phone: null, address: null };
  }

  if (useSaved && saved.phone && saved.address) {
    phone = saved.phone;
    address = saved.address;
  } else {
    phone = String(req.body.phone || '').trim();
    address = String(req.body.address || '').trim();
  }

  // Validate
  const phoneOk = /^[0-9+\s()-]{8,20}$/.test(phone);
  if (!phoneOk || !address) {
    return res.render('checkout', {
      title: 'Thanh toán',
      cart,
      error: 'Vui lòng nhập SĐT hợp lệ và địa chỉ giao hàng.',
      checkoutData: {
        useSaved,
        phone,
        address,
        paymentMethod,
        total
      }
    });
  }

  // Lưu lại phone/address vào customers (nếu có cột)
  try {
    await dbCustomerRun('UPDATE customers SET phone = ?, address = ? WHERE id = ?', [phone, address, customer.id]);
  } catch (e) {
    // ignore (nếu DB chưa có cột do server chưa restart)
  }

  // Tạo order trong orders.db
  try {
    const createdAt = new Date().toISOString();
    const eta = new Date(Date.now() + 7*24*60*60*1000).toISOString(); // +7 ngày

    const insert = await runWithLastId(
      orderDB,
      `INSERT INTO orders (customer_id, created_at, status, total, phone, address, payment_method, eta_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer.id, createdAt, 'pending', total, phone, address, paymentMethod, eta]
    );

    const orderId = insert.lastID;

    for (const item of cart) {
      await dbOrderRun(
        'INSERT INTO order_items (order_id, product_id, quantity, price, color, size) VALUES (?, ?, ?, ?, ?, ?)',
        [orderId, item.id, Number(item.quantity), Number(item.price), item.color || '', item.size || '']
      );
    }

    req.session.cart = [];

    return res.redirect('/orders/' + orderId);
  } catch (err) {
    console.error('Checkout error:', err);
    return res.render('checkout', {
      title: 'Thanh toán',
      cart,
      error: 'Có lỗi khi tạo đơn hàng. Vui lòng thử lại.',
      checkoutData: {
        useSaved,
        phone,
        address,
        paymentMethod,
        total
      }
    });
  }
});



// CUSTOMER — ĐƠN MUA
// ===============================
app.get('/my-orders', async (req, res) => {
  
  if (!req.session.user) return res.redirect('/login');

  const username = req.session.user.username;

  let customer;
  try {
    customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
  } catch (e) {
    customer = null;
  }
  if (!customer) return res.redirect('/login');

  try {
    let status = String(req.query.status || 'all').trim(); // đổi const -> let

    // map BEFORE query
    if (status === 'shipping') status = 'shipped';

    // nếu bạn muốn bỏ "all" và mặc định là pending:
    // let status = String(req.query.status || 'pending').trim();
    // if (status === 'all') status = 'pending';

    const where = status === 'all' ? '' : 'AND o.status = ?';
    const params = status === 'all' ? [customer.id] : [customer.id, status];

    const orders = await dbAll(`
      SELECT
        o.id, o.created_at, o.status, o.total, o.payment_method, o.phone, o.address,
        o.eta_date, o.shipped_at,
        CASE WHEN COALESCE(rv.cnt, 0) > 0 THEN 1 ELSE 0 END AS reviewedFlag
      FROM ordersDB.orders o
      LEFT JOIN (
        SELECT order_id, customer_id, COUNT(*) AS cnt
        FROM ordersDB.reviews
        GROUP BY order_id, customer_id
      ) rv
        ON rv.order_id = o.id AND rv.customer_id = o.customer_id
      WHERE o.customer_id = ?
      ${where}
      ORDER BY o.id DESC
    `, params);

    res.render('my-orders', { title: 'Đơn mua', orders, status });
  } catch (err) {
    console.error('MY ORDERS ERROR:', err);
    res.status(500).send('DB ERROR');
  }

});

// ===============================
// CUSTOMER — CHI TIẾT ĐƠN
// ===============================
app.get('/orders/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).send('Invalid order id');

    const username = req.session.user.username;
    const isAdminUser = req.session.user?.role === 'admin';

    // 1) Lấy customer (để lấy customer.id cho user thường)
    let customer = null;
    if (!isAdminUser) {
      customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
      if (!customer) return res.redirect('/login');
    }

    // 2) Lấy order
    let order = null;
    if (isAdminUser) {
      order = await dbOrderGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    } else {
      order = await dbOrderGet(
        'SELECT * FROM orders WHERE id = ? AND customer_id = ?',
        [orderId, customer.id]
      );
    }

    if (!order) return res.status(404).send('Không tìm thấy đơn hàng');

    // 3) Lấy order_items từ orders.db
    const rawItems = await dbOrderAll(
      `SELECT product_id, quantity, price, color, size
       FROM order_items
       WHERE order_id = ?`,
      [orderId]
    );

    // 4) Lấy thông tin product từ products.db rồi merge
    const items = [];
    for (const oi of rawItems) {
      const p = await dbGet(
        'SELECT id, name, image FROM products WHERE id = ?',
        [oi.product_id]
      );

      items.push({
        product_id: oi.product_id,
        quantity: oi.quantity,
        price: oi.price,
        color: oi.color,
        size: oi.size,
        product_name: p?.name || `SP #${oi.product_id}`,
        product_image: p?.image || ''
      });
    }

    // 5) reviewedMap: ưu tiên lấy từ DB (nếu có bảng reviews), fallback JSON (reviews[])
    const reviewedMap = {};

    // (A) thử lấy từ orders.db bảng reviews
    try {
      const reviewerCustomerId = isAdminUser ? order.customer_id : customer.id;

      const reviewedRows = await dbOrderAll(
        `SELECT product_id
         FROM reviews
         WHERE order_id = ? AND customer_id = ?`,
        [orderId, reviewerCustomerId]
      );

      reviewedRows.forEach(r => {
        reviewedMap[Number(r.product_id)] = true;
      });
    } catch (e) {
      // (B) fallback: nếu bạn vẫn dùng reviews JSON cũ
      (global.reviews || reviews || [])
        .filter(r => Number(r.orderId) === Number(orderId) && String(r.user) === String(username))
        .forEach(r => {
          reviewedMap[Number(r.productId)] = true;
        });
    }

    // 6) ETA logic (truyền thêm lateApology để EJS dùng)
    const createdAt = order.created_at ? new Date(order.created_at) : new Date();
    const shippedAt = order.shipped_at ? new Date(order.shipped_at) : null;

    let eta = order.eta_date
      ? new Date(order.eta_date)
      : new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    // shipped thì ETA = shipped_at + 3 ngày
    if (String(order.status) === 'shipped' && shippedAt) {
      eta = new Date(shippedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    }

    let lateApology = false;
    let etaExtended = null;

    if (String(order.status) !== 'done' && new Date() > eta) {
      lateApology = true;
      etaExtended = new Date(eta.getTime() + 2 * 24 * 60 * 60 * 1000);
    }

    // 7) Render
    return res.render('order-detail', {
      title: 'Chi tiết đơn hàng',
      order,
      items,
      reviewedMap,
      eta,
      etaExtended,
      lateApology
    });
  } catch (err) {
    console.error('GET /orders/:id error:', err);
    return res.status(500).send('DB ERROR');
  }
});


// ==================================
// CUSTOMER — GIAO DIỆN ĐÁNH GIÁ ĐƠN HÀNG
// CUSTOMER — FORM ĐÁNH GIÁ ĐƠN HÀNG
// ==================================
app.get('/orders/:id/review', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const orderId = Number(req.params.id);

  // tìm customer theo session
  const username = req.session.user.username;
  const customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
  if (!customer) return res.redirect('/login');

  // chỉ DONE mới được review + đúng chủ đơn
  const order = await dbOrderGet(
    'SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status = "done"',
    [orderId, customer.id]
  );
  if (!order) return res.send('Đơn hàng chưa hoàn tất hoặc không tồn tại');

  // lấy item trong order (orders.db)
  const orderItems = await dbOrderAll(
    'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
    [orderId]
  );

  // lấy info sản phẩm từ products.db
  const items = [];
  for (const oi of orderItems) {
    const product = await dbGet('SELECT id, name, image FROM products WHERE id = ?', [oi.product_id]);
    if (product) {
      items.push({
        product_id: product.id,
        name: product.name,
        image: product.image,
        quantity: oi.quantity
      });
    }
  }

  res.render('order-review', {
    title: 'Đánh giá sản phẩm',
    order,
    items
  });
});


// ==================================
// CUSTOMER — XỬ LÝ GỬI ĐÁNH GIÁ ĐƠN HÀNG
// ==================================
app.post('/orders/:orderId/review/:productId', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const orderId = Number(req.params.orderId);
    const productId = Number(req.params.productId);
    const rating = Number(req.body.rating || 0);
    const comment = String(req.body.comment || '').trim();

    if (!orderId || !productId) return res.status(400).send('Bad request');
    if (!(rating >= 1 && rating <= 5)) return res.status(400).send('Bạn phải chọn số sao (1-5).');

    // lấy customer đang login
    const username = req.session.user.username;
    const customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
    if (!customer) return res.redirect('/login');

    // chỉ cho review đơn DONE và thuộc về user
    const ord = await dbOrderGet(
      `SELECT id, customer_id, status FROM orders WHERE id = ?`,
      [orderId]
    );
    if (!ord || Number(ord.customer_id) !== Number(customer.id)) return res.status(403).send('Forbidden');
    if (String(ord.status) !== 'done') return res.status(400).send('Đơn chưa hoàn tất nên chưa thể đánh giá.');

    // kiểm tra sản phẩm này có nằm trong đơn không
    const oi = await dbOrderGet(
      `SELECT id FROM order_items WHERE order_id = ? AND product_id = ?`,
      [orderId, productId]
    );
    if (!oi) return res.status(400).send('Sản phẩm không thuộc đơn này.');

    // chống đánh giá trùng trong cùng 1 đơn
    const existed = await dbOrderGet(
      `SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND customer_id = ?`,
      [orderId, productId, customer.id]
    );
    if (existed) {
      return res.redirect('/orders/' + orderId); // đã đánh giá rồi 
    }

    // lưu review
    await dbOrderRun(
      `INSERT INTO reviews (order_id, product_id, customer_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, productId, customer.id, rating, comment, new Date().toISOString()]
    );

    // quay lại chi tiết đơn hàng để thấy “Đã đánh giá”
    return res.redirect('/orders/' + orderId);
  } catch (e) {
    console.error('POST REVIEW ERROR:', e);
    return res.status(500).send('DB ERROR');
  }
});


// ==================================
// CUSTOMER — GỬI ĐÁNH GIÁ
// ==================================
app.post('/product/:id/review', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const productId = Number(req.params.id);
    const orderId = Number(req.body.orderId);
    const rating = Number(req.body.rating || 5);
    const comment = String(req.body.comment || '').trim();

    // lấy customer đang login
    const username = req.session.user.username;
    const customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
    if (!customer) return res.redirect('/login');

    // chỉ cho review nếu order DONE và đúng chủ đơn
    const order = await dbOrderGet(
      'SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status = "done"',
      [orderId, customer.id]
    );
    if (!order) return res.status(400).send('Đơn hàng chưa hoàn tất hoặc không hợp lệ');

    // ✅ chặn review trùng
    const existed = await dbOrderGet(
      `SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND customer_id = ?`,
      [orderId, productId, customer.id]
    );
    if (existed) {
      return res.redirect('/orders/' + orderId); // đã review rồi thì quay lại luôn
    }

    // insert review
    await dbOrderRun(
      `INSERT INTO reviews (order_id, product_id, customer_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, productId, customer.id, rating, comment, new Date().toISOString()]
    );

    // ✅ quay lại chi tiết đơn
    return res.redirect('/orders/' + orderId + '#item-' + productId);
  } catch (e) {
    console.error('POST REVIEW ERROR:', e);
    return res.status(500).send('DB ERROR');
  }
});




// ==================================
// 10. RETURN / YÊU CẦU TRẢ HÀNG
// ==================================
app.get('/orders/:id/return', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const orderId = Number(req.params.id);
  const username = req.session.user.username;

  // lấy customer id
  const customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
  if (!customer) return res.redirect('/login');

  // chỉ cho hoàn đơn DONE + chưa reviewed + đúng chủ đơn
  const order = await dbOrderGet(
    'SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status = "done"',
    [orderId, customer.id]
  );
  if (!order) return res.status(400).send('Không thể hoàn đơn này');

  const isReviewed = Number(order.reviewed || 0) === 1;
  if (isReviewed) return res.status(400).send('Đơn đã đánh giá nên không thể hoàn');

  // lấy item để show
  // lấy item từ orders.db (KHÔNG JOIN products)
  const orderItems = await dbOrderAll(
    `SELECT product_id, quantity, color, size
    FROM order_items
    WHERE order_id = ?`,
    [orderId]
  );

  // với mỗi item -> lấy info từ products.db
  const items = [];
  for (const oi of orderItems) {
    const p = await dbGet('SELECT id, name, image FROM products WHERE id = ?', [oi.product_id]); 
    items.push({
      product_id: oi.product_id,
      name: p?.name || ('Sản phẩm #' + oi.product_id),
      image: p?.image || '',
      quantity: oi.quantity,
      color: oi.color,
      size: oi.size
    });
  }

  res.render('order-return', {
    title: 'Yêu cầu hoàn hàng',
    order,
    items
  });

});

// ==================================
// CUSTOMER — HỦY ĐƠN (chỉ pending/processing)
app.post('/orders/:id/cancel', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).send('Invalid order id');

    const username = req.session.user.username;

    // lấy customer id
    const customer = await dbCustomerGet(
      'SELECT id FROM customers WHERE username = ?',
      [username]
    );
    if (!customer) return res.redirect('/login');

    // lấy order đúng chủ
    const order = await dbOrderGet(
      'SELECT id, status FROM orders WHERE id = ? AND customer_id = ?',
      [orderId, customer.id]
    );
    if (!order) return res.status(404).send('Không tìm thấy đơn');

    const st = String(order.status || '').trim();

    // chỉ cho hủy khi pending hoặc processing
    if (!['pending', 'processing'].includes(st)) {
      return res.status(400).send('Đơn này không thể huỷ ở trạng thái hiện tại.');
    }

    await dbOrderRun(
      "UPDATE orders SET status = 'cancelled' WHERE id = ? AND customer_id = ?",
      [orderId, customer.id]
    );

    // quay lại trang trước (hoặc my-orders)
    const back = req.headers.referer || '/my-orders';
    return res.redirect(back);
  } catch (e) {
    console.error('CANCEL ORDER ERROR:', e);
    return res.status(500).send('DB ERROR');
  }
});

// ==================================
// 11. RETURN / YÊU CẦU TRẢ HÀNG
// ==================================
app.post('/orders/:id/return', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const orderId = Number(req.params.id);
  const reason = String(req.body.reason || '').trim();

  // chỉ cho hoàn đơn đã DONE
  orderDB.get(
    'SELECT * FROM orders WHERE id = ? AND status = "done"',
    [orderId],
    (err, order) => {
      if (err || !order) return res.status(400).send('Không thể hoàn đơn này');

      // tạo yêu cầu hoàn
      returnsList.push({
        id: Date.now(),
        orderId,
        user: req.session.user.username,
        status: 'pending',
        reason,
        createdAt: new Date().toISOString()
      });

      saveJSON(returnsPath, returnsList);

      orderDB.run(`UPDATE orders SET status = 'return_requested' WHERE id = ?`, [orderId]);
      res.redirect('/orders/' + orderId);
    }
  );
});

// ==================================
// CUSTOMER — GỬI YÊU CẦU HOÀN HÀNG
// ==================================
app.post('/orders/:id/return-request', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const orderId = Number(req.params.id);
  const username = req.session.user.username;

  const customer = await dbCustomerGet('SELECT * FROM customers WHERE username=?', [username]);
  if (!customer) return res.redirect('/login');

  const order = await dbOrderGet(
    'SELECT * FROM orders WHERE id=? AND customer_id=?',
    [orderId, customer.id]
  );
  if (!order) return res.status(404).send('Không tìm thấy đơn');

  // Chỉ DONE mới được yêu cầu hoàn
  if (String(order.status) !== 'done') {
    return res.status(400).send('Chỉ được yêu cầu hoàn khi đơn đã hoàn tất');
  }

  // Nếu admin đã từ chối rồi => khóa hoàn vĩnh viễn
  if (Number(order.return_blocked || 0) === 1) {
    return res.status(400).send('Yêu cầu hoàn đã bị từ chối. Không thể yêu cầu lại.');
  }

  // Nếu đã đánh giá bất kỳ sản phẩm nào trong đơn => không cho hoàn nữa
  const anyReviewed = (reviews || []).some(r =>
    Number(r.orderId) === Number(orderId) && String(r.user) === String(username)
  );
  if (anyReviewed) {
    return res.status(400).send('Bạn đã đánh giá đơn này, không thể yêu cầu hoàn.');
  }

  // Nếu đang chờ duyệt rồi thì thôi
  if (Number(order.return_requested || 0) === 1) {
    return res.redirect('/orders/' + orderId);
  }

  await dbOrderRun(
    "UPDATE orders SET return_requested=1, status='return_requested' WHERE id=?",
    [orderId]
  );
  return res.redirect('/orders/' + orderId);
});


// ==================================
// CUSTOMER — GIAO DIỆN ĐÁNH GIÁ SẢN PHẨM
// ==================================
app.get('/orders/:orderId/review/:productId', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const orderId = Number(req.params.orderId);
  const productId = Number(req.params.productId);

  const username = req.session.user.username;
  const customer = await dbCustomerGet(
    'SELECT * FROM customers WHERE username = ?',
    [username]
  );
  if (!customer) return res.redirect('/login');

  // chỉ cho review nếu đơn DONE + đúng chủ đơn
  const order = await dbOrderGet(
    'SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status = "done"',
    [orderId, customer.id]
  );
  if (!order) return res.send('Không thể đánh giá đơn này');

  // kiểm tra sản phẩm có trong đơn không
  const orderItem = await dbOrderGet(
    'SELECT * FROM order_items WHERE order_id = ? AND product_id = ?',
    [orderId, productId]
  );
  if (!orderItem) return res.send('Sản phẩm không thuộc đơn hàng');

  // lấy info sản phẩm từ products.db
  const product = await dbGet(
    'SELECT id, name, image FROM products WHERE id = ?',
    [productId]
  );
  if (!product) return res.send('Không tìm thấy sản phẩm');

  res.render('order-review', {
    title: 'Đánh giá sản phẩm',
    order,
    product,
    orderItem
  });
});

// ==================================
// CUSTOMER — GỬI ĐÁNH GIÁ SẢN PHẨM
// ==================================
app.post('/orders/:orderId/review/:productId', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const orderId = Number(req.params.orderId);
    const productId = Number(req.params.productId);
    const rating = Number(req.body.rating || 0);
    const comment = String(req.body.comment || '').trim();

    // lấy customer
    const customer = await dbCustomerGet(
      'SELECT id FROM customers WHERE username = ?',
      [req.session.user.username]
    );
    if (!customer) return res.redirect('/login');

    // chỉ cho review đơn DONE + đúng chủ đơn
    const order = await dbOrderGet(
      `SELECT id FROM orders WHERE id = ? AND customer_id = ? AND status = 'done'`,
      [orderId, customer.id]
    );
    if (!order) return res.status(400).send('Không thể đánh giá đơn này');

    // chặn review trùng
    const existed = await dbOrderGet(
      `SELECT id FROM reviews WHERE order_id = ? AND customer_id = ? AND product_id = ?`,
      [orderId, customer.id, productId]
    );
    if (existed) return res.redirect('/orders/' + orderId);

    await dbOrderRun(
      `INSERT INTO reviews (order_id, customer_id, product_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, customer.id, productId, rating, comment, new Date().toISOString()]
    );

    return res.redirect('/orders/' + orderId);
  } catch (e) {
    console.error('POST REVIEW ERROR:', e);
    return res.status(500).send('DB ERROR');
  }
});




// ==================================
// CUSTOMER — GIAO DIỆN TRẢ HÀNG SẢN PHẨM
// ==================================
app.get('/orders/:orderId/return/:productId', (req, res) => {
  res.send('TODO: Return UI here. orderId=' + req.params.orderId + ' productId=' + req.params.productId);
});


// ==================================
// 9. CUSTOMER — DANH SÁCH ĐƠN HÀNG
// ==================================
app.get('/orders', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const username = req.session.user.username;
  const customer = await dbCustomerGet('SELECT * FROM customers WHERE username = ?', [username]);
  if (!customer) return res.redirect('/login');

  const tab = String(req.query.tab || 'all'); // all | pending | shipped | done | reviewed | returning | cancelled

  let where = 'o.customer_id = ?';
  const params = [customer.id];

  if (tab === 'reviewed') where += ' AND o.status = "done" AND COALESCE(o.reviewed,0)=1';
  else if (tab === 'done') where += ' AND o.status = "done" AND COALESCE(o.reviewed,0)=0';
  else if (tab !== 'all') where += ' AND o.status = ?' , params.push(tab);

  const orders = await dbOrderAll(
    `SELECT o.* FROM orders o WHERE ${where} ORDER BY o.id DESC`,
    params
  );

  res.render('orders-list', { title: 'Đơn mua', orders, tab });
});



// ==================================
// CUSTOMER — CHI TIẾT ĐƠN HÀNG
// ==================================
app.get('/orders/:id', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const orderId = Number(req.params.id);
    if (!orderId) return res.status(400).send('Invalid order id');

    // 0) lấy customer đang login (từ customers.db)
    const username = req.session.user.username;
    const customer = await dbCustomerGet(
      'SELECT id, username, displayName FROM customers WHERE username = ?',
      [username]
    );
    if (!customer) return res.redirect('/login');

    // 1) lấy order của đúng customer
    const order = await dbOrderGet(
      `SELECT *
       FROM orders
       WHERE id = ? AND customer_id = ?`,
      [orderId, customer.id]
    );

    if (!order) return res.status(404).send('Không tìm thấy đơn hàng');

    // 2) lấy items trong đơn (orders.db) + join sang products.db
    //    LƯU Ý: products nằm trong products.db => dùng productDB để query, nhưng order_items nằm trong orders.db
    //    Cách đơn giản: query items từ orders.db trước, rồi map sang products.db.

    const rawItems = await dbOrderAll(
      `SELECT product_id, quantity, price, color, size
       FROM order_items
       WHERE order_id = ?`,
      [orderId]
    );

    // lấy info sản phẩm từ products.db cho tất cả product_id
    const items = [];
    for (const oi of rawItems) {
      const p = await dbGet(
        `SELECT id, name, image
         FROM products
         WHERE id = ?`,
        [oi.product_id]
      );

      items.push({
        product_id: oi.product_id,
        quantity: oi.quantity,
        price: oi.price,
        color: oi.color,
        size: oi.size,
        product_name: p ? p.name : `SP #${oi.product_id}`,
        product_image: p ? p.image : ''
      });
    }

    // 3) late apology (giao trễ)
    let lateApology = false;
    if (order.eta_date && String(order.status) !== 'done') {
      const eta = new Date(order.eta_date);
      const now = new Date();
      if (now > eta) lateApology = true;
    }

    // 4) reviewedMap lấy từ DB (orders.db table: reviews)
    //    (chặn nút đánh giá cho từng product trong order)
    const reviewedRows = await dbOrderAll(
      `SELECT product_id
       FROM reviews
       WHERE order_id = ? AND customer_id = ?`,
      [orderId, customer.id]
    );

    const reviewedMap = {};
    (reviewedRows || []).forEach(r => {
      reviewedMap[Number(r.product_id)] = true;
    });

    // 5) render
    return res.render('order-detail', {
      title: 'Chi tiết đơn hàng',
      order,
      items,
      reviewedMap,
      lateApology
    });

  } catch (err) {
    console.error('GET /orders/:id ERROR:', err);
    return res.status(500).send('DB ERROR');
  }
});




// ==================================
app.get('/admin/dashboard', isAdmin, async (req, res) => {
  try {
    // 1) Counts
    const productsCountRow = await dbGet(`SELECT COUNT(*) AS cnt FROM productsDB.products`);
    const customersCountRow = await dbCustomerGet(`SELECT COUNT(*) AS cnt FROM customers`);
    const ordersCountRow = await dbGet(`SELECT COUNT(*) AS cnt FROM ordersDB.orders`);
    const pendingCountRow = await dbGet(`SELECT COUNT(*) AS cnt FROM ordersDB.orders WHERE status = 'pending'`);

    const productsCount = productsCountRow?.cnt || 0;
    const customersCount = customersCountRow?.cnt || 0;
    const ordersCount = ordersCountRow?.cnt || 0;
    const pendingCount = pendingCountRow?.cnt || 0;

    // 2) Total revenue (tuỳ bạn tính theo trạng thái nào)
    // Thường doanh thu chỉ tính đơn done (hoặc done + returned tuỳ bài)
    const revenueRow = await dbGet(`
      SELECT COALESCE(SUM(total), 0) AS totalRevenue
      FROM ordersDB.orders
      WHERE status = 'done'
    `);
    const totalRevenue = revenueRow?.totalRevenue || 0;

    // 3) Sales today (top sản phẩm bán hôm nay)
    const salesToday = await dbAll(`
      SELECT
        p.name AS product_name,
        c.username AS customer_name,
        SUM(oi.quantity) AS sold
      FROM ordersDB.orders o
      JOIN ordersDB.order_items oi ON oi.order_id = o.id
      JOIN productsDB.products p ON p.id = oi.product_id
      JOIN customers c ON c.id = o.customer_id
      WHERE date(o.created_at) = date('now')
      GROUP BY p.id, c.id
      ORDER BY sold DESC
      LIMIT 10
    `);

    // 4) Revenue 7 days (đủ 7 ngày kể cả ngày = 0)
    const rawWeek = await dbAll(`
      SELECT date(created_at) AS day, COALESCE(SUM(total), 0) AS revenue
      FROM ordersDB.orders
      WHERE status = 'done'
        AND date(created_at) >= date('now','-6 day')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `);

    // fill đủ 7 ngày để chart không bị “trống”
    const revenueMap = new Map((rawWeek || []).map(r => [r.day, Number(r.revenue || 0)]));
    const revenueWeek = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.toISOString().slice(0, 10); // YYYY-MM-DD
      revenueWeek.push({ day, revenue: revenueMap.get(day) || 0 });
    }

    return res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      productsCount,
      customersCount,
      ordersCount,
      pendingCount,
      totalRevenue,
      salesToday,
      revenueWeek,
    });
  } catch (err) {
    console.error('ADMIN DASHBOARD ERROR:', err);
    return res.status(500).send('DB ERROR');
  }
});

// ==================================
// 11. ADMIN — DOANH THU THEO NGÀY
// ==================================
app.get('/admin/revenue', isAdmin, async (req, res) => {
  try {
    // có thể chọn 7 / 30 ngày bằng query ?days=7
    const days = Math.max(1, Math.min(90, parseInt(req.query.days || '7', 10)));

    const revenueByDay = await dbAll(`
      SELECT
        date(created_at) AS day,
        COALESCE(SUM(total), 0) AS revenue,
        COUNT(*) AS orders_count
      FROM ordersDB.orders
      WHERE status = 'done'
        AND date(created_at) >= date('now', ?)
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `, [`-${days - 1} days`]);

    const totalRow = await dbGet(`
      SELECT COALESCE(SUM(total), 0) AS total
      FROM ordersDB.orders
      WHERE status='done'
        AND date(created_at) >= date('now', ?)
    `, [`-${days - 1} days`]);

    res.render('admin/revenue', {
      title: 'Doanh thu theo ngày',
      days,
      revenueByDay,
      totalRevenuePeriod: totalRow?.total || 0
    });
  } catch (err) {
    console.error('ADMIN REVENUE ERROR:', err);
    res.render('admin/revenue', {
      title: 'Doanh thu theo ngày',
      days: 7,
      revenueByDay: [],
      totalRevenuePeriod: 0
    });
  }
});

// ==================================
// 12. ADMIN — DASHBOARD
// ==================================

app.get('/admin', isAdmin, async (req, res) => {
  try {
    // 1️⃣ Tổng sản phẩm
    const productsRow = await dbGet('SELECT COUNT(*) AS count FROM products');
    const productsCount = productsRow.count;

    // 2️⃣ Tổng khách hàng
    const customersRow = await dbGet('SELECT COUNT(*) AS count FROM customersDB.customers');
    const customersCount = customersRow.count;

    // 3️⃣ Tổng đơn hàng
    const ordersRow = await dbGet('SELECT COUNT(*) AS count FROM ordersDB.orders');
    const ordersCount = ordersRow.count;

    // 4️⃣ Tổng doanh thu (đơn 'done')
    // 4️⃣ Doanh thu hôm nay (đơn 'done' trong ngày)
    const today = new Date().toISOString().split('T')[0];

    const revenueRow = await dbGet(`
      SELECT COALESCE(SUM(total), 0) AS revenue
      FROM ordersDB.orders
      WHERE status = 'done'
        AND date(created_at) = ?
    `, [today]);

    const totalRevenue = revenueRow?.revenue || 0;


    
    // Số đơn pending
    const pendingCountRow = await dbGet(`
      SELECT COUNT(*) AS count
      FROM ordersDB.orders
      WHERE status = 'pending'
    `);
    const pendingCount = pendingCountRow.count || 0;


  
    // 5️⃣ Đơn cần xử lý hôm nay (pending)
    const ordersTodayRow = await dbGet(`
      SELECT COUNT(*) AS count
      FROM ordersDB.orders
      WHERE status = 'pending'
        AND date(created_at) = ?
    `, [today]);
    const ordersToday = ordersTodayRow.count || 0;


    // 6️⃣ Sản phẩm bán hôm nay (đơn 'done' trong ngày)
    const salesToday = await dbAll(`
      SELECT 
        p.name AS product_name,
        c.displayName AS customer_name,
        SUM(oi.quantity) AS sold
      FROM ordersDB.order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN ordersDB.orders o ON oi.order_id = o.id
      JOIN customersDB.customers c ON o.customer_id = c.id
      WHERE o.status = 'done'
        AND date(o.created_at) = ?
      GROUP BY oi.product_id, o.customer_id
    `, [today]);


    // 7️⃣ Doanh thu 7 ngày gần nhất
    const revenueWeek = await dbAll(`
      SELECT date(created_at) AS day, COALESCE(SUM(total), 0) AS revenue
      FROM ordersDB.orders
      WHERE status = 'done'
        AND date(created_at) >= date('now','-6 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at)
    `);

    // 8️⃣ Top 5 bán chạy (theo số lượng) — 7 ngày gần nhất
    const topQty = await dbAll(`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(SUM(oi.quantity), 0) AS sold
      FROM ordersDB.order_items oi
      JOIN ordersDB.orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.status = 'done'
        AND date(o.created_at) >= date('now','-6 days')
      GROUP BY oi.product_id
      ORDER BY sold DESC
      LIMIT 5
    `);

    // 9️⃣ Top 5 doanh thu cao nhất — 7 ngày gần nhất
    const topRevenue = await dbAll(`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue
      FROM ordersDB.order_items oi
      JOIN ordersDB.orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.status = 'done'
        AND date(o.created_at) >= date('now','-6 days')
      GROUP BY oi.product_id
      ORDER BY revenue DESC
      LIMIT 5
    `);

    console.log('DEBUG ordersCount =', ordersCount);
    console.log('DEBUG pendingCount =', pendingCount);
    // Render dashboard
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      productsCount,
      customersCount,
      ordersCount,
      pendingCount,  
      totalRevenue,
      ordersToday,
      salesToday,
      revenueWeek,
      topQty,
      topRevenue
    });


  } catch (err) {
    console.error(err);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      productsCount: 0,
      customersCount: 0,
      ordersCount: 0,
      totalRevenue: 0,
      ordersToday: 0,
      salesToday: [],
      revenueWeek: [],
      topQty: [],
      topRevenue: []
    });

  }
});

// ===============================
// ADMIN — QUẢN LÝ ĐƠN HÀNG
// ===============================
app.get('/admin/orders', isAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'pending').trim();

    // Lấy danh sách đơn theo status
    const orders = await dbAll(`
      SELECT 
        o.id,
        o.created_at,
        o.status,
        o.total,
        o.phone,
        o.address,
        o.payment_method,
        c.username,
        c.displayName
      FROM ordersDB.orders o
      LEFT JOIN customersDB.customers c ON c.id = o.customer_id
      WHERE o.status = ?
      ORDER BY o.id DESC
    `, [status]);

    res.render('admin/orders', { title: 'Quản lý đơn hàng', orders, status });
  } catch (err) {
    console.error('ADMIN ORDERS ERROR:', err);
    res.status(500).send('DB ERROR');
  }
});


// CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
app.post('/admin/orders/:id/status', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '').trim();

  if (!id || !status) return res.status(400).send('Bad request');

  // Nếu chuyển sang shipped thì lưu shipped_at
  if (status === 'shipped') {
    const shippedAt = new Date().toISOString();
    orderDB.run(`UPDATE orders SET status = ?, shipped_at = ? WHERE id = ?`, [status, shippedAt, id], (err) => {
      if (err) {
        console.error('Update order status error:', err);
        return res.status(500).send('DB ERROR');
      }
      res.redirect('/admin/orders?status=pending');
    });
    return;
  }

  // Các status khác
  orderDB.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], (err) => {
    if (err) {
      console.error('Update order status error:', err);
      return res.status(500).send('DB ERROR');
    }
    res.redirect('/admin/orders?status=pending');
  });
});



// ======== QUẢN LÝ KHÁCH HÀNG ========

app.get('/admin/customers', isAdmin, async (req, res) => {
  console.log('>>> ADMIN CUSTOMERS ROUTE HIT');
  try {
    const customers = await dbCustomerAll(`
      SELECT id, username, displayName, phone, address, dob, created_at
      FROM customers
      ORDER BY id DESC
    `);

    res.render('admin/customers', {
      title: 'Danh sách khách hàng',
      customers
    });
  } catch (err) {
    console.error('ADMIN CUSTOMERS ERROR:', err);
    res.status(500).send('DB ERROR');
  }
});


// ==================================
// 13. ADMIN — QUẢN LÝ SẢN PHẨM
// ==================================

// ========== EDIT PRODUCT ROUTES ==========

// console.log('>>> REGISTER EDIT PRODUCT ROUTE');
app.post('/admin/products/edit/:id', isAdmin, upload.array('images[]', 10), (req, res) => {
  console.log('EDIT PAGE OPEN', req.params.id);
  // res.send('OK EDIT');
  const id = Number(req.params.id);
  if (!id) return res.redirect('/admin/products');

  const { name, price, salePrice, shortDesc, description, category, status } = req.body;

  // Normalize variant fields
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

  const colors = normalizeField('variant_color');
  const sizes = normalizeField('variant_size');
  const quantities = normalizeField('variant_quantity');

  // Process uploaded files (replace images if new uploaded, otherwise keep existing)
  const files = req.files || [];
  const uploadedPaths = files.map(f => f.path.replace(/\\/g, '/').replace(/^.*public/, ''));

  // Fetch current product to determine current images
  productDB.get('SELECT images, image FROM products WHERE id = ?', [id], (gErr, row) => {
    if (gErr) return res.redirect('/admin/products');

    let finalImages = [];
    let mainImage = null;

    if (uploadedPaths.length > 0) {
      finalImages = uploadedPaths;
      mainImage = uploadedPaths[0] || null;
    } else if (row) {
      finalImages = row.images ? String(row.images).split(',') : [];
      mainImage = row.image || (finalImages[0] || null);
    }

    const colorsStr = Array.isArray(colors) ? colors.join(',') : (colors || '');

    productDB.run(`UPDATE products SET name = ?, shortDescription = ?, description = ?, price = ?, salePrice = ?, category = ?, status = ?, colors = ?, image = ?, images = ? WHERE id = ?`,
      [
        name,
        shortDesc,
        description,
        Number(price || 0),
        Number(salePrice || 0),
        category,
        status || 'normal',
        colorsStr,
        mainImage,
        finalImages.join(','),
        id
      ], function (uErr) {
        if (uErr) {
          console.error('Error updating product:', uErr);
          return res.redirect('/admin/products');
        }

        // Replace variants: delete existing, insert provided
        productDB.serialize(() => {
          productDB.run('DELETE FROM product_quantity WHERE product_id = ?', [id], (dErr) => {
            if (dErr) console.error('Error deleting old variants:', dErr);

            const sqlVariant = `INSERT INTO product_quantity (product_id, color, size, quantity) VALUES (?, ?, ?, ?)`;
            for (let i = 0; i < colors.length; i++) {
              const color = colors[i] || '';
              const size = sizes[i] || '';
              const qty = Number(quantities[i] || 0);
              productDB.run(sqlVariant, [id, color, size, qty], (verr) => {
                if (verr) console.error('Variant insert error (edit):', verr);
              });
            }

            return res.redirect('/admin/products');
          });
        });
      }
    );
  });
});

app.get('/admin/products/edit/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.redirect('/admin/products');

  productDB.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
    if (err || !product) return res.redirect('/admin/products');

    product.images = product.images ? String(product.images).split(',') : [];
    product.colors = product.colors ? String(product.colors).split(',') : [];

    productDB.all('SELECT * FROM product_quantity WHERE product_id = ?', [id], (vErr, variants) => {
      if (vErr) variants = [];
      res.render('admin/edit-product', {
        title: 'Sửa sản phẩm',
        product,
        variants
      });
    });
  });
});

// ========== DELETE PRODUCT ROUTE ==========
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


// ========== LIST PRODUCTS ROUTE ==========
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


app.post("/admin/products/add", isAdmin, upload.array("images[]", 10), (req, res) => {
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
  const mainImage = imagePaths.length > 0 ? imagePaths[0] : null;


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
  });
});
console.log('checkpoint E - admin products add route defined');


// ==================================
// 15. ADMIN — QUẢN LÝ TRẢ HÀNG
// ==================================
console.log('REGISTER /admin/returns ROUTE (REAL)');

app.get('/admin/returns', isAdmin, async (req, res) => {
  const status = String(req.query.status || 'pending');

  try {
    let where = '';

    // pending: đơn đang chờ duyệt hoàn
    if (status === 'pending') {
      where = "(COALESCE(o.return_requested,0)=1 OR o.status='return_requested')";
    }
    // approved: admin đã duyệt => đang hoàn
    else if (status === 'approved') {
      where = "o.status='returning'";
    }
    // rejected: admin từ chối => khóa hoàn
    else if (status === 'rejected') {
      where = "COALESCE(o.return_blocked,0)=1";
    } else {
      where = "(COALESCE(o.return_requested,0)=1 OR o.status='return_requested')";
    }

    const rows = await dbAll(`
      SELECT o.*, c.username, c.displayName
      FROM ordersDB.orders o
      LEFT JOIN customersDB.customers c ON c.id = o.customer_id
      WHERE ${where}
      ORDER BY o.id DESC
    `);

    return res.render('admin/returns', { title: 'Yêu cầu hoàn', rows, status });
  } catch (err) {
    console.error('ADMIN RETURNS ERROR:', err);
    return res.render('admin/returns', { title: 'Yêu cầu hoàn', rows: [], status });
  }
});



app.post('/admin/returns/:orderId/approve', isAdmin, async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!orderId) return res.status(400).send('Invalid orderId');

  try {
    await dbOrderRun(
      `UPDATE orders
       SET status = 'returning',
           return_requested = 0
       WHERE id = ?`,
      [orderId]
    );
    return res.redirect('/admin/returns');
  } catch (e) {
    console.error('APPROVE RETURN ERR:', e);
    return res.status(500).send('DB ERROR');
  }
});

app.post('/admin/returns/:orderId/reject', isAdmin, async (req, res) => {
  const orderId = Number(req.params.orderId);
  if (!orderId) return res.status(400).send('Invalid orderId');

  try {
    await dbOrderRun(
      `UPDATE orders
       SET status = 'done',
           return_requested = 0,
           return_blocked = 1
       WHERE id = ?`,
      [orderId]
    );
    return res.redirect('/admin/returns');
  } catch (e) {
    console.error('REJECT RETURN ERR:', e);
    return res.status(500).send('DB ERROR');
  }
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

// Dev-only: set session to admin for quick UI testing
if (process.env.NODE_ENV !== 'production') {
  app.get('/__debug__/session/admin', (req, res) => {
    req.session.user = {
      id: 'dev-admin',
      username: 'admin',
      displayName: 'Admin (dev)',
      role: 'admin'
    };
    res.send('Session set to admin for testing. <a href="/admin/products">Go to admin products</a>');
  });
}





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
// (module.exports already set near the top)
// Note: listening is performed by start_server.js in development.
// Remove direct app.listen here to avoid double-listen when required.

// server listening is handled by `start_server.js` in development
