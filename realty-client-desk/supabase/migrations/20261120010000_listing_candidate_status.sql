-- C-1(2026-11-20, 주인님 승인 CMD-20261120-013): 내 매물 상태에 비광고 「후보」 추가.
-- 매물 알림에서 넘겨받아 의뢰 확인 후 저장한 매물은 「후보」로 들어가고, 광고·문자 발송 대상이 아니다
-- (발송은 서버에서 「광고 중」만 허용 — src/lib/actions/listings.ts). 광고 시작은 회원이 목록에서 상태를 바꿀 때만.
-- 기본값은 그대로 「광고 중」(기존 수동 등록 동작 유지). 기존 행은 바뀌지 않는다.
-- 운영 적용은 별도 승인 뒤(이 파일 작성 시점 운영 DB 쓰기 0). 적용 전에 고객관리 v1.12를 배포하면 후보 저장이 제약 오류로 실패하므로 SQL 먼저.
alter table public.realty_desk_listings drop constraint if exists realty_desk_listings_status_check;
alter table public.realty_desk_listings
  add constraint realty_desk_listings_status_check check (status in ('광고 중', '계약', '내림', '후보'));
