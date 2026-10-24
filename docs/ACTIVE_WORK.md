# 작업 중 표 (ACTIVE_WORK.md) — 동시 작업 방지

2026-10-16 주인님 지시. **같은 프로젝트·같은 서브프로그램(폴더)을 두 CLI가 동시에 작업하지 않는다.** 윈도우 PC·맥미니의 Claude Code·Codex·Antigravity CLI(`agy`) 모두 적용한다. 규칙 원문: 루트 `CLAUDE.md`·`AGENTS.md` 최상단.

## 사용법

1. **시작 전 확인** (셋 다 비어 있어야 시작):
   - 아래 표에 내가 맡을 폴더가 있는가
   - `git status --porcelain -- <폴더>` — 다른 CLI의 미커밋 변경이 있는가
   - `docs/HANDOFF.md` 맨 위 — 그 폴더를 "진행 중"으로 남긴 항목이 있는가
   - 하나라도 해당하면 **시작하지 않고 주인님께 알린다**("○○가 `<폴더>` 작업 중").
2. **시작할 때**: 표에 내 줄을 추가한다(이 파일은 두 PC가 같은 폴더로 보므로 저장만 하면 바로 보인다. 시작 시점에 커밋할 필요는 없다).
   - **「에이전트(장비)」 칸 맨 앞에 역할 ID를 넣는다(2026-10-24)** — ``[역할: blog] Claude Code(윈도우, 크롬) · 세션 `…` ``. 역할 ID는 `docs/roles/` 역할 파일 이름(전담이 없으면 `[역할: 미지정]`). 상세: [`docs/roles/README.md`](roles/README.md) 「역할 이름으로 기록하기」.
   - **「에이전트(장비)」 칸에 세션 이름을 꼭 넣는다(2026-10-23)** — `` Claude Code(윈도우, 크롬) · 세션 `claude-win-20261023-작업` `` 형식(이름은 멀티세션 규칙 §2 `<CLI>-<장비>-<날짜>-<작업>`, 커밋 도우미 `--as`와 같은 이름). 다른 세션이 「이 폴더 쓰는 세션」을 정확히 찾아 메시지를 보낼 수 있다. 빠진 줄은 세션 시작 점검(`node scripts/index-watch.mjs session-check`)에 ⚠로 나온다.
   - **줄을 올리면 주소도 등록(Claude Code, 2026-10-23)** — `node scripts/index-watch.mjs register <세션명>` 한 번. 아직 커밋 전이어도 다른 세션이 `node scripts/index-watch.mjs who <세션명>`으로 메시지 주소를 보고 바로 문의할 수 있다(주소는 같은 장비에서만 통함, Codex·agy는 주소가 없어 이름만 남음).
   - **폴더의 일부 파일만 맡으면 범위를 적는다(선택, 2026-10-23)** — 폴더 칸 끝에 `(범위: package.json·package-lock.json·src/lib/version.ts)`처럼 **폴더 안 경로를 `·`로 이어** 적는다(여러 폴더면 모든 폴더에 같은 경로로 적용, 폴더 경로도 됨 예 `src/app`). 세션 점검의 「다른 세션이 이 폴더를 고침」 경고가 그 경로를 고친 커밋만 본다. 「잠금 파일만」 같은 말로 적으면 스크립트가 알아보지 못해 폴더 전체로 본다.
3. **끝날 때**: 작업 내용·인수인계 문서(폴더 `AGENTS.md`/`README.md` + `docs/HANDOFF.md` 맨 위 항목)를 남기고, 표에서 **내 줄을 지운 뒤** 작업 커밋에 이 파일도 함께 넣는다.
4. **오래된 줄**: 시작한 지 24시간이 넘었고 그 폴더에 미커밋 변경도 없으면, 지우지 말고 주인님께 확인한다.
5. 루트 공용 문서(`CLAUDE.md`·`AGENTS.md`·`GEMINI.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`·이 파일)는 여러 CLI가 함께 쓴다 — 표에 올리지 않고, 내 항목만 추가한다(남의 내용 삭제·덮어쓰기 금지).

## 작업 중

| 폴더 | 에이전트(장비) | 시작 | 작업 |
|---|---|---|---|
| 메인 사이트 `app/admin/dev-docs/` · `app/api/admin/dev-docs/` · `components/admin/devdocs/` · `lib/devDocs/` · `scripts/dev-requests.mjs` · `supabase/migrations/0044_*` | [역할: ecommerce-image] Claude Code(윈도우, 크롬) · 세션 `claude-win-sdp` | 2026-10-24 | (배포 완료 c7f7b1ae2 · **DB 0044 주인님 실행 대기 → 시험 후 해제**) 수정 요청함에 「작업 결과」·「주인님이 해 줄 일(카테고리별)」 추가 — 플랜 `docs/PLAN_20261024_ADMIN_REQUEST_RESULTS.md`, 빌드 1~2회·DB 0044(주인님 실행) 승인 |
| `ai-video-studio/` | [역할: design] Antigravity(윈도우, 웨일) · 세션 `agy-win-20261024-videostudio` | 2026-10-24 | 2안 헐리우드 네온 사이버 스튜디오 스타일 전면 리뉴얼 (배경 #0b0d1b, 3D 영상 아이콘, /prompts 및 전체 UI 가독성/초보자 개편) |
| (확인만, 코드 수정 없음) `video-to-gif/local-renderer/test/`·`video-to-gif/AGENTS.md` 기록 | [역할: mac-mini] Claude Code(맥미니, 크롬) · 세션 `claude-mac-20261024-maccheck` | 2026-10-24 | 윈도우 영상 담당 요청: 내 PC 렌더러 1.30 맥판 loop·normalize·compress 맥 실물 확인(터미널 + 크롬 3화면) |
| `naver-blog-agent/` | [역할: blog] Claude Code(윈도우, 크롬) · 세션 `claude-win-20261024-blog3` | 2026-10-24 | E-3 v2.19 · E-4 v2.20 · E-5 v2.21 배포 완료 → **② 간편 모드 실제 네이버 입력 시험(비공개 1건) — 크롬 시험 계정 로그인 대기** → ③ SEO 예약·콘텐츠 메이커 포스팅 → ④ 묶음 E. 미배포 대기 `89d135c4b`. 현황 `docs/roles/blog.md` |
