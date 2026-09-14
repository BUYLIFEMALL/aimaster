-- mbti-character(캐릭코드)를 루트 AIMaster 앱의 programs 카탈로그에 등록한다.
-- MCP로 즉시 적용했고(2026-09-14), 이 파일은 그 기록용이다.
--
-- mbti(성격코드)와 동일한 이유로 로그인/구독이 필요 없는 완전 무료 공개 사이트라,
-- pricing_plans/grade_program_access 행을 만들지 않는다. required_grade_id는 다른 모든
-- 프로그램과 동일하게 "일반"(가장 낮은 기본 등급) 값을 넣어뒀지만, 실제 mbti-character
-- 사이트 자체에는 requireProgramAccess() 같은 로그인/권한 체크가 전혀 없다
-- (mbti-character/AGENTS.md 참고) — 이 값은 카탈로그 표시 목적일 뿐 실제 접근을 막지 않는다.
insert into programs (
  category_id, name, slug, short_desc, description, thumbnail_url, app_url,
  is_active, sort_order, required_grade_id, badges
) values (
  '729e7dd9-571e-4f2b-adb8-0ff941edbea1', -- 기타
  '캐릭코드(MBTI) 측정기',
  'mbti-character',
  '로그인 없이 무료로 해보는 캐릭터 매칭 성격유형 테스트. 20문항 검사 후 나와 꼭 닮은 오리지널 캐릭터를 찾아 카카오톡/인스타로 바로 공유할 수 있어요.',
  '<p>가입이나 로그인 없이 누구나 바로 이용할 수 있는 무료 성격유형 테스트입니다. 20문항 검사에 응시하면 4개 이분지표(외향-내향, 감각-직관, 사고-감정, 판단-인식)를 바탕으로 16가지 유형 중 하나를 찾아주고, 유형 코드만 보여주는 대신 이 서비스만을 위해 새로 창작한 오리지널 캐릭터로 결과를 매칭해줍니다. 결과 페이지는 카카오톡/인스타그램에 공유하면 캐릭터별 카드 이미지가 미리보기로 뜨도록 만들어져 있어, 친구들과 결과를 주고받으며 놀기 좋습니다.</p>',
  null,
  'https://mbti-character.vercel.app',
  true,
  111,
  '861b7a37-d056-4404-80f5-85edb2e2ebff', -- 일반
  array['free']
);
