const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker', 'package.json'));
const { chromium } = ownRequire('playwright');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
  console.log('Microsoft Edge 실행 중...');
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const targets = [
    {
      name: 'edge_vinyl_login_desktop_v108.png',
      url: 'https://vinyl-lp.buylife.xyz/login',
      viewport: { width: 1280, height: 800 },
      isMobile: false,
    },
    {
      name: 'edge_vinyl_signup_desktop_v108.png',
      url: 'https://vinyl-lp.buylife.xyz/login',
      viewport: { width: 1280, height: 800 },
      isMobile: false,
      clickSignup: true,
    },
    {
      name: 'edge_vinyl_login_mobile_v108.png',
      url: 'https://vinyl-lp.buylife.xyz/login',
      viewport: { width: 375, height: 667 },
      isMobile: true,
    },
    {
      name: 'edge_vinyl_guide_desktop_v108.png',
      url: 'https://vinyl-lp.buylife.xyz/guide',
      viewport: { width: 1280, height: 900 },
      isMobile: false,
    },
    {
      name: 'edge_vinyl_guide_mobile_v108.png',
      url: 'https://vinyl-lp.buylife.xyz/guide',
      viewport: { width: 375, height: 812 },
      isMobile: true,
    },
  ];

  for (const t of targets) {
    console.log(`[Edge 검수] ${t.name} 캡처 시작: ${t.url}`);
    const context = await browser.newContext({
      viewport: t.viewport,
      isMobile: t.isMobile,
    });
    const page = await context.newPage();
    await page.goto(t.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    if (t.clickSignup) {
      try {
        await page.click('button:has-text("회원가입")');
        await page.waitForTimeout(500);
      } catch (err) {
        console.warn('회원가입 버튼 클릭 실패:', err.message);
      }
    }

    const outPath = path.join(ARTIFACT_DIR, t.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`[Edge 검수] 저장 완료: ${outPath}`);
    await context.close();
  }

  await browser.close();
  console.log('모든 Edge 화면 검수 캡처 완료!');
}

main().catch((err) => {
  console.error('검수 실패:', err);
  process.exit(1);
});
