const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '..');
const ownRequire = createRequire(path.join(root, 'blog-content-maker/package.json'));
const { chromium } = ownRequire('playwright');
const { createClient } = ownRequire('@supabase/supabase-js');
const { createServerClient } = ownRequire('@supabase/ssr');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const platform = readEnv(path.join(root, '.env.local'));
const url = platform.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = platform.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || platform.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serverKey = platform.SUPABASE_SECRET_KEY?.trim() || platform.SUPABASE_SERVICE_ROLE_KEY?.trim();

async function main() {
  console.log("Preparing authenticated session for buylifemall@naver.com...");
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'buylifemall@naver.com'
  });
  if (linkError) throw linkError;

  const { data: auth, error: otpError } = await authClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token
  });
  if (otpError) throw otpError;

  const rawCookies = [];
  const ssr = createServerClient(url, publicKey, {
    cookies: {
      getAll: () => [],
      setAll: vals => rawCookies.push(...vals)
    }
  });
  await ssr.auth.setSession(auth.session);

  const browserCookies = rawCookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: 'localhost',
    path: '/',
    httpOnly: c.options?.httpOnly ?? false,
    secure: false,
    sameSite: 'Lax'
  }));

  console.log("Launching Microsoft Edge with test member session...");
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies(browserCookies);

  const page = await context.newPage();

  // 1. 플레이어 화면 (/player)
  console.log("Navigating to http://localhost:3021/player with auth cookies...");
  await page.goto('http://localhost:3021/player', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 이퀄라이저 열기 테스트
  try {
    const eqBtn = await page.$('button:has-text("이퀄라이저")');
    if (eqBtn) {
      await eqBtn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log("Could not toggle EQ:", e);
  }

  const artifactDir = "C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9";
  const playerScreenshot = path.join(artifactDir, "edge_music_player_desktop.png");
  await page.screenshot({ path: playerScreenshot, fullPage: true });
  console.log("Authenticated Player screenshot saved:", playerScreenshot);

  // 모바일 뷰 캡처 (/player)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(800);
  const playerMobileScreenshot = path.join(artifactDir, "edge_music_player_mobile.png");
  await page.screenshot({ path: playerMobileScreenshot, fullPage: true });
  console.log("Mobile player screenshot saved:", playerMobileScreenshot);

  // 2. 매뉴얼 가이드 화면 (/guide)
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log("Navigating to http://localhost:3021/guide with auth cookies...");
  await page.goto('http://localhost:3021/guide', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const guideScreenshot = path.join(artifactDir, "edge_music_player_guide.png");
  await page.screenshot({ path: guideScreenshot, fullPage: true });
  console.log("Authenticated Guide screenshot saved:", guideScreenshot);

  // 가이드 모바일 뷰 캡처 (/guide)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(800);
  const guideMobileScreenshot = path.join(artifactDir, "edge_music_player_guide_mobile.png");
  await page.screenshot({ path: guideMobileScreenshot, fullPage: true });
  console.log("Mobile guide screenshot saved:", guideMobileScreenshot);

  await browser.close();
  console.log("Edge browser inspection complete!");
}

main().catch(err => {
  console.error("Auth test error:", err);
  process.exit(1);
});
