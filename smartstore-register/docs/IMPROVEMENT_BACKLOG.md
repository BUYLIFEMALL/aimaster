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

- [x] **(우선, 2026-10-27 완료·미배포) 같은 상품 「바로 등록」 중복 막기** — 2026-10-27 실제 시험에서 같은 상품 「바로 등록」 작업이 10분 간격으로 두 번 만들어짐(두 번째는 확장이 가져가기 전에 취소해 중복 등록은 없었음). 지금은 「진행 중(대기·입력 중)」 작업만 막음 → 같은 상품에 「등록 완료」 기록이 있으면 「바로 등록」을 막거나 한 번 더 확인 받기(`src/lib/actions/register.ts` createJobAction).
- [ ] 「바로 등록」 결과에 상품번호가 안 남음(10:50 작업 결과 「—」) — 저장 뒤 완료 창·주소에서 상품번호 읽는 방법 확인(완료 화면 저장본 필요).

## 그다음
- [ ] 옵션(색·크기), 검색 태그(E2 등록 정보 도우미 뒤), 여러 상품 연속 처리
- [ ] 쇼핑몰 흐름 띠(`shop-flow`)에 이 단계 넣기
- [ ] 쿠팡용 프로그램(같은 구조 복사, [`../../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md`](../../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md) §6 점검표대로)
- [ ] 화면 변경 대비: 칸 이름이 안 맞으면 라벨 글자로 한 번 더 찾기(예비 찾기) — 레퍼런스 §4
- [ ] 화면 변경 조기 발견: 주 1회 「입력만」 점검 작업 — 레퍼런스 §4
