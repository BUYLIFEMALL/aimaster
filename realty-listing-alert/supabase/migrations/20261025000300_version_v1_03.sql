-- v1.03 (2026-10-25, 3단계: 확장 수집 엔진·팝업·결과 화면, 확장 API 4개, 대시보드 내 PC 상태, 실거래 연계 미리 채우기, 봇 상태 배지, 다운로드 3D 버튼). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.03',
    extension_version = 'v1.03',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
