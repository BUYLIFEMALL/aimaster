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
  console.log('1. Creating Supabase auth session for buylifemall@naver.com...');
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
    cookies: { getAll: () => [], setAll: v => rawCookies.push(...v) }
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

  console.log('2. Launching Microsoft Edge in FOREGROUND (headless: false)...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

  const browser = await chromium.launch({ executablePath: edgePath, headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies(browserCookies);

  const page = await context.newPage();

  console.log('3. Navigating to INSTA 포스팅 자동화 Settings page...');
  await page.goto('https://auto-instagram-posting.buylife.xyz/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const settingsShot = path.join(artifactDir, 'edge_insta_settings_scheduler_v125.png');
  await page.screenshot({ path: settingsShot, fullPage: true });
  console.log('Saved settings screenshot:', settingsShot);

  console.log('4. Navigating to INSTA 포스팅 자동화 Posts management page...');
  await page.goto('https://auto-instagram-posting.buylife.xyz/posts', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const postsShot = path.join(artifactDir, 'edge_insta_posts_scheduler_v125.png');
  await page.screenshot({ path: postsShot, fullPage: true });
  console.log('Saved posts screenshot:', postsShot);

  console.log('5. Navigating to Guide FAQ page...');
  await page.goto('https://auto-instagram-posting.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const guideShot = path.join(artifactDir, 'edge_insta_guide_scheduler_v125.png');
  await page.screenshot({ path: guideShot, fullPage: true });
  console.log('Saved guide screenshot:', guideShot);

  console.log('Verification completed. Closing context.');
  await browser.close();
}

main().catch(err => {
  console.error('Error during Edge verification:', err);
  process.exit(1);
});
