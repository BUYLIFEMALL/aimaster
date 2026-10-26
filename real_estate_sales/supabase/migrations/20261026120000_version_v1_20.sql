-- real-estate-sales v1.20: AI 프롬프트 당해 연도(RE-P3) · 예약 수집 권한 확인(RE-P2) · 생성 데이터 1년 보관 정리(RE-P1, 주인님 지정) (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.20', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
