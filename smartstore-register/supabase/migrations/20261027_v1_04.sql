-- v1.04 배송 칸 자동 입력(템플릿 고르기·직접 입력) + 확장 버전 확인 (2026-10-27, 운영 ref esgxyikcnnvmlhygjkth)
update programs
set version = 'v1.04',
    extension_version = 'v1.04',
    extension_download_url = 'https://smartstore-register.buylife.xyz/downloads/smartstore-register-extension-latest.zip',
    updated_at = now()
where slug = 'smartstore-register';
