const path = require('path'); // khai báo path đầu tiên
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // dùng path ngay sau đó


const slugify = require('slugify');
const fs = require('fs');
const crypto = require('crypto');

const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Tạo folder theo tên sản phẩm (slug không dấu)
    const slug = req.body.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w\-]+/g, '');
    const dir = `./public/uploads/${slug}`;
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
  productDB.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price INTEGER,
      salePrice INTEGER DEFAULT 0,
      image TEXT,
      category TEXT,
      description TEXT,
      status TEXT CHECK(status IN ('normal', 'sale', 'hidden')) DEFAULT 'normal'
    )
  `);

  productDB.run(`
    CREATE TABLE IF NOT EXISTS product_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      size TEXT,
      quantity INTEGER,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);

  productDB.run(`
    CREATE TABLE IF NOT EXISTS product_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      color TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
    )
  `);
});


// ==================================
// 1. MIDDLEWARE
// ==================================
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

app.use((req, res, next) => {
  console.log('SESSION ID:', req.sessionID);
  next();
});

// Gửi thông tin user + cart sang EJS
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  next();
});

// ==================================
// 2. PHÂN QUYỀN ADMIN
// ==================================
function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
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
  const query = "SELECT * FROM products";

  productDB.all(query, [], (err, rows) => {
    if (err) return res.send("Lỗi DB");

    const categories = ['all', ...new Set(rows.map(p => p.category))];
    res.render('products', {
      title: 'Tất cả sản phẩm',
      products: rows,
      categories
    });
  });
});


// ----- PRODUCT DETAIL -----
app.get('/product/:id', (req, res) => {
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
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ count: total });
});

// ==================================
// 7. GIỎ HÀNG
// ==================================
app.get('/cart', (req, res) => {
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
    SELECT p.*, 
      GROUP_CONCAT(DISTINCT c.color) AS colors,
      GROUP_CONCAT(s.size || ':' || s.quantity) AS sizes
    FROM products p
    LEFT JOIN product_colors c ON c.product_id = p.id
    LEFT JOIN product_sizes s ON s.product_id = p.id
    GROUP BY p.id
    ORDER BY p.id DESC
  `;

  productDB.all(sql, [], (err, products) => {
    if (err) return res.send("DB ERROR");

    res.render('admin/products', {
      title: "Quản lý sản phẩm",
      products
    });
  });
});


app.post('/admin/products/add', isAdmin, upload.array('images'), (req, res) => {
  const { name, price, salePrice, category, description, status, colors, sizes_json } = req.body;

  // Lấy array màu sắc
  const colorList = colors ? colors.split(',') : [];

  // Lấy array size + quantity
  let sizeData = [];
  try {
    sizeData = sizes_json ? JSON.parse(sizes_json) : [];
  } catch (e) {
    sizeData = [];
  }

  // Lấy path tất cả ảnh đã upload
  const imagePaths = req.files.map(f => {
    // Lấy đường dẫn relative từ /public
    return f.path.replace(/\\/g, '/').replace(/^public/, '');
  });
  const mainImage = imagePaths[0] || null;

  const sqlProduct = `
    INSERT INTO products (name, price, salePrice, image, category, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  productDB.run(
    sqlProduct,
    [name, price, salePrice || 0, mainImage, category, description, status],
    function (err) {
      if (err) {
        console.error('SQL Lỗi khi thêm product:', err);
        return res.send('Có lỗi SQL!');
      }

      const productId = this.lastID;

      // INSERT COLORS
      colorList.forEach(clr => {
        productDB.run(
          `INSERT INTO product_colors (product_id, color) VALUES (?, ?)`,
          [productId, clr]
        );
      });

      // INSERT SIZES
      sizeData.forEach(row => {
        productDB.run(
          `INSERT INTO product_sizes (product_id, size, quantity) VALUES (?, ?, ?)`,
          [productId, row.size, row.quantity]
        );
      });

      res.redirect('/admin/products');
    }
  );
});

app.post('/admin/products/delete/:id', isAdmin, (req, res) => {
  const productId = Number(req.params.id);

  productDB.serialize(() => {
    // Xoá size
    productDB.run(`DELETE FROM product_sizes WHERE product_id = ?`, [productId]);

    // Xoá màu
    productDB.run(`DELETE FROM product_colors WHERE product_id = ?`, [productId]);

    // Xoá sản phẩm chính
    productDB.run(`DELETE FROM products WHERE id = ?`, [productId], (err) => {
      if (err) return res.send("Lỗi xóa sản phẩm");
      res.redirect('/admin/products');
    });
  });
});


// ==================================
// 14. ADMIN — QUẢN LÝ ĐƠN HÀNG
// ==================================
app.get('/admin/orders', isAdmin, (req, res) => {
  res.render('admin/orders', { title: 'Quản lý đơn hàng', orders });
});

app.post('/admin/orders/update/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;

  const order = orders.find((o) => o.id === id);
  if (!order) return res.send('Không tìm thấy đơn hàng');

  order.status = status;
  order.tracking.push('Cập nhật: ' + status);

  saveJSON(ordersPath, orders);
  res.redirect('/admin/orders');
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

// ==================================
// 16. START SERVER
// ==================================
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
