const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'database', 'products.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Cannot open DB:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  console.log('--- products ---');
  db.all('SELECT * FROM products ORDER BY id ASC', (err, rows) => {
    if (err) {
      console.error('Error querying products:', err.message);
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }

    console.log('\n--- product_quantity ---');
    db.all('SELECT * FROM product_quantity ORDER BY id ASC', (err2, rows2) => {
      if (err2) {
        console.error('Error querying product_quantity:', err2.message);
      } else {
        console.log(JSON.stringify(rows2, null, 2));
      }

      db.close();
    });
  });
});
