# 스마트스토어 상품등록 자동화 — 작업 대기 목록

## 1단계 마무리 (주인님 승인 필요)
- [ ] 운영 DB 마이그레이션 `supabase/migrations/20261026_smartstore_register_v1_01.sql`
- [ ] Vercel 새 프로젝트 `smartstore-register` + 도메인 + 환경변수 → 배포 1회 → 시험 계정 화면 확인
- [ ] 0-2단계 자료: HTML 작성 붙여 넣기 시험 결과, 이미지 창·카테고리 목록 저장본

## 2단계 — 확장
- [ ] `extension/` 연결 코드·작업 받기·결과 보고(블로그 확장 구조 재사용)
- [ ] `smartstore.js`: `type`·`radio`·`check`·`search_pick`(selectize)·`images`·`html`·`button` 동작
- [ ] 이미지 넣기 방식 확정(외부 주소 / 네이버 사진 보관함 먼저 올리기)
- [ ] 확장 ZIP·DB `extension_version`·`extension_download_url`, 새 버전 알림

## 그다음
- [ ] 옵션(색·크기), 검색 태그(E2 등록 정보 도우미 뒤), 여러 상품 연속 처리
- [ ] 쇼핑몰 흐름 띠(`shop-flow`)에 이 단계 넣기
- [ ] 쿠팡용 프로그램(같은 구조 복사)
