-- real-estate-sales v1.29: 공시가 면적·층 맞추기, 경기·인천 전월세 비교 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.29', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
