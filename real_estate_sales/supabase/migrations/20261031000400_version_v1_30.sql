-- real-estate-sales v1.30: 면적 맞추기 범위 축소, 거래 신고 면적 우선, 특수 거래 표시 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.30', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
