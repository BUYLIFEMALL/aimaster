-- real-estate-sales v1.32: 공공데이터포털 공용 키 교체 적용, 지역당 20건 안내 문구 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.32', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
