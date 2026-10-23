const { chromium } = require('../personality-suite/node_modules/playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\3a7fab5b-023b-4b09-81e4-11e7ec517fc9';

async function main() {
  console.log('===============================================================');
  console.log('🚀 AI 종합 성격 진단 자동화 (personality-suite) v1.20 Edge 검수 시작');
  console.log('===============================================================');

  // 1. Supabase 매직링크 생성
  console.log('[1/5] Supabase 인증 클라이언트 생성 (AIMaster 운영 DB: esgxyikcnnvmlhygjkth)...');
  const env = fs.readFileSync('.env.local', 'utf8');
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

  const sb = createClient(url, key);

  console.log('[2/5] 일반 회원 테스트 계정(buylifemall@naver.com) 매직링크 세션 획득...');
  const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email: 'buylifemall@naver.com',
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('매직링크 생성 실패:', linkErr);
    process.exit(1);
  }

  const magicLink = linkData.properties.action_link;
  console.log('매직링크 생성 성공.');

  // 2. Microsoft Edge 브라우저 실행 (포그라운드, channel: 'msedge')
  console.log('[3/5] Microsoft Edge 전용 브라우저 포그라운드(headless: false) 실행...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 100,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 3. 데스크톱 검수
  console.log('[4/5] 데스크톱 화면 검수 진행...');
  console.log('  -> 세션 인증 및 대시보드 접속 중...');
  await page.goto(magicLink, { waitUntil: 'networkidle', timeout: 30000 });
  await page.goto('https://personality-suite.buylife.xyz/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 캡처 1: 메인 전체 화면 및 히어로
  const cap1 = path.join(ARTIFACT_DIR, 'edge_personality_desktop_main_v120.png');
  await page.screenshot({ path: cap1, fullPage: false });
  console.log('  ✓ 캡처 1 완료:', cap1);

  // 캡처 2: 3대 핵심 KPI 통계 카드
  const cap2 = path.join(ARTIFACT_DIR, 'edge_personality_desktop_kpi_v120.png');
  const kpiSection = page.locator('section.grid-cols-1.sm\\:grid-cols-3');
  if (await kpiSection.count() > 0) {
    await kpiSection.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: cap2 });
  } else {
    await page.screenshot({ path: cap2 });
  }
  console.log('  ✓ 캡처 2 완료:', cap2);

  // 캡처 3: 4단계 파이프라인 가이드 바 & 검사군 목록
  const cap3 = path.join(ARTIFACT_DIR, 'edge_personality_desktop_pipeline_v120.png');
  const pipelineSection = page.locator('section.pipeline-bar-pastel');
  if (await pipelineSection.count() > 0) {
    await pipelineSection.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: cap3 });
  } else {
    await page.screenshot({ path: cap3 });
  }
  console.log('  ✓ 캡처 3 완료:', cap3);

  // 캡처 4: 가이드북 상단 및 워크플로우
  console.log('  -> https://personality-suite.buylife.xyz/guide 접속 중...');
  await page.goto('https://personality-suite.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  const cap4 = path.join(ARTIFACT_DIR, 'edge_personality_desktop_guide_v120.png');
  await page.screenshot({ path: cap4, fullPage: false });
  console.log('  ✓ 캡처 4 완료:', cap4);

  // 캡처 5: 가이드북 검사 매트릭스 도감 표 & 황금 수칙
  const cap5 = path.join(ARTIFACT_DIR, 'edge_personality_desktop_guide_matrix_v120.png');
  const matrixSection = page.locator('table.atelier-matrix-table');
  if (await matrixSection.count() > 0) {
    await matrixSection.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: cap5 });
  } else {
    await page.screenshot({ path: cap5 });
  }
  console.log('  ✓ 캡처 5 완료:', cap5);

  // 4. 모바일 반응형 검수 (375x812)
  console.log('[5/5] 모바일 반응형 검수 진행...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log('  -> 모바일 대시보드 접속 중...');
  await mobilePage.goto('https://personality-suite.buylife.xyz/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);

  const cap6 = path.join(ARTIFACT_DIR, 'edge_personality_mobile_main_v120.png');
  await mobilePage.screenshot({ path: cap6, fullPage: false });
  console.log('  ✓ 캡처 6 완료:', cap6);

  console.log('  -> 모바일 가이드북 접속 중...');
  await mobilePage.goto('https://personality-suite.buylife.xyz/guide', { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(1500);

  const cap7 = path.join(ARTIFACT_DIR, 'edge_personality_mobile_guide_v120.png');
  await mobilePage.screenshot({ path: cap7, fullPage: false });
  console.log('  ✓ 캡처 7 완료:', cap7);

  console.log('===============================================================');
  console.log('🎉 Edge 포그라운드 실세션 검수 완료! 모든 캡처가 성공적으로 저장되었습니다.');
  console.log('사용자 실시간 확인을 위해 Microsoft Edge 창을 10분간(600초) 포그라운드로 유지합니다...');
  console.log('===============================================================');

  // 10분간 포그라운드 화면 유지 (규칙 준수)
  await new Promise(resolve => setTimeout(resolve, 600000));

  await browser.close();
  console.log('Edge 브라우저 세션 종료.');
}

main().catch(err => {
  console.error('검수 실행 중 오류 발생:', err);
  process.exit(1);
});
