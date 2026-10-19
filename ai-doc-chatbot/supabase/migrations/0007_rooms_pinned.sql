-- 2026-10-19 v1.06 U3 대화 고정: 채팅방에 고정 여부 칸 추가(기존 대화는 모두 고정 안 됨).
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. 코드는 이 칸이 없어도 동작(고정 버튼만 숨김)하도록 만들어 두었다.
alter table public.dcb_rooms add column if not exists pinned boolean not null default false;

update programs set version = 'v1.06', updated_at = now() where slug = 'ai-doc-chatbot';
