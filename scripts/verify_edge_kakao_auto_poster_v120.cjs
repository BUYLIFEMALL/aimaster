const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const ownRequire = createRequire(path.join(__dirname, '../blog-content-maker/package.json'));
const { chromium } = ownRequire('playwright');
const { createClient } = ownRequire('@supabase/supabase-js');

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (!m) continue;
    const raw = m[2].trim();
    env[m[1]] = raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'|'$/g, '');
  }
  return env;
}

const env = readEnv(path.join(__dirname, '../.env.local'));
const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function run() {
  console.log('[1/5] Supabase 인증 클라이언트 생성 (AIMaster 운영 DB: esgxyikcnnvmlhygjkth)...');
  const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY);

  console.log('[2/5] 일반 회원 테스트 계정(buylifemall@naver.com) 매직링크 세션 획득...');
  const { data: linkData, error: linkErr } = await s.auth.admin.generateLink({
    type: 'magiclink',
    email: 'buylifemall@naver.com',
  });

  if (linkErr) {
    console.error('매직링크 생성 실패:', linkErr);
    process.exit(1);
  }

  const token_hash = linkData.properties.hashed_token;
  const baseUrl = 'https://kakao-auto-posting.buylife.xyz';
  const callbackUrl = `${baseUrl}/auth/callback?token_hash=${token_hash}&type=magiclink&next=/dashboard`;

  console.log('[3/5] Microsoft Edge 전용 브라우저 포그라운드(headless: false) 실행...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    args: ['--window-size=1440,960'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  const page = await context.newPage();

  console.log('[4/5] 데스크톱 화면 검수 진행...');
  console.log('  -> 세션 인증 및 대시보드 접속 중...');
  await page.goto(callbackUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 1. 데스크톱 대시보드 상단 & 사이드바
  const cap1 = path.join(artifactDir, 'edge_kakao_desktop_main_v120.png');
  await page.screenshot({ path: cap1, fullPage: false });
  console.log(`  ✓ 캡처 1 완료: ${cap1}`);

  // 2. 데스크톱 히어로 & 3대 KPI 카드 & 파이프라인
  const cap2 = path.join(artifactDir, 'edge_kakao_desktop_kpi_v120.png');
  await page.screenshot({ path: cap2, fullPage: false });
  console.log(`  ✓ 2 캡처 완료: ${cap2}`);

  // 3. 데스크톱 단계별 가이드 영역 스크롤 캡처
  await page.evaluate(() => window.scrollBy(0, 450));
  await page.waitForTimeout(1000);
  const cap3 = path.join(artifactDir, 'edge_kakao_desktop_steps_v120.png');
  await page.screenshot({ path: cap3, fullPage: false });
  console.log(`  ✓ 캡처 3 완료: ${cap3}`);

  // 4. 데스크톱 가이드북 상단
  console.log('  -> https://kakao-auto-posting.buylife.xyz/guide 접속 중...');
  await page.goto(`${baseUrl}/guide`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const cap4 = path.join(artifactDir, 'edge_kakao_desktop_guide_v120.png');
  await page.screenshot({ path: cap4, fullPage: false });
  console.log(`  ✓ 캡처 4 완료: ${cap4}`);

  // 5. 데스크톱 가이드북 매트릭스 & 7대 수칙 스크롤
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(1000);
  const cap5 = path.join(artifactDir, 'edge_kakao_desktop_guide_matrix_v120.png');
  await page.screenshot({ path: cap5, fullPage: false });
  console.log(`  ✓ 캡처 5 완료: ${cap5}`);

  console.log('[5/5] 모바일 반응형 검수 진행...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  
  // 모바일 메인 대시보드
  console.log('  -> 모바일 대시보드 접속 중...');
  await mobilePage.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  const cap6 = path.join(artifactDir, 'edge_kakao_mobile_main_v120.png');
  await mobilePage.screenshot({ path: cap6, fullPage: false });
  console.log(`  ✓ 캡처 6 완료: ${cap6}`);

  // 모바일 가이드북
  console.log('  -> 모바일 가이드북 접속 중...');
  await mobilePage.goto(`${baseUrl}/guide`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  const cap7 = path.join(artifactDir, 'edge_kakao_mobile_guide_v120.png');
  await mobilePage.screenshot({ path: cap7, fullPage: false });
  console.log(`  ✓ 캡처 7 완료: ${cap7}`);

  await mobileContext.close();

  // 메인 창으로 복귀 및 최상단 스크롤
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.bringToFront();

  console.log('===============================================================');
  console.log('🎉 Edge 포그라운드 실세션 검수 완료! 모든 캡처가 성공적으로 저장되었습니다.');
  console.log('사용자 실시간 확인을 위해 Microsoft Edge 창을 10분간(600초) 포그라운드로 유지합니다...');
  console.log('===============================================================');

  await page.waitForTimeout(600000);
  await browser.close();
  console.log('Edge 브라우저 세션 종료.');
}

run().catch((err) => {
  console.error('검수 실행 오류:', err);
  process.exit(1);
});
