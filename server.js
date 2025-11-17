// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');

const app = express();

// ===== Cấu hình =====
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-prod';

// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // cho CSS, JS, img

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // đổi thành true nếu dùng HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 1 ngày
  }
}));

// Luôn có user trong template
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.error = null;
  res.locals.success = null;
  next();
});

// ===== EJS =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== File users.json =====
const USERS_FILE = path.join(__dirname, 'users.json');

async function initUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, '[]');
  }
}
initUsersFile();

// ===== Helper: users =====
async function getUsers() {
  const data = await fs.readFile(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// ===== Validation =====
const validateUsername = (u) => typeof u === 'string' && u.length >= 3 && /^[a-zA-Z0-9_]+$/.test(u);
const validatePassword = (p) => typeof p === 'string' && p.length >= 6;

// ===== Routes =====

// Trang chủ
app.get('/', (req, res) => {
  res.render('index', { title: 'Client App - Trang chủ' });
});

// Đăng ký
app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Đăng ký', error: null });
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!validateUsername(username)) {
    return res.render('signup', { title: 'Đăng ký', error: 'Tên đăng nhập: 3+ ký tự, chỉ a-z, 0-9, _' });
  }
  if (!validatePassword(password)) {
    return res.render('signup', { title: 'Đăng ký', error: 'Mật khẩu ít nhất 6 ký tự' });
  }

  const users = await getUsers();
  if (users.some(u => u.username === username)) {
    return res.render('signup', { title: 'Đăng ký', error: 'Tên đăng nhập đã tồn tại' });
  }

  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  await saveUsers(users);

  res.render('signup', { title: 'Đăng ký', success: 'Đăng ký thành công! Hãy đăng nhập.' });
});

// Đăng nhập
app.get('/login', (req, res) => {
  res.render('login', { title: 'Đăng nhập', error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await getUsers();

  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { title: 'Đăng nhập', error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }

  req.session.user = username;
  res.redirect(303, '/settings');
});

// Cài đặt
app.get('/settings', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('settings', { title: 'Cài đặt' });
});

// Đổi mật khẩu
app.get('/changepassword', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('changepassword', { title: 'Đổi mật khẩu', error: null, success: null });
});

app.post('/changepassword', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { oldPassword, newPassword, confirmPassword } = req.body;
  const users = await getUsers();
  const user = users.find(u => u.username === req.session.user);

  if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
    return res.render('changepassword', { title: 'Đổi mật khẩu', error: 'Mật khẩu cũ không đúng' });
  }

  if (newPassword !== confirmPassword) {
    return res.render('changepassword', { title: 'Đổi mật khẩu', error: 'Mật khẩu mới không khớp' });
  }

  if (!validatePassword(newPassword)) {
    return res.render('changepassword', { title: 'Đổi mật khẩu', error: 'Mật khẩu mới ít nhất 6 ký tự' });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await saveUsers(users);

  res.render('changepassword', { title: 'Đổi mật khẩu', success: 'Đổi mật khẩu thành công!' });
});

// Đăng xuất
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ===== 404 & Error =====
app.use((req, res) => {
  res.status(404).render('error', { title: '404', message: 'Trang không tồn tại' });
});

app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(500).render('error', { title: 'Lỗi', message: 'Có lỗi xảy ra, vui lòng thử lại sau.' });
});

// ===== OAuth Client Routes (chỉ chuyển hướng) =====

// Đăng nhập bằng Google
app.get('/auth/google', (req, res) => {
  const oauthServerUrl = 'http://localhost:4000/authorize'; // ← Thay bằng URL OAuth server của bạn
  const clientId = 'your-google-client-id';                 // ← Thay bằng client_id thật
  const redirectUri = 'http://localhost:3000/auth/callback'; // ← Phải khớp với OAuth server
  const scope = 'openid profile email';
  const state = Math.random().toString(36).substring(7);     // chống CSRF

  const authUrl = `${oauthServerUrl}?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${scope}&` +
    `state=${state}`;

  // Lưu state vào session để kiểm tra sau
  req.session.oauthState = state;

  res.redirect(authUrl);
});

// Đăng nhập bằng Email (nếu OAuth server hỗ trợ)
app.get('/auth/email', (req, res) => {
  const oauthServerUrl = 'http://localhost:4000/authorize';
  const clientId = 'your-email-client-id';
  const redirectUri = 'http://localhost:3000/auth/callback';
  const scope = 'openid email';
  const state = Math.random().toString(36).substring(7);

  const authUrl = `${oauthServerUrl}?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${scope}&` +
    `state=${state}`;

  req.session.oauthState = state;
  res.redirect(authUrl);
});

// Callback từ OAuth server
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // Kiểm tra state chống CSRF
  if (!code || state !== req.session.oauthState) {
    return res.send('Lỗi bảo mật: state không khớp!');
  }

  // Xóa state
  delete req.session.oauthState;

  // === GỌI TOKEN ENDPOINT (bạn không cần code, chỉ cần biết) ===
  // Lúc này OAuth server sẽ trả về access_token, id_token, v.v.
  // Bạn chỉ cần hiển thị thông báo thành công

  // Giả lập: đăng nhập thành công
  req.session.user = 'google_user'; // hoặc lấy từ id_token
  req.session.oauth = { code, state };

  res.redirect('/settings');
});

// ===== Khởi động =====
app.listen(PORT, () => {
  console.log(`Client App đang chạy tại: http://localhost:${PORT}`);
  console.log(`Dừng server: Ctrl+C`);
});