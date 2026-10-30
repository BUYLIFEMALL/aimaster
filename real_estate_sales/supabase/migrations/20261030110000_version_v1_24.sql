-- real-estate-sales v1.24: 경기·인천 실거래 「전용」 빈칸 — 건축물대장에서 못 찾으면 국토부 자료의 전용면적을 씀 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.24', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
