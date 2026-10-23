-- AI 4컷 만화 자동화 (slug: four-cut-comics) — v1.05 서버 보관함(선택 기능) (2026-10-14, 주인님 승인)
-- DB 테이블 없이 비공개 버킷 하나만 쓴다: `<userId>/index.json`(목록·대본·만료일) + `<userId>/<id>.jpg`(완성작 바둑판 이미지).
-- 버킷은 비공개이고 정책(RLS)을 두지 않아 service role(서버)만 접근한다. 서버 코드는 로그인 회원의 user.id 폴더로만 경로를 만든다
-- (src/lib/saved.ts). 회원당 최대 30개, 보관 기간 7·30·90일 또는 직접 삭제할 때까지 — 만료분은 목록·저장 때 서버가 지운다.
-- 적용: 2026-10-14 service role 스크립트의 storage.createBucket으로 생성(이 세션에 SQL 실행 도구가 없어 아래 SQL과 같은 결과를 API로 만듦).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('four-cut-comics-files', 'four-cut-comics-files', false, 5000000, array['image/jpeg', 'application/json'])
on conflict (id) do nothing;

-- 버전
update public.programs set version = 'v1.05', updated_at = now() where slug = 'four-cut-comics';
