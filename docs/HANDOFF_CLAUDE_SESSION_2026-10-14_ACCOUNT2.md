# Claude Code 보조 계정 세션 인수인계 — 2026-10-14 (저녁~밤)

- 작업자: Claude Code, **보조 계정 `buylifemall1@gmail.com`**(설정 폴더 `C:\Users\Administrator\.claude-account2`). 커밋 작성자·배포·DB는 기존대로 메인 계정 기준(`BUYLIFE`, Vercel 팀 `buylife`).
- 이 문서만 읽어도 이어서 작업할 수 있도록 오늘 이 세션의 결정·결과·남은 일·주의 사항을 모았다. 세부는 각 링크 문서가 기준이다.
- 상태: **모든 작업 커밋·푸시·배포·운영 확인 완료. 진행 중인 미완성 작업 없음.**

---

## 1. 한눈에 보기

| 영역 | 결과 | 버전·커밋 |
|---|---|---|
| 로컬 PC: 하단 상태바 | 보조 계정에서도 재실행 시 자동 복구 | `8b9a30e3` |
| Claude 계정별 브라우저 | 메인 = 크롬 기본 프로필, 보조 = 엣지 | `d86ddccd`~`74d02439` |
| AI 4컷 만화(`four-cut-comics`) | v1.01 운영 검수·썸네일 → **v1.07** | `4e3b6e2f`~`8cfb3568` |
| 웹 프로그램 10개 모바일 화면 | 좁은 화면에서 위쪽 접는 메뉴로 전환, 각 +0.01 | `e657c44d`, `a4ebecc1` |
| 메인 지침 | 모바일 레이아웃 지침(CLAUDE.md 19번·AGENTS.md 18번) | `2bf95775` |

---

## 2. 로컬 PC·계정 환경 (이 PC에서 계속 쓰는 설정)

### 2-1. 하단 상태바 자동 복구
- 표시 스크립트: `C:/Users/Administrator/.claude/statusline-extra.js`(원본 백업 `.good`). 두 계정이 함께 쓴다.
- Orca가 `settings.json`의 `statusLine`을 다시 쓰면 위 호출이 빠진다 → `~/.claude/statusline-guard.js`가 `~/.claude`·`~/.claude-account2`·`CLAUDE_CONFIG_DIR`을 모두 점검해 다시 붙인다.
- 두 계정 `settings.json` 모두 `SessionStart`·`UserPromptSubmit` 훅으로 guard 실행. 보조 계정 원래 설정 백업: `~/.claude-account2/settings.json.bak-20261014`.
- 진단: `$TEMP/last-agy-statusline.json`(마지막 입력)으로 재현. 기록: `docs/ERROR_LESSONS.md` 2026-10-14 "보조 계정 하단 상태바".

### 2-2. Claude 계정별 브라우저 (지침 `docs/AI_AGENT_AUTONOMOUS_DEV_WORKFLOW.md` 8-1-2)
| Claude 계정 | 브라우저 | deviceId |
|---|---|---|
| 메인 `buylifemall@gmail.com` | 크롬 기본 프로필 | `3208dd7d-d933-4487-a96f-61fbf8cf69dd` |
| 보조 `buylifemall1@gmail.com` | 엣지 기본 프로필 | `6455da5d-f53b-4860-b2f4-edb55347a056` |

- 실측: 이 PC의 Claude Code는 확장에 로그인한 Claude 계정과 상관없이 연결된 브라우저를 **모두** 본다 → 세션마다 자기 브라우저만 `select_browser`로 골라 조작한다.
- 엣지에는 일반 회원 `buylifemall@naver.com`으로 buylife.xyz 로그인되어 있음. 시험용 크롬 새 프로필(Profile 1)은 삭제함.
- **엣지 검수 주의**(ERROR_LESSONS 2026-10-14):
  - 엣지 다운로드 폴더는 `D:\PDS`(Downloads 아님).
  - 엣지가 `four-cut-comics.buylife.xyz`의 **연속 자동 다운로드를 막고 있음** → 파일 저장 검수는 `HTMLAnchorElement.prototype.click`을 가로채 만든 데이터 URL/Blob을 직접 열어 확인했다.
  - claude-in-chrome이 여는 탭 그룹 창은 화면 뒤에 숨고, **엣지 절전 탭이 숨은 탭을 멈춘다**(`Runtime.evaluate timed out`) → 주인님께 그 창을 앞으로 띄워 달라고 요청하면 결과가 남아 있어 이어서 진행된다. 주인님께 `buylife.xyz` 절전 예외·다운로드 허용 설정을 안내해 둠(브라우저 설정은 에이전트가 바꾸지 않음).
  - 창이 최대화면 `resize_window`가 안 먹고, 엣지 최소 폭은 약 492px. 좁은 화면 검수는 400px iframe 안의 `getComputedStyle`로 대신할 수 있다(보고에서 구분).
  - 시험 파일이 `D:\PDS`에 남아 있음: `4컷만화-grid.png`, `4컷만화-grid (1).png`, `4컷만화-합치기.png` — 필요 없으면 삭제해도 됨(주인님께 안내함).

---

## 3. AI 4컷 만화 자동화 (`four-cut-comics`) — v1.01 → v1.07

- 라이브: https://four-cut-comics.buylife.xyz/studio · 메인 상세: https://www.buylife.xyz/programs/four-cut-comics
- 상세 인수인계(기준 문서): [`four-cut-comics/docs/CLI_HANDOFF.md`](../four-cut-comics/docs/CLI_HANDOFF.md) §6, 작업 지침 [`four-cut-comics/AGENTS.md`](../four-cut-comics/AGENTS.md)

| 버전 | 내용 | 커밋 |
|---|---|---|
| v1.01 | (기존 배포분) 일반 회원 운영 검수 통과, §13 실사 카탈로그 썸네일 등록 | `4e3b6e2f` |
| v1.02 | AI 자동 말풍선(`/api/balloon`, 빈 곳·꼬리·말풍선/생각/외침) + 직접 배치 편집기(이동·크기·꼬리·회전·색, 터치), 꼬리가 얼굴을 가로지르지 않게 길이 축소 | `77ff2d80` |
| v1.03 | 모바일 셸 CSS 누락 수정(767px 이하 위쪽 접는 메뉴) | `f1558e37` |
| v1.04 | 인스타 문구(`/api/insta`), 이어서 만들기(같은 인물·캐릭터 그림, 계속/완결), 만화 합치기, 내 작품(IndexedDB 회원별 20개), 연도 지시문에 **한국 시간 현재 월** 추가(계절 착오 방지) | `9b3cb18f` |
| v1.05 | 스타일 8종, 컷 수 3·4·6, 비율 1:1·4:5·3:4·16:9, **서버 보관함**(주인님 승인), 완결 화 이후 안내(새 이야기·연재 합치기·번외편) | `0ca6a7df` |
| v1.06 | 웹툰형 세로 저장, 서버 보관함 전체 삭제, 카탈로그 짧은 설명·상세 설명 재작성 | `aabb8956` |
| v1.07 | 컷마다 다른 비율, 비율 섞인 저장 정렬, 웹툰형 가로 690/800/1080·한 장 최대 높이 → 컷 사이에서 나눠 ZIP | `8cfb3568` |

### 3-1. 꼭 알아야 할 구조
- **서버 보관함은 DB 테이블이 없다.** 비공개 버킷 `four-cut-comics-files` 하나에 `<userId>/index.json`(목록·대본·만료일) + `<userId>/<id>.jpg`. 정책(RLS) 없음 = service role만 접근, 서버(`src/lib/saved.ts`)가 로그인 회원 폴더로만 경로를 만든다. 회원당 30개, 보관 7·30·90일/직접 삭제. 이 세션에는 SQL 실행 도구(Supabase MCP·CLI 로그인)가 없어 버킷을 service role `storage.createBucket`으로 만들었고, 같은 결과의 SQL은 `supabase/migrations/0006_saved_storage_v1_05.sql`에 남겼다. 목록이 커지면 DB 테이블 방식(portrait-photo `0003_saved_storage.sql`)으로 옮긴다.
- 순수 함수는 테스트 대상으로 분리: `src/lib/comic/balloon.ts`(말풍선), `extras.ts`(인스타·이어서·합치기·웹툰·배치·나누기), `savedIndex.ts`(보관함 목록), `zip.ts`(portrait-photo에서 복사). 단위 테스트 **26/26**(`npm test`).
- 모든 AI 호출은 회원 본인 Gemini 키(`guardAi`), 그림은 서버에 저장하지 않음(서버 보관함에 직접 저장한 작품만 예외).
- 웹툰 플랫폼 공식 업로드 규격은 웹 검색으로 확인되지 않아 플랫폼 이름 프리셋 없이 수치만 고르게 했다.

### 3-2. 검수 방식(이번 세션 공통)
- 매 버전: 단위 테스트 → `tsc` → `npm run build` → 프로덕션 배포 → **엣지 일반 회원 실호출**(비용을 줄이려 주로 Lite 모델·3컷) → 화면 캡처·확대 → DB/저장소 대조 → 시험 데이터 삭제.
- 일반 회원(`buylifemall@naver.com`)의 본인 Gemini 키 사용량이 여러 번 발생했다(주인님께 매번 보고).

---

## 4. 웹 프로그램 10개 모바일 화면 수정

- 원인: portrait-photo 뼈대를 복사한 프로그램들에 위쪽 접는 메뉴 마크업(`.mobile-sidebar`)은 있지만 `globals.css`에 767px 이하 전환 규칙이 없어, 휴대폰에서 좌측 메뉴(244px)가 남아 본문이 절반으로 눌림.
- 수정·배포(각 버전 +0.01, DB 반영): ai-writing-editor v1.06, banana-canvas v1.03, blog-keyword v1.03, fashion-style v1.04, landing-architect v1.04, music-player v1.02, personality-suite v1.05, portrait-photo v1.18, reverse-prompt v1.02, thumbnail-master v1.02 (+ four-cut-comics v1.03). 기능 로직 변경 없음. 각 프로그램 `AGENTS.md`에 기록.
- 검수: 10개 운영 화면을 400px iframe에서 좌측 메뉴 숨김·위쪽 메뉴·본문 385px·가로 넘침 없음 확인. 4컷 만화는 엣지 492px 실제 화면으로 확인.
- 점검 명령(위쪽 메뉴 코드는 있는데 규칙이 없는 프로그램만 출력, 현재 0개):
  `for d in */; do p=${d%/}; grep -rqs 'className="mobile-sidebar"' $p/src --include=*.tsx && ! grep -q "mobile-sidebar{display:block" $p/src/app/globals.css && echo $p; done`

## 5. 메인 지침 변경

- **CLAUDE.md 원칙 19번 / AGENTS.md 원칙 18번 "모바일 레이아웃 지침"** — 767px 이하 좌측 메뉴 숨김·위쪽 접는 메뉴, 마크업과 전환 CSS는 한 세트, 배포 후 좁은 화면 검수 필수. 상세 CSS·검수 방법·점검 명령: [`docs/SIDEBAR_LAYOUT_STANDARD.md`](SIDEBAR_LAYOUT_STANDARD.md) "모바일 레이아웃".
- CLAUDE.md 원칙 18번 / AGENTS.md 17번에 계정별 브라우저 한 줄 추가, 워크플로 8-1-2 신설.

---

## 6. 사고·주의 기록

1. **루트 사이트 의도치 않은 배포(22시대)**: `cd <폴더> && 스크립트 ...; vercel deploy` 체인에서 앞 단계 실패로 폴더 이동이 안 된 채 배포가 실행되어 **루트 AIMaster(www.buylife.xyz)가 한 번 프로덕션 배포됨**. 루트 앱 코드에 미커밋 변경이 없어 2분 전 다른 CLI 배포와 같은 코드였고 /·/programs·/login·상세 200 확인. 이후 규칙: **`vercel deploy --cwd <절대경로>` + `.vercel/project.json`의 projectName 확인 후, `&&`로만 연결**(ERROR_LESSONS 2026-10-14).
2. **루트 문서 커밋 방식**: 다른 CLI(Codex 등)가 `docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`를 수정 중이라, 항상 `git show HEAD:<파일>`에 내 항목만 넣어 `git hash-object -w` + `git update-index --cacheinfo`로 커밋했다(작업 폴더 사본에도 같은 항목 추가). **작업 폴더의 `docs/HANDOFF.md`는 다른 CLI의 미커밋 사본으로 HEAD보다 옛 항목(랜딩페이지 기획·fashion-style 주소 통일 누락)을 담고 있었다** — 그 CLI가 커밋할 때 HEAD와 합쳐야 한다.
3. **Bash 도구**: 한글+따옴표가 섞인 긴 heredoc은 거부됨 → 수정 스크립트는 Write 도구로 스크래치 파일을 만든 뒤 `node`로 실행. 셸 작업 폴더는 호출마다 루트로 돌아갈 수 있으니 절대 경로를 쓴다.
4. 다른 CLI 작업 폴더는 건드리지 않음: `document-translator`(Codex — 이 세션 중 v1.03 출시·검수 완료 커밋 확인), `codex-statusbar`(미커밋 변경 있었음).

---

## 7. 남은 일

| 우선 | 일 | 비고 |
|---|---|---|
| 1 | 실제 휴대폰(390px)으로 4컷 만화 [내 작품]·말풍선 터치 끌기, 모바일 수정한 11개 프로그램 메뉴·본문 확인 | 이번 검수는 엣지 492px·400px iframe |
| 2 | 각 프로그램 본문 안(표·편집기·버튼)의 모바일 배치 점검 | 메뉴 셸만 고쳤음 |
| 3 | 다른 프로그램의 연도 지시문에도 현재 월 추가 검토 | 4컷 만화에서 "10월인데 봄" 착오 발견 |
| 4 | AI 할 일·성과 관리 일반 회원 실제 검수(예전부터 남은 항목) | `ai-task-planner/docs/WORK_QUEUE.md` |
| — | 4컷 만화 추가 개발 | 주인님 지시 시. 현재 남은 개발 항목 없음 |

## 8. 이어서 작업하는 법
1. `docs/HANDOFF.md` 맨 위 항목과 `docs/ERROR_LESSONS.md` 맨 위 항목, 이 문서를 읽는다.
2. 4컷 만화를 고치면 `four-cut-comics/docs/CLI_HANDOFF.md` §6 → `npm test`·`tsc`·`npm run build` → `vercel deploy --cwd D:/Antigravity/AIMaster/four-cut-comics --prod --yes --scope buylife`(projectName 확인 후) → 버전 +0.01(`version.ts`·`package.json`·`programs.version`).
3. 화면 검수는 보조 계정이면 엣지(`6455da5d…`), 메인 계정이면 크롬(`3208dd7d…`)만 조작한다.
