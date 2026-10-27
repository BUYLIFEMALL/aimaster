-- 이커머스 한 흐름: 회원 최종 검토 표시 (2026-10-27, 운영 ref esgxyikcnnvmlhygjkth)
-- null = 검토 전, 시각 = 회원이 「검토 완료」를 누른 때. 상세페이지 → 마켓 등록(스마트스토어, 이후 쿠팡·11번가·G마켓·옥션)으로 넘길 기준.
alter table public.shop_products add column if not exists reviewed_at timestamptz;
comment on column public.shop_products.reviewed_at is '회원이 상세페이지 최종 검토를 마친 시각(null=검토 전)';
