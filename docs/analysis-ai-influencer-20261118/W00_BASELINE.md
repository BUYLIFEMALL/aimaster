# AI Influencer W00 — 현황 대조·격차·공통 계약 확정

작성: 2026-11-18 KST · Claude(SNS) · 세션 `claude-win-20261118-sns` · 장비 윈도우 메인 PC(`GT1_Mega`) · 역할 `sns`(주인님 직접 지정)

대상 기준: 저장소 HEAD `e7c03b317`, `ai-influencer-studio` 마지막 변경 커밋 `5e27cb269`(v1.26). 운영 DB `programs.version` = v1.26(인플루언서)·v1.36(영상)·v1.59(쇼츠) — 로컬 소스 버전과 일치. 운영 화면 실측·배포 ID 대조는 하지 않음(미확인).

**이 문서는 W00 산출물이다. 제품 코드·migration·운영 DB 쓰기·유료 호출·배포는 하지 않았다.** 운영 DB는 표·함수 존재와 건수만 읽기 전용으로 조회했다.

연결: [HANDOFF](HANDOFF.md) · [PLAN](PLAN.md) · [FEATURE_CATALOG](FEATURE_CATALOG.md)

## 1. 인수 기록

| 항목 | 값 |
|---|---|
| 작업 ID / 기능 ID | W00 / F20-04, C03·C07, PLAN §13~§15 |
| 담당 | Claude(SNS), 주인님 직접 지시(2026-11-18) — Master 작업표 등록은 Master 몫 |
| 독립 검수 | 미지정(팀 규칙상 Mac Tester `CX-QA-01` 후보) |
| 파일 점유 | 이 파일 신규만. 제품 3개 폴더는 읽기 전용. `docs/ACTIVE_WORK.md`에 한 줄 등록 |
| 시작 전 확인 | dev-requests 대기 0건 · `ai-influencer-studio` 미커밋 변경 없음 · 점유표에 인플루언서 범위 없음 · 분석 문서 폴더는 Codex(`codex-win-20261118-influencer-plan`) 미커밋 상태 그대로 둠 |
| 0번 규칙 고지 | `node scripts/apply-source-notice.mjs --check ai-influencer-studio` → 고칠 곳 0개 |

## 2. HANDOFF §5 네 가지 격차 — 실제 소스 판정

| 격차 | 판정 | 근거(경로:줄) | 정정·추가 사실 |
|---|---|---|---|
| G1 얼굴 seed 잠금 오표시 | **존재 확인 → W01a에서 문구 정정(2026-11-18, 미배포·Mac 검수 대기)** | 표시 4곳: `src/components/ControlPanel.tsx:294`(`Seed #98241 LOCK`), `:1103`(`페이스 락(#98241) 화보 생성`), `src/components/ImageDisplay.tsx:90`, `:295`. 생성 요청 `src/lib/gemini.ts:98-106`은 `modelName·parts·aspectRatio·imageSize·timeout·retries`만 보내고 seed 없음 | 실제 얼굴 유지 수단은 `personImage` 1장을 첫 이미지 조각으로 첨부하는 것뿐. 참고 이미지는 실제 형식과 무관하게 모두 `mimeType: "image/png"`로 보냄(`gemini.ts:43-87`) |
| G2 원본/히스토리 혼용 | **존재 확인 + 범위 확대** | `src/app/api/history/route.ts`: 최근 30개·30일, `PHOTO_KEYS`로 참고 사진 제거. 저장 이미지는 클라이언트 `toHistoryJpeg()`(`InfluencerStudio.tsx:24-42`)가 **긴 변 1440px JPEG(품질 0.85)로 줄인 사본** | 생성 원본(1K/2K/4K PNG)은 서버 어디에도 저장되지 않고 브라우저 메모리에만 있다. 캐릭터 기준 원본은 저장소 자체가 없다 |
| G3 보관 예외·게시 후 삭제 | **보관 예외 무시는 확인 / 게시 후 삭제는 원본 삭제가 아님(정정)** | 소스 전체에 `retention_exempt` 0건. 히스토리 GET(`history/route.ts:30-36`)과 5분 예약 작업 `cleanupOldPosts()`(`src/lib/instagram/posting.ts:151` — 공용 `insta-posting` 사본, 기준 `ai-webtoon-studio`, `vercel.json` `*/5`)가 **전체 회원**에서 30일 지난 것을 지움 | 게시 `finally`가 지우는 파일은 `/api/instagram/upload`가 따로 만든 **게시용 임시 사본**(`insta-post-images/{회원}/influencer-insta/{묶음}/NN.jpg`)이다. 히스토리 원본(`aif-history`)은 건드리지 않음 → 설계상 의도. 진짜 문제는 (1) 프로그램 자체 정리가 중앙 정책(`member_storage_expired_files`·`member_storage_policy`는 `retention_exempt` 반영)과 어긋남 (2) 원본이 애초에 저장되지 않음(G2) |
| G4 브라우저 제작을 무인으로 오인 | **존재 확인 + 영상도 해당** | `shorts-onestop-studio/src/lib/pipeline.ts:1` `"use client"`. `ai-video-studio`의 공급자 진행(`advance()`·`claimLock()`, `lib/generations.ts:33,117`)은 화면 조회 `app/api/generations/route.ts`가 부를 때만 진행되고, `ai-video-studio/vercel.json` 예약 작업은 정리(`/api/cron/cleanup`)뿐 | 인플루언서의 일과 예약 `ROUTINE_SCHEDULE_MODE = "off"`(`src/lib/routineSchedule.ts`) 유지. 현재 서버에서 사람 없이 끝까지 도는 단계는 **이미 만든 사진의 인스타 예약 게시**(`/api/instagram/dispatch`)뿐 |

운영 DB 참고(읽기): `aif_history` 전체 0건(관리자·시험 계정 포함 0건). 사용 이력이 없었던 것인지, 예외를 무시하는 정리로 지워진 것인지는 기록이 없어 **판정 불가**.

## 3. W00에서 새로 찾은 격차

| ID | 내용 | 근거 | 영향 | 처리 묶음 |
|---|---|---|---|---|
| G5 | 요청·응답 본문 크기 한도. 참고 이미지(얼굴·장소·상품 3장·직전 결과)를 base64 JSON으로 보내고, 결과도 base64 data URL로 돌려받음 | `InfluencerStudio.tsx:272` → `api/generate-image/route.ts`, `gemini.ts:107` | Vercel 함수 본문 한도 4.5MB. 4K PNG 결과나 참고 이미지 여러 장이면 요청/응답 실패 가능(**재현 미실시**, 유료라 시험 안 함) | W01 — 참고는 자산 ID로 보내고 서버가 저장소에서 읽음, 결과는 서버 저장 후 단기 서명 URL 반환 |
| G6 | 보정 때 직전 결과를 추가로 참조(정밀화 2026-11-18) | `InfluencerStudio.tsx:264-268` — `...config`로 기준 `personImage`는 **유지**하면서 `lastResultImage`를 더한다. `gemini.ts:77-87` | 기준 얼굴 참조가 없어지는 것은 아니다. 격차는 다각도 기준 시트·입력 역할 기록이 없어 보정을 거듭할 때 무엇을 기준으로 삼았는지 남지 않는 것. **실제 얼굴 변형은 실생성으로 확인하지 않음** | W03/W04 — 기준 시트 버전·입력 자산 역할 기록 |
| G7 | 이미지별 순번·역할 계약 없음(정밀화 2026-11-18) | `gemini.ts`가 이미지를 순서대로만 붙임. 장소는 `influencer-engine.ts:122` `[Setting] MATCH PROVIDED BACKGROUND`, 상품은 `:104-108`에 지시가 **있다**. 얼굴 이미지 역할 지시와 「몇 번째 이미지가 어떤 역할인지」 순번 계약은 없음 | 장소·상품 사진을 얼굴 기준으로 오인할 위험(F06-02) | W03 |
| G8 | 인스타 게시 재시도가 `media_publish`에도 적용 | `src/lib/instagram/publish.ts:33-46` `postGraphWithRetry`(“timeout” 문구면 2회) | 같은 컨테이너 재게시는 보통 거절되지만, 응답 유실을 일시 오류로 보고 다시 보내는 구조라 PLAN §16 「게시 응답 유실 시 재전송 금지」와 어긋남. 공용 기준 `instagram-publish`(기준 `insta_auto_poster`) | W07 + **insta 담당께** 전달 |
| G9 | 영상 엔진 제약: Seedance 2.0은 「실사 인물 사진은 업체가 거절」 | `ai-video-studio/lib/video/videoModels.ts:68` 주석 | 실사 인물 I2V 후보에서 제외. 비교 후보는 Kling 3.0·Kling O3·Wan 3.0 | W00 비교 조건에 반영 |
| G10 | 공식 표시명 미적용 | `src/lib/version.ts` `APP_NAME = 'AI 인플루언서 자동화'`, DB `programs.name` 같음 | 「AI Influencer」 표기 미반영. slug·도메인(`ai-influencer.buylife.xyz`)은 유지 | W08 릴리스 때 코드·DB·메타·매뉴얼 함께 |

## 4. 기능 구분 (120개)

구분: **기존**=현재 코드로 동작(통합 검증만), **재사용**=다른 프로그램 기준 코드를 사본/확장, **신규**=새로 개발, **조건부**=공급자 권한·심사·품질 비교 통과가 전제. 「기존」도 새 제품의 완료 표시가 아니다(검증 증거 없음).

| 카테고리 | 기존 | 재사용 | 신규 | 조건부 |
|---|---|---|---|---|
| C01 시작·오늘 작업 | F01-06(가이드 화면 존재) | F01-04(히스토리 확장) | F01-01·02·03·05 | — |
| C02 인물 라이브러리 | — | F02-01(현 이미지 엔진) | F02-02~06 | — |
| C03 외형 유지·학습 | F03-02 일부(personImage 1장) | F03-03(`portrait-photo` faceLocal 후보), F03-01(프롬프트 분리) | F03-04 | F03-05·06(LoRA) |
| C04 성격·생활 | F04-06 일부(현재 한국 시각 문구 `gemini.ts:20`) | F04-02(캡션), F04-04(plan-day) | F04-01·03·05 | — |
| C05 기획 | — | F05-03(plan-day), F05-04(plan-variations), F05-05(캡션·쇼츠 대본), F05-02(쇼츠 발행 계획) | F05-01·06 | — |
| C06 실사 이미지 | F06-04(보정, 단 G6), F06-05(1K/2K/4K·비율) | F06-01(외모/카메라 옵션), F06-02 | F06-03·06 | — |
| C07 품질·검수 | — | — | F07-01~06 | — |
| C08 인물 영상 | — | F08-01·03·04(`ai-video-studio/lib/video/*`), F08-06(`postprocess.ts`) | F08-02 | F08-05(Motion Control) |
| C09 목소리 | — | F09-01·02(`shorts-onestop` tts/freeTts) | F09-03 | F09-04(립싱크 2~10초), F09-05·06 |
| C10 편집·출력 | — | F10-01~04(`shorts-onestop` render/mp4Encoder) | F10-06 | F10-05(PC 실행기 부분) |
| C11 상품·광고 | F11-01·02 일부(광고 모드·상품 3장) | F11-04·05 | F11-03·06 | 전체가 P5 |
| C12 실행 자동화 | — | F12-02 참고(`avs_generations` 잠금), F12-04(공급자 조회) | F12-01·03·05·06 | — |
| C13 일정·실행기 | — | F13-04 참고(`pc-renderer-client`) | F13-01·02·03·05·06 | — |
| C14 게시 | F14-01·02(인스타 피드·캐러셀·예약, 단 G8) | F14-06(게시 기록 확장) | F14-03(릴스) | F14-04(YouTube)·05(TikTok) |
| C15 자료·보관 | — | F15-03(히스토리 확장), F15-04(`retentionExempt.ts`·중앙 정책) | F15-01·02·05·06 | — |
| C16 API 연동 | F16-01(`user_api_keys`) | F16-02·03(영상 모델 목록·어댑터) | F16-04·06 | F16-05 |
| C17 비용 | — | F17-01(모델 단가), F17-05 | F17-02·03·04·06 | — |
| C18 이력·성과 | — | F18-01·02 | F18-03·04 | F18-05·06 |
| C19 권한·설정 | F19-01(`access.ts` 판정 순서) | F19-02(RLS 확장), F19-04, F19-06 | F19-03·05 | — |
| C20 운영·검증 | — | F20-06(배포 규칙) | F20-01·02·03·04·05 | — |

## 5. 공통 계약 확정 (PLAN §13~§15 대비 변경점)

PLAN의 표·API·상태 설계는 그대로 채택하고 아래만 확정·수정한다. W01 migration 초안은 이 계약을 따른다.

### 5-1. 데이터

1. **표 접두어 `aif_` 유지**, 기존 `aif_history`·`aif_insta_posts`·`aif_member_scheduler`는 그대로 둔다(삭제·이름 변경 없음).
2. **원본은 `aif_assets` + 비공개 새 버킷 `aif-assets`**, 경로 `{user_id}/{kind}/{asset_id}.{ext}` 서버 강제. 생성 원본은 해상도 그대로 저장하고 `aif_history`에는 기존처럼 축소 사본만 둔다(히스토리는 목록용, 원본 아님).
3. **보관**(2026-11-18 Mac 반례 반영, §15-1): 중앙 정리 `member_storage_expired_files`는 `retention_exempt AND NOT retention_exempt_manual`(유료·관리자 지정 연장 회원)만 대상이다. **일반 회원(500MB/30일)의 `aif-assets` 정리는 프로그램이 직접 해야 한다.** 프로그램 정리는 `retentionExempt.ts`(공용 기준 미등록, `ai-video-studio/lib/retentionExempt.ts`를 그대로 가져옴)로 `retention_exempt = true` 회원을 모두 빼고(연장 회원은 중앙, 관리자·시험은 무기한), 예외 목록을 못 읽으면 삭제 전체를 멈춘다. 캐릭터 기준 자산도 기간 정책 대상이며, 만료되면 그 인물의 신규 자동 제작을 보류한다(무기한 보관 약속 없음).
4. **게시용 임시 사본은 원본과 별개 수명**: 지금처럼 게시 후 삭제 유지. 원본 자산은 게시 여부로 수명이 바뀌지 않는다.
5. 금액은 `numeric(12,4)` + `currency char(3)`, 시각은 `timestamptz`(UTC).

### 5-2. API

1. 이미지 생성 요청은 **base64 본문 금지** — 참고 이미지는 `assetId` 목록(역할 `face|place|product|base_result` 포함)으로 보내고 서버가 소유자 확인 후 저장소에서 읽는다. 결과는 서버가 저장하고 `{assetId, signedUrl}`을 돌려준다(G5 해소).
2. 기존 `/api/generate-image`·`/api/history`는 새 경로 전환 전까지 유지(T15 회귀 대상). 새 경로는 PLAN §14의 `/api/aif/*`.
3. 오류 코드는 PLAN §14 목록 + `PAYLOAD_TOO_LARGE`, `REFERENCE_ROLE_INVALID` 두 개 추가.

### 5-3. 작업 상태

1. 상태값은 PLAN §15에 `paused` + `pause_reason`을 더한 §17 표를 따른다. 잠금은 `avs_generations`의 `locked_until` 패턴을 참고하되 `aif_job_steps.lease_until + fencing_token`으로 확장.
2. **브라우저 실행과 서버 실행을 상태에 구분해 기록**: `aif_job_steps.executor` = `server|browser|runner`. `browser` 단계는 연결이 끊기면 `waiting_external`이 아니라 `paused(executor_offline)`로 보여 주고 무인 완료로 표시하지 않는다.
3. 영상 공급자 진행은 화면 조회에만 의존하지 않도록 W06에서 서버 예약 진행(정해진 간격 상태 조회)을 추가한다. 그 전까지 「브라우저를 닫으면 영상 진행 확인이 멈춤」을 화면에 표시한다.

### 5-4. 예산

1. 접수 전 `aif_budget_entries`에 `reserved`, 공급자 접수 ID 확인 후 `estimated`, 업체 청구 대조 전에는 `confirmed`로 올리지 않는다.
2. 일간 상한 검사와 예약은 한 트랜잭션(DB 함수)으로 처리해 동시 요청 2건이 상한을 넘지 못하게 한다(T05).
3. `uncertain` 단계의 예약 금액은 자동 환원하지 않는다.
4. 유료 이미지·영상 호출은 `retries: 0` 유지(현행 `gemini.ts:104`와 같음).

### 5-5. 얼굴 유지 표시 계약 (G1 해소 기준)

- `SEED #98241 LOCK`류 문구 4곳 제거. 대신 실제 요청 근거로 「기준 얼굴 참조 사용 중(N장)」 / 「기준 얼굴 없음」만 표시.
- seed를 넣더라도(공급자가 지원할 때만) 「같은 인물 보장」으로 표시하지 않는다. 동일인 판정은 사람 검수·판정불가를 분리한 평가표로만 표시한다(F07-06).

## 6. P0 품질 비교 조건

> **주인님 결정(2026-11-18 채팅)**: 지금은 로직 구현 단계이므로 **개발·기능 시험은 가장 저렴한 모델로** 로직·기능 구현에 집중하고, 아래 상위 모델 품질 비교는 **프로그램 완성 후 최종 테스트 때 함께** 진행한다. 아래 조건표는 그때 쓸 계획으로 보존하며, 그 전에는 실행하지 않는다(요청함 항목 07dccb35 닫음).

기존 결과물 우선: 인플루언서 히스토리 0건이라 재사용할 인물 이미지 없음. 관리자·시험 계정의 완료된 영상 생성 23건(`avs_generations`, 2026-10-22~11-10)이 있으나 내용이 인물 영상인지 미확인 → W00 후속으로 검수 화면에서 인물 클립만 골라 영상 평가표에 먼저 넣는다(비용 없음).

신규 생성이 필요한 최소 조건(실행 전 단가 재확인, 단가 기준 `docs/AI_MODEL_CATALOG.md` 2026-11-03 · `videoModels.ts`):

| 구분 | 조건 | 수량 | 예상 비용(USD) |
|---|---|---|---|
| 이미지 A | `gemini-3-pro-image` 2K, 3명 × (기준 얼굴 1 + 6조건) | 21장 × $0.134 | 약 2.81 |
| 이미지 B | `gemini-nano-banana-2.1` 2K, 같은 기준 얼굴로 6조건 | 3명 × 6 = 18장(+기준 3) 21장 × $0.050 | 약 1.05 |
| 영상 | 대표 컷 1장/인물 × 5초 × 3엔진(Kling 3.0 Std $0.084/s, Wan 3.0 720p $0.10/s, Kling O3 Std $0.14/s) | 9클립 | 약 4.86 |
| 합계 | 재생성 없음, 후보 1장씩 | 51건 | **약 $8.7, 상한 제안 $12** |

6조건: 정면·45도·측면·전신·웃음·다른 조명. 영상 동작: 고개 돌림+깜박임+작은 손동작(1개 고정 프롬프트). 평가는 PLAN §20 판정표 8개 영역을 항목별 `통과/수정 필요/불합격/판정불가`로, 사람 판정과 자동 신호를 다른 열로 기록한다. 실행 계정은 시험 계정 `buylifemall@naver.com` 본인 키(Gemini·fal) — **키 등록 여부 미확인**.

## 7. 파일 범위 (다음 묶음)

| 묶음 | 수정 파일 | 신규 파일 | 다른 담당 협의 |
|---|---|---|---|
| W01 | `ai-influencer-studio/src/app/api/history/route.ts`, `src/components/ControlPanel.tsx`·`ImageDisplay.tsx`(G1 문구만), `src/app/api/generate-image/route.ts`, `src/lib/gemini.ts`(참고 입력 형식만) | `src/lib/retentionExempt.ts`(사본), `src/lib/assets/*`, `supabase/migrations/20261118_aif_assets.sql`(초안, 적용은 별도 승인) | `src/lib/instagram/posting.ts`는 공용 기준 `insta-posting`(기준 `ai-webtoon-studio`, 사본 인플루언서·4컷)의 **사본**이라 직접 고치지 않는다 — `cleanupOldPosts()` 예외 회원 제외는 기준 담당께 요청 후 `--sync`. `publish.ts`(G8)도 공용 사본(`instagram-publish`) |
| W02 | 없음(신규 위주) | `src/lib/jobs/*`, `src/lib/budget/*`, `src/lib/providers/*`, migration 초안 2 | 영상 어댑터는 `ai-video-studio/lib/video/*`를 공용 기준 등록 후 사본으로(Movie 담당과 협의) |

## 8. 다른 담당께 넘길 것

- **insta 담당(공용 기준 `instagram-publish`, 기준 `insta_auto_poster/src/lib/instagram/publish.ts`)께**: `postGraphWithRetry`가 `media_publish` 요청에도 “timeout” 재시도를 적용 — 응답 유실 시 재게시 위험 구조. 컨테이너 생성은 재시도, 게시(`media_publish`)는 재시도 대신 최근 게시 대조로 바꾸는 검토 요청(G8).
- **`insta-posting` 기준 담당(`ai-webtoon-studio/src/lib/instagram/posting.ts`)께**: `cleanupOldPosts()`가 전체 회원의 30일 지난 게시 기록·썸네일을 `retention_exempt`와 상관없이 지운다(G3). 예외 회원 제외(목록을 못 읽으면 정리 중단)를 기준에 넣고 사본(인플루언서·4컷)에 `--sync` 요청. ~~회원 피해가 아니라 관리자·시험 계정 보관 규칙 위반~~ → 철회. 유료 보관 연장 회원도 대상이 될 수 있다(§15-2).
- **Movie 담당(`ai-video-studio`)께**: AI Influencer W02/W05에서 `lib/video/videoProviders.ts`·`videoModels.ts`·`videoParse.ts`를 사본으로 쓸 예정 — 공용 기준 등록 여부·시점 협의 필요. 영상 진행이 화면 조회에만 의존한다는 점(G4)은 영상 스튜디오에도 해당.

## 9. 주인님 결정·조치가 필요한 것

1. ~~P0 유료 비교 실행 승인~~ → **결정됨(2026-11-18)**: 최종 테스트 때 상위 모델 비교와 함께 진행. 개발 중에는 저렴한 모델만.
2. **시험 계정 키 확인**: `buylifemall@naver.com`에 Gemini·fal 키가 등록돼 있는지(없으면 등록 필요).
3. **Master 작업표 등록**: 이 작업은 주인님 직접 지시로 시작했으며, 역할 `sns`·세션 `claude-win-20261118-sns`를 `.ai/TEAM.md`·작업표에 올리는 일은 Master께 요청.

## 10. 다음 작업

W01 착수 조건: 이 계약(§5)에 이의 없음 + §7 파일 범위 점유 등록. **선행 조건(구현 전 필수)**: W00 보완에서 새로 생긴 논리 표 `aif_budget_limits`(§17)·`aif_asset_deletions`(§16)와 DB 함수 `aif_asset_finalize`·`aif_asset_claim_delete`(§16)를 먼저 PLAN §13 데이터 모델과 권한 계약(RLS·서비스 키 전용 쓰기·회원 경계)에 반영해야 한다. PLAN은 다른 세션(`codex-win-20261118-influencer-plan`)의 미커밋 문서라 이 세션이 직접 고치지 않으며, 반영 담당은 Master가 정한다. 반영 전에는 이 표들을 쓰는 코드와 migration을 만들지 않는다. W01 첫 단계는 비용·DB 쓰기 없는 코드 수정(G1 문구, G3 예외 정리, G5 참고 입력 자산화의 서버 경로)과 순수 규칙 시험이다. migration은 초안 파일까지만 만들고 운영 적용은 별도 승인 뒤 메인 PC에서 한다.

## 12. W01 실행 계획 (제품 코드 착수 전 준비 — Master `msg_262b806a9152` 지시)

세션 ID `CC-SNS-01`. 이 절은 계획이며 코드 변경은 아직 없다. 착수 때 `ACTIVE_WORK` 줄과 점유표에 아래 경로를 그대로 등록한다.

### 12-1. 정확한 경로와 권한

| 순서 | 파일 | 변경 | 권한·접근 |
|---|---|---|---|
| 1 | `ai-influencer-studio/src/components/ControlPanel.tsx` (294, 1103줄), `src/components/ImageDisplay.tsx` (90, 295줄) | seed 문구 4곳 → `personImage` 유무로 「기준 얼굴 참조 사용 중」/「기준 얼굴 없음」 표시 (G1) | 화면만, 요청 변화 없음 |
| 2 | `src/lib/retentionExempt.ts` (신규) | `ai-video-studio/lib/retentionExempt.ts` 내용 그대로 가져옴 | 서버 전용, 관리자 클라이언트로 `profiles.retention_exempt`만 읽음 |
| 3 | `src/app/api/history/route.ts` | GET 정리에서 예외 회원은 30일 삭제 제외. 예외 여부를 못 읽으면 **삭제는 하지 않고** 목록만 반환 | 기존 `checkProgramAccessApi()` 유지, 본인 `user_id`만 |
| 4 | `src/lib/assets/` (신규: `paths.ts` 경로 규칙·소유자 검사, `store.ts` 저장/서명 URL) | 원본 자산 저장 컴포넌트 | 경로 `{user_id}/{kind}/{asset_id}.{ext}`를 서버가 만듦, 클라이언트 경로 입력 불허 |
| 5 | `src/app/api/generate-image/route.ts`, `src/lib/gemini.ts`(참고 입력 부분만) | 생성 원본을 서버에서 `aif-assets`에 저장하고 `{assetId, signedUrl}`도 함께 반환. **기존 `imageUrl`(data URL) 응답은 이번 단계에서 유지**(화면 호환), 참고 이미지의 실제 MIME 사용 | 회원 본인 Gemini 키만(현행 `getUserGeminiApiKey`) |
| 6 | `supabase/migrations/20261118100000_aif_assets_w01.sql` (신규, **초안만**) | `aif_assets` 표 + 본인 읽기 RLS + 비공개 버킷 `aif-assets` + `(user_id, created_at desc)`·`(expires_at, deletion_state)` 색인 | 쓰기는 서버(서비스 키)만. 운영 적용은 별도 승인 후 메인 PC |
| 7 | `tests/assetPaths.test.mjs`, `tests/historyRetention.test.mjs` (신규) | 순수 규칙 시험 | — |

참고 이미지를 자산 ID로 받는 새 요청 형식(G5 완전 해소)과 화면 전환은 migration 운영 적용 뒤 W01 후반으로 미룬다. 표가 없는 상태에서 배포되면 원본 저장 단계만 건너뛰고(로그 1줄) 기존 생성은 그대로 동작해야 한다.

#### W01 전반·후반 수용 기준 (Mac SNS-F04 반영)

| 구분 | 범위 | 수용 기준 | G5 판정 |
|---|---|---|---|
| W01 전반 | §12-1 표 1~7 | G1 문구 제거, 예외 회원 정리 분기, 원본 서버 저장(가능할 때)·`assetId` 응답 추가, 기존 화면 무변경 동작 | **해소 아님.** 응답은 여전히 data URL이라 큰 결과는 플랫폼 한도를 넘을 수 있고, 그때는 「원본 저장 성공 + 화면 응답 실패」가 생길 수 있음 — 이 경우를 위해 후반의 재조회 경로가 필요 |
| W01 후반 | 아래 경로 | 요청에 base64 없음(참고 이미지는 `assetId`), 응답은 `{assetId, signedUrl}`만, 보관된 결과를 **생성 재호출 없이** 재조회 | 해소(실제 4K 결과로 확인 시) |

W01 후반 정확 경로(추가):

| 파일 | 변경 |
|---|---|
| `src/lib/assets/config.ts` (신규) | 기능 플래그 `AIF_ASSETS_MODE = "off" \| "shadow" \| "on"`. off=기존 흐름만, shadow=원본 저장만 추가(전반 기본값), on=새 요청·응답 형식. migration 미적용이면 코드가 off로 동작 |
| `src/app/api/aif/assets/upload-ticket/route.ts`, `src/app/api/aif/assets/[id]/complete/route.ts` (신규) | 참고 이미지 업로드 허가·확정(PLAN §14). 크기·MIME·실제 형식 서버 확인 |
| `src/app/api/aif/assets/[id]/route.ts` (신규) | 소유자 확인 후 단기 서명 URL 재발급 — 화면 응답이 실패해도 결과를 다시 가져오는 경로 |
| `src/app/api/aif/generations/route.ts` (신규) | `{ referenceAssets: [{assetId, role}], config }` → 생성 → `{assetId, signedUrl}`. 기존 `/api/generate-image`는 off/shadow용으로 유지 |
| `src/components/InfluencerStudio.tsx` (생성·보정 호출부), `src/components/ControlPanel.tsx` (참고 이미지 올리기), `src/components/ImageDisplay.tsx`·`HistoryDrawer.tsx` (서명 URL 표시·만료 시 재발급) | on일 때 새 경로 사용 |
| `tests/assetsMode.test.mjs`, `tests/referenceRoles.test.mjs` (신규) | 플래그 분기·역할 순번 계약 |

#### 히스토리 정리 범위 보완 (Mac 보완 제안 반영)

- 정리 대상은 GET 정리(`history/route.ts:30-36`)와 **POST의 30개 초과 정리(`history/route.ts:75-76`)** 둘 다다. 「30개 목록 제한」이라 불러도 실제로는 저장 객체를 지우는 동작이다.
- migration 미적용(원본 저장 건너뜀) 상태에서는 옛 히스토리 축소본이 **유일한 영속 사본**이므로, 「원본이 따로 있으니 30개 정리는 괜찮다」는 §12-2의 전제를 모든 기록에 적용하지 않는다. 예외 회원은 GET·POST 두 정리 모두에서 제외하고, 일반 회원의 30개 정리는 현행 유지.
- 예외 판정은 `loadRetentionExemptIds()`(읽기 실패 시 오류)를 쓴다. `isRetentionExempt()`는 조회 오류를 `false`로 돌려주므로 **삭제 허용 판단에 쓰지 않는다**(화면 표시용만). 시험: 조회 오류·null·이상한 모양 응답 때 삭제 0건.

### 12-2. 보관과 원본 보존 규칙

- 히스토리 축소본: 일반 회원 30일·30개 그대로. ~~예외 회원에게도 30개 제한 유지~~ → **철회**. 예외 회원은 GET 30일 정리와 POST 30개 초과 정리 **둘 다에서 제외**한다(아래 「히스토리 정리 범위 보완」이 최종 기준).
- 원본 자산: ~~정리는 중앙 함수에 맡긴다~~ → **철회(§15-1)**. 일반 회원 정리 경로·포스팅 표시·추적 버킷 등록 명세는 §15-1을 따른다. W01에서는 명세와 순수 규칙 시험까지만 하고 실제 삭제 실행 코드는 Master 확인 뒤 연결한다.
- 게시용 임시 사본(`insta-post-images`)은 현행 그대로(게시 후 삭제).

### 12-3. 실패 시 상태 전이

| 상황 | 동작 |
|---|---|
| 생성 성공 → 원본 저장 실패 | 생성 결과는 화면에 그대로 반환(이미 과금됨), 응답에 `assetSaved:false`와 안내. 생성을 다시 요청하지 않음 |
| 저장 성공 → `aif_assets` 행 기록 실패 | ~~올린 파일을 지운다~~ → **철회(Mac SNS-F05)**. 아래 「자산 기록 상태 계약」을 따른다 |
| 예외 목록 읽기 실패 | 히스토리 삭제 건너뜀, 목록은 정상 반환 |
| `aif_assets` 표 없음(운영 미적용) | 원본 저장 건너뜀, 기존 흐름 유지 |

### 12-4. 시험

- 자체: `npm test`(기존 3개 + 신규 2개), `npx tsc --noEmit`, 로컬 `npm run build`. 유료 생성 호출 없이 경로·예외·소유자 규칙만 시험.
- 독립 검수(Mac Tester) 요청 항목: T02 일부(다른 회원 경로 거부), T13 일부(예외/일반 회원 정리 분기), T15 일부(기존 생성·히스토리 화면 회귀). 실제 생성 1회 확인은 유료라 P0 승인 범위 안에서 함께 한다.

### 12-5. 다른 담당 파일과의 충돌

- 공용 사본 `src/lib/instagram/posting.ts`·`publish.ts`는 W01에서 손대지 않는다(§13 수정안은 Master 조정).
- `ai-video-studio/lib/retentionExempt.ts`는 읽기만, 같은 내용을 새 파일로 둔다.
- 배포는 W01 묶음 끝에 한 번(작은 수정 모아 배포), 버전 v1.27은 실제 배포 때만 올린다.

## 13. 공용 코드 최소 수정안 (Master 조정용, 직접 수정·`--sync` 하지 않음)

### 13-1. `insta-posting` — `cleanupOldPosts()` 보관 예외

- 기준: `ai-webtoon-studio/src/lib/instagram/posting.ts` (마지막 변경 `237741cc3`, 미커밋 없음). 사본: `ai-influencer-studio`·`four-cut-comics` 같은 경로(`check-shared-modules` 결과 OK).
- 호출하는 곳: 세 프로그램의 `src/app/api/instagram/dispatch/route.ts` (각 `vercel.json` 예약 실행).
- 최소 수정안: 154줄 조회 전에 예외 회원 목록을 읽어 `.not("user_id", "in", <목록>)`을 붙이고, 목록을 못 읽으면 30일 삭제 부분만 건너뛴다(157~162줄 「게시 중 멈춤」 실패 처리는 그대로 진행). 예외 판정 컴포넌트는 `retentionExempt.ts`(확인: `four-cut-comics/src/lib/retentionExempt.ts` 있음, `ai-webtoon-studio`에는 없음 → 기준 담당이 웹툰에 추가 필요, 인플루언서는 W01에서 추가 예정).
- 등급: ~~회원 피해 없음~~ → **철회(§15-2)**. `retention_exempt`는 유료 보관 연장 회원에게도 켜지므로, 이 정리는 유료 회원의 게시 기록·썸네일을 30일에 지울 수 있다. 등급 판정은 Master 몫(§15-2 근거).

### 13-2. `instagram-publish` — 게시 요청 재시도

- 기준: `insta_auto_poster/src/lib/instagram/publish.ts` (마지막 변경 `237741cc3`, 미커밋 없음). 사본: `ai-influencer-studio`·`ai-webtoon-studio`·`four-cut-comics`. 등록부 밖 손 복사: `labs/kit-insta/src/lib/instagram/client.ts`. 등록부(`docs/SHARED_MODULES.md`)에 적힌 `cardnews-studio/src/lib/instagram/publish.ts`는 실제로 없음 → 등록부 정정 필요.
- 호출하는 곳: 세 스튜디오의 `src/lib/instagram/posting.ts`(`publishPaths`), `insta_auto_poster/src/lib/posts/publish-core.ts`·`src/lib/cardnews/instagram/posts.ts`.
- ~~최소 수정안: `media_publish`만 재시도 0, 나머지는 기존 대조가 처리~~ → **철회(§15-3)**. 재시도 0만으로는 재게시를 막지 못한다. 전체 계약은 §15-3.

## 15. Mac 독립 검수 반례 반영 (Master `msg_104630ed2e4b`, Mac `msg_e6f0471f7d6d`, 검수 고정본 `613ac1da4`)

세 건 모두 **소스·DB 정의상 가능한 경로**이며, 실제 삭제나 중복 게시가 일어났다는 실증은 아니다. 운영 DB는 정의와 건수만 읽었다(2026-11-18).

### 15-1. 일반 회원 원본 정리 경로 (반례 1)

근거: 운영 함수 `member_storage_expired_files`(마이그레이션 `supabase/migrations/0068_storage_posted_retention.sql`·`0073`) 정의는 `where p.retention_exempt and not p.retention_exempt_manual`. 대상은 연장 회원뿐이고 일반 회원은 후보에 없다. 파일 매칭은 `o.name like '%<user_id>%'`, 버킷이 `storage_posting_tracked_buckets`에 없으면 포스팅 보관 기간(`post_days`)을 적용한다. 현재 추적 버킷 0개.

대체 명세(실행 코드는 Master 확인 뒤, 삭제 실행 0):

| 회원 | `aif-assets` 원본 정리 주체 | 기간 |
|---|---|---|
| 일반(`retention_exempt = false`) | **프로그램 정리 작업**(신규, 서버 예약 실행) | 생성 30일 — 무료 정책 `storage_plans.slug='free'`의 `retention_days`를 읽어 적용(코드에 30 고정 금지) |
| 연장(`retention_exempt and not manual`) | 중앙 `member_storage_expired_files` | 정책의 생성/포스팅 기간 |
| 관리자·시험(`retention_exempt_manual`) | 없음 | 무기한 |

- 경로 규칙: `{user_id}/{kind}/{asset_id}.{ext}` — 중앙 매칭(`like '%uid%'`)에 걸리도록 회원 ID를 경로에 반드시 포함.
- 표 등록: 게시한 원본이 포스팅 기간을 받도록 `aif-assets`를 `storage_posting_tracked_buckets`에 등록하고(마이그레이션 0068의 등록 함수 사용), 게시 성공 때 원본에 포스팅 표시(`member_posted_assets`, 공용 컴포넌트 `lib/storage/markPosted.ts` 방식). 등록하지 않으면 중앙 정리가 모든 파일을 포스팅 기간으로 보아 생성 기간보다 길게 남긴다.
- 프로그램 정리 조건: `retention_exempt = false`인 회원만, 예외 목록을 못 읽으면 전체 중단, 한 번에 처리량 제한, 진행 중 작업이 참조하는 자산(`aif_job_steps` 입력)은 건너뛰고 다음 회차로.
- `aif_assets.expires_at`은 표시용이며 삭제 판정의 근거는 위 정책 조회다(정책 변경 때 행을 일괄 갱신하지 않기 위해).

### 15-2. 기존 30일 정리의 유료 회원 영향 (반례 2)

근거: 운영 함수 `member_storage_refresh_exempt`는 `retention_exempt_manual` **또는** 정책상 생성/포스팅 기간이 30일 초과·무기한이면 `retention_exempt = true`로 바꾼다. 즉 저장 구독(라이트·스탠다드·프로)·등급·관리자 지정 연장 회원이 모두 포함된다.

따라서 `retention_exempt`를 보지 않는 두 정리 경로는 **유료 보관 연장 회원의 자료를 30일에 지울 수 있다**(W00 §2 G3·§8·§13-1의 「회원 피해 없음」 철회):
- `ai-influencer-studio/src/app/api/history/route.ts` GET 정리 — 히스토리 축소본과 행
- 공용 `insta-posting`의 `cleanupOldPosts()`(기준 `ai-webtoon-studio`, 사본 인플루언서·4컷) — 게시 기록과 남긴 썸네일

현재 상태(읽기, 2026-11-18): 연장 회원 0명, 관리자·시험 2명, `aif_history` 전체 0건. **이 숫자로 과거 손실이 없었다고 판단할 수 없다** — 삭제된 행은 흔적을 남기지 않으므로, 0건은 「지금 남은 기록이 없다」는 뜻일 뿐이다. 판단할 수 있는 것은 「현재 연장 회원이 0명이라 지금 이 순간 새로 지워질 유료 회원 자료는 없다」까지다. 저장 구독 판매가 시작되면 바로 해당된다. 정책 변경 영향: 무료 정책 기간이 바뀌어도 두 경로는 코드에 30일이 고정돼 있어 따라가지 않는다(`RETENTION_MS = 30 * 24 * 60 * 60 * 1000`, `history/route.ts:13`·`posting.ts:17`).

### 15-3. 인스타 게시 재게시 경로 전체 계약 (반례 3)

`media_publish` 재시도 0만으로 막히지 않는 경로(공용 `insta-posting`·`instagram-publish` 소스, 인플루언서 사본 줄 번호):

| 경로 | 현재 동작 | 위험 |
|---|---|---|
| A. 예약 1차 실패 → 10분 뒤 전체 재시도 | `posting.ts:138-140` — `isTransientPublishError`면 `scheduled`로 되돌림. 재시도는 컨테이너 생성부터 **처음부터 다시** | 1차의 `media_publish`가 실제로는 성공하고 응답만 사라졌으면 두 번째 글이 생김 |
| B. 재시도 전 최근 게시 대조 실패 | `posting.ts:128` `(await fetchRecentMedia(...)) ?? []` — 조회 실패(null)를 「같은 글 없음」으로 보고 그대로 게시. `fetchRecentMedia`는 HTTP 오류·예외·연결 만료 모두 null(`posting.ts:52-64`) | 대조 불능인데 진행 → A의 중복을 막지 못함 |
| C. 즉시 게시 응답 유실 | `api/instagram/publish/route.ts` — 일시 오류면 최근 조회, 같은 이유로 null→`[]`, 못 찾으면 502 반환 | 회원이 다시 누르면 새 사진 묶음으로 재게시 |
| D. 즉시 게시 재진입 | 즉시 게시에 멱등 키·진행 중 잠금 없음, 누를 때마다 `/api/instagram/upload`가 새 묶음 생성 | 연타·두 탭에서 중복 게시 |
| E. 게시 함수 내부 | `publish.ts` `postGraphWithRetry`가 `media_publish`도 “timeout”이면 2회 재시도 | 같은 컨테이너 재게시(Meta가 보통 거절하나 보장 없음) |

대체 계약(공용 수정안, Master 조정 — 사본 직접 수정·`--sync` 없음):

1. **단계 구분 결과**: `publishInstagramPost/Carousel`이 실패 시 `phase`를 돌려준다 — `before_publish`(컨테이너 생성·처리 대기 단계, `media_publish`를 보내지 않음) / `publish_unknown`(`media_publish`를 보냈으나 응답을 확정하지 못함) / `rejected`(Meta가 명시적으로 거절).
2. **자동 재시도는 `before_publish`만**. `publish_unknown`은 자동 재시도 금지 → 상태 `uncertain`으로 두고 대조만 한다. `media_publish`의 `postGraphWithRetry` 재시도는 0.
3. **대조 실패는 fail-closed**: `fetchRecentMedia`가 null이면 「없음」으로 보지 않고 게시하지 않는다. 예약은 `uncertain`(정해진 횟수만 대조 재시도, 이후 회원 확인 대기), 즉시 게시는 「확인 불가 — 인스타에서 확인 후 다시 시도」 안내.
4. **즉시 게시 재진입 방지**: 요청마다 회원별 멱등 키를 받아 게시 기록 행을 먼저 `publishing`으로 잡고(조건부 insert/update), 같은 키나 진행 중 행이 있으면 새 게시를 시작하지 않는다.
5. **예약 중복 실행**: 현재 `scheduled → publishing` 조건부 잠금(`posting.ts:100-107`)은 유지. 30분 넘게 `publishing`인 행을 `failed`로 바꾸는 정리(`cleanupOldPosts`)는 `uncertain`으로 바꾸고 대조 전에는 재게시 대상에서 뺀다.
6. **게시 ID 확보 후 주소 조회 실패**(Mac `msg_f9f028aea54a` 반영): 현재 `publishInstagramPost/Carousel`은 `media_publish`로 게시 ID를 받은 뒤 `getPermalink()`에서 오류가 나면 전체를 예외로 던져 호출부가 「게시 실패」로 기록한다(`publish.ts` `publishInstagramPost` 마지막 두 줄). 계약: `media_publish`가 ID를 돌려준 순간 **게시 성공으로 확정**하고 `media_id`를 즉시 기록에 저장한다. 주소(permalink) 조회 실패는 `permalink = null`로 두고 「주소 확인 대기」로 표시한다. 이후에는 그 `media_id`로 **조회(GET)만** 다시 하며, 다시 게시(`media_publish`)하지 않는다. 실패나 `uncertain`으로 되돌리지 않는다.
7. **기록**: `uncertain`·`already_published` 결과와 대조 시각을 남기고, 확정 성공만 게시 성공으로 집계(F14-06·F18-02).

이 계약은 AI Influencer W07 게시 원장(`aif_publications`, PLAN §13)의 상태(`처리 중/불확실/성공`)와 같은 의미로 맞춘다.

## 16. 자산 기록 상태 계약 (Mac SNS-F05 반영 — §12-3 「행 기록 실패 → 객체 삭제」 대체)

원칙: **서버가 `asset_id`를 먼저 만들고**, 객체 경로와 행이 같은 ID를 공유한다. 결과가 불명이면 지우지 않고 대조한다. 유료 생성은 어떤 경우에도 자동으로 다시 하지 않는다.

| 상황 | 판정 | 동작 |
|---|---|---|
| 객체 업로드 확정 실패(명시적 오류 응답) | 확정 실패 | 행 기록 안 함, `assetSaved:false`. 남았을 수 있는 객체는 아래 고아 정리 대상 |
| 객체 업로드 응답 불명(시간 초과·연결 끊김) | 불명 | 행 기록 안 함, 응답에 `assetSaved:"unknown"`. 객체는 지우지 않음 → 고아 정리가 판단 |
| 행 insert 명시적 실패(제약 위반 등) | 확정 실패 | 객체는 즉시 지우지 않고 고아 정리에 맡김(행이 없으므로 참조 위험 없음) |
| 행 insert 응답 불명 | 불명 | `asset_id` + `user_id` 조건으로 **재조회**. 행이 있으면 성공으로 확정, 없으면 확정 실패로 처리. 재조회 자체가 실패하면 `unknown` 유지·객체 보존 |
| 객체 삭제 실패(정리 중) | — | 행 상태 `deletion_state='failed'`, 다음 회차 재시도. 행을 먼저 지우지 않음 |
| 정책 조회 실패 | — | 그 회차 삭제 전체 중단 |
| 서명 URL 발급 실패 | — | 자산은 유효로 둠, 응답에 `signedUrl:null` + 재발급 경로(`/api/aif/assets/[id]`) 안내 |

고아 정리(정리 작업 안, 같은 회원 경로만 — 경로 첫 부분 = `user_id` 일치 검사). **시간만 지났다는 이유로 지우지 않는다**(Mac `msg_f9f028aea54a` 반영). 행 없는 객체는 아래를 **모두** 만족할 때만 삭제한다:

1. 생성 후 24시간 이상 지남.
2. 같은 `asset_id`에 열린 업로드 허가(`upload-ticket` 발급 후 `complete` 전)가 없음.
3. 같은 `asset_id`에 `unknown` 쓰기 기록(§16 표의 불명 행)이 없음 — 불명 기록이 있으면 보존하고 「확인 필요」로 남긴다.
4. 그 자산을 입력으로 쓰는 진행 중 작업 단계(`aif_job_steps` 비종료 상태)가 없음.
5. **삭제 예약 → 재확인 → 삭제** 순서: 먼저 `aif_asset_deletions`에 삭제 예약 행(정리 실행의 `fencing_token` 포함)을 만들고, 삭제 직전에 1~4를 다시 확인한다. 그사이 행이 생겼거나 다른 정리 실행이 같은 예약을 가져갔으면(토큰 불일치) 삭제하지 않는다.

**저장 확정과 삭제의 원자적 배제**(Mac `msg_bd008991c240` 반영): 삭제하는 쪽끼리의 토큰 비교와 직전 재확인만으로는, 마지막 확인 직후 `complete`(업로드 확정)나 생성 저장이 커밋되고 그다음 객체가 지워지는 경합을 막지 못한다. 그래서 같은 `asset_id`에 대해 **확정하는 쪽(finalizer)과 삭제 예약하는 쪽(claim) 중 정확히 하나만 이기도록** DB 임계 구역에서 처리한다.

- 확정하는 쪽: `upload-ticket` 발급, `complete`, 생성 결과 저장. 모두 하나의 DB 함수(`aif_asset_finalize`)를 거친다.
- 삭제 예약: 하나의 DB 함수(`aif_asset_claim_delete`)를 거친다.
- 두 함수는 같은 `asset_id` 단위 잠금(`pg_advisory_xact_lock(hashtext(asset_id))`)을 잡고, 잠금 안에서 상대 상태를 확인한 뒤 자기 행을 쓴다.
  - 확정 함수: 삭제 예약 행(`aif_asset_deletions`, 상태 `claimed / deleting / delete_unknown`)이 있으면 **거절**(`ASSET_DELETION_IN_PROGRESS`)하고 `aif_assets` 행을 만들지 않는다. 회원 쪽은 새 `asset_id`로 다시 올리라고 안내한다. 유료 생성 결과라면 생성을 다시 하지 않는다. 대신 「저장 실패」를 기록하고, 서버가 같은 결과 바이트를 아직 들고 있을 때만 새 `asset_id`로 한 번 저장을 시도한다.
  - 삭제 예약 함수: `aif_assets` 행이 있거나, 열린 업로드 허가가 있거나, 확정이 진행 중이면 **예약하지 않는다**.
- 예약 취소: 삭제 직전 재확인에서 조건이 깨지면, 외부 삭제를 부르기 전에 예약 행을 `cancelled`로 바꿔 잠금을 푼다. 그 뒤에는 확정이 가능하다.
- **외부 객체 삭제는 DB 바깥에서 일어나므로 원자적이지 않다.** 순서는 이렇다.
  1. 예약을 `deleting`으로 커밋한다.
  2. 저장소 삭제를 호출한다.
  3. 결과에 따라 처리한다.
     - 성공 응답이면 예약을 `deleted`로 바꾼다.
     - 명시적 실패면 `delete_failed`로 바꾸고 다음 회차에 다시 시도한다.
     - 응답 불명(시간 초과·연결 끊김)이면 `delete_unknown`으로 두고, 이후 객체가 있는지 조회만 해서 정리한다.
  - `delete_unknown`과 `deleting` 상태인 동안 그 `asset_id`는 확정할 수 없다(보존 쪽으로 기운다). 정리 실행이 중간에 멈춰도 예약 행이 남아 있으므로 다음 회차가 이어서 확인한다.

조건 판단에 필요한 기록을 읽지 못하면(조회 실패·증거 불명) **보존**한다. 객체 없는 행은 `deletion_state='missing'`으로 표시하고 화면에 「파일 없음」으로 보여 준다. 자동 재생성은 하지 않는다.

migration 초안에서 확인할 항목(DDL이 아직 없어 권한 구현 PASS 아님): `user_id NOT NULL` + FK, 서비스 키로만 쓰기·본인 SELECT RLS, `storage.objects`에 대한 클라이언트 직접 쓰기 차단(서명 업로드만), `(bucket, path)` 유일, MIME·바이트·실제 형식 서버 확인, 중앙 용량 검사(`member_storage_check`) 후 확정, 최종 확정 시험.

## 17. 실행 상태·예산 전이표 (Mac SNS-F06 반영 — §5-3·§5-4 보완, PLAN §15 확장)

PLAN §15 상태값에 `paused`를 **새 상태로 추가**하고, 이유는 별도 열 `pause_reason`에 둔다.

| 대상 | 상태 enum |
|---|---|
| `aif_jobs.status` | `queued / running / paused / waiting_external / needs_review / uncertain / completed / failed / cancelled` |
| `aif_job_steps.status` | 위와 같음 |
| `pause_reason` | `executor_offline / budget_limit / consent_revoked / auth_expired / asset_expired / global_pause` |
| `executor` | `server / browser / runner` |
| 공급자 상태 | 공급자 원문 그대로 `provider_status`에 저장(업무 상태와 분리) |

| 현재 | 조건 | 다음 | 재개 위치·규칙 |
|---|---|---|---|
| running(browser/runner) | 실행기 heartbeat 끊김 + 외부 접수 전 | paused(executor_offline) | 실행기 재연결 시 같은 단계 처음부터. 임대 만료 후 새 `fencing_token` 발급, 옛 실행기 보고는 거절 |
| running(browser/runner) | heartbeat 끊김 + 외부 접수 ID 저장됨 | waiting_external 유지 | 서버가 공급자 상태 조회로 이어감(실행기 불필요) |
| running | 외부 접수 직전 연결 끊김, 접수 여부 불명 | uncertain | 대조만, 자동 재접수 금지 |
| queued/paused | 일간 예산 부족 | paused(budget_limit) | 다음 기간 시작 또는 회원이 상한 변경 후 queued |
| 모든 비종료 상태 | 동의 철회·전체 중지 | paused(consent_revoked / global_pause) | **새 외부 쓰기(생성 접수·게시) 차단**. 이미 접수된 waiting_external은 결과 회수만 하고 후속 단계로 넘어가지 않음 |
| paused(auth_expired / asset_expired) | 회원이 연결·자산 복구 | queued | 복구 확인 후에만 |

예산 원자 계약(Mac `msg_f9f028aea54a` 반영 — 확정 지출 누락 정정):
- **원장 행 하나 = 단계 시도 하나**(`aif_budget_entries`, `step_id+attempt` 유일). 금액 칸은 하나(`amount`)이고 상태만 `reserved → estimated → confirmed` 또는 `released`로 바뀐다. 같은 비용이 두 행에 동시에 있지 않으므로 중복 계상이 없다.
- **일간 상한 사용액 = 같은 회원·같은 예산 일자의 `reserved + estimated + uncertain + confirmed` 합계**. 해제(`released`)만 빠진다. 확정 지출이 빠져 상한을 다시 쓰는 일이 없다.
- 예산 일자: 예약 시각을 회원 시간대로 바꾼 날짜를 행에 고정 저장(`budget_day`). 나중에 확정돼도 날짜를 옮기지 않는다(자정 경계에서 이중·누락 방지).
- 통화: 회원 상한 하나에 통화 하나. 다른 통화 공급자 비용은 실행 전 사전 점검에서 거절(환산하지 않음).
- 원자 처리: 예약·확정·해제는 모두 한 DB 함수 안에서 회원 단위 행 잠금(`aif_budget_limits` 회원 행 `for update`)을 잡고 합계를 다시 계산한 뒤 처리.
- 해제 조건: `failed`(명시적 거절 + 비용 없음 확인)만. `uncertain`·접수 후 `cancelled`는 해제하지 않음.
- 상한을 낮추면: 이미 예약·접수된 행은 그대로 두고, 새 예약만 합계가 새 상한 아래로 내려갈 때까지 막는다(`paused(budget_limit)`).
- 이 항목은 설계 누락 보완이며 실제 스키마 결함을 재현한 것은 아니다.

## 18. PLAN 패치 제안 — W01 자산 첫 단위(W01-A1) 계약 (Master 승인 대상, Master `msg_e908eb8351a4`)

**원본 PLAN은 고치지 않는다.** 이 절은 원본 `docs/analysis-ai-influencer-20261118/PLAN.md`(작성 `codex-win-20261118-influencer-plan`, 미커밋, mtime 2026-11-18T04:24Z, sha256 `31d1ef885f1eb81375cb0140bf3eb5401d69e12f39e5b97391a667d0204ed787`)의 §13 데이터·§14 API·§15 상태에 **추가**할 계약안이다. 효력과 적용 순서는 Master가 검토 후 공식 등록한다. 근거는 검수 수락된 W00 §16(확정·삭제 원자 배제)·§15-1(정리 주체)이다. 이 단위에서 예산 표(`aif_budget_limits`)·작업 원장·유료 AI·게시·새 예약 실행은 만들지 않는다.

### 18-1. 범위

- **포함**: 비공개 원본 자산의 메타 표, 서버가 먼저 정하는 자산 ID, 업로드 허가(ticket)·확정(complete/finalize), 삭제 예약(claim)과 확정의 상호 배제, 조회(서명 URL), 용량 검사 연결.
- **제외**: 실제 삭제를 실행하는 정리 작업(다음 단위), 참고 이미지 요청의 자산 ID 전환(W01 후반), 예산·작업 원장·게시.

### 18-2. 기존 공용 기능 대조 (같은 기능의 새 표를 만들지 않음)

| 공용 기능(실코드) | 실제 동작 | 이 단위의 사용 |
|---|---|---|
| `member_storage_check(uid, add_bytes)` (마이그레이션 `0065`) | `member_storage_usage`의 **측정값**을 읽어 한도와 비교. 80% 넘고 1시간 지났으면 다시 측정. 서비스 키만 실행. **원자적 예약 기능은 없음** | 업로드 허가 때 `add_bytes = 이번 바이트 + 이 회원의 미확정 허가 바이트 합계`로 호출. 새 용량 표 만들지 않음 |
| `member_storage_measure` (`0065`) | `storage.objects`에서 `name like '%<uid>%'`로 회원 파일 크기를 합산 | 경로에 `user_id` 포함 필수 |
| `member_storage_expired_files` (`0068`·`0073`) | 연장 회원(`retention_exempt and not manual`)의 기간 지난 파일만 반환 → 중앙 정리가 **객체를 직접 삭제** | 중앙이 지운 객체의 자산 행은 남음 → 조회 시 `missing` 처리(18-6) |
| `member_mark_posted` / `lib/storage/markPosted.ts` (`0068`) | 게시 파일을 `member_posted_assets`(PK `bucket_id, object_name`)에 기록. 처음 부르면 `storage_posting_tracked_buckets`에 버킷 등록 → 그 뒤 **표시 없는 파일은 생성 기간**으로 정리 | W07 게시 성공 때 `aif-assets` 파일에 호출. 이 단위에서는 호출하지 않음(등록 전에는 중앙이 이 버킷 파일을 「게시됨」으로 보아 길게 보관) |
| `profiles.retention_exempt` + `loadRetentionExemptIdsStrict` (W01b) | 예외 회원 판정, 실패 시 삭제 중단 | 다음 단위 정리 작업에서 그대로 사용 |

### 18-3. 표 `aif_assets` (원본 자산 메타)

| 필드 | 타입·제약 |
|---|---|
| `id` | `uuid primary key` — **기본값 없음**, 허가 함수가 `gen_random_uuid()`로 만든다(클라이언트 ID 불허) |
| `user_id` | `uuid not null references public.profiles(id) on delete cascade` (중앙 `member_storage_usage`와 같은 FK) |
| `kind` | `text not null check (kind in ('ref_face','ref_place','ref_product','generated'))` |
| `bucket` | `text not null default 'aif-assets' check (bucket = 'aif-assets')` |
| `ext` | `text not null check (ext in ('png','jpg','webp','heic'))` |
| `path` | `text not null`, `check (path = user_id::text || '/' || kind || '/' || id::text || '.' || ext)` — 서버 강제 경로 |
| `mime` | `text not null check (mime in ('image/png','image/jpeg','image/webp','image/heic','image/heif'))` |
| `bytes` | `bigint not null check (bytes > 0)` + `check ((kind like 'ref_%' and bytes <= 1048576) or (kind = 'generated' and bytes <= 20971520))` |
| `sha256` | `text null check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$')` — 확정 때 서버가 계산 |
| `state` | `text not null default 'ticketed' check (state in ('ticketed','ready','failed','missing'))` |
| `ticket_expires_at` | `timestamptz not null` — 허가 후 15분 |
| `created_at`·`finalized_at`·`updated_at` | `timestamptz`, `created_at`/`updated_at` not null default now() |

- 유일: `unique (bucket, path)`. 색인: `(user_id, created_at desc)`(목록), `(state, created_at)`(고아·만료 허가 검색), `(user_id, state)`(미확정 합계).
- RLS: `enable`. 정책은 `select` 하나 — `auth.uid() = user_id and state = 'ready'`. insert·update·delete 정책 없음(회원은 쓰기 불가, 서버 함수만).
- `aif_history`와의 연결 칸은 이 단위에서 만들지 않는다(18-8).

### 18-4. 표 `aif_asset_deletions` (삭제 예약, W00 §16)

| 필드 | 타입·제약 |
|---|---|
| `asset_id` | `uuid primary key` — **FK 없음**(행 없는 고아 객체도 경로의 ID로 예약해야 하므로) |
| `user_id` | `uuid not null` |
| `bucket`·`path` | `text not null`, `unique (bucket, path)`, path는 `user_id::text || '/'`로 시작해야 함(check) |
| `state` | `text not null check (state in ('claimed','deleting','deleted','delete_failed','delete_unknown','cancelled'))` |
| `fencing_token` | `uuid not null` — 예약할 때마다 새로 |
| `attempts` | `integer not null default 0 check (attempts >= 0)` |
| `claimed_at`·`updated_at` | `timestamptz not null default now()` |

- 색인 `(state, updated_at)`. RLS `enable`, 정책 없음(서비스 전용, 회원 조회 불필요).

### 18-5. DB 함수와 실행 권한

모든 함수: `security definer`, `set search_path = ''`, `revoke all ... from public, anon, authenticated`, `grant execute ... to service_role`. **회원 세션은 직접 실행하지 못한다** — API 라우트가 `checkProgramAccessApi()`로 로그인·이용권을 확인한 뒤 서비스 키로 부른다(중앙 저장 함수들과 같은 방식).

| 함수 | 입력 → 출력 | 잠금·원자 처리 |
|---|---|---|
| `aif_asset_ticket(p_user, p_kind, p_mime, p_ext, p_bytes)` | → `asset_id, path, ticket_expires_at` 또는 `STORAGE_LIMIT`·`INVALID` | 회원 잠금 `pg_advisory_xact_lock(hashtext('aif_user:'||p_user))` 안에서: ① 만료 안 된 `ticketed` 바이트 합계 계산 ② `member_storage_check(p_user, p_bytes + 합계)`가 false면 거절 ③ 행 insert. 같은 회원의 동시 허가가 서로의 미확정 바이트를 본다 |
| `aif_asset_finalize(p_asset, p_user, p_sha256)` | → `ready` 또는 `ASSET_DELETION_IN_PROGRESS`·`NOT_FOUND`·`EXPIRED`·`MISMATCH` | 자산 잠금 `pg_advisory_xact_lock(hashtext('aif_asset:'||p_asset))` 안에서: ① `aif_asset_deletions`에 `claimed/deleting/delete_unknown` 있으면 거절 ② 행이 `ticketed`·본인·미만료인지 ③ **`storage.objects`에 같은 bucket·name 객체가 있고 `metadata.size = bytes`·`metadata.mimetype = mime`인지** 확인 ④ `ready`로 변경 |
| `aif_asset_claim_delete(p_asset, p_user, p_bucket, p_path)` | → `fencing_token` 또는 거절 | 같은 자산 잠금. `aif_assets`가 `ready`이거나 미만료 `ticketed`면 거절. 아니면 예약 insert/update(새 토큰) |
| `aif_asset_delete_mark(p_asset, p_token, p_state)` | → 성공/토큰 불일치 | 같은 자산 잠금. 토큰이 다르면 아무것도 바꾸지 않음 |

- 잠금 순서: `ticket`만 회원 잠금, 나머지는 자산 잠금 하나 → 두 잠금을 겹쳐 잡는 함수가 없어 교착 없음.
- **용량의 한계(정직하게)**: 중앙에는 예약 기능이 없으므로, 같은 회원이 **다른 프로그램**에서 동시에 저장하는 양은 이 검사에 들어오지 않는다. 그 차이만큼 한도를 잠시 넘을 수 있다(다음 측정 때 반영). 같은 프로그램 안의 동시 허가는 위 잠금으로 막는다.
- **되돌리기**: 허가 15분 만료 시 미확정 합계에서 자동 제외(별도 정리 불필요). 확정이 거절되면 `failed`로 바꿔 합계에서 제외. 올라간 객체는 고아 정리 대상(W00 §16 조건).

### 18-6. 저장소·보관

- 버킷 `aif-assets`: `public = false`, `file_size_limit = 20971520`, `allowed_mime_types = (위 5개)`. `storage.objects`에 회원(authenticated)용 정책을 만들지 않는다 → 클라이언트 직접 쓰기·읽기 불가. 업로드는 서버가 해당 path로만 발급한 서명 업로드 URL(`upsert: false`), 읽기는 서버가 소유자 확인 후 발급한 단기 서명 URL(1시간).
- 보관: 일반 회원 = 프로그램 정리 작업(다음 단위, 무료 정책 기간 조회·`loadRetentionExemptIdsStrict`로 예외 제외). 연장 회원 = 중앙. 관리자·시험 = 없음. 이 단위는 아무것도 지우지 않는다.
- 중앙이 객체를 지운 경우: 조회 API가 서명 URL 발급에 실패하거나 객체가 없으면 행을 `missing`으로 바꾸고 「파일 없음(보관 기간 지남)」으로 응답. 다시 만들지 않음.
- 게시 표시: W07에서 게시 성공 직후 `markPosted(admin, { userId, files: [{ bucket: 'aif-assets', path }], program: 'ai-influencer-studio' })`. 첫 호출부터 이 버킷은 추적 버킷이 된다.

### 18-7. 결과 불명 쓰기 (W00 §16 적용)

| 단계 | 불명일 때 |
|---|---|
| 허가 함수 응답 유실 | 같은 요청을 다시 보내지 않는다. 미확정 허가는 15분 뒤 합계에서 빠지고, 객체가 없으면 정리 대상도 아님 |
| 업로드 응답 유실 | `complete`를 그대로 호출 — finalize가 `storage.objects`를 직접 확인하므로 실제로 올라갔으면 `ready` |
| finalize 응답 유실 | `asset_id + user_id`로 행 재조회해 상태 판정. 재조회 실패면 `unknown`으로 응답하고 아무것도 지우지 않음 |
| 생성 결과 저장(서버 쓰기) 불명 | 유료 생성을 다시 하지 않음. 서버가 결과 바이트를 들고 있는 동안 finalize 재조회 → 실패면 화면에는 생성 결과를 그대로 반환하고 `assetSaved: "unknown"` |

### 18-8. 기존 히스토리와 앞뒤 호환

- **이 단위 적용 전**: 히스토리는 1440px JPEG 축소본만, 원본은 브라우저 메모리에만 있다.
- **적용 후(`AIF_ASSETS_MODE = shadow`)**: 생성 성공 시 원본을 `generated` 자산으로 추가 저장한다. 히스토리 저장·목록·정리(W01b)는 **바뀌지 않는다**. 응답에 `assetId`만 덧붙고, 기존 `imageUrl`(data URL)은 그대로다.
- **migration 미적용·표 없음**: 코드는 `off`로 동작하고 기존 흐름이 그대로 유지된다.
- **옛 히스토리 행**: 원본 자산이 없다. 「원본 없음」으로 두고 소급 생성은 하지 않는다. 히스토리↔자산 연결 칸은 W01 후반에 별도로 제안한다.

### 18-9. 최소 파일과 재사용

| 파일 | 내용 |
|---|---|
| `ai-influencer-studio/supabase/migrations/2026111810xxxx_aif_assets_a1.sql` (초안) | 두 표, 네 함수, 버킷, 권한. **운영 적용은 별도 승인** |
| `src/lib/assets/paths.ts` | 경로·확장자·kind 규칙(순수) |
| `src/lib/assets/store.ts` | 허가·확정·조회 호출, 결과 불명 재조회 |
| `src/app/api/aif/assets/upload-ticket/route.ts`·`[id]/complete/route.ts`·`[id]/route.ts` | 로그인·이용권 확인 후 서버 함수 호출 |
| `tests/assetsA1.test.mjs` | 아래 시험 |

재사용: `referenceImage.ts`의 형식·서명 검사(업로드 확정 전 바이트 확인), `retentionExempt.ts`, `checkProgramAccessApi`, 중앙 `member_storage_check`. 새 패키지 없음.

### 18-10. 시험 계획 (실제 파일 업로드·운영 DB는 미승인 — 격리 환경에서만)

1. **순수·모의(지금 가능)**: `paths.ts` 경로 규칙, `store.ts`를 가짜 RPC로 — 허가 거절·만료·결과 불명 재조회·`missing` 처리·회원 경계.
2. **SQL 계약 시험(격리 DB 승인 필요)**: 트랜잭션 안에서 실행하고 끝에 되돌리는 SQL 스크립트. 확인 항목은 다음과 같다.
   - 동시 허가 2건의 합계가 한도를 넘지 않음
   - 삭제 예약이 있으면 확정이 거절되고, 확정된 자산은 예약이 거절됨
   - 토큰이 맞지 않으면 상태가 바뀌지 않음
   - 회원(authenticated) 역할로 함수 실행이 거부됨
   - RLS가 다른 회원 행과 `ticketed` 행을 숨김
   - check 제약이 잘못된 경로·크기·형식을 거부함

   실행 장소(Supabase 로컬 Docker 또는 브랜치)와 비용은 Master·주인님이 결정한다.
3. **실제 업로드**: 시험 계정, 격리 버킷, 최소 1~2회. 별도 승인이 필요하다.

### 18-11. 단위 완료 조건

- 위 1의 시험이 통과하고, 2는 격리 DB에서 통과(승인 후).
- `AIF_ASSETS_MODE = off`에서 기존 생성·히스토리·게시 회귀가 0.
- `shadow`에서 생성 1건당 자산 행 1개가 `ready`, 경로는 회원 ID로 시작, 다른 회원은 조회 불가.
- 확정과 삭제 예약이 동시에 들어와도 둘 중 하나만 성공.
- 원본 PLAN 미변경, 이 제안의 Master 공식 등록, 원저자 기여 보존.

### 18-R1. 개정 — Mac 최종 반례(`.ai/results/SNS-ASSETS-A1-20261118-CX-QA-01.md` A1-F01~F04)·Master 확인점 반영 (이 절이 18-1~18-11과 다르면 이 절이 우선)

**선택(하나)**: 첫 단위 A1을 **서버가 이미 들고 있는 생성 원본만 서버가 직접 저장하는 shadow 경로**로 좁힌다. 클라이언트 업로드 허가(ticket)·complete·서명 업로드 URL은 **A2로 분리**한다. 이유: 외부 서명 업로드 URL은 설치된 `@supabase/storage-js` 2.117.3 설명상 2시간 유효이고 호출에서 줄일 옵션이 없어(옵션은 `upsert`뿐), DB 허가 시간과 늦은 쓰기 문제가 생긴다. 서버가 직접 올리면 이 문제가 첫 단위에서 사라진다.

**대체되는 항목**: 18-1 포함 목록의 「업로드 허가·확정(complete)」, 18-3의 `ticket_expires_at`·state `ticketed`, 18-5 `aif_asset_ticket`·15분 만료 해제, 18-6 「서명 업로드 URL」·「서명 URL 실패 = missing」, 18-7 허가·업로드 행, 18-9 `upload-ticket`·`complete` 라우트, 18-11 완료 조건.

#### R1-1. A1 흐름(서버 전용)

1. **생성 전 사전 검사(유료 호출 전)**: 화질별 최대 예상 크기(1K 4MiB·2K 10MiB·4K 20MiB)로 `aif_asset_precheck`를 호출한다. 넘으면 **생성하지 않고** 저장공간 부족을 안내한다. 예상치는 보수적인 상한이며 실제 크기 보장은 아니다.
2. **생성(유료)** — 기존 그대로.
3. **서버 바이트 검증**(API store 계층): 생성 결과 바이트로 실제 형식 서명(PNG·JPEG·WebP)을 확인하고, **생성 결과 상한 20MiB**(참고 이미지 1MiB 상한과 분리)를 적용하고, 서버에서 SHA-256을 계산한다. `referenceImage.ts`의 서명 판정을 재사용하되 상한과 허용 형식은 생성용으로 따로 넘긴다. 전체 디코드는 하지 않는다(서명 확인만).
4. **예약** `aif_asset_reserve(p_user, p_mime, p_ext, p_bytes, p_sha256)` → `asset_id, path`. 실제 바이트 수로 다시 검사한다.
5. **서버 업로드**: 서비스 키로 해당 path에 `upsert: false`. 응답의 객체 id(`storage.objects.id`)를 받는다.
6. **확정** `aif_asset_finalize(p_asset, p_user, p_object_id)`.
7. 응답은 기존 `imageUrl`(data URL)을 그대로 두고 `assetId`·`assetSaved`(`true`/`false`/`"unknown"`)만 덧붙인다. 히스토리는 바뀌지 않는다. 응답 4.5MB 한도(G5)는 해소되지 않는다.

#### R1-2. 같은 앱 용량 계산(A1-F01 반영)

새 용량 표는 만들지 않는다. 회원 잠금 `aif_user:<uid>` 안에서 다음을 계산한다.

`사용량 = 중앙 측정값(member_storage_usage.bytes) + 아직 측정에 안 들어간 우리 자산`

`아직 측정에 안 들어간 우리 자산 = (state in reserved·unknown 인 행 전부) + (state = ready 이고 stored_at > member_storage_usage.measured_at 인 행)`

- `reserved`는 업로드가 측정 전에 끝났더라도 계속 더한다(중복 계산 = 보수적인 쪽).
- `ready`는 저장 시각이 마지막 측정보다 뒤이면 더한다. 측정 기록이 없으면 전부 더한다.
- 한도는 같은 잠금 안에서 `member_storage_policy(uid).quota_bytes`를 매번 다시 읽는다(null이면 무제한). 한도를 낮추면 이미 저장된 것은 두고 새 예약만 거절한다.
- `reserve`와 `finalize`는 **같은 회원 잠금**을 쓴다. 이로써 「20씩 6번 = 120 > 100」 반례가 같은 앱에서는 막힌다.
- **보장 범위(정직하게)**: 같은 회원이 **다른 프로그램**에서 마지막 측정 뒤 저장한 바이트는 들어오지 않는다. 측정값이 오래되면 중앙 측정을 다시 부르지 않는 한 그만큼 넘을 수 있다. 원자적 전역 상한 보장이 아니다.

#### R1-3. 표 `aif_assets` 수정점

- state: `reserved / ready / failed / unknown / missing` (`ticketed` 삭제).
- 추가: `stored_at timestamptz`(ready 때), `object_id uuid`(storage 객체 id, 동일성 확인), `missing_reason text check (missing_reason in ('object_absent'))`.
- 삭제: `ticket_expires_at`.
- A1이 쓰는 kind는 `generated`만이다. check는 A2를 위해 `ref_*`도 허용한 채 둔다. 상한 check는 kind별로 분리 유지(ref 1MiB·generated 20MiB).
- 색인 추가 `(user_id, state, stored_at)`.

#### R1-4. 함수(모두 서비스 전용, 잠금 순서 = 회원 → 자산, 예외 없음)

| 함수 | 처리 |
|---|---|
| `aif_asset_precheck(p_user, p_est_bytes)` | 회원 잠금 안에서 R1-2 계산만, 행 없음 |
| `aif_asset_reserve(...)` | 회원 잠금 안에서 R1-2 검사 → `reserved` 행 생성(id 서버 생성) |
| `aif_asset_finalize(p_asset, p_user, p_object_id)` | 회원 잠금 → 자산 잠금. 삭제 예약 확인 → 행 `reserved`·본인 → `storage.objects`에서 `id = p_object_id`·bucket·name·`metadata.size = bytes` 일치 → `ready`, `stored_at = now()`. metadata는 저장소 기록일 뿐이고, 내용 검증은 3번(업로드 전 서버 바이트 검증 + 같은 바이트 업로드 + 객체 id 일치)으로 대신한다 |
| `aif_asset_reconcile(p_asset, p_user)` | 회원 잠금 → 자산 잠금. 객체가 있고 일치하면 `ready`. 객체가 없음이 **확정**되면 `failed`(예약 해제). 조회 실패면 바꾸지 않음 |
| `aif_asset_claim_delete`·`aif_asset_delete_mark` | 18-5와 같되 회원 잠금을 먼저 잡는다 |

- **시간만으로 예약을 풀지 않는다.** `reserved`·`unknown`은 reconcile이 객체 없음을 확정할 때까지 용량에 계속 더한다(A1-F02의 「만료 즉시 해제」 제거).

#### R1-5. 실패·불명 처리

| 상황 | 동작 |
|---|---|
| 사전 검사 불통과 | 생성(유료) 안 함, 저장공간 안내 |
| 생성 후 예약이 한도 초과(사전 예상보다 큼·동시 저장) | 생성 결과는 **그대로 반환**(이미 과금), `assetSaved:false`·`STORAGE_LIMIT`. 재생성·자동 재시도 없음 |
| 원격 요청 전 로컬 검증 실패(R2-2: 저장소에 요청이 나가지 않음 확정) | `failed`(예약 해제), `assetSaved:false`. 원격 응답(4xx 포함)·객체 없음 조회는 해제 근거로 쓰지 않음 |
| 업로드·finalize 응답 불명(시간 초과·연결 끊김·응답 유실) | `reconcile` 1회 → 객체가 있고 일치하면 `ready`, 그 외는 `unknown` 유지·`assetSaved:"unknown"`·용량 계속 계산·아무것도 지우지 않음. 시간이 지나도 자동 `failed` 없음(R2-2) |
| 생성 바이트 검증 실패(서명·상한) | 예약하지 않음, `assetSaved:false`, 생성 결과는 반환 |

#### R1-6. 조회와 missing(A1-F04 반영)

`GET /api/aif/assets/[id]`: 로그인·이용권 → 서비스 키로 본인 행 조회 → 서명 URL 발급.

- 발급 실패 시 `storage.objects` 존재를 조회한다.
  - 객체가 없다고 **확정**되면 `missing`·`object_absent`로 바꾸고 「파일을 찾을 수 없습니다」로 응답한다. 「보관 기간 지남」이라고 단정하지 않는다(삭제 사유를 알 수 없음).
  - 조회 자체가 실패하거나 객체가 있는데 발급만 실패하면 `ready`를 유지하고 「일시적으로 확인할 수 없습니다. 잠시 뒤 다시 시도해 주세요」(503)로 응답한다.
- 재생성은 하지 않는다.

#### R1-7. A2로 넘기는 계약(이번에 구현하지 않음)

- 클라이언트 업로드 허가의 수명은 실제 서명 업로드 URL 수명(2시간)에 여유를 더한 값 이상으로 한다.
- 허가 만료로 예약을 풀지 않는다. 늦은 쓰기는 reconcile로 반영한다.
- 확정 전에 **서버가 객체를 내려받아** 실제 크기·형식 서명·SHA-256을 계산한다. 클라이언트가 보낸 checksum은 증거가 아니다.
- 서명 업로드 URL로 같은 path에 다시 쓰는 것은 `upsert: false`와 객체 id 비교로 막는다. DB 잠금이 외부 쓰기를 막는다고 가정하지 않는다.

#### R1-8. A1 최소 파일

| 파일 | 내용 |
|---|---|
| `supabase/migrations/…_aif_assets_a1.sql`(초안) | 두 표, 함수 6개, 버킷, 권한. 운영 적용은 별도 승인 |
| `src/lib/assets/paths.ts` | 경로 규칙 |
| `src/lib/assets/store.ts` | 바이트 검증·SHA·예약·업로드·확정·reconcile |
| `src/app/api/generate-image/route.ts` | shadow 연결(사전 검사 → 생성 → 저장, `AIF_ASSETS_MODE`) |
| `src/lib/referenceImage.ts` | 서명 판정을 상한·허용 형식 인자로 재사용할 수 있게 노출(기존 동작 불변) |
| `src/app/api/aif/assets/[id]/route.ts` | 조회 |
| `tests/assetsA1.test.mjs` | 모의 시험 |

#### R1-9. A1 완료 조건(정직하게 구분)

- **모의 시험(지금 가능)**:
  - 바이트 검증(형식·20MiB·SHA)
  - 예상 크기 사전 거절 시 생성 0회
  - 생성 후 한도 초과 시 결과 반환 + `assetSaved:false`
  - 업로드·확정 불명 시 `unknown` 유지 + 삭제 0
  - 서명 실패 시 `missing`은 객체 없음 확정에서만
  - `off`에서 기존 생성·히스토리 회귀 0
- **SQL 계약 시험(격리 DB 승인 후)**: 같은 앱 순차 6회 시나리오에서 한도 준수, 잠금 순서, 서비스 전용 실행, RLS, check 제약.
- **실제 저장 1회(별도 승인)**: 시험 계정, 가장 저렴한 모델.
- 위 셋을 각각 따로 보고한다. 모의 시험 통과를 저장 완료로 보고하지 않는다.

### 18-R2. 시각 경계 두 가지 (Master `msg_77d84ced12da`) — R1-2·R1-4·R1-5를 보완

#### R2-1. 중앙 스캔 중 저장된 바이트가 빠지는 경우

실코드 근거(`supabase/migrations/0065_member_storage_check_fast_measure.sql` 17~21·35~37줄): `member_storage_measure`는 `measured_at = now()`로 기록한다. PostgreSQL `now()`는 **트랜잭션 시작 시각**이므로, 파일 목록(`storage.objects`)을 읽는 스냅숏 시각 ≥ `measured_at`이다.

- 우리 객체는 **저장소 API가 먼저 커밋**하고, 그 뒤 `finalize`가 별도 트랜잭션에서 `stored_at = now()`를 적는다. 그러므로 `stored_at` > 객체 커밋 시각.
- 스캔이 객체를 놓치는 경우 = 객체 커밋이 스냅숏보다 뒤 → `stored_at` > 객체 커밋 > 스냅숏 ≥ `measured_at` → **R1-2 식 `stored_at > measured_at`에 반드시 포함**된다.
- 스캔이 객체를 세고 `stored_at > measured_at`도 참인 경우(객체 커밋이 측정 트랜잭션 시작과 스냅숏 사이)는 **이중 계산**이다. 보수적인 쪽이라 허용한다.
- Master가 짚은 「스캔 종료 시각이 measured_at」인 구현이면 누락이 생긴다. 지금 실코드는 그렇지 않지만, 앞으로 중앙 구현이 바뀔 수 있으므로 **안전 여유**를 둔다: `stored_at > measured_at - interval '10 minutes'`. 최근 10분 저장분이 이중 계산될 뿐, 누락은 생기지 않는다(중앙 측정 1회가 10분을 넘기면 여유를 늘린다 — 측정 소요 시간은 운영에서 확인).
- `finalize`의 `stored_at`은 `clock_timestamp()`(실제 시각)로 적어 긴 트랜잭션에서도 뒤로 밀리지 않게 한다.
- 전역 측정(`uid` 없이 호출)의 마지막 문장은 1분 넘게 갱신 안 된 회원 행을 0으로 만든다(39~40줄). 그 순간 `measured_at`도 `now()`로 바뀌므로 위 식이 그대로 적용된다.

#### R2-2. 업로드 시간 초과 뒤 늦은 성공과 reconcile

A1 업로드는 서버가 서비스 키로 직접 올리며 `upsert: false`다. 시간 초과로 우리 쪽이 요청을 끊어도 저장소 서버가 쓰기를 마칠 수 있다(늦은 성공). 그래서 **「지금 객체가 없다」는 영구 부재의 증거가 아니다.**

| 규칙 | 내용 |
|---|---|
| 상태 추가 | `aif_assets.unknown_since timestamptz`(불명 진입 시각, 표시·사람 복구용). 시간 유예 판정에는 쓰지 않는다 |
| 불명 진입 | 업로드·finalize 응답 불명이면 `unknown`·`unknown_since = clock_timestamp()`. `failed`로 바꾸지 않는다 |
| reconcile 판정 (Master `msg_a0de9ab06bfc` 확정) | 객체가 있고 `bucket·name·size` 일치 → `ready`. **객체 없음은 몇 번·얼마나 지나도 `failed`의 근거가 아니다**(시간 유예·연속 횟수 규칙 삭제 — 늦은 외부 커밋이 없다는 증거가 되지 않음). `unknown`은 계속 용량에 계산하고 자동 재업로드·자동 삭제를 하지 않는다 |
| 예약 해제(`failed`) 조건 (Master `msg_579b65e8bcf2` 확정) | **그 경로에 이전·현재 외부 쓰기 가능성이 전혀 없음이 확정된 경우만**: 원격 요청을 보내기 **전**의 로컬 검증 실패(바이트 서명·상한·SHA 계산 실패·예약 함수 거절)처럼 저장소에 요청 자체가 나가지 않은 경우. **4xx 응답 전체를 「미전달·저장 없음」으로 취급하지 않는다.** 특히 **중복 경로(이미 있음) 거절은 해제 근거가 아니다** — 기존 객체가 우리 예약의 것일 수 있으므로, 그 객체를 서버가 조회해 `bucket·name·size·object id`까지 우리 예약과 일치하면 `ready`, 다른 객체이거나 조회 불명이면 `unknown`(예약 유지). 시간 초과·연결 끊김·응답 유실·그 밖의 원격 오류는 모두 `unknown` |
| 남은 `unknown` 처리 | A1에서는 자동 처리하지 않는다. 화면에는 「저장 확인 중」으로 보이고, 사람 확인 또는 **별도 복구 단위**(후속 배정)로 넘긴다. 다음 단위의 고아 정리나 중앙의 나중 측정을 **A1 상한의 안전 근거로 쓰지 않는다** |
| 동시 쓰기 울타리 | 같은 `asset_id`·path는 예약 1건만 생기고(id 서버 생성·`unique(bucket,path)`), 업로드는 `upsert: false`라 두 번째 쓰기는 저장소가 거절한다. `finalize`는 업로드 응답의 객체 id와 `storage.objects.id`를 대조하므로 다른 쓰기의 객체를 우리 것으로 확정하지 않는다. DB 잠금이 저장소 쓰기를 막는다고 가정하지 않는다 |
| 누가 reconcile하나 | A1에서는 **같은 생성 요청 흐름**이 업로드 직후 1회만 부른다. 주기 실행은 A2 이후(정리 작업과 함께). GET 조회는 `unknown` 행에 「확인 중」으로 응답하고 reconcile하지 않는다 |

보장 범위(정직하게): `unknown`이 쌓이면 그만큼 회원 한도가 보수적으로 줄어든다(실제보다 많이 쓴 것으로 계산). 이것은 한도를 넘기지 않는 쪽의 오차이며, 풀어 주는 일은 사람 확인·별도 복구 단위에서만 한다. R2-1의 10분 여유도 정확성 증명이 아니라 보수적 여유일 뿐이며, 측정 시각 순서 조건(측정 트랜잭션 시작 ≤ 스냅숏 < 우리 객체 커밋 < `stored_at`)이 실제 근거다.

## 19. 일반 회원 30일 보관 정리 — 첫 정리 단위 계약안 (W01-R1, Master `msg_3e5657eeafec`, 판정 대기)

**설계안이다. 제품 코드·SQL 실행·표 생성·예약 등록 0.** §14-B의 6·7·8과 10의 최소 범위만 다룬다. 9(`unknown`·고아 복구)는 후속 단위로 분리한다(§19-9).

### 19-1. 공용 원문 대조 (변경 없이 쓰는 것)

| 원문 | 실제 동작 | 이 단위의 결론 |
|---|---|---|
| `supabase/migrations/0068`·`0073` `member_storage_expired_files` | `p.retention_exempt and not p.retention_exempt_manual` 회원의 기간 지난 객체만 반환(`workspace-files` 제외). 기산일은 `storage.objects.created_at` | 중앙은 **연장 회원만** 다룬다. 일반 회원은 우리 정리가 맡는다 |
| `app/api/cron/storage-retention/route.ts` | 위 목록을 `storage.remove()`로 지우고 회원별 `member_storage_measure(uid)` 호출. `CRON_SECRET` Bearer 인증 | 같은 인증·같은 측정 갱신 방식을 따른다 |
| `0068` `member_storage_refresh_exempt` | 수동 열외 **또는** 정책 기간이 30일 초과·무기한이면 `profiles.retention_exempt = true` | 보호 판정은 **프로필 한 곳**(`retention_exempt`)만 본다. 구독·등급·관리자 지정을 따로 계산하지 않는다 |
| `0068` `member_storage_policy(uid)` | 회원의 `retention_days`(무기한이면 null) | 일반 회원의 기간은 이 함수 값(무료 정책)을 읽는다. 코드에 30 고정 금지 |
| `0068` `member_mark_posted`·`storage_posting_tracked_buckets` | 추적 버킷이 아니면 중앙은 모든 파일을 포스팅 기간으로 본다 | **일반 회원은 발행과 무관하게 같은 기간**(주인님 2026-11-11 결정)이라 이 단위는 posted를 보지 않는다. 연장 회원은 `aif-assets`가 추적 버킷이 되기 전까지 중앙이 포스팅 기간(더 긺)으로 보관한다 — 회원에게 유리한 쪽의 오차. 등록 시점은 W07에서 게시 성공 직후 첫 `markPosted` 호출(공용 변경 없음) |
| `ai-influencer-studio/src/app/api/instagram/dispatch/route.ts` | `CRON_SECRET` Bearer, Vercel 예약 호출 | 운영 정리 작업은 운영자 예약 호출 대상(루트 원칙 26: 30일 자동 삭제 같은 운영 정리는 회원 cron 규칙 대상 아님) |

**이중 삭제 0**: 우리 정리는 `retention_exempt = false`만, 중앙은 `retention_exempt = true and not manual`만 다룬다 — 두 집합은 겹치지 않는다. 관리자·시험(`manual`)은 양쪽 모두 대상이 아니다.

### 19-2. 새 상태가 하나 필요한 이유 — `expired`

지금 `aif_asset_claim_delete`는 `reserved·ready·unknown`을 「사용 중」으로 거절한다. `ready`를 곧바로 삭제 예약할 수 있게 풀면 ① 「사용 중 자산은 지우지 않는다」는 뜻이 깨지고 ② 조회가 서명 URL을 막 발급한 직후 삭제가 들어오는 경합이 생긴다. 임의로 `failed`·`missing`으로 바꾸는 것은 사실과 다른 상태다. 그래서 **기한 만료 전용 상태 하나**를 둔다.

- `aif_assets.state`에 `expired` 추가, `expired_at timestamptz` 열 추가, 제약 `state <> 'expired' or expired_at is not null`.
- `expired`는 조회에서 404 `ASSET_EXPIRED`(「보관 기간이 지났습니다」 — 우리가 판정한 확정 사실이므로 이 문구를 쓸 수 있다). 서명 URL을 더 발급하지 않는다.
- `claim_delete`는 지금도 `reserved·ready·unknown`만 거절하므로 `expired`는 **기존 함수 수정 없이** 삭제 예약이 된다.

### 19-3. 추가 DB 함수 2개 (서비스 전용, 잠금 순서 회원 → 자산)

| 함수 | 처리 |
|---|---|
| `aif_asset_expire(p_asset, p_user)` → `expired / restored / not_due / skip` | 잠금 안에서 ① `profiles.retention_exempt`를 **그 순간 다시 읽는다**(true면 대상 아님) ② `member_storage_policy(p_user).retention_days`(null이면 대상 아님) ③ 기산일 `aif_assets.created_at` + 기간 < now() ④ 삭제 예약 진행 중 아님. `ready`이고 조건 충족 → `update … where state = 'ready' and object_id = <읽은 값>`(CAS)로 `expired`. 이미 `expired`인데 조건이 더는 맞지 않으면(그사이 구독·정책 연장) `ready`로 **복원**하고 `restored`. 멱등 |
| `aif_asset_delete_verify(p_asset, p_user, p_token)` → `deleted / delete_failed / unknown` | 토큰 일치 확인 뒤 `storage.objects`에서 `bucket`·`name`을 조회. 행이 없으면 `deleted`, 우리 `object_id`와 같은 객체가 있으면 `delete_failed`(다시 시도 대상), 조회 불가·다른 id의 객체가 있으면 바꾸지 않고 `unknown`. Supabase 저장소의 객체 목록 원천이 `storage.objects`이므로 SDK `exists()`(400/404 구분 불가) 대신 이것을 쓴다 |

### 19-4. 정리 실행 순서 (한 자산)

1. 후보 조회: `state = 'ready'`, `created_at < now() - 최소 기간`, `user_id not in (예외 회원)` — 예외 목록은 `loadRetentionExemptIdsStrict`(못 읽으면 **회차 전체 중단**). 한 회차 최대 100건.
2. `aif_asset_expire` → `expired`가 아니면 건너뜀.
3. `aif_asset_claim_delete`(경로·소유·id 대조, fencing 토큰 발급).
4. **삭제 직전 재확인**: `aif_asset_expire`를 다시 호출 — `restored`면 `delete_mark(cancelled)`로 끝낸다(삭제 0).
5. `delete_mark(deleting)` 커밋 → `storage.remove([path])`.
6. 결과: 성공 응답이고 반환 목록에 그 path가 있으면 `delete_verify` → `deleted`면 `delete_mark(deleted)`. 오류 응답이면 `delete_mark(delete_failed)`. 던짐·시간 초과·모양 이상·반환 목록에 없음이면 `delete_mark(delete_unknown)` 뒤 `delete_verify` 1회.
7. 회원별로 `member_storage_measure(uid)` 호출(중앙 정리와 같음).

**원자성 한계(정직하게)**: 4의 재확인과 5의 외부 삭제 사이에 회원이 구독하면 그 파일은 지워질 수 있다(창은 요청 한 번 길이). 외부 삭제는 DB 밖이라 원자적이지 않고, `remove()`는 path 기준이라 객체 id를 지정하지 못한다 — 우리 경로는 `upsert:false`로 우리만 쓰므로 다른 객체로 바뀌는 일은 설계상 없지만 보장은 아니다.

### 19-5. 재시도·기록

- `delete_failed`는 다음 회차에 `claim_delete`가 새 토큰으로 다시 잡는다. `attempts` 5회를 넘으면 그 자산은 건너뛰고 건수만 기록(사람 확인 대상).
- `delete_unknown`은 `delete_verify`가 `deleted`·`delete_failed`로 확정할 때만 바뀐다. 시간으로 넘기지 않는다.
- 계보: `aif_assets` 행(`expired`·`expired_at`)과 `aif_asset_deletions` 행(상태·`attempts`·시각)을 남긴다. 메타 행 자체의 정리는 이번 범위 밖.
- 로그·응답: 건수와 코드만. 경로·키·오류 원문 0.

### 19-6. 용량 계산에 미치는 영향

- `aif_asset_usage_estimate`는 `reserved·unknown` 전부와 최근 `ready`만 더한다 → `expired`는 **우리 추가분에 들어가지 않는다**. 객체가 실제로 남아 있는 동안에는 중앙 측정이 그 바이트를 센다(저장된 지 오래라 측정에 이미 포함) → 과소 계산 없음.
- 삭제가 `deleted`로 확정되고 7의 측정이 돌면 그 바이트가 빠진다. 「예약 해제」의 근거는 `storage.objects`에 객체가 없다는 확인이다.
- `reserved`·`unknown`·고아 객체는 **이 단위에서 풀지 않는다** — 늦은 쓰기가 더는 없다는 증거가 없기 때문이다(§18-R2).

### 19-7. 실행자·인증·모드

- 라우트 `GET /api/aif/assets/cleanup`: `CRON_SECRET` Bearer(없거나 다르면 401). `AIF_ASSETS_MODE`가 off면 인증 뒤 `{ skipped: true }`만 돌려주고 DB·저장소 호출 0.
- **예약 등록(`vercel.json`)은 이 단위에서 하지 않는다** — 운영 ON 승인 때 함께.
- 회원 키·사용기간: 정리는 AI·외부 계정 호출이 없어 **회원 키가 필요 없다**. 이용 권한이 끝난 회원의 원본에도 같은 기간 규칙을 적용한다(권한 유무로 보관을 늘리거나 줄이지 않는다).

### 19-8. 최소 파일(구현 배정 시)

| 파일 | 변경 |
|---|---|
| `supabase/migrations/20261118120000_aif_assets_a1.sql`(미적용 초안) | `expired` 상태·`expired_at`·제약, 함수 2개 |
| `src/lib/assets/retention.ts` (신규) | 주입형 정리 로직(§19-4) |
| `src/app/api/aif/assets/cleanup/route.ts` (신규) | 인증·모드·지연 의존성 |
| `src/lib/assets/read.ts` | `expired` → 404 `ASSET_EXPIRED` |
| `tests/assetRetention.test.mjs` (신규), `tests/sql/a1_contract.test.mjs`(추가) | 아래 반례 |

필요 반례만: 예외 목록 조회 실패 시 삭제 0 · 보호 회원(유료·수동) 미대상 · 기간 미도래 미대상 · 무기한(null) 미대상 · `expire` CAS(다른 `object_id`) · 재확인에서 `restored` → 삭제 0·`cancelled` · `remove` 오류/던짐/목록에 없음 → `deleted` 아님 · `delete_verify` 세 갈래 · `attempts` 상한 · off에서 호출 0 · 다른 회원 경로 0 · `reserved`/`unknown`은 후보 아님 · (격리 2연결) 조회 직후 `expire`와 `finalize`·`claim` 경합.

### 19-9. 완료 조건과 후속 분리

- **이 단위 완료**: 위 모의·격리 반례 통과, off에서 동작 변화 0, 일반 회원의 기간 지난 `ready`가 `expired → deleted`로 가고 보호 회원·`reserved`·`unknown`은 건드리지 않음. 실제 저장소 삭제·예약 등록·운영 적용은 포함하지 않는다.
- **후속(별도 단위)**: `unknown`·`reserved` 복구와 고아 객체 정리, 중앙이 지운 연장 회원 자산 행의 정리, 메타 행 보관 기간, 게시 연결 시 `markPosted`.

### 19-R1. 개정 — Mac 정적 검토(`msg_7ca376e6f3a6`)·Master `msg_41d24656f73f` 반영 (§19-1~19-9와 다르면 이 절이 우선, 코드 0)

**정정하는 표현**
- §19-1의 「이중 삭제 0」은 **정적 집합이 겹치지 않는다**는 뜻일 뿐 절대 보장이 아니다. 회원 등급·구독이 정리 도중 바뀌면 우리 정리와 중앙 정리가 같은 파일을 다룰 수 있다(한계). 외부 삭제 요청도 원자적이지 않다.
- §19-1의 「중앙 cron은 `CRON_SECRET` Bearer 인증」은 불완전했다. 실코드(`app/api/cron/storage-retention/route.ts`)는 **Bearer 머리글 또는 `?secret=` 쿼리**를 받는다. 새 정리 라우트는 **Bearer 전용**으로 한다(쿼리 비밀값은 접근 기록에 남을 수 있음).

#### R1-F01. 용량 계산 — `expired`를 빼지 않는다 (§19-6 대체)

반례: 한도 100, 오래된 `ready` 60, 중앙 측정 0(미측정·오래된 회차) → `expired`로 바뀌어 추가 합계 0 → 삭제가 끝나지 않았는데 새 60이 허용된다.

- `aif_asset_usage_estimate`의 추가분 = `reserved`·`unknown` 전부 + 최근 `ready`(기존 규칙) + **`expired` 전부. 단 그 자산의 삭제 예약이 `deleted`로 확정된 것만 제외**한다.
- 「중앙 측정에 이미 들어 있을 것」을 근거로 시간만 지났다고 빼지 않는다. 제외 근거는 `delete_verify`가 `storage.objects` 부재를 확인해 남긴 `deleted`뿐이다.
- 결과: 중앙 측정이 그 객체를 이미 세고 있으면 삭제 전까지 **이중 계산**된다(보수적인 쪽, 허용). `deleting`·`delete_failed`·`delete_unknown`·예약 없음인 `expired`는 모두 계속 계산한다.

#### R1-F02. 후보는 `ready`만이 아니다 — 재처리·재개 (§19-4 1번 대체)

한 회차는 아래 세 묶음을 모두 훑는다. 각 단계는 멱등이라 중간에 죽어도 다음 회차가 같은 지점에서 이어 간다.

| 묶음 | 대상 | 처리 |
|---|---|---|
| A | `ready` + 기간 경과 + 예외 회원 아님 | `expire` → `claim` → … (신규) |
| B | `expired`이고 삭제 예약이 **없음 / `cancelled` / `delete_failed` / `claimed`** | 보호 변경 재검사(`expire`) → 유효하면 `claim`(또는 기존 `claimed` 토큰은 버리고 재발급 가능한 상태일 때만 새 토큰) → 삭제 |
| C | 삭제 예약이 **`deleting` / `delete_unknown`** | 새 삭제 요청 없이 `delete_verify`만. 결과가 `delete_failed`면 다음 회차 B로 |

- `claimed`에서 멈춘 것(토큰을 잃은 경우): `claim_delete`는 `claimed` 중 재발급을 거절하므로(`DELETION_BUSY`), `claimed`가 일정 회차 이상 그대로면 **토큰 없이도 부를 수 있는 「claimed → cancelled」 정리 경로가 필요**하다 → `aif_asset_expire`가 토큰 없이 호출됐고 예약이 `claimed`이며 `updated_at`이 1시간 넘었으면 `cancelled`로 바꾸게 한다(외부 삭제는 `deleting` 커밋 뒤에만 나가므로 `claimed`에는 외부 쓰기가 없다 — 안전하게 취소 가능).
- 여기의 `delete_unknown`(삭제 결과 불명)은 §18-R2의 `unknown`(업로드 결과 불명)과 **다른 것**이다. 업로드 `unknown`·`reserved`·고아는 계속 후속 단위다.

#### R1-F03. `expire`와 삭제 예약의 관계 (§19-3·19-4 4번 대체)

§19-3은 「삭제 예약 진행 중 아님」을 `expire` 조건으로 적고, §19-4는 `claim` 뒤에 `expire`를 다시 부른다고 적어 서로 부딪쳤다. 아래로 통일한다.

`aif_asset_expire(p_asset, p_user, p_token default null)` — 잠금 안에서 현재 삭제 예약 상태에 따라:

| 삭제 예약 상태 | 조건 충족(보호 아님·기간 경과) | 조건 깨짐(보호됨·기간 미경과·정책 무기한) |
|---|---|---|
| 없음 / `cancelled` / `delete_failed` | `ready`→`expired`(CAS) 또는 `expired` 유지 → `expired` | `expired`면 `ready`로 복원 → `restored` |
| `claimed` + **토큰 일치** | `expired`(삭제 진행 허용) | `ready` 복원 + 예약을 같은 거래에서 `cancelled` → `restored` |
| `claimed` + 토큰 없음·불일치 | 바꾸지 않음 → `busy`(위 R1-F02의 1시간 경과 취소만 예외) | 같음 |
| `deleting` / `delete_unknown` / `deleted` | 바꾸지 않음 → `locked` | **복원 금지** → `locked`(이미 외부 삭제가 나갔거나 끝남) |

- 보호 여부·정책을 읽지 못하면 `unknown`을 돌려주고 아무것도 바꾸지 않는다.
- **삭제 허용 조건은 하나**: 같은 토큰으로 부른 재확인이 `expired`를 돌려준 직후, 같은 토큰의 `delete_mark(deleting)`이 `true`. 그 밖의 반환(`restored`·`not_due`·`skip`·`busy`·`locked`·`unknown`)과 호출 오류는 모두 **삭제 0**.

#### R1-verify. 삭제 요청·확인 결과별 최종 처리 (§19-4 6번 대체)

`storage.remove()` 응답만으로 `deleted`·`delete_failed`를 단정하지 않는다. 항상 `delete_verify`의 판정으로 마무리한다.

| `remove` 응답 | 다음 |
|---|---|
| 성공 응답(목록에 path 있음·없음 무관), 오류 응답, 던짐·시간 초과·모양 이상 | 먼저 `delete_mark(delete_unknown)`(성공 응답이고 목록에 있으면 생략 가능) → `delete_verify` |

| `delete_verify` 판정 | 근거 | 최종 mark | 그 뒤 |
|---|---|---|---|
| 객체 없음 | `storage.objects`에 그 bucket·name 행이 없음 | `deleted` | 자산은 `expired`로 남음(종료). 용량 추가분에서 제외, `member_storage_measure(uid)` |
| 같은 객체 있음 | 같은 `object_id`의 행이 있음 | `delete_failed`(`attempts` 유지) | 다음 회차 B에서 재시도. 5회 초과면 건너뜀·건수 기록 |
| 다른 id의 객체 있음 | 같은 path에 다른 `id` | 바꾸지 않음(`delete_unknown` 유지) | **재삭제 0**, 사람 확인 대상으로 건수 기록 |
| 조회 오류 | `storage.objects` 읽기 실패 | 바꾸지 않음 | 다음 회차 C에서 다시 확인 |
| 토큰 불일치 | `delete_mark`·`delete_verify`가 false | mark 0 | **그 자산 처리 즉시 중단**(다른 실행이 가져감), 원문 로그 0 |

#### R1-기산일. 보관 기간을 세기 시작하는 시각 (§19-3 ③ 대체)

- 후보: 예약 시각 `aif_assets.created_at` / 객체 생성 시각 `storage.objects.created_at`(중앙이 쓰는 값) / 확정 시각 `aif_assets.stored_at`.
- **선택: `stored_at`**. 이유: 셋 중 가장 늦어 조기 삭제가 없고, 우리 행에 있어 저장소 조회 없이 판정할 수 있다. 예약~확정 차이는 보통 초 단위다.
- **보수 여유 1일**: 삭제 기준 = `stored_at + retention_days + 1일`. 회차 지연·시간대 차이로 기간보다 일찍 지우는 일을 막는다. 결과적으로 일반 회원 원본은 정책 기간보다 최대 「1일 + 회차 간격」 늦게 지워진다(중앙과 기준 시각이 달라 생기는 차이도 이 여유 안).

#### R1-tracked. 추적 버킷 등록 시점은 정책 결정으로 분리 (§19-1 표의 해당 줄 대체)

- 사실: `aif-assets`가 `storage_posting_tracked_buckets`에 없는 동안 중앙은 연장 회원의 이 버킷 파일을 **포스팅 기간**으로 보관한다. W07에서 첫 `markPosted`가 불리면 그 순간부터 이 버킷이 추적 버킷이 되고, **그 전에 저장된 미발행 유료 회원 원본의 기간이 포스팅 기간 → 생성 기간으로 한꺼번에 줄어든다**(예: 스탠다드 180일 → 60일). 이미 그 기간을 넘긴 파일은 다음 중앙 회차에 지워질 수 있다.
- 그래서 「W07 때 자연히 등록」을 기본으로 두지 않는다. **운영 ON 전에 정할 정책**으로 분리한다: (가) ON과 동시에 추적 버킷으로 등록해 처음부터 생성 기간을 적용 / (나) W07까지 미등록으로 두고 전환 때 기존 파일을 어떻게 다룰지 정함. 공용 표에 쓰는 일이므로 Master 조정·주인님 결정 대상이며 이 단위에서는 실행하지 않는다.
- 일반 회원은 발행과 무관하게 같은 기간이라 이 결정의 영향을 받지 않는다.

#### R1-완료 조건(§19-9 보완)

모의·격리 반례에 다음을 더한다: 오래된 `ready` 60·중앙 0·한도 100에서 `expired` 뒤 새 60 거절 · `deleted` 확정 뒤에만 허용 · 묶음 B·C 재개(회차 중단 뒤 다음 회차) · `claimed` 토큰 분실 1시간 뒤 취소 · `deleting`/`delete_unknown`/`deleted`에서 복원 0 · 토큰 불일치 시 mark 0·중단 · `remove` 오류 응답인데 실제로 지워진 경우 `deleted` · 다른 id 객체면 재삭제 0.

### 19-R2. 최종 잔여 정정 — Mac `msg_203fc69604e2`·Master `msg_da2a74d17657` (§19·§19-R1과 다르면 이 절이 우선, 코드 0)

R1의 F01(`expired` 전부 가산)은 그대로 둔다. 아래 네 가지만 바꾼다.

#### R2-1. 외부 삭제를 시작한 뒤의 판정 (R1-verify 표 대체)

원칙은 업로드 때(§18-R2)와 같다. **외부 `remove` 요청을 보낸 뒤에는, 「지금 객체가 있다」는 사실이 그 요청이 끝났다는 증거가 아니다**(늦게 처리될 수 있다).

| `remove` 뒤 `delete_verify` 판정 | 최종 상태 | 그 뒤 |
|---|---|---|
| 객체 없음(`storage.objects`에 그 bucket·name 행 없음) | `deleted` | 용량 추가분에서 제외, `member_storage_measure(uid)` |
| 같은 `object_id`의 객체가 아직 있음 | **`delete_unknown` 유지**(R1의 `delete_failed` 철회) | 용량 계속 계산. **자동 재삭제 0, `ready` 복원 0.** 다음 회차는 확인(verify)만 |
| 조회 불명(읽기 실패) | `delete_unknown` 유지 | 다음 회차 확인만 |
| 같은 path에 다른 `id`의 객체 | `delete_unknown` 유지 | 재삭제 0, 사람 확인 대상 건수 기록 |
| 토큰 불일치 | mark 0 | 그 자산 처리 즉시 중단 |

- `delete_failed`(재시도 가능)와 「보호 변경으로 `ready` 복원」은 **외부 요청을 보내지 않았음이 확정된 실패에만** 쓴다 — `deleting`을 커밋하기 전의 로컬 실패(토큰·상태 CAS 실패, 재확인에서 `restored`·`busy`·`unknown`). `remove`를 부른 뒤의 오류 응답·4xx 전체·던짐·시간 초과는 모두 「미전송」으로 취급하지 않는다.
- 따라서 R1-F02의 묶음 B(재시도)는 예약 없음·`cancelled`·`delete_failed`·오래된 `claimed`만 다루고, **`delete_unknown`은 묶음 C에서 확인만 한다**. 오래 남는 `delete_unknown`의 해소(사람 확인·별도 복구)는 업로드 `unknown`과 마찬가지로 후속 단위다(서로 다른 상태임은 R1 그대로).

#### R2-2. 오래된 `claimed` 취소의 근거와 절차 (R1-F02의 해당 항 대체)

- 근거는 「1시간이 지났다」가 아니다. **상태 불변식**이다: 외부 `remove`는 `delete_mark(deleting)`이 커밋된 뒤에만 나간다. 그러므로 예약이 `claimed`인 동안에는 외부 삭제 요청이 나간 적이 없다.
- 절차: 회원 → 자산 잠금 안에서 `where asset_id = … and state = 'claimed' and fencing_token = <읽은 토큰> and updated_at = <읽은 값>` 조건(CAS)으로 `cancelled`로 바꾸고, 다시 잡을 때는 **새 토큰**을 발급한다. 1시간은 「멈춘 실행으로 볼 최소 대기」일 뿐 원격 종료의 증거로 쓰지 않는다.
- 옛 실행(worker)의 의무: `delete_mark(deleting)`이 `false`(토큰·상태 불일치)면 **`remove`를 부르지 않는다**. 취소 뒤 옛 토큰으로는 `deleting`에 들어갈 수 없으므로 외부 요청도 나가지 않는다.

#### R2-3. 기산일 — 중앙과 같은 `storage.objects.created_at` (R1-기산일 대체, 임의 +1일 철회)

- **`stored_at` 철회**: `finalize`가 늦어지는 데 상한이 없어(불명 → 뒤늦은 대조로 `ready`), `stored_at` 기준이면 보관이 30일보다 무제한 길어질 수 있다.
- **+1일 여유 철회**: 승인된 보관 기간(일반 회원 30일)과 다른 값을 「보수적」이라는 이유로 넣지 않는다.
- **선택**: 중앙과 같은 **객체 생성 시각 `storage.objects.created_at`**. 우리가 기대하는 객체(`object_id`)로 맞춰 읽는다. `aif_asset_expire` 안의 판정:

```sql
select so.created_at into v_created
from storage.objects so
where so.id = v_asset.object_id and so.bucket_id = v_asset.bucket and so.name = v_asset.path;
-- 만료 조건: found and v_created is not null and v_created < now() - make_interval(days => v_days)
```

- **조기 삭제 0 조건**: 그 행이 없음 / `id`는 같으나 bucket·name이 다름(다른 객체) / `created_at`이 NULL / `v_days`가 NULL(무기한) / 읽기 오류 → 모두 **만료시키지 않는다**(`not_due` 또는 `unknown`). 객체가 없는 `ready` 행은 이 단위에서 건드리지 않고 후속 복구 단위로 넘긴다.
- 남는 지연은 **정리 회차 간격**뿐이다: 기간이 지난 뒤 다음 회차가 돌 때까지(하루 1회면 최대 약 하루) 남아 있을 수 있다. 이것은 정책 기간을 바꾸는 것이 아니라 실행 주기에서 오는 지연이다.

#### R2-4. 추적 버킷 등록 — 최초 ON과 동시에 등록이 기본 (R1-tracked 대체)

- 전제 재확인: 지금 `aif-assets` 버킷은 없고 저장된 원본은 0건이다(§14-A: migration 미적용·버킷 미생성).
- 그러므로 **최초 운영 ON 때 버킷 생성과 함께 `storage_posting_tracked_buckets`에 등록**하면 「기존 미발행 유료 원본의 기간이 갑자기 줄어드는」 전환 문제가 생기지 않는다. 이것을 기본 실행안으로 한다. R1에서 적은 두 갈래 선택지와 별도 정책 질문은 철회한다.
- 실제 등록은 공용 표에 쓰는 일이므로 운영 ON 승인 절차 안에서 따로 승인받아 실행한다(이 단위 실행 0). ON 시점에 전제가 깨져 있으면(이미 자산이 있음) 그때 다시 판단한다.

#### R2-완료 조건(§19-9·R1 보완)

반례 교체·추가: `remove` 뒤 같은 객체가 남아 있음 → `delete_unknown`·재삭제 0·복원 0·용량 유지 · `remove` 오류 응답(4xx 포함)도 미전송으로 보지 않음 · 옛 토큰으로 `deleting` 진입 실패 시 `remove` 0회 · `claimed` 취소 CAS(토큰·`updated_at` 불일치면 무변경) · 기산 조회에서 행 없음·다른 객체·`created_at` NULL·기간 NULL이면 만료 0 · `finalize`가 늦어도 객체 생성 시각 기준으로 만료.

### 19-R3. 구현 전 주의 3개와 첫 구현 기록 — Mac `msg_6318619e8ba6`·Master `msg_aa5f14772e27` (§19-R2 조건부 수락)

#### 주의 3개 (R2의 해당 문장보다 이 절이 우선)

1. **CAS 실패는 그 행의 상태를 바꿀 권한이 아니다.** 토큰·상태 대조가 맞지 않으면 그 예약은 우리 것이 아니므로 아무것도 바꾸지 않고 그 자산 처리를 멈춘다. R2-1에서 「deleting 커밋 전 로컬 실패(토큰·상태 CAS 실패 …)에 delete_failed」라고 쓴 것은 틀렸다 — 전이 행렬에 `claimed → delete_failed`는 없다. **deleting 커밋 전에 그만둘 때는 우리 토큰으로 `cancelled`**를 시도하고(맞지 않으면 무변경), `delete_failed`는 「deleting 커밋 뒤 외부 요청을 보내지 않은 것이 확정된」 호출부만 쓴다(현재 정리 실행자는 쓰지 않는다).
2. **「기간이 지나면 다음 회차(하루 1회면 약 하루 안)에 지워진다」는 정상 회차의 예일 뿐 보장이 아니다.** 밀린 건이 회차 상한(100건)보다 많거나, 회차가 중단되거나(보호 목록 불명·시간 예산), 판정 불가(`unknown`)·삭제 불명(`delete_unknown`)이면 더 늦어지거나 지워지지 않는다.
3. **`deleted`는 「저장소 메타데이터(`storage.objects`)에 지금 그 행이 없다」는 확인이다.** 물리 파일의 영구 삭제를 보장하지 않는다.

유지되는 한계: 재확인과 외부 삭제 사이의 보호 변경, 외부 DELETE의 비원자성(§19-4·R1).

#### 첫 구현(OFF·모의) — 계약과 다르게 구현한 점 (Master 판정 대상)

| # | 계약 문장 | 구현 | 이유 |
|---|---|---|---|
| 1 | `delete_verify`가 판정하고 실행자가 `delete_mark`로 표시 | **`delete_verify`가 판정과 표시를 한 거래에서** 한다(`deleting/delete_unknown → deleted` 또는 `→ delete_unknown`) | 판정과 표시 사이의 틈을 없앤다. 전이 자체는 행렬과 같다 |
| 2 | 묶음 B에 「expired인데 예약 없음」 포함 | **`aif_asset_expire`가 만료로 바꾸는 같은 거래에서 예약 행을 `cancelled`(아무도 모르는 새 토큰)로 만든다** → 실행자는 예약 표만 읽는다 | 「expired + 예약 없음」을 찾으려면 두 표의 반대 조인이 필요하고, 끝난(`deleted`) 행이 쌓이면 조회 앞자리를 막는다. 새 토큰은 `claim_delete`가 다시 발급해야 쓸 수 있어 삭제 권한이 아니다 |
| 3 | (명시 없음) | `aif_asset_expire`·`delete_verify`가 확인한 `cancelled`·`delete_failed`·`delete_unknown` 예약 행의 **`updated_at`만 갱신**(상태 무변경) | 실행자가 `updated_at` 오름차순으로 읽어 매 회차 다른 행부터 보게 한다(같은 행이 앞자리를 계속 차지하지 않게) |
| 4 | 오래된 `claimed` 취소(R2-2) | **토큰 없이 부른 호출만** 취소한다. 다른 토큰으로 부른 호출은 항상 `busy` | 토큰이 다른 실행이 남의 예약을 취소하지 못하게 |
| 5 | `delete_mark` 행렬 `delete_unknown → deleted \| delete_failed` | **`delete_unknown → delete_failed` 제거** | R2-1: 외부 요청이 나간 뒤에는 재시도 가능으로 확정할 근거가 없다 |
| 6 | Bearer 전용 | 추가로 **비밀값이 16자 미만·앞뒤 공백 포함이면 모든 요청 거절** | 비어 있거나 `"undefined"` 같은 값으로 열리지 않게(fail-closed). 운영 `CRON_SECRET`이 16자 미만이면 이 라우트는 401만 낸다 — ON 전 확인 항목 |

#### 검증 구분 (서로 다른 것 — 합쳐 읽지 않는다)

| 구분 | 내용 |
|---|---|
| 작성자 모의 시험 | `tests/assetRetention.test.mjs` 29건(가짜 DB 상태 기계 = SQL 초안 함수를 계약대로 흉내 낸 것, 실제 라우트 GET 포함) + 조회 `expired` 1건. 전체 `npm test` 152/152, `npx tsc --noEmit` 통과. 변형 21종 전부 빨강 확인 뒤 원복 |
| SQL | **작성만. 어떤 DB에도 실행하지 않았다(격리 DB 포함).** 정적 확인(파일 글자)만 시험에 있다. 문법·권한·잠금·실제 동작은 미검증 |
| 기존 격리 시험 15/15 | **수정 전 SQL(blob b29821216)의 결과다.** 이번 3차 수정 뒤에는 다시 돌리지 않았다 — 새 함수 2개와 `expired`의 격리 시험은 미작성 |
| Mac 독립 검수 | 대기 |
| 실 운영 | 스위치 off(서버 상수), 예약 실행 미등록, 버킷·DB·저장소·삭제 0, 미배포 |

미확인(운영 ON 전): 실제 PostgREST에서 `aif_assets → profiles` 포함 조회(`profiles!inner(retention_exempt)`)가 동작하는지, 실제 Supabase에서 함수 소유자가 `storage.objects`·`profiles`·`member_storage_policy`를 읽을 수 있는지, 운영 `CRON_SECRET` 길이.

후속 단위로 넘긴 것: 업로드 `unknown`·`reserved` 복구, 오래 남는 `delete_unknown`·`mismatch` 해소, 객체 없는 `ready` 행(묶음 A 앞자리를 막을 수 있음), `attempts` 상한에 걸린 예약, 메타 행 보관 기간, `markPosted`.

## 20. 멈춘 상태 복구 설계 (W01o, Master `msg_ac69e77c6859`, 판정 대기)

**설계만이다. 소스·SQL·대역 변경 0, 실제 DB·저장소 실행 0.** 근거는 현재 저장소의 실제 원문이다 — migration 초안 blob `85eb99ea7`(미적용), `src/lib/assets/store.ts`(19ea5eab5), `src/lib/assets/retention.ts`(35853fad1), `src/lib/assets/read.ts`.

### 20-1. 원칙 (복구에서도 그대로)

1. **「지금 없다」·「오래됐다」는 원격 요청이 끝났다는 증거가 아니다.** 원격 요청(업로드·삭제)을 보냈거나 보냈을 수 있는 자산은 시간·횟수만으로 해제·재업로드·재삭제하지 않는다.
2. **자동 전이는 DB 안에서 증명되는 것만.** 증명이 안 되는 것은 상태를 그대로 두고 운영자 대조로 넘긴다.
3. **결합 검사**: 모든 복구 동작은 객체(`storage.objects.id` + `bucket_id` + `name`), 소유자(`aif_assets.user_id` = 경로 첫 마디), 삭제 토큰(`fencing_token`)을 잠금(회원 → 자산) 안에서 다시 대조한다. 하나라도 어긋나면 무변경.
4. 응답·로그·보고에는 건수와 코드만. 경로·회원 id·토큰·오류 원문 0.

### 20-2. DB만 보고는 알 수 없는 것 (설계의 전제)

| 사실 | DB에 남는 것 | 결론 |
|---|---|---|
| 업로드 요청을 보냈는가 | 없다 — `reserved`는 「예약함」만 뜻한다(`store.ts`는 예약 뒤 곧바로 업로드를 부른다) | `reserved`는 「보냈을 수 있음」으로 본다 |
| 삭제 요청(remove)을 보냈는가 | 없다 — `deleting`은 「보내기 직전 커밋」일 뿐이다 | `deleting`은 「보냈을 수 있음」으로 본다 |
| **이번 회차의 `removeNotSent`** | **없다 — 그 회차 응답에만 실리는 메모리 건수다(35853fad1). 다음 회차는 그 예약을 다른 `deleting`과 구분할 수 없다** | 다음 회차가 「미전송」을 증명할 수 없다 → 확인만 하고, 객체가 남아 있으면 `delete_unknown` |
| 원격 요청이 끝났는가 | 없다 | 시간 경과로 추정하지 않는다 |

### 20-3. 상태표 — 멈출 수 있는 지점과 복구 구분

「자동」은 DB 안에서 증명되는 전이, 「대조」는 운영자가 조건을 확인한 뒤에만 실행, 「보존」은 아무것도 하지 않음.

| # | 멈춘 상태 | 생기는 경로(실제 코드) | DB에서 볼 수 있는 증거 | 지금 동작 | 복구 구분 |
|---|---|---|---|---|---|
| U1 | `reserved` (객체 id 없음) | 예약 뒤 업로드·확정 전에 실행이 끊김, 또는 `abort_local` 호출 실패 | 행·경로·`created_at`. 업로드 송신 여부는 없음 | 용량에 계속 가산, 조회는 「확인 중」 | 경로에 객체가 **없으면** 보존(늦은 쓰기 가능). 경로에 객체가 **있으면** U3으로 |
| U2 | `unknown` + 기대 `object_id` 있음 | `finalize`가 id를 기록했으나 대조 불일치·조회 불명 | 기대 id | `reconcile`이 그 id의 bucket·name·size가 맞으면 `ready` | **자동(이미 있는 함수)**: 주기적으로 `aif_asset_reconcile(asset, user)`만 다시 부른다. 맞지 않으면 보존 |
| U3 | `unknown`/`reserved` + 기대 id 없음 + 경로에 객체 있음 | 업로드 응답 유실(`UPLOAD_UNKNOWN`) | 경로의 객체 행(id·size). 우리 `sha256` | `reconcile`은 기대 id가 없어 우회하지 않는다 | **대조**: 운영자가 그 객체의 size와 **내려받은 바이트의 SHA-256이 `aif_assets.sha256`과 같음**을 확인한 뒤 `aif_asset_reconcile(asset, user, <본 객체 id>)` — 함수는 이미 있다. 자동으로 하지 않는 이유: 저장소 메타데이터에는 SHA-256이 없어 DB만으로 내용 동일성을 증명할 수 없다 |
| U4 | `unknown`/`reserved` + 경로에 객체 없음 | 업로드가 실패했거나 아직 도착 전 | 없음 | 보존 | **대조**: 운영자가 「그 예약을 만든 실행이 끝났고(함수 실행 한도 300초를 한참 지남), 저장소에 그 경로의 진행 중 업로드가 없음」을 확인한 뒤에만 해제. **해제용 함수는 지금 없다**(`abort_local`은 `reserved` 전용·「원격 요청 전」 전용이라 쓸 수 없다) → 필요해지면 별도 단위. 그때까지 한도는 보수적으로 줄어든 채 남는다 |
| D1 | 삭제 예약 `claimed`가 오래 남음 | 예약 뒤 실행이 끊김(응답 유실 포함) | 상태·`updated_at` | **이미 복구됨**: 토큰 없는 `expire`가 1시간 뒤 `cancelled`(근거는 상태 불변식) | 자동(구현됨) |
| D2 | `deleting` | remove 직전·도중·직후 끊김, 또는 미전송(`removeNotSent`) | 상태뿐(송신 여부 없음) | 다음 회차 「확인만」: 객체 없으면 `deleted`, 있으면 `delete_unknown` | 객체 없음 → 자동(구현됨). 있음 → D3 |
| D3 | `delete_unknown` + **같은 객체**가 남아 있음 | 삭제 응답 불명·늦은 처리·미전송 | 같은 `object_id`의 객체 행 | 확인만 반복, 용량 계속 가산, `ready` 복원 금지 | **대조**: 아래 20-4의 조건을 운영자가 확인한 뒤 「다시 삭제 대기로 돌림」. 자동으로 하지 않는다(원격 종료 증거 없음). **이 전이는 지금 없다**(`claim_delete`는 `DELETION_BUSY`, `delete_mark`에는 `delete_unknown → cancelled`가 없음) |
| D4 | `delete_unknown` + **다른 id**의 객체(mismatch) | 설계상 생기지 않는다(경로는 자산당 하나, `upsert:false`) — 생겼다면 외부 개입 | 다른 id의 객체 행 | 무변경 | **대조만, 자동 0**: 운영자가 그 객체의 출처를 확인. 지우거나 살리는 결정은 사람이 한다 |
| D5 | `delete_failed` + `attempts` ≥ 5 | deleting 진입 5회. 단 **현재 실행자는 `delete_failed`를 쓰지 않으므로**(전이는 「미전송 확정」 전용) 지금 코드에서는 이 건이 생기지 않는다 | `attempts` | 건너뛰고 건수(`gaveUp`)만 | **정정(2026-11-18 P1 구현)**: P1은 `delete_failed`를 쓰지 않는다 — deleting 커밋 **전에** 그만두므로 `cancelled`로 돌아갈 뿐이고 `attempts`도 늘지 않는다. 따라서 이 건은 P1 뒤에도 생기지 않는다. `delete_failed`·`attempts` 상한은 「deleting 커밋 뒤 미전송 확정」을 기록하는 호출부가 생길 때만 의미가 있다(지금은 없음) |
| R1 | `ready`인데 객체가 없음(id로도 경로로도) | **중앙 정리가 연장 회원의 기간 지난 파일을 저장소에서 직접 지움**(§19-1 — 우리 행은 그대로 남는다), 저장소 수동 삭제 | `storage.objects`에 그 id·그 경로 행 없음 | 조회는 503(서명 실패), `expire`는 `unknown`, 묶음 A 앞자리를 계속 차지 | **자동 가능 — 유일하게 「부재」가 증거가 되는 경우**(20-6) |
| R2 | `ready`인데 경로에 **다른 id**의 객체 | 외부 개입 | 다른 id | `expire`는 `unknown` | 대조만 |
| E1 | `expired` + 예약 `cancelled`/`delete_failed`, `expire`가 계속 `unknown`(객체 없음·정책 불명) | 만료 뒤 객체가 사라짐·정책 함수 오류 | 객체 행 없음 | 묶음 B에서 매 회차 확인(`updated_at` 순환) | 객체가 id·경로 모두 없으면 R1과 같은 근거로 자동 종결 가능(20-6의 확장). 정책 불명이면 보존 |

### 20-4. 운영자 대조 조건 (자동화하지 않는 것)

| 동작 | 운영자가 확인할 것(전부) | 그 뒤 실행 |
|---|---|---|
| U3 채택(불명 업로드를 `ready`로) | 경로에 객체 1개 · size = `aif_assets.bytes` · **내려받은 바이트의 SHA-256 = `aif_assets.sha256`** · 삭제 예약 진행 중 아님 | `aif_asset_reconcile(asset, user, <객체 id>)` (기존 함수) |
| U4 해제(불명 예약을 실패로) | 경로에 객체 없음 · 예약 뒤 충분한 시간(실행 한도보다 훨씬 김 — 값은 운영 결정) · 저장소 쪽에 진행 중 요청 없음을 저장소 로그로 확인 | **함수 없음** — 필요 시 별도 단위(해제 사유·실행자·시각을 남기는 전용 함수) |
| D3 다시 삭제 | 같은 `object_id`의 객체가 남아 있음 · 회원이 지금도 보호 대상이 아님 · 정책 기간이 지금도 지남 · 저장소 로그에서 앞선 삭제 요청이 끝났음(성공·실패)을 확인 | **전이 없음** — 필요 시 별도 단위(`delete_unknown → cancelled`를 운영자 전용으로, 사유 기록) |
| D3에서 회원이 그사이 보호 대상이 됨 | 객체가 남아 있고 앞선 삭제 요청이 끝났음을 저장소 로그로 확인 | 살릴지(예약 종결 + `ready` 복원)는 사람 결정. 자동 복원 금지는 그대로 |
| D4·R2 (다른 id) | 그 객체의 출처 | 사람 결정 |

운영자 대조에 필요한 **읽기 전용 목록**(상태·나이·건수, 경로·회원 id 없이)은 지금 없다 → 20-5의 P3. *(2026-11-18 정정, §20-9 (10): P3은 「목록」이 아니라 **건수 전용 집계**다. 특정 행을 찾아 보는 수단은 P3에 없고 P4 운영 절차에서 따로 정한다.)*

### 20-5. 회복이 가능한 최소 단위 (추천 순서)

| 순서 | 단위 | 바꾸는 것 | 근거의 강도 | 없애는 것 |
|---|---|---|---|---|
| **P1** | **삭제 진입 전 시간 확인(예방)** — **구현됨(2026-11-18, 미배포)** | `retention.ts`만: `delete_mark(deleting)`을 부르기 **전에** 회차에 남은 시간이 「deleting 커밋 + remove + 확인」 세 호출의 상한(호출 상한 × 3)보다 적으면 그 삭제에 들어가지 않고, 우리 토큰으로 `cancelled`를 한 번만 시도(결과가 불명이면 이 회차의 추가 호출 0 — 예약 상태는 모른다: `claimed`로 남았을 수도, 취소가 원격에서 늦게 커밋됐을 수도 있다), 그 회차의 새 삭제 중단 | 코드만, DB 계약 변경 0 | `removeNotSent` 경우(미전송인데 `deleting`으로 남아 D3이 되는 길)를 **줄인다 — 없앤다는 보장이 아니다**. 시계 급변·이벤트 루프 지연·늦은 응답이면 여전히 생길 수 있고, 그때는 기존 보호(`deleting` 보존·`removeNotSent` 집계)가 적용된다 |
| **P2** | **객체 없는 `ready` → `missing`** | SQL 함수 1개(`aif_asset_mark_missing`) + 실행자의 한 단계 | 20-6 — DB 안에서 증명됨 | R1(조회 503이 영원히 남는 것, 묶음 A 앞자리 막힘, 중앙이 지운 연장 회원 자산의 유령 행) |
| P3 | 멈춘 건 읽기 전용 집계 | 관리자 전용 조회(상태·나이 구간별 건수) | 읽기만 | 운영자가 대조 대상을 알 수 없는 문제 |
| P4 | 운영자 승인 전이(U4 해제, D3 다시 삭제) | SQL 함수 + 기록 열 | 사람이 저장소 로그로 확인 | 장기 `unknown`·`delete_unknown` |

P1·P2는 자동이고 근거가 닫혀 있다. P3·P4는 운영 절차(누가·어떤 화면·어떤 로그)가 정해져야 하므로 뒤로 둔다.

### 20-6. P2의 근거 — 왜 이 경우만 「부재」가 증거인가

> 구현 범위·후보 탐색·예약 행 처리·migration 방식은 §20-8이 우선한다(2026-11-18 정리). 아래는 「부재가 증거가 되는 이유」로만 읽는다.

- `ready`는 `finalize`·`reconcile`이 **그 객체가 저장소에 있음(id·bucket·name·size 일치)을 확인한 뒤에만** 되는 상태다. 즉 그 시점에 객체는 있었다.
- 그 경로에 다시 쓸 주체가 없다: 경로는 자산당 하나이고 업로드는 예약당 한 번·`upsert:false`이며, `ready`가 된 자산에는 진행 중 업로드가 없다. 그래서 「지금 없으면 나중에 생긴다」는 늦은 쓰기가 성립하지 않는다(업로드 `unknown`과 다른 점).
- 판정은 `storage.objects`와 같은 DB·같은 거래 안에서 한다 → 읽은 시점의 사실이다.
- 조건(전부, 잠금 회원 → 자산 안에서): 자산이 `ready` · 삭제 예약이 없거나 `cancelled` · `storage.objects`에 **그 `object_id`의 행도, 그 bucket·name의 행도 없음** · 조회가 실제로 수행됨(권한 오류·예외면 무변경). → `state = 'missing'`, `missing_reason = 'object_absent'`(표에 이미 있는 상태·제약, 지금은 이 상태로 바꾸는 함수가 없다).
- 하지 않는 것: 경로에 다른 id가 있으면 무변경(R2) · `reserved`·`unknown`에는 쓰지 않는다 · 재업로드·재생성 0.
- 영향: `missing`은 용량 추가분에 들지 않는다(지금도 `ready`는 최근 확정분만 가산) · 조회는 이미 `missing` → 404 `ASSET_MISSING`을 낸다(`read.ts`) · `expire`는 `ready`·`expired`만 다루므로 묶음 A에서 빠진다.
- 한계: 저장소 메타데이터 기준이다(물리 파일 상태는 보지 않는다). 메타 행이 복구되는 저장소 장애 복원이 있으면 `missing` 행은 사람이 되돌려야 한다.

### 20-7. 필수 회귀 반례 (구현 단위에 넣을 것)

- P1(구현 반영: 기준은 상한 × 3): 남은 시간이 상한 × 3보다 적으면 `delete_mark(deleting)` 0·remove 0·예약 `cancelled` · 충분하면 예전과 같음 · 그 뒤로 `removeNotSent`가 정상 경로에서 0 · 시계가 건너뛰어 그래도 미전송이 생기면 지금처럼 `deleting` 보존(동작 불변).
- P2: 객체가 id·경로 모두 없을 때만 `missing` · 경로에 다른 id가 있으면 무변경 · `reserved`·`unknown`·`expired`·`failed`는 무변경 · 삭제 예약이 `claimed`·`deleting`·`delete_unknown`이면 무변경 · 타 회원 이름으로 호출 무변경 · `storage.objects` 조회 오류면 무변경(예외 → 롤백) · `missing` 뒤 조회 404·용량 불변·묶음 A 미포함 · 2연결: `finalize`·`expire`와 같은 잠금 순서로 서로 기다림 · 멱등.
- 공통(이미 있는 것이 깨지지 않는지): 업로드 `unknown`은 시간·부재로 `failed`가 되지 않는다 · `delete_unknown`은 재삭제·복원되지 않는다 · 다른 토큰은 남의 예약을 바꾸지 못한다 · `abort_local`은 `reserved` + 원격 요청 전에만.
- 대조 단위(P4)가 생기면: 운영자 전용 권한 · 사유·실행자·시각 기록 · 조건 하나라도 어긋나면 무변경 · 자동 실행자가 그 전이를 부르는 경로 0.

### 20-8. P2 설계 정리 — 구현 배정 전 확정안 (Master `msg_05be62cbca23`·`msg_7394ed0c36ed`, 방향 승인)

**설계만이다. 런타임·DDL·SQL 실행·DB 생성 0.** §20-5의 P2 행·§20-6·§20-7의 P2 항목과 다르면 이 절이 우선한다. 범위는 처음 적은 「함수 1개」에서 **열 2개·색인 2개·함수 2개**로 늘었다.

#### (1) 대상과 실행 위치

- 대상은 회원 등급과 무관한 **모든 회원**의 `ready` 자산이다(보관 연장 회원 포함 — 중앙 정리가 저장소에서 직접 지운 뒤 남는 행이 주 대상). 보호 여부·정책은 보지 않는다: 「객체가 없다」는 등급과 무관한 사실이다.
- 정리 실행자에 묶음 **D**를 둔다. 순서는 **C(확인만) → D → B → A**. D는 DB 호출만 하고 저장소 `remove`를 부르지 않으므로 「새 삭제 중단(`noMoreDeletes`)」과 무관하다. 회차 상한 100건은 네 묶음이 나눠 쓴다. 유한 대기·중단 규칙(§14-D)은 D에도 그대로다.

#### (2) 훑기 함수 `aif_asset_missing_scan(p_scan_limit, p_limit)` — 창 상한과 반환 상한을 분리한다

| 항목 | 내용 |
|---|---|
| 새 열·색인 | `aif_assets.object_checked_at timestamptz`(마지막으로 객체 존재를 확인한 시각), 색인 `(state, object_checked_at, id)` |
| 읽는 범위 | `state = 'ready'` 행을 `(object_checked_at nulls first, id)` — **유일키를 포함한 안정 정렬** — 로 **최대 `p_scan_limit`행**. 이것이 탐색 상한이다(반환 상한과 별개) |
| 분류 | 각 행을 `storage.objects`에서 id(PK)와 (bucket_id, name)으로 조회: `present`(기대 객체 그대로) / `other_object`(그 id 없음 + 경로에 다른 id, 또는 id는 있으나 bucket·name이 다름) / `absent`(id로도 경로로도 없음) |
| 갱신 | `present`·`other_object` 행은 `object_checked_at = now()` — 다음 회차에는 뒤에서 읽힌다. `absent`는 갱신하지 않는다 |
| 반환 | `absent` 행을 **최대 `p_limit`개**(asset_id·user_id) + 창 안의 `other_object` **건수**. `other_object` 행 자체는 돌려주지 않는다 |
| 권한 | security definer · search_path 고정 · service_role 전용 |

**이 함수는 읽기 전용이 아니다**(확인 시각을 쓴다). 반환된 것은 후보일 뿐이고 판정은 (3)이 잠금 안에서 다시 한다.

#### (3) 판정 함수 `aif_asset_mark_missing(p_asset, p_user)`

- 순서: NULL 거절 → 회원 잠금 → 자산 잠금(기존 순서 그대로) → 자산 행 `for update`(id + user_id) → 삭제 예약 행 `for update` → `storage.objects` 두 조회 → `update … where state = 'ready' and object_id = <읽은 값>`(CAS).
- 조건(전부): 자산 `ready` · 삭제 예약이 없거나 `cancelled`·`delete_failed` · 그 `object_id`의 행도, 그 bucket·name의 행도 없음.
- 반환: `missing`(바꿨다 / 이미 missing — 멱등) · `present` · `other_object` · `busy`(예약이 `claimed`·`deleting`·`delete_unknown`·`deleted` — 설계상 `ready`와 함께 있을 수 없는 조합이므로 보이면 무변경) · `skip`(없는 자산·다른 회원·`ready`가 아닌 상태).
- `ready`로 남기는 모든 반환(`present`·`other_object`·`busy`)에서 `object_checked_at`을 갱신한다 → 바꾸지 못한 후보가 훑기 창의 앞자리에 계속 남지 않게.
- `storage.objects`를 읽지 못하면(권한 오류 등) 예외 → 거래 롤백 → 무변경. 「0행」으로 오인하지 않는다.

#### (4) 묶음 B가 missing 자산의 예약을 읽지 않게 — 예약 행은 지우지 않는다

문제: `missing`이 된 자산에 예전 복원으로 남은 예약 행(`cancelled`·`delete_failed`)이 있으면 묶음 B가 그 행을 읽는다. `aif_asset_expire`는 `ready`·`expired`가 아니면 곧바로 `skip`으로 돌아가며(초안 383행) 예약 행의 `updated_at`을 갱신하지 않는다(400~401행에 닿지 않음) → 그 행이 B 목록 앞자리를 계속 차지한다. 삭제는 일어나지 않지만(아래 (6)) 뒤 항목이 밀린다. **조회한 뒤 실행자에서 거르는 것으로는 풀리지 않는다** — 목록의 `limit`을 이미 차지했기 때문이다.

- 채택: 예약 표에 열 `parked_at timestamptz`를 두고, `mark_missing`이 `missing`으로 바꾸는 **같은 거래에서** 그 자산의 비활성 예약 행에 `parked_at = now()`만 기록한다. 예약의 `state`·`fencing_token`·`attempts`·`claimed_at`은 그대로 보존한다(행 삭제 없음).
- 묶음 B의 목록 조회에 **DB 쪽 조건** `parked_at is null`을 넣는다(정리 라우트의 조회 한 줄). 색인은 `(state, updated_at) where parked_at is null` 부분 색인.
- 기존 `claim_delete`·`delete_mark`·`expire`·`delete_verify` 본문은 바꾸지 않는다(claim 동작 변경 보류). `parked_at`을 푸는 것은 사람이 `missing`을 되돌릴 때의 운영 절차다(P4).
- 대안(채택하지 않음): B 목록을 자산 상태와 조인하는 SQL 함수로 바꾸기 — 조회 경로 전체를 함수로 옮겨야 해서 변경이 더 크다.

#### (5) 정직하게 적는 동작 — 보장하지 않는 것

| 상황 | 일어나는 일 | 보장하지 않는 것 |
|---|---|---|
| **absent 반환 포화**: 창 안의 `absent`가 `p_limit`보다 많다 | `p_limit`개만 반환. 나머지는 `object_checked_at`이 그대로라 다음 회차 창의 앞에서 다시 읽힌다 | 한 회차에 다 처리된다는 것. 묶음 D의 몫(회차 상한을 네 묶음이 나눔)이 `p_limit`보다 작으면 반환된 것 중에서도 일부만 판정된다 |
| **훑기는 했는데 판정을 부르지 못함**(시간 예산·중단·실행 종료) | `present`·`other_object`는 이미 뒤로 갔고, `absent`는 그대로 앞에 남아 다음 회차에 다시 반환된다. 상태 변화 0 | 그 회차 안의 처리 |
| **훑기 응답이 오지 않음**(대기 초과) | 실행자는 그 회차를 멈춘다. 원격에서 훑기가 뒤늦게 끝나 확인 시각만 갱신됐을 수 있다 — 자산 상태에는 영향이 없다 | 원격 실행의 취소·완료 시각 |
| **판정 응답이 오지 않음** | 그 회차 중단. 원격에서 뒤늦게 `missing`으로 커밋됐을 수 있다 — 조건을 잠금 안에서 확인한 결과이므로 옳은 전이이고, 다음 회차는 그 행을 더 읽지 않는다 | 어느 쪽으로 끝났는지 그 회차가 아는 것 |
| **두 회차가 동시에 돈다** | 훑기의 행 읽기를 `for update skip locked`로 해 **같은 순간에는** 서로 다른 행을 읽게 한다. 그래도 한쪽 훑기가 끝난 직후 다른 쪽이 같은 `absent` 후보를 다시 읽을 수 있다(갱신하지 않으므로) → 같은 자산에 판정이 두 번 불릴 수 있고, 회원 → 자산 잠금에서 차례로 실행돼 둘째는 `missing`(멱등)을 돌려준다. 건수는 두 회차에 각각 잡힐 수 있다 | 동시 회차 사이의 중복 호출 0 |
| **훑기와 다른 함수의 잠금 경합** | 훑기는 권고 잠금을 잡지 않고 행 잠금만 짧게 잡으며 잠긴 행은 건너뛴다(기다리지 않음) → 훑기가 교착의 한쪽이 되지 않는다. `finalize`·`expire`·`claim`·`mark_missing`은 기존대로 회원 → 자산 순서라 서로 기다릴 뿐이다. 훑기가 건너뛴 행은 그 회차에 확인되지 않는다 | 창 안의 모든 행이 그 회차에 확인된다는 것 |
| **대량의 ready** | 한 바퀴 = ready 수 ÷ 창 크기 ÷ 회차 빈도. 그동안 유령 행은 조회에서 계속 503을 낸다 | **발견 시한·무기아**. 순환하도록 설계했을 뿐 보장으로 적지 않는다 |
| **실제 DB에서의 훑기 시간** | 창 크기는 구현 때 근거와 함께 정한다(상수). 실행자는 호출당 15초만 기다린다 | 15초 안에 끝난다는 것(실 DB 실측 전 미검증) |

#### (6) missing 자산은 정리 실행자의 삭제 대상이 되지 않는다 — 경로 근거

- 저장소 `remove`에 이르는 길은 `proceedDelete` 하나이고, 그 앞에서 `aif_asset_expire`가 `expired`를 돌려줘야 한다. `expire`는 `ready`·`expired`가 아니면 `skip`이므로(초안 383행) `missing` 자산은 항상 `skip` → 예약(claim)·deleting 표시·remove 0.
- 묶음 A는 라우트가 `state = 'ready'`만 읽고 실행자가 행의 `state === "ready"`를 다시 확인한다. 묶음 C(`deleting`·`delete_unknown`)는 `mark_missing`이 그 예약 상태에서 `busy`로 거절하므로 `missing`과 함께 있을 수 없다. 묶음 D는 DB 호출만 한다.
- `claim_delete`는 지금 `missing` 자산을 거절하지 않지만(거절 대상은 `reserved`·`ready`·`unknown`) 그것을 부르는 경로가 없다. **claim 동작은 이번에 바꾸지 않는다** — 대신 아래 시험으로 remove 0을 증명한다.

#### (7) migration 반영 방식 — 두 안을 함께 둔다(선택은 근거 확인 뒤)

| 안 | 내용 | 조건 |
|---|---|---|
| **가. 새 파일(기본안)** | `20261118130000_aif_assets_p2_missing.sql`(이름 예): `alter table … add column if not exists` 2건, 색인 2건, 함수 2건. A1 파일 뒤에 실행 | A1 파일이 이미 어딘가에 적용됐든 아니든 안전하다 |
| 나. 기존 초안에 합침(4차 수정) | 지금까지 1~3차와 같은 방식 | **A1 파일이 어떤 영속 DB에도 적용된 적이 없음을 확인한 뒤에만.** 지금 근거는 작업 기록(격리 DB `qa_aif_*`에서만 생성·삭제, 루트 migration에 `aif_assets` 없음)뿐이고 운영·Lab DB를 직접 조회한 것은 아니다 |

어느 영속 DB든 A1 파일이 처음 적용되는 순간 그 파일은 동결하고, 이후 변경은 새 날짜 파일로 한다. 격리 시험은 어느 안이든 「A1 원문 → (새 파일)」 순서로 적용해 재적용까지 확인한다.

#### (8) 구현 단위의 필수 시험(§20-7의 P2 항목 대체)

- **판정**: id·경로 모두 없을 때만 `missing` · 경로에 다른 id → `other_object` 무변경 · id는 있으나 bucket·name 다름 → 무변경 · 정상 → `present` · `reserved`·`unknown`·`failed`·`expired` → `skip` · 이미 missing → `missing`(멱등) · 예약 `claimed`·`deleting`·`delete_unknown`·`deleted` → `busy` 무변경, 없음·`cancelled`·`delete_failed` → 허용 · 다른 회원·NULL → `skip` · `storage.objects` 읽기 권한 없음 → 예외·롤백(0행 오인 금지) · `ready`로 남기는 반환마다 `object_checked_at` 갱신.
- **예약 보존**: `missing` 전이 뒤 예약 행의 `state`·`fencing_token`·`attempts`가 그대로이고 `parked_at`만 기록됨 · 활성 예약에는 기록하지 않음 · B 목록 조회(조건 `parked_at is null`)에 그 행이 나오지 않음.
- **훑기 — 한 회차 상한과 회전**: 창 크기보다 많은 `ready`에서 읽은 행 수 ≤ `p_scan_limit` · 반환 수 ≤ `p_limit` · 정렬이 `(object_checked_at nulls first, id)`로 안정(같은 시각이면 id 순) · 연속 회차에서 `present` 행이 뒤로 가 다른 행이 읽힘(여러 회차에 걸쳐 전부 한 번씩) · `absent` 포화 시 남은 것이 다음 회차에 다시 반환 · `other_object`는 건수만·행 미반환·뒤로 감 · `ready`가 아닌 상태는 읽지 않음 · 모든 회원 대상(보호 회원 포함).
- **동시성(2연결 실측)**: 훑기 둘이 동시에 돌 때 같은 순간의 창이 겹치지 않음(skip locked) · `mark_missing`이 `expire`(같은 자산)·`finalize`(같은 회원 다른 자산)와 회원 → 자산 순서로 서로 기다림(대기 연결의 `pg_blocking_pids` 일치) · 같은 후보에 판정 두 번 → 둘째 `missing`.
- **삭제 0 증명**: `missing` 자산에 `expire` → `skip` 무변경 · 실행자 모의에서 `missing` 자산 + 비활성 예약 행이 있어도 claim 0·deleting 표시 0·remove 0 · 묶음 D 전체에서 remove 0 · 보호 회원 행도 D에서 처리되고 삭제 0.
- **실행자 모의**: 순서 C → D → B → A · 네 묶음 분배와 회차 상한 100 · 훑기·판정의 대기 초과 시 중단·상태 보존·추가 호출 0 · `other_object`·`busy` 건수 · 결과에 경로·회원 id 0.
- **기존 불변**: 용량(`missing`은 추가분에 들지 않음, 최근 ready였으면 그만큼 줄어듦) · 조회 404 `ASSET_MISSING` · 기존 격리 시험 두 벌을 새 blob으로 1회 재실행(함수 수 단언만 갱신).

#### (9) 그대로 남는 경계

- `storage.objects` 행의 부재는 「저장소 API로 접근할 수 없다」는 뜻이지 물리 파일 삭제의 증명이 아니다. 저장소 복원으로 행이 돌아오면 `missing` 행은 사람이 되돌린다(자동 복구 없음).
- 인프라가 업로드 요청을 중복 전달해 삭제 뒤에 객체가 다시 생기는 경우(`missing` 행 + 짝 없는 객체)는 우리 코드에 그런 재전송이 없어도 배제를 증명할 수 없다 — 한계로 남기고 짝 없는 객체 정리는 후속이다.
- 같은 경로의 다른 id·자리를 옮긴 객체는 어떤 경우에도 자동으로 처리하지 않는다. 지금은 건수만 볼 수 있고, 행 단위로 보는 수단은 P3(읽기 전용 집계)이다. *(2026-11-18 정정, §20-9 (10): P3도 건수 전용이라 행 단위 수단이 아니다. 게다가 「다른 id」는 DB에 남는 표지가 없어 P3의 범주로도 셀 수 없다 — 회차 응답의 건수가 유일한 출처다. 행 단위 대조는 P4에서 정한다.)*
- 실제 Supabase에서 함수 소유자의 `storage.objects` 읽기 권한, 실제 PostgREST의 함수 응답 모양, 중앙 정리와의 실제 상호작용은 격리 대역으로 확인되지 않는다.


### 20-9. P3 설계 — 멈춘 건 읽기 전용 집계 (W01t, Master `msg_037b8444a5bf` · **수락·정정 `msg_5ffb8d03b1ee`**)

> **2026-11-18 Master 판정(`msg_5ffb8d03b1ee`)**: 설계 수락 — 가 안(저장소 메타 조회 없음), 영속 10개 범주(`mismatch`·`other_object` 제외), 두 축, `delete_unknown` 나이 두 벌, `p_cap` 1~10000(기본·추천 2000, 초과 시 구간 `null`), `parked` 부분 색인, 함수·파일·격리 DB 이름 채택. **정정 세 가지를 아래 (5)·(7)에 반영했다**: ① `p_cap + 1`은 범주에서 세는 **일치 행**의 한도이지 조건·조인 이전 읽기량·시간의 상한이 아니다(「최악 읽기량」 문구 삭제) ② 잠금은 「0」이 아니라 「명시적 행 잠금·권고 잠금이 없다」(일반 조회의 표 공유 잠금은 있다) ③ `parked ≤ missing`을 수치 불변식으로 쓰지 않는다.

**설계만이다. SQL 작성·DB 생성·운영 조회/쓰기·저장소·AI·빌드·배포 0.** 근거는 저장소의 실제 원문이다 — A1 초안 blob `85eb99ea7`, P2 파일 blob `19af3e6bb`(둘 다 어떤 영속 DB에도 미적용), `src/lib/assets/retention.ts` blob `6e43fba6a`. §20-4 끝·§20-5의 P3 행·§20-8 (9)와 다르면 이 절이 우선한다.

#### (1) 범위 한 줄

SQL 함수 **1개**가 「멈춰 있을 수 있는 건」의 **건수와 나이 구간별 건수만** 돌려준다. 행·식별자 반환 0, 쓰기 0, 잠금 0. 화면·라우트·정리 실행자 연결은 이번 범위가 아니다(호출 경로 0).

#### (2) 범주 정의 — DB에 영속된 표지만 센다

두 표(`aif_assets`, `aif_asset_deletions`)의 열만으로 정해지는 조건이다. 「실제로 파일이 있는가」는 어느 범주에서도 추론하지 않는다.

| 축 | 범주 키 | 정확한 조건 | 나이 기준 열 | 그 열이 실제로 뜻하는 것 | §20-3 |
|---|---|---|---|---|---|
| 자산 | `reserved` | `state = 'reserved'` | `created_at` | 예약한 시각 | U1 |
| 자산 | `unknown_with_object_id` | `state = 'unknown' and object_id is not null` | `unknown_since` | 처음 unknown이 된 시각(`finalize`는 `coalesce`로 유지, `reconcile`은 reserved → unknown 최초 전이에서만 기록) | U2 |
| 자산 | `unknown_no_object_id` | `state = 'unknown' and object_id is null` | `unknown_since` | 위와 같음 | U3·U4(둘의 구분은 저장소 메타 조회가 필요 — (4)) |
| 자산 | `expired_open` | `state = 'expired'`이고 그 자산의 예약이 `deleted`가 **아님**(용량 가산 조건과 같은 식 — `aif_asset_usage_estimate`) | `expired_at` | expired로 바뀐 시각 | D1~D3의 자산 쪽 |
| 자산 | `missing` | `state = 'missing'` | `updated_at` | missing으로 바뀐 시각 — `mark_missing`이 기록한다. 그 뒤 이 행의 `updated_at`을 쓰는 함수가 없다는 것은 구현 때 13개 함수 원문으로 다시 확인한다 | R1의 결과 |
| 예약 | `claimed` | `state = 'claimed'` | `updated_at` | 예약(재예약)한 시각 | D1 |
| 예약 | `deleting` | `state = 'deleting'` | `updated_at` | deleting으로 표시한 시각(확인 함수는 deleting을 그대로 두지 않는다) | D2 |
| 예약 | `delete_unknown` | `state = 'delete_unknown'` | **진입 시각 열이 없다** — 아래 (3) | — | D3·D4 |
| 예약 | `delete_failed_gave_up` | `state = 'delete_failed' and attempts >= 5 and parked_at is null` | `updated_at` | 마지막으로 확인한 시각(`expire`가 확인 때마다 갱신) — 진입 시각이 아니다 | D5(지금 코드에서는 생기지 않는다 → 0이 아니면 이상 신호) |
| 예약 | `parked` | `parked_at is not null` | `parked_at` | 주차한 시각(= 그 자산이 missing이 된 거래) | §20-8 (4) |

*(2026-11-18 구현 초안에서 명확히 함)* 예약 축의 `claimed`·`deleting`·`delete_unknown`·`delete_failed_gave_up`은 모두 `parked_at is null`을 조건에 포함하고, `parked`는 `state`와 무관하게 `parked_at is not null`이다 — 주차 표시가 있는 행은 어떤 상태든 `parked`에만 잡힌다(한 행이 두 범주에 잡히지 않게).

**세지 않는 것(의도)**: `ready`·`failed` 자산, `deleted` 예약, 주차되지 않은 `cancelled`·`delete_failed`(시도 5회 미만) — 정리 실행자가 정상적으로 순환하는 건이거나 종결된 건이다. 가장 큰 집합인 `ready`를 읽지 않는 것이 비용 상한의 핵심이다.

**`mismatch`·`other_object`는 범주가 될 수 없다 — 영속 표지가 없다.**
- `mismatch`는 `aif_asset_delete_verify`의 **반환값**이다. 그때 예약 행은 `delete_unknown`으로 남고(`updated_at`만 갱신) 「다른 id였다」는 사실은 어디에도 기록되지 않는다(A1 초안 485~492행).
- `other_object`도 `aif_asset_missing_scan`·`aif_asset_mark_missing`의 반환값이고 자산은 `ready`로 남는다.
- 그래서 우리 두 표만으로는 셀 수 없다. 지금 유일한 출처는 **정리 회차 응답의 건수**(`mismatch`·`otherObject`)이고, 그것은 「그 회차가 본 것」일 뿐 누적값이 아니다. 집계에서 `delete_unknown`은 「같은 객체가 남음(D3)」과 「다른 id(D4)」를 합친 수다.

#### (3) `delete_unknown`의 나이 — 정직한 한정

| 후보 열 | 실제 뜻 | 판단 |
|---|---|---|
| 예약 `updated_at` | **마지막으로 확인한 시각** — 확인 함수가 부를 때마다 갱신한다 | 「불명이 된 지 얼마」가 아니다. 대신 「정리 실행자가 이 건을 최근에 봤는가」의 신호 |
| 예약 `claimed_at` | 예약 행을 **처음 만든** 시각 — 재예약 때 갱신하지 않는다 | 복원·재만료를 거친 자산이면 훨씬 과거일 수 있다 |
| 자산 `expired_at` | 이번 expired 전환 시각 — 불명 진입보다 **앞선다** | 「만료된 뒤 경과」. 불명 기간보다 **길게** 나온다(과대) |

채택: 나이 구간을 두 벌 낸다 — `since_expired`(자산 `expired_at` 기준, 자산 행이 없으면 `no_basis`)와 `last_checked`(예약 `updated_at` 기준). 키 이름으로 뜻을 드러내고 「불명이 된 지」라는 이름은 쓰지 않는다. 정확한 진입 시각이 필요하면 열 추가(`delete_unknown_since`)가 필요하고, 그것은 확인 함수 본문을 바꾸는 일이라 이번 범위가 아니다(P4에서 필요성 판단).

#### (4) 저장소 메타 대조 — 두 안 (선택은 Master 확정)

| 안 | 내용 | 비용·권한 | 판단 |
|---|---|---|---|
| **가. 읽지 않는다(추천, 1차)** | `storage.objects`를 조회하지 않는다. D3/D4, U3/U4를 구분하지 않는다 | 우리 두 표의 색인 조회뿐. 함수 소유자의 `storage.objects` 읽기 권한에 의존하지 않는다 | 「건수 전용·물리 상태 비추론」에 가장 정합. 구분이 필요한 시점은 운영자 대조(P4)다 |
| 나. 상한 있는 분류(후속 후보) | **별도 함수**로 `delete_unknown` 최대 N행(예: 200, `updated_at` 오름차순)과 `unknown_no_object_id` 최대 N행을 `storage.objects` 메타와 대조해 `same_object`/`other_object`/`absent` 건수만 | 행마다 PK·(bucket, name) 조회 2회. 저장소 표 읽기 권한 필요 | 결과는 「읽은 시점의 메타 행 기준, 상한 안의 표본」이고 전체도 물리 상태도 아니다. 판정·표시 0 |

나 안을 가 안의 선택 인자로 섞지 않는다 — 권한 요건과 비용이 달라 함수 단위로 나눠야 권한 회수·시험이 분리된다.

#### (5) 중복 규칙

- **두 축은 따로 센다.** 한 자산이 자산 축 `expired_open`과 예약 축 `claimed`·`deleting`·`delete_unknown` 가운데 하나에 동시에 잡히는 것이 정상이다. **축을 넘는 합계 필드를 두지 않는다**(응답도 `assets`·`deletions` 두 객체로 나눈다).
- 축 안에서는 겹치지 않는다: 자산 축은 `state`가 배타이고 unknown은 `object_id` 유무로 둘로 나뉜다. 예약 축은 주차 표시가 있으면 `parked`에만, 없으면 `state`별 범주에만 잡힌다.
- **두 축의 건수 사이에 수치 관계를 가정하지 않는다**(Master 정정). 처음에 「`parked` ≤ `missing`」이라 적었으나 근거 없는 불변식이다 — 집계는 표의 표지를 따로 셀 뿐이고, 두 값이 그 관계를 지킨다는 것을 DB 제약이 보장하지 않는다. `parked`와 `missing`을 더하지도, 비교해 이상 여부를 판정하지도 않는다.
- 고아 예약(자산 행 없는 예약 — 표 주석상 허용)은 예약 축에만 잡힌다.

#### (6) 나이 구간과 기준시각

- **기준시각은 하나**: 함수 안 `now()`(거래 시작 시각, DB 시계). 모든 범주가 같은 값을 쓰고 응답에 `as_of`로 돌려준다. 호출부 시계는 쓰지 않는다.
- 구간(고정, 왼쪽 포함·오른쪽 제외): `lt_1h` [0, 1시간) · `lt_1d` [1시간, 24시간) · `lt_7d` [24시간, 7일) · `ge_7d` [7일, ∞) · `no_basis`(기준 열이 NULL이거나 `as_of`보다 미래). 다섯 값의 합 = 그 범주의 `count`.
- **구간은 표시용이다.** 어떤 전이·해제·재시도의 근거로도 쓰지 않는다(§20-1 원칙 1 — 「오래됐다」는 원격 요청 종료의 증거가 아니다). 보관 기간(30일 등)과 같은 경계를 일부러 두지 않는다 — 정책 판정과 혼동되지 않게.

#### (7) 상한과 비용

- 인자 `p_cap integer default 2000` — 범주 하나에서 **세는 일치 행 수의 한도**. 1~10000으로 조인다(NULL은 2000, 범위 밖이면 조여서 실행, 예외 아님). *(정정: 훑기 함수는 범위 밖 인자에 예외를 낸다 — 「같은 방식」이라 적은 것은 틀렸다. 이 함수는 조이기만 한다.)*
- **이 한도는 조건·조인 이전에 DB가 실제로 읽는 행 수나 실행 시간의 상한이 아니다**(Master 정정). 조건에 맞지 않는 행을 읽고 버리는 양(`expired_open`의 예약 조회, 주차·시도 횟수 조건 등)은 한도에 들지 않는다.
- 범주마다 `limit p_cap + 1`로 센다. 넘으면 `capped: true`, `count`는 `p_cap`(「이상」이라는 뜻), **나이 구간은 `null`** — 정렬 없이 잘린 표본의 분포를 전체처럼 보이게 하지 않는다.
- 읽는 길: 자산 축은 기존 색인 `(state, created_at)`, 예약 축은 `(state, updated_at)`. `parked`는 맞는 색인이 없다 → 부분 색인 `(parked_at) where parked_at is not null` 1개를 함께 제안(없으면 예약 표 전체를 읽는다). `expired_open`·`delete_unknown`은 행마다 상대 표 PK 조회 1회.
- **읽기량·실행 시간은 보장하지 않는다**(실 DB 실측 전 미검증 — 처음 적은 「최악 읽기량」 식은 삭제했다). 호출 경로가 생기면 그쪽에서 유한 대기를 건다.
- **잠금**: 명시적 행 잠금(`for update`)·권고 잠금이 없다 → 정리 실행자·업로드 함수의 행 잠금·권고 잠금과 서로 기다리지 않는다. 일반 조회가 잡는 표 수준 공유 잠금(ACCESS SHARE)은 잡는다 — 표 구조를 바꾸는 작업과는 서로 기다린다(「잠금 0」이 아니다). 함수는 `stable`로 선언한다 → 함수 안의 모든 조회가 호출 문의 스냅샷 하나를 본다(범주 사이 시점 일치), 그리고 `stable` 함수 안의 쓰기 문은 DB가 거절한다(읽기 전용의 구조적 근거). 다른 거래의 미커밋 변경은 보이지 않는다.

#### (8) 반환 모양과 권한

```
{ "version": 1, "as_of": <timestamptz>, "cap": <int>,
  "assets":    { "<범주 키>": { "count": n, "capped": bool, "age": { lt_1h, lt_1d, lt_7d, ge_7d, no_basis } | null }, … },
  "deletions": { "<범주 키>": { … },
                 "delete_unknown": { "count": n, "capped": bool, "since_expired": {…} | null, "last_checked": {…} | null } } }
```

- **돌려주지 않는 것**: 회원 id·자산 id·객체 id·경로·버킷·토큰·시도 횟수 원값·오류 원문. 회원 수(서로 다른 회원 몇 명)도 넣지 않는다 — 건수가 적을 때 특정 회원을 가리키는 단서가 된다.
- 권한은 기존 13개 함수와 같다: `security definer` · `search_path = ''` · `revoke all … from public, anon, authenticated` · `grant execute … to service_role`. 「운영자 전용」의 뜻은 **회원 세션으로는 부를 수 없고, 이번 단위에는 부르는 경로가 없다**는 것이다.
- 함수 안에서 관리자 여부를 확인하지 않는다 — 서비스 키 호출에는 로그인 주체가 없다. 관리자 확인(`profiles.is_admin`)은 나중에 생길 호출 라우트의 일이고(기존 패턴), 그 화면이 메인 사이트 관리자 화면이면 다른 담당 몫이다.

#### (9) 구현 배정 시 최소 범위 (제안)

| 파일 | 내용 |
|---|---|
| `ai-influencer-studio/supabase/migrations/20261118140000_aif_assets_p3_summary.sql` (새 파일) | 함수 `aif_asset_stuck_summary(p_cap integer) returns jsonb` 1개 + 부분 색인 1개. 열 추가 0, 기존 함수 본문 변경 0. 적용 순서 A1 → P2 → 이 파일 |
| `ai-influencer-studio/tests/sql/a1_summary.test.mjs` (새 파일) | 격리 DB `qa_aif_summary_20261118`(로컬 대역만, 생성 → oid 확인 → 삭제 → 부재 검증). 기존 시험 파일은 고치지 않는 것을 목표로 한다(함수 수 14 단언은 새 시험에서) |

런타임(`src/`)·모의 시험·라우트·화면 변경 0.

격리 시험 항목:

- **빈 표**: 전 범주 `count 0`·`capped false`·구간 합 0.
- **범주별 정확 건수**: 범주마다 행을 심고(시각 직접 지정) 구간 경계 — 정확히 1시간·24시간·7일, 미래 시각, NULL — 를 확인. 구간 합 = `count`.
- **세지 않는 것**: `ready`·`failed`·`deleted` 예약·주차 안 된 `cancelled`·시도 4회 `delete_failed`는 어디에도 잡히지 않음. `expired` + 예약 `deleted`는 `expired_open`에서 빠짐.
- **중복 규칙**: `expired` + `delete_unknown` 한 자산이 두 축에 각각 1 · 주차된 `delete_failed`(시도 5회)는 `parked`에만 · 고아 예약은 예약 축에만, `since_expired`는 `no_basis`.
- **상한**: `p_cap = 2`에 3행 → `count 2`·`capped true`·구간 `null`, 다른 범주는 영향 없음 · `p_cap`이 0·음수·NULL·과대일 때 조여짐.
- **쓰기 0**: 호출 전후 두 표의 전체 행 해시가 같음 · `provolatile = 's'`.
- **명시 잠금 없음(2연결)**: 다른 연결이 회원·자산 권고 잠금과 행 `for update`를 잡은 채여도 기다리지 않고 반환 · 그 연결의 미커밋 변경은 건수에 안 보임 · 문장이 시작된 뒤 커밋된 행은 그 호출에 안 보임(한 스냅샷).
- **권한**: `anon`·`authenticated` 실행 거절, `service_role` 허용 · `prosecdef`·`search_path` 설정.
- **비노출**: 반환 문자열에 UUID 모양·경로 모양 0(심은 id·경로로 대조).
- **재적용**: 파일 2회 적용 멱등, 함수 총 14개.

#### (10) W00 표현 정합화 (이 절로 정정하는 것)

- §20-4 끝의 「읽기 전용 **목록**」과 §20-8 (9)의 「**행 단위로 보는 수단은 P3**」는 이번 범위와 다르다. **P3은 건수 전용이다.** 운영자가 특정 행을 찾아 대조하는 수단(식별자를 보는 일)은 P3에 없고, 누가·어떤 화면·어떤 로그로 보는지가 정해지는 P4(운영 절차)에서 따로 확정한다.
- §20-5의 P3 행 「관리자 전용 조회」는 「서비스 전용 SQL 함수(호출 경로는 후속)」로 읽는다.

#### (11) 보장하지 않는 것

| 항목 | 실제 |
|---|---|
| 건수의 시점 | 호출 문의 스냅샷 하나. 돌려준 직후 달라질 수 있다 |
| 읽기량 | `p_cap`은 세는 행의 한도일 뿐 DB가 읽는 양의 상한이 아니다 |
| `delete_unknown`의 내역 | 같은 객체가 남은 건과 다른 id인 건을 구분하지 않는다(가 안) |
| `unknown_no_object_id`의 내역 | 경로에 객체가 있는지(U3) 없는지(U4) 구분하지 않는다(가 안) |
| `delete_unknown` 나이 | `since_expired`는 불명 기간보다 길게 나온다. 진입 시각은 기록돼 있지 않다 |
| 상한 초과 | `count`는 하한일 뿐이고 분포는 없다 |
| 물리 파일 | 어떤 건수도 파일의 존재·삭제를 뜻하지 않는다 |
| 실행 시간 | 미검증. 함수 안에 시간 제한을 두지 않는다 |
| 누적 추세 | 호출 시점 값뿐이다. 기록·보관 0 |

#### (12) Master 확정 요청 항목

1. 저장소 메타 대조: 가 안(읽지 않음)으로 1차 확정할지.
2. 요청하신 5개(unknown·delete_unknown·mismatch·missing·parked) 밖에 `reserved`·`expired_open`·`claimed`·`deleting`·`delete_failed_gave_up`을 함께 셀지(같은 색인 조회라 비용 차이는 작다). `mismatch`는 영속 표지가 없어 범주에서 빠진다는 점.
3. 나이 구간 경계(1시간·24시간·7일)와 `delete_unknown` 두 벌 표시.
4. `p_cap` 범위(1~10000)와 추천 호출값(2000), 초과 시 구간 `null`.
5. 부분 색인 `(parked_at) where parked_at is not null` 추가 여부.
6. 함수·파일·격리 DB 이름.

## 14. 진행 상태 기록

```text
작업 ID / 기능 ID: W00 / F20-04·C03·C07
담당 역할 / 세션 / 장비: sns / claude-win-20261118-sns / GT1_Mega(윈도우 메인)
인수 시각 / 문서 버전: 2026-11-18 / PLAN 2.0
정확한 파일 점유: docs/analysis-ai-influencer-20261118/W00_BASELINE.md(신규)
대상 기준 SHA: e7c03b317 (ai-influencer-studio 마지막 변경 5e27cb269)
현재 상태: W00 문서 수락(2026-11-18) — 독립 검수 Mac CX-QA-01 `msg_56d01ad0e43d`가 고정본 6e781cafa 잔여 계약 정적 문서 PASS, Master `msg_b5fe5f4c6320` 수락. 검수 이력: 613ac1da4(반례 P1 3건) → a2c4a57cb → 34dbd1c17 → 6e781cafa. 수락 범위는 문서 계약까지이며 실제 RLS·경합·fencing·늦은 업로드·게시 ID 영속화는 구현 후 별도 검증
이행 순서(미완 계약): 1) 새 표 aif_budget_limits·aif_asset_deletions와 함수 aif_asset_finalize·aif_asset_claim_delete를 PLAN §13·권한 계약에 병합(담당 Master 지정 대기) → 2) 그 전까지 자산·보관 코드와 migration 착수 0 → 3) 병합 후 W01 본체(§12) 배정 → 4) 공용 insta-posting·instagram-publish 수정은 기준 담당 조정(§13·§15-3)
W01a(G1 문구 4곳): 5b9018d50, 미배포, Mac 국소 PASS·Master 수락
W01b(G3 중 히스토리 정리 보관 예외만): 8f453b9c4→07df29def→efeaca0c8, 미배포, Mac 지정 PASS(msg_ceee4fb0b230)·Master 소스 수락. 실DB·실삭제 증거 아님, insert 불명 rollback 결함은 W01 본체로 보존
W01c(참고 이미지 MIME 고정·사전 검사·히스토리 보정 주소 전송): f805100ce→d4386242b, 미배포, Mac 지정 PASS(msg_07affb213e83)·Master 소스 수락. 실제 UI·브라우저 변환·실제 공급자 HEIC 수용·응답 크기(G5)는 미검증
W01-A1 계약: §18·R1·R2 최종 037bfcacc Master 수락(msg_063c9804ec87) → 첫 구현 SQL 초안(실행 0)·paths.ts·순수 시험 8개, Mac 검수 대기. SQL 실행 검증은 격리 DB 승인 후 별도
W01-A1 SQL 초안 a29ffd287: Mac 정적 검수 F01~F05 해소·Master 지정 정적 수락. 격리 계약 시험 15/15(로컬 Docker 대역 DB, 실중앙·실Supabase 통합 아님) — 보강 3a48682cd·90ba12b30, Mac 지정 수락
W01-A1 저장 로직 store.ts 19ea5eab5: Mac 실모듈 검수 F01/F02 해소·소스 모의 단위 수락
W01-A1 생성 라우트 연결(generation.ts·route.ts, 서버 상수 기본 off, shadow는 시험 주입만) 1525cd92d: Mac 실POST 통합 검수 PASS·소스 모의 통합 수락(timeout은 취소 보장 아님, G5 미해결). ON·운영 적용은 별도 승인
W01-A1 조회 경로 GET /api/aif/assets/[id](read.ts, 기본 off) 시험 16개, Mac 검수 대기 — **A1 보완 계약**: SDK exists()가 400·404를 모두 없음으로 접고 객체 동일성 대조가 안 되므로 R1-6의 missing(object_absent) 자동 기록은 A1에서 하지 않고 서명 실패·조회 불명은 503·상태 보존 — 게시 기록 정리(cleanupOldPosts, 공용 사본)와 원본 자산은 범위 밖
검증: 소스 정적 대조(경로·줄 위 표), 운영 DB 읽기(표·함수 존재, 건수)
유료 호출: 0건 · 비용 없음
DB: 해당 없음(읽기만) · 배포: 해당 없음
남은 일: P0 상위 모델 비교는 최종 테스트로 연기(주인님 결정 2026-11-18), 개발 중 기능 시험은 저렴한 모델, 영상 23건 중 인물 클립 선별
```

### 14-A. W01-A1 OFF 소스 묶음 — 첫 단계 완료표 (2026-11-18, Master `msg_b0a3b18ad98c`)

**원본 저장 스위치 `AIF_ASSETS_MODE`는 서버 상수 "off"**(`src/lib/assets/generation.ts:8`). 운영 DB·시험 DB에 migration 적용 0, 버킷 생성 0, 실제 업로드 0, 배포 0, 버전 올림 0. 아래 「검증」 열은 서로 다른 것이므로 합쳐 읽지 않는다.

| 경로(`ai-influencer-studio/`) | 최종 커밋 | blob | 작성자 자체 시험 | Mac 독립 검수 | 격리 대역 실측 | 실 운영 |
|---|---|---|---|---|---|---|
| `supabase/migrations/20261118120000_aif_assets_a1.sql` | a29ffd287 | b29821216 | — | 정적 F01~F05 해소 | 15/15(작성자 실행) | 미적용 |
| `src/lib/assets/paths.ts` | 9d5d921a7 | 59d4c75aa | 8/8 | 지정 수락 | — | 미배포 |
| `src/lib/assets/store.ts` | 19ea5eab5 | 06f94480f | 13/13(가짜 rpc/storage) | 실모듈 F01·F02 PASS | — | 미배포·미연결 실행 0 |
| `src/lib/assets/generation.ts` | 1525cd92d | fa292bf6a | 16/16(실 라우트 POST + shadow 주입) | 실 POST 통합 PASS | — | 미배포(off) |
| `src/app/api/generate-image/route.ts` | 1525cd92d | 608d215c0 | 위와 같음 | 위와 같음 | — | 미배포(off) |
| `src/lib/assets/read.ts` | 403fca68e | 526bb4355 | 17/17(실 라우트 GET + shadow 주입) | 실 GET 국소 PASS | — | 미배포(off) |
| `src/app/api/aif/assets/[id]/route.ts` | 53fe00a72 | 7e129d91b | 위와 같음 | 위와 같음 | — | 미배포(off) |
| `src/lib/referenceImage.ts`(`sniffImageKind` export) | 4d88a8cab | a695a9096 | 기존 15 + store 시험 | 포함 검수 | — | 미배포 |
| `tests/assetPaths.test.mjs` | 9d5d921a7 | 723c65791 | | | | |
| `tests/assetsStore.test.mjs` | 19ea5eab5 | f1e8b06fd | | | | |
| `tests/generateImageRoute.test.mjs` | 1525cd92d | b3827db8c | | | | |
| `tests/assetReadRoute.test.mjs` | 403fca68e | 4053504f4 | | | | |
| `tests/sql/a1_contract.test.mjs` | 90ba12b30 | 7a0168d31 | | 잠금 PID·정리·역할 보강 수락 | | |
| `tests/sql/a1_fixture.sql` | 3a48682cd | dc6d5a8a6 | | | | |

- 자체 시험 합계: `npm test` 123/123(격리 SQL 시험 15는 별도 실행 `node --test tests/sql/a1_contract.test.mjs`).
- 「격리 대역 실측」은 로컬 Docker의 시험 DB에서 대역(profiles·member_storage_policy·storage.objects·auth.uid) 위로 돌린 것이다 — 실제 중앙 함수·실제 Supabase 통합 통과가 아니다.
- 「Mac 독립 검수」는 소스·모의 범위의 지정 검수다. 실제 DB·저장소·업로드·화면 검수가 아니다.

### 14-B. 운영 ON 전 선행 조건 — 미해결 목록 (준비 목록일 뿐, 승인 요청·실행 아님)

| # | 미해결 항목 | 현재 상태 | ON을 막는가 |
|---|---|---|---|
| 1 | migration 적용: 표 2개·함수 9개 | 초안만(a29ffd287), 어떤 DB에도 미적용 | **차단** |
| 2 | 버킷 `aif-assets`(비공개·20MB·MIME 5종) 생성 | 미생성(migration에 일부러 없음) | **차단** |
| 3 | 실제 Supabase에서 함수 소유자 권한·기본 GRANT·`storage.objects` 조회 권한 | 미검증(대역만) | **차단** |
| 4 | 실제 중앙 측정(`member_storage_measure`)·정책(`member_storage_policy`)과의 합산 | 미검증(정책은 대역) | **차단** |
| 5 | 실제 저장소 업로드·서명 URL 통합(SDK 응답 모양 실측 포함) | 미검증(가짜 주입) | **차단** |
| 6 | **일반 회원 30일 보관 정리 실행자** — 중앙 `member_storage_expired_files`는 `retention_exempt and not manual`(연장 회원)만 다루고 기본 회원 파일을 자동 삭제하지 않는다(§15-1 근거). `aif-assets`의 일반 회원 원본을 지우는 프로그램 정리 작업이 없다 | **미구현** | **차단 — 연결 전 ON 금지**(일반 회원 원본이 기한 없이 쌓여 보관 규칙 위반) |
| 7 | 정리 작업의 `retention_exempt` 제외(`loadRetentionExemptIdsStrict`) 연결 | 히스토리에는 적용(W01b), 원본 자산 정리는 6과 함께 미구현 | 차단(6에 포함) |
| 8 | 삭제 예약(claim)과 `ready` 자산의 관계 — 지금 `claim_delete`는 reserved·ready·unknown을 모두 「사용 중」으로 거절한다. 기간 만료 정리가 `ready` 자산을 지우려면 `ready → 만료/삭제 대상` 전이가 따로 필요 | **계약 미정**(SQL에 전이 없음) | 차단(6의 전제) |
| 9 | `unknown` 예약 복구·고아 객체 정리(사람 확인 또는 별도 복구 단위) | 미구현(§18-R2) | ON은 가능하나 unknown이 쌓이면 회원 한도가 보수적으로 줄어듦 — 복구 경로 없이 장기 운영 불가 |
| 10 | 게시한 원본의 포스팅 표시(`markPosted`)·추적 버킷 등록 | 미연결(W07) | 6·8 설계에 영향 |
| 11 | G5: 생성 결과 응답 4.5MB 한도 | 미해결(응답은 여전히 data URL) | ON과 무관하게 남는 기존 한계 |
| 12 | 화면의 `assetSaved` 표시·`unknown` 안내·조회 재시도 | 미구현(UI 0) | shadow에서 회원이 저장 결과를 알 수 없음 |
| 13 | 저장 시간 상한 초과 뒤 요청 중단(AbortSignal) | 미구현(대기만 끊고 요청은 계속될 수 있음) | 차단 아님 |
| 14 | 원본 PLAN(타 저자 미커밋)에 §18·R1·R2·A1 보완 계약 병합 | Master 등록 대기 | 문서 정합 |
| 15 | 히스토리↔자산 연결, 참고 이미지의 자산 ID 전환(A2: 클라이언트 업로드 ticket) | 미착수 | 차단 아님(후속) |

결론: **일반 회원 보관 정리(6·7·8)가 연결되기 전에는 운영 ON을 하지 않는다.** 위 항목 가운데 완료된 것은 없다 — 모두 준비 목록이다.

- (2026-11-18 갱신) 14-B의 6·7·8은 **OFF·모의 첫 구현**이 들어갔다(§19-R3). 운영 ON 차단은 그대로다 — SQL 미실행·실 DB/저장소 통합 미검증·예약 실행 미등록.

### 14-C. 보관 정리 새 SQL 격리 계약 실행 (2026-11-18, Master `msg_7418b7ac3cf6`)

대상은 migration 3차 수정분 blob `85eb99ea7`(커밋 79c222710)이며 **이번 실행에서 제품 SQL은 고치지 않았다**(결함 0건). §19-R3의 「SQL 작성만·격리 미실행」은 이 절로 갱신된다.

| 구분 | 결과 |
|---|---|
| 새 격리 시험 `tests/sql/a1_retention.test.mjs` | **19/19** — 시험 DB `qa_aif_retention_20261118`(실행마다 새로 만들고 oid 일치 확인 뒤 삭제·부재 검증) |
| 기존 격리 시험 `tests/sql/a1_contract.test.mjs` | **15/15** — 새 blob으로 1회 재실행(함수 수 단언 9→11만 수정), 시험 DB `qa_aif_a1_20261118`. 예전 15/15(blob b29821216)와는 다른 실행이다 |
| 첫 실행 | 16/19 — 실패 3건은 모두 **시험 결함**(설정값 정규식, 시험 준비가 한도에 걸림, boolean 글자 표기). 시험만 고쳐 19/19 |
| 모의·타입 | `npm test` 152/152, `npx tsc --noEmit` 통과(변경 없음 확인) |

확인한 것: 원문 적용·컴파일(함수 11개·`expired_at`·제약) · 새 함수 2개 security definer·search_path 고정·service_role 전용(anon·authenticated 호출 거절) · RLS(회원은 expired 자산·삭제 예약 표를 못 봄) · check 제약 · 기산(객체 생성 시각+정책 기간, 경계 29/31일·정책 7일·늦은 확정·오래된 행 시각 무시) · 판정 불가(객체 없음·다른 객체·생성 시각 NULL·기간 0/음수·정책 행 없음) · skip · 동적 보호(보호·무기한·기간 없음·기간 연장 → 복원) · claimed 토큰 fence(다른 토큰 busy·59분 busy·61분 취소·옛 토큰 deleting 실패·새 토큰) · 삭제 직전 복원 시 예약 cancelled · deleting/delete_unknown/deleted에서 복원 금지(locked) · delete_verify(없음 deleted·같은 객체 unknown·다른 객체 mismatch·토큰/회원/NULL denied) · delete_unknown→delete_failed 불가 · 용량(한도 100·중앙 0·오래된 60 → expired 뒤 새 60 거절, deleted 확정 뒤에만 허용, 중앙이 이미 세면 이중 계산) · updated_at 순환 · 재적용 · **2연결 실잠금 2건**(대기 연결의 `wait_event`=Lock/advisory, `pg_blocking_pids`가 잠금 보유 연결의 pid와 일치).

한계(그대로): `storage.objects`·`profiles`·`member_storage_policy`·`member_storage_usage`는 전부 대역이다 — 실제 Supabase 저장소·실제 중앙 정책·실제 함수 소유자 권한과의 통합 통과가 아니다. 「객체가 지워졌다」는 대역 표의 행을 지워 흉내 냈고 **실제 저장소 삭제(remove)는 한 번도 부르지 않았다.** `storage.objects.created_at`의 NULL 허용은 새 시험 DB 안에서만 맞췄다(대역 파일 무변경). 대역 파일에는 정책 대역이 읽을 `retention_days`·`unlimited_retention` 열만 추가했다(기본값은 예전 고정값과 같다).
격리 환경: 로컬 Docker `aww-pg-test`(postgres:17-alpine). 실행 뒤 `qa_aif%` DB 0개, 기존 DB 목록(aww·aww_dev·mb_dry·mb_reh·mb_scn·postgres) 그대로, 업무 DB 접속 0, 역할 생성·변경 0(관리용 postgres DB에는 역할·DB 목록 조회와 시험 DB 생성·삭제를 위해 접속).

### 14-D. 보관 정리 입출력 유한 대기 보완 (2026-11-18, Master `msg_1bc70971878e`)

변경은 `src/lib/assets/retention.ts`와 그 모의 시험뿐이다. **SQL·대역·조회(read)·정리 라우트 파일 변경 0**(라우트는 시험용 한도를 넘기지 않으므로 기본 상수를 그대로 쓴다).

- 이전 한계: 240초는 「새 항목을 시작하지 않는」 기준일 뿐이라, 입출력 한 번이 응답하지 않으면 끝없이 기다렸다.
- 보완: 주입된 **모든** 입출력(보호 회원 목록·목록 조회 3종·DB 함수 전부·저장소 remove·측정)을 「호출당 15초(`CLEANUP_IO_TIMEOUT_MS`)」와 「회차 마감 280초(`CLEANUP_ROUND_DEADLINE_MS`)까지 남은 시간」 중 짧은 쪽만 기다린다. 남은 시간이 없으면 호출을 시작하지 않는다. (정리 비밀값은 환경변수를 읽는 동기 값이라 기다림이 없다.)
- 대기 초과가 나면: 그 자산에 대한 추가 호출 0(remove·재시도·취소 시도·불명 표시 포함), 뒤 항목 시작 0, 결과에 `stopCode: "IO_TIMEOUT"`과 `counts.timeouts`.

| 대기 초과 지점 | 처리 | 남는 상태 → 다음 회차 |
|---|---|---|
| 보호 회원 목록 | 회차 중단(`EXEMPT_UNAVAILABLE`), 목록·판정·삭제 0 | 무변경 |
| 목록 조회 | 나머지 목록 조회도 시작하지 않음, 항목 0 | 무변경 |
| 만료 판정(첫 호출) | 그 자산·뒤 항목 중단 | 판정이 나중에 커밋되면 expired+대기 행 → 묶음 B |
| 예약(claim) | remove 0 | 나중에 커밋되면 claimed → 1시간 뒤 토큰 없는 판정이 취소 |
| 삭제 직전 재확인 | remove 0, 취소 시도 0 | claimed 그대로 → 위와 같음 |
| deleting 커밋 | **remove 0** | 나중에 커밋되면 deleting → 묶음 C가 확인만 |
| remove | 성공·실패 단정 0, 재삭제 0. 남은 시간이 있으면 확인 1회, 없으면 확인 새 요청 0 | deleting 또는 delete_unknown → 묶음 C |
| 삭제 확인 | 불명 표시 시도 0 | deleting·delete_unknown 그대로 → 묶음 C |
| 측정 | 남은 측정 시작 0 | 삭제 결과 그대로(측정만 늦음) |

**한계(과장하지 않는다)**: 이것은 기다리기를 그만두는 것이다. 원격 요청을 취소하지 않으며(그 요청은 뒤에서 계속되고 DB는 나중에 커밋될 수 있다), 회차가 정확히 280초·300초 안에 끝난다는 보장도 아니다(동기 구간·런타임 지연은 재지 않는다). 설치된 SDK의 DB 조회에는 AbortSignal을 넘기는 경로가 있으나 읽기만 확인했고 쓰지 않았다 — 저장소 remove에서는 같은 경로를 확인하지 못했고, 신호를 보내도 서버 실행이 멈춘다는 보장이 없어 판정 규칙이 달라지지 않는다. 운영 ON 선행 목록에 「실제 취소 연결 검토」와 「실제 지연에서의 회차 시간 실측」을 남긴다.

검증: `tests/assetRetention.test.mjs` 44건(기존 29 + 유한 대기 15: 끝나지 않는 약속·한도 뒤에 커밋되는 늦은 응답·늦은 거절·회차 마감 소진·각 단계별), 전체 `npm test` 167/167, `npx tsc --noEmit` 통과. 변형 검증에서 새 규칙 14종 + 기존 핵심 6종을 확인했고, 그 과정에서 **불필요한 방어 코드 2줄을 찾아 지웠다**(늦은 거절 무시용 catch — race가 이미 처리기를 붙임 / 멈춘 뒤 측정 건너뛰기 — 공통 차단과 중복). 모의 시험이며 실제 DB·저장소·삭제 호출은 0이다.

- (2026-11-18 보완, Mac IO-F01·Master `msg_d998e2a2d9ec`) 14-D의 집계 결함 1건 수정: deleting 커밋 직후 회차 마감이면 remove를 시작하지 않는데 `removeCalls` 1·`deleteUnknown` 1로 세고 있었다(실제 삭제 동작은 맞았고 건수만 틀림). `removeCalls`는 실제로 호출을 시작하는 순간에만 올리고, 미전송은 새 건수 `removeNotSent`로 따로 센다. 미전송이면 추가 호출 0·예약 deleting 보존(다음 회차는 확인만 — 다시 지우지 않으므로 객체가 남아 있으면 delete_unknown이 되며, 미전송 건의 재시도 경로는 후속 복구 단위). 시험 45건(반례 1 추가)·전체 168/168·tsc 통과, 집계를 호출 밖으로 되돌린 변형은 빨강.

- (2026-11-18 P1 구현, Master `msg_7932d8b18fa0`) 삭제 진입 전 시간 확인을 `retention.ts`에 넣었다(§20-5 P1·§20-3 D5 문구를 구현과 맞게 정정). 새 건수 `deferredForTime`, 멈춤 코드는 `TIME_BUDGET`. 시험 48건(경계·취소 불명 3가지·묶음별 3건 추가, 미전송·remove 마감 시험 2건은 「진입 전 확인을 통과한 뒤 시계가 건너뛰는」 재현으로 교체)·전체 171/171·tsc 통과, 변형 10종 빨강. SQL·대역·read·route 변경 0.

### 14-E. 복구 P2 SQL 소스·격리 시험 초안 (2026-11-18, Master `msg_a289fd0c172a`, 설계 §20-8)

**작성만 했다. SQL 실행 0·격리 DB 생성 0·기존 migration(A1 원문)·대역·런타임·라우트 변경 0.**

| 파일 | 내용 | 상태 |
|---|---|---|
| `ai-influencer-studio/supabase/migrations/20261118130000_aif_assets_p2_missing.sql` | 새 후속 파일(§20-8 (7)의 가 안). 열 2개(`aif_assets.object_checked_at`, `aif_asset_deletions.parked_at`), 색인 2개, 함수 2개(`aif_asset_missing_scan`, `aif_asset_mark_missing`). A1 원문 뒤에 실행 | 초안·미실행 |
| `ai-influencer-studio/tests/sql/a1_missing.test.mjs` | 격리 계약 시험 초안 20건(스키마·색인·권한 3, 판정·예약 보존·삭제 흐름 격리 6, 용량 1, 롤백 1, 훑기 5, 2연결 3, 재적용 1 — 실행 전이라 통과 여부는 미확정이고 실행 결과에 따라 시험이 고쳐질 수 있다) | 초안·**한 번도 실행하지 않음**(`node --check` 문법 검사만) |

초안에서 정한 것(설계 §20-8의 구체화)
- **색인과 정렬**: 훑기의 `order by object_checked_at asc nulls first, id asc`와 같은 순서의 부분 색인 `(object_checked_at asc nulls first, id asc) where state = 'ready'`. btree의 ASC 기본은 NULLS LAST라서 명시하지 않으면 이 정렬에 쓰이지 않는다 — 시험 초안이 `explain`으로 「색인 사용·Sort 없음」과 「NULLS FIRST를 빼면 Sort 필요」를 함께 본다(대역의 작은 표에서의 계획 확인이지 실제 규모의 성능 증거가 아니다).
- **상한 두 개와 줄임**: `p_scan_limit`(읽을 ready 행 수, 최대 5000)과 `p_limit`(돌려줄 후보 수, 최대 500이고 창보다 클 수 없음)은 별개다. NULL·1 미만은 예외. 실제로 쓴 값을 결과에 싣는다.
- **조회 결과와 변경 행의 구분**: 훑기는 jsonb 한 값으로 `scanned`·`present`·`other_object`·`absent`(창 안의 분류 건수)와 `touched`(확인 시각을 갱신한 행 수 = present + other_object), `candidates`(absent 중 앞에서부터 최대 limit개)를 따로 돌려준다. 훑기가 바꾸는 것은 확인 시각뿐이고 상태는 바꾸지 않는다.
- **잠금 건너뛰기의 한계**: `for update skip locked` — 잠긴 행은 기다리지 않고 건너뛴다. 건너뛴 만큼 색인을 더 읽을 수 있고, 건너뛴 행은 그 회차에 확인되지 않는다. 「정확히 창 크기만큼 검사한다」는 보장이 아니다.
- **판정**: 저장소 두 기준(그 id의 행 없음 **그리고** 그 bucket·name의 행 없음)이 모두일 때만 `missing`. 읽지 못하면 예외·롤백 — 시험 초안은 한 거래 안에서 대역 표 이름을 바꿔 「읽을 수 없음」을 흉내 낸다.
- **예약 보존**: `missing` 전이와 같은 거래에서 비활성 예약에 `parked_at`만 기록(상태·토큰·시도 횟수·행 보존). 기존 함수 본문에 `parked_at`이 들어가지 않았음을 시험 초안이 확인한다.

향후 격리 실행 대상·명령(배정 뒤, 지금은 실행 0)
- 새 시험: `cd ai-influencer-studio && node --test tests/sql/a1_missing.test.mjs` — 시험 DB `qa_aif_missing_20261118`(사전 미존재 확인 → 생성 oid 기록 → 대역 → A1 원문 → P2 파일 → 시험 → oid 일치 시에만 삭제 → 부재 검증).
- A1 원문과 대역은 바뀌지 않으므로 기존 두 시험(`a1_contract`·`a1_retention`)은 다시 돌릴 필요가 없다(영향 범위 밖). 런타임 연결 단위에서 A1 원문을 고치게 되면 그때 재실행한다.
- 조건: 로컬 Docker `aww-pg-test`, 역할 3개 사전 확인, 업무 DB 접속 0, 역할 생성·변경 0, 실제 저장소 호출 0.

남은 것: 격리 실행과 그 결과에 따른 초안 수정 · 런타임 연결(정리 실행자 묶음 D, 라우트의 목록 조건 `parked_at is null`) · 실제 Supabase에서의 권한·실행 시간.

- (2026-11-18 실행 전 보완, Master `msg_b79fa67a3680`) 14-E 초안 두 곳 수정 — 여전히 SQL 실행 0·DB 생성 0. ① `aif_asset_mark_missing`의 저장소 존재 판정 세 개를 **한 SELECT(한 스냅샷)** 로 묶었다. 따로 세 번 물으면 READ COMMITTED에서 문장마다 스냅샷이 달라, 그 사이 객체가 옮겨지거나 바뀔 때 서로 다른 시점의 「없음」을 합쳐 부재로 잘못 확정할 수 있었다. 한계는 그대로다 — 읽은 것은 그 순간의 사실이고, 그 관찰 뒤의 저장소 쪽 쓰기까지 막지는 못한다. ② 격리 시험 초안의 실행 도우미: docker 실행 실패(spawn error)·입력 전달 실패·시간 초과에서 Promise가 끝나지 않던 경로를 없애고 명확한 실패로 돌려주게 했다(동기 호출 60초·비동기 30초 상한, 컨테이너 확인 15초). 만든 DB만 oid 일치 시 지우는 정리 범위는 그대로다. 검증은 `node --check` 문법 검사뿐이다.

- (2026-11-18 격리 실행 결과, Master `msg_1ede944e2a6c`·`msg_e35ee13c657f`·`msg_1b9327970031`·`msg_824abfdf2bc5`) 14-E의 「초안·미실행」은 아래로 갱신된다. **제품 SQL(P2 파일 blob `19af3e6bb`)·A1 원문 `85eb99ea7`·대역 `a87daf331`은 세 실행 내내 바뀌지 않았다.** 세 실행의 수치는 합산하지 않고, 최종 결과는 3차만 인용한다.

  | 실행 | 시험 파일 커밋·blob | 결과 | 시험 DB oid | 실패의 성격 |
  |---|---|---|---|---|
  | 1차 | 2d6dfff03 · f57270d85 | 17/20 | 2545004 | 시험 결함 3: 저장소 객체 수 기대값 산수 오류(4 → 실제 5) · 앞 시험이 남긴 ready 행이 창에 섞임 · 7행/창 2/4회차의 마지막 재독을 재독 없음으로 기대 |
  | 2차 | 4e0c27cc5 · 1c682d08c | 19/20 | 2545126 | 시험 결함 1: 회차 안 두 행을 생성 순서로 기록해 id 순서와 비교(회차별 묶음 자체는 정렬 구간과 일치했다) |
  | **3차(최종)** | **da5996c2a · 1df869114** | **20/20** | 2545248 | — |

  각 실행: 사전에 역할 3개와 시험 DB 미존재를 확인했고, 실행 뒤 oid 일치 확인 → 삭제 → 부재 검증이 통과했다. 종료 후 `qa_aif%` DB 0개·대상 세션 0·기존 DB 목록과 역할 그대로. 실패 때마다 고치지 않고 먼저 보고했으며 자동 재실행은 하지 않았다. 초기 실패를 제품 반례로 적지 않는다.
  2연결 실측(3차): 다른 연결이 행을 잠근 동안 훑기는 156ms에 2행만 읽고 돌아옴(기다리지 않고 건너뜀) · `mark_missing`이 같은 자산의 `expire`가 쥔 권고 잠금에 막혔다가 이어서 `missing`(대기 연결의 `pg_blocking_pids` = 보유 연결 pid) · 같은 후보에 동시 판정 두 번은 둘 다 `missing`.
  **대역 한계(그대로)**: `storage.objects`·`profiles`·`member_storage_policy`·`member_storage_usage`는 전부 대역이다 — 실제 Supabase 저장소, 함수 소유자의 실제 권한, 실제 실행 시간, 중앙 정리와의 실제 상호작용은 확인되지 않았다. 「객체가 사라짐·옮겨짐·바뀜」은 대역 표의 행을 바꿔 흉내 냈고 실제 저장소 호출은 0이다. `explain` 확인은 작은 대역 표에서의 계획 확인이지 실제 규모의 성능 증거가 아니다. 건너뛴 행은 그 회차에 확인되지 않으며, 발견 시한·무기아는 보장하지 않는다. 판정이 읽은 스냅샷 뒤의 저장소 쪽 쓰기는 막지 못한다.
  남은 것: Mac 소스 정적 독립 검토 · 런타임 연결(정리 실행자 묶음 D, 라우트의 목록 조건 `parked_at is null`) · 실 DB 적용과 실제 권한·시간 확인. 어느 것도 시작하지 않았다.

### 14-F. 복구 P2 런타임 연결 — 정리 실행자 묶음 D (2026-11-18, Master `msg_bf03508f5f2a`, 설계 §20-8)

변경은 `src/lib/assets/retention.ts`·`src/app/api/aif/assets/cleanup/route.ts`·모의 시험뿐이다. **승인 SQL(P2 `19af3e6bb`·A1 `85eb99ea7`)·대역·조회(read)·저장(store)·모드 상수·예약 실행 등록은 바뀌지 않았다.** 스위치는 여전히 off라 라우트는 인증 뒤 아무것도 하지 않는다. 실 SQL·DB·저장소 호출 0.

- **순서 C → D → B → A.** 묶음 D는 DB 호출만 한다(저장소 remove 0·삭제 예약 0). 보호 회원 목록을 보지 않는다 — 모든 회원의 ready가 대상이다.
- **상한 셋을 구분**: 훑는 창 `CLEANUP_MISSING_SCAN_WINDOW`(500행, DB 함수의 `p_scan_limit`) / 돌려받는 후보 최대 `CLEANUP_MAX_ITEMS`(100, `p_limit`) / 이 회차에 실제로 판정하는 수(회차 상한 100을 네 묶음이 나눠 쓴 몫). 돌려받고도 판정하지 못한 후보는 다음 회차에 다시 온다. 창 500은 잠정값이다 — 실제 DB에서의 훑기 시간은 재지 않았다.
- **응답을 그대로 믿지 않는다**: 훑기 응답은 건수 다섯 개가 음이 아닌 정수이고, `scanned` ≤ 요청한 창, 후보 수 ≤ 요청한 반환 상한, 후보마다 표준 UUID 두 개일 때만 쓴다. 하나라도 어긋나거나 오류·함수 미적용이면 통째로 버리고 D만 건너뛴다(`missingScanFailed`) — 다른 묶음은 진행한다.
- **전이를 단정하지 않는다**: `markedMissing`은 DB 함수가 정확히 `missing`을 돌려줬을 때만 센다. `present`·`other_object`·`busy`·`skip`은 각각 따로, 오류·모르는 값은 미확정으로 센다. 판정·훑기의 대기 초과는 세지 않고 회차를 멈춘다(뒤늦게 커밋될 수 있다).
- **이어 하기 목록**: 라우트의 조회에 DB 조건 `parked_at is null`을 정렬·limit 앞에 넣었다. missing이 된 자산의 보류된 예약은 목록에 나오지 않는다(예약 행·토큰·시도 횟수는 보존).
- **(철회됨 — 아래 「14-F 정정」 참고) 설계에 없던 한 가지(판정 요청)**: 묶음 D의 후보는 신규 묶음(A) 목록에서 뺀다. 객체가 없으면 만료 판정은 어차피 판정 불가이고, D가 방금 missing으로 바꾼 행에 만료 판정을 한 번 더 부르는 것은 A의 몫만 낭비하기 때문이다. A의 조회는 바꾸지 않았다(읽어 온 뒤 메모리에서 뺀다) — 그래서 **오래된 유령 행이 A 목록의 100자리를 먼저 차지하는 것 자체는 막지 못한다**. 그런 회차에는 진짜 대상이 처리되지 않고, D가 회차를 거치며 유령 행을 정리해야 풀린다(보장하지 않는 지연).

검증: `tests/assetRetention.test.mjs` 58건(기존 48 + 묶음 D 9 + 라우트 소스 정적 1, 기존 시험 2건은 D 동작에 맞게 기대값 수정), 전체 `npm test` 181/181, `npx tsc --noEmit` 통과. 변형 16종 중 15종 빨강, 1종(「새 삭제 중단이면 D도 중단」)은 동작 차이가 없는 변형이다 — D가 삭제 묶음보다 먼저 돌아 그 값이 켜져 있을 수 없다. **모의 시험이다**: 가짜 DB는 SQL 함수를 계약대로 흉내 낸 것이고, 라우트의 실제 조회(PostgREST `.is("parked_at", null)`·`rpc`)는 소스 글자로만 확인했다. 실제 PostgREST 응답 모양(jsonb 반환이 `data`에 객체로 오는지 포함)과 실 DB 동작은 미검증이다.

#### 14-F 정정 (2026-11-18, Master `msg_eb6b37119dcb` — 2acb43f95 검토 반영)

1. **후보를 신규 묶음에서 빼던 동작을 철회했다.** 훑은 뒤 저장소 상태가 바뀔 수 있고(객체가 돌아옴) 이 회차의 D 몫에서 밀릴 수도 있는데, 그런 자산까지 미리 빼면 신규 묶음의 재확인이 사라진다. 신규 묶음은 예전대로 그 자산에도 만료 판정을 부른다 — D가 방금 missing으로 바꿨다면 DB가 `skip`을 돌려주고, 아직 ready면 객체가 없어 판정 불가로 끝난다. 그만큼 신규 묶음의 몫이 쓰이는 것은 받아들인다.
2. **훑기 응답 검증에 SQL 계약의 건수 관계를 넣었다**: `scanned = present + other_object + absent`, `touched = present + other_object`, 후보 수 ≤ `absent`, 후보에 같은 자산이 두 번 없음. 하나라도 어긋나면 통째로 버리고 D 판정 0.
3. **「처리 순서」와 「호출 순서」를 구분하고 실행 구조를 바꿨다.** 앞 커밋은 C → D → B → A라고 적어 놓고 실제로는 훑기(확인 시각을 쓰는 DB 호출)를 C 확인보다 먼저 불렀다 — 훑기가 응답하지 않으면 이미 삭제 요청이 나간 건의 확인(C)이 한 건도 돌지 못했다. 지금의 실제 호출 순서:

   | 단계 | 하는 일 | 쓰기 |
   |---|---|---|
   | ① | C 목록 읽기 | 없음 |
   | ② | C의 **앞 몫** 확인 — 최대 `CLEANUP_VERIFY_FIRST`(25 = 회차 상한 ÷ 4)건 | 삭제 확인 표시 |
   | ③ | D 훑기(창 500·반환 100) | 확인 시각 |
   | ④ | B·A 목록 읽기 | 없음 |
   | ⑤ | 네 묶음 분배(회차 상한 100) | — |
   | ⑥ | C의 나머지 몫 | 삭제 확인 표시 |
   | ⑦ | D 판정 | missing 전이 |
   | ⑧ | B | 삭제 흐름 |
   | ⑨ | A | 삭제 흐름 |

   **한정**: 훑기보다 먼저 도는 것은 C의 앞 몫 25건까지다. C가 그보다 많으면 나머지는 훑기·목록 조회 뒤(⑥)에 돌고, ③·④가 대기 초과면 그 나머지는 그 회차에 확인되지 않는다. C 목록 조회(①) 자체가 멈추면 아무것도 돌지 않는다. 분배 결과는 예전과 같다 — 네 묶음이 한 건씩 돌아가며 나눠 가지므로 C는 적어도 min(건수, 25)를 받고, 앞 몫은 그 안에 들어 있다(시험: C 150 + 신규 150 → 50/50 그대로).
4. 오래된 유령 행이 신규 목록 앞자리를 차지하는 지연은 그대로 남는다(오히려 1의 철회로 한 회차의 D 몫이 줄 수 있다). 시험은 「120건의 유령 행 뒤에 있는 진짜 대상 10건이 3회차 이상 걸려 처리된다」로 재현해 두었다 — 시한은 보장하지 않는다.

검증(정정 뒤): `tests/assetRetention.test.mjs` 60건, 전체 `npm test` 183/183, `npx tsc --noEmit` 통과. 변형 9종 빨강(후보 재제외·건수 관계 4종·앞 몫 0/전부·나머지 중복/생략). 라우트·SQL·대역·모드·예약 등록 변경 0. 여전히 모의 시험이며 실제 PostgREST 응답 모양·실 DB 동작은 미검증이다.

- (2026-11-18 보완, Mac `msg_02dea45ade4a`·Master `msg_f8278f869b1a`) 14-F 호출 순서의 ③(D 훑기)에 시작 조건을 넣었다: C 앞 몫을 마친 시점에 회차가 이미 멈췄거나(대기 초과) **새 항목 시간 예산(240초)이 지났으면 훑기를 부르지 않는다** — 회차 마감(280초) 전이라는 이유만으로 새 쓰기(확인 시각)를 시작하지 않는다. 그때는 뒤 묶음의 목록도 읽지 않는다. 멈춘 이유는 대기 초과가 우선(`IO_TIMEOUT`), 아니면 `TIME_BUDGET`. **의도적으로 시작하지 않은 것은 `missingScanFailed`·`listFailed`로 세지 않는다**(이전에는 멈춘 회차의 훑기를 실패 1로 셌다). 이미 확인한 C와 그 측정은 그대로 남는다. 시험 61건(가짜 시계 경계: 예산 25면 C 3건 뒤 훑기 0·판정 0·remove 0·`TIME_BUDGET`, 예산 30(경계)이면 예전 흐름, 넉넉하면 전부 처리, 대기 초과가 겹치면 `IO_TIMEOUT` 우선)·전체 184/184·tsc 통과, 변형 5종 빨강. 라우트·SQL·대역·모드 변경 0.

- (2026-11-18 상태, Master `msg_26b9b2ab70f4`) **W01s 로컬 구현·검수 종결 — 미배포.** 최종 커밋 1a3832e7b(`retention.ts` 6e43fba6a·`tests/assetRetention.test.mjs` abe8848c8·정리 라우트 518aac1a8). Mac 독립 검수: 지정 필터 8/8(09a2b3b94) → 시간 경계 보완 뒤 새 모의 1/1·4조건(1a3832e7b). 작성자 모의 61건·전체 184/184·tsc 통과. 스위치 off·예약 실행 미등록·실 DB/저장소 적용 0은 그대로다. 운영 ON 전 남은 것(§14-B에 더해): 후속 migration(P2)의 실 DB 적용과 함수 소유자 권한 확인 · 실제 PostgREST에서 `parked_at is null` 조건과 jsonb 함수 응답 모양 확인 · 훑기 창 500의 실제 실행 시간 실측 · 오래된 유령 행이 신규 목록 앞자리를 차지하는 지연(보장 없음) · P3 읽기 전용 집계·P4 운영자 승인 전이.

### 14-G. 복구 P3 읽기 전용 집계 — 설계 (2026-11-18, Master `msg_037b8444a5bf`, 설계 §20-9, **수락 989d26b3c**)

- 문서만 바꿨다. SQL 작성·DB 생성·격리 실행·운영 조회/쓰기·저장소·AI·빌드·배포·푸시 0. 소스·시험 변경 0(최종 그대로 1a3832e7b).
- 제안 요지: 서비스 전용 `stable` SQL 함수 1개가 자산 축 5범주·예약 축 5범주의 건수와 나이 구간(1시간·24시간·7일, 기준시각은 DB `now()` 하나)만 돌려준다. 식별자·경로·토큰 0, 쓰기·잠금 0, 범주당 읽기 상한과 초과 표시, 축을 넘는 합계 없음.
- 설계 중 확인한 사실: `mismatch`·`other_object`는 함수 반환값일 뿐 DB에 남지 않아 범주가 될 수 없다 · `delete_unknown`은 진입 시각 열이 없다(예약 `updated_at`은 마지막 확인 시각) → 나이를 「만료 후 경과」와 「마지막 확인 후 경과」 두 벌로 낸다.
- 정합화: §20-4·§20-8 (9)의 「목록」「행 단위」 표현을 건수 전용으로 정정했다(행 단위 대조는 P4).
- 다음: Master 확정 6항(§20-9 (12)) → 구현 배정 시 새 migration 파일 1개 + 격리 시험 1개(§20-9 (9)).

### 14-H. 복구 P3 읽기 전용 집계 — SQL·격리 시험 초안 (2026-11-18, Master `msg_5ffb8d03b1ee`, 설계 §20-9)

**작성만 했다. SQL 실행·DB 생성·격리 실행 0, 운영 조회/쓰기·저장소·AI·빌드·배포·푸시 0.** 기존 migration 두 파일·런타임(`src/`)·대역(`a1_fixture.sql`)·기존 시험 변경 0.

| 파일 | 내용 |
|---|---|
| `ai-influencer-studio/supabase/migrations/20261118140000_aif_assets_p3_summary.sql` (새 파일) | 부분 색인 `aif_asset_deletions_parked_idx (parked_at) where parked_at is not null` + 함수 `aif_asset_stuck_summary(p_cap integer default 2000) returns jsonb` — `stable`·`security definer`·`search_path = ''`·서비스 전용. 한 문장으로 10개 범주를 읽는다. 열 추가 0, 기존 함수 본문 변경 0. 적용 순서 A1 → P2 → 이 파일 |
| `ai-influencer-studio/tests/sql/a1_summary.test.mjs` (새 파일) | 격리 DB `qa_aif_summary_20261118` 계약 시험 17건(미실행). `npm test`에는 들지 않는다 |

- 시험 항목(17): 컴파일·함수 14개·색인·열 수 불변·본문 정적 확인 / 권한 / 빈 표 모양 / 기준시각 / 범주별 정확 건수와 세지 않는 행 / 구간 경계(정확히 1·24·168시간, 미래, NULL) / 범주별 기준 열 / `delete_unknown` 두 벌 / 두 축 비합산·대소 관계 없음 / 주차 배타성 / 한도 초과 / 한도 조임 / 쓰기 0(전후 해시) / 2연결 명시 잠금 없음·미커밋 비가시 / 한 스냅샷 / 식별자 미노출 / 재적용.
- 시험의 한정: 행을 상태 전이 함수 없이 **직접 심는다**(시각을 정확히 지정하려는 것) — 「그런 행이 있을 때 어떻게 세는가」만 본다. 설계상 함께 있을 수 없는 조합(주차 표시 + `claimed` 등)도 배타성을 보려고 심는다.
- 미검증(그대로 적는다): SQL 문법·동작 전부(한 번도 실행하지 않았다) · 「한 스냅샷」 시험이 기대대로 문장 시작 시점을 잡는지 · 실제 Supabase의 권한·PostgREST 응답 모양·실행 시간.
- 로컬 확인: `node --check tests/sql/a1_summary.test.mjs` 통과, 기존 `npm test` 184/184 그대로(새 파일은 `tests/*.test.mjs` 밖).
- 다음: 격리 실행 배정(1회, 실패 시 고치지 않고 먼저 보고) → 맥미니 독립 검수.

**격리 실행 기록 (2026-11-18, Master `msg_d548a412ba12`·`msg_4f04324ccb1d`)** — 위 「작성만 했다」는 초안 시점의 사실이고, 그 뒤 로컬 대역에서 두 번 실행했다. 제품 SQL(blob `67b91845a`)·A1·P2·대역 파일은 두 번 모두 같은 것이다.

| 회 | 시험 blob | 결과 | 내용 |
|---|---|---|---|
| 1 | `8e6979ec6`(f4c2d2c12) | 16/17 | 실패 1건은 **시험 결함**: 「컴파일」 시험의 조회문이 `pg_proc.provolatile`(한 글자 형)을 `::text` 없이 이어 붙여 `operator is not unique: text || "char"`. 제품 SQL과 무관. 이 오류로 그 시험의 뒤쪽 단언(서명·stable·색인·열 수·본문 정적 확인)은 그 회에 실행되지 않았다. 고치지 않고 먼저 보고 |
| 2 | `8d5a70dc6`(80ac8fc43) | **17/17** | 시험 두 곳만 수정(`::text`, 스냅샷 시험에 양성 대조 추가). 1회에 못 본 단언 포함 전부 통과 |

- 환경·정리: 컨테이너 `aww-pg-test`(postgres 17, 떠 있는 것만 사용 — 설치·재시작 0). 시험 DB `qa_aif_summary_20261118`를 회마다 새로 만들고(1회 oid 2545369, 2회 oid 2545883) oid 일치 확인 뒤 삭제. 두 번 모두 종료 후 `qa_aif_%` DB 0개·세션 0개. 업무 DB 접속 0, 역할 생성·변경 0.
- 스냅샷 시험의 근거(2회): 한 문장에서 관문 함수(5초 잠든 뒤 종료 시각 반환)의 결과에 두 호출의 인자를 의존시켰다 → 둘 다 관문 뒤에 평가된다. 관문 실행 중임을 `pg_stat_activity`로 본 뒤 다른 연결이 행 2건을 커밋했고, **커밋 완료 뒤 시각 13:18:01.108 < 관문 종료 시각 13:18:05.638**(DB 시계, UTC). 같은 문장에서 `VOLATILE` 대조 함수는 새 값 `1:1`을, `STABLE` 집계는 이전 값 `0:0`을 돌려줬다. 다음 문장의 집계는 `1:1`.
- 그 근거의 한계: 대역 DB·READ COMMITTED·한 번의 관측이다. 「집계가 한 문장으로 읽으므로 범주 사이 시점이 같다」는 것은 이 시험이 직접 보지 않는다(호출 문장의 스냅샷을 쓴다는 것까지 본다). 집계를 `stable`이 아니게 바꾸면 이 보장은 사라진다.
- 실제로 검증된 범위는 **대역 위의 계약**이다: 권한 · 반환 모양 · 범주 조건 · 구간 경계 · 한도 · 쓰기 0 · 명시 잠금 없음 · 식별자 미노출 · 재적용. **여전히 미검증**: 실제 Supabase의 함수 소유자 권한, PostgREST 응답 모양, 실제 규모의 읽기량·실행 시간, 행이 실제 전이 함수로 만들어진 경우와의 차이(시험은 행을 직접 심는다).
