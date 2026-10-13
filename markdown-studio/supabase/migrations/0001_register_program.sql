-- 마크다운 문서 자동화(markdown-studio) v1.01 프로그램 등록 (2026-10-13)
--  - 참고 원본: markdown-studio-mauve.vercel.app (공개 번들 분석 후 직접 새로 구현)
--  - 문서는 회원 브라우저(IndexedDB)에 저장하며 서버 테이블·저장소가 필요 없다. AI API 키도 필요 없다.
--  - 카테고리: Tools, 최소 등급: 일반, FREE+new 배지(운영자 실비 없는 브라우저 기능)
--  - 요금제: 플랫폼 표준 1·2·3개월 (FREE 배지를 뗄 때를 대비해 함께 등록)
--  - 현재 제공 범위: 편집·미리보기·보관함·원문(.md) 내려받기. HTML/PDF/Word 변환·가져오기/백업·Drive 연동은 후속 단계(설명에 명시).
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
VALUES (
  'markdown-studio',
  '마크다운 문서 자동화',
  '마크다운 문서를 서식 도구로 편집하고 실시간 미리보기로 확인하며 폴더로 정리해 보관하는 문서 작업실',
  '마크다운 문서를 쓰고 바로 완성된 모습으로 확인하는 문서 작업실입니다. 제목·굵게·목록(글머리·숫자·알파벳·체크)·표·코드·링크·이미지·특수기호 서식 도구와 단축키, 찾기·바꾸기, 실행 취소를 지원하고, 문서와 폴더를 정리하며 수정 이력 30개와 휴지통으로 복원할 수 있습니다. 문서는 로그인한 계정별로 이 브라우저에 자동 저장되며 다른 기기로 자동 전달되지 않으므로 중요한 문서는 마크다운 원문(.md)으로 내려받아 보관하세요. HTML·PDF·Word 변환, 파일 가져오기·백업, 본인 Google Drive 연동은 단계적으로 추가할 예정입니다. AI 키는 필요하지 않습니다.',
  'https://markdown-studio.buylife.xyz',
  'v1.01',
  true,
  ARRAY['new','free']::text[],
  '729e7dd9-571e-4f2b-adb8-0ff941edbea1',
  '861b7a37-d056-4404-80f5-85edb2e2ebff'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, short_desc = EXCLUDED.short_desc, description = EXCLUDED.description,
  app_url = EXCLUDED.app_url, version = EXCLUDED.version, is_active = EXCLUDED.is_active,
  badges = EXCLUDED.badges, category_id = EXCLUDED.category_id, required_grade_id = EXCLUDED.required_grade_id,
  updated_at = NOW();

INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
SELECT p.id, v.name, v.bt, v.price, v.price, true, v.so
FROM public.programs p
CROSS JOIN (VALUES ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)) AS v(name, bt, price, so)
WHERE p.slug = 'markdown-studio'
  AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

-- VIP(드림AI팀)는 모든 프로그램 사용 등급이므로 등급 표에도 추가한다
INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'markdown-studio'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);
