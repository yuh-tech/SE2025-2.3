require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// Middleware truyền biến cho tất cả EJS
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  next();
});

// ===== Demo database =====
const demoUsers = [
  { username: 'admin', password: '123456', displayName: 'Admin' },
  { username: 'minhhang', password: '123456', displayName: 'Hằng Minh' }
];

const demoProducts = [
  { id: 1, name: 'Áo Phao', price: 250000, image: '/images/ao_phap_nu.png' },
  { id: 2, name: 'Quần Jean', price: 350000, image: '/images/quan_jean.png' },
  { id: 3, name: 'Váy ', price: 300000, image: '/images/vay.png' },
  { id: 4, name: 'Giày Sneakers', price: 450000, image: '/images/giay.png' },
];

// ===== Routes =====

// Trang chủ
app.get(['/','/home'], (req, res) => {
  res.render('home', { title: 'Trang chủ', products: demoProducts });
});

// Login form
app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Đăng nhập',
    error: null,    // không có lỗi ban đầu
    success: null   // không có thông báo thành công ban đầu
  });
});


// Login xử lý
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = demoUsers.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = user;
    req.session.cart = req.session.cart || [];

    res.redirect('/home');
  } else {
    res.render('login', {
      title: 'Đăng nhập',
      error: 'Sai username hoặc password', // hiển thị thông báo lỗi
      success: null
    });
  }
});

// GET /signup
app.get('/signup', (req, res) => {
  res.render('signup', {
    title: 'Đăng ký',
    error: null,
    success: null
  });
});


// POST /signup
app.post('/signup', (req, res) => {
  const { username, displayName, password, confirmPassword } = req.body;

  // Kiểm tra trùng username
  if (demoUsers.some(u => u.username === username)) {
    return res.render('signup', { title: 'Đăng ký', error: 'Username đã tồn tại', success: null });
  }

  // Kiểm tra mật khẩu
  if (password !== confirmPassword) {
    return res.render('signup', { title: 'Đăng ký', error: 'Mật khẩu không khớp', success: null });
  }

  // Tạo user mới
  const newUser = { username, displayName, password };
  demoUsers.push(newUser);

  res.render('signup', { title: 'Đăng ký', error: null, success: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.' });
});


// Logout
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Products page
app.get('/products', (req, res) => {
  res.render('products', { title: 'Sản phẩm', products: demoProducts });
});

// Cart page
app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { title: 'Giỏ hàng', cart });
});

// Add to cart
app.post('/cart/add/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = demoProducts.find(p => p.id === productId);
  if (!product) return res.redirect('/products');

  req.session.cart = req.session.cart || [];
  req.session.cart.push(product);

  res.redirect('/cart');
});

// ===== Server start =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
