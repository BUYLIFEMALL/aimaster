# 이미지 프로그램 부분 통합·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션(ecommerce-image) 확인 전.** 담당 세션이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 담당 역할: [`docs/roles/ecommerce-image.md`](roles/ecommerce-image.md)(`claude-win-sdp` — `banana-canvas`·`ai-image-studio`(이미지 연동 기준)·카테고리 지도 「이미지」 줄). 단, `ai-image-studio` v1.30은 영상 담당 세션(`claude-win-video`)이 공용 영상 사본 때문에 배포했다 — 이 폴더는 영상 공용 코드(`lib/video/`)의 사본도 들고 있다.

## 우선 처리 (회원에게 실제 피해가 갈 수 있는 것 — 먼저 확인)

| ID | 문제 | 근거(코드·문서 경로) | 영향 | 받을 담당 | 상태 |
|---|---|---|---|---|---|
| IM-U1 | 감성 글귀 「인스타에 올리기」가 결과 그림을 **공개 버킷** `insta-post-images/<회원>/` 바로 아래에 올리는데, 그 위치에는 **30일 정리 작업이 없다**. 회원이 INSTA에서 글을 저장하지 않고 닫으면 어느 글에도 연결되지 않은 공개 파일로 계속 남는다 | 올리는 곳 `emotion-writer/src/components/QuoteCanvas.tsx` 204~208줄(`upload` → `getPublicUrl`) · 정리 없음 기록 `insta_auto_poster/docs/PLAN_20261022_MEDIA_RETENTION.md` 6줄, `insta_auto_poster/docs/IMPROVEMENTS.md` 67·70·93줄 · `insta_auto_poster/src/app/api/`에 정리 경로 없음(2026-10-24 검색) | 최상위 규칙(생성 데이터 30일 삭제) 미충족 + 공개 주소로 남음 | 정리 작업은 받는 쪽(인스타 담당 `insta_auto_poster`), 감성 글귀는 영향 확인만 | 확인 필요 — 인스타 정리 플랜(v1.53→v1.54안)이 실행됐는지 운영 확인 |
| IM-U2 | 바나나·인물·4컷의 30일 정리 **회원별 기록**이 문서상 「미배포 대기」로 남아 있다. 10-23 보안 배포(바나나 v1.33 `b73d1e0c4`, 인물 v1.43 `5951d1ca2`, 4컷 v1.36 `27111e0ad`)가 정리 기록 커밋(`f53021369`·`4cafe5eb3`)보다 늦어 함께 나갔을 수 있으나 확인 기록이 없다 | `docs/PENDING_DEPLOYS.md` 33·34·36줄, `banana-canvas/docs/IMPROVEMENTS.md` 88줄, `portrait-photo/docs/IMPROVEMENTS.md` 49줄, `four-cut-comics/docs/IMPROVEMENTS.md` 82줄 | 정리 자체는 돌지만 관리자 「30일 자동 정리」 표에 줄이 안 생길 수 있음(회원 데이터 피해는 아님) | ecommerce-image(바나나·인물·4컷) | 확인 필요 — 운영 `usage_logs` `cleanup_expired`에 세 프로그램 줄이 있는지 보고, 있으면 미배포 표시 정리 |
| IM-U3 | 유료 이미지 생성에서 **서버 오류·혼잡(5xx·429)·연결 실패 때 1회 자동 재시도**가 켜진 곳이 3곳 있다(공용 기본값 `retries = 1`을 그대로 씀). 시간 초과는 재시도하지 않으므로 큰 위험은 아니지만, 공용 점검표 ⑤는 유료 생성에 `retries: 0` 검토를 요구한다 | 공용 기본값 `ai-image-studio/lib/providers/geminiImage.ts` 196줄 · 호출부 `ai-image-studio/lib/providers/adapters/gemini.ts` 39줄, `style-dna-analyzer/src/lib/ai/image.ts` 31줄, `emotion-writer/src/lib/studio/services.ts` 102줄(모두 `retries` 미지정) · 비교: 바나나·인물·4컷·패션은 `retries: 0` | 혼잡 오류 응답이 실제로 과금됐다면 2장 값이 나갈 수 있음(구글 과금 기준 미확인) | ecommerce-image(스튜디오), 분석기·글귀 담당(미지정) | 확인 필요 — 남길지·끌지 판단하고 근거를 각 `AGENTS.md`에 |
| IM-U4 | 바나나 캔버스 모델 이어 부르기는 앞 모델이 `NO_IMAGE`(이미지 없이 응답)여도 다음 모델을 부른다. 앞 요청이 과금됐다면 한 번 누름에 두 번 값이 나갈 수 있다 | `banana-canvas/src/lib/imageModelChain.ts`·`src/lib/gemini.ts` 124줄(`MODEL_NOT_FOUND`·`NO_IMAGE` → `continue`) | 드문 경우의 이중 과금 가능성 | ecommerce-image | 확인 필요 — `NO_IMAGE`의 과금 여부 확인 뒤 유지/제외 결정 |
| IM-U5 | 이미지 스튜디오에서 OpenAI·Replicate 엔진으로 2단계에 프롬프트를 직접 넣으면 **인물 한국인 기본 지시가 붙지 않는다**(Gemini 어댑터와 1단계 다듬기에만 있음) | 있음: `ai-image-studio/lib/providers/adapters/gemini.ts` 5·30줄, `app/api/enhance-prompt/route.ts` 36줄 · 없음: `lib/providers/adapters/openai.ts`·`replicate.ts`(`Korean` 검색 0건) | 핵심 원칙 3 일부 미충족 | ecommerce-image | 대기 — 붙일지 판단(프롬프트는 이 프로그램 고유라 이 프로그램 안에서만) |
| IM-U6 | 미리보기·종료 여부 미확인 글 모델: 스타일 분석기 분석 모델 목록에 `gemini-3.1-pro-preview`, 바나나·패션·인물·감성 글귀의 글 모델 `gemini-2.5-flash`(종료 기록은 없으나 `docs/ERROR_LESSONS.md` 2281줄에 「존재하지 않는 `gemini-2.5-flash`」 기록이 있어 상반됨) | `style-dna-analyzer/src/lib/ai/models.ts`, `banana-canvas/src/lib/gemini.ts` 10줄, `fashion-style/src/lib/gemini.ts` 12줄, `portrait-photo/src/lib/gemini.ts` 13줄, `emotion-writer/src/lib/studio/config.ts` 40줄 | 모델이 막히면 그 기능이 오류(이미지 모델은 모두 정식 — 이번 검색에서 `-preview` 이미지 모델 0건) | 각 담당 | 확인 필요 — 공식 모델 목록 대조(무료), 바꾸면 연동만 |
| IM-U7 | 감성 글귀 사용 매뉴얼이 사진 출처를 옛 「Unsplash」로 안내(고친 코드는 미배포) | `docs/PENDING_DEPLOYS.md` 46줄, 커밋 `1965b2c6c` | 회원 안내 오류(저작권 안내 포함) | 감성 글귀 담당(미지정) | ⏳ 미배포 대기(다음 감성 글귀 배포 때) |

이번 검색에서 **찾지 못한 것**(= 문제 없음으로 확인한 범위): 운영자 AI 키 환경변수 읽기(8개 0건), 공개 버킷에 회원 결과 보관(게시용 `insta-post-images` 외 0건), 키 원문 브라우저 저장(0건), 권한 확인 없는 쓰기 API(문구가 달랐던 3곳도 `authorize`·`checkAdminApi`·회원 토큰으로 확인됨), 30일 넘는 보관 선택지(인물·4컷 7·30일만), 시간 초과 자동 재시도(0건). 다른 회원 데이터를 받는 경로는 받는 쪽 허용 버킷·본인 폴더 검사로 막혀 있다는 기록만 확인했고 실제 시도는 하지 않았다(미확인).

## 현재 위치와 읽는 순서

1. [이미지 자동화 완성 기준](IMAGE_COMPLETION_POLICY.md) — 끝났다고 말할 조건·회원 선택 항목·하지 않을 것.
2. [이미지 기능 상세 비교표](IMAGE_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치. 항목을 시작하기 전에 읽고, 배포한 기능은 그 표의 칸을 고친다.
3. [이미지 통합 분석 보고서](analysis-image-consolidation-20261021/REPORT.md) — 병합 결정의 1차 근거(§2 1차 결정, §6 진행 결과, §8 재비교·W/L/F 플랜, §8-7 진행 결과, §9 카테고리 간 분석).
4. 프로그램별 기록: 각 폴더 `AGENTS.md`·`docs/IMPROVEMENTS.md`, 바나나 캔버스는 `docs/IMPROVEMENT_HANDOFF_20261024_CLEARPIC.md`·`docs/PLAN_20261024_CLEARPIC_C1_C5.md`.
5. 모델 연동: [이미지 모델 점검](IMAGE_MODEL_AUDIT_20261017.md), [이미지 생성 프롬프트 규칙](IMAGE_PROMPT_RULES.md).

**2026-10-24 요약:** 1차 병합(보안 보강 → A → B → 카테고리 간 분석)과 재비교 플랜(W1~W7·W8 → L2~L6 → F1~F3·F6)은 기록상 완료됐고, 10-22~10-23에 프로그램 사이 연결 공용 코드(`banana-idea-link`·`link-mark`·`resave-receiver`)와 30일 정리 기록(`cleanup-usage-log`)이 더해졌다. 카탈로그 이미지는 운영 8개 + 병합 원본 2개(이동 안내, 생성 API 410)다. `cinematic-storyboard-studio`는 「디자인」 카테고리로 옮겨 이 표에서 뺐다(연결 받는 쪽으로만 등장). 남은 것은 위 「우선 처리」와 아래 「대기·후속」이다.

## 유지할 역할과 이관 방향

| 유지할 프로그램 | 담당 역할 | 흡수한 장점 | 원본 처리 |
|---|---|---|---|
| AI 바나나 캔버스 (`banana-canvas`) | Gemini 편집·합성·템플릿 작업대 | 포토 리메이크의 복원·비교·합성 지시, 올인원 그래픽의 템플릿 123종·기획서 자동 입력·비율 확장 | 두 원본 비공개·이동 안내(주소 유지), 생성 API 410 |
| AI 이미지 스튜디오 (`ai-image-studio`) | 여러 엔진 생성 + **이미지 모델 연동 기준** | — | 독립 |
| 이미지 스타일 분석기 (`style-dna-analyzer`) | 분석 → 프롬프트 | 리버스 프롬프트와 양방향 연결(A안) | 독립 |
| 이미지 변환 스튜디오 (`image-convert-studio`) | AI 없는 형식·크기 변환 | — | 독립 |
| AI 인물사진 (`portrait-photo`) | 규격 사진 | — | 독립 |
| AI 패션스타일 (`fashion-style`) | 코디·가상 피팅 | — | 독립 |
| AI 4컷 만화 (`four-cut-comics`) | 컷 만화 연재 + 인스타 게시 | — | 독립(웹툰과 C1 독립 유지) |
| 감성 글귀 이미지 (`emotion-writer`) | 글귀 카드 | — | 독립(카드뉴스와 C2 독립 유지 + 장점 교환) |

병합된 원본을 닫는 것과 데이터 삭제·이용권 변경은 다르다. 옛 주소는 지우지 않는다. 바나나 캔버스 FREE 배지는 2026-10-21 주인님 결정으로 해제(일반).

## 순차 작업 표 — 1차 병합 (2026-10-21 주인님 결정 「보안 보강 → A → B → 카테고리 간 분석」)

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**로 구분한다.

| ID | 대상과 구현 범위 | 근거 버전 | 현재 상태 |
|---|---|---|---|
| IM-S1 | 이미지 스튜디오: 결과 버킷 비공개 + 서명 주소(24시간), 30일 정리를 갤러리 열람 → cron(매일 03시) | ai-image-studio v1.23 | ✅ 완료(보고서 §6) |
| IM-S2 | 스타일 분석기: 원본 버킷 비공개 + 서명 주소(6시간), 생성일 30일 cron | style-dna-analyzer v1.23 | ✅ 완료 |
| IM-A | 포토 리메이크 → 바나나 「옛 사진 복원」·합성 소스별 지시·배경 선택·비교 슬라이더, 바나나 FREE 해제, 백업 `backup-programs-before-merge-A.json` | banana-canvas v1.12 · photo-remake-studio v1.11 | ✅ 완료(복원 실제 1회) |
| IM-B | 올인원 그래픽 → 바나나 「템플릿 그래픽」·비율 확장·부분 수정 지시, 백업 `backup-programs-before-merge-B.json` | banana-canvas v1.13 · allinone-graphic v1.09 | ✅ 완료(자동 입력·생성 각 1회) |
| IM-X | 스타일 분석기 ↔ 리버스 프롬프트(다른 카테고리) A안: 양방향 연결, 리버스 프롬프트 30일 cron | reverse-prompt v1.11 · style-dna-analyzer v1.25 | ✅ 완료 |

## 순차 작업 표 — 재비교 플랜 (2026-10-22 보고서 §8-4·§9-3, 진행 결과 §8-7)

| ID | 대상과 범위 | 근거 버전 | 현재 상태 |
|---|---|---|---|
| W1 | 스튜디오 Ideogram·Recraft 11개 모델 연결(`lib/providers/index.ts`) | v1.25 | ✅ 완료(Ideogram 1장 실생성) |
| W2 | 웹툰(다른 카테고리) 회원 키 브라우저 저장 제거 | ai-webtoon-studio v1.27 | ✅ 완료(실생성 미확인) |
| W3 | 스토리보드 30일 cron + 동시 렌더 선점 | cinematic-storyboard-studio v1.10 | ✅ 완료(지금은 디자인 카테고리) |
| W4 | 패션 Pro 모델 정식 교체 + 옷장·룩 30일 기한 | fashion-style v1.11 | ✅ 완료 |
| W5 | 4컷 글 모델 고정 + 보관함 30일(무기한·90일 제거) | four-cut-comics v1.24, 정리 cron v1.25 | ✅ 완료 |
| W6 | 바나나 모델 목록을 공용 사본에 맞춤, 실패 시 Pro 대신 nano-banana-2.1 | banana-canvas v1.15 | ✅ 완료 |
| W7 | 인물사진 매일 정리 cron + 보관 30일 상한 | portrait-photo v1.31 | ✅ 완료 |
| W8 | 웹툰 캐릭터 시트를 컷 그림에 첨부(다른 카테고리) | ai-webtoon-studio v1.29 | ✅ 완료(실생성 1장) |
| L2 | 분석기 → 스튜디오 「이미지 스튜디오에서 생성」 | style-dna-analyzer v1.26 | ✅ 완료 |
| L3 | 인물·4컷(·스튜디오) → 변환 「형식 바꾸기」 | image-convert-studio v1.10~ · portrait v1.32 · four-cut v1.26 · 스튜디오 쪽 v1.28 | ✅ 완료 |
| L4 | 인물 → 패션·바나나, 바나나 증명사진 국가 규격 안내 | banana v1.16 · fashion v1.12 · portrait v1.33 | ✅ 완료 |
| L5 | 바나나(·4컷·인물) → 스토리보드 | storyboard v1.11~v1.15 · banana v1.17 | ✅ 완료 |
| L6 | 감성 글귀 → INSTA 포스팅(1:1) | emotion-writer v1.17 · auto-instagram-posting v1.47 | ✅ 완료 — 단, 넘긴 파일 정리는 **IM-U1** |
| F1 | 감성 글귀 「다른 크기로 받기」 + Pixabay 검색 버그 | emotion-writer v1.18·v1.19 | ✅ 완료 |
| F2 | 바나나 「내 작업 레시피」·「이 컷만 다시」(선점) + 템플릿 레시피·이름 바꾸기 | banana-canvas v1.18·v1.19 | ✅ 완료(실제 1장 생성 미확인) |
| F3 | 변환 게시처 규격·회전·반전·비율 자르기 | image-convert-studio v1.12 | ✅ 완료 |
| F4 | 인물 목적별 규격 묶음 저장 | 코드 있음 `portrait-photo/src/lib/portrait/bundles.ts` — 버전·배포 커밋 **확인 필요** | ⚪ 확인 필요(보고서 §8-7에 행 없음) |
| F5 | 분석기 원본 ↔ 시험 생성 비교 슬라이더 | 코드 있음 `style-dna-analyzer/src/components/dna/CompareSlider.tsx` — 버전 **확인 필요** | ⚪ 확인 필요(보고서 §8-7에 행 없음) |
| F6 | INSTA 카드뉴스 배경에 무료 사진 검색(다른 카테고리) | auto-instagram-posting v1.63~v1.64 | ✅ 완료(Pexels 실검색 미확인) |

## 후속 (2026-10-22~10-24, 보고서 밖 — 커밋 기록 기준)

| ID | 내용 | 근거 커밋·버전 | 현재 상태 |
|---|---|---|---|
| IM-P1 | 바나나 아이디어 보내기 공용 `banana-idea-link`(분석기 기준, 글귀·리버스 프롬프트·스튜디오 사본), 보낸 곳 표시·되돌아가기 | `fb38d8c88`·`85f3da623`·`20cf69a90` · banana v1.24~v1.25 | ✅ 배포(10-22 묶음 `5095c359a`) |
| IM-P2 | 연계 기록 공용 `link-mark`(첫 다운로드·첫 넘김 1회), 관리자 연계 흐름 표 | `7dccc1bbc`·`0de96ac07`·`b8d07d49b` · banana v1.28~v1.29 · 스튜디오 v1.26~v1.27 | ✅ 배포 |
| IM-P3 | 변환 「○○에 다시 저장」 공용 `resave-receiver`(4컷 기준, 인물·바나나·스튜디오 사본), PNG 너무 크면 WebP 재시도 | `0da8f27e8`·`a00e43925`·`b0502560e`·`acf432dbe` · 10-23 묶음 배포 `28431cd0a`(4컷 v1.35·인물 v1.42·바나나 v1.32·스튜디오 v1.28·변환 v1.25) | ✅ 배포 |
| IM-P4 | 30일 정리 회원별 기록 공용 `cleanup-usage-log`(4컷 기준) | `8ad8ea2e5`·`f53021369`·`4cafe5eb3` · 분석기 v1.37·스튜디오 v1.30 배포 | △ 분석기·스튜디오 ✅, 바나나·인물·4컷은 **IM-U2** |
| IM-P5 | 감성 글귀 사진 검색 「🔤 영어로」(공용 `photo-keywords`) | `f19eb7d9f` · v1.26 | ✅ 배포 |
| IM-P6 | Next.js 보안 업데이트(8개 모두) | 10-23 각 폴더 `fix(security)` 커밋 · 변환 v1.27·분석기 v1.38·바나나 v1.33·인물 v1.43·4컷 v1.36·패션 v1.13·글귀 v1.27 | ✅ 커밋 — 운영 배포·DB 버전 일치는 **확인 필요**(이번에 DB 조회 안 함) |
| IM-P7 | 스튜디오 공용 영상 사본 갱신(Kling v2.1 제거 등, 화면 미사용) + 정리 기록 | `ff9e2c13f` · v1.30(영상 담당 배포) | ✅ 배포 |

## 대기·후속 (다음에 할 일 후보 — 담당 세션 역할 파일에서 옮김 포함)

| ID | 대상과 범위 | 선행·기다리는 것 | 현재 상태 |
|---|---|---|---|
| C-0 | 바나나 「무료 지우기」 사전 검증 페이지: ① COOP/COEP 머리글 + Supabase·허깅페이스 이미지 표시 ② 208MB 모델 캐시 ③ 입출력 측정(0~255) ④ WebGPU 없는 PC 속도 ⑤ 한국어 글자 검출 — 저장소 밖·내 PC 주소 | 주인님 범위·비용 승인(AI 0, 빌드 1~2회) | ⏳ 승인 대기(역할 파일 「대기 중」) |
| C-1 | 공용 「브라우저 무료 지우기」 엔진(LaMa ONNX, 허깅페이스 직접 받기·캐시, WebGPU → WASM, 작업자 스레드) — 후보 모듈 `browser-inpaint` | C-0 결과 | ⏳ 대기 |
| C-2 | 글자 자동 찾기(PP-OCRv4 위치 검출 → 마스크) | C-1 | ⏳ 대기 |
| C-3 | 「무료 지우기」 화면 — 여러 장 목록 + 캔버스(`src/components/studio/MaskEditor.tsx` 확장), SSO와 머리글 충돌 확인 | C-1·C-2 | ⏳ 대기 |
| C-4 | 마스크 같은 비율 여러 장 복사·일괄 지우기·중단·ZIP | C-3, 여러 장 상한(50~100장 중) 주인님 결정 | ⏳ 대기 |
| C-5 | 「무료 지우기」 / 「AI로 다시 그리기(Gemini)」 고르기 안내·매뉴얼 → 배포 1회(v1.33 → v1.34, 코드·DB 함께) | C-4 | ⏳ 대기 |
| IM-W1 | 무료 지우기 공용 엔진을 상세페이지·썸네일·카드뉴스에 사본으로(EXT-IMG-01 C4) | C-1 완료 + 그 담당과 협의 | 대기 |
| IM-W2 | COOP/COEP 머리글 결과를 음악 담당(브라우저 TTS, EXT-MM-01)과 공유(분석표 §2 A 묶음) | C-0 | 대기 |
| IM-W3 | 4컷 컷 배경 「📷 무료 사진 검색」(공용 `free-photo-search`) | 담당 판단 | 대기(`four-cut-comics/docs/IMPROVEMENTS.md` 78줄) |
| IM-W4 | 분석기 → 스튜디오로 보내는 프롬프트의 자리 표시(`[INSERT SUBJECT HERE]`) 처리 | 담당 판단 | 대기(`style-dna-analyzer/docs/IMPROVEMENTS.md` 46줄) |
| IM-W5 | 스튜디오 `stability.ts`(불러오기만, 미등록)·`fal.ts`(미사용) 정리 여부 | 담당 판단(지우기는 승인) | 확인 필요(`ai-image-studio/lib/providers/index.ts` 5줄) |
| IM-W6 | 변환 스튜디오 대량 처리 작업자 스레드화·EXIF 보존 선택 | 담당 판단 | 대기(보고서 §1 단점) |
| IM-W7 | 패션 옷장·룩 서버 저장 전환(기기 바꾸면 사라짐) | 주인님 판단(저장 비용·30일 규칙) | 보류(보고서 §3) |
| IM-W8 | 감성 글귀 결과 보관함 | 주인님 판단 | 보류(보고서 §1) |
| IM-W9 | 받는 쪽 허용 버킷 검사 공용화(L1) | 급하지 않음 | 대기 |
| IM-W10 | 비교 슬라이더 3곳(바나나·분석기·변환) 공용 기준 코드 후보 검토 | 급하지 않음 | 대기 |
| IM-W11 | 4컷 여러 회차 묶음 예약이 창을 닫으면 멈추는 문제 | 담당 판단 | 확인 필요(보고서 §1, 최신 코드 대조 안 함) |

## 항목마다 지킬 완료 조건

1. 착수 직전 `docs/ACTIVE_WORK.md`·미커밋 변경·역할 파일·최신 인수인계를 확인하고 **대상 프로그램 하나씩** 진행한다. 바나나 캔버스·이미지 스튜디오는 담당 세션(`claude-win-sdp`)이 작업 중일 수 있으니 그 폴더를 건드리기 전에 역할 파일 「지금 하는 일」을 본다.
2. 코드를 고치기 전에 문제·범위·순서·검수·비용·버전/배포·인수인계 산출물을 플랜으로 제시한다(프로그램 `docs/PLAN_YYYYMMDD_*.md`). 이미 있는 기능은 [비교표](IMAGE_FEATURE_MATRIX.md)로 확인해 중복 구현하지 않는다.
3. 무료·모의 검사부터 하고, 실제 생성 시험은 시험 계정 본인 키로 승인된 횟수만 한다(가장 싼 이미지 모델 `gemini-3.1-flash-lite-image`, 1~3장). 모델 연동만 바꾼 경우에는 일괄 생성 시험을 하지 않는다.
4. 회원 본인 키만, 회원별 비공개 저장, 생성일 기준 30일 정리, 시간 초과 자동 재시도 금지를 지킨다. 이미지 프롬프트는 프로그램 고유로 두고, 공용 사본은 기준만 고친다(`node scripts/check-shared-modules.mjs --sync`).
5. 작은 수정은 「미배포 대기」로 모았다가 배포하고, 배포는 팀 전체에서 한 번에 하나씩 한다. 버전은 실제 배포 때 한 번만 올린다(코드 `version.ts` + DB `programs.version`). 빌드·유료 호출은 시작 전에 비용을 보고하고 승인받는다.
6. 완료 시 이 표의 상태·근거 커밋, 비교표 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드, 루트 `docs/HANDOFF.md`(제목에 `[역할: ecommerce-image]`), 역할 파일을 갱신한다.

## 새 기능·개선점을 발견했을 때

- 발견한 프로그램의 `docs/IMPROVEMENTS.md`에 날짜·세션·근거 파일·영향·우선순위·상태를 적고, 이 문서 「대기·후속」(회원 피해 가능성이 있으면 「우선 처리」)에 한 줄 추가한다.
- 공통 아이디어 표([`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md))에서 중복을 먼저 확인한다.
- 외부 참고 원본이 있으면 [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md)에 카드를 추가한다(이미지는 EXT-IMG-*).

## 프로그램 주소

주소는 `<slug>.buylife.xyz` 규칙으로 적었다. 이번에 DB `programs.app_url`과 대조하지 않았으니 링크로 쓰기 전에 확인한다.

https://banana-canvas.buylife.xyz

https://ai-image-studio.buylife.xyz

https://style-dna-analyzer.buylife.xyz

https://image-convert-studio.buylife.xyz

https://portrait-photo.buylife.xyz

https://fashion-style.buylife.xyz

https://four-cut-comics.buylife.xyz

https://emotion-writer.buylife.xyz

## 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — 우선 처리 7줄, 1차 병합 5줄, 재비교 19줄, 후속 7줄, 대기 17줄(ClearPic C-0~C-5 포함) | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
