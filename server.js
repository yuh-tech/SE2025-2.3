require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key-very-hard-to-guess',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Middleware để biết trang hiện tại
app.use((req, res, next) => {
  res.locals.requestUrl = req.originalUrl;
  next();
});

// Biến toàn cục cho EJS
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  next();
});

// ===== Demo Users =====
const demoUsers = [
  { username: 'admin', password: '123456', displayName: 'Admin' },
  { username: 'minhhang', password: '123456', displayName: 'Hằng Minh' }
];

// ===== Load Products =====
let allProducts = [];
const productsPath = path.join(__dirname, 'products.json');
if (fs.existsSync(productsPath)) {
  try {
    const data = fs.readFileSync(productsPath, 'utf8');
    allProducts = JSON.parse(data);
  } catch (err) {
    console.error('Lỗi đọc file products.json:', err.message);
  }
}

const demoProducts = [
  { id: 101, name: 'Áo Phao Nữ', price: 450000, image: '/images/ao_phap_nu.png', category: 'Áo khoác' },
  { id: 102, name: 'Quần Jean Ống Suông', price: 380000, image: '/images/quan_jean.png', category: 'Quần' },
  { id: 103, name: 'Váy Xòe Hoa', price: 320000, image: '/images/vay.png', category: 'Váy' },
  { id: 104, name: 'Giày Sneakers Trắng', price: 650000, image: '/images/giay.png', category: 'Giày' },
];
allProducts = [...demoProducts, ...allProducts];

// ===== EJS =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== ROUTES =====
app.get(['/', '/home'], (req, res) => {
  res.render('home', {
    title: 'Sunshine Boutique – Thời trang nhẹ nhàng',
    products: allProducts
  });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Đăng nhập', error: null, success: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = demoUsers.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = { username: user.username, displayName: user.displayName };
    req.session.cart = req.session.cart || [];
    return res.redirect(req.query.redirect || '/home');
  }

  res.render('login', { title: 'Đăng nhập', error: 'Tên đăng nhập hoặc mật khẩu không đúng!', success: null });
});

app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Đăng ký', error: null, success: null });
});

app.post('/signup', (req, res) => {
  const { username, displayName, password, confirmPassword } = req.body;

  if (demoUsers.some(u => u.username === username)) {
    return res.render('signup', { title: 'Đăng ký', error: 'Tên đăng nhập đã tồn tại!', success: null });
  }
  if (password !== confirmPassword) {
    return res.render('signup', { title: 'Đăng ký', error: 'Mật khẩu xác nhận không khớp!', success: null });
  }

  demoUsers.push({ username, password, displayName });
  res.render('signup', { title: 'Đăng ký', error: null, success: 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/products', (req, res) => {
  const category = req.query.category || 'all';
  const search = req.query.search || '';
  const sort = req.query.sort || '';
  const min = Number(req.query.min) || 0;
  const max = Number(req.query.max) || Infinity;

  let products = [...allProducts];
  if (category !== 'all') products = products.filter(p => p.category === category);
  products = products.filter(p => p.price >= min && p.price <= max);
  if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (sort === 'asc') products.sort((a, b) => a.price - b.price);
  else if (sort === 'desc') products.sort((a, b) => b.price - a.price);

  const categories = ['all', ...new Set(allProducts.map(p => p.category))];

  res.render('products', {
    title: 'Tất cả sản phẩm',
    products,
    categories,
    filters: { category, search, sort, min: min || '', max: max === Infinity ? '' : max }
  });
});

app.get('/product/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = allProducts.find(p => p.id === id);

  if (!product) return res.status(404).send('<h1>404 - Không tìm thấy sản phẩm</h1><a href="/products">Quay lại</a>');

  res.render('product', {
    title: product.name + ' – Sunshine Boutique',
    product: { ...product, rating: product.rating || 4.7 + Math.random() * 0.3, gallery: product.gallery || [] }
  });
});

// ===== GIỎ HÀNG =====
app.get('/cart', (req, res) => {
  res.render('cart', { title: 'Giỏ hàng', cart: req.session.cart || [] });
});

// THÊM VÀO GIỎ – TRẢ VỀ cartCount
app.post('/cart/add/:id', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
  }

  const productId = parseInt(req.params.id);
  const { color, size } = req.body;

  const product = allProducts.find(p => p.id === productId);
  if (!product) return res.status(404).json({ success: false });

  req.session.cart = req.session.cart || [];

  const existingIndex = req.session.cart.findIndex(item =>
    item.id === productId && item.color === color && item.size === size
  );

  if (existingIndex !== -1) {
    req.session.cart[existingIndex].quantity += 1;
  } else {
    req.session.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      color: color,
      size: size,
      quantity: 1
    });
  }

  const cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);

  res.json({ success: true, cartCount });
});

// LẤY SỐ LƯỢNG GIỎ HÀNG CHO HEADER
app.get('/cart/count', (req, res) => {
  const count = req.session.cart
    ? req.session.cart.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  res.json({ count });
});

// Xóa sản phẩm khỏi giỏ
app.post('/cart/remove/:index', (req, res) => {
  const index = Number(req.params.index);
  if (req.session.cart && req.session.cart[index] !== undefined) req.session.cart.splice(index, 1);
  res.json({ success: true });
});

// Cập nhật số lượng
app.post('/cart/update', (req, res) => {
  const { index, quantity } = req.body;
  if (req.session.cart && req.session.cart[index] !== undefined)
    req.session.cart[index].quantity = Number(quantity);
  res.json({ success: true });
});

// ===== Khởi động server =====
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});