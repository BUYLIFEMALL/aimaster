-- threads-content-ops v1.69 버전 갱신
-- 쿠팡 파트너스 상품 등록 시 공식 Deeplink API를 통한 34자 단축 링크(link.coupang.com/a/...) 자동 생성 및 변환 저장 탑재
-- (검색 결과의 220자짜리 긴 URL 대신 34자 단축 링크로 자동 치환 저장되어 Threads 500자 제한 내 본문 공간 400자 이상 확보)

update public.programs set version = 'v1.69' where slug = 'threads-content-ops';
