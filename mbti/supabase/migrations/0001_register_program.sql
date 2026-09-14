-- personality-code(성격코드)를 루트 AIMaster 앱의 programs 카탈로그에 등록한다.
-- MCP로 즉시 적용했고(2026-09-14), 이 파일은 그 기록용이다.
--
-- 이 프로그램은 로그인/구독이 필요 없는 완전 무료 공개 사이트라, 다른 서브프로젝트와
-- 달리 pricing_plans/grade_program_access 행을 만들지 않았다(2026-09-14 사용자 결정 —
-- "요금제 없이 무료로만 등록"). required_grade_id는 다른 모든 프로그램과 동일하게
-- "일반"(가장 낮은 기본 등급) 값을 넣어뒀지만, 실제 mbti 사이트 자체에는
-- requireProgramAccess() 같은 로그인/권한 체크가 전혀 없다(mbti/AGENTS.md 참고) —
-- 이 값은 카탈로그 표시 목적일 뿐 실제 접근을 막지 않는다.
insert into programs (
  category_id, name, slug, short_desc, description, thumbnail_url, app_url,
  is_active, sort_order, required_grade_id, badges
) values (
  '729e7dd9-571e-4f2b-adb8-0ff941edbea1', -- 기타
  '성격코드',
  'personality-code',
  '로그인 없이 무료로 해보는 성격유형 테스트. 20문항 빠른 검사 또는 60문항 정식 검사 중 골라서, 결과를 카카오톡/인스타로 바로 공유할 수 있어요.',
  '<p>가입이나 로그인 없이 누구나 바로 이용할 수 있는 무료 성격유형 테스트입니다. 20문항짜리 빠른 검사와 60문항짜리 정식 검사 중 골라서 응시하면, 4개 이분지표(외향-내향, 감각-직관, 사고-감정, 판단-인식)를 바탕으로 16가지 유형 중 하나로 결과를 보여드립니다. 결과 페이지는 카카오톡/인스타그램에 공유하면 유형별 카드 이미지가 미리보기로 뜨도록 만들어져 있어, 친구들과 결과를 주고받으며 놀기 좋습니다.</p>',
  null,
  'https://mbti-rho-two.vercel.app',
  true,
  110,
  '861b7a37-d056-4404-80f5-85edb2e2ebff', -- 일반
  array['free']
);
