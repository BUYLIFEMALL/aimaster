# 영상 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션(video) 확인 전.** 담당 세션(`claude-win-video`, [역할 파일](roles/video.md))이 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「영상」 카테고리 — `ai-video-studio`(AI 영상 스튜디오), `infinite-loop-video`(무한루프 영상자동화), `video-to-gif`(AI 영상렌더 스튜디오, 옛 상세페이지 GIF 자동화). 앞으로 만드는 영상 생성·영상 합치기·영상 변환 프로그램과, 다른 카테고리 프로그램이 영상 모델·내 PC 렌더러를 연결하는 부분(`shots`·`shorts-onestop-studio`·`music-video-studio`·`ai-image-studio`의 공용 사본)에도 적용한다.
- 관계 문서: [영상 기능 상세 비교표](VIDEO_FEATURE_MATRIX.md) · [영상 통합 작업표](VIDEO_CONSOLIDATION_TASKS.md) · [무료 영상 렌더링 플랜](PLAN_20261023_FREE_VIDEO_RENDERING.md) · [내 PC 고속 변환 로드맵](analysis-pc-renderer-20261024/ROADMAP.md) · [내 PC 렌더러 2.0 플랜](../ai-video-studio/docs/PLAN_20261024_LOCAL_RENDERER_V2.md) · [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) · [공용 모듈 점검표](SHARED_MODULE_CHECKPOINTS.md) · [확장 배포 규칙](EXTENSION_RELEASE_RULES.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md).
- `video-to-gif`의 「상세페이지로 GIF 보내기」 연결은 [이커머스 자동화 완성 기준](ECOMMERCE_COMPLETION_POLICY.md)도 함께 따른다.

## 1. 완성 흐름 (목표)

영상 자동화의 완성 목표는 아래 세 흐름이 **회원 본인 키·본인 PC·본인 데이터로 끊기지 않고** 이어지는 것이다.

1. **AI 영상 만들기**: 설명(직접 쓰기·게시판 예시·AI 다듬기) → 모델·길이·비율·해상도·소리 고르기 → 예상 비용 확인 → 회원 본인 키로 업체 작업 접수 → 상태 확인 → 완성 MP4를 회원 비공개 폴더에 저장 → 갤러리에서 재생·내려받기·다시 만들기 → 30일 뒤 자동 삭제.
2. **영상 합치기(회원 PC 렌더)**: 갤러리 클립·내 PC 영상 + 배경음악(내 파일·AI 음악 스튜디오 곡) + 내레이션(회원 키) + 자막 → 미리보기 → 회원 브라우저에서 MP4 렌더(서버 비용 0) → (선택) 내 PC 렌더러로 용량 줄이기 → 바로 내려받기 또는 갤러리 저장(30일).
3. **영상 변환(무료)**: 회원 영상 → 무한 루프(MP4·WebM·GIF) 또는 8MiB 이하 GIF → 브라우저(ffmpeg.wasm) 또는 「⚡ 내 PC 고속 변환」(회원 PC ffmpeg)으로 처리 → 바로 내려받기(서버에 저장하지 않음) → (선택) 상세페이지 섹션으로 GIF 보내기.

- 유튜브·인스타 **업로드·게시 단계는 이 카테고리 범위 밖**이다(유튜브 카테고리·각 SNS 프로그램 담당). 업로드가 없다고 「미완성」으로 보지 않지만, 완성 보고에 「업로드: 범위 밖」이라고 밝힌다.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 키로 동작**: 영상 생성(Gemini·fal·Replicate), 설명 다듬기(Gemini), 내레이션·받아쓰기(OpenAI·Gemini·ElevenLabs)는 모두 회원 `user_api_keys`의 본인 값만 쓴다(기준: `ai-video-studio/lib/access.ts` `getUserApiKey` — 없으면 `null`, 폴백 없음). 키가 없으면 실행하지 않고 등록 안내를 띄운다.
2. **유료 생성 이중 과금 방지**: 업체 작업 접수는 **자동 재시도하지 않는다**. 시간 초과·응답 없음은 「업체 쪽에서는 이미 만들어져 요금이 나갔을 수 있으니 사용량을 먼저 확인」 안내로 끝낸다(기준: `ai-video-studio/lib/video/videoProviders.ts` `submitVideoJob`, `lib/generations.ts` `errorText`). 같은 행을 두 요청이 동시에 처리하지 않게 잠근다(`lib/generations.ts` `claimLock`). 다시 보내는 경우는 업체가 요청을 **거절**(요금 없음)했을 때 한 번만 허용한다(Gemini 백그라운드 거절 → 한 번에 기다리기). 새 업체를 붙일 때 [공용 모듈 점검표](SHARED_MODULE_CHECKPOINTS.md) ⑤(`timeoutMs × (retries+1)` 300초 안, `retries: 0` 검토)를 다시 계산한다.
3. **회원 데이터 격리·비공개**: 생성 영상·시작/끝 장면 사진·편집본 음성·완성본은 회원 본인 폴더(`{user_id}/…`)의 **비공개 버킷**(`ai-video-studio`, `public = false`)에 두고 1시간 서명 주소로만 보여 준다. 표는 RLS 본인 조회·삭제만, 서버 쓰기도 `user_id` 조건을 건다. 회원끼리 프롬프트·영상을 공유하지 않는다(관리자 게시판 예시만 공용).
4. **30일 자동 정리와 기록**: 생성일 기준 30일 뒤 파일 → 행 순서로 지우고(예약 작업 `/api/cron/cleanup`), 회원별 정리 건수를 남긴다(`cleanup-usage-log` 공용 사본). **「진행 중」으로 멈춘 행도 결국 정리되는지**까지 확인해야 완료다(§작업표 우선 처리 VD-U1).
5. **서버에 올리지 않는 처리는 끝까지 올리지 않는다**: 영상 합치기의 내 PC 영상, 무한 루프·GIF 변환의 원본과 결과는 서버·DB에 저장하지 않는다(기준: `infinite-loop-video/src/lib/loop/browser.ts`, `video-to-gif/components/ConverterWorkspace.tsx`). 저장하는 기능을 새로 넣으면 그 순간 3·4번 조건이 붙는다.
6. **내 PC 렌더러는 없어도 동작**: 확장·실행기·ffmpeg가 없거나 옛 판이면 브라우저 방식으로 자동 대체하고 설치·업데이트 안내만 보인다. 실행기는 명령 문자열을 받지 않고 「명령 종류 + 검사한 숫자·정해진 낱말」만 받는다(기준: `video-to-gif/local-renderer/host/host.ps1`·`host.pl`).
7. **확장 배포 규칙**: 렌더러 확장·실행기를 바꾸면 같은 작업에서 `manifest.json` 버전·내려받기 ZIP·`version.json`·DB `extension_version`을 맞추고 `node scripts/check-extension-release.mjs video-to-gif` OK를 확인한다(핵심 원칙 10). 윈도우와 맥 두 판을 함께 고치고, 맥 실물 확인은 맥미니 세션에 요청해 「맥 확인 남음」으로 기록한다.
8. **검수 증거**: 로컬 검사(tsc·시험·build) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 메인 크롬 실제 화면 확인을 각각 기록한다. 유료 생성 시험은 승인된 횟수만, 가장 짧은 길이·낮은 해상도·소리 끔으로 하고, 이미 만든 클립을 재사용한다.
9. **문서 갱신**: 같은 작업에서 [영상 기능 상세 비교표](VIDEO_FEATURE_MATRIX.md) 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 값으로 생성·과금하지 않는다.

| 항목 | 선택지 | 프로그램 | 근거 |
|---|---|---|---|
| 영상 모델 | Gemini Omni Flash · fal(Seedance 1.5 Pro·Kling O3·Kling 3.0·Seedance 2.0·Veo 3.1·MiniMax H3·Wan 3.0) · Replicate Seedance 1 Lite | AI 영상 | `ai-video-studio/lib/video/videoModels.ts` `STUDIO_VIDEO_MODELS` |
| 길이·비율·해상도·소리 | 모델별 허용 값만(소리는 기본 끔, 켜면 단가 반영) | AI 영상 | `lib/providers/catalog.ts` `clampSeconds`·`pickResolution`·`estCostUsd` |
| 시작·끝 장면 사진 | 넣기 / 글만으로(지원 모델만) | AI 영상 | `lib/video/videoProviders.ts`(`fal.t2v`, `frame` 오류) |
| 설명 다듬기 | 쓰지 않음 / AI 다듬기 3안 중 고르기·직접 고치기·끄기 | AI 영상 | `app/api/prompt/polish/route.ts`, `lib/promptPolish.ts` |
| 다시 만들기 | 갤러리 기록의 설정 불러오기(사진은 다시 넣기) | AI 영상 | `lib/reuse.ts` `sanitizeReuse` |
| 합치기 화면 비율·화질 | 9:16 · 16:9 · 1:1 / 720p · 1080p | AI 영상 합치기 | `components/edit/EditStudio.tsx` |
| 전환·덕킹·자막 크기 | 바로·겹쳐 바꾸기 / 내레이션 때 음악 줄이기 켬·끔 / 자막 3단계 | AI 영상 합치기 | `lib/edit/timeline.ts`(`overlapIn`·`duckGain`) |
| 내레이션 목소리 | OpenAI · Gemini · ElevenLabs(회원 키) | AI 영상 합치기 | `lib/edit/tts.ts`, `lib/edit/voice.ts` |
| 용량 줄이기 화질 | 균형 · 고화질 유지 · 작게 | AI 영상(내 PC) | `lib/edit/pcVideo.ts` `compressCommand` |
| 루프 방식·형식·반복 | 스마트 · 강제 오버랩 · 바운스 / MP4 · WebM · GIF / 1~200회 / 크로스페이드 | 무한 루프 | `infinite-loop-video/src/lib/loop/plan.ts` `normalize` |
| 처리 위치 | 내 PC로 빠르게(있으면 기본 켬) / 브라우저 | 무한 루프·GIF | `src/lib/pcRenderer.ts`, `video-to-gif/lib/localRenderer.ts` |
| GIF 가로폭·초당 장면 수·구간 | 560 · 780 · 860px / 40 · 50fps / 0.1초 단위 구간 | GIF | `video-to-gif/components/ConverterWorkspace.tsx`, `lib/trimBar.ts` |

## 4. 하지 않을 것

- **운영자·다른 회원의 키나 계정으로 대신 생성하지 않는다.** 운영 환경변수에 영상·음성 업체 키를 두지 않는다.
- **유료 영상 생성을 자동 재시도하지 않는다.** 시간 초과 뒤 「다시 시도」는 회원이 사용량을 확인한 뒤 직접 누른다.
- **운영자 렌더 서버(서버 FFmpeg·Vercel 함수 렌더·무료 클라우드 서버)를 쓰지 않는다** — 운영자 인프라 비용·한도가 생긴다([무료 영상 렌더링 플랜](PLAN_20261023_FREE_VIDEO_RENDERING.md) §2). 긴·예약 렌더가 꼭 필요하면 회원 본인 클라우드 계정 방식만 검토한다.
- **인코딩 엔진을 Remotion에 묶지 않는다.** Remotion은 그리기·미리보기 층에만 쓰고, 시간 계산·R1 처리는 Remotion 밖에 둔다. 회원이 Remotion 코드를 올리거나 바꾸는 기능은 만들지 않는다(무료 약관 금지). 인원이 늘거나 5.0으로 올릴 때 라이선스를 다시 확인한다.
- **실행기에 명령 문자열·임의 ffmpeg 인자를 보내지 않는다.** 새 명령은 종류 하나 + 검사한 값으로만 추가한다.
- **회원끼리 생성 영상·내 프롬프트를 공유·복사하지 않는다.**
- **영상 생성 프롬프트를 다른 프로그램과 공유·복사하지 않는다.** 공용으로 쓰는 것은 모델·주소·호출·대기 시간·결과 받기(`ai-video-*`)까지다([IMAGE_PROMPT_RULES.md](IMAGE_PROMPT_RULES.md)와 같은 원칙). 공용 사본(`lib/video/*` 사본, `pc-renderer-client`, `gif-handoff`, `store-zip`, `video-edit-*`)은 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`(다른 세션 사본을 덮지 않는지 먼저 확인).
- 영상 안에 지어낸 글자·로고·자막을 AI로 넣지 않는다(`SAFETY` 문구 — 자막은 합치기 단계에서 회원이 넣는다).

## 5. 회원 본인 키 규칙 (영상 적용)

- AI 영상 스튜디오 키: `gemini`·`fal`·`replicate`(영상), `openai`·`elevenlabs`(내레이션) — 공용 `user_api_keys`를 쓰며 다른 프로그램에서 등록한 키를 그대로 재사용한다(설정 화면 `components/settings/KeySettings.tsx`, 이름표 `lib/providers/catalog.ts` `PROVIDERS`).
- 키는 서버에서만 쓰고 브라우저로 보내지 않는다. Gemini는 머리글(`x-goog-api-key`)로 보낸다.
- 무한 루프·GIF는 AI 키가 필요 없다(브라우저·회원 PC 처리). 새 기능이 유료 업체를 부르게 되면 그때 이 규칙을 적용하고 [프리미엄 판단](GRADE_AND_BILLING_POLICY.md)을 다시 한다.
- 새 외부 플랫폼 키가 필요하면 프로그램 전용 저장소를 만들지 않고 공용 `user_api_keys`·[회원 연동 정보](MEMBER_INTEGRATIONS.md) 구조에 항목을 추가한다.

## 6. 한국인 인물 묘사 원칙

- 영상 설명에 사람이 나오면 **기본은 한국인으로 묘사**한다. 현재 구현: 생성 요청에 붙는 `SAFETY`(「If people appear, depict them as Korean…」)와 다듬기 시스템 문구(`ai-video-studio/lib/promptPolish.ts`).
- **설명에 사람이 없으면 사람을 새로 넣지 않는다**(v1.12에서 고침 — 다듬기가 사람 없는 설명에 인물을 넣던 문제).
- 게시판 예시의 「사람·일상」 분류는 한국인 장면으로 쓴다(`lib/promptBoard.ts`). 해외 배경이 회원 설명상 꼭 필요할 때만 다르게 묘사한다.

## 7. 완성 보고 양식(영상)

완성 보고에는 아래를 따로 적는다: 바뀐 흐름(생성·합치기·변환) / 회원 본인 키 확인 / 재시도·잠금(유료 호출이 있는 경우) / 비공개 저장·30일 정리 영향 / 내 PC 렌더러 있음·없음 두 경우 확인 여부 / 윈도우·맥 실행기 확인 여부(맥은 맥미니 요청) / 확장 버전 점검(`check-extension-release`) / 공용 사본 영향 프로그램 표 / 업로드: 범위 밖 / 비용 리포트(빌드·AI 호출·누구 키).
