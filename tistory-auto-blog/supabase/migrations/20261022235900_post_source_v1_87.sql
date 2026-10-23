-- v1.87 (2026-10-22): 「글감 출처」 — 글감에서 만든 글에 원본 주소·모은 날짜·만료일을 남긴다(주인님 승인).
-- 빈 칸으로 시작하는 칸 하나만 추가한다. 기존 글은 비어 있고, RLS·권한·다른 칸은 바꾸지 않는다. 글은 기존 30일 정리 작업으로 함께 지워진다.
alter table public.tistory_posts add column if not exists source jsonb;
comment on column public.tistory_posts.source is '글감 출처 {candidateId, kind, label, url, collectedAt, expiresAt} — utils/postSource.ts';
