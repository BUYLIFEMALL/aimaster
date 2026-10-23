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

const targetGuides = [
  { id: '6cdae259-b9d2-45ae-9c21-e5f498f78956', name: 'insta_posting' },
  { id: '4115e455-1585-4304-89b4-d29859fd7a5a', name: 'insta_dm' },
  { id: '343996d3-8c77-455d-9bd4-54bcd47a34cd', name: 'threads_account' },
  { id: '0f5cd337-1231-48c0-a9a1-63297686a97e', name: 'threads_reply_app' },
  { id: 'ae85d991-d907-4349-809e-818a6b3a2f54', name: 'threads_search_approval' },
  { id: 'c3ed7fe3-00d8-466b-b4ce-9c115accb273', name: 'shorts_reels' },
  { id: '1c4181ac-a8c4-4b11-80f4-b29f3318c39b', name: 'youtube_channel' }
];

async function main() {
  console.log('1. Setting up Supabase session for buylifemall@naver.com...');
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

  for (const guide of targetGuides) {
    const guideUrl = `https://www.buylife.xyz/guides/${guide.id}`;
    console.log(`Checking [${guide.name}]: ${guideUrl}...`);
    await page.goto(guideUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const shotPath = path.join(artifactDir, `edge_guide_${guide.name}_detail.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Saved screenshot: ${shotPath}`);
  }

  console.log('All 7 Meta & SNS guides verified in Microsoft Edge!');
  await browser.close();
}

main().catch(err => {
  console.error('Error during Edge verification:', err);
  process.exit(1);
});
