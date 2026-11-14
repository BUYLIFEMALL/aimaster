-- 대상 DB: AIMaster 운영 (ref esgxyikcnnvmlhygjkth)
-- 목적: 2026-11-14 주인님 「OpenAI / Claude / Gemini 사용자별로 플랫폼과 모델을 직접 선택해서 사용할수 있도록」
--       주제마다 리포트 글 정리 모델을 저장한다. 비어 있으면 기본 모델(gpt-6.1-terra, src/lib/textModels.ts).
-- 기존 행 변경 없음(칼럼 추가만).
-- 되돌리기: alter table public.kakao_topics drop column if exists text_model;
alter table public.kakao_topics add column if not exists text_model text;
