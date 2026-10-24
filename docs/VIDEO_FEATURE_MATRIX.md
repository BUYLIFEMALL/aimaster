# 영상 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션(video) 확인 전.** 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **영상 프로그램(AI 영상 생성·영상 합치기·영상 변환)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「영상」 줄의 `ai-video-studio`·`infinite-loop-video`·`video-to-gif`.
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 버전 파일) AI 영상 v1.20 · 무한 루프 v1.08 · 영상렌더 v1.25. 내 PC 렌더러 실행기 1.30 · 확장 v1.25(`video-to-gif/local-renderer/extension/manifest.json`, `public/downloads/local-renderer/version.json`).
> - 근거: 세 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/IMPROVEMENT_BACKLOG.md`, [무료 영상 렌더링 플랜](PLAN_20261023_FREE_VIDEO_RENDERING.md), [내 PC 고속 변환 로드맵](analysis-pc-renderer-20261024/ROADMAP.md), [역할 파일](roles/video.md), [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드. **운영 DB·Vercel은 이번에 조회하지 않았다**(배지·공개 여부·배포 상태는 문서 기록 기준).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 둔다.
> - 관계 문서: [영상 자동화 완성 기준](VIDEO_COMPLETION_POLICY.md) · [영상 통합 작업표](VIDEO_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 「AI로 장면 영상을 새로 만들기·여러 클립 합치기」는 `ai-video-studio`, 「영상 하나를 끝없이 반복」은 `infinite-loop-video`, 「영상 → GIF·변환」과 **내 PC 렌더러 본체**는 `video-to-gif`. 다른 카테고리 프로그램은 공용 사본(`ai-video-*`·`pc-renderer-client`)으로 연결만 한다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/VIDEO_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/VIDEO_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 |
|---|---|---|---|---|---|---|---|
| AI영상 | AI 영상 스튜디오 (`ai-video-studio` v1.20) | **영상 모델 연동 기준**(공용 `ai-video-*` 기준 위치) + 영상 합치기 | 설명(게시판·다듬기) → 모델·옵션·예상 비용 → 회원 키로 접수 → 상태 확인 → 비공개 저장 → 갤러리(다시 만들기·⚡ 내 PC로 GIF·작게) / 합치기: 클립+음악+내레이션+자막 → Remotion 브라우저 렌더 | 비공개 버킷 `ai-video-studio`·표 `avs_generations`·`avs_edits`·`avs_preset_prompts`·`avs_user_prompts`·30일 정리 / Gemini·fal·Replicate 영상, Gemini 다듬기, OpenAI·Gemini·ElevenLabs 음성 / 회원 본인 키 | 여러 업체 비교, 예상 비용·확인 단계, 재시도 없음·잠금, 창을 닫아도 서버가 결과 저장, 회원 PC 무료 합치기, 내 PC 렌더러 연결 | 공용 코드 해상도 720p 고정, 진행 상태가 회원 화면 확인(폴링)에서만 진행, 휴대폰은 합치기 미리보기만, Remotion 사용량 기록이 Remotion으로 전송됨 | 독립(기준) |
| 루프 | 무한루프 영상자동화 (`infinite-loop-video` v1.08) | 영상 하나를 끝없이 반복되는 영상으로 | 업로드 → 시작·끝이 닮은 구간 5개 추천 → 방식·구간·형식 → 브라우저 ffmpeg.wasm 또는 내 PC `loop` → 바로 내려받기 | 서버 저장 없음 / AI 없음 / 키 없음 | 무료·서버 비용 0, 소리 트랙을 ffmpeg 기록으로 직접 확인(v1.07), 내 PC 720p 약 4.2배 | 분석이 메인 스레드(긴 영상 굼뜸), 분석 최대 60초 구간, 크로스페이드 실시간 미리보기·밝기 보정 없음, ffmpeg 코어를 CDN에서 받음 | 독립 |
| 렌더 | AI 영상렌더 스튜디오 (`video-to-gif` v1.25) | 영상 → 8MiB 이하 GIF + **내 PC 렌더러 본체**(확장·실행기·설치) | 영상 최대 20개 → 구간 막대 → 가로폭·fps → 색상표 사다리(10단계)로 8MiB 이하 → ZIP·상세페이지로 보내기 / 내 PC면 사다리 단계 동시 실행 | 서버 저장 없음 / AI 없음 / 키 없음 | 무료, 내 PC 1080p 10초 157초 → 약 25~48초, 새 판 알림, 윈도우·맥 두 판 | 렌더러는 회원이 확장·실행기·ffmpeg를 직접 설치(압축 해제, 자동 업데이트 없음), 문서 표·화면에 버전 글자 고정, v1.25 배포 기록 확인 필요 | 독립(렌더러 기준) |

공통: 세 프로그램 모두 로그인 + 공통 권한 판정(`lib/access.ts` 또는 `src/lib/access.ts`의 `requireProgramAccess`)을 쓴다. 루프·렌더는 서버 쓰기 API가 없다(루프는 로그아웃 라우트만).

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · – 해당 없음 · 「미확인」은 코드를 확인하지 못한 칸. 근거 경로는 그 프로그램 폴더 기준.

### 2-1. AI 영상 생성

| 기능 | AI영상 | 루프 | 렌더 |
|---|---|---|---|
| 여러 업체 영상 모델(Gemini·fal·Replicate) | ○ `lib/video/videoModels.ts` `STUDIO_VIDEO_MODELS`(9개, Kling v2.1 v1.15 제거) | × | × |
| 사진 → 영상 / 글만 → 영상 | ○ v1.08 `lib/video/videoProviders.ts`(`fal.t2v`, Gemini) | × | × |
| 시작·끝 장면 사진 | ○ `lib/generations.ts` `startJob`(`start_image`·`end_image`) | × | × |
| 길이·비율·해상도·소리 선택 | ○ v1.02·v1.08 `lib/providers/catalog.ts` `clampSeconds`·`pickResolution` | × | × |
| 예상 비용 표시 | ○ `lib/providers/catalog.ts` `estCostUsd`, `components/studio/CreateStudio.tsx` | × | × |
| 접수 자동 재시도 없음(거절 때만 1회 다른 방식) | ○ `lib/video/videoProviders.ts` `submitVideoJob` | – | – |
| 시간 초과 시 「요금이 나갔을 수 있음」 안내 | ○ `lib/generations.ts` `errorText`, `videoProviders.ts` | – | – |
| 같은 작업 동시 처리 잠금 | ○ `lib/generations.ts` `claimLock` | – | – |
| 동시 생성 4개 제한 | ○ `app/api/generations/route.ts` `MAX_RUNNING` | – | – |
| 20분 시간 초과·접수 유예 | △ `lib/generations.ts` `advance` — **회원이 화면을 열어 상태를 확인할 때만** 판정(예약 작업 없음) | – | – |
| 4분 넘으면 업체 콘솔 안내 | ○ v1.10 `components/studio/GenerationCard.tsx`, `lib/promptPolish.ts` `SLOW_AFTER_SEC` | – | – |
| 업체 사람 사진 거절 쉬운 안내 | ○ v1.03 `lib/video/videoProviders.ts` | – | – |
| AI 설명 다듬기(3안·회원 Gemini 키, 30초, 재시도 없음) | ○ v1.10·v1.11 `app/api/prompt/polish/route.ts`, `lib/promptPolish.ts` | × | × |
| 사람 없는 설명에 인물 추가 금지 | ○ v1.12 `lib/promptPolish.ts` | – | – |
| 인물 기본 한국인·화면 글자 금지 | ○ `lib/promptPolish.ts` `SAFETY` | – | – |
| 영상 프롬프트 게시판(예시 24개·분류·검색) | ○ v1.14 `lib/promptBoard.ts` `filterPresets`, `components/studio/PromptBoard.tsx` | × | × |
| 게시판 관리자 편집(DB) | ○ v1.19 `app/api/prompts/presets/route.ts`(`checkAdminApi`), `lib/promptStore.ts` | × | × |
| 내 프롬프트 저장(본인만·30일·100개) | ○ v1.19 `app/api/prompts/mine/route.ts`, `lib/promptStore.ts` `MAX_MINE` | × | × |
| 이 설정으로 다시 만들기 | ○ v1.11 `lib/reuse.ts` `sanitizeReuse` | × | × |
| 모델 카드 예시 영상 | ○ v1.13 `lib/providers/catalog.ts` `MODEL_EXAMPLES`, `public/examples/` | × | × |
| 갤러리 상태·모델별 거르기 | ○ v1.11 `components/studio/LibraryView.tsx` | × | × |
| 사용 기록(usage_logs) | ○ `lib/access.ts` `logProgramUsage` | × | × |
| 립싱크·업스케일·배경 제거 | × (3차 대기) | × | × |

### 2-2. 영상 합치기·편집

| 기능 | AI영상 | 루프 | 렌더 |
|---|---|---|---|
| 클립 + 배경음악 + 자막 → MP4(회원 브라우저 렌더) | ○ v1.04 `components/edit/EditStudio.tsx`(`renderMediaOnWeb`), `components/edit/Composition.tsx` | × | × |
| 한글 자막(SVG + 글꼴 넣기) | ○ `components/edit/Composition.tsx` | × | × |
| 하드웨어 인코딩 영상 멈춤(R1) 감지·재인코딩 | ○ `components/edit/probe.tsx`(Mediabunny `Conversion`) | – | – |
| 넣는 영상 형식 맞추기(내 PC 우선) | ○ v1.17 `lib/edit/pcVideo.ts` normalize 명령 | – | – |
| AI 음악 스튜디오 곡 가져오기(본인 행 읽기만) | ○ `lib/edit/amsSongs.ts`, `app/api/edit/songs/route.ts` | × | × |
| 내레이션(회원 키 OpenAI·Gemini·ElevenLabs) | ○ v1.05 `lib/edit/tts.ts`, `app/api/edit/voice/route.ts`(파일 저장 없이 돌려줌) | × | × |
| 자동 자막 시각(낱말 시각) | ○ v1.05 `lib/edit/tts.ts` `wordStarts` | × | × |
| 배경음악 덕킹 | ○ v1.06 `lib/edit/timeline.ts` `duckGain` | × | × |
| 장면을 내레이션에 맞추기·겹쳐 바꾸기 | ○ v1.07 `lib/edit/timeline.ts` `fitToVoice`·`overlapIn` | × | × |
| 자르기 막대 끌기 | ○ v1.09 `components/edit/TrimBar.tsx`, `lib/edit/trim.ts` `trimFromRatio` | × | ○ v1.13 `components/TrimBar.tsx`, `lib/trimBar.ts`(GIF 구간) |
| 편집 저장·불러오기(본인 폴더 서명 업로드) | ○ v1.05 `lib/edit/edits.ts`, `app/api/edit/projects/**` | × | × |
| 완성본 갤러리 저장(50MB까지·30일) | ○ v1.05 `components/studio/EditsSection.tsx`, `lib/edit/edits.ts` | × | × |
| 내 PC로 용량 줄이기(균형·고화질·작게) | ○ v1.17 `lib/edit/pcVideo.ts` `compressCommand` | × | × |
| 갤러리 카드 「⚡ 내 PC로」 GIF(앞 6초)·작게(720) | ○ v1.18 `components/studio/PcQuickTools.tsx`, `lib/edit/pcVideo.ts` | × | × |
| 여러 영상 잇기(내 PC `concat`) | × (로드맵 4단계 대기) | × | × |

### 2-3. 영상 변환(루프·GIF)

| 기능 | AI영상 | 루프 | 렌더 |
|---|---|---|---|
| 시작·끝 닮은 구간 자동 찾기(후보 5개) | × | ○ `src/lib/loop/analysis.ts` `findLoops`·`refinePair` | × |
| 스마트·강제 오버랩·바운스 | × | ○ `src/lib/loop/plan.ts` `buildFilter` | × |
| MP4·WebM·GIF 출력 | × | ○ `src/lib/loop/plan.ts` `encodeArgs` | GIF만 ○ |
| 소리 트랙을 ffmpeg 기록으로 확인 | × | ○ v1.07 `src/lib/loop/plan.ts` `hasAudioStream` | – (GIF 소리 없음) |
| 8MiB 이하 색상표 사다리(가로·색 수·fps 10단계) | × | × | ○ v1.19 `lib/gifLadder.ts` `CANDIDATES`·`nextCandidateIndex` |
| 한 번에 만들기(메모리 맞으면) | × | × | ○ v1.15 `lib/gifLadder.ts` `canSinglePass` |
| 진행률(값 없음 무시) | × | 미확인 | ○ v1.17 `lib/gifLadder.ts` `progressRatio` |
| 여러 파일 대기 목록·첫 장면 썸네일 | × | × (1개) | ○ v1.12 `components/ConverterWorkspace.tsx` |
| 완료 GIF 전체 ZIP | × | × | ○ v1.11 `lib/zip.ts`(공용 `store-zip` 사본) |
| 쇼핑몰 가로폭 프리셋(560·780·860) | × | × | ○ `components/ConverterWorkspace.tsx` |
| 상세페이지 섹션으로 GIF 보내기 | × | × | ○ v1.14 `lib/gifHandoff.ts`(공용 `gif-handoff` 사본, 서버 거치지 않음) |
| 브라우저 ffmpeg.wasm 엔진(버전 고정 CDN) | × | ○ `src/lib/loop/browser.ts` `CORE_BASE_URL` | ○ `components/ConverterWorkspace.tsx`(`toBlobURL`) |
| 원본·결과 서버 저장 안 함 | – | ○ | ○ |

### 2-4. 내 PC 렌더러(「AIMaster 내 PC 고속 변환」)

| 기능 | AI영상 | 루프 | 렌더 |
|---|---|---|---|
| 렌더러 본체(확장·윈도우 PowerShell·맥 perl·설치) | – | – | ○ `local-renderer/extension/`, `local-renderer/host/host.ps1`·`host.pl`, `local-renderer/install/` |
| 실행기 명령 목록(`pong.capabilities`) | – | – | ○ 1.30 `gif, audio, loop, normalize, compress`(`host.ps1`) |
| 웹 연결 공용 코드(`pc-renderer-client`) | ○ 사본 `lib/pcRenderer.ts` | ○ 사본 `src/lib/pcRenderer.ts` `detectPcRenderer`·`runPcJob` | △ 자체 `lib/localRenderer.ts`(GIF 전용, 공용 이전 플랜 있음) |
| 없거나 옛 판이면 브라우저로 자동 대체·안내 | ○ v1.17·v1.18 | ○ v1.08 `src/components/tool/LoopTool.tsx` | ○ v1.20 `lib/localRenderer.ts` `detectLocalRenderer` |
| 새 판 알림(설치 판 ↔ `version.json`) | 미확인 | 미확인 | ○ v1.21 `lib/localRenderer.ts` `checkRendererUpdate` |
| 다운로드 센터·연결 상태 배지 | × | × | ○ v1.25 `components/LocalRendererHub.tsx`(최신 판 글자 고정 — §6 참고) |
| 실행기 시험 도구 | – | – | ○ `local-renderer/test/video-matrix.mjs`·`loop-matrix.mjs`·`host-harness.mjs`·`MAC_CHECK.md` |
| 실제 맥 확인 | – | ⏸ 화면 남음 | ✅ 터미널(실행기 1.30, 2026-10-24) · ⏸ 크롬 화면 3곳 남음 |

### 2-5. 공통·보안

| 기능 | AI영상 | 루프 | 렌더 |
|---|---|---|---|
| 로그인 + 공통 권한 판정 | ○ `lib/access.ts` | ○ `src/lib/access.ts` | ○ `lib/access.ts` |
| 모든 API 권한 검사 | ○ `app/api/**` 전부(`checkProgramAccessApi`·`checkAdminApi`·`CRON_SECRET`) | – (쓰기 API 없음) | – (API 없음) |
| 회원 본인 키만(폴백 없음) | ○ `lib/access.ts` `getUserApiKey` | – | – |
| 비공개 버킷·서명 주소(1시간) | ○ `supabase/migrations/0002_generations_storage.sql`(`public = false`), `lib/generations.ts` `signed` | – | – |
| 표 RLS 본인 조회·삭제 | ○ `0002`·`0004`·`0005` 마이그레이션 | – | – |
| 30일 자동 정리 | △ `app/api/cron/cleanup/route.ts`(생성·편집본·내 프롬프트) — **「진행 중」 행 제외**(§작업표 VD-U1) | – (저장 없음) | – (저장 없음) |
| 정리 건수 회원별 기록 | ○ `lib/cleanupUsageLog.ts`(공용 사본) | – | – |
| 휴대폰 폭 메뉴 | ○ `components/layout/Sidebar.tsx` | ○ `src/components/layout/Sidebar.tsx` | ○ `components/layout/Sidebar.tsx` |
| 사용 안내(/guide) | ○ `app/(dashboard)/guide/page.tsx` | ○ `src/app/(dashboard)/guide/page.tsx` | ○ `app/guide/page.tsx` |
| 순수 함수 시험 | ○ `tests/*.test.mjs` 7개 파일 | ○ `tests/` | 미확인(폴더 없음, 렌더러 시험은 `local-renderer/test/`) |

## 3. 다른 카테고리로 나간 공용 사본 (영상 기준 코드를 쓰는 곳)

| 공용 이름 | 기준 위치 | 사본을 쓰는 프로그램 | 비고 |
|---|---|---|---|
| `ai-video-models`·`ai-video-parse`·`ai-video-providers` | `ai-video-studio/lib/video/` | `ai-image-studio`·`shots`·`shorts-onestop-studio`·`music-video-studio` | 2026-10-23 ai-image-studio에서 기준 이전. Kling v2.1 제거는 사본 4곳 모두 배포됨([SHARED_MODULES.md](SHARED_MODULES.md) 2026-10-24) |
| `video-edit-timeline`·`video-edit-voice`·`video-edit-composition` | `ai-video-studio/lib/edit/`·`components/edit/` | `music-video-studio`(최종 합치기 v1.15) | Remotion 4.0.538 고정 |
| `pc-renderer-client` | `ai-mastering-studio/src/lib/pcRenderer.ts`(음악 담당 작성) | `ai-video-studio`·`infinite-loop-video` 등 | 영상 명령 만들기는 각 프로그램(`lib/edit/pcVideo.ts`) |
| `gif-handoff` | `shop-detail-page/lib/gifHandoff.ts` | `video-to-gif/lib/gifHandoff.ts` | 이커머스 담당 기준 |
| `store-zip` | `portrait-photo/src/lib/portrait/zip.ts` | `video-to-gif/lib/zip.ts` 등 | |
| `browser-ffmpeg` | (등록 안 됨) | — | [무료 렌더링 플랜](PLAN_20261023_FREE_VIDEO_RENDERING.md) §9 C 「등록만」 미진행 |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

| 기능 | 기준 파일 | 비고 |
|---|---|---|
| 영상 모델 목록·단가·길이 | `ai-video-studio/lib/video/videoModels.ts` | 공용 기준. 고친 뒤 `--sync`(다른 세션 사본 덮지 않는지 확인) |
| 업체 접수·상태 확인·결과 받기 | `ai-video-studio/lib/video/videoProviders.ts` `submitVideoJob`·`checkVideoJob` | 재시도 없음, 업체별 시간 제한 |
| 작업 진행·잠금·저장 | `ai-video-studio/lib/generations.ts` `startJob`·`advance`·`claimLock` | 화면 폴링에서만 진행 |
| 예상 비용·업체 콘솔 주소 | `ai-video-studio/lib/providers/catalog.ts` `estCostUsd`·`PROVIDERS` | |
| 30일 정리 + 회원별 기록 | `ai-video-studio/app/api/cron/cleanup/route.ts`, `lib/cleanupUsageLog.ts` | 파일 먼저, 행 나중 |
| 영상 설명 다듬기 | `ai-video-studio/lib/promptPolish.ts`, `app/api/prompt/polish/route.ts` | 프롬프트 내용은 공유하지 않음 |
| 브라우저 영상 합치기(Remotion) | `ai-video-studio/components/edit/EditStudio.tsx`·`Composition.tsx`, `lib/edit/timeline.ts` | 시간 계산은 Remotion 밖 |
| R1 대책(하드웨어 인코딩 영상) | `ai-video-studio/components/edit/probe.tsx` | 앞부분 시험 렌더 → Mediabunny 재인코딩 |
| 내레이션·낱말 시각 | `ai-video-studio/lib/edit/tts.ts`, `lib/edit/voice.ts` | 원스톱 `tts.ts` 재사용 |
| 편집본 저장(본인 폴더 서명 업로드) | `ai-video-studio/lib/edit/edits.ts` | 내 PC 파일은 올리지 않음 |
| 내 PC 영상 명령 만들기 | `ai-video-studio/lib/edit/pcVideo.ts` | 값 범위는 실행기와 같게 |
| 루프 구간 찾기 | `infinite-loop-video/src/lib/loop/analysis.ts` | 순수 함수 |
| ffmpeg 필터·소리 판단 | `infinite-loop-video/src/lib/loop/plan.ts` `buildFilter`·`hasAudioStream` | |
| 브라우저 ffmpeg.wasm 불러오기 | `infinite-loop-video/src/lib/loop/browser.ts` | 코어 버전 고정 CDN |
| GIF 8MiB 사다리 | `video-to-gif/lib/gifLadder.ts` | 앞 8단계 결과 바꾸지 않음(v1.19 비교 시험) |
| 구간 막대 계산 | `video-to-gif/lib/trimBar.ts` | 0.1초 단위 |
| 렌더러 연결·판 비교(GIF) | `video-to-gif/lib/localRenderer.ts` | 공용 `pc-renderer-client`와 별도 |
| 실행기 명령(윈도우·맥) | `video-to-gif/local-renderer/host/host.ps1`·`host.pl` | 명령 하나 = 커밋 하나, `HOST_VERSION` +0.10 |
| 렌더러 묶음 만들기 | `scripts/build-local-renderer.mjs` | ZIP·`version.json` |

## 5. 병합·독립 방향 (결정된 것)

| 묶음 | 내용 | 상태 |
|---|---|---|
| 영상 연동 기준 이전 | `ai-image-studio/lib/video/` → `ai-video-studio/lib/video/`(주인님 승인) | ✅ 2026-10-23 |
| 카테고리 이동 | `ai-video-studio` 유튜브 → 영상, `music-player`·`reverse-prompt`는 영상에서 다른 카테고리로 | 카테고리 지도 기준(2026-10-24) |
| 렌더러 역할 나눔 | 렌더러 본체·영상 명령·영상 프로그램 = 영상 담당 / 소리 명령·음악 프로그램 = 음악 담당 / video-to-gif 화면 = 이커머스 담당(플랜 기준) | 로드맵 3-1 |
| 인코딩 엔진 | WebCodecs + Mediabunny(+ ffmpeg.wasm 특수 작업), Remotion은 그리기·미리보기만 | 플랜 §8 확정 |
| 독립 | 세 프로그램 모두 독립 유지(역할이 겹치지 않음), 연결은 사본·넘기기로만 | — |

## 6. 확장 후보·로드맵 (추천 — 구현 전)

담당 세션의 플랜·로드맵에 이미 있는 것만 옮겼다(새 결정 아님).

| 단계 | 기능 | 넣을 곳 | 출처·근거 | 비용 | 상태 |
|---|---|---|---|---|---|
| 1차 | 맥 크롬 화면 3곳 확인(루프 `/studio`·AI영상 `/edit`·`/library`) | 렌더러 | `local-renderer/test/MAC_CHECK.md` | 없음 | 대기(맥미니 확장 연결) |
| 1차 | 갤러리 「작게 줄이기」 화질(작게 유지 / 균형) | AI영상 | 역할 파일 | 빌드(묶음) | 주인님 결정 대기 |
| 1차 | 갤러리 목록 불러오기 약 5.7초 줄이기 | AI영상 | `AGENTS.md` v1.18 | 빌드 1 | 착수 승인 대기 |
| 2차 | 영상 D: Shots·원스톱 완성본 `compress` | 다른 카테고리(사본) | 로드맵 3-0 | 빌드 2 | 승인 대기 |
| 2차 | `concat`·`trim`(잇기·자르기) | 렌더러 + AI영상 | 로드맵 4단계 | 빌드 | 대기 |
| 2차 | `scale`·`probe` 명령 | 렌더러 | 2.0 플랜 §1 | 빌드 | 대기 |
| 2차 | `video-to-gif` 웹 연결을 공용 `pc-renderer-client`로 | 렌더 | 2.0 플랜 §0 | 빌드 | 대기 |
| 2차 | 공용 `browser-ffmpeg` 등록만(코드 변경 없음) | 루프(기준)·렌더 | 무료 플랜 §9 C | 없음 | 미진행 |
| 3차 | 립싱크·업스케일·배경 제거·Runway/Vidu | AI영상 | `IMPROVEMENT_BACKLOG.md` 3차 | 회원 키 | 대기 |
| 3차 | `frames`(브라우저 장면 → PC 압축, 길이 제한 해제) | 렌더러 | 로드맵 6단계 | — | 검토 |
| 보류 | `mp4-muxer` → Mediabunny 전환, 플레이리스트·LP 인코더 교체 | 다른 카테고리 | 무료 플랜 §9 보류 | — | 오류·수정 때 함께 |
| 후보 | 루프 결과를 쇼츠·뮤직비디오 배경으로 넘기기 | 루프 → 다른 프로그램 | 루프 `IMPROVEMENTS.md` #5 | 없음 | 제안 |

### 미배포 대기 (영상)

| 프로그램 | 내용 | 나갈 때 |
|---|---|---|
| (없음 확인) | [PENDING_DEPLOYS.md](PENDING_DEPLOYS.md)의 세 프로그램 줄은 모두 「대기 줄 없음」. 단 `video-to-gif` v1.25는 그 표에 배포 줄이 없어 **배포 여부 확인 필요**(`AGENTS.md` 「배포 준비」, `DESIGN.md` 「✅ 1차 작업완료」) | — |

### 문서·화면 정리 후보(작은 것)

- `video-to-gif/components/LocalRendererHub.tsx`가 「공식 최신 v1.25 (Host 1.30)」를 글자로 고정 — 다음 렌더러 판에서 화면과 `version.json`이 어긋날 수 있다(`version.json`을 읽어 보이는 방식 검토).

## 7. 변경 이력

| 날짜 | 바뀐 것 | 작성 |
|---|---|---|
| 2026-10-24 | 문서 처음 작성(초안) — AI영상 v1.20·루프 v1.08·렌더 v1.25·실행기 1.30 코드 기준, 플랜·로드맵·역할 파일 반영 | Claude Code(윈도우) `claude-win-dotori` [역할: analysis-planning] |
