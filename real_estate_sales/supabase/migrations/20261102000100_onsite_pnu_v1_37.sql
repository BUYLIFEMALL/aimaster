-- 임장 노트 지번 연결(v1.37, 2026-11-02 주인님 「전부 진행」).
-- 도로명주소 한글 전체분으로 건물마다 PNU(19자리)를 붙인 v2 격자에서, 30m 안 건물이면 PNU와 지번 표기를 함께 저장한다.
-- PNU로 기존 real_estate_land_info(개별공시지가·용도지역 캐시)를 그대로 재사용한다. 회원별 RLS는 기존 표 정책을 따른다.
alter table public.real_estate_onsite_properties
  add column if not exists pnu text check (pnu ~ '^\d{19}$'),
  add column if not exists jibun text check (char_length(jibun) <= 100);

update public.programs set version = 'v1.37', updated_at = now() where slug = 'real-estate-sales';
