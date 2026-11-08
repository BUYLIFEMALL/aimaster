const path = require('path');
const root = path.resolve(__dirname, '..');
const ownRequire = require('module').createRequire(path.join(root, '../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 700, height: 400 } });
  const htmlPath = 'file:///' + path.join(__dirname, 'banana_logo_v2.html').replace(/\\/g, '/');
  await page.goto(htmlPath);
  const outPath = path.join('C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\07fcc352-f8eb-42d2-b89d-e045a6909967', 'banana_logo_v2_result.png');
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log('CAPTURED_SUCCESS:', outPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
