-- real-estate-sales v1.22: VWorld 등록 도메인을 real-estate-sales.buylife.xyz로(RE-B3, 환경변수 VWORLD_REGISTERED_DOMAIN 교체·코드 기본값 맞춤) (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.22', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
