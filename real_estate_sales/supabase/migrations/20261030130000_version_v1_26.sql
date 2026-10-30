-- real-estate-sales v1.26: 화성시 4개 구·인천 개편 구 코드(국토부 법정동 자료 대조), 경기·인천 필지 번호(동 이름→법정동 코드·지번 나누기), 브이월드 공시가 오류 로그 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.26', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
