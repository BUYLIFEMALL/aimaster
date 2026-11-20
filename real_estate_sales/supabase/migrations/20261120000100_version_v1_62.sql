-- v1.62 (2026-11-20): 뉴스 의견 기사 뒤로·AI 요약 입력 지역별 상한(8767db0a8), 요약 입력 순서 지역 코드 기준(63e7c429f·e7084ca24), 다른 부동산 프로그램에 켠 지역 제안(a6544db4e).
-- 운영 DB 적용 완료 2026-11-20 03:45 UTC(주인님 채팅 승인 「진행하고 MASTER에게 보고해」): 조건 version = 'v1.61'일 때만 갱신, 갱신 뒤 다시 읽어 v1.62 확인.
update programs set version = 'v1.62', updated_at = now() where slug = 'real-estate-sales';
