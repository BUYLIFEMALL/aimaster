-- 2026-11-04 v1.09: 현장 피드백 반영
-- 1) 고객 거래 입장(매매 = 매수/매도, 전세·월세 = 임차/임대). 기존 고객은 「원하는 거래」로 받았으므로 구하는 쪽(매수·임차)으로 채운다.
-- 2) 매물 유형 「빌라·주택」을 「다세대/빌라」·「다가구/주택」으로 나눔(+ 건물·분양권 추가는 코드 목록만).
--    고객: 두 유형을 모두 고른 것으로(원래 범위 유지). 매물: 「다세대/빌라」로(중개사가 고칠 수 있음).

alter table public.realty_desk_clients add column if not exists deal_side text;

update public.realty_desk_clients
   set deal_side = case when deal_type = '매매' then '매수' else '임차' end
 where deal_side is null;

alter table public.realty_desk_clients alter column deal_side set not null;

alter table public.realty_desk_clients drop constraint if exists realty_desk_clients_deal_side_check;
alter table public.realty_desk_clients add constraint realty_desk_clients_deal_side_check check (
  (deal_type = '매매' and deal_side in ('매수', '매도')) or
  (deal_type in ('전세', '월세') and deal_side in ('임차', '임대'))
);

update public.realty_desk_clients
   set property_types = array(
         select distinct t from unnest(array_remove(property_types, '빌라·주택') || array['다세대/빌라', '다가구/주택']) as t
       )
 where '빌라·주택' = any(property_types);

update public.realty_desk_listings set property_type = '다세대/빌라' where property_type = '빌라·주택';

update public.programs set version = 'v1.09', updated_at = now() where slug = 'realty-client-desk';
