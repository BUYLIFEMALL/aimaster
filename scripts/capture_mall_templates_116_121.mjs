import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

const baseDir = 'D:/Antigravity/Design';
const PORT = 3802;

const templates = [
  { id: '116', slug: '116_editorial_magazine_mall' },
  { id: '117', slug: '117_minimal_showroom_mall' },
  { id: '118', slug: '118_street_night_dark_mall' },
  { id: '119', slug: '119_kids_toy_playworld_mall' },
  { id: '120', slug: '120_digital_tech_device_mall' },
  { id: '121', slug: '121_wholesale_catalog_b2b_mall' }
];

// Simple static server for D:/Antigravity/Design
const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/mall_templates_index.html';
  const filePath = path.join(baseDir, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    let mime = 'text/html';
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.css') mime = 'text/css';
    else if (ext === '.js') mime = 'application/javascript';

    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`Static server running at http://localhost:${PORT}`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    for (const tpl of templates) {
      const tplDir = path.join(baseDir, tpl.slug);
      const views = [
        { file: 'view_c1_s1.html', out: '01_main.png', width: 1440, height: 900 },
        { file: 'view_c1_s2.html', out: '02_detail.png', width: 1440, height: 900 },
        { file: 'view_c1_s3.html', out: '03_list.png', width: 1440, height: 900 },
        { file: 'view_c1_s4.html', out: '04_builder.png', width: 1440, height: 900 }
      ];

      for (const v of views) {
        const url = `http://localhost:${PORT}/${tpl.slug}/${v.file}`;
        console.log(`- 캡처 중: ${tpl.slug} / ${v.file}`);
        await page.setViewportSize({ width: v.width, height: v.height });
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForTimeout(500);

        const outPath = path.join(tplDir, v.out);
        await page.screenshot({ path: outPath, fullPage: false });
      }
    }

    // Capture index page preview
    console.log(`- 캡처 중: mall_templates_index.html`);
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto(`http://localhost:${PORT}/mall_templates_index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(baseDir, 'mall_templates_index.png'), fullPage: true });

    await browser.close();
    console.log('✅ All screenshots captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    server.close();
  }
});
