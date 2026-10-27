-- v1.06 저장 결과 확인·AngularJS 칸 입력·고시 전화번호·어린이제품인증 기본값·탭 다시 쓰기 (2026-10-27, 운영 ref esgxyikcnnvmlhygjkth)
update programs
set version = 'v1.06',
    extension_version = 'v1.06',
    extension_download_url = 'https://smartstore-register.buylife.xyz/downloads/smartstore-register-extension-latest.zip',
    updated_at = now()
where slug = 'smartstore-register';
