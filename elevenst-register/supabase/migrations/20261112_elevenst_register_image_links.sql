-- AI 11번가 상품 자동등록기(elevenst-register) 4단계 — 짧은 이미지 주소 표
-- 대상 DB: AIMaster 운영 ref esgxyikcnnvmlhygjkth. 주인님 승인(2026-11-12 채팅 「진행해」) 뒤 ego SQL 편집기에서 실행.
-- 11번가는 대표·추가 이미지(prdImage01~04)를 주소로 받아 자기 서버에 저장한다. 상세페이지 이미지는 비공개 저장소라
-- 로그인 없이 받아 갈 수 있는 /i/<id> 주소를 만든다(쿠팡 운영 coupang_ops_image_links와 같은 모양).
-- 주소는 추측 못 하는 22자 id, 30일 뒤 만료·정리(관리자·시험 계정 retention_exempt 열외). 회원 화면에서는 읽지도 쓰지도 않고 서버(서비스 키)만 쓴다.

create table if not exists public.elevenst_register_image_links (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists elevenst_register_image_links_user on public.elevenst_register_image_links (user_id, created_at desc);
alter table public.elevenst_register_image_links enable row level security;
-- 정책 없음 = 회원(anon·authenticated)은 읽기·쓰기 모두 막힘, 서비스 키만 사용

-- 확인
select to_regclass('public.elevenst_register_image_links') as image_links_table,
       (select relrowsecurity from pg_class where oid = 'public.elevenst_register_image_links'::regclass) as rls_on;
