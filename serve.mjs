// Zero-dependency local preview server. This site is fully static (no
// backend, no build step) but browsers block ES module imports and fetch()
// against file:// pages, so local preview needs *some* HTTP server - this is
// it. Not part of the deployed site itself (GitHub Pages serves the static
// files directly over https, where this isn't needed).
//
// Usage: node serve.mjs   -> http://localhost:5500
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 5500;
const MIME = {
  '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.sbp': 'application/octet-stream', '.sbpcfg': 'application/octet-stream',
};

http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found: ' + reqPath); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Serving at http://localhost:${PORT}/ (Ctrl+C to stop)`));
