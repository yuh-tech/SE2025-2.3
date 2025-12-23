/**
 * Seed products + variants into SQLite: client-app/database/products.db
 * Run:
 *   cd client-app
 *   node scripts/seed_products.js
 *
 * Notes:
 * - This script inserts demo products + product_quantity variants.
 * - It will NOT delete existing data by default (safe mode).
 * - You can set RESET=1 to wipe products + variants first:
 *     RESET=1 node scripts/seed_products.js
 */

const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH = path.join(__dirname, "..", "database", "products.db");

// ---------- Helpers ----------
function openDb(dbPath) {
  return new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error("❌ Cannot open DB:", dbPath, err.message);
      process.exit(1);
    }
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nowISO() {
  return new Date().toISOString();
}

// ---------- Demo Data ----------
const CATEGORIES = ["Áo", "Quần", "Váy", "Áo khoác", "Giày", "Túi", "Phụ kiện"];
const COLORS = ["Đen", "Trắng", "Be", "Hồng", "Xanh", "Xám", "Nâu", "Đỏ"];
const SIZES_CLOTH = ["S", "M", "L", "XL"];
const SIZES_SHOES = ["36", "37", "38", "39", "40"];
const STATUS_POOL = ["normal", "sale"]; // "hidden" nếu bạn muốn

const PRODUCT_TEMPLATES = [
  // Áo
  { name: "Áo thun basic cotton", category: "Áo", basePrice: 189000, desc: "Áo thun cotton mềm, form dễ mặc, hợp đi học/đi làm." },
  { name: "Áo sơ mi trắng công sở", category: "Áo", basePrice: 259000, desc: "Sơ mi thanh lịch, chất vải đứng form, phối quần/váy đều đẹp." },
  { name: "Áo len cổ lọ", category: "Áo", basePrice: 319000, desc: "Áo len ấm áp, co giãn nhẹ, hợp mùa lạnh." },

  // Quần
  { name: "Quần jean ống suông", category: "Quần", basePrice: 389000, desc: "Jean ống suông tôn dáng, dễ phối, hợp mọi dịp." },
  { name: "Quần tây lưng cao", category: "Quần", basePrice: 349000, desc: "Quần tây lưng cao, hack chân, phong cách công sở." },
  { name: "Quần short kaki", category: "Quần", basePrice: 229000, desc: "Short kaki thoáng, đi chơi/du lịch cực hợp." },

  // Váy
  { name: "Váy xòe hoa nhí", category: "Váy", basePrice: 329000, desc: "Váy hoa nhí nữ tính, chất vải nhẹ, lên form xinh." },
  { name: "Váy body midi", category: "Váy", basePrice: 359000, desc: "Váy body tôn dáng, phù hợp đi tiệc/đi chơi." },
  { name: "Chân váy tennis", category: "Váy", basePrice: 279000, desc: "Chân váy năng động, dễ mix áo thun/hoodie." },

  // Áo khoác
  { name: "Áo khoác phao dáng dài", category: "Áo khoác", basePrice: 599000, desc: "Áo phao ấm, chống gió, phù hợp trời lạnh." },
  { name: "Blazer form rộng", category: "Áo khoác", basePrice: 499000, desc: "Blazer form rộng, style Hàn, phối đồ sang." },

  // Giày
  { name: "Sneakers trắng basic", category: "Giày", basePrice: 449000, desc: "Sneakers trắng, đế êm, đi học/đi làm đều ổn." },
  { name: "Giày búp bê", category: "Giày", basePrice: 299000, desc: "Búp bê nhẹ chân, dễ phối váy/quần." },

  // Túi
  { name: "Túi tote canvas", category: "Túi", basePrice: 199000, desc: "Tote canvas tiện dụng, đi học/đi làm." },
  { name: "Túi đeo chéo mini", category: "Túi", basePrice: 249000, desc: "Túi mini xinh, đựng vừa điện thoại + ví." },

  // Phụ kiện
  { name: "Nón bucket", category: "Phụ kiện", basePrice: 149000, desc: "Nón bucket che nắng, style trẻ trung." },
  { name: "Khăn choàng mỏng", category: "Phụ kiện", basePrice: 129000, desc: "Khăn mỏng nhẹ, phối đồ dễ." },
];

// Tạo thêm sản phẩm biến tấu từ template
function buildProducts(count = 40) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const t = pick(PRODUCT_TEMPLATES);

    // biến tấu tên cho đỡ trùng
    const suffix = pick(["", " - New", " - Premium", " - Limited", " - Trend"]);
    const name = `${t.name}${suffix}`.trim();

    // random giá xê dịch
    const price = Math.max(99000, t.basePrice + randInt(-30000, 60000));

    // sale ngẫu nhiên
    const status = pick(STATUS_POOL);
    let salePrice = 0;
    if (status === "sale") {
      const discount = randInt(15000, 70000);
      salePrice = Math.max(50000, price - discount);
    }

    const shortDescription = t.desc;
    const description =
      `${t.desc}\n\n` +
      `• Chất liệu: ${pick(["Cotton", "Kaki", "Jean", "Len", "Canvas", "Da PU", "Poly"])}\n` +
      `• Form: ${pick(["Basic", "Regular", "Oversize", "Slim", "A-line"])}\n` +
      `• Phong cách: ${pick(["Tối giản", "Nữ tính", "Năng động", "Công sở", "Hàn Quốc"])}\n` +
      `• HDSD: Giặt nhẹ, không tẩy mạnh, phơi nơi thoáng mát.\n`;

    // màu list (unique)
    const colorCount = randInt(2, 4);
    const chosenColors = [...new Set(Array.from({ length: colorCount }, () => pick(COLORS)))];

    // Ảnh: để placeholder để bạn tự upload sau (không seed file ảnh)
    // Nếu bạn muốn sau này tự set ảnh thật, sửa lại image/images.
    const image = ""; // hoặc "/images/placeholder.png" nếu bạn có file này
    const images = ""; // "img1,img2" nếu bạn có sẵn

    arr.push({
      name,
      shortDescription,
      description,
      price,
      salePrice,
      category: t.category,
      status,
      createdAt: nowISO(),
      colors: chosenColors, // array
      image,
      images,
    });
  }
  return arr;
}

// Tạo variants theo category
function buildVariants(product) {
  const isShoe = product.category === "Giày";
  const isAccessory = product.category === "Phụ kiện" || product.category === "Túi";

  const sizes = isAccessory ? ["Freesize"] : (isShoe ? SIZES_SHOES : SIZES_CLOTH);

  const variants = [];
  for (const color of product.colors) {
    // phụ kiện/túi thì ít size
    const sizePickCount = isAccessory ? 1 : randInt(2, sizes.length);
    const chosenSizes = [...new Set(Array.from({ length: sizePickCount }, () => pick(sizes)))];

    for (const size of chosenSizes) {
      variants.push({
        color,
        size,
        quantity: randInt(3, 25),
      });
    }
  }
  return variants;
}

// ---------- Main ----------
async function main() {
  const db = openDb(DB_PATH);

  try {
    // check tables exist
    const tbl = await all(db, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('products','product_quantity')");
    const names = tbl.map((x) => x.name);
    if (!names.includes("products") || !names.includes("product_quantity")) {
      console.error("❌ Missing tables products / product_quantity in products.db");
      console.error("👉 Hãy chạy server.js 1 lần để CREATE TABLE trước, rồi seed lại.");
      process.exit(1);
    }

    const reset = String(process.env.RESET || "") === "1";
    if (reset) {
      console.log("⚠️ RESET=1 => wiping products + variants...");
      await run(db, "DELETE FROM product_quantity");
      await run(db, "DELETE FROM products");
    } 

    const products = buildProducts(40);
    console.log("🌱 Seeding products:", products.length);

    for (const p of products) {
      // tránh trùng name
      const existed = await get(db, "SELECT id FROM products WHERE name = ?", [p.name]);
      if (existed?.id) continue;

      const colorsStr = Array.isArray(p.colors) ? p.colors.join(",") : String(p.colors || "");
      const insert = await run(
        db,
        `INSERT INTO products
          (name, shortDescription, description, price, salePrice, category, status, createdAt, colors, image, images)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.name,
          p.shortDescription,
          p.description,
          Number(p.price || 0),
          Number(p.salePrice || 0),
          p.category,
          p.status || "normal",
          p.createdAt || nowISO(),
          colorsStr,
          p.image || "",
          p.images || "",
        ]
      );

      const productId = insert.lastID;

      const variants = buildVariants(p);
      for (const v of variants) {
        await run(
          db,
          `INSERT INTO product_quantity (product_id, color, size, quantity)
           VALUES (?, ?, ?, ?)`,
          [productId, v.color, v.size, Number(v.quantity || 0)]
        );
      }
    }

    const finalCount = await get(db, "SELECT COUNT(*) AS c FROM products");
    console.log("✅ Done. products total =", finalCount?.c || 0);
    console.log("👉 Mở /products hoặc /admin/products để kiểm tra.");
  } catch (e) {
    console.error("❌ Seed error:", e);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
