# 맥 실물 확인 — 내 PC 렌더러 1.30 영상 명령 (맥미니 세션용)

> 요청: 윈도우 Claude Code 영상 담당 `claude-win-video`, 2026-10-24. 윈도우 PC의 msys perl로는 맥판(`host.pl`)이 통과했지만 **실제 맥 perl·맥 ffmpeg 확인이 남아 있다.**
> 대상 명령: `loop`(1.20) · `normalize`·`compress`(1.30). 비용 없음(빌드·AI 호출 없음). 맥미니 규칙대로 `npm`·빌드·배포는 하지 않는다.

## 0. 준비 — 맥미니 렌더러를 1.30으로
1. 맥미니 터미널에서 렌더러를 다시 설치한다(1.30 `host.pl`을 받는다, 확장은 그대로): `curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash` — 화면 안내는 https://video-to-gif.buylife.xyz/guide
2. 확인: `perl -ne 'print if /HOST_VERSION =/' ~/Library/Application\ Support/BuylifeGifRenderer/host.pl` → `1.30` (설치 폴더는 `install-mac.sh`의 `DEST`).

## 1. 명령 시험 — 터미널(저장소 SMB 폴더에서)
```bash
cd /Volumes/gt1_mega/Antigravity/AIMaster/video-to-gif/local-renderer/test
node video-matrix.mjs samples/silent.mp4 samples/with-audio.mp4 pl
```
- 기대: `모두 통과`(8경우 — normalize 2·compress 2·잘못된 값 거절 4). `PL_FFMPEG`는 붙이지 않는다(실제 맥에서 ffmpeg를 스스로 찾는지가 확인 대상).
- `ffprobe`가 PATH에 있어야 한다(`brew install ffmpeg`에 들어 있음).
- loop는 `loop-matrix.mjs`가 `tsx`(윈도우용으로 설치된 `infinite-loop-video/node_modules`)를 써서 맥에서 안 돌 수 있다 → 아래 2번 화면 확인으로 대신한다. 한 명령만 확인하려면:
```bash
node host-harness.mjs pl samples/with-audio.mp4 '{"type":"loop","mode":"smart","start":0,"end":4,"crossfade":0.5,"repeat":2,"format":"mp4","duration":5}' /tmp/loop.mp4
ffprobe -v error -show_entries format=duration:stream=codec_type -of csv=p=0 /tmp/loop.mp4   # 길이 약 7초, video·audio 둘 다
```

## 2. 화면 확인 — 맥미니 크롬(시험 계정 `buylifemall@naver.com`)
| 프로그램 | 주소 | 할 일 | 기대 |
|---|---|---|---|
| 무한 루프 영상 | https://infinite-loop-video.buylife.xyz/studio | `samples/with-audio.mp4` 넣고 「⚡ 내 PC로 빠르게」 켠 채 만들기 | 결과 아래 「⚡ 내 PC에서 만들었습니다 · N초」, 재생·소리 정상 |
| AI 영상 스튜디오 영상 합치기 | https://ai-video-studio.buylife.xyz/edit | 갤러리 영상 1개 넣고 「영상 만들기」 → 「내 PC로 용량 줄이기」 | 「○MB → ○MB로 줄였습니다」, 재생 정상 |
| AI 영상 스튜디오 갤러리 | https://ai-video-studio.buylife.xyz/library | 완성 카드 「GIF 만들기(앞 6초)」·「작게 줄이기(720)」 | 카드 아래 GIF·작은 MP4 내려받기 링크와 크기 |

## 3. 결과 기록
- 통과/실패와 오류 문구를 `video-to-gif/AGENTS.md` 맨 아래(`## 2026-10-24 v1.24 맥 실물 확인`)와 `docs/HANDOFF.md` 맨 위에 적는다(공용 문서는 `node scripts/safe-commit.mjs`).
- 실패하면 고치지 말고 오류 문구·`/tmp` 결과만 남겨 윈도우 영상 담당에 넘긴다(실행기 코드는 윈도우에서 두 판을 함께 고친다).
- 시험 영상 `samples/*.mp4`는 ffmpeg 합성 화면(`testsrc2` + 440Hz 소리)이라 저작권 문제가 없다.
