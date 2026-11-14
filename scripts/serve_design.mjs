import http from 'http';
import fs from 'fs';
import path from 'path';

const baseDir = 'D:/Antigravity/Design';
const PORT = 3800;

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/showcase.html';
  const filePath = path.join(baseDir, reqPath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    res.writeHead(403);
    res.end('Directory listing forbidden');
    return;
  }

  let contentType = 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) contentType = 'text/css';
  else if (filePath.endsWith('.js')) contentType = 'application/javascript';
  else if (filePath.endsWith('.png')) contentType = 'image/png';
  else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Design showcase server is LIVE on http://localhost:${PORT}/showcase.html`);
});
