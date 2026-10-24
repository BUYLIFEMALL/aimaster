-- v1.19 영상 프롬프트 게시판 A안 (AI 영상 스튜디오, 영상 담당 claude-win-video, 2026-10-24 주인님 승인)
-- 운영 DB esgxyikcnnvmlhygjkth. 회원끼리 공유하는 기능은 없다(생성 데이터는 회원 본인 소유).
-- ① avs_preset_prompts: 게시판 예시. 로그인 회원은 공개분만 읽음. 쓰기 정책 없음 — 관리자 API(서버 키 + 코드에서 is_admin 확인)만 씀.
-- ② avs_user_prompts: 내 프롬프트. 본인 줄만 읽기·넣기·지우기. 30일 뒤 /api/cron/cleanup이 지움.

create table if not exists public.avs_preset_prompts (
  id text primary key check (id ~ '^[a-z0-9-]{3,60}$'),
  category text not null check (category in ('nature','city','food','product','people','fantasy')),
  title text not null check (char_length(title) between 1 and 40),
  idea text not null check (char_length(idea) between 2 and 1200),
  style_id text not null,
  camera_id text not null,
  input text not null default 'text' check (input in ('text','photo')),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.avs_preset_prompts enable row level security;
drop policy if exists avs_preset_prompts_select_published on public.avs_preset_prompts;
create policy avs_preset_prompts_select_published on public.avs_preset_prompts for select to authenticated using (is_published);

create table if not exists public.avs_user_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  idea text not null check (char_length(idea) between 2 and 1200),
  style_id text,
  camera_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
create index if not exists avs_user_prompts_user_idx on public.avs_user_prompts (user_id, created_at desc);
create index if not exists avs_user_prompts_expires_idx on public.avs_user_prompts (expires_at);
alter table public.avs_user_prompts enable row level security;
drop policy if exists avs_user_prompts_select_own on public.avs_user_prompts;
create policy avs_user_prompts_select_own on public.avs_user_prompts for select to authenticated using (auth.uid() = user_id);
drop policy if exists avs_user_prompts_insert_own on public.avs_user_prompts;
create policy avs_user_prompts_insert_own on public.avs_user_prompts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists avs_user_prompts_delete_own on public.avs_user_prompts;
create policy avs_user_prompts_delete_own on public.avs_user_prompts for delete to authenticated using (auth.uid() = user_id);

-- 처음 값: v1.14 코드 속 예시 24개(lib/promptBoard.ts BOARD_PRESETS). 이미 있으면 건드리지 않음(관리자가 고친 값 보존)
insert into public.avs_preset_prompts (id, category, title, idea, style_id, camera_id, input, sort_order, is_published) values
  ('nature-sunrise-sea', 'nature', '동해 일출', '겨울 새벽 동해 바다 위로 붉은 해가 천천히 떠오르고, 잔잔한 파도가 바위에 부서지며 물보라가 금빛으로 반짝인다', 'cinematic', 'push', 'text', 10, true),
  ('nature-autumn-forest', 'nature', '단풍 숲길', '붉고 노란 단풍잎이 바람에 흩날리는 산속 오솔길, 햇살이 나뭇잎 사이로 비스듬히 들어와 낙엽 위에 얼룩진 그림자를 만든다', 'cinematic', 'tracking', 'text', 20, true),
  ('nature-rice-terrace', 'nature', '황금 들판', '가을 저녁 노을 아래 끝없이 펼쳐진 황금빛 논, 벼 이삭이 바람에 파도처럼 일렁이고 멀리 산 능선이 겹겹이 보인다', 'drone', 'pan', 'text', 30, true),
  ('nature-waterfall', 'nature', '계곡 폭포', '이끼 낀 바위 사이로 맑은 물줄기가 쏟아지는 깊은 계곡 폭포, 물안개가 피어오르고 초록 잎에 물방울이 맺혀 떨어진다', 'cinematic', 'static', 'text', 40, true),
  ('city-seoul-rain', 'city', '비 오는 서울 밤거리', '비 오는 서울 밤 골목, 젖은 아스팔트에 간판 불빛이 번져 반사되고 우산을 쓴 사람들이 천천히 지나간다', 'cinematic', 'tracking', 'text', 50, true),
  ('city-han-river', 'city', '한강 야경', '해가 진 직후 한강 다리 위로 차량 불빛이 길게 이어지고, 강물에 도시 불빛이 일렁이며 하늘은 짙은 남색에서 보라색으로 물든다', 'drone', 'orbit', 'text', 60, true),
  ('city-hanok-alley', 'city', '한옥 골목 아침', '이른 아침 한옥이 늘어선 좁은 돌담 골목, 처마 끝에 햇살이 닿고 기와지붕 위로 옅은 안개가 걷힌다', 'cinematic', 'push', 'text', 70, true),
  ('city-timelapse', 'city', '빌딩 숲 타임랩스', '고층 빌딩 사이로 구름이 빠르게 흘러가고 낮에서 밤으로 바뀌며 창문 불빛이 하나둘 켜지는 도심 풍경', 'documentary', 'static', 'text', 80, true),
  ('food-latte', 'food', '창가 라테', '비 오는 오후 카페 창가 원목 테이블 위 라테에서 김이 피어오르고, 창밖 빗방울이 유리를 타고 흘러내린다', 'cinematic', 'push', 'text', 90, true),
  ('food-sizzling', 'food', '지글지글 삼겹살', '숯불 석쇠 위에서 삼겹살이 지글지글 익으며 기름이 튀고 연기가 피어오르는 클로즈업, 옆에 마늘과 쌈채소가 놓여 있다', 'product', 'static', 'text', 100, true),
  ('food-noodle', 'food', '국수 들어 올리기', '뜨거운 국물에서 젓가락으로 면을 천천히 들어 올리자 김이 피어오르고 국물 방울이 떨어지는 클로즈업', 'product', 'push', 'text', 110, true),
  ('food-bakery', 'food', '갓 구운 빵', '빵집 오븐 문이 열리며 노릇하게 구워진 크루아상이 담긴 철판이 나오고, 따뜻한 조명 아래 김과 밀가루가 흩날린다', 'cinematic', 'push', 'text', 120, true),
  ('product-cosmetic', 'product', '화장품 병 공개', '물결이 일렁이는 맑은 물 위에 놓인 화장품 병, 물방울이 병 표면을 타고 흐르고 부드러운 빛이 천천히 병을 비춘다', 'product', 'orbit', 'photo', 130, true),
  ('product-sneaker', 'product', '운동화 회전', '어두운 스튜디오 회전대 위의 운동화가 천천히 돌고, 측면 조명이 소재의 질감과 박음질을 하나씩 비춘다', 'product', 'orbit', 'photo', 140, true),
  ('product-perfume', 'product', '향수 꽃잎', '유리 향수병 주위로 분홍 꽃잎이 천천히 떨어지고, 병 안의 액체가 빛을 받아 반짝인다', 'product', 'push', 'photo', 150, true),
  ('product-gadget', 'product', '전자기기 언박싱', '흰 상자 뚜껑이 천천히 열리며 안에 담긴 전자기기가 드러나고, 깔끔한 흰 배경에 부드러운 그림자가 진다', 'product', 'push', 'photo', 160, true),
  ('people-runner', 'people', '새벽 러닝', '새벽 한강 공원 산책로를 달리는 20대 한국인 여성, 숨결이 하얗게 번지고 뒤로 해가 떠오르며 역광이 실루엣을 만든다', 'cinematic', 'tracking', 'text', 170, true),
  ('people-grandma', 'people', '할머니의 손맛', '시골집 부엌에서 70대 한국인 할머니가 미소 지으며 가마솥 뚜껑을 열자 하얀 김이 피어오르고 창으로 햇살이 들어온다', 'documentary', 'static', 'text', 180, true),
  ('people-study', 'people', '밤샘 공부', '늦은 밤 책상 스탠드 불빛 아래 공책에 필기하는 한국인 대학생, 창밖으로 도시 불빛이 흐릿하게 보인다', 'cinematic', 'push', 'text', 190, true),
  ('people-wedding', 'people', '야외 웨딩', '초여름 야외 정원에서 한국인 신랑 신부가 손을 잡고 걸어가고, 하객들이 뿌린 꽃잎이 햇살 속에 흩날린다', 'cinematic', 'tracking', 'text', 200, true),
  ('fantasy-cat', 'fantasy', '창가 고양이', '햇살 드는 창가에서 졸던 치즈 고양이가 하품을 하고 기지개를 켜며 꼬리를 천천히 흔든다', 'cinematic', 'static', 'text', 210, true),
  ('fantasy-fox', 'fantasy', '눈 속 여우', '눈 덮인 자작나무 숲에서 붉은 여우가 귀를 쫑긋 세우고 눈밭을 사뿐히 걸어간다', 'pixar', 'tracking', 'text', 220, true),
  ('fantasy-whale', 'fantasy', '하늘을 나는 고래', '노을 진 구름 바다 위로 거대한 고래가 천천히 헤엄치듯 날아가고, 지느러미에서 반짝이는 빛 가루가 흩날린다', 'anime', 'pan', 'text', 230, true),
  ('fantasy-lantern', 'fantasy', '풍등 축제', '밤하늘로 수백 개의 풍등이 천천히 떠오르고 호수 위에 불빛이 비치는 몽환적인 장면', 'anime', 'orbit', 'text', 240, true)
on conflict (id) do nothing;

select (select count(*) from public.avs_preset_prompts) as presets, (select count(*) from public.avs_user_prompts) as mine;
