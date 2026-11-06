const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3800;
const BASE_DIR = 'D:/Antigravity/Design';
const SCREENSHOTS_DIR = 'D:/Antigravity/Design/screenshots';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let decodedUrl = req.url.split('?')[0];
  try {
    decodedUrl = decodeURIComponent(decodedUrl);
  } catch (e) {
    // decode fallback
  }

  // 1. 이미지 요청 처리 (요청된 상대 경로 1순위 탐색)
  const baseName = path.basename(decodedUrl);
  if (baseName.endsWith('.png') || baseName.endsWith('.jpg') || baseName.endsWith('.jpeg') || decodedUrl.includes('screenshots/')) {
    const candidatePaths = [
      path.join(BASE_DIR, decodedUrl),
      path.join(SCREENSHOTS_DIR, baseName),
      path.join(BASE_DIR, '24_유튜브_쇼츠_크리에이터_레드_화이트_스튜디오_스타일', baseName),
      path.join(BASE_DIR, '27_다크_사이버_떡상_레이더_콘솔_스타일', baseName),
      path.join(BASE_DIR, '28_클린_에디토리얼_바이럴_스크립트_페이퍼_스타일', baseName),
      path.join(BASE_DIR, '24_쇼츠_팩토리_옐로우_차콜_스타일', baseName),
      path.join(BASE_DIR, '25_헐리우드_다크_사이버_NLE_콘솔_스타일', baseName),
      path.join(BASE_DIR, '26_크리에이터_페이퍼_에디토리얼_미니멀_스타일', baseName),
      path.join('D:/Antigravity/AIMaster/scratch', baseName)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        const ext = path.extname(p).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        });
        fs.createReadStream(p).pipe(res);
        return;
      }
    }
  }

  // 2. HTML 및 일반 파일 서빙
  let filePath = path.join(BASE_DIR, decodedUrl);
  if (decodedUrl === '/' || decodedUrl === '/showcase' || decodedUrl === '/index.html' || decodedUrl === '/showcase.html') {
    filePath = path.join(BASE_DIR, 'showcase.html');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found: ' + decodedUrl);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Robust Design Showcase Server running at http://localhost:${PORT}/`);
});
