-- AI 중개사무소 고객관리 4단계(2026-11-03, v1.05): 광고 명시 항목 점검 + 회원 본인 Claude 키 AI 초안
-- 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth. 근거: 공인중개사법 제18조의2, 시행령 제17조의2, 「표시·광고 명시사항 세부기준」(국토부 고시).
-- 사무소: 광고에 넣어야 하는 등록번호·개업공인중개사 성명 칸. 매물: AI 초안 1분 잠금(초안 글은 저장하지 않음 — 화면에만).
alter table public.realty_desk_offices add column if not exists reg_no text check (reg_no is null or char_length(reg_no) <= 40);
alter table public.realty_desk_offices add column if not exists broker_name text check (broker_name is null or char_length(broker_name) <= 20);
alter table public.realty_desk_listings add column if not exists ai_requested_at timestamptz;
-- 버전(programs.version v1.05)은 배포 뒤 scripts/deploy.mjs --set-version으로 맞춘다.
