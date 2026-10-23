const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { chromium } = ownRequire('playwright');

async function verifyEdgeLogin() {
  const artifactDir = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

  console.log("Launching Microsoft Edge:", edgePath);
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  // 1. 데스크톱 로그인 탭 검수 (1280x800)
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const desktopPage = await desktopContext.newPage();
  console.log("Navigating to https://yt-playlist.buylife.xyz/login (Desktop)...");
  await desktopPage.goto("https://yt-playlist.buylife.xyz/login", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1500);

  const desktopShotPath = path.join(artifactDir, "edge_yt_playlist_login_desktop_v107.png");
  await desktopPage.screenshot({ path: desktopShotPath, fullPage: true });
  console.log("Saved desktop screenshot:", desktopShotPath);

  // 2. 데스크톱 회원가입 탭 검수
  await desktopPage.click('button:has-text("회원가입")');
  await desktopPage.waitForTimeout(600);
  const desktopSignupShotPath = path.join(artifactDir, "edge_yt_playlist_signup_desktop_v107.png");
  await desktopPage.screenshot({ path: desktopSignupShotPath, fullPage: true });
  console.log("Saved desktop signup screenshot:", desktopSignupShotPath);
  await desktopContext.close();

  // 3. 모바일 반응형 검수 (375x667)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  console.log("Navigating to https://yt-playlist.buylife.xyz/login (Mobile)...");
  await mobilePage.goto("https://yt-playlist.buylife.xyz/login", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1500);

  const mobileShotPath = path.join(artifactDir, "edge_yt_playlist_login_mobile_v107.png");
  await mobilePage.screenshot({ path: mobileShotPath, fullPage: true });
  console.log("Saved mobile screenshot:", mobileShotPath);
  await mobileContext.close();

  await browser.close();
  console.log("Edge verification completed successfully!");
}

verifyEdgeLogin().catch(err => {
  console.error("Error during Edge verification:", err);
  process.exit(1);
});
