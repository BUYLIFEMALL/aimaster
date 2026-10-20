-- v1.18 (2026-10-21): 텔레그램 연동 공용 모듈 telegram-bot-client 사본(동작 같음) + 미배포였던 연동 확인 수정(allowed_updates) 등 함께 배포. 버전만
update public.programs set version='v1.18', updated_at=now() where slug='real-estate-sales';
