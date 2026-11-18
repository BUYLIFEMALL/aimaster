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
| G1 얼굴 seed 잠금 오표시 | **존재 확인** | 표시 4곳: `src/components/ControlPanel.tsx:294`(`Seed #98241 LOCK`), `:1103`(`페이스 락(#98241) 화보 생성`), `src/components/ImageDisplay.tsx:90`, `:295`. 생성 요청 `src/lib/gemini.ts:98-106`은 `modelName·parts·aspectRatio·imageSize·timeout·retries`만 보내고 seed 없음 | 실제 얼굴 유지 수단은 `personImage` 1장을 첫 이미지 조각으로 첨부하는 것뿐. 참고 이미지는 실제 형식과 무관하게 모두 `mimeType: "image/png"`로 보냄(`gemini.ts:43-87`) |
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

1. **P0 유료 비교 실행 승인**: 위 §6, 시험 계정 본인 키, 51건·예상 $8.7·상한 $12. 승인 전에는 실행하지 않는다.
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

## 14. 진행 상태 기록

```text
작업 ID / 기능 ID: W00 / F20-04·C03·C07
담당 역할 / 세션 / 장비: sns / claude-win-20261118-sns / GT1_Mega(윈도우 메인)
인수 시각 / 문서 버전: 2026-11-18 / PLAN 2.0
정확한 파일 점유: docs/analysis-ai-influencer-20261118/W00_BASELINE.md(신규)
대상 기준 SHA: e7c03b317 (ai-influencer-studio 마지막 변경 5e27cb269)
현재 상태: 자체 검증(정적 대조) 완료 · 독립 검수 대기
검증: 소스 정적 대조(경로·줄 위 표), 운영 DB 읽기(표·함수 존재, 건수)
유료 호출: 0건 · 비용 없음
DB: 해당 없음(읽기만) · 배포: 해당 없음
남은 일: P0 유료 비교(승인 대기), 영상 23건 중 인물 클립 선별, W01 착수
```
