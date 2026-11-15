# 이미지 담당께 — 메이커 셀링 도우미 v0.3.3 후속 개발 인수인계 (바나나 캔버스 M1)

> 2026-11-15 · 작성 Claude Code(윈도우) `claude-win-20261112-policy` → 받는 쪽 **바나나 캔버스를 맡을 이미지 작업 세션**(역할 ID `ecommerce-image` — 2026-10-31 이후 이미지 새 작업자는 아직 지정 전이라 주인님이 정한 세션)
> 주인님 지시: 「이미지 담당용도 있으면 만들어줘」
> 근거 분석: [`MAKER_V033_ANALYSIS_20261115.md`](MAKER_V033_ANALYSIS_20261115.md)(커밋 `3edbe4cb9`). 영상 몫은 [`HANDOFF_20261115_MAKER_V033_VIDEO.md`](HANDOFF_20261115_MAKER_V033_VIDEO.md).

## 0. 상태 한 줄

분석·플랜까지 완료. **구현 0, 빌드·배포 0, 유료 호출 0.** 착수 전 이 문서 §3을 프로그램 플랜으로 만들어 주인님께 보여 드리고 §5 결정을 받는다.

## 1. 원본에서 확인된 것 — 「썸네일 이미지 자동 생성」 v0.0.5 (2026-10-02)

메이커(sellergram, 상용·공개 라이선스 없음 → **동작만 참고, 코드·문구·화면 복제 금지**, 핵심 원칙 21).

- 단일 생성: 슬롯 6장에 사진 등록 → 메인 1장·서브 1장 지정 → 실시간 미리보기.
- 서브 **틀 모양 원형/사각**, **모서리 곡률**, **틀 테두리 굵기·색**, **틀 배경색**, 틀 크기·가로/세로 위치, **틀 안 사진 확대·위치**.
- 메인: 확대·위치, 배경색(흰·회·군청·검정·투명·직접 선택).
- 저장 크기: 직접 입력 / 비율 고정 / **메인 원본 해상도에 맞춤**.
- **「네이버 스마트스토어 규정(20% 이하) 초과 주의」** — 서브 틀 면적 비율을 계산해 넘으면 경고.
- JPG/PNG 저장, **결과를 클립보드에 복사**, 저장 폴더 열기.
- 대량 생성: 폴더의 `상품코드_1.jpg~` 스캔 → 상품별 대표·서브 슬롯을 **전체 상품에 일괄 지정** → 순서대로 생성·중단.

원본 자료(저장소 밖, 읽기만·설치 금지): `D:\PDS\Program_dev\maker-selling-review-20261115\` (`assets/ko.txt` 화면 문구 목록, `assets/assets_index-s8iLCCox.js`).

## 2. 이미 있는 것 (`banana-canvas` v1.48, 중복 개발 금지)

`/batch` 「🛍 상품 대표사진 합성」(v1.46~1.48): 상품코드 작업표(엑셀 붙여넣기·CSV)·파일 이름 짝짓기, 메인+서브 0~3장, 서브 9곳 위치·15~50%·`subFit` cover/contain·`subMargin`·**`subRadius`(모서리 둥글기)·`subOutline`(테두리 켜기/끄기)·`subShadow`**, 1000/1200/800 프리셋, JPG/PNG·품질, 파일명 템플릿, 한 개씩 실행·중단·실패만 다시, ZIP + 결과표 CSV/JSON, 상세페이지·몰에서 보낸 상품은 대표사진 칸으로 반환(`product-photo-handoff`), F-09(연결 모드 상품 유실) 수정. 설정 모델 `src/lib/batch/composite.ts`(`CompositeSettings`·`normalizeComposite`·`settingsVersion`), 그리기 `compositeRender.ts`, 시험 `tests/batchProduct.test.mjs`.

## 3. 할 일 — M1 「대표사진 합성 보강」 (추천안)

| # | 내용 | 구현 메모 |
|---|---|---|
| 1 | 서브 틀 모양 **원형** 추가(지금은 둥근 사각만) | `subShape: "rounded" \| "circle"` 추가, 원형은 정사각 영역 안 원으로 자르기. 기존 저장값은 `rounded`로 읽기(`normalizeComposite`) |
| 2 | 테두리 **굵기·색** | `subOutline` 켜기/끄기는 유지하고 `subOutlineWidth`(0~12px)·`subOutlineColor` 추가 |
| 3 | 틀 **배경색** | `subFit: contain`일 때 빈 곳 색(`subFrameBg`, 기본 흰색·투명 선택) |
| 4 | 틀 안 사진 **확대·위치**(선택) | 전체 공통 값 하나만(`subZoom` 100~200%, `subFocusX/Y`). 상품마다 따로 조절은 이번 범위 밖 |
| 5 | **서브 면적 비율 표시·경고** | 서브 전체 면적 ÷ 바탕 면적을 미리보기 옆에 %로 표시, 기준을 넘으면 노란 경고(막지는 않음). **「20%」 수치와 문구는 네이버 스마트스토어 공식 대표이미지 가이드를 먼저 확인해 출처·확인 날짜와 함께 적는다** — 원본 앱의 표기만 믿고 「규정」이라 쓰지 않는다 |
| 6 | 결과 **클립보드 복사** | 미리보기 한 장을 `navigator.clipboard.write`(PNG)로. 실패 시 안내 |
| 7 | 저장 크기 **「메인 원본에 맞춤」** | 프리셋 옆 선택지, 상품마다 메인 원본 크기가 다르면 결과표에 실제 크기 기록 |

- 새 설정은 `settingsVersion`에 반드시 포함(결과표의 설정 판번호가 바뀌어야 함), 시험 추가: 원형 자르기 좌표·테두리 굵기 0·면적 비율 계산·옛 설정 읽기.
- AI 0·서버 업로드 0·DB 변경 0. 브라우저에서만.
- 처음 설정 0단계(기존 화면에 설정 몇 개 추가) · 매일 조작은 기존과 같음 · 동의 추가 없음.

### 하지 않는 것
메이커 화면·문구·색 이름 복제 / 이미지 URL 일괄 다운로드(브라우저 CORS — 11-13 P3 보류 유지) / 상품마다 틀 위치 따로 저장(이번 범위 밖) / 마켓 규정 위반을 이유로 저장을 막기.

## 4. 순서·주의·완료 조건

- **충돌 주의**: 디자인 담당(agy, `agy-win-ssr-v1`)이 바나나 F-09 수정본을 **배포 대기** 중이고, `ProductBatchBoard.tsx`·`tests/batchProduct.test.mjs`에 다른 세션의 미커밋·스테이징 변경이 있다(2026-11-15 확인, 공용 스테이징 묵은 항목 경고 포함). → **agy 배포·커밋이 끝난 뒤 시작**하거나, `docs/ACTIVE_WORK.md`에서 범위(파일)를 나눠 적고 그 파일만 고친다. 남의 미커밋 줄이 섞인 파일은 커밋하지 않는다.
- 시작 전: `node scripts/dev-requests.mjs list --role ecommerce-image`, ACTIVE_WORK 줄 추가, `git status --porcelain -- banana-canvas`, `node scripts/apply-source-notice.mjs --check banana-canvas`.
- 플랜 `banana-canvas/docs/PLAN_YYYYMMDD_MAKER_M1_FRAME.md` → 주인님 보고 → 구현 → `tsc`·`node --test` → **미배포 대기로 모았다가 바나나 다음 배포 때 함께**(버전 +0.01 한 번, DB 버전, 저장공간 위젯 줄 확인, 빌드 사전 승인·순차 배포).
- 검수: ego lite 실제 창·시험 계정, 원형·테두리·투명 PNG·세로/가로 사진·면적 경고·클립보드 붙여넣기(다른 프로그램에 실제 붙여 보기), 375px 폭. 실제 저장된 파일을 열어 확인.
- 끝: `banana-canvas/AGENTS.md`·`docs/IMPROVEMENTS.md`·`IMPROVEMENT_BACKLOG.md`, 프로그램 비교표 바나나 카드, 역할 파일, 루트 HANDOFF(`[역할: ecommerce-image]`), 외부 개발분석표 메이커 카드 진행 상태, `dev-requests report`.

## 5. 주인님께 받을 결정

1. 바나나 이미지 작업을 맡을 세션(이미지 새 작업자 미지정 상태).
2. M1 범위: #1~#7 전부 / #4(틀 안 확대·위치) 제외.
3. 배포: 바나나 다음 배포에 묶기(추천) / 단독 배포.
