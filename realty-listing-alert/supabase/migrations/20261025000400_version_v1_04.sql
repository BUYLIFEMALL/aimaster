-- v1.04 (2026-10-25, UX 리뉴얼: 시작하기 체크리스트, 네이버 단지 화면 추가 버튼, 감시 대상·팝업 단순화, 매뉴얼 5단계 + 2페이지 읽기·단지 이름·주소 판별 수정, 네이버 바로가기). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.04',
    extension_version = 'v1.04',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
