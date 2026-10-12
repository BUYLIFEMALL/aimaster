import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  const text = fs.readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv('D:/Antigravity/AIMaster/.env.local');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const formattedDescription = `
<h3>🚀 쿠팡 12단 & 스마트스토어 9단 상세페이지 원클릭 완성</h3>
<p><strong>AI 12단 상세페이지 자동화</strong>는 이커머스 셀러와 디자이너를 위한 차세대 상업용 상세페이지 제작 스튜디오입니다.<br>포토샵이나 복잡한 외주 작업 없이, 상품명만 입력하면 AI가 시장 분석, 전문 카피라이팅, 초고화질 비주얼 렌더링, 860px 통이미지 다운로드까지 한 번에 완성합니다.</p>

<hr>

<h3>🌟 4대 핵심 자동화 기능</h3>
<ul>
  <li><strong>⚡ 1초 스펙 자동 검색 & 사양서 정밀 분석</strong>: 상품명만 입력하면 핵심 사양 4종, 타겟 고객, 할인율, 3대 후킹 카피를 1초 만에 자동 완성하며, PDF·TXT·MD 사양서 파싱 및 제품 누끼 사진 다각도 분석 렌더링을 지원합니다.</li>
  <li><strong>📐 플랫폼 표준 규격 완벽 대응</strong>: 모바일 가로 860px 기준 쿠팡 로켓배송 최적화 12단 시퀀스 및 네이버 스마트스토어 감성 리뷰형 9단 시퀀스를 원클릭으로 선택 전환할 수 있습니다.</li>
  <li><strong>✨ Nano Banana 상업용 비주얼 렌더링 엔진</strong>: 표준 고속 렌더링(Nano Banana)과 극세사 질감 및 매크로 디테일을 극대화한 초고해상도 렌더링(Nano Banana2)을 탑재하여 스튜디오 촬영급 이미지를 생성합니다.</li>
  <li><strong>📱 실시간 모바일 프리뷰 & 860px 통이미지 즉시 다운로드</strong>: 실제 스마트폰 화면에서 스크롤되는 상세페이지를 실시간으로 확인하고, HTML5 Canvas를 통해 12개 장면을 깔끔한 단일 세로 통이미지로 1초 만에 일괄 다운로드합니다.</li>
</ul>

<hr>

<h3>📋 12단 상세페이지 표준 시퀀스 구조</h3>
<ul>
  <li><strong>01. HOT EVENT</strong> : 선착순 런칭 특가 및 시선 집중 프로모션 배너</li>
  <li><strong>02. PROBLEM & SOLUTION</strong> : 소비자 공감 유도 및 메인 후킹 카피</li>
  <li><strong>03. KEY SPEC</strong> : 대표 메인컷 및 핵심 사양 요약</li>
  <li><strong>04. FEATURE 01</strong> : 프리미엄 소재 · 원료 · 성분 차별점</li>
  <li><strong>05. FEATURE 02</strong> : 압도적 성능 및 사용자 편의 기능</li>
  <li><strong>06. FEATURE 03</strong> : 감각적인 디자인 · 감성 핏 · 정밀 디테일</li>
  <li><strong>07. LIFESTYLE</strong> : 실제 사용 상황을 담은 라이프스타일 연출컷</li>
  <li><strong>08. FACT CHECK</strong> : 타사 일반 제품 vs 자사 제품 팩트 비교표</li>
  <li><strong>09. MACRO DETAIL</strong> : 0.1mm 초근접 접사 및 정밀 마감 퀄리티</li>
  <li><strong>10. HOW TO USE</strong> : 초보자도 쉬운 1-2-3 단계별 간편 사용 가이드</li>
  <li><strong>11. RECOMMENDED</strong> : 놓치면 안 되는 4대 타겟 고객 추천 체크리스트</li>
  <li><strong>12. PACKAGE & FAQ</strong> : 풀 패키지 구성품 안내 및 100% 안심 A/S 보증</li>
</ul>

<hr>

<h3>🔒 100% 회원 본인 Google Gemini API 키 독립 연동</h3>
<p>회원 본인이 발급받은 Google Gemini API 키를 직접 연동하여 사용하므로, 사용량 제한이나 공유 없이 안전하고 독립적인 고속 생성이 가능합니다.</p>
`.trim();

const formattedShortDesc = "쿠팡 12단 & 스마트스토어 9단 규격 최적화, 1초 스펙 자동검색 및 860px 통이미지 원클릭 완성 스튜디오";

async function run() {
  const programId = 'bb770cbb-c4f1-4bdd-8581-1ff08979e873';

  console.log('Updating program:', programId);
  const { data, error } = await supabase
    .from('programs')
    .update({
      short_desc: formattedShortDesc,
      description: formattedDescription,
    })
    .eq('id', programId)
    .select('id, name, slug, short_desc, description')
    .single();

  if (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }

  console.log('Update successful!');
  console.log('ID:', data.id);
  console.log('NAME:', data.name);
  console.log('SHORT_DESC:', data.short_desc);
  console.log('DESCRIPTION:');
  console.log(data.description);
}

run();
