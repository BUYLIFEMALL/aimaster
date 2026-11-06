-- v1.56 (2026-11-06): 비주거 리포트 상권 칸 가장 가까운 상권 참고 열(#20) + 서울 분양권 동 코드 채우기(#21). 표 변경 없음.
update public.programs set version = 'v1.56', updated_at = now() where slug = 'real-estate-sales';
