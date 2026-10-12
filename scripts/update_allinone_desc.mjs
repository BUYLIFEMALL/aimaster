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
<h3>🎨 19개 직군 123종 템플릿 & 매직 인페인팅 올인원 스튜디오</h3>
<p><strong>AI 올인원 그래픽 자동화</strong>는 외주 제작이나 복잡한 디자인 툴 없이, 기획서 한 장 또는 키워드 입력만으로 고품질 상업용 비주얼 에셋을 1분 만에 완성하는 차세대 크리에이티브 솔루션입니다.<br>단순 이미지 생성을 넘어 기획서 분석, 사전 123종 프리셋, 나노바나나 고해상도 렌더링, 브러시 인페인팅 부분 수정까지 브라우저 하나로 완벽하게 해결합니다.</p>

<hr>

<h3>🌟 5대 핵심 자동화 기능</h3>
<ul>
  <li><strong>⚡ 기획서 기반 AI 자동 완성</strong>: 회의록, 사양서, 기획 메모(.txt, .md, .json, .pdf)를 첨부하면 Gemini AI가 문서를 정밀 분석하여 가변 입력 필드를 100% 자동 작성합니다.</li>
  <li><strong>📁 19개 전문 직군 123종 상업용 템플릿</strong>: 개발, 커머스, 마케팅, 창작, 인테리어 등 실무 현장에서 즉시 쓰이는 123개 고품질 디자인 템플릿을 기본 탑재했습니다.</li>
  <li><strong>✨ 나노바나나(Nano Banana) 비주얼 엔진</strong>: 빠른 속도의 표준 렌더링(Nano Banana 1K)과 극세사 질감 및 매크로 접사를 지원하는 초고화질 렌더링(Nano Banana2 Pro 2K/4K)을 제공합니다.</li>
  <li><strong>🖌️ 브러시 마스크 인페인팅 & 아웃페인팅</strong>: 캔버스 브러시로 원하는 영역을 칠해 마법처럼 부분 교체·추가·제거하고, 1:1 이미지를 16:9 와이드 또는 9:16 쇼츠 비율로 자연스럽게 확장합니다.</li>
  <li><strong>🎭 11대 화풍 스타일 & 다국어 타이포그래피</strong>: 실사 8K, 3D 렌더링, 지브리풍, 수채화, 픽셀아트 등 11개 화풍과 이미지 내 한글/영문 텍스트 렌더링을 완벽 지원합니다.</li>
</ul>

<hr>

<h3>💼 직군별 대표 활용 분야 (123종 템플릿)</h3>
<ul>
  <li><strong>IT · 개발</strong> : UI/UX 플레이스홀더, 랜딩 배너, 앱 아이콘, 대시보드 화면, 3D 게임 에셋, 시스템 구조도</li>
  <li><strong>이커머스 · 셀러</strong> : 흰 배경 상품 누끼컷, 기획전 배너, 상세페이지 비주얼, 패션 룩북, 가상 피팅 모델, 메뉴판</li>
  <li><strong>마케팅 · 비즈니스</strong> : SNS 피드 광고, 경영진 1장 요약 인포그래픽, 제품 컨셉 목업, 포스터, 금융 차트</li>
  <li><strong>크리에이터 · 창작</strong> : 유튜브 고화질 썸네일, 텍스트 심도 플레이리스트, 웹툰 배경 라인아트, 도서 표지, 스토리보드</li>
  <li><strong>전문 서비스 · 라이프</strong> : 3D 아파트 인테리어 투시도, 건축 외관 조감도, 학습 교재 삽화, 모바일 청첩장</li>
</ul>

<hr>

<h3>🔒 100% 회원 본인 Google Gemini API 키 독립 연동</h3>
<p>회원 본인이 발급받은 Google Gemini API 키를 직접 연동하여 사용하므로, 사용량 제한이나 공유 없이 안전하고 독립적인 고속 생성이 가능합니다.</p>
`.trim();

const formattedShortDesc = "19개 직군 123종 프리셋, 초고해상도 나노바나나 엔진, 브러시 인페인팅 & 아웃페인팅 올인원 스튜디오";

async function run() {
  const programId = '6fc5e240-9e72-45b2-90aa-b259e74ddd03';

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
