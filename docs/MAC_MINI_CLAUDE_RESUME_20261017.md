# 맥미니 Claude Code 세션 재시작 인수인계 (2026-10-17)

> **목적**: 맥미니(원격지)에서 Claude Code가 하던 「디자인 리뉴얼 순차 작업」을, 다음에 **다른 계정·다른 CLI(Codex·Antigravity·윈도우 Claude 포함)** 가 이어받아도 그대로 재개할 수 있게 작업 환경·작업 방식·이력·남은 일을 한곳에 정리한다.
> **세 CLI 공통 작업 지침은 [`MAC_MINI_AGENT_PLAYBOOK.md`](MAC_MINI_AGENT_PLAYBOOK.md)** — 이 문서는 그 지침으로 실제 진행한 기록·남은 일이다.
> 작성: Claude Code(맥미니), 2026-10-17 · 장비 기본 설정은 [`MAC_MINI_WORK_GUIDE.md`](MAC_MINI_WORK_GUIDE.md)가 기준이고, 이 문서는 **실제로 어떻게 작업했는지**를 덧붙인다.

---

## 0. 다시 시작할 때 첫 5분 (순서대로)

1. 이 문서 → 루트 `CLAUDE.md`(특히 맨 위 ★ 규칙) → `docs/HANDOFF.md` 맨 위 3개 항목 → `docs/ACTIVE_WORK.md` → `docs/ERROR_LESSONS.md` 맨 위를 읽는다.
2. 저장소 상태: `cd /Volumes/gt1_mega/Antigravity/AIMaster && git pull --ff-only && git log --oneline -10`
3. 현황판 개수: `for st in ✅ 🔵 🟠 ⚪ ⏸; do printf "%s " $st; grep -E '^\| [0-9]+ \|' DESIGN.md | cut -d'|' -f7 | grep -c "$st"; done`
4. 아래 **§5 남은 일**에서 🟠(윈도우 배포 대기) 항목이 배포됐는지 DB로 확인: `select slug, version from programs where slug in (...)`(Supabase 프로젝트 `esgxyikcnnvmlhygjkth`, 읽기 전용).
5. 주인님께 「남은 일 + 다음 순서 프로그램(링크 단독 줄)」을 보여 드리고 지시를 받는다.

---

## 1. 원격지(맥미니) 작업 환경 — 실제로 쓴 방식

| 항목 | 값·방식 |
|---|---|
| 장비 | 맥미니(macOS 15.8.1), 셸 `zsh` |
| 저장소 | **SMB 공유** `//administrator@gt1_mega/D` → `/Volumes/gt1_mega` 마운트. 작업 폴더 `/Volumes/gt1_mega/Antigravity/AIMaster` = 윈도우 `D:\Antigravity\AIMaster` (**같은 폴더·같은 Git 인덱스**). 맥 로컬 복제본(clone)은 쓰지 않는다 |
| Claude 로그인 | Orca 프로필 `~/Library/Application Support/orca/claude-profiles/cd449caa-106b-4e62-bae1-087353aa56f5` — **보조 계정 `buylifemall1@gmail.com` 한시 예외(2026-10-20까지)**. 10-21부터는 메인 계정만 → 세션 계정이 buylifemall1이면 시작 전에 주인님께 알림 |
| 커밋 작성자 | `BUYLIFE <buylifemall@gmail.com>`(전역 git 설정, 계정 예외와 무관). 원격 `github.com/BUYLIFEMALL/aimaster`, 브랜치 `master` |
| Node | `/usr/local/opt/node@24/bin/node` v24 — **`npm`·`npm run build`·`vercel deploy` 금지(맥미니 규칙)** |
| 맥미니에서 하는 검사 | 타입 검사만: `cd <프로그램(웹앱) 폴더> && node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json` (node_modules는 윈도우가 설치해 둔 것을 SMB로 그대로 씀) |
| 빌드·배포·DB 버전 | **윈도우 CLI에 요청**(프로그램 폴더 `IMPROVEMENT_HANDOFF_YYYYMMDD.md`에 순서 적어 둠). 주인님이 「다했어」라고 하면 맥미니에서 확인 |
| DB | Supabase MCP `execute_sql`, 프로젝트 `esgxyikcnnvmlhygjkth` — **읽기 조회만**(버전·app_url·데이터 건수). 쓰기·스키마 변경은 하지 않음 |
| Vercel | 이 계정(buylifemall1)은 Vercel MCP 배포 목록 **403(권한 없음)** → 배포 여부는 ① DB `programs.version` ② `curl -s <주소>/login \| grep -o 'v1\.[0-9]*'` ③ 크롬 화면 왼쪽 위 버전으로 판정 |
| 브라우저 | **맥미니 크롬**(Claude Code 전용). `list_connected_browsers`에서 macOS·isLocal 항목(이번 세션은 「Browser 2 — 맥미니」)을 고름. 탭 ID는 세션마다 바뀜 → `tabs_context_mcp`로 새로 확인 |
| 크롬 로그인 | 주인님이 직접 **시험 계정 `buylifemall@naver.com`** 으로 로그인해 둠(비밀번호 입력은 에이전트가 하지 않음). `.buylife.xyz` 공용 로그인이라 한 번 로그인하면 모든 프로그램에 적용 |
| 화면 검수 방법 | 데스크톱 1440폭 캡처 → `resize_window` 390×800으로 휴대폰 폭 → ☰ 눌러 메뉴 확인 → 1440×900으로 되돌림. 옛 화면이 보이면 `cmd+shift+r` 강력 새로고침 후 DB 버전 확인 |
| 하단 상태바 | `docs/CLAUDE_STATUSBAR.md` 장치가 Orca 프로필에도 자동 연결됨 |
| 임시 파일 | 세션 scratchpad(`/private/tmp/claude-502/...`)는 세션이 끝나면 사라짐 → 재사용할 절차는 저장소 `scripts/mac-mini/commit-gate.sh`로 옮겨 둠 |
| Claude 메모리 | 프로필 `…/projects/-Volumes-gt1-mega-Antigravity-AIMaster/memory/` (보조 기록일 뿐, 저장소 문서가 정본) |

### 1-1. 커밋 방법 (여러 CLI가 Git 인덱스를 함께 씀) — `scripts/mac-mini/commit-gate.sh`
- 다른 CLI가 스테이징 중이거나 `.git/index.lock`이 있으면 5초씩 최대 5분 기다림(잠금 파일은 **절대 지우지 않음**). 남의 파일이 스테이징돼 있으면 중단.
- 내 파일만 경로 지정해서 `git add`.
- **공용 문서**(`DESIGN.md`·`docs/HANDOFF.md`·`docs/ACTIVE_WORK.md`·`docs/PROGRAM_CAPABILITY_MAP.md`·`docs/ERROR_LESSONS.md`)는 작업 폴더 파일을 통째로 올리지 않고 **「HEAD 버전 + 내 변경」만** 계산해서 올린다(다른 CLI의 미커밋 줄이 섞이지 않게). 내 변경은 작은 python 변환 스크립트(표준입력→표준출력)로 만들고, 같은 변환을 작업 폴더에도 적용.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 커밋 뒤 `git show HEAD:<공용문서> | grep ...`로 실제 반영을 확인(다른 CLI가 같은 시각에 커밋하면서 내 변경을 먼저 포함하는 경우가 자주 있었음 — 그래도 내용만 맞으면 됨).
- `zsh`에서는 `grep --include=*.tsx`처럼 따옴표 없는 글롭이 「no matches found」로 명령 전체를 멈추게 한다 → 따옴표로 감싸거나 쓰지 않는다. 기다릴 때 `sleep`이 막혀 있어 `perl -e 'select(undef,undef,undef,5)'`를 쓴다.

---

## 2. 작업 방식 (주인님이 정한 루프 — 프로그램 1개씩 끝까지)

1. **대상 확인**: `DESIGN.md` 현황판 순서대로 ⚪(작업 예정)만. `docs/ACTIVE_WORK.md`·`git status --porcelain -- <폴더>`로 다른 CLI 작업 중인지 확인 → **미커밋 변경이 있으면 그 폴더는 건너뛰고 기록만**.
2. **분석·플랜**: 화면·코드·DB(`programs.app_url`·version) 확인 → `<폴더>/docs/PLAN_YYYYMMDD_DESIGN_RENEWAL.md` 작성(템플릿 권장안·현재 문제·화면별 변경·바꾸지 않는 것·검수·비용·버전) → 현황판 🔵 「작업 중 (Claude Code 맥미니 날짜, 플랜 승인 대기)」 + ACTIVE_WORK 줄 추가 → 커밋 → **주인님 승인 대기**(승인 전 코드 수정 금지).
3. **구현**: 색은 Tailwind v4 `@theme` 토큰 한곳 정의 → 흰색·회색 클래스 일괄 치환(python 정규식) → 히어로·도식·`/guide`(또는 화면 안 매뉴얼) 시각화 → 사이드바 「📖 연동 & 사용 매뉴얼」·휴대폰 ☰ 확인 → 버전 +0.01 → tsc 0.
4. **문서**: `<폴더>/docs/DESIGN_HANDOFF.md`(템플릿·토큰·구조·모바일·주의), `IMPROVEMENTS.md`(항목 상태 갱신 + 새 제안), `IMPROVEMENT_HANDOFF_YYYYMMDD.md`(윈도우 다음 첫 단계), `AGENTS.md` 버전 기록, 루트 `PROGRAM_CAPABILITY_MAP.md`(목록 표 버전 + 카드), `HANDOFF.md` 맨 위 항목.
5. **현황판**: 🟠 「메인(윈도우) CLI 마무리 작업요망 (`vX.YY`, 템플릿, Claude Code 맥미니 날짜)」, ACTIVE_WORK 내 줄 삭제 → 커밋·푸시.
6. **보고(한글)**: ① 작업 내용 ② 추가개선 제안 **3대 항목**(로직·기능 / UI·편의성 / 다른 프로그램 연계) + **다른 프로그램 1곳 둘러보기**(그 폴더 `docs/IMPROVEMENTS.md`에 선제 기록, 단 다른 CLI 작업 중이면 HANDOFF에만) ③ 윈도우 CLI가 할 일. 프로그램 링크는 DB `app_url` 확인 후 **단독 줄**.
7. 주인님이 「다했어」 → 맥미니 크롬에서 데스크톱·390px 확인 + DB 버전 + 현황판 ✅(윈도우가 바꿈) 확인 → 결과 보고.

**반드시 지킨 것**: 진행 안내·명령 설명은 **한글**(명령어·코드·출력만 영어) · 브라우저는 주인님이 보는 맥미니 크롬에서 단계마다 한글 안내 · 결제·발행·발송·생성(요금 발생) 버튼은 누르지 않음 · 로그아웃처럼 전체 세션에 영향 주는 버튼은 먼저 여쭘 · 매뉴얼 문구는 실제 코드로 확인(없는 기능 쓰지 않기) · DB·환경변수 변경은 승인 후.

---

## 3. 이번 세션 이력 (2026-10-16~17, Claude Code 맥미니)

| 현황판 | 프로그램 | 버전 | 템플릿(변형) | 주요 커밋 | 상태 |
|---|---|---|---|---|---|
| — | YOUTUBE 댓글 자동화 `youtube-auto-reply` | v1.09→v1.11 | 유튜브 다크 콘솔 · 스튜디오 댓글 콘솔 | `d355e67e` `a4814f8d` | ✅ |
| — | 트렌드 상품 `trending-product-finder` | v1.08 | 스마트 매트릭스(다크) | `4011b733` | ✅ |
| — | VIRAL FINDER `youtube-viral-studio` | v1.13 | 유튜브 다크 콘솔 · 스튜디오 변형 | `eb515765` | ✅ |
| — | 유튜브 채널 컨설턴트 `youtube-channel-consultant` | v1.07 | 유튜브 다크 콘솔 · 스튜디오 변형 | `884fcffd` | ✅ |
| — | 쓰레드 댓글 `threads-comment-reply` | v1.10 | 스튜디오 댓글 콘솔 · 쓰레드 모노 | `06450e6c` | ✅ |
| — | INSTA 댓글 `instagram-comment-reply` | v1.14 | 스튜디오 댓글 콘솔 · 인스타 라이트 | `735b36ff` | ✅ |
| — | INSTA DM `instagram-dm-reply` | v1.13(→Antigravity v1.14 제목 수정) | 인스타 라이트 · DM 대화 화면 | `a6f64687` | ✅ |
| — | 사이드바 제목 5개 정리 | — | — | `f260758b` | ✅ |
| 74 | AI 블로그 키워드 `blog-keyword` | v1.05 | 스마트 매트릭스 | (윈도우 `f0fe0d42` 배포) | ✅ |
| 35 | 네이버 블로그 SEO 스튜디오 `naver-blog-seo-studio` | v1.69 | 스마트 매트릭스 라이트 · 네이버 그린 | `c8ab6eb9`(928줄 분리) `402e42cc` | ✅ |
| 42 | 웹 크롤링 `web-crawler-saas` (폴더 `web-crawler/webapp`) | v1.07 | 스마트 매트릭스(다크) | `3f6ea8ed` `59f41953` | ✅ |
| 42 | 〃 30일 자동 삭제 | **v1.08** | — | `9204a306` | 🟠 **윈도우 배포·CRON_SECRET 대기** |
| 14 | 무한루프 영상 `infinite-loop-video` | v1.05 | 크리에이티브 아틀리에 · 네온 루프 시네마 | `40b6bd3e` `af88fc2c` | ✅ (윈도우 `72d28746`) |
| — | 현황판 전수 대조(41·56 폴더명 정정) | — | — | `7c631125` | ✅ |
| 15 | AI 인플루언서 `ai-influencer-studio` | **v1.10** | 크리에이티브 아틀리에 · 핑크 화보 스튜디오 | `a213cdb8` `74994caf` | 🟠 **윈도우 배포 대기**(ACTIVE_WORK에 Antigravity(윈도우) 배포 중 표시됨) |

### 3-1. 만든 디자인 토큰 계열 (다른 프로그램에 이식할 때 참고)
| 접두어 | 템플릿 | 기준 파일 |
|---|---|---|
| `yt-*` | 유튜브 다크 콘솔(스튜디오 댓글 콘솔·스튜디오 변형) | `youtube-auto-reply`, `youtube-viral-studio` globals |
| `th-*` | 쓰레드 모노 다크 | `threads-comment-reply` |
| `ig-*` | 인스타 라이트(댓글·DM) | `instagram-comment-reply`, `instagram-dm-reply` |
| `mx-*` | 스마트 매트릭스 다크(Tailwind v4) | `ghost-scraper` → `web-crawler/webapp`, `trending-product-finder` |
| CSS 변수 | 스마트 매트릭스 라이트 · 네이버 그린 | `naver-blog-seo-studio/app/globals.css` |
| `lv-*` | 크리에이티브 아틀리에 · 네온 루프 시네마 | `infinite-loop-video/src/app/globals.css` |
| `if-*` | 크리에이티브 아틀리에 · 핑크 화보 스튜디오 | `ai-influencer-studio/src/app/globals.css` |
- 공통 부품: 히어로(PageHero/StudioHeader), KPI 카드(왼쪽 색 막대), 말풍선 캐릭터, 5단계 카드(›), TIP/주의 2칸, FAQ `details`, 휴대폰 위쪽 바 + ☰.

---

## 4. 이번 세션에서 배운 점 (재발 방지)
- **윈도우의 「다했어」가 다른 작업을 뜻할 때가 있음** — 반드시 DB 버전·실제 화면으로 확인하고, 안 됐으면 윈도우에 전달할 문장을 그대로 드림(무한루프 v1.05 사례).
- **현황판 폴더 표기가 실제와 다른 경우**(42 `web-crawler-saas`→`web-crawler/webapp`, 41·56) — 작업 전 폴더 존재부터 확인.
- **`web-crawler/.gitignore`가 `docs/`를 제외** → 그 프로그램 문서는 폴더 최상위에 둠.
- Storage 파일은 SQL로 못 지움 → 30일 삭제는 Vercel Cron + Storage API(`docs/ERROR_LESSONS.md` 2026-10-17).
- 일괄 색 치환 때 `bg-white` 규칙이 `hover:bg-white`까지 바꾸는 문제 → 정규식 앞에 `(?<![:\w/-])`.
- 매뉴얼 문구는 예전 도움말을 그대로 믿지 말고 코드로 확인(AI 인플루언서 광고 모드 4종 → 실제 5종).
- 화면 안 매뉴얼로 바꿀 때 입력 패널은 언마운트하지 말고 숨김(입력값 유지), 스크롤은 `setTimeout 0`.

---

## 5. 남은 일

### 5-1. 윈도우 CLI가 할 일 (맥미니는 확인만)
| 프로그램 | 할 일 | 절차 문서 |
|---|---|---|
| AI 인플루언서 v1.10 | 빌드·배포·DB `v1.10`·현황판 15번 ✅ (Antigravity 윈도우가 착수 표시) | `ai-influencer-studio/docs/IMPROVEMENT_HANDOFF_20261017.md` |
| 웹 크롤링 v1.08 | `CRON_SECRET` 확인·추가 → 빌드·배포 → DB `v1.08` → 정리 경로 1회 호출(30일 지난 1건 삭제 기대) | `web-crawler/IMPROVEMENT_HANDOFF_20261017.md` 「v1.08」 |

배포 후 맥미니가 확인할 것: AI 인플루언서 데스크톱·390px(매뉴얼 열기 → 단계 메뉴 클릭 시 스크롤·입력값 유지, **「이미지 생성」 누르지 않음**), 웹 크롤링 매뉴얼 FAQ 30일 문구.

### 5-2. 주인님 결정이 필요한 것
1. 웹 크롤링 「사이트 구조 캐시」가 회원 공용(최상위 규칙 충돌 검토) — `web-crawler/IMPROVEMENTS.md` #8
2. 웹 크롤링 결과 저장소 공개 설정 → 비공개 + 서명 주소 — #9
3. AI 인플루언서 생성 기록을 DB 회원별 저장(+30일 삭제) — `ai-influencer-studio/docs/IMPROVEMENTS.md` #3
4. SEO 스튜디오 로그아웃 실제 클릭 시험(누르면 모든 프로그램 로그아웃 → 주인님 재로그인 필요)

### 5-3. 다음 디자인 리뉴얼 순서 (현황판 ⚪, 2026-10-17 기준 ✅36·🟠1·⚪44·⏸2)
- **16 뮤직비디오 `music-video-studio`** — 다른 CLI 미커밋 변경(이미지 공용 모듈) 있음 → 커밋될 때까지 보류. 발견: 흰 화면, 📖 매뉴얼·`/guide` 없음, 3단계(음악·가사 → 스토리보드 → 장면 제작). 착수 때 이 내용을 그 폴더 `docs/IMPROVEMENTS.md`로 옮길 것.

https://music-video-studio.buylife.xyz

- **17 이미지 변환 스튜디오 `image-convert-studio`** (v1.06) — 16이 막혀 있으면 이것부터.

https://image-convert-studio.buylife.xyz

- 이후 19 감성 글귀(`emotion-writer`) · 20 eBook Studio · 22 썸네일 프로 · 23 스타일 분석기 · 24 카드뉴스 · 25 웹툰 … (윈도우가 이미지 공용 모듈 작업 중인 폴더는 미커밋 변경 확인 후 진행)

### 5-4. 확인만 남은 것
- INSTA DM 사이드바 제목(Antigravity가 「DM답변 자동화」로 수정, DB v1.14) 크롬 확인 — https://instagram-dm-reply.buylife.xyz
