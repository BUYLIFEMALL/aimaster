import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
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
<h3>🎨 React 19 & Tailwind CSS v4 올인원 UI 컴포넌트 쇼케이스 & AI 빌더</h3>
<p><strong>React UI 컴포넌트 쇼케이스</strong>는 실무 웹 서비스 개발에 즉시 투입 가능한 <strong>12대 필수 UI 컴포넌트 라이브러리</strong>와 <strong>10종 인터랙티브 실사용 시뮬레이터 데모</strong>, <strong>클린 TSX 원클릭 소스 코드 복사기</strong> 및 <strong>Gemini AI 프롬프트 기반 컴포넌트 생성기</strong>를 제공하는 통합 프론트엔드 엔지니어링 스튜디오입니다.<br>
복잡하고 무거운 외부 라이브러리 의존성 없이, 순수 React 19와 최신 Tailwind CSS v4로 정밀하게 설계된 프로덕션 레디 컴포넌트를 직접 조작해보고 원하는 코드를 원클릭으로 복사하여 프로젝트에 바로 적용할 수 있습니다.</p>

<hr>

<h3>🌟 4대 핵심 개발 생산성 기능</h3>
<ul>
  <li><strong>🧩 12대 필수 UI 컴포넌트 갤러리</strong>: Button, Input, Modal, Tabs, Select, RadioGroup, Checkbox, Toggle, Slider, Alert, Spinner, ProgressBar, Tooltip, Popover 등 실무 필수 요소의 모든 변형(Variants), 크기, 활성/비활성/로딩 상태를 한눈에 비교하고 라이브로 테스트합니다.</li>
  <li><strong>🎮 10종 인터랙티브 실사용 데모 시뮬레이터</strong>: 미니 어드벤처 버튼 게임, 실시간 뉴스레터 폼 유효성 검사, 이커머스 상세 탭 전환, 미디어 플레이어 볼륨 슬라이더 동기화, 비동기 로더 등 실제 서비스 환경과 동일한 10가지 인터랙션을 모달 팝업으로 직접 시뮬레이션합니다.</li>
  <li><strong>📋 클린 TSX 소스 코드 원클릭 복사</strong>: 번거로운 설치나 스타일 충돌 없이, 단일 파일 형태로 바로 복사해 붙여넣을 수 있는 고품질 TSX 소스 코드를 구문 강조 뷰어와 함께 원클릭으로 제공합니다.</li>
  <li><strong>⚡ Gemini AI 컴포넌트 자동 빌더</strong>: 회원 본인의 Google Gemini API 키를 연동하여 &quot;어두운 테마의 매출 대시보드 통계 카드 만들어줘&quot;와 같은 한 줄 자연어 프롬프트만으로 완성도 높은 커스텀 TSX 코드를 실시간 스트리밍으로 생성합니다.</li>
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
  console.log('--- React UI 컴포넌트 쇼케이스 등록 시작 ---');

  // 1. 썸네일 이미지 업로드
  const imgPath = 'D:/Antigravity/AIMaster/scratch/react-ui-showcase-thumbnail.jpg';
  console.log('1. Reading thumbnail image from:', imgPath);
  const fileBuffer = fs.readFileSync(imgPath);

  const storagePath = 'catalog/react-ui-showcase-thumbnail.jpg';
  console.log('Uploading to Supabase Storage bucket "program-images", path:', storagePath);

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('program-images')
    .upload(storagePath, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadErr) {
    console.error('Storage Upload Error:', uploadErr);
    process.exit(1);
  }

  const timestamp = Date.now();
  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/program-images/${storagePath}?v=${timestamp}`;
  console.log('Thumbnail Public URL:', publicUrl);

  // 2. 카테고리 확인 (Tools 또는 멀티미디어)
  const { data: cats } = await supabase.from('categories').select('id, name, slug');
  console.log('Categories:', cats?.map(c => `${c.name} (${c.slug})`));
  const selectedCat = cats?.find(c => c.slug === 'tools' || c.name.toLowerCase().includes('tools'))
    || cats?.find(c => c.name.includes('유틸리티'))
    || cats?.[0];

  console.log('Selected Category:', selectedCat?.name, selectedCat?.id);

  // 3. sort_order 조회
  const { data: maxSort } = await supabase
    .from('programs')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxSort?.sort_order ?? 130) + 1;

  // 4. 기존 프로그램 조회 (slug = 'react-ui-showcase')
  const { data: existingProg } = await supabase
    .from('programs')
    .select('id, slug, name')
    .eq('slug', 'react-ui-showcase')
    .maybeSingle();

  const programPayload = {
    slug: 'react-ui-showcase',
    name: 'React UI 컴포넌트 쇼케이스',
    short_desc: 'React 19 & Tailwind CSS 12대 필수 UI 컴포넌트 갤러리 · 10종 인터랙티브 데모 시뮬레이터 · 클린 TSX 소스 코드 복사 & Gemini AI 자동 생성기',
    description: formattedDescription,
    app_url: 'https://react-ui-showcase.buylife.xyz',
    thumbnail_url: publicUrl,
    badges: ['free', 'new'],
    version: 'v1.01',
    category_id: selectedCat?.id,
    is_active: true,
    sort_order: nextSortOrder,
    updated_at: new Date().toISOString()
  };

  let programId;
  if (existingProg) {
    console.log('Updating existing program:', existingProg.id);
    const { data: updated, error: updateErr } = await supabase
      .from('programs')
      .update(programPayload)
      .eq('id', existingProg.id)
      .select('id')
      .single();

    if (updateErr) {
      console.error('Update Error:', updateErr);
      process.exit(1);
    }
    programId = updated.id;
    console.log('Successfully updated program:', existingProg.name);
  } else {
    console.log('Inserting new program into programs table...');
    const { data: inserted, error: insertErr } = await supabase
      .from('programs')
      .insert({
        ...programPayload,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('Insert Error:', insertErr);
      process.exit(1);
    }
    programId = inserted.id;
    console.log('Successfully registered new program, ID:', programId);
  }

  // 5. 가격 플랜 등록
  const plans = [
    { program_id: programId, name: '1개월', billing_type: 'monthly', price: 10000, original_price: 10000, is_active: true, sort_order: 0 },
    { program_id: programId, name: '2개월', billing_type: 'bimonthly', price: 20000, original_price: 20000, is_active: true, sort_order: 1 },
    { program_id: programId, name: '3개월', billing_type: 'quarterly', price: 30000, original_price: 30000, is_active: true, sort_order: 2 },
  ];

  for (const plan of plans) {
    const { data: existPlan } = await supabase
      .from('pricing_plans')
      .select('id')
      .eq('program_id', programId)
      .eq('billing_type', plan.billing_type)
      .maybeSingle();

    if (existPlan) {
      await supabase.from('pricing_plans').update(plan).eq('id', existPlan.id);
    } else {
      await supabase.from('pricing_plans').insert(plan);
    }
  }
  console.log('Pricing plans registered successfully!');


  console.log('--- React UI 컴포넌트 쇼케이스 등록 완료 ---');
}

run();
