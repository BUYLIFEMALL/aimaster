# 인수인계 — 받아쓰기 엔진 선택·v1.22 배포·모델 교체 7개 배포 준비 (2026-11-06, 역할 workspace)

- 세션: Claude Code(윈도우) `claude-win-20261025-workspace` (같은 이름의 형제 세션이 같은 날 U10 콘텐츠 캘린더·U10 1차 배포를 따로 진행 중 — 아래 「겹침 주의」)
- 주인님 지시 순서: ① 요청함 `c234b28c`(OpenAI 키만 있는 시험 계정) 「진행해」 ② 미배포 표 「모델 교체 B·C·ghost-scraper FREE 삭제」 「진행해」 ③ 「배포상태 확인후 진행해」 ④ 「남은 작업 리스트 확인해」(2회) ⑤ 「지금까지 작업한 내용 인수인계문서로 남겨놔 커밋하고」

## 1. 끝난 것

| 항목 | 내용 | 커밋 |
|---|---|---|
| 받아쓰기 엔진 회원 선택 | 회의록 설정 메뉴(슬라이더)에 「음성 파일 받아쓰기 엔진」(Gemini·OpenAI 키 둘 다일 때만) 자동(Gemini 우선)/OpenAI. 회원 설정 `user_settings.settings.meeting_stt_engine`(`savePref` + `transactions.flush()`). 서버 `memberSttMode(preferred)`·`memberSttModes()`·`userMeetingPrefs().sttEngine`, `audio.ts` `sttProvider/sttMaxBytes/transcribeUploaded`가 선택을 따름(Google 직접 업로드 파일은 Gemini 고정), `meetingStatus`에 `sttModes`·`sttEngine`. 매뉴얼 한 줄. 플랜 `PLAN_20261106_STT_ENGINE_CHOICE.md` | `b8e4cece6` |
| 검수 | `memberStt.test.ts` 7개(새 2건)·연결부 49개 통과, 타입 검사·로컬 빌드 통과. 로컬 Docker `aww-pg-test`가 꺼져 있으면 시험 2파일·빌드가 55432 연결 실패로 멈춤 → `docker start aww-pg-test` 뒤 통과(코드 문제 아님) | — |
| v1.22 버전 | `src/lib/version.ts` + `AimasterSidebar.tsx` 두 곳 v1.22 | (버전 커밋) |
| v1.22 배포 | **Ready 2026-11-06 17:47**(`ai-work-workspace-3saw5d3qw`, 운영 주소 연결). 이 세션의 배포 명령은 자동 모드 분류기에 「운영 배포」로 막혀, 실제 빌드는 형제 세션(또는 주인님 `!`)이 돌림. DB `programs.version`은 다른 세션(`claude-win-u10deploy`)이 먼저 v1.22로 올려 두어 일치 | — |
| 모델 교체 7개 배포 준비 | `web-crawler` v1.11 · `ghost-scraper` v1.15 · `ai-webtoon-studio` v1.32 · `ebook-studio` v1.13 · `ai-prompt-studio` v1.11 · `vinyl-lp-studio` v1.14 · `personality-suite` v1.29 버전 올려 한 커밋. 타입 검사 7개 오류 0, 작업 중 표 비어 있음, 팀 빌드 중 0건. **배포는 아직 안 나감** | (버전 묶음 커밋) |
| 요청함 | `c234b28c` done(채팅 「진행해」), `a9bb8ecb`(v1.22 빌드 승인) done(채팅 승인), 결과 `622a6e41` 기록 | — |

## 2. 남은 것 (이 순서로)

1. **워크스페이스 배포 기록 정리** — `docs/PENDING_DEPLOYS.md` 42~44행(`376c55c7a`·`a80274b4c`·`cc4f4eabe`) → 「내보낸 기록」 한 줄(v1.22 · 2026-11-06, `ai-work-workspace-3saw5d3qw` Ready, DB 맞음), 이 폴더 `docs/IMPROVEMENTS.md` 「미배포 대기」 4줄 → 배포됨 표시, `AGENTS.md` 버전 표 「(미배포, v1.22 예정)」 → `v1.22`. **겹침 주의**: 형제 세션이 작업 중 표에 「연속 배포 중(3개)」로 적고 같은 배포를 진행했으므로, 고치기 전 `git status --porcelain -- ai-work-workspace docs/PENDING_DEPLOYS.md`로 그쪽 미커밋 변경이 없는지 확인하고, 있으면 그쪽이 끝낸 뒤에만 한다.
2. **OpenAI 실제 받아쓰기 확인(운영 v1.22, ego, 시험 계정 `buylifemall@naver.com`)** — 시험 WAV(약 25초 한국어, 윈도우 음성 합성)는 `C:\Users\Administrator\AppData\Local\Temp\claude\6bc1527773765a3b\59166b31-9bd6-42ee-b06c-1ee3ee85b8e3\scratchpad\stt-openai-test.wav`(세션이 바뀌면 같은 방법으로 다시 만듦: PowerShell `System.Speech` `SetOutputToWaveFile`). 절차: 새 페이지 → AI 회의록 블록 → 오른쪽 위 설정 메뉴 → 「음성 파일 받아쓰기 엔진」 → OpenAI → ⬆️ 음성 파일 올리기 → 결과가 **시각 없이 몇 문장씩 묶여** 나오면 통과(Gemini면 화자·시각 표시) → 엔진을 「자동」으로 되돌림 → 시험 페이지 휴지통. 비용: OpenAI `gpt-transcribe` 1회(시험 계정 키, $0.01 미만). 결과는 `docs/IMPROVEMENTS.md` 「받아쓰기 엔진 선택」에 기록. ego 작업 공간 111(`workspace-openai-stt-check`)은 닫았음 — 새로 하나 열어 끝까지 쓰고 닫는다.
3. **모델 교체 7개 배포** — 주인님 승인 범위(빌드 7회). 이 세션에서는 `node scripts/deploy.mjs <폴더> --go`가 분류기에 막히므로 주인님이 `!` 접두어로 한 줄씩(앞 배포 Ready 뒤 다음) 돌리시거나 배포 권한 규칙을 추가. 순서: web-crawler(Vercel 프로젝트 `web-crawler-saas`) → ghost-scraper(`website-scraper`) → ai-webtoon-studio → ebook-studio → ai-prompt-studio → vinyl-lp-studio → personality-suite. 각 배포 뒤 `--version-only --set-version`(DB 버전), `docs/PENDING_DEPLOYS.md` 묶음 B·C 줄에 ✅ 표시 + `ghost-scraper` FREE 줄·`personality-suite` 공용 사본 줄 정리, 각 프로그램 `docs/IMPROVEMENTS.md`·`AGENTS.md` 버전 이력, 프로그램 비교표 버전 칸. DB slug 주의: web-crawler는 `programs`에 `web-crawler` slug가 없었음(조회 결과 미포함) — `deploy.mjs`가 폴더로 slug를 찾으니 그 결과를 따른다.
4. **인스타·쓰레드 U10 1차 배포(`insta_auto_poster` v1.72·`threads-content-ops` v2.23)** — 다른 세션(`claude-win-u10deploy`)이 「주인님 승인」을 전달했으나 이 대화에서 직접 받은 승인이 아니라 보류. 형제 세션이 「연속 배포 중(3개)」로 진행 중일 수 있으니 **배포 전에 작업 중 표와 Vercel 최근 배포를 먼저 확인**해 이중 배포를 막는다. 요청함 `b6fb9b4b`·`7427701f`는 배포·확인이 끝난 세션이 done.
5. 모델 교체 B의 나머지 7개(`instagram-comment-reply`·`threads-comment-reply`·`ai-mastering-studio`·`playlist-channel-studio`·`blog-content-maker`·`blog-workroom`·`emotion-writer`)는 주인님 지정 밖 — 맡을지 여쭌 상태.

## 3. 알게 된 것·주의

- 이 세션(Orca 프로필, 자동 모드)은 `scripts/deploy.mjs` 호출을 읽기 전용(`--version-only`)까지 「Production Deploy」로 막는다. 읽기만 필요하면 `node scripts/pending-check.mjs <폴더>`, `vercel ls <프로젝트> --scope buylife`, `vercel inspect <주소> --scope buylife`를 쓴다(허용됨). 운영 DB 버전 읽기는 `.env.local`의 서비스 키로 REST 조회(키 값 출력 금지).
- `safe-commit.mjs --begin`은 **고치기 전에** 실행한다. 고친 뒤 실행하면 기준 사본이 고친 판이 되어 내 변경이 「없음」으로 빠진다(이번에 `docs/roles/workspace.md`에서 발생 → `.git/safe-commit/<세션>/docs__roles__workspace.md.base`를 `git show HEAD:…`로 바꿔 복구).
- 같은 세션 이름의 형제 세션이 같은 폴더 문서를 같은 날 고친다. 문서를 고치기 전 `git log -3 -- <파일>`과 `git status`로 최신 상태를 다시 읽고, 겹치는 줄은 한쪽만 고친다.
- ego 알림: Ego Lite 업데이트 있음(현재 0.6.2.7) — 주인님 승인 뒤 `ego-browser upgrade`.

## 4. 링크

- 프로그램(v1.22 운영): https://ai-work-workspace.buylife.xyz/
- 플랜: `docs/PLAN_20261106_STT_ENGINE_CHOICE.md` · 개선 기록: `docs/IMPROVEMENTS.md` 「받아쓰기 엔진 선택」 · 역할 파일: `docs/roles/workspace.md`
