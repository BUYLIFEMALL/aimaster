-- 프로그램 이름 변경 (2026-10-25 주인님 지시: 「부동산 실시간 매물 알림」) — 운영 DB esgxyikcnnvmlhygjkth
update public.programs set name = '부동산 실시간 매물 알림', updated_at = now() where slug = 'realty-listing-alert' returning slug, name;
