const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const root = path.resolve(__dirname, '..');
const req = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { chromium } = req('playwright');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';
const TARGET_URL = 'https://ai-prompt.buylife.xyz/login';

async function verify() {
  console.log(`[Edge 검수 시작] 타겟: ${TARGET_URL}`);
  
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  // 1. 데스크톱 검수 (1280x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  console.log(`데스크톱 페이지 이동...`);
  await desktopPage.goto(TARGET_URL, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1500);

  const desktopLoginCap = path.join(ARTIFACT_DIR, 'edge_ai_prompt_login_desktop_v106.png');
  await desktopPage.screenshot({ path: desktopLoginCap, fullPage: false });
  console.log(`데스크톱 로그인 탭 캡처 저장: ${desktopLoginCap}`);

  // 회원가입 탭 클릭
  console.log(`회원가입 탭 클릭...`);
  const signupTabBtn = desktopPage.getByRole('button', { name: '회원가입', exact: true });
  await signupTabBtn.click();
  await desktopPage.waitForTimeout(1000);

  const desktopSignupCap = path.join(ARTIFACT_DIR, 'edge_ai_prompt_signup_desktop_v106.png');
  await desktopPage.screenshot({ path: desktopSignupCap, fullPage: false });
  console.log(`데스크톱 회원가입 탭 캡처 저장: ${desktopSignupCap}`);

  await desktopContext.close();

  // 2. 모바일 반응형 검수 (390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log(`모바일 페이지 이동...`);
  await mobilePage.goto(TARGET_URL, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  const mobileLoginCap = path.join(ARTIFACT_DIR, 'edge_ai_prompt_login_mobile_v106.png');
  await mobilePage.screenshot({ path: mobileLoginCap, fullPage: false });
  console.log(`모바일 로그인 탭 캡처 저장: ${mobileLoginCap}`);

  await mobileContext.close();
  await browser.close();

  console.log(`[Edge 검수 완료] 모든 캡처가 성공적으로 생성되었습니다.`);
}

verify().catch((err) => {
  console.error('[검수 실패]', err);
  process.exit(1);
});
