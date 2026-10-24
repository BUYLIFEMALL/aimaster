-- v1.19 (2026-10-25): 실거래 상세 「🔔 이 단지 새 매물 알림 받기」 버튼(AI 부동산 매물 알림 자동화 감시 대상으로 연결) + 미배포 대기였던 공용 사본(solapi-client·telegram-bot-client)·지역 분위기 30일 정리 기록 함께 배포. 버전만. 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs set version='v1.19', updated_at=now() where slug='real-estate-sales' returning slug, version;
