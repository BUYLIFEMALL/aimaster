-- commercial-land-trade-alert v1.35 (2026-11-19, 주인님 채팅 빌드 승인)
-- 묶음: 일부만 읽은 회차의 감시 화면 이전 결과 보존(확장), 관심 지역 연계 2단계, 로그인 정책 2건(로그아웃 이 브라우저만·서버 로그인 기기 정보)
update public.programs
set version = 'v1.35',
    extension_version = 'v1.35',
    extension_download_url = 'https://commercial-land-trade-alert.buylife.xyz/downloads/commercial-land-trade-alert-extension-latest.zip',
    updated_at = now()
where slug = 'commercial-land-trade-alert';
