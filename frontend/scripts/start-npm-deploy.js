/**
 * Mode deploy: hanya Node.js + SQLite (Express di server.js).
 * Tidak mencoba menjalankan binary backend Rust.
 *
 * Jalankan dari folder frontend:
 *   npm run deploy
 *
 * Atau dari root repo:
 *   npm start
 */
const path = require('path');

process.env.MBG_AUTO_START_RUST = 'false';

require(path.join(__dirname, '..', 'server.js'));
