-- v1.05 실제 시험 보정 모음(배송 selectize·임시저장 버튼·에디터 대기·첫 화면 재이동·전시 상태 칸·중복 등록 막기) (2026-10-27, 운영 ref esgxyikcnnvmlhygjkth)
update programs
set version = 'v1.05',
    extension_version = 'v1.05',
    extension_download_url = 'https://smartstore-register.buylife.xyz/downloads/smartstore-register-extension-latest.zip',
    updated_at = now()
where slug = 'smartstore-register';
