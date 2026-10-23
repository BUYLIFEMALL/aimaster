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
  { id: 'b632a359-d9fd-4e0c-8920-3283094a4892', name: 'json2video', title: 'JSON2Video API 연동하기' },
  { id: '33089b0c-fb3b-4a7e-b872-527a35b988a0', name: 'placid', title: 'PLACID API 연동하기' },
  { id: 'e2004c0f-160d-4360-bcbf-98f4409edde2', name: 'cloudinary', title: 'Cloudinary API 연동하기' },
  { id: 'c315c6d7-4187-446a-86da-5c37d4274d54', name: 'pixabay', title: 'Pixabay API 키 발급받기' },
  { id: 'ff6c331e-74a8-4b00-99c9-3b91f44f41f7', name: 'pexels', title: 'Pexels API 키 발급받기' }
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
    console.log(`Checking [${guide.title}]: ${guideUrl}...`);
    await page.goto(guideUrl, { waitUntil: 'networkidle', timeout: 35000 });
    await page.waitForTimeout(2000);

    const shotPath = path.join(artifactDir, `edge_guide_${guide.name}_detail.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Saved screenshot: ${shotPath}`);
  }

  console.log('All 5 Media & Asset guides verified in Microsoft Edge!');
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch(err => {
  console.error('Error during Edge verification:', err);
  process.exit(1);
});
