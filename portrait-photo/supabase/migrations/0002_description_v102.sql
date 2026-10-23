-- AI 인물사진 자동화 (slug: portrait-photo) — v1.02 카탈로그 설명 갱신 (2026-10-14). 스키마 변경 없음.
UPDATE public.programs SET
  short_desc = '사진 한 장으로 증명사진·비즈니스 프로필·SNS·시네마틱 화보 인물 사진을 후보 여러 장으로 만들고 순백 배경·여권·비자 규격까지 저장하는 AI 인물사진 스튜디오',
  description = description || ' 한 번에 2~4장의 후보를 동시에 만들어 고를 수 있고, 여권·운전면허(413×531), 주민등록증·이력서(354×472), 미국 비자(600×600), 반명함(709×945) 규격으로 저장하며, 원본과 결과를 슬라이더로 비교할 수 있습니다.',
  version = 'v1.02',
  updated_at = NOW()
WHERE slug = 'portrait-photo' AND description NOT LIKE '%후보를 동시에%';
