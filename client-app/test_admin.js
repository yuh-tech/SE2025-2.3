const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/customers.db');

db.get(
  "SELECT * FROM customers WHERE username = ? AND password = ?",
  ['admin', '123456'],
  (err, row) => {
    if (err) console.error(err);
    else console.log(row);
  }
);

db.close();
