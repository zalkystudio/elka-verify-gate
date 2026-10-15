const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'links.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}', 'utf8');

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}'); }
  catch { return {}; }
}
function writeDb(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}
function send(res, status, body, type='application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1000000) { reject(new Error('Request terlalu besar.')); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('JSON tidak valid.')); }
    });
    req.on('error', reject);
  });
}
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
  if (req.method === 'POST' && url.pathname === '/api/links') {
    try {
      const data = await readBody(req);
      if (!String(data.fileName || '').trim()) return send(res, 400, { error: 'Nama file wajib diisi.' });
      let download;
      try { download = new URL(data.finalDownloadUrl); } catch { return send(res, 400, { error: 'URL download tidak valid.' }); }
      if (!['http:', 'https:'].includes(download.protocol)) return send(res, 400, { error: 'URL download harus HTTP/HTTPS.' });
      if (!Array.isArray(data.tasks) || data.tasks.length < 1 || data.tasks.length > 30) return send(res, 400, { error: 'Harus ada 1–30 tugas.' });
      for (const task of data.tasks) {
        let target;
        try { target = new URL(task.url); } catch { return send(res, 400, { error: 'URL salah satu tugas tidak valid.' }); }
        if (!['http:', 'https:'].includes(target.protocol)) return send(res, 400, { error: 'URL tugas harus HTTP/HTTPS.' });
      }
      const db = readDb();
      let id;
      do { id = crypto.randomBytes(8).toString('hex'); } while (db[id]);
      const record = { id, fileName: String(data.fileName).slice(0, 200), fileDescription: String(data.fileDescription || '').slice(0, 1000), finalDownloadUrl: download.href, tasks: data.tasks, createdAt: new Date().toISOString(), views: 0 };
      db[id] = record;
      writeDb(db);
      return send(res, 201, { id });
    } catch (e) { return send(res, 400, { error: e.message || 'Gagal menyimpan link.' }); }
  }
  const match = url.pathname.match(/^\/api\/links\/([a-zA-Z0-9_-]{6,40})$/);
  if (req.method === 'GET' && match) {
    const db = readDb();
    const record = db[match[1]];
    if (!record) return send(res, 404, { error: 'Link tidak ditemukan.' });
    record.views = (record.views || 0) + 1;
    db[match[1]] = record;
    writeDb(db);
    return send(res, 200, record);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method tidak diizinkan.' });
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(PUBLIC, '.' + pathname);
  if (!file.startsWith(PUBLIC + path.sep) && file !== path.join(PUBLIC, 'index.html')) return send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'File tidak ditemukan.', 'text/plain; charset=utf-8');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.listen(PORT, '0.0.0.0', () => console.log(`ELKA Verify Gate berjalan di port ${PORT}`));
