require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const fs = require('fs').promises;
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true, 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Luôn có user trong template
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== File users.json =====
const USERS_FILE = path.join(__dirname, 'users.json');
(async () => {
  try { await fs.access(USERS_FILE); }
  catch { await fs.writeFile(USERS_FILE, '[]'); }
})();

// ===== Helper =====
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

// ===== Middleware bảo vệ route =====
app.use((req, res, next) => {
  const publicPaths = ['/login', '/signup', '/auth/google', '/auth/email', '/auth/callback'];
  if (!req.session.user && !publicPaths.includes(req.path) && req.path !== '/') {
    return res.redirect('/login');
  }
  next();
});

// ===== Routes =====

// Trang chủ
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('index', { title: 'Client App - Trang chủ' });
});

// Đăng ký
app.get('/signup', (req, res) => res.render('signup', { title: 'Đăng ký', error: null, success: null }));
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!validateUsername(username)) return res.render('signup', { title: 'Đăng ký', error: 'Tên đăng nhập không hợp lệ', success: null });
  if (!validatePassword(password)) return res.render('signup', { title: 'Đăng ký', error: 'Mật khẩu ít nhất 6 ký tự', success: null });

  const users = await getUsers();
  if (users.some(u => u.username === username)) return res.render('signup', { title: 'Đăng ký', error: 'Tên đăng nhập đã tồn tại', success: null });

  users.push({ username, password: await bcrypt.hash(password, 10) });
  await saveUsers(users);
  res.render('signup', { title: 'Đăng ký', error: null, success: 'Đăng ký thành công! Hãy đăng nhập.' });
});

// Đăng nhập
app.get('/login', (req, res) => {
  const success = req.query.msg === 'password_changed' 
    ? 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.' 
    : null;
  res.render('login', { title: 'Đăng nhập', error: null, success });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await getUsers();
  const user = users.find(u => u.username === username);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { title: 'Đăng nhập', error: 'Sai tên đăng nhập hoặc mật khẩu', success: null });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.render('login', { title: 'Đăng nhập', error: 'Sai mật khẩu', success: null });
  }

  req.session.user = username;
  res.redirect('/settings');
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
    return res.render('changepassword', { title: 'Đổi mật khẩu', error: 'Mật khẩu cũ không đúng', success: null });
  }

  if (newPassword !== confirmPassword) {
    return res.render('changepassword', { title: 'Đổi mật khẩu', error: 'Mật khẩu mới không khớp', success: null });
  }

  if (!validatePassword(newPassword)) {
    return res.render('changepassword', { title: 'Đổi mật khẩu', error: 'Mật khẩu mới phải ít nhất 6 ký tự', success: null });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await saveUsers(users);

  req.session.destroy(() => {
    res.redirect('/login?msg=password_changed');
  });
});

// OAuth Routes
app.get('/auth/google', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  req.session.oauthState = state;
  const authUrl = `${process.env.OAUTH_SERVER_URL}/authorize?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&scope=openid profile email&state=${state}`;
  res.redirect(authUrl);
});

app.get('/auth/email', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  req.session.oauthState = state;
  const authUrl = `${process.env.OAUTH_SERVER_URL}/authorize?response_type=code&client_id=${process.env.EMAIL_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&scope=openid email&state=${state}`;
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || state !== req.session.oauthState) {
    return res.send('Lỗi bảo mật: state không khớp!');
  }

  delete req.session.oauthState;
  req.session.user = 'google_user';
  res.redirect('/settings');
});

// 404 & Error handler
app.use((req, res) => res.status(404).render('error', { title: '404', message: 'Trang không tồn tại' }));
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(500).render('error', { title: 'Lỗi', message: 'Có lỗi xảy ra!' });
});

// Khởi động
app.listen(PORT, () => {
  console.log(`Client App đang chạy tại: http://localhost:${PORT}`);
  console.log(`Dừng server: Ctrl+C`);
});
