try {
  require('./server.js');
  console.log('server required successfully');
} catch (err) {
  console.error('WRAPPED ERROR:', err && err.stack ? err.stack : err);
  process.exit(1);
}
