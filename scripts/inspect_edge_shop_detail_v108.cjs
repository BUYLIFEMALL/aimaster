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

  const targetDomain = 'shop-detail-page.vercel.app';
  const browserCookies = rawCookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: targetDomain,
    path: '/',
    httpOnly: c.options?.httpOnly ?? false,
    secure: true,
    sameSite: 'Lax'
  }));

  console.log("Launching Microsoft Edge with test member session...");
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies(browserCookies);

  const page = await context.newPage();
  const artifactDir = "C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9";

  // 1. /guide 탭 1 (5단계 실전 가이드)
  console.log("Navigating to https://shop-detail-page.vercel.app/guide (Tab 1: Steps)...");
  await page.goto('https://shop-detail-page.vercel.app/guide', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const stepsScreenshot = path.join(artifactDir, "edge_shop_detail_guide_steps_v108.png");
  await page.screenshot({ path: stepsScreenshot, fullPage: true });
  console.log("Guide Steps screenshot saved:", stepsScreenshot);

  // 2. /guide 탭 2 (15대 필수 섹션 가이드) 클릭
  console.log("Switching to Tab 2: Sections...");
  const sectionsTabBtn = await page.$('button:has-text("15대 필수 섹션 상세 가이드")');
  if (sectionsTabBtn) {
    await sectionsTabBtn.click();
    await page.waitForTimeout(1000);
    const sectionsScreenshot = path.join(artifactDir, "edge_shop_detail_guide_sections_v108.png");
    await page.screenshot({ path: sectionsScreenshot, fullPage: true });
    console.log("Guide Sections screenshot saved:", sectionsScreenshot);
  }

  // 3. /guide 탭 3 (셀러 성공 꿀팁 & FAQ) 클릭
  console.log("Switching to Tab 3: FAQ...");
  const faqTabBtn = await page.$('button:has-text("셀러 성공 꿀팁 & FAQ")');
  if (faqTabBtn) {
    await faqTabBtn.click();
    await page.waitForTimeout(1000);
    const faqScreenshot = path.join(artifactDir, "edge_shop_detail_guide_faq_v108.png");
    await page.screenshot({ path: faqScreenshot, fullPage: true });
    console.log("Guide FAQ screenshot saved:", faqScreenshot);
  }

  // 4. 모바일 뷰 캡처 (375x812)
  await page.setViewportSize({ width: 375, height: 812 });
  console.log("Navigating to https://shop-detail-page.vercel.app/guide (Mobile)...");
  // 탭 1로 다시 전환
  const stepsTabBtn = await page.$('button:has-text("5단계 완벽 실전 가이드")');
  if (stepsTabBtn) {
    await stepsTabBtn.click();
    await page.waitForTimeout(1000);
  }
  const mobileScreenshot = path.join(artifactDir, "edge_shop_detail_guide_mobile_v108.png");
  await page.screenshot({ path: mobileScreenshot, fullPage: true });
  console.log("Guide Mobile screenshot saved:", mobileScreenshot);

  await browser.close();
  console.log("Edge browser inspection complete for shop-detail-page v1.08 Guide!");
}

main().catch(err => {
  console.error("Auth test error:", err);
  process.exit(1);
});
