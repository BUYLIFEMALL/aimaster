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
<h3>🎙️ 음성 인텔리전스 · 회의록 자동화 & 음악 Suno v5 역설계 스튜디오</h3>
<p><strong>AI Audio분석 자동화</strong>는 Google Gemini 2.5 Flash 멀티모달 오디오 AI를 탑재하여, 회의/인터뷰 음성의 맥락부터 음악의 화성학 및 음향 포렌식까지 나노 단위로 분석하는 차세대 오디오 랩입니다.<br>
복잡한 수작업 타이핑이나 음악 전사 작업 없이, 오디오 파일 하나만 업로드하면 화자 분리, 의결 사항 중심 회의록 작성, Suno v5 역설계 프롬프트 추출, 음향 품질 포렌식까지 원클릭으로 완성합니다.</p>

<hr>

<h3>🌟 5대 핵심 자동화 기능</h3>
<ul>
  <li><strong>⚡ 스마트 자동 판별 (Speech vs Music)</strong>: 음성을 올리면 AI가 즉시 음성 대화인지 음악/연주곡인지 스스로 감지하여 최적화된 리포트 엔진을 가동합니다.</li>
  <li><strong>👥 음성 인텔리전스 & 화자별 심층 프로파일링</strong>: 대화 참여자별 역할, 화법 스타일, 핵심 기여도 및 발언 점유율을 도넛/바 차트로 시각화합니다.</li>
  <li><strong>📋 비즈니스 회의록 & 인터뷰 보고서 자동 생성</strong>: 초 단위 타임라인 전사 기록을 바탕으로 실행 과제(Action Items), 주요 질문(Key Questions), 의결 사항이 정리된 표준 마크다운 보고서를 원클릭으로 생성·복사합니다.</li>
  <li><strong>🔥 Suno AI v5 Reverse Prompt (역설계 프롬프트)</strong>: 음원의 장르, 악기, 분위기, 템포를 역설계하여 Suno v5에서 동일한 퀄리티의 음원을 생성할 수 있는 God-Tier 프롬프트를 자동 추출합니다.</li>
  <li><strong>🔍 오디오 포렌식 & 4대 스템 청각 묘사</strong>: 고주파 Cut-off를 감지하여 뻥튀기(Upscaled) 음원 여부를 진단하고, Vocals, Bass, Drums, Keys 4대 스템의 믹싱 질감과 코드 진행(Chord Progression)을 텍스트 악보로 제공합니다.</li>
</ul>

<hr>

<h3>💼 분야별 대표 활용</h3>
<ul>
  <li><strong>비즈니스 · 기업</strong> : 주간 업무 회의록 자동 생성, 화자별 대화 점유율 및 감정 흐름 분석, 실행 과제 담당자 자동 지정</li>
  <li><strong>연구원 · 기자</strong> : 1:1 심층 인터뷰 녹취록 자동 전사, 핵심 논점 및 인터뷰이 성향 프로파일링 보고서 작성</li>
  <li><strong>음악 프로듀서 · 크리에이터</strong> : 레퍼런스 음원 장르/BPM/화성 분석, Suno AI v5 프롬프트 역설계 및 재현</li>
  <li><strong>사운드 엔지니어</strong> : 음원 압축 품질 추정, 위변조 및 편집 흔적 탐지, 4대 스템 믹싱 특성 분석</li>
</ul>

<hr>

<h3>🔒 100% 회원 본인 Google Gemini API 키 독립 연동</h3>
<p>회원 본인이 발급받은 Google Gemini API 키를 직접 연동하여 사용하므로, 사용량 제한이나 공유 없이 안전하고 독립적인 고속 생성이 가능합니다.</p>
`.trim();

async function run() {
  // 1. 카테고리 확인 (음악 또는 유튜브)
  const { data: cats } = await supabase.from('categories').select('id, name, slug');
  console.log('Categories:', cats);
  const musicCat = cats?.find(c => c.name.includes('음악') || c.name.includes('사운드') || c.name.includes('오디오') || c.slug.includes('music'))
    || cats?.find(c => c.name.includes('AI') || c.name.includes('유튜브'))
    || cats?.[0];

  console.log('Selected category:', musicCat);

  // 2. 최대 sort_order 조회
  const { data: maxSort } = await supabase
    .from('programs')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = (maxSort?.sort_order ?? 128) + 1;
  console.log('Next sort_order:', nextSortOrder);

  const programSlug = 'ai-audio-analyzer';
  const thumbnailUrl = 'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/audio-analyzer-thumbnail.jpg';
  const appUrl = 'https://audio.buylife.xyz';

  // 3. 기존 등록 여부 확인
  const { data: existing } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', programSlug)
    .maybeSingle();

  let programId;
  const programData = {
    name: 'AI Audio분석 자동화',
    slug: programSlug,
    category_id: musicCat?.id,
    short_desc: 'Gemini 멀티모달 기반 음성 인텔리전스 리포트, 회의록 자동 생성, 음악 분석, Suno v5 역설계 프롬프트, 오디오 포렌식 스튜디오',
    description: formattedDescription,
    thumbnail_url: thumbnailUrl,
    app_url: appUrl,
    badges: ['free', 'new'],
    is_active: true,
    version: 'v1.01',
    sort_order: nextSortOrder,
  };

  if (existing) {
    console.log('Updating existing program:', existing.id);
    const { data: updated, error } = await supabase
      .from('programs')
      .update(programData)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    programId = updated.id;
  } else {
    console.log('Inserting new program...');
    const { data: inserted, error } = await supabase
      .from('programs')
      .insert(programData)
      .select('id')
      .single();
    if (error) throw error;
    programId = inserted.id;
  }

  console.log('Program registered! ID:', programId);

  // 4. 가격 플랜 3종 등록 (1개월/2개월/3개월)
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
  console.log('Pricing plans registered!');
}

run();
