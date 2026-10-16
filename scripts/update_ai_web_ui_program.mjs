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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

const formattedDescription = `
<h3>🎨 React 19 & Tailwind CSS v4 올인원 AI 웹 UI 제작 자동화 스튜디오</h3>
<p><strong>AI 웹 UI 제작 자동화</strong>는 실무 웹 서비스 개발에 즉시 투입 가능한 <strong>12대 필수 UI 컴포넌트 라이브러리</strong>와 <strong>10종 인터랙티브 실사용 시뮬레이터 데모</strong>, <strong>클린 TSX 원클릭 소스 코드 복사기</strong> 및 <strong>Gemini AI 프롬프트 기반 컴포넌트 자동 빌더</strong>를 제공하는 통합 프론트엔드 엔지니어링 스튜디오입니다.<br>
복잡하고 무거운 외부 라이브러리 의존성 없이, 순수 React 19와 최신 Tailwind CSS v4로 정밀하게 설계된 프로덕션 레디 컴포넌트를 직접 조작해보고 원하는 코드를 원클릭으로 복사하여 프로젝트에 바로 적용할 수 있습니다.</p>

<hr>

<h3>🌟 4대 핵심 개발 생산성 기능</h3>
<ul>
  <li><strong>🧩 12대 필수 UI 컴포넌트 갤러리</strong>: Button, Input, Modal, Tabs, Select, RadioGroup, Checkbox, Toggle, Slider, Alert, Spinner, ProgressBar, Tooltip, Popover 등 실무 필수 요소의 모든 변형(Variants), 크기, 활성/비활성/로딩 상태를 한눈에 비교하고 라이브로 테스트합니다.</li>
  <li><strong>🎮 10종 인터랙티브 실사용 데모 시뮬레이터</strong>: 미니 어드벤처 버튼 게임, 실시간 뉴스레터 폼 유효성 검사, 이커머스 상세 탭 전환, 미디어 플레이어 볼륨 슬라이더 동기화, 비동기 로더 등 실제 서비스 환경과 동일한 10가지 인터랙션을 모달 팝업으로 직접 시뮬레이션합니다.</li>
  <li><strong>📋 클린 TSX 소스 코드 원클릭 복사</strong>: 번거로운 설치나 스타일 충돌 없이, 단일 파일 형태로 바로 복사해 붙여넣을 수 있는 고품질 TSX 소스 코드를 구문 강조 뷰어와 함께 원클릭으로 제공합니다.</li>
  <li><strong>⚡ Gemini AI 컴포넌트 자동 빌더</strong>: 회원 본인의 Google Gemini API 키를 연동하여 &quot;어두운 테마의 매출 대시보드 통계 카드 만들어줘&quot;와 같은 한 줄 자연어 프롬프트만으로 완성도 높은 커스텀 TSX 코드를 실시간 스트리밍으로 자동 제작합니다.</li>
</ul>

<hr>

<h3>💼 대상 사용자 및 추천 활용</h3>
<ul>
  <li><strong>프론트엔드 개발자</strong>: 사내 디자인 시스템 구축, 기본 UI 컴포넌트 셋업 시간 90% 단축, 접근성(A11y) 가이드 준수</li>
  <li><strong>풀스택 엔지니어 & 1인 창업가</strong>: Next.js 기반 신규 SaaS/웹앱 런칭 시 즉시 복사 가능한 경량 컴포넌트 활용</li>
  <li><strong>UI/UX 디자이너</strong>: 실제 코드 베이스에서 컴포넌트 상태(Hover, Focus, Disabled, Loading) 동작 방식 라이브 확인</li>
</ul>

<hr>

<h3>🔒 100% 회원 본인 Google Gemini API 키 독립 연동</h3>
<p>AI 컴포넌트 생성기는 회원 본인이 발급받은 Google Gemini API 키를 암호화하여 본인 계정 전용으로만 안전하게 사용합니다. 운영자나 타인의 키로 폴백되지 않으므로 사용량 제한 없이 자유롭고 독립적인 고속 빌드가 가능합니다.</p>
`.trim();

async function run() {
  console.log('--- programs 테이블 정보 갱신 시작 ---');

  const { data: updated, error } = await supabase
    .from('programs')
    .update({
      name: 'AI 웹 UI 제작 자동화',
      short_desc: 'React 19 & Tailwind CSS 기반 웹 UI 제작 자동화 · 12대 필수 UI 컴포넌트 갤러리 · 10종 인터랙티브 시뮬레이터 · 클린 TSX 코드 복사 & Gemini AI 자동 생성기',
      description: formattedDescription,
      app_url: 'https://ai-web-ui.buylife.xyz',
      version: 'v1.02',
      updated_at: new Date().toISOString()
    })
    .eq('slug', 'react-ui-showcase')
    .select('id, slug, name, version, app_url')
    .single();

  if (error) {
    console.error('Update Error:', error);
    process.exit(1);
  }

  console.log('Successfully updated program:', updated);
  console.log('--- programs 테이블 정보 갱신 완료 ---');
}

run();
