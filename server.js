// server.js
const express = require('express');
const path = require('path');
const app = express();

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware để parse dữ liệu từ form
app.use(express.urlencoded({ extended: true }));

// Route chính (trang chủ)
app.get('/', (req, res) => {
  res.render('index', { title: 'Client App Home' });
});

// Chạy server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Client app is running at http://localhost:${PORT}`);
});
