-- real-estate-sales v1.31: 전국, 빌라·오피스텔, 유형 필터 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.31', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
