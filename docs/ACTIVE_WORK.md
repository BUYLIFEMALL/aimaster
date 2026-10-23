# 작업 중 표 (ACTIVE_WORK.md) — 동시 작업 방지

2026-10-16 주인님 지시. **같은 프로젝트·같은 서브프로그램(폴더)을 두 CLI가 동시에 작업하지 않는다.** 윈도우 PC·맥미니의 Claude Code·Codex·Antigravity CLI(`agy`) 모두 적용한다. 규칙 원문: 루트 `CLAUDE.md`·`AGENTS.md` 최상단.

## 사용법

1. **시작 전 확인** (셋 다 비어 있어야 시작):
   - 아래 표에 내가 맡을 폴더가 있는가
   - `git status --porcelain -- <폴더>` — 다른 CLI의 미커밋 변경이 있는가
   - `docs/HANDOFF.md` 맨 위 — 그 폴더를 "진행 중"으로 남긴 항목이 있는가
   - 하나라도 해당하면 **시작하지 않고 주인님께 알린다**("○○가 `<폴더>` 작업 중").
2. **시작할 때**: 표에 내 줄을 추가한다(이 파일은 두 PC가 같은 폴더로 보므로 저장만 하면 바로 보인다. 시작 시점에 커밋할 필요는 없다).
3. **끝날 때**: 작업 내용·인수인계 문서(폴더 `AGENTS.md`/`README.md` + `docs/HANDOFF.md` 맨 위 항목)를 남기고, 표에서 **내 줄을 지운 뒤** 작업 커밋에 이 파일도 함께 넣는다.
4. **오래된 줄**: 시작한 지 24시간이 넘었고 그 폴더에 미커밋 변경도 없으면, 지우지 말고 주인님께 확인한다.
5. 루트 공용 문서(`CLAUDE.md`·`AGENTS.md`·`GEMINI.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`·이 파일)는 여러 CLI가 함께 쓴다 — 표에 올리지 않고, 내 항목만 추가한다(남의 내용 삭제·덮어쓰기 금지).

## 작업 중

| 폴더 | 에이전트(장비) | 시작 | 작업 |
|---|---|---|---|
| `shots/` (보안 업데이트 v1.41 커밋 `9daee272c` 이후) | Claude Code(윈도우, 크롬) · 세션 `claude-win-20261023-bgm` | 2026-10-23 | Lyria·ElevenLabs 배경음악 곡 길이 표시(작은 수정·미배포 대기) |
| `ai-video-studio/` | Claude Code(윈도우, 크롬) · 세션 `claude-win-avs-c12` (영상 작업 담당) | 2026-10-23 | C1 음악 덕킹(v1.06). C2(뮤직비디오 가사 시각 장면)는 `claude-win-20261023-next-security`가 music-video-studio를 마친 뒤 따로 예약, 플랜 `ai-video-studio/docs/PLAN_20261023_EDIT_STUDIO.md` 10절, 빌드 2회·약 $0.08 승인 |
| `trending-product-finder/`·`youtube-auto-reply/`·`ai-audio-analyzer/`·`ai-doc-chatbot/`·`ai-influencer-studio/`·`ai-mastering-studio/`·`ai-prompt-studio/`·`ai-slide-builder/`·`ai-webtoon-studio/`·`allinone-graphic/`·`cinematic-storyboard-studio/`·`detail-page-12p/`·`ebook-studio/`·`ghost-scraper/`·`image-convert-studio/`·`infinite-loop-video/`·`insta_auto_poster/`·`music-video-studio/`·`naver-cafe-poster/`·`persona-style-studio/`·`playlist-channel-studio/`·`prompt-template-studio/`·`react-ui-showcase/`·`shorts-viral-studio/`·`shots/`·`style-dna-analyzer/`·`threads/`·`threads-affiliate-poster/`·`threads-easy-planner/`·`vinyl-lp-studio/`·`ai-task-planner/`·`ai-writing-editor/`·`banana-canvas/`·`document-translator/`·`emotion-writer/`·`fashion-style/`·`file-merge/`·`four-cut-comics/`·`kakao_auto_poster/`·`landing-architect/`·`markdown-studio/`·`music-player/`·`personality-suite/`·`photo-remake-studio/`·`portrait-photo/`·`reverse-prompt/`·`suno-music-studio/`·`thumbnail-master/`·`ui-canvas/` (package.json·잠금 파일·버전 파일만) | Claude Code(윈도우) · 세션 `claude-win-20261023-next-security` | 2026-10-23 | **연속 배포 중(49개, 한 번에 하나씩)** Next.js 보안 업데이트(16.4.2·15.5.28) → 하나씩 배포, 플랜 `docs/PLAN_20261023_NEXTJS_SECURITY.md` · 빌드 약 49회 승인 |
| `shop-detail-page/`, `video-to-gif/` | Claude Code(맥미니, 크롬) | 2026-10-23 | ③ 휴대폰·연계 묶음(S-23-04·05·08·09, G-23-06) |
