const path = require('path'); // khai báo path đầu tiên
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // dùng path ngay sau đó

const express = require('express');
const session = require('express-session');
const fs = require('fs');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/customers.db');

const app = express();
const PORT = process.env.PORT || 3000;


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

// Hiển thị form đăng nhập
app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Đăng nhập',
    error: null
  });
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
  const category = req.query.category || 'all';
  const search = req.query.search || '';

  let products = [...allProducts];
  if (category !== 'all') {
    products = products.filter((p) => p.category === category);
  }
  if (search) {
    products = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }

  const categories = ['all', ...new Set(allProducts.map((p) => p.category))];

  res.render('products', {
    title: 'Tất cả sản phẩm',
    products,
    categories
  });
});

// ----- PRODUCT DETAIL -----
app.get('/product/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = allProducts.find((p) => p.id === id);

  if (!product) return res.send('<h1>404 - Không tìm thấy sản phẩm</h1><a href="/">Quay lại</a>');

  const productReviews = reviews.filter((r) => r.productId === id);

  res.render('product', {
    title: product.name,
    product,
    reviews: productReviews
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

app.post('/admin/products/add', isAdmin, (req, res) => {
  const { name, price, image, category, description } = req.body;

  const newProduct = {
    id: Date.now(),
    name,
    price: parseInt(price),
    image: image || '/images/default.png',
    category,
    description
  };

  allProducts.push(newProduct);
  res.redirect('/admin/products');
});

// ==================================
// 13. ADMIN — QUẢN LÝ SẢN PHẨM
// ==================================
app.get('/admin/products', isAdmin, (req, res) => {
  res.render('admin/products', {
    title: 'Quản lý sản phẩm',
    products: allProducts
  });
});

app.post('/admin/products/add', isAdmin, (req, res) => {
  const { name, price, image, category } = req.body;

  allProducts.push({
    id: Date.now(),
    name,
    price: Number(price),
    image: image || '/images/default.png',
    category
  });

  saveJSON(productsPath, allProducts);
  res.redirect('/admin/products');
});

app.post('/admin/products/delete/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  allProducts = allProducts.filter((p) => p.id !== id);
  saveJSON(productsPath, allProducts);
  res.redirect('/admin/products');
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
