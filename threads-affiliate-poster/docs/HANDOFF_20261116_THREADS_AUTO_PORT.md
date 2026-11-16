# 인수인계 — threads-auto 기능 병합: 쿠팡 검색 강화·네이버 브랜드커넥트 자동 수집 (쇼핑제휴 담당께, 2026-11-16)

- 받는 사람: **이커머스·이미지 담당 `ecommerce-image` — Claude(ecommerce), 세션 `claude-win-sdp`**(2026-11-16 주인님 지정). 쓰레드 카테고리 전담 역할은 따로 없고 이 작업만 맡는다. HANDOFF·ACTIVE_WORK에 `[역할: ecommerce-image]`로 적는다.
- 보낸 사람: 분석 세션 `claude-win-20261116-boks-yt`(분석만, 코드·DB 변경 없음)
- 배정 경위: 2026-11-16 Codex(Master)가 크레딧 한도로 쉬는 중이라 **주인님이 직접 전달**. Master 복귀 후 결과 보고 때 이 배정도 함께 알린다.
- 상태: **분석 완료 · 구현 전**. 플랜과 결정 항목을 주인님께 먼저 여쭌 뒤 구현한다(외부 소스 분석·이식 규칙 넷째).
- 먼저 읽을 문서:
  1. 분석 보고서 [`threads-content-ops/docs/ANALYSIS_20261116_THREADS_AUTO.md`](../../threads-content-ops/docs/ANALYSIS_20261116_THREADS_AUTO.md) — §0-2 원본 기능 14개 판정, §0-3 프로그램별 적합성, **§0-5 두 화면 상세 비교**
  2. [`docs/THREADS_FEATURE_MATRIX.md`](../../docs/THREADS_FEATURE_MATRIX.md) §2(현재 사실)·§6(병합 후보 3줄)
  3. [`docs/EXTENSION_RELEASE_RULES.md`](../../docs/EXTENSION_RELEASE_RULES.md)(확장을 새로 만들 때)

## 1. 무엇을 하는가

외부 오픈소스 [boksajang/threads-auto](https://github.com/boksajang/threads-auto)(**MIT**, 최신 커밋 `bd2fec7` 2026-10-21, Electron + 크롬 확장)에서 주인님이 「좋은 것 같다」고 짚은 두 화면을 쇼핑제휴에 넣는다. 원본 코드를 최대한 그대로 옮긴다(새로 짜지 않음).

> 참고: 같은 원본의 10-05 사본이 `threads-content-ops/desktop/`에 있다(배포 안 함). **이식은 최신 원본(`bd2fec7`)을 저장소 밖 임시 폴더에 내려받아 기준으로** 하고, `desktop/` 사본은 고치지 않는다.

## 2. 범위와 순서 (분석 세션 권장안 — 주인님 최종 확인 필요)

### 1단계 — 쿠팡 파트너스 상품 검색 강화 (우선, 확장 불필요)

| 넣을 것 | 원본 위치 | 지금 쇼핑제휴 |
|---|---|---|
| 쉼표로 여러 키워드(단어마다 상위 10개) | 원본 화면·`providers/coupang.ts` `search` | 1개·10개(`src/lib/actions/products.ts` 58행 `searchCoupangProductsAction`) |
| 골드박스(키워드 무시) | `providers/coupang.ts` `goldbox` | 없음 |
| 카테고리 베스트(카테고리 선택, 100개) | `bestCategory` | 없음 |
| 쿠팡 PL(브랜드 선택, 100개) | `coupangPl` | 없음 |
| 선택한 경로 결과 합치기·중복 제거 | `services/coupang-product-selection.ts` | – |
| 로켓배송만 / 로켓프레시 중심 | 같은 파일 15~17행 | 없음(`isRocket` 값만 받음) |
| **이미 등록·발행한 상품 빼기** + 「새 후보 N개」 안내 | `excludedSourceKeys` | 없음 |
| 여러 개 체크·전체 선택 → 한 번에 등록 | 원본 검색 창 | 하나씩 |
| (선택) 수익 리포트 — 클릭·주문·취소를 날짜·추적 ID(`subId`)별 합산 | `providers/coupang.ts` `performance` | 없음 |

- 코드 위치: 쿠팡 연동은 **공용 기준 코드 `affiliate-clients`의 기준이 쇼핑제휴**(`src/lib/affiliate-clients/coupangApi.ts`, 사본 `threads-content-ops/lib/affiliate-clients/`). 기준 파일에 함수를 더하고 `node scripts/check-shared-modules.mjs --sync`로 사본 반영 → 운영(`threads-content-ops`)도 시험. 운영 화면에 검색 창을 붙이는 것은 운영 담당 몫(그 폴더 `docs/IMPROVEMENTS.md`에 「운영 담당께」로 요청). 사본 배포는 급하지 않으면 운영의 다음 배포 때 함께.
- 서명(HMAC)·`deeplink`·`subId`는 지금 코드에 이미 있다(`coupangApi.ts` 86~91행) — 그대로 쓴다.
- 회원 본인 쿠팡 키(`user_api_keys`)만. 운영자 키 폴백 금지.

### 2단계 — 네이버 브랜드커넥트 링크 → 상품 정보 자동 수집 (크롬 확장 신규)

| 넣을 것 | 원본 위치 | 지금 쇼핑제휴 |
|---|---|---|
| naver.me 링크를 **줄마다 여러 개** 붙여 넣기, naver.me 외 거부 | `services/naver-brand-link-input.ts` | 상품명+링크 1개 손 입력(`registerNaverProductAction` 197행) |
| 확장이 링크를 열어 **리다이렉트 뒤 실제 상품 페이지**에서 상품명·갤러리 이미지·후기 최대 8건(평점)을 읽음 | `chrome-extension/content-script.js`(네이버 256~261행 부근), `manifest.json` 허용 주소 | 없음 |
| 도착 주소 검사(brand/smartstore/shopping.naver.com, 여행 pkgtour.naver.com만) | `services/coupang-chrome-collector.ts` 288행 `PRODUCT_IDENTITY_MISMATCH` | 없음 |
| 진행 상태 칸 — 대기 · 처리 중 · 초안 완료 · 확인 필요, 상품 카드(「이미지 1장 · 후기 근거 8건」) | `shared/domain.ts` `COUPANG_LINK_QUEUE_STATUSES` | 등록 목록만 |
| 수집 근거로 발행 본문까지 생성(가짜 후기·과장 금지) | `services/content-quality.ts` `AFFILIATE_MARKETING_DIRECTION` | 등록 후 따로 생성 |
| 게시 순서 ① 고지문 ② 광고 본문 ③ 제휴 링크 ④ 이미지 1~20장, 원본 naver.me 링크 유지 | `services/naver-brand-compliance.ts` | 첫 줄 고지 자동 삽입만 |
| 고지 문구 **쇼핑 커넥트 / 여행 커넥트 구분** | 같은 파일 4~5행 | 「(광고) 브랜드 제휴 활동으로…」 하나 |

- 구조 변경: 원본은 데스크톱 앱 ↔ 확장을 윈도우 네이티브 호스트(C#)로 잇는다 → **쇼핑제휴 웹 화면 ↔ 우리 확장**으로 다시 설계한다.
  - 확장 위치는 처음부터 `threads-affiliate-poster/extension/`(지침: 확장 작업 폴더 고정), 표시명은 본 프로그램명과 같게.
  - 수집은 **회원 PC·회원 브라우저**에서만(서버 고정 IP로 쇼핑몰을 읽지 않음). 로그인이 필요하면 회원이 직접.
  - 새 탭은 지금 창에 열고 같은 사이트 탭은 다시 쓴다(`chrome.windows.create` 금지).
  - 배포 때 manifest·ZIP·DB `extension_version`·`extension_download_url`을 함께 맞추고 `node scripts/check-extension-release.mjs threads-affiliate-poster`.
- 같은 확장으로 **쿠팡 상품 페이지 후기 수집**도 된다(원본 `coupang-chrome-collector.ts`) — 범위는 결정 항목.
- 수집한 상품명·이미지 주소·후기 문장은 **회원 소유로 저장·30일 정리**(`retention_exempt` 회원 제외).

### 3단계 — 함께 하면 좋은 것 (같은 원본, 범위는 주인님 결정)

- 광고 표기 **형식 검사**: AI 본문에는 고지·링크를 넣지 못하게 하고 코드가 고지(첫 줄 1회)·링크(마지막 1회)·빈 줄·500자를 붙이고 검사(`coupang-compliance.ts`). 지금은 자동 삽입만(`src/lib/ai/affiliateGenerator.ts` 17~21행).
- 홍보 글 **검토 단계**(작성 → 검토 → 반려 사유로 재작성 최대 3회) + 원본 홍보·쿠팡 편집 규칙 원문 이식(`content-quality.ts` `buildModeQualityRubric('COUPANG_PROMOTION')`). 회원 AI 호출이 글당 2~4회로 늘어남.
- Threads **인사이트**(조회·좋아요·답글·리포스트·인용·공유, 원본 `providers/threads.ts` 450행) — `threads_manage_insights` 권한 추가로 회원 재연결 필요.

## 3. 플랜에서 주인님께 여쭐 결정 항목 (답을 받은 뒤 구현)

1. 순서: 1단계(쿠팡) 먼저 → 2단계(네이버·확장) 권장 / 동시
2. 쿠팡 수익 리포트 화면을 이번에 넣을지
3. 확장 신규 개발 승인과 쿠팡 후기 수집 포함 여부
4. 네이버 고지 문구를 원본처럼 쇼핑/여행 구분 문구로 바꿀지
5. 3단계(형식 검사·검토 단계·인사이트) 중 이번에 함께 할 것
6. DB 변경: 수집 대기열 상태·후기 근거 저장 칸(회원 RLS·30일 정리)

## 4. 이식 방법

- 원본 받기: `git clone --depth 1 https://github.com/boksajang/threads-auto.git` — **저장소 밖 임시 폴더**에. `npm run setup`·`npm start` 실행하지 않고 읽기만.
- 옮길 원본: `src/main/providers/coupang.ts`(검색·골드박스·베스트·PL·리포트·서명), `src/main/services/coupang-product-selection.ts`, `coupang-link-input.ts`(링크·iframe·블로그 이미지 앵커 붙여넣기 해석 — 선택), `naver-brand-link-input.ts`, `naver-brand-compliance.ts`, `coupang-compliance.ts`, `coupang-chrome-collector.ts`의 검사 부분, `chrome-extension/content-script.js`·`service-worker.js`(네이티브 메시징 부분은 웹 통신으로 교체), `content-quality.ts`의 홍보 규칙 문장.
- 옮긴 파일 머리 주석에 출처(저장소·커밋 `bd2fec7`·원본 파일명), `threads-affiliate-poster/NOTICE`에 MIT 문구 추가(기존 저작권 고지는 지우지 않음).
- 원본은 시험 코드를 공개하지 않음 → `tests/`에 경로 합치기·로켓 필터·중복 제외·naver.me 검사·도착 주소 검사·고지 형식 검사 시험을 새로 쓴다.
- AI 호출은 회원 본인 키, 새 기능 기본 제공자는 Claude(기본 AI 규칙). 원본의 Codex CLI 실행은 옮기지 않는다.

## 5. 지켜야 할 규칙

- 새 API·서버 동작에 `checkProgramAccessApi()`/`requireProgramAccess()` + `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"`.
- 회원 본인 쿠팡·네이버·AI 키만. 결과 불확실하면 자동 재발행 금지.
- **제휴 고지 문구 보호(이 프로그램 `AGENTS.md` 사전 승인 항목 5)**: `src/lib/ai/affiliateGenerator.ts`의 `DISCLOSURE_TEXT`를 지우거나 조건부로 만들지 않는다. 원본식 「AI 본문엔 고지 없음 → 코드가 첫 줄에 붙이고 검사」는 고지가 **항상** 들어가는 구조라 허용되지만, 붙이는 위치·문구를 바꾸는 것(네이버 쇼핑/여행 구분 포함)은 플랜에서 주인님 승인을 받는다.
- 0번 규칙: 시작할 때 `node scripts/apply-source-notice.mjs --check threads-affiliate-poster`, 확장 ZIP에도 `extension/NOTICE`.
- 설치 키트(`KIT/`, 독립 모드 스위치)가 있으므로 새 기능이 독립 모드에서도 깨지지 않는지 확인.
- 배포: 빌드 전 비용 승인, 작은 수정은 모아서, 한 번에 하나씩. 버전 +0.01(`src/lib/version.ts` + DB `programs.version`). 저장공간 위젯 한 줄이 빠져 있으면 다음 배포 때 함께.
- 유료 시험 호출은 가장 저렴한 모델·최소 횟수, 실행 전 승인.

## 6. 알아 둘 점 (분석 중 발견)

- `guide/page.tsx` 238행에 「첫 댓글에 포함」이라는 안내가 있으나 첫 댓글 기능은 코드에 없다 — 안내 문구 정리 필요.
- `docs/MEMBER_INTEGRATIONS.md` 73행의 「쇼핑제휴 토큰 갱신 없음」은 코드와 다르다(실제로는 `src/lib/posts/dispatch.ts` 103~118행에서 30일 지나면 갱신).
- 네이버 검색·트렌드 캐시 회원 공유 문제(`naver_trend_cache`·`naver_search_cache`에 `user_id` 없음)는 이전부터 남은 1차 과제(`THREADS_FEATURE_MATRIX.md` §6).
- `docs/ACTIVE_WORK.md` 49행에 11-06 연속 배포 줄이 남아 있다(v1.86 배포·v1.87 개편 뒤 지워지지 않은 줄로 보임) — 시작 전 그 세션 상황 확인 후 정리.

## 7. 다음 첫 단계

1. `docs/ACTIVE_WORK.md`·`git status --porcelain -- threads-affiliate-poster` 확인 후 내 줄(역할 포함) 등록
2. 분석 보고서 §0-5와 이 문서 읽기 → 원본 최신본 내려받아 §4 파일 확인
3. `docs/PLAN_YYYYMMDD_THREADS_AUTO_PORT.md` 작성(원본 / AIMaster / 채택·이유 표 + §3 결정 항목 + 비용) → 주인님께 보고·결정 받기
4. 결정 뒤 1단계부터 구현 → 시험 → 승인 배포 또는 미배포 대기 → `THREADS_FEATURE_MATRIX.md` 칸·프로그램 비교표 카드·HANDOFF 갱신
