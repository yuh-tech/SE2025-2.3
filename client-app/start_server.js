const app = require('./server');
const PORT = process.env.PORT || 8080;
console.log('Starting server from start_server.js, PORT=', PORT);
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
