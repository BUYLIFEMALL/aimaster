# 맥미니 인수인계 — 2026-10-24 (Claude Code 맥미니 → 다음 CLI)

> 쓴 세션: Claude Code(맥미니) `claude-mac-20261024-maccheck` (그 전: `claude-mac-20261023-ecommerce`) · 역할 `[역할: mac-mini]` · Claude 계정 `rainbowi77777@gmail.com`(커밋 작성자는 늘 BUYLIFE/buylifemall@gmail.com).
> 이유: 맥미니 Claude Code 크레딧 소진 — 다른 CLI가 이어서 작업한다.

## 1. 맥미니의 역할 (먼저 읽기)
- **맥미니 = 맥(macOS)용 프로그램 개발·실물 테스트 전담**(분야 전담 아님). 근거: `docs/MAC_MINI_AGENT_PLAYBOOK.md` §0, 역할 파일 `docs/roles/mac-mini.md`.
- 이커머스(상세페이지·GIF·상품소싱)는 **윈도우 `claude-win-sdp`(`[역할: ecommerce-image]`)가 담당**한다. 맥미니가 하던 이커머스 일은 끝났고 인수인계는 `video-to-gif/docs/IMPROVEMENT_HANDOFF_20261024.md`.
- 맥미니에서 하지 않는 것: `npm`·빌드·배포·운영 DB 쓰기(윈도우에 요청), 비밀번호 입력, 유료 AI 버튼.
- 작업 시작 순서(2026-10-24 최상위 지침): ① `node scripts/dev-requests.mjs list --role mac-mini` ② `docs/roles/mac-mini.md` ③ ACTIVE_WORK·HANDOFF 맨 위. 끝나면 역할 파일 갱신 + `dev-requests.mjs report`(결과)·`ask`(주인님이 해 줄 일).

## 2. 이어서 할 일 — 단 하나
**내 PC 렌더러 1.30 맥 실물 확인의 남은 부분: 크롬 화면 3곳** (윈도우 영상 담당 `claude-win-video` 요청)
- 끝난 것: 설치 1.30 ✅, 터미널 `video-matrix.mjs` 8경우 ✅, loop 1건 ✅ → 기록: `video-to-gif/AGENTS.md` 맨 아래 「v1.24 맥 실물 확인」.
- 남은 것: `video-to-gif/local-renderer/test/MAC_CHECK.md` §2 표 — ① https://infinite-loop-video.buylife.xyz/studio (시험 영상 `video-to-gif/local-renderer/test/samples/with-audio.mp4`, 「⚡ 내 PC로 빠르게」 켜고 만들기 → 「⚡ 내 PC에서 만들었습니다」) ② https://ai-video-studio.buylife.xyz/edit (「내 PC로 용량 줄이기」 → 「○MB → ○MB로 줄였습니다」) ③ https://ai-video-studio.buylife.xyz/library (「GIF 만들기(앞 6초)」·「작게 줄이기(720)」 → 링크·크기). 유료 생성 버튼은 누르지 않는다.
- **막힌 이유(환경)**: 맥미니 크롬을 다시 켜면서 Claude가 조종하는 크롬 프로필이 바뀌었다(장비 식별 `40dc5629…` → `59d08695…`). 그 프로필에는 「AIMaster 내 PC 고속 변환」 확장이 없고 시험 계정 로그인도 풀려 있다. **주인님이 그 프로필에서** `chrome://extensions` → 개발자 모드 → 「압축해제된 확장 프로그램 로드」 → `/Volumes/gt1_mega/Antigravity/AIMaster/video-to-gif/local-renderer/extension`(ID `efgimakonmphcdojhiegemjmpbokpcgk`), 그리고 `buylifemall@naver.com` 로그인을 해 주셔야 한다.
- 확인 방법 팁: 페이지 안에서 확장 확인은 `<script>`를 페이지에 넣어 `chrome.runtime.connect(ID)`로 `{type:"ext-hello"}`·`{type:"ping"}`을 보낸다(크롬 도구의 JS는 별도 공간이라 직접 부르면 주소 확인에서 끊김). 응답 `ext-hello:v1.xx`·`pong:1.30`이면 정상.
- 끝나면: `video-to-gif/AGENTS.md` 「v1.24 맥 실물 확인」 항목의 「2) 크롬 화면 3곳」을 결과로 고치고, HANDOFF 맨 위 항목 보완(안전 커밋), `dev-requests.mjs report`, 역할 파일 갱신.

## 3. 맥미니 환경 메모
- 작업 폴더는 **SMB `/Volumes/gt1_mega/Antigravity/AIMaster`만**(바탕화면 `~/Desktop/AIMaster` 복제본 쓰지 않음). 오늘 SMB가 한 번 끊겼다 — 안 보이면 주인님께 Finder ⌘K 재연결 요청.
- 렌더러 설치 위치: `~/Library/Application Support/BuylifeGifRenderer/host.pl`(현재 1.30), 크롬 연결 `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/xyz.buylife.gif_renderer.json`. 다시 설치: `curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash`(실행 전 받은 파일을 먼저 읽는다).
- 도구: `ffmpeg`/`ffprobe` 8.1(`/usr/local/bin`), `perl 5.34.1`, `node 24`. `timeout` 명령 없음. zsh라 따옴표 없는 `*` 글롭은 멈춘다.
- 크롬 확장 주의: 확장을 SMB 폴더로 불러왔기 때문에 **SMB가 끊겼다 붙으면 ↻를 다시 눌러야** 새 코드가 돈다(옛 판 코드가 남아 마스터링 화면에서 연결이 끊긴 사례).
- git: SMB라 느리다(명령 2분 넘게 걸리기도 함) — 중간에 끊지 말 것. 다른 세션과 커밋이 겹쳐 「cannot lock ref HEAD」·일시적 「index file corrupt」가 날 수 있다 → 아무것도 지우지 말고 `git ls-files | wc -l`(정상 약 1.18만)·`ls .git/index.lock`으로 확인 후 다시 커밋.
- 한국어 종료 검사 훅이 맥미니에도 동작 중 — 도구 사이 안내도 한국어로만.

## 4. 오늘 맥미니가 한 일(요약)
- 상세페이지 30일 정리 회원별 기록 코드(미배포 대기 `34094c954`), 자동생성기 v1 대기 줄 「배포 불필요(꺼진 프로그램)」 정리, 상품소싱 정리 기록 운영 확인.
- 렌더러 1.10 맥 확인(마스터링 MP3·FLAC·GIF 회귀 통과), 렌더러 1.30 터미널 확인(위).
