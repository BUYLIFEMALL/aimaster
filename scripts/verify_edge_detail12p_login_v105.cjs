const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { chromium } = ownRequire('playwright');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';
const targetUrl = 'https://detail-12p.buylife.xyz/login';

async function main() {
  console.log('Launching Microsoft Edge from:', edgePath);
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  try {
    // 1. 데스크톱 로그인 화면
    const contextDesktop = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    const pageDesktop = await contextDesktop.newPage();
    console.log('Navigating desktop to:', targetUrl);
    await pageDesktop.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await pageDesktop.waitForTimeout(1000);

    const shot1 = path.join(artifactDir, 'edge_detail12p_login_desktop_v105.png');
    await pageDesktop.screenshot({ path: shot1, fullPage: false });
    console.log('Saved:', shot1);

    // 2. 회원가입 탭 클릭
    const signupBtn = pageDesktop.getByRole('button', { name: '회원가입', exact: true });
    await signupBtn.click();
    await pageDesktop.waitForTimeout(800);

    const shot2 = path.join(artifactDir, 'edge_detail12p_signup_desktop_v105.png');
    await pageDesktop.screenshot({ path: shot2, fullPage: false });
    console.log('Saved:', shot2);
    await contextDesktop.close();

    // 3. 모바일 화면 (390x844)
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true
    });
    const pageMobile = await contextMobile.newPage();
    console.log('Navigating mobile to:', targetUrl);
    await pageMobile.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await pageMobile.waitForTimeout(1000);

    const shot3 = path.join(artifactDir, 'edge_detail12p_login_mobile_v105.png');
    await pageMobile.screenshot({ path: shot3, fullPage: false });
    console.log('Saved:', shot3);
    await contextMobile.close();

    console.log('All Edge verifications completed successfully!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
