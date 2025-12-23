const app = require('./server');
const PORT = process.env.PORT || 3001;
// console.log('REQUIRE SERVER FROM:', path.resolve(__dirname, './server.js')); 
console.log('START_SERVER FILE:', __filename);
console.log('CWD:', process.cwd());

console.log("=== ROUTES ===");
app._router.stack
  .filter(r => r.route)
  .forEach(r => {
    const methods = Object.keys(r.route.methods).join(",").toUpperCase();
    console.log(methods, r.route.path);
  });
console.log("==============");


app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
