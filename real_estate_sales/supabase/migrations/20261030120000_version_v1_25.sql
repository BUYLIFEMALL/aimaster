-- real-estate-sales v1.25: 실거래 목록 ?district=·?q= 거르기(매물 알림 「📈 실거래 보기」 연결), 경기 감시 지역 시 이름 묶기 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.25', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
