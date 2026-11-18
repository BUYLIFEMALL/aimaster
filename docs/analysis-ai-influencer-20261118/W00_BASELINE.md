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
| G6 | 미세 보정이 직전 결과를 연속 참조 | `InfluencerStudio.tsx:266`(`lastResultImage`), `gemini.ts:77-87` | PLAN §5 「원본 시트 기준 생성·누적 변형 방지」와 반대. 보정을 거듭하면 얼굴이 조금씩 바뀜 | W03/W04 — 보정 요청에도 기준 시트를 함께 첨부, 입력 자산 기록 |
| G7 | 참고 이미지 역할 구분 없음 | `gemini.ts`가 이미지를 순서대로만 붙임. 프롬프트(`influencer-engine.ts:104-108`)에는 상품 참고 이미지 역할만 설명하고 얼굴·장소 이미지가 몇 번째인지·무슨 역할인지 설명이 없음 | 장소·상품 사진을 얼굴 기준으로 오인할 위험(F06-02) | W03 |
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
3. **보관**: 프로그램 자체 정리는 `retentionExempt.ts`(공용 기준 미등록, 여러 프로그램이 같은 내용을 따로 둠 — `ai-video-studio/lib/retentionExempt.ts`를 그대로 가져옴)로 예외 회원을 빼고, 예외 목록을 못 읽으면 정리 전체를 멈춘다. 기간 판정은 중앙 함수 `member_storage_policy`와 맞춘다. 캐릭터 기준 자산도 기간 정책 대상이며, 만료되면 그 인물의 신규 자동 제작을 보류한다(무기한 보관 약속 없음).
4. **게시용 임시 사본은 원본과 별개 수명**: 지금처럼 게시 후 삭제 유지. 원본 자산은 게시 여부로 수명이 바뀌지 않는다.
5. 금액은 `numeric(12,4)` + `currency char(3)`, 시각은 `timestamptz`(UTC).

### 5-2. API

1. 이미지 생성 요청은 **base64 본문 금지** — 참고 이미지는 `assetId` 목록(역할 `face|place|product|base_result` 포함)으로 보내고 서버가 소유자 확인 후 저장소에서 읽는다. 결과는 서버가 저장하고 `{assetId, signedUrl}`을 돌려준다(G5 해소).
2. 기존 `/api/generate-image`·`/api/history`는 새 경로 전환 전까지 유지(T15 회귀 대상). 새 경로는 PLAN §14의 `/api/aif/*`.
3. 오류 코드는 PLAN §14 목록 + `PAYLOAD_TOO_LARGE`, `REFERENCE_ROLE_INVALID` 두 개 추가.

### 5-3. 작업 상태

1. 상태값은 PLAN §15 그대로. 잠금은 `avs_generations`의 `locked_until` 패턴을 참고하되 `aif_job_steps.lease_until + fencing_token`으로 확장.
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
- **`insta-posting` 기준 담당(`ai-webtoon-studio/src/lib/instagram/posting.ts`)께**: `cleanupOldPosts()`가 전체 회원의 30일 지난 게시 기록·썸네일을 `retention_exempt`와 상관없이 지운다(G3). 예외 회원 제외(목록을 못 읽으면 정리 중단)를 기준에 넣고 사본(인플루언서·4컷)에 `--sync` 요청. 회원 피해가 아니라 관리자·시험 계정 보관 규칙 위반이라 「급하지 않은 변경 — 다음 배포 때 함께」 등급.
- **Movie 담당(`ai-video-studio`)께**: AI Influencer W02/W05에서 `lib/video/videoProviders.ts`·`videoModels.ts`·`videoParse.ts`를 사본으로 쓸 예정 — 공용 기준 등록 여부·시점 협의 필요. 영상 진행이 화면 조회에만 의존한다는 점(G4)은 영상 스튜디오에도 해당.

## 9. 주인님 결정·조치가 필요한 것

1. **P0 유료 비교 실행 승인**: 위 §6, 시험 계정 본인 키, 51건·예상 $8.7·상한 $12. 승인 전에는 실행하지 않는다.
2. **시험 계정 키 확인**: `buylifemall@naver.com`에 Gemini·fal 키가 등록돼 있는지(없으면 등록 필요).
3. **Master 작업표 등록**: 이 작업은 주인님 직접 지시로 시작했으며, 역할 `sns`·세션 `claude-win-20261118-sns`를 `.ai/TEAM.md`·작업표에 올리는 일은 Master께 요청.

## 10. 다음 작업

W01 착수 조건: 이 계약(§5)에 이의 없음 + §7 파일 범위 점유 등록. W01 첫 단계는 비용·DB 쓰기 없는 코드 수정(G1 문구, G3 예외 정리, G5 참고 입력 자산화의 서버 경로)과 순수 규칙 시험이다. migration은 초안 파일까지만 만들고 운영 적용은 별도 승인 뒤 메인 PC에서 한다.

## 11. 진행 상태 기록

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
