-- real-estate-sales v1.28: 지역 찾기 낱말별 검색, 브이월드 공용 키 교체 적용 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.28', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
