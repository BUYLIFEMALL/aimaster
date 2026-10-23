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
| `shop-detail-page/`, `video-to-gif/` | Claude Code(맥미니, 크롬) | 2026-10-23 | ③ 휴대폰·연계 묶음(S-23-04·05·08·09, G-23-06) |
| `scripts/safe-commit.mjs` + `scripts/safe-commit.test.mjs` | Claude Code(윈도우) · 세션 `claude-win-20261023-safecommit-mine` | 2026-10-23 | --mine에 이진 파일·삭제 커밋 지원 추가(일반 파일도 도우미로 커밋하도록) |
| `ai-music-studio/` | Claude Code(윈도우, 크롬) · 세션 `claude-win-20261023-bgm` | 2026-10-23 | 남은 음악 작업 순서대로 — ① Mureka 연동 코드(숨김·미배포) ② Stable Audio 3 직접·Lyria RealTime ③ 이후 목록 |
| `naver-blog-agent/` (블로그 전담) | Claude Code(윈도우, 웨일 주인님 지정) · 세션 `claude-win-20261023-seo-bg` | 2026-10-23 | 블로그 전담 진행 중 — ① 검수 지문 10건 완료, 30일 정리 기록 6곳 완료(미배포) → 다음: 인계 ④ 발행 준비 글 실제 이미지 입력(실제 발행, 승인 필요) |
