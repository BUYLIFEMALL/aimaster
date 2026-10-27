-- v1.07 「상품속성 미입력 확인」 창 자동 넘기기·완료 창에서 상품번호 읽기 (2026-10-27, 운영 ref esgxyikcnnvmlhygjkth)
update programs
set version = 'v1.07',
    extension_version = 'v1.07',
    extension_download_url = 'https://smartstore-register.buylife.xyz/downloads/smartstore-register-extension-latest.zip',
    updated_at = now()
where slug = 'smartstore-register';
