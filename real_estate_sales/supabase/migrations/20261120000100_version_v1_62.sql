-- v1.62 (2026-11-20): 뉴스 의견 기사 뒤로·AI 요약 입력 지역별 상한(8767db0a8), 요약 입력 순서 지역 코드 기준(63e7c429f·e7084ca24), 다른 부동산 프로그램에 켠 지역 제안(a6544db4e).
-- 운영 DB 적용은 Master 별도 승인 뒤(이 배포 회차는 운영 쓰기 0).
update programs set version = 'v1.62', updated_at = now() where slug = 'real-estate-sales';
