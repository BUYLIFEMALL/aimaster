-- shorts-viral-studio 프로그램 등록 + 기본 요금제 3단계 + YouTube Data API 키 발급 매뉴얼
-- 운영 DB에는 2026-10-04 execute_sql로 적용했다(재실행해도 중복되지 않게 not exists로 보호).
-- 썸네일(thumbnail_url)은 docs/PLATFORM_PATTERNS.md §13 실사 원칙으로 별도 생성 후 갱신한다.

insert into programs (category_id, name, slug, short_desc, description, app_url, is_active, sort_order, required_grade_id, badges, version)
select
  'b4455fd4-f4c1-46b3-98ee-5904987ff374',  -- 카테고리: 쇼츠
  '쇼츠 떡상 분석·대본 자동화',
  'shorts-viral-studio',
  '구독자 대비 조회수가 터진 유튜브 쇼츠를 검색하고, 영상을 분석해 새 소재·대본·이미지/영상/BGM 프롬프트까지 한 번에 만듭니다.',
  '유튜브 떡상 쇼츠 검색부터 바이럴 분석, 소재 발굴, 대본 생성, 이미지·영상·BGM 프롬프트까지 한 흐름으로 만드는 프로그램입니다. 조회수÷구독자·채널 평균 대비·조회 속도로 떡상 등급을 계산해 작은 채널의 대박 영상을 찾고, Gemini는 영상을 직접 보고(GPT·Claude는 지표·댓글 기반 추정) 훅·전개·연출 공식을 분석합니다. 분석한 공식으로 소재 6개를 제안하고, 씬당 한 문장 원칙의 대본과 Midjourney·AI 영상·Suno 프롬프트를 만들어 줍니다. 프로젝트는 30일간 저장되며 .md로 내보낼 수 있습니다. 회원 본인의 YouTube·AI API 키로 동작합니다.',
  'https://shorts-viral-studio.vercel.app',
  true,
  0,
  '861b7a37-d056-4404-80f5-85edb2e2ebff',  -- 최소 등급: 일반
  array['new'],
  'v1.01'
where not exists (select 1 from programs where slug = 'shorts-viral-studio');

insert into pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
select p.id, v.name, v.billing_type, v.price, v.price, true, v.sort_order
from programs p
cross join (values
  ('1개월', 'monthly', 10000, 0),
  ('2개월', 'bimonthly', 20000, 1),
  ('3개월', 'quarterly', 30000, 2)
) as v(name, billing_type, price, sort_order)
where p.slug = 'shorts-viral-studio'
  and not exists (select 1 from pricing_plans pp where pp.program_id = p.id);

insert into platform_guides (id, category, title, content, sort_order, is_active)
select
  '72d39d06-a7ca-4ab0-8327-f9bb085ac394',
  'SNS',
  'YouTube Data API 키 발급받기 (쇼츠 검색·분석용)',
  '<p>쇼츠 떡상 분석·대본 자동화에서 쇼츠를 검색하고 조회수·구독자·댓글을 가져오는 데 쓰는 <strong>YouTube Data API v3 키</strong>를 발급받는 방법입니다. 구글 계정만 있으면 무료로 발급받을 수 있습니다.</p>
<ol>
<li><a href="https://console.cloud.google.com" target="_blank">console.cloud.google.com</a>(Google Cloud Console)에 구글 계정으로 로그인합니다.</li>
<li>상단의 프로젝트 선택 창에서 <strong>새 프로젝트</strong>를 만듭니다. (이름 예: youtube-shorts-analyzer)</li>
<li>만든 프로젝트를 선택한 상태에서 상단 검색창에 <strong>YouTube Data API v3</strong>를 검색하고, 결과에서 해당 API를 열어 <strong>사용(Enable)</strong>을 누릅니다.</li>
<li>좌측 메뉴 <strong>API 및 서비스 → 사용자 인증 정보</strong>로 이동해 <strong>+ 사용자 인증 정보 만들기 → API 키</strong>를 누릅니다.</li>
<li>생성된 키(<code>AIza...</code>로 시작)를 복사합니다.</li>
<li>AI Master 프로그램의 <strong>API키등록·플랫폼연동</strong> 화면에서 <strong>YouTube Data API v3 키</strong> 칸에 붙여넣고 저장합니다.</li>
</ol>
<p>💡 <strong>할당량 안내:</strong> 기본 할당량은 하루 10,000유닛이고, 쇼츠 검색 1회에 약 100유닛이 사용됩니다(하루 약 100회 검색). 할당량을 다 쓰면 다음 날 자동으로 초기화됩니다.</p>
<p>🔒 <strong>보안 팁:</strong> 키 관리 화면에서 <strong>API 제한 → 키 제한</strong>을 눌러 <em>YouTube Data API v3</em>만 허용해 두면, 키가 유출돼도 다른 서비스에 쓰이지 않습니다. 키는 본인만 사용하고 다른 사람에게 공유하지 마세요.</p>',
  3,
  true
where not exists (select 1 from platform_guides where id = '72d39d06-a7ca-4ab0-8327-f9bb085ac394');
