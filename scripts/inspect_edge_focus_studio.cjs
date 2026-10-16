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
  console.log("Navigating to http://localhost:3088/dashboard with auth cookies...");
  await page.goto('http://localhost:3088/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const screenshotPath = "C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_focus_studio_dashboard.png";
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log("Authenticated Dashboard screenshot saved:", screenshotPath);

  // 모바일 뷰 캡처
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(800);
  const mobileScreenshotPath = "C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_focus_studio_mobile.png";
  await page.screenshot({ path: mobileScreenshotPath, fullPage: true });
  console.log("Mobile screenshot saved:", mobileScreenshotPath);

  await browser.close();
}

main().catch(err => {
  console.error("Auth test error:", err);
  process.exit(1);
});
