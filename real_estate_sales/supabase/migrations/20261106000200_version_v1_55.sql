-- v1.55 (2026-11-06): 분양권이 회당 저장 상한 20건에 밀리던 문제(presaleFirst) + R-ONE 상권 좌표 보강(검색어 후보·?retry=missing). 표 변경 없음.
update public.programs set version = 'v1.55', updated_at = now() where slug = 'real-estate-sales';
