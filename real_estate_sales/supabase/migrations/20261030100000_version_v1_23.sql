-- real-estate-sales v1.23: RE-B4 경기·인천 지역 확장(국토부 아파트 매매 실거래가 API) + RE-B5 zod 보안 업데이트 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.23', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
