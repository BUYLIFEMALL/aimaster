const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { chromium } = ownRequire('playwright');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('Launching Microsoft Edge from:', edgePath);
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  // 1. Desktop 1440x900
  const contextDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const pageDesktop = await contextDesktop.newPage();

  console.log('Navigating to https://markdown-studio.buylife.xyz/login...');
  await pageDesktop.goto('https://markdown-studio.buylife.xyz/login', { waitUntil: 'networkidle' });
  await pageDesktop.waitForTimeout(1000);

  // Capture Desktop Login Tab
  const desktopLoginCap = path.join(artifactDir, 'edge_md_login_desktop_v111.png');
  await pageDesktop.screenshot({ path: desktopLoginCap });
  console.log('Captured:', desktopLoginCap);

  // Click Signup Tab
  console.log('Clicking 회원가입 tab...');
  await pageDesktop.click('button:has-text("회원가입")');
  await pageDesktop.waitForTimeout(600);

  // Capture Desktop Signup Tab
  const desktopSignupCap = path.join(artifactDir, 'edge_md_signup_desktop_v111.png');
  await pageDesktop.screenshot({ path: desktopSignupCap });
  console.log('Captured:', desktopSignupCap);

  await contextDesktop.close();

  // 2. Mobile 390x844
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const pageMobile = await contextMobile.newPage();

  await pageMobile.goto('https://markdown-studio.buylife.xyz/login', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1000);

  const mobileLoginCap = path.join(artifactDir, 'edge_md_login_mobile_v111.png');
  await pageMobile.screenshot({ path: mobileLoginCap });
  console.log('Captured:', mobileLoginCap);

  await contextMobile.close();
  await browser.close();
  console.log('All Edge verifications completed successfully!');
}

main().catch(err => {
  console.error('Edge verification failed:', err);
  process.exit(1);
});
