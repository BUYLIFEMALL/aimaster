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
      'X-AIMaster-Dashboard':'1',
      'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});
    res.end(req.method === 'HEAD' ? undefined : html);
  } catch { res.writeHead(503).end('Dashboard unavailable'); }
});
server.on('error', error => {
  if (error.code !== 'EADDRINUSE') throw error;
  // A scheduled check may overlap an already healthy dashboard from this PC.
  const probe = http.get({host:'127.0.0.1',port:3879,path:'/dashboard.html',timeout:2000}, async response => {
    try {
      if (response.statusCode !== 200) throw new Error('Dashboard not healthy');
      if (response.headers['x-aimaster-dashboard'] === '1') {
        response.resume();
        return;
      }
      // Accept an older instance during upgrade only if it serves the same rendered file.
      const expected = await readFile(page);
      const received = [];
      let size = 0;
      for await (const chunk of response) {
        size += chunk.length;
        if (size > expected.length) throw new Error('Unexpected listener');
        received.push(chunk);
      }
      if (!Buffer.concat(received).equals(expected)) throw new Error('Unexpected listener');
    } catch {
      response.destroy();
      process.exitCode = 1;
    }
  });
  probe.on('timeout', () => probe.destroy());
  probe.on('error', () => { process.exitCode = 1; });
});
server.listen(3879,'127.0.0.1');
