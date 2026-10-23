-- v1.04 (2026-10-13): 회원 각자 본인 Google 앱 등록 방식 확정 + Drive 연동용 전용 매뉴얼
--  - 주인님 결정(2026-10-13): AIMaster 기본 정책에 따라 회원이 각자 본인 Google Cloud OAuth 클라이언트를 등록한다. 운영자 공용 앱 예외는 사용하지 않는다.
--  - platform_guides에 "Google Drive 연동용 OAuth 클라이언트 만들기 (웹 애플리케이션·JavaScript 원본)" 게시글 추가(id 7d473e83-e9ce-4f68-ab52-92015a98148e). 본문은 운영 DB에 직접 등록했다.
--    기존 "Google OAuth 클라이언트 만들기 (Gmail·Drive 등)"는 서버 OAuth(리디렉션 URI·Client Secret) 안내라 이 앱 방식과 달라 연결하지 않는다.
UPDATE public.programs SET version = 'v1.04', updated_at = NOW() WHERE slug = 'markdown-studio';
