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

  const targetDomain = 'music-rho-virid-22.vercel.app';
  const browserCookies = rawCookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: targetDomain,
    path: '/',
    httpOnly: c.options?.httpOnly ?? false,
    secure: true,
    sameSite: 'Lax'
  }));

  console.log("Launching Microsoft Edge (msedge.exe) for inspection...");
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  const artifactDir = "C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

  // 1. 데스크톱 검수 (1440x900)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  await context.addCookies(browserCookies);
  const page = await context.newPage();

  console.log("Navigating to https://music-rho-virid-22.vercel.app/guide...");
  await page.goto("https://music-rho-virid-22.vercel.app/guide", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 탭 1 캡처 (4단계 가이드 & 사이드바 메뉴/계정 확인)
  const cap1 = path.join(artifactDir, "edge_music_guide_steps_v108.png");
  await page.screenshot({ path: cap1 });
  console.log("Saved:", cap1);

  // 탭 2 클릭 (스타일 & 메타 태그 비법)
  console.log("Clicking Tab 2: 스타일 & 메타 태그...");
  const tab2Btn = await page.locator("button:has-text('Suno 스타일')");
  if (await tab2Btn.count() > 0) {
    await tab2Btn.click();
    await page.waitForTimeout(800);
    const cap2 = path.join(artifactDir, "edge_music_guide_styles_v108.png");
    await page.screenshot({ path: cap2 });
    console.log("Saved:", cap2);
  }

  // 탭 3 클릭 (사운드 꿀팁 & FAQ)
  console.log("Clicking Tab 3: 사운드 꿀팁 & FAQ...");
  const tab3Btn = await page.locator("button:has-text('사운드 꿀팁')");
  if (await tab3Btn.count() > 0) {
    await tab3Btn.click();
    await page.waitForTimeout(800);
    const cap3 = path.join(artifactDir, "edge_music_guide_faq_v108.png");
    await page.screenshot({ path: cap3 });
    console.log("Saved:", cap3);
  }

  await context.close();

  // 2. 모바일 검수 (375x812)
  console.log("Testing mobile responsiveness (375x812)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true
  });
  await mobileContext.addCookies(browserCookies);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("https://music-rho-virid-22.vercel.app/guide", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1500);

  const capMobile = path.join(artifactDir, "edge_music_guide_mobile_v108.png");
  await mobilePage.screenshot({ path: capMobile });
  console.log("Saved:", capMobile);

  await mobileContext.close();
  await browser.close();
  console.log("Edge verification completed successfully!");
}

main().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
