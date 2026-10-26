-- 스마트스토어 상품등록 자동화 v1.03 — 확장 보정 묶음 배포(섹션 펼치기·에디터 팝업·사진 가로채기·맨 앞 창·버전 표시·연결됨 표시·한국 시간·팝업 허용 안내)
update public.programs set version = 'v1.03', extension_version = 'v1.03', updated_at = now() where slug = 'smartstore-register';
select version, extension_version, extension_download_url from public.programs where slug = 'smartstore-register';
