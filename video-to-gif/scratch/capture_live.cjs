const path = require('path');
const ownRequire = require('module').createRequire(path.join(__dirname, '../../reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // 1. 메인 랜딩
  console.log('Navigating to main landing...');
  await page.goto('https://video-to-gif.buylife.xyz', { waitUntil: 'networkidle' });
  const mainOut = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\07fcc352-f8eb-42d2-b89d-e045a6909967\\vtg_v127_live_main.png';
  await page.screenshot({ path: mainOut, fullPage: false });
  console.log('CAPTURED_MAIN:', mainOut);

  // 2. 대시보드 (스튜디오 작업대)
  console.log('Navigating to dashboard...');
  await page.goto('https://video-to-gif.buylife.xyz/dashboard', { waitUntil: 'networkidle' });
  const dashOut = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\07fcc352-f8eb-42d2-b89d-e045a6909967\\vtg_v127_live_dashboard.png';
  await page.screenshot({ path: dashOut, fullPage: false });
  console.log('CAPTURED_DASHBOARD:', dashOut);

  // 3. 로그인 페이지
  console.log('Navigating to login...');
  await page.goto('https://video-to-gif.buylife.xyz/login', { waitUntil: 'networkidle' });
  const loginOut = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\07fcc352-f8eb-42d2-b89d-e045a6909967\\vtg_v127_live_login.png';
  await page.screenshot({ path: loginOut, fullPage: false });
  console.log('CAPTURED_LOGIN:', loginOut);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
