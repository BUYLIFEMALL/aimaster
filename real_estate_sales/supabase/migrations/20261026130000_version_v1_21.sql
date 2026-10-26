-- real-estate-sales v1.21: 실거래 목록 쪽 나누기(RE-B1) · 열어 본 실거래 확인됨(RE-B2) · 네이버 부동산 바로가기(RE-N1) · CSV 내려받기(RE-N2) (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.21', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
