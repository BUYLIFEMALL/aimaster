# 플랜 — threads-auto 이식: 쿠팡 검색 강화 · 네이버 브랜드커넥트 자동 수집 (2026-11-16)

- 담당: Claud(ecommerce) `claude-win-sdp` [역할: ecommerce-image] — 주인님 직접 배정(Codex(Master) 쉬는 중, 복귀 후 보고)
- 근거: 인수인계 [`HANDOFF_20261116_THREADS_AUTO_PORT.md`](HANDOFF_20261116_THREADS_AUTO_PORT.md), 분석 `threads-content-ops/docs/ANALYSIS_20261116_THREADS_AUTO.md` §0-5
- 원본: `boksajang/threads-auto` 커밋 `bd2fec7`(2026-10-21) — 저장소 밖 임시 폴더에 받아 읽기만 함(실행 안 함)
- 상태: **결정 완료(2026-11-16 주인님 채팅 「권장대로 진행해」 — §3 권장안 7건 모두 채택)**. 1단계 구현·로컬 검수 완료(미배포 대기, `docs/IMPROVEMENTS.md`), 2단계 대기.

## 0. 착수 전 확인 결과

| 항목 | 결과 |
|---|---|
| 쇼핑제휴 폴더 미커밋 변경 | 0 (남의 작업 없음) |
| 현재 버전 | 코드 `v1.87`(agy 「인플루언서 아틀리에」 개편 `b76988c3d`, 배포됨) |
| 상품 표 `affiliate_products` | 쿠팡 상품 번호 칸 없음 → 「이미 등록한 상품 빼기」는 `product_url`에서 번호를 뽑거나 칸을 추가해야 함(결정 6) |
| 확장 | 없음(`extension/` 폴더 없음, DB `extension_version` 빈 값) |
| **라이선스** | 원본 `package.json`에 `"license": "MIT"`만 있고 **LICENSE 파일(저작권자 줄)이 없음** → 결정 7 |

## 1. 원본 / AIMaster / 채택 표

### 1단계 — 쿠팡 상품 검색 강화 (확장 불필요)

| 기능 | 원본(`bd2fec7`) | 지금 쇼핑제휴 | 채택·이유 |
|---|---|---|---|
| 서명(HMAC)·딥링크·subId | `providers/coupang.ts` | `affiliate-clients/coupangApi.ts`에 있음(시간 제한·401/429 안내 포함) | **AIMaster 유지** — 이미 같고 안전장치가 더 많음 |
| 여러 키워드(쉼표) | 화면에서 나눠 `search` 반복 | 1개 | **원본 이식** — 키워드당 상위 10개 |
| 골드박스 | `goldbox()` | 없음 | **원본 이식** |
| 카테고리 베스트 19종 | `bestCategory()` + `coupang-catalog.ts` 목록 | 없음 | **원본 이식**(목록 그대로) |
| 쿠팡 PL 9개 브랜드 | `coupangPl()` + 목록 | 없음 | **원본 이식** |
| 합치기·중복 제거·정렬(골드박스 4·프레시 3·로켓 2·키워드 1점) | `coupang-product-selection.ts` 38줄 | 없음 | **원본 그대로 이식**(타입만 맞춤) |
| 로켓만 / 로켓프레시 중심 | 같은 파일 | 없음 | **원본 이식** |
| 이미 등록한 상품 빼기 + 「새 후보 N개」 | `excludedSourceKeys` | 없음 | **원본 이식** — 회원 본인 `affiliate_products`에서 상품 번호 모음 |
| 여러 개 체크 → 한 번에 등록 | 원본 검색 창 | 하나씩 | **원본 방식으로 화면 보강** |
| 수익 리포트(클릭·주문·취소, 날짜·subId별) | `performance()` 최대 100쪽×3 | 없음 | 결정 2 |
| 공용 사본 반영 | – | 기준 = 쇼핑제휴, 사본 = `threads-content-ops/lib/affiliate-clients/` | 기준에 함수 추가 → `check-shared-modules --sync`. 운영 화면 연결은 운영 담당께 요청 |

### 2단계 — 네이버 브랜드커넥트 링크 → 상품 정보 자동 수집 (확장 신규)

| 기능 | 원본 | 지금 | 채택·이유 |
|---|---|---|---|
| naver.me 링크 여러 줄 입력·검사 | `naver-brand-link-input.ts` 14줄 | 상품명+링크 1개 손 입력 | **원본 이식** |
| 확장이 링크 열어 상품명·이미지·후기 8건 수집 | `chrome-extension/content-script.js`·`service-worker.js` | 없음 | **원본 수집 부분 이식, 연결 방식만 교체**: 원본은 데스크톱 앱 ↔ C# 네이티브 호스트 → 우리는 **쇼핑제휴 웹 화면 ↔ 확장**(`externally_connectable`, 네이티브 메시징 권한 없음) |
| 도착 주소 검사(brand/smartstore/shopping, 여행 pkgtour) | `coupang-chrome-collector.ts` | 없음 | **원본 이식** |
| 진행 상태(대기·처리 중·초안 완료·확인 필요) | `shared/domain.ts` | 없음 | **원본 이식**(화면 상태 칸 + DB, 결정 6) |
| 수집 근거로 본문 생성(가짜 후기·과장 금지 규칙) | `content-quality.ts` | 상품 등록 후 따로 생성 | **원본 규칙 문장 이식**, AI는 회원 본인 키 |
| 고지 쇼핑/여행 구분 | `naver-brand-compliance.ts` | 「(광고) 브랜드 제휴 활동으로…」 하나 | 결정 4(사전 승인 항목) |
| 쿠팡 상품 페이지 후기 수집 | 같은 확장 | 없음 | 결정 3 |

확장 규칙: 위치 `threads-affiliate-poster/extension/`, 표시명 「Threads 쇼핑제휴 자동화」, 수집은 회원 PC·회원 브라우저에서만, 새 탭은 지금 창에(`chrome.windows.create` 금지), `extension/NOTICE` 포함, 배포 때 manifest·ZIP·DB 버전 함께 + `check-extension-release.mjs`.

### 3단계 — 함께 하면 좋은 것 (결정 5)

| 기능 | 원본 | 지금 | 비고 |
|---|---|---|---|
| 광고 표기 형식 검사(고지 첫 줄 1회·링크 끝 1회·500자) | `coupang-compliance.ts`·`naver-brand-compliance.ts` | 자동 삽입만 | 고지는 **항상** 들어가는 구조 유지, `DISCLOSURE_TEXT` 삭제·조건부 금지 |
| 홍보 글 검토 단계(작성→검토→재작성 최대 3회) | `content-quality.ts` | 없음 | 회원 AI 호출이 글당 2~4회로 늘어남 |
| Threads 인사이트 | `providers/threads.ts` | 없음 | 권한 추가 → 회원 재연결 필요 |

## 2. 구현 순서 (권장안 기준)

1. **1단계** — `coupangApi.ts`에 `goldbox`·`bestCategory`·`coupangPl` 추가(기존 서명·시간 제한 재사용), 새 `src/lib/coupang/productSelection.ts`(원본 이식)·`catalog.ts`(목록), `searchCoupangProductsAction` 확장(경로 선택·로켓 필터·등록 상품 제외), 상품 등록 화면 체크·일괄 등록. 시험: 경로 합치기·로켓 필터·중복 제외·키워드 나누기(외부 호출 가짜). `--sync` → 운영 사본 tsc.
2. **2단계** — `extension/`(manifest·service-worker·content-script 원본 이식 + 웹 통신), 새 `src/lib/naver/brandLinkInput.ts`·`brandCompliance.ts`, 수집 결과 받는 서버 동작(`checkProgramAccessApi` + `force-dynamic`·`force-no-store`), 상태 칸 화면. 시험: naver.me 검사·도착 주소 검사·고지 형식.
3. 결정된 3단계 항목.
4. 매 단계: tsc·시험·로컬 build(무료) → 커밋 → **배포는 빌드 비용 승인 후**(단계마다 1회 또는 묶어서 1회) → 버전 +0.01(코드+DB) → ego lite 화면 확인(시험 계정 본인 키).
5. 끝나면 `THREADS_FEATURE_MATRIX.md` 칸·프로그램 비교표 카드·HANDOFF·IMPROVEMENTS·역할 파일 갱신, Master 보고.

## 3. 결정 항목 (주인님께 여쭐 것)

| # | 결정 | 권장 | 이유 |
|---|---|---|---|
| 1 | 순서 | **1단계 먼저 → 2단계** | 1단계는 확장 없이 바로 쓰임, 위험 작음 |
| 2 | 쿠팡 수익 리포트 화면 | **이번엔 제외(다음)** | 3종×최대 100쪽 호출이라 쿠팡 시간당 한도 위험, 별도 설계 필요 |
| 3 | 확장 신규 개발 / 쿠팡 후기 수집 포함 | **확장 개발 승인 · 쿠팡 후기 수집은 제외** | 네이버 수집이 핵심. 쿠팡 페이지 읽기는 차단 가능성·정책 위험 |
| 4 | 네이버 고지 문구 쇼핑/여행 구분 | **바꿈**(원본 문구, 첫 줄 고정) | 네이버 커넥트 실제 문구와 맞음. 고지는 항상 들어감 — 사전 승인 항목이라 주인님 승인 필요 |
| 5 | 3단계 중 이번에 할 것 | **형식 검사만** | 검토 단계는 회원 AI 비용 2~4배, 인사이트는 회원 재연결 필요 |
| 6 | DB 변경 | **`affiliate_products`에 `source_key`(쿠팡 상품 번호) 칸 추가 + 새 표 `tap_collect_queue`(수집 대기열·상태·후기 근거, 회원 RLS, 30일 정리·`retention_exempt` 제외)** | 중복 제외를 정확히, 수집 근거를 회원 소유로 |
| 7 | 라이선스 회색 지대 | **MIT로 보고 이식**(머리 주석 출처 + `NOTICE`에 「MIT, package.json 표기, 저작권자 표기 없음」 기록) | `package.json`·README에 MIT 명시. 원저작자 LICENSE 파일은 없음 |

## 4. 비용

| 항목 | 내용 | 비용 |
|---|---|---|
| 개발·시험 | 로컬 tsc·시험·build | 없음 |
| 쿠팡 API 실호출 확인 | 시험 계정 본인 쿠팡 키, 경로별 1회씩(4회 내외) | 없음(무료 API, 시간당 한도만) |
| AI 호출 | 2단계 본문 생성 확인 1~2회, 가장 저렴한 Claude 모델 | 수십 원 — **실행 직전 다시 여쭙니다** |
| Vercel 빌드 | 단계마다 1회(2~3회) 또는 묶어서 1회 | **빌드 전 승인** |
| 운영자 인프라 | 없음(수집은 회원 브라우저) | 없음 |
| 회원 부담 | 본인 쿠팡·네이버·AI 키(글 생성 단가는 지금과 같음, 검토 단계를 넣으면 2~4배) | 회원 키 |

## 5. 처음 설정·매일 조작 (자동화 규칙)

- 처음 설정 2단계(쿠팡 키 등록 — 기존 / 확장 설치 1회) · 매일 조작 1~2번(검색 버튼, 링크 붙여넣기) · 동의 0번(기존 연결 그대로).
