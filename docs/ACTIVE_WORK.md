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

| aver-blog-seo-studio/ | [역할: design] Antigravity(윈도우, 웨일) · 세션 gy-win-20261025-ext3d | 2026-10-25 | 사이드바 3D 확장 다운로드 버튼 탑재 & API키 생성버튼/매뉴얼 동기화 & 3D 실행버튼 업그레이드 |
| 폴더 | 에이전트(장비) | 시작 | 작업 |
|---|---|---|---|
| `lyric-video-studio/` | [역할: music] Claude Code(윈도우, 크롬) · 세션 `claude-win-20261024-music` | 2026-10-24 | Lyricbi L-1~L-5 시작 예정(플랜 `lyric-video-studio/docs/PLAN_20261024_LYRICBI_L1_L5.md`, 빌드 2회 승인). 쇼츠 원스톱 v1.42 무료 음성은 시험 계정 운영 검수까지 완료 |
| `realty-listing-alert/` (새 폴더) | [역할: realty] Claude Code(윈도우, 크롬) · 세션 `claude-win-20261024-realty` | 2026-10-24 | 새 프로그램 「AI 부동산 매물 알림 자동화」 구현 — 인수인계 `docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md`. 0~3단계·UX 리뉴얼·지역 감시 ✅(v1.05 운영, 준비중). 지금: 지역 감시 실물 시험 → 카톡·이메일 받기 |
| `naver-blog-agent/` | [역할: blog] Claude Code(윈도우, 크롬) · 세션 `claude-win-20261024-blog3` | 2026-10-24 | ③-1 SEO 예약 포스팅 ✅ v2.19(실제 네이버 예약은 주인님 시험 대기) → **다음: 에이전트 ② 간편 모드 실제 입력 시험(크롬 시험 계정 로그인 확인됨)** → ③-2 콘텐츠 메이커 포스팅 → ④ 묶음 E. 미배포 `89d135c4b` |
