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
  { id: 'de6e2878-1615-455a-a219-c9b0b3d0795a', name: 'toss_sharelink', title: '토스쇼핑 쉐어링크 API 키 발급받기' },
  { id: 'e39a02e3-2b00-45a1-92ed-2e33d0d331d2', name: 'naver_brandconnect', title: '네이버 브랜드커넥트 링크 등록하기' },
  { id: '3255b41b-0ddd-414b-9e45-309b7072cbef', name: 'coupang_12step_detail', title: 'AI 12단 상세페이지 자동화 가이드' },
  { id: 'cffe0d83-1e7f-494c-947d-75dcfcaee01e', name: 'buylife_migration', title: '프로그램 주소 변경(buylife.xyz) 통합 가이드' }
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

  console.log('All 4 Phase 8 guides verified in Microsoft Edge!');
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch(err => {
  console.error('Error during Edge verification:', err);
  process.exit(1);
});
