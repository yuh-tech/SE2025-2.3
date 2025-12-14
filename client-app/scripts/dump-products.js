const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'database', 'products.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Không thể mở DB:', err.message);
    process.exit(1);
  }
});

db.all('SELECT id, name, image, category FROM products ORDER BY id ASC', (err, rows) => {
  if (err) {
    console.error('Lỗi khi truy vấn products:', err.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('Không có bản ghi nào trong bảng products.');
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }

  db.close();
});
