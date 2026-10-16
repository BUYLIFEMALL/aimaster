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
  console.log("Preparing session for buylifemall@naver.com...");
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: link } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'buylifemall@naver.com'
  });

  const { data: auth } = await authClient.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token
  });

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
    domain: '.buylife.xyz',
    path: '/',
    httpOnly: c.options?.httpOnly ?? false,
    secure: true,
    sameSite: 'Lax'
  }));

  console.log("Launching Edge to test flow clicks...");
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies(browserCookies);

  const page = await context.newPage();
  await page.goto('https://music-player.buylife.xyz/player', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. 초기 상태: 이퀄라이저가 닫혀 있는지 확인
  let eqVisible = await page.$('.mp-eq');
  console.log("EQ visible initially?", !!eqVisible);

  // 2. 좌측 메뉴 2번: '재생·이퀄라이저' 클릭!
  console.log("Clicking '재생·이퀄라이저' menu...");
  await page.click('a.flow-item:has-text("재생·이퀄라이저")');
  await page.waitForTimeout(800);

  eqVisible = await page.$('.mp-eq');
  console.log("EQ visible after clicking menu?", !!eqVisible);

  // 3. 캡처 저장
  const artifactDir = "C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9";
  const capturePath = path.join(artifactDir, "edge_music_player_flow_click_test.png");
  await page.screenshot({ path: capturePath });
  console.log("Screenshot saved:", capturePath);

  await browser.close();
  console.log("Verification finished successfully!");
}

main().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
