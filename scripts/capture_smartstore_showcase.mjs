import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

// 간단한 정적 파일 서버
const baseDir = 'D:/Antigravity/Design';
const PORT = 3800;

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/showcase.html';
  const filePath = path.join(baseDir, reqPath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
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
  else if (filePath.endsWith('.jpg')) contentType = 'image/jpeg';
  else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, async () => {
  console.log(`Design static server running on http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1200 },
      deviceScaleFactor: 1
    });

    // 1. 전체 쇼케이스 페이지 캡처
    console.log('Capturing showcase.html...');
    await page.goto(`http://localhost:${PORT}/showcase.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const showcaseDest = 'D:/Antigravity/Design/110_naver_smartstore_green_seller_studio/smartstore_showcase_full_12views.png';
    const brainDest = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/a67f629f-d03a-46fa-862d-af20f371e189/smartstore_showcase_full.png';
    await page.screenshot({ path: showcaseDest, fullPage: true });
    await page.screenshot({ path: brainDest, fullPage: true });
    console.log('Saved showcase screenshot to:', showcaseDest);

    // 2. 1안 4대 화면 개별 1440px 캡처
    const c1Dir = 'D:/Antigravity/Design/110_naver_smartstore_green_seller_studio/smartstore-register';
    const screens = [
      { file: 'view_c1_s1.html', out: '01_main.png', brainOut: '01_smartstore_main_studio.png' },
      { file: 'view_c1_s2.html', out: '02_detail.png', brainOut: '02_smartstore_detail_inspect.png' },
      { file: 'view_c1_s3.html', out: '03_guide.png', brainOut: '03_smartstore_seller_guide.png' },
      { file: 'view_c1_s4.html', out: '04_settings.png', brainOut: '04_smartstore_settings_defaults.png' },
    ];

    await page.setViewportSize({ width: 1440, height: 900 });

    for (const s of screens) {
      console.log(`Capturing ${s.file}...`);
      await page.goto(`http://localhost:${PORT}/110_naver_smartstore_green_seller_studio/smartstore-register/${s.file}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(c1Dir, s.out), fullPage: true });
      await page.screenshot({ path: `C:/Users/Administrator/.gemini/antigravity-cli/brain/a67f629f-d03a-46fa-862d-af20f371e189/${s.brainOut}`, fullPage: true });
    }

    // 3. 비교 매트릭스 표 캡처
    console.log('Capturing comparison.html...');
    await page.goto(`http://localhost:${PORT}/comparison.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const compDest = 'D:/Antigravity/Design/110_naver_smartstore_green_seller_studio/smartstore_comparison_matrix.png';
    const compBrain = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/a67f629f-d03a-46fa-862d-af20f371e189/smartstore_comparison_matrix.png';
    await page.screenshot({ path: compDest, fullPage: true });
    await page.screenshot({ path: compBrain, fullPage: true });

    console.log('All screenshots captured successfully!');
    await browser.close();
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
