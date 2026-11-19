import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// This internal dashboard contains project status. Only serve the rendered page on loopback.
const page = path.join(process.env.AIMASTER_CONTROL_ROOT || 'D:/AIMaster-Control/AIMaster', 'dashboard.html');
const server = http.createServer(async (req, res) => {
  if (!['GET','HEAD'].includes(req.method) || !['/','/dashboard.html'].includes(req.url)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const html = await readFile(page);
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});
    res.end(req.method === 'HEAD' ? undefined : html);
  } catch { res.writeHead(503).end('Dashboard unavailable'); }
});
server.listen(3879,'127.0.0.1');
