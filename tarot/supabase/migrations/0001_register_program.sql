-- tarot(AI 타로)를 루트 AIMaster 앱의 programs 카탈로그에 등록한다.
-- MCP로 즉시 적용했고, 이 파일은 그 기록용이다(루트 CLAUDE.md "서브프로젝트 작업물은
-- 반드시 해당 서브프로젝트 폴더 안에서 관리한다" 원칙).
--
-- mbti-character와 동일하게 로그인만 하면 이용할 수 있는 무료 프로그램이라
-- required_grade_id는 "일반"(가장 낮은 기본 등급)으로 등록한다. category_id는 마땅한
-- 전용 카테고리가 없어 mbti-character와 동일하게 "기타"를 썼다.
insert into programs (
  category_id, name, slug, short_desc, description, thumbnail_url, app_url,
  is_active, sort_order, required_grade_id, badges
) values (
  '729e7dd9-571e-4f2b-adb8-0ff941edbea1', -- 기타
  'AI 타로',
  'tarot-reading',
  '로그인 후 무료로 즐기는 AI 타로 리딩. 질문을 입력하고 카드 3장(과거-현재-미래)을 뽑으면, AI가 그린 카드 일러스트와 AI가 풀어주는 타로 해석을 바로 확인할 수 있어요.',
  '<p>AIMaster 계정으로 로그인하면 누구나 이용할 수 있는 무료 타로 리딩 서비스입니다. 마음에 품은 질문을 짧게 입력하고 78장의 정통 타로 덱(메이저 아르카나 22장 + 마이너 아르카나 56장) 중 3장을 뽑으면, 과거-현재-미래 3카드 스프레드로 지금의 흐름을 짚어드립니다. 본인의 Gemini API 키를 등록하면 뽑힌 카드마다 AI가 매번 새로 그린 일러스트를 볼 수 있고, OpenAI API 키를 등록하면 세 장의 카드를 하나로 엮은 개인 맞춤 해석까지 받아볼 수 있습니다. 카드 일러스트는 특정 상업 타로 덱의 원화를 스캔하지 않고 카드 이름과 방향(정/역방향) 정보만으로 매번 새로 생성합니다.</p>',
  null,
  'https://tarot-eight-jet.vercel.app',
  true,
  112,
  '861b7a37-d056-4404-80f5-85edb2e2ebff', -- 일반
  array['new']
);
