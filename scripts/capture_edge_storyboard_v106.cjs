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
  const admin = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 일반 회원 테스트 계정: buylifemall@naver.com
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

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const artDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

  // 1. 데스크톱 검수 (1440x1200)
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  await contextDesktop.addCookies(browserCookies);
  const page = await contextDesktop.newPage();

  // (1) /guide 검수
  console.log('Navigating to /guide ...');
  await page.goto('https://cinematic-storyboard-studio.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const capGuide = path.join(artDir, 'edge_storyboard_guide_desktop_v106.png');
  await page.screenshot({ path: capGuide, fullPage: false });
  console.log('Saved Guide Top:', capGuide);

  // 스크롤하여 5단계 파이프라인 및 비디오 AI 섹션 캡처
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1000);
  const capGuidePipeline = path.join(artDir, 'edge_storyboard_guide_pipeline_v106.png');
  await page.screenshot({ path: capGuidePipeline, fullPage: false });
  console.log('Saved Guide Pipeline:', capGuidePipeline);

  // 스크롤하여 용어사전 및 FAQ 캡처
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1000);
  const capGuideFaq = path.join(artDir, 'edge_storyboard_guide_faq_v106.png');
  await page.screenshot({ path: capGuideFaq, fullPage: false });
  console.log('Saved Guide FAQ:', capGuideFaq);

  // (2) /studio 검수
  console.log('Navigating to /studio ...');
  await page.goto('https://cinematic-storyboard-studio.buylife.xyz/studio', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const capStudio = path.join(artDir, 'edge_storyboard_studio_desktop_v106.png');
  await page.screenshot({ path: capStudio, fullPage: false });
  console.log('Saved Studio:', capStudio);

  // (3) /projects 검수
  console.log('Navigating to /projects ...');
  await page.goto('https://cinematic-storyboard-studio.buylife.xyz/projects', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const capProjects = path.join(artDir, 'edge_storyboard_projects_desktop_v106.png');
  await page.screenshot({ path: capProjects, fullPage: false });
  console.log('Saved Projects:', capProjects);

  // (4) /settings 검수
  console.log('Navigating to /settings ...');
  await page.goto('https://cinematic-storyboard-studio.buylife.xyz/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const capSettings = path.join(artDir, 'edge_storyboard_settings_desktop_v106.png');
  await page.screenshot({ path: capSettings, fullPage: false });
  console.log('Saved Settings:', capSettings);

  // 2. 모바일 반응형 검수 (390x844)
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await contextMobile.addCookies(browserCookies);
  const pageMobile = await contextMobile.newPage();

  console.log('Navigating to /studio on mobile (390px) ...');
  await pageMobile.goto('https://cinematic-storyboard-studio.buylife.xyz/studio', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(2000);
  const capMobileStudio = path.join(artDir, 'edge_storyboard_studio_mobile_v106.png');
  await pageMobile.screenshot({ path: capMobileStudio, fullPage: false });
  console.log('Saved Mobile Studio:', capMobileStudio);

  console.log('Navigating to /guide on mobile (390px) ...');
  await pageMobile.goto('https://cinematic-storyboard-studio.buylife.xyz/guide', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(2000);
  const capMobileGuide = path.join(artDir, 'edge_storyboard_guide_mobile_v106.png');
  await pageMobile.screenshot({ path: capMobileGuide, fullPage: false });
  console.log('Saved Mobile Guide:', capMobileGuide);

  await browser.close();
  console.log('All Edge inspection screenshots successfully saved.');
}

main().catch(console.error);
