# AI 음악 스튜디오 (`ai-music-studio`) — AGENTS.md

- 주소: https://ai-music-studio.buylife.xyz · 메인 상세: https://www.buylife.xyz/programs/ai-music-studio
- 폴더: `ai-music-studio/` · Vercel 프로젝트 `ai-music-studio`(팀 buylife) · 운영 DB ① AIMaster(`esgxyikcnnvmlhygjkth`)
- 현재 버전: **v1.01** (2026-10-23 첫 배포, Claude Code 윈도우)
- 루트 `../CLAUDE.md`를 메인 지침으로 함께 읽는다(회원 본인 키, 권한 판정, 버전, 배포 비용, 한국어 진행 안내 등).

## 1. 사용 목적·대상
- **목적**: 여러 음악 생성 AI(Google Lyria·ElevenLabs·Suno·MiniMax·Stable Audio·ACE-Step)를 한 화면에서 골라 노래·배경음악을 만들고, 같은 설명으로 최대 3개 모델을 나란히 비교한다. **음악 모델 연동의 레퍼런스(기준) 프로그램**(이미지의 `ai-image-studio`와 같은 역할, 주인님 지시 「ai-image-studio처럼」).
- **대상**: 영상 배경음악이 필요한 크리에이터, AI로 노래를 만드는 회원, 음악 AI를 비교해 고르려는 회원.
- **관계**: 음악(SUNO)자동화(`music/`)는 **Suno 전용 독립 프로그램으로 그대로 유지**(2026-10-23 주인님 결정). 이 프로그램은 Suno를 포함한 여러 모델의 「빠른 생성·비교」 담당.

## 2. 기술 스택·도구
- Next.js 14 App Router · TypeScript · Tailwind · Supabase(공용 DB·Storage) · `@vercel/functions`(waitUntil) · lucide-react
- 뼈대: `ai-image-studio`(권한·로그인·Supabase 클라이언트·사이드바 구조) 복사, 강조색 바이올렛.
- 공용 기준 코드 사본(직접 고치지 않음 — 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`):
  - `lib/ai/suno.ts` ← 기준 `music/lib/ai/suno.ts` (모듈 `suno-api-client`, 2026-10-23 등록)
  - `lib/cleanupUsageLog.ts` ← 기준 `four-cut-comics/src/lib/cleanupUsageLog.ts` (모듈 `cleanup-usage-log`)
- 시험: `npm test` = `node --conditions=react-server --import tsx --test tests/*.test.mjs` (server-only 파일도 불러오도록 react-server 조건)

## 3. 핵심 기능·구조·장단점
| 화면 | 경로 | 내용 |
|---|---|---|
| 음악 만들기 | `/create` | 모델 1개 선택, 곡 설명·장르/분위기 칩·보컬/연주곡·언어·길이·가사, AI 가사 쓰기, 예상 비용 |
| 모델 비교 | `/compare` | 같은 입력으로 2~3개 모델 동시 생성, 결과 나란히 재생 |
| 내 보관함 | `/library` | 최근 60개, 상태 거르기, 재생·내려받기(영문 파일명)·가사·삭제(2단계 확인), D-30 |
| API키등록·플랫폼연동 | `/settings` | 공용 `user_api_keys`(gemini·elevenlabs·suno·fal·replicate·openai) 등록·변경·삭제 + 연동 매뉴얼 팝업 |
| 연동 & 사용 매뉴얼 | `/guide` | 머리 정보 막대·개요·4단계 카드·모델 표·팁·함정 방지·콘솔 직링크 |

**모델 목록** `lib/providers/catalog.ts`(화면·서버 공용) — 새 모델은 여기 한 줄 + 어댑터 입력 변환만:
| 공급자(키 이름) | 모델 | 방식 |
|---|---|---|
| gemini | `lyria-3.5`, `lyria-3-clip-preview` | `POST /v1beta/interactions` 즉시 응답(base64 음원 + 시간 표시 가사) → 서버가 응답 뒤(waitUntil, 최대 240초) 저장 |
| elevenlabs | `music_v2_5` | `POST /v1/music` 즉시 응답(음원 바이트), 길이 ms 지정 |
| fal | `fal-ai/minimax-music/v2.6`, `fal-ai/ace-step`, `fal-ai/stable-audio-25/text-to-audio` | 대기열(queue.fal.run) 제출 → **제출 응답의 status_url·response_url 그대로** 조회(하위 경로 모델은 주소를 직접 만들면 405) |
| replicate | `minimax/music-2.5`, `google/lyria-2`, `stability-ai/stable-audio-2.5` | 공식 모델 예측 제출 → `/v1/predictions/{id}` 조회, 결과 주소 받을 때 인증 머리글 |
| suno | `V6`, `V6_MINI` | `music/` 코드 그대로(`requestSunoGeneration`·`checkSunoGenerationStatus`) — **콜백은 음악(SUNO)자동화 주소로 가서 「모르는 작업」으로 무시됨, 이 프로그램은 상태 조회로 받음** |

**작업 흐름** `lib/generations.ts`: 행 1개 = 모델 1개 요청(`ams_generations`). 즉시형(Gemini·ElevenLabs)은 `runSynchronous`(잠금 6분), 대기열형은 `startAsync`로 작업 번호 저장 → 화면이 6초마다 `GET /api/generations?ids=`를 부르면 `advance`가 잠금(`locked_until`) 뒤 한 단계 진행 → 완료 시 음원을 비공개 버킷 `ai-music-studio/{user}/{gen}/{n}.{ext}`로 옮기고 `outputs`에 기록. 화면에는 1시간 서명 주소만 넘김. 유료 생성은 자동 재시도 없음(이중 과금 방지), 즉시형이 시간 초과면 「플랫폼 사용량 먼저 확인」 안내.
- 장점: 공식 API 4곳 + Suno, 키 하나로 여러 모델(fal·Replicate), 비교 생성, 예상 비용·상업 조건 표시, 웹훅 없이 상태 조회 방식이라 콜백 위조 문제 없음.
- 단점·한계: 비용은 공개 가격 기반 대략값, ElevenLabs 작곡 계획(composition_plan)·Lyria RealTime·Mureka·Suno 연장 등 고급 기능 없음, 화면을 닫으면 대기열형은 다음 보관함 방문 때 완료 처리됨(20분 넘으면 실패 처리), 다른 프로그램 연계 버튼 미구현(아래 5).

**DB** (`supabase/migrations/`): `0001` 프로그램 등록(요금제 3종·VIP 자동 부여·시험 계정 사용기간) · `0002` `ams_generations`(RLS 본인 조회·삭제, 쓰기는 서버만) + 비공개 버킷 `ai-music-studio`(50MB) + 키 이름 확인(이미 모두 있어 변경 없음). **30일 정리**: `/api/cron/cleanup` 매일 03:30 KST(`CRON_SECRET`), 파일 먼저 삭제 → 행 삭제, 공용 정리 기록 남김.

## 4. 버전·변경 이력
- **v1.01 (2026-10-23)** 첫 배포 — 화면 5개, 공급자 5곳·모델 11개, 비교 생성, AI 가사, 30일 정리. 검수: 단위 시험 13, tsc·lint·build, 운영 배포 Ready(`ai-music-studio-1trveqkpn`), 크롬 시험 계정 실제 생성 5곳 모두 성공·보관함 재생 6개 확인. 플랜: `docs/PLAN_20261023_AI_MUSIC_STUDIO.md`. 같은 날 카탈로그 썸네일(실사, 관리자 Gemini 상위 모델 1회 — `supabase/migrations/0003_thumbnail.sql`, DB 값만이라 버전 변경 없음).

- **v1.02 (2026-10-23)** ① AI 가사 분량을 곡 길이에 맞춤(`lib/lyricsLength.ts` — 30초 10줄·2분 22줄·그 이상 34줄 상한, 넘치면 구간 단위로 자름 + 지시문 강화. 실호출: 30초 요청 27줄 → 7줄) ② 다른 프로그램으로 보내기 — 곡 카드 「🎬 가사 영상 →」(`https://lyric-video-studio.buylife.xyz/source?ams=<생성 번호>&i=<곡 순서>`)·「🎞️ 플레이리스트 영상으로 보내기 →」, 보관함 「완성곡 N개로 플레이리스트 영상 만들기 →」(`https://playlist-channel-studio.buylife.xyz/video?ams=<번호>:<순서>,…` 최대 20곡). 받는 쪽: 가사영상 v1.10·플레이리스트 v1.27(공용 모듈 `ams-timed-lyrics`). 배포 `ai-music-studio-ojg8c0h8g` Ready, 크롬 시험 계정으로 두 보내기 모두 확인(Lyria 시간 가사 8줄 그대로 연결).

- **v1.03 (2026-10-23)** ① **화면을 닫아도 완성 처리**: fal(`?fal_webhook=`)·Replicate(`webhook`, completed)·Suno(공용 기준에 `callbackOrigin` 선택값 추가 — music은 미배포 대기)가 `/api/webhooks/[provider]`로 신호 → 신호로만 쓰고 회원 본인 키로 다시 조회한 결과로만 저장(`advance`, 잠금). 가짜 웹훅은 「모르는 작업」으로 무시 ② **ElevenLabs 작곡 계획**: 가사 구간 표시가 있으면 `composition_plan`(구간별 가사·길이, 줄 수 비례, 3~120초) — `lib/providers/elevenlabsPlan.ts`(시험 4) ③ **실측 기록** `options.actual`: Lyria 정액, ElevenLabs 길이×단가, fal 추론 시간, Replicate 실행 시간, Suno 크레딧 전후 차이(같은 키 동시 작업이면 합산될 수 있어 「약」) + 카드에 플랫폼 「사용량 확인 ↗」 ④ 모델 카드 글씨 키움(설명 14px·칩·문구 12px, 흐림 85%). 검수: 시험 23·tsc·lint·build, 배포 `ai-music-studio-o9immx7nw` Ready·DB v1.03, **시험 계정으로 4개 접수 후 탭을 닫고** DB만 조회 → 4개 모두 웹훅으로 완성(fal 7초·Replicate 27초·Suno 43초 2곡·ElevenLabs 작곡 계획 4초), Suno V6 Mini 2곡 = 크레딧 약 12. 플랜 `docs/PLAN_20261023_V103.md`. Mureka는 백로그(선불 충전 필요).

- **v1.04 (2026-10-23)** Suno V6 Wild 모델 카드 추가(`suno:V6_WILD`, 공용 Suno 코드에 이미 있던 모델 — 모델 12개). 배포 `ai-music-studio-8530x18lm` Ready·DB v1.04, 크롬 화면 카드·설명 14px 확인. 같은 날 시험 계정으로 실제 생성 1회 확인 — 탭을 닫은 상태에서 웹훅으로 29초 만에 2곡 완성, 크레딧 약 12(V6 Mini와 같음).

- **v1.05 (2026-10-23)** ① 곡 카드 「🎚️ 마스터링 스튜디오 →」(파일을 직접 넣는 방식이라 안내 문구 함께) ② Suno 곡 카드 「🔁 곡 연장·구간 다시 만들기는 음악(SUNO)자동화에서 →」(`/plannings`, 곡 자체는 넘어가지 않음) ③ 모델 카드 접기 — 추천 3개(Lyria 3.5·ElevenLabs·Suno V6)+고른 모델, 「모델 모두 보기 (12개)」 ④ 곡별 ☆/★ 별 표시·메모(`PATCH /api/generations/[id]`, 본인 행 `options.star`·`options.memo`만 합침) + 보관함 「★ 별 표시」 거르기·정렬(최신순/별 표시 먼저/모델별). 배포 `ai-music-studio-n9irw83j1` Ready·DB v1.05, 크롬 시험 계정 — 카드 3→12 펼침, V6 Wild 곡 별·메모 저장 후 새로고침해도 유지, 거르기·정렬 확인. 비용: 빌드 1회.

- **v1.06 (2026-10-23)** Lyria 3.5 ① 분위기 이미지(최대 4장 — 공식 10장이지만 Vercel 본문 4.5MB 때문에 제한, 화면에서 긴 변 1024px JPEG로 줄임, **저장하지 않고** `runSynchronous`에 요청 처리 중에만 전달, 기록엔 장수만 `options.images`) ② WAV 받기(`response_format: { type: "audio", mime_type: "audio/wav" }` — API 참조 AudioResponseFormat, 기록 `options.format`). 다른 모델은 무시. 시험 25(이미지·WAV 요청 모양). 배포 `ai-music-studio-167zyigv8` Ready·DB v1.06, 크롬 시험 계정 — 화면 칸 표시, 그린 노을 이미지 1장 + WAV로 실제 생성 → 19초, audio/wav 11.8MB(약 30초 곡) 저장. 비용: 빌드 1회, Lyria 1회 $0.08.

## 5. 남은 작업 → `docs/IMPROVEMENT_BACKLOG.md`
## 6. 연계·병합 아이디어 → `docs/IMPROVEMENTS.md` §3
## 7. UI/UX 개선안 → `docs/IMPROVEMENTS.md` §2, 디자인: `docs/DESIGN_HANDOFF.md`

## 2026-10-23 공용 기준 코드 `music-sync-calls` 신설 (Claude Code 윈도우, 미배포 대기)
- `lib/providers/musicCalls.ts`가 기준(사본 `shots/src/lib/ai/musicCalls.ts`) — Lyria·ElevenLabs 호출과 `musicProviderError`. `adapters/gemini.ts`·`adapters/elevenlabs.ts`는 입력·비용 문구만, `types.ts` `providerError` = `musicProviderError`. 이 파일을 고치면 `node scripts/check-shared-modules.mjs --sync` 후 쇼츠도 시험.

## 2026-10-23 v1.07 — 곡 카드에 쇼츠 원스톱·뮤직비디오 링크 (Claude Code 윈도우)
- `components/studio/GenerationCard.tsx` `SHORTS_ONESTOP_URL`(`/render`)·`MUSIC_VIDEO_URL`(`/music`) 링크 2개 — 받는 쪽 고르기 목록을 여는 방식(곡 자동 선택은 제안만). `music-sync-calls` 분리 함께 배포. 검수: 시험 25개·build, 배포 Ready·DB v1.07, 크롬 시험 회원 링크 확인. 비용: 빌드 1회.

## 2026-10-23 v1.08 — 곡마다 원스톱·뮤직비디오 링크에 곡 번호 `?ams=`(`components/studio/GenerationCard.tsx`). (Claude Code 윈도우)
- 검수: tsc·시험·build, 배포 Ready·DB 버전 맞춤, 크롬 시험 회원으로 AI 음악 스튜디오 링크 → 곡 들어감 확인. 비용: 빌드 1회.

## 2026-10-23 Mureka 연동 코드 준비 (Claude Code 윈도우, 숨김·미배포 대기)
- 주인님 지시 「작업만 해놔 나중에 필요하면 연동해서 사용할께」. `lib/providers/adapters/mureka.ts`(보컬 `/v1/song/generate`·연주곡 `/v1/instrumental/generate` → `/query/{id}` 상태 확인, succeeded/failed·cancelled·timeouted), `catalog.ts` `MUREKA_ENABLED=false`·`MUREKA_MODELS`(`auto`, 2곡)·`VISIBLE_PROVIDERS`(꺼진 공급자는 키 칸·안내에서 뺌), 키 허용 목록에 `mureka`, DB 허용 이름 SQL `supabase/migrations/0004_mureka_provider.sql`(**미적용**). 근거: 공식 MCP 서버 소스 github.com/SkyworkAI/Mureka-mcp.
- 시험: 가짜 응답으로 요청 주소·본문·상태 해석 3개(전체 28개 통과), tsc·build. 실제 호출 시험 없음(충전 필요).
- 켜는 법: ① platform.mureka.ai 선불 충전($30~)·키 발급 → 시험 계정 키 등록 ② 운영 DB에 `supabase/migrations/0004_mureka_provider.sql` 실행(주인님 승인) ③ `lib/providers/catalog.ts` `MUREKA_ENABLED = true` ④ 시험 생성 1곡으로 결과 칸(choices·duration)·모델 이름 확인 ⑤ 배포(버전 +0.01).

## 2026-10-23 v1.09 — Stable Audio 3 Medium(fal) (Claude Code 윈도우)
- `catalog.ts` 모델 `fal:fal-ai/stable-audio-3/medium/text-to-audio`(연주곡, 10~380초, 약 $0.04), `adapters/fal.ts` 입력 `{prompt, duration, output_format:"mp3"}`. 시험 29개·build, 배포 Ready·DB v1.09, 크롬 시험 회원 30초 생성 성공(추론 4초). 숨김 Mureka 코드 함께 배포. 비용: 빌드 1회 + 약 $0.04.

## 2026-10-23 v1.10 — Lyria RealTime(실험) 서버 녹음 (Claude Code 윈도우)
- `lib/providers/lyriaRealtime.ts`(웹소켓 setup→weightedPrompts→config→PLAY→PCM 모으기→STOP→WAV, 연결 단계 거절만 v1alpha로 한 번 더), `adapters/gemini.ts`에서 `lyria-realtime-exp` 분기, `catalog.ts` 모델(10~120초). 시험 `tests/lyriaRealtime.test.mjs`(가짜 웹소켓). 크롬 시험 회원 30초 WAV 생성 성공(약 33초). 요금은 실험 모델이라 미공개 — 사용량 페이지로 확인.

## 2026-10-23 v1.11 — 디자인 리뉴얼 「사운드 랩 바이올렛 스타일」 (Claude Code 윈도우, 음악 작업 담당)
- 곡 만들기 2열·고정 요약 패널·휴대폰 하단 만들기 막대, 화면 아래 미니 플레이어(이어 듣기), 곡 카드 파형·공급자 색 띠, 안내 키 발급 3단계·자주 묻는 질문. 동작(생성·저장·링크·키)은 그대로. 상세 `docs/DESIGN_HANDOFF.md` 맨 위. 시험 33개·build·모바일 점검 0곳, 배포 Ready·DB v1.11. 비용: 빌드 1회.

## 2026-10-23 미니 플레이어 반복·무작위 (Claude Code 윈도우 · 세션 claude-win-20261023-bgm, **미배포 대기** — 버전은 배포 때 v1.12)
- 주인님 지시: 제안 가~라를 대기 목록에 올려 순차 진행, 배포는 모아서. 플랜 `docs/PLAN_20261023_PLAYER_REPEAT_SHUFFLE.md`.
- `lib/playerOrder.ts`(순수 함수 `pickNext`·`pickPrev`·`nextRepeat`) + `tests/playerOrder.test.mjs` 7개(전체 40개). `components/player/PlayerProvider.tsx` 반복(끔→목록→한 곡)·무작위 상태, 들은 곡 기록(무작위 「이전 곡」용, 최근 50곡), 설정은 `localStorage` `ams-player-mode`(try/catch). 한 곡 반복은 곡이 끝났을 때만 — 「다음 곡」 버튼은 다음 곡으로. `MiniPlayer.tsx` 무작위·반복 버튼(켜지면 하늘색, 한 곡 반복은 「1」 아이콘).
- 검수: 시험 40개·tsc·build 통과. 화면·소리는 배포 뒤 확인(미확인).
