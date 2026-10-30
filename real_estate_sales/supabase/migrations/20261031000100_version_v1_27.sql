-- real-estate-sales v1.27: 관심 지역 찾기 칸, 경기·인천 리 단위 법정동 코드(필지 번호) (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.27', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
