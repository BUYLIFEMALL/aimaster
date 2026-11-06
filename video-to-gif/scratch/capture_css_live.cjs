const path = require('path');
const ownRequire = require('module').createRequire(path.resolve('reverse-prompt/package.json'));
const { chromium } = ownRequire('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const brainDir = 'C:/Users/Administrator/.gemini/antigravity-cli/brain/07fcc352-f8eb-42d2-b89d-e045a6909967';

  // 1. 로그인 페이지
  console.log('Navigating to login...');
  await page.goto('https://cinematic-storyboard-studio.buylife.xyz/login', { waitUntil: 'networkidle' });
  const loginOut = path.join(brainDir, 'css_v119_live_login.png');
  await page.screenshot({ path: loginOut, fullPage: false });
  console.log('CAPTURED_LOGIN:', loginOut);

  // 2. 메인 루트 (미로그인 시 로그인 또는 랜딩)
  console.log('Navigating to root...');
  await page.goto('https://cinematic-storyboard-studio.buylife.xyz/', { waitUntil: 'networkidle' });
  const rootOut = path.join(brainDir, 'css_v119_live_root.png');
  await page.screenshot({ path: rootOut, fullPage: false });
  console.log('CAPTURED_ROOT:', rootOut);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
