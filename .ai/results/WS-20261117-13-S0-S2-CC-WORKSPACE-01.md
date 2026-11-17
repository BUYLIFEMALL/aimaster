# WS-20261117-13 146 Professional Studio S0~S2 결과 (CC-WORKSPACE-01)

- 근거: 주인님 「2번안으로 작업 지시해」, Master `msg_7eff31662982`(S0~S2 승인)·`msg_4e5b31709cee`(S2 경로·260 승인), 계획 `ai-work-workspace/docs/PLAN_20261117_146_STUDIO_RENEWAL.md`
- 상태: **ready_review · 미배포 · 실화면 미검수**(아래 3절) · 빌드·운영 DB 0

## 1. 커밋
| 단계 | 커밋 | 내용 |
|---|---|---|
| S0 토큰 | `eb42a03e17741fb37bc2b4e945abf8b2050cbfde` | `styles/tokens.css` 끝 `html.aww-studio.lit-light-theme`만(편집 바탕 흰색 유지), `Workspace.tsx` `STUDIO_THEME`+html 클래스. 대비 보정 #5f6f86·#4f46e5 |
| S1 사이드바 | `d2ef2cadcb89673731982d83e9c0162b95167927` | `sidebar.css` 사이드바 범위 토큰 재정의(남색), `aimaster.css` 고정 인디고 → 사이드바 안 #a5b4fc |
| S2 대시보드 | `21d05794108d8668d27405af039724582645b537` | `/<domain>/studio`, `StudioDashboard.tsx`·`studio.css`, 사이드바 항목, 시작 페이지 `studio`(선택한 회원만), 기본·최소 폭 260 |

## 2. 검증
- 대비(WCAG) 계산: 본문 17.85·보조 7.58·흐린 4.67(회색 칸)·사이드바 비활성 6.96·밝은 인디고 8.96·흰/#4f46e5 6.29.
- 시험: `tests/integration/studioDashboard.test.ts` 4(실제 `loadStudioData`·RPC 모의), `studioRoute.test.ts` 3(실제 `parseLocation`). 묶음 끝 전체 36파일 283/283(WS-15 포함), `tsc` 0.

## 3. 실화면 검수 — 막힘(주인님 조치 필요)
- 로컬 개발 서버: `ai-work-workspace`에서 `npx next dev -p 3457`, PID **44944**(이 세션이 띄움, 다른 세션 서버 미접촉), `.env.local`의 `AWW_DATABASE_URL` = **로컬 DB**(호스트 판정만, 값 미출력).
- 엣지(deviceId `6455da5d-…`) 새 탭 `1553942690`으로 `http://localhost:3457/` → `GET / 307` → `/login?redirect=%2F`. 로그인 필요(비밀번호 입력·쿠키 이전 안 함). 화면 캡처는 `Page.captureScreenshot` 30초 시간 초과(엣지 창이 뒤에 있음 추정).
- 필요: 주인님이 그 엣지 탭에서 로그인(로컬 DB에 워크스페이스가 있는 계정)하고 엣지 창을 맨 앞으로. 그 뒤 데스크톱·375px·ko/en 캡처.
- 실화면 전에는 S0~S2 시각 PASS로 보지 않음.
- `next-env.d.ts`는 개발 서버 자동 변경 — 커밋에서 제외·보존.

## 4. 한계
- 다크 테마 미적용(계획대로). 받은 업무·매뉴얼·설정은 워크스페이스 밖 Next 화면이라 `aww-studio` 클래스가 없음 → S5에서 각 CSS로.
- 대시보드 「주간 일정 요약」은 계획에서 내 할 일 목록으로 바꿈(콘텐츠 캘린더 조회 새로 만들지 않음).

## 5. S3~S5 (Master `msg_2b1d1e105460` 승인 범위)
| 단계 | 커밋 | 내용 |
|---|---|---|
| S3 DB·캘린더·표 | `df53bbad859f31ec1ed69731e42958f9bdfa9949` | `calendar.css` 오늘 표시를 스튜디오 인디고(#4f46e5, 흰 글자 6.29:1), `database.css` 「새로 만들기」 펼친 상태 고정 파랑 → 인디고. 그리드 선·머리글·글자는 S0 토큰 그대로 따름. 240px·24px·전체 너비·회원 보기 이름·달 구분(`928c359ff`, 이미 #6366F1 계열)·Alt 복제 로직 미변경. `dbv.css`·`table.css`는 변경 0(남은 고정 색은 선택 강조 인디고 계열·흰 글자라 146과 충돌 없음) |
| S4·S5 단독 화면 | `990ec9075c5de513cbaa68dae6db5781fed46713` | 6개 화면(매뉴얼·받은 업무·영수증·캘린더 연동·키 설정·공개 페이지)이 모두 `guide.css`를 씀 → `guide.css` 끝에 `html.lit-light-theme .aww-guide.aww-studio-page` 범위 Slate 토큰·포커스 링, 각 `page.tsx`는 최상위 `<main>` 클래스 한 단어만 추가. 새 공통 파일 `app/studio-theme.css`는 필요 없어 만들지 않음. 전역 html/body·`:root` 재정의 0(로그인·다크·다른 화면 영향 없음), 서버·권한·데이터·키 입력 0. `page.css`(워크스페이스 안 일반 페이지)·`inbox.css`·`InboxBoard.tsx`·`keys.css`·`receipts.css`는 토큰을 이미 따라 변경 0 |
- 묶음 끝 전체 36파일 **301/301**(WS-15 날짜 검사 포함), `tsc` 0.
- 실화면 검수는 여전히 주인님 로컬 로그인 대기(3절) — 그 전에는 S0~S5 시각 PASS 아님.

## 6. 개발·시험 DB 분리 (Master `msg_f7ffff59de97`) — 로컬 컨테이너만, 운영 DB 0
- 발견: 3457 개발 서버 `.env.local` `AWW_DATABASE_URL`과 시험 `tests/setup-local-db.mjs`가 같은 `127.0.0.1:55432/aww`(컨테이너 `aww-pg-test`). 시험은 `reset: true`로 `aww` 스키마 drop → 개발 자료가 시험마다 지워질 구조.
- 처리: 제 개발 서버(PID 44944, `ai-work-workspace\node_modules\next\...start-server.js`) 종료 → `aww` 접속 0·vitest 0 확인 → `aww_dev` 없음 확인 → `CREATE DATABASE aww_dev TEMPLATE aww`(로컬 컨테이너 안 복제, 덤프 파일 0). 복제 시점 `aww`: `aww` 스키마 표 10·`public` 표 1, 자료(records) 0건 — 앞선 시험들이 이미 비운 상태라 보존할 로컬 입력 자료는 없었음(두 DB 개수 동일). `aww_app` 접속·스키마 권한 확인.
- `.env.local`: `AWW_DATABASE_URL`의 DB 이름만 `aww` → `aww_dev`(다른 줄 해시 동일, `check-env-files` 정상). 되돌리기 = DB 이름을 `aww`로. 시험 설정·운영 환경 변수·컨테이너 설정 변경 0.
- 증명: 개발 설정(Next `loadEnvConfig`)으로 접속 → `current_database()` = **aww_dev**. 시험 1회(`duplicateOverrides` 27/27) 전후 `aww_dev` DB oid 2204849·`aww` 스키마 oid 2195736·표 10 **불변**, 시험 DB `aww`는 스키마 oid가 새로 바뀜(초기화는 `aww`에만).
- 개발 서버 재시작: 같은 3457, 새 PID 44692.
- **로그인 요청(최종)**: 엣지 탭 `1553942690`의 `http://localhost:3457/` → 로그인. 계정 요건: 이 로컬 개발 DB는 워크스페이스 자료가 비어 있으므로 로그인 뒤 「워크스페이스 만들기」로 새로 시작(운영 워크스페이스 자료는 보이지 않음). 로그인은 운영과 같은 Supabase 인증(주인님 본인 계정), 비밀번호는 주인님이 직접.
- 정정(2026-11-17): 메모리 부족으로 Claude Code가 종료한 것은 백그라운드 래퍼 작업뿐, Next 서버 PID 44692는 3457 LISTENING 유지(Master 직접 확인) — 서버 종료·재시작 없음, 로그인 안내 유효.

## 7. 2026-11-17 로컬 3457 복구 시도와 중지(Master msg_dd13ee663878 승인 → msg_2cdb05225af5 중지)
- 주인님 로그인 직후 `/` 500: 로그 `Jest worker encountered 2 child process exceptions, exceeding retry limit`(`Failed to generate static paths for /[[...path]]`). POST `/api/public` 307 기록만으로 로그인 성공은 확정하지 않음.
- 확인 후 종료: 부모 30652(`next dev -p 3457`, cwd `ai-work-workspace`) → 자식 44692(start-server, 3457 LISTEN 소유) 일치. 정상 종료(taskkill) 거부 → 이 두 PID만 강제 종료. 다른 node·Claude·WSL 종료 0.
- 재시작 1회: 첫 명령은 PowerShell 인자 문법 오류로 **미실행**. 두 번째(동일 cwd·명령, 숨김 실행)는 로그 `Ready in 1130ms` 출력 **직후 종료**, LISTEN 없음, 관련 node 프로세스 0, 로그·Application 이벤트 오류 없음. 재시도 0(Master 지시).
- 메모리: 종료 전 가용 424MB·commit 62.1/66GB, 종료 후 가용 2,026MB·commit 60.5GB(Master 측정 2,191MB·60.12/66.03GB). 최근 3시간 System 2004·자원 고갈 탐지 기록 없음(마지막 11-15).
- 원인: **미확인**. 추정 (가) commit 한도 근접 (나) PowerShell 도구 숨김 실행이 호출 종료 때 하위 프로세스와 함께 정리됨(원래 서버는 Bash 백그라운드라 생존) — 둘 다 확인 안 됨.
- 보존: `.env.local`(aww_dev)·aww_dev 자료·쿠키 그대로, `.next` 삭제·설치·DB 초기화·빌드·운영 DB 0. 이 세션이 남긴 백그라운드 프로세스 0.
- 현재: 3457 서버 없음, 146 실화면 검수 미착수(화면 PASS 아님). 메모리 확보 뒤 Master의 다음 구체 지시로 지속 세션 방식 1회 시작해 원인 (나)를 구분 검증. 자동 감시·자동 재시작 없음.

## 8. 2026-11-17 로컬 실화면 검수(Master msg_0b0444c98526, 서버는 Master 지속 세션 PID 32968)
- 로그인: 엣지 탭 1553942690에서 `/` 접속 시 로그인 화면으로 넘어가지 않고 처음 설정(프로필 이름 미리 채움)으로 진입 → 실제 로그인 확인(시험 계정). 로컬 `aww_dev`에 확인용 워크스페이스 `workspace6433` 생성(운영 자료 복사 0).
- 데스크톱(엣지 화면 폭 1560): 남색 사이드바(S1)·맨 아래 「📊 관제 대시보드」, 관제 대시보드(S2) 숫자 카드 4·내 할 일·받은 알림 정상, 영수증 `/workspace6433/receipts` 왼쪽 메뉴와 함께 정상(WS17-17), 키 화면 캘린더 칸 「지금 연결 상태 ✅ 연결됨」+「캘린더 연동 화면 열기」 정상(WS17-18), 새 데이터베이스 달력: 월 구분 상자(11월·12월 1일부터 새 상자, 13개), 주 줄 높이 240px, 오늘 인디고 동그라미, `--nc-db-pad` 24px·DB 제목 왼쪽 24px.
- 375px: 엣지 창이 500px 아래로 줄지 않아(바깥 516px에서도 화면 폭 1560 보고) **같은 페이지 안 375px iframe으로 확인**(실기기 아님). 영수증·관제 대시보드·키 화면 모두 문서 폭 371=화면 폭(가로 넘침 0), 사이드바 ☰ 접힘, 카드 2열.
- 관찰(수정 안 함): (1) 관제 대시보드 맨 위 페이지 제목 줄이 빈 흰 띠로 보임 (2) `/settings/keys`도 별도 페이지라 왼쪽 메인 메뉴 없음(영수증 수정 전과 같은 형태) (3) 달력 격자 왼쪽은 32px — 원본 `CalendarView.view.tsx` 144행 `bleed + 8` 설계(DB 여백 24 + 8), 이번 변경 원인 아님.
- 미검수: 영어(en) 화면, 인쇄(브라우저 인쇄 창이 확장 조작을 막을 수 있어 실행 안 함), Alt 끌기 복사 실조작, 실발급. 캡처 근거: claude-chrome-screenshots 폴더 screenshot-1794877759367-0 ~ -7.

## 9. 남은 제한 검수(Master msg_082867f161de)
- 캡처 공유: `.ai/results/WS-20261117-13-captures/`에 대표 3장(PNG, 계정 이메일 가림) + `manifest.md`(해상도·실제 폭·iframe 여부).
- 영어(en): 설정 › 환경설정 › 언어로 English (US) 전환(로컬 aww_dev 회원 설정, 원래 「한국어」 기록) → 원본 화면(사이드바 Home·Chat·Library·Upcoming events·Link your calendar, Preferences 화면)은 영어, **이번에 추가한 부분은 한국어 그대로**(관제 대시보드 제목·카드 4, 사이드바 아래 6개 메뉴, 설정 왼쪽 메뉴 일부 「환경설정·알림·일반」 등) → 영어 화면에서 언어 섞임(관찰, 수정 0). 확인 뒤 「한국어」로 복원(`nc:locale`=ko-KR, 사이드바 홈·채팅 확인). 브라우저 `nc:locale`만 바꾸면 회원 설정이 다시 덮음(`userSettings.ts` 262~273행).
- Alt 복사 실조작: 로컬 시험 카드 「QA 시험 카드」(11/18) 생성 후 브라우저 조작 도구로 Alt+끌기 → **이동됨(복사 아님)**. 이벤트 기록 결과 도구가 pointerdown/move/up 모두 altKey=false, keydown 0 → 도구가 Alt를 보내지 못함(앱 결함 근거 아님). 페이지에서 altKey 실은 PointerEvent를 직접 만들어도 앱이 끌기를 시작하지 않음(합성 입력, 원인 미확인) → 실제 Alt 복사는 **미검수**, 주인님 수동 확인 필요. 시험 카드는 현재 11/25(로컬만).
- 인쇄: 인쇄 창은 열지 않음. 영수증 화면에서 print 미디어 규칙 로드 확인 — 원본 `.lit-sidebar-container, .lit-topbar …` 숨김, `.rc-noprint, .aww-guide-back, .aww-guide-meta` 숨김, `.rc-print-area` 표시, `body:has(.aww-receipts-view) .lit-sidebar` 숨김. 실인쇄 결과는 미검수.
- 대시보드 빈 제목 띠 근거: `src/litpage/web/features/shell/Topbar.tsx` 79~93행 `RouteTitle`이 people·agent·tasks·marketplace만 그리고 `studio`·`receipts`는 `null` → 상단 띠가 비어 보임. 최소 수정 파일 = `Topbar.tsx` 하나(두 경로에 tasks와 같은 아이콘+제목 줄 추가), 목적 = 상단에 현재 화면 이름 표시. 지시대로 수정 0.
- 서버(Master 소유) 재시작·종료 0, 엣지 창 크기 원복, 운영·외부·발급·AI 0.

## 10. WS-20261117-19 영문·빈 제목 보완 + QA019 보완 캡처
- 정정: §9의 「영어에서 관제 대시보드가 한국어」는 **언어 전환 직후 다시 열리기 전 화면을 읽은 오판**. 다시 열린 뒤에는 대시보드 본문이 이미 영어였음. 실제 한국어로 남던 이번 추가분은 사이드바 「관제 대시보드」(`AimasterSidebar.tsx` 고정 문구)와 빈 상단 제목 띠.
- 수정 `6c5c225c2`(4파일): `Topbar.tsx` RouteTitle에 studio·receipts 제목 줄(내보내기 추가), `AimasterSidebar.tsx` 「관제 대시보드」→`tx('Control dashboard')`, `i18n.literals.ko-KR.json`에 `"Receipts & tax invoices": "영수증·세금계산서"`. 회원 입력·보기 이름 번역 0, 서버·DB 0.
- 시험 `studioI18nDom` 7/7(실제 RouteTitle·AimasterSidebarBottom, en/ko). 직전 커밋 상태로 돌려 실행 시 6/7 실패 — 상단 제목 5개는 내보내기 부재 영향이 섞임, 동작 실패가 분명한 것은 en 사이드바 메뉴. 수정본 복원 확인.
- HMR 실화면: en에서 상단 「📊 Control dashboard」·「🧾 Receipts & tax invoices」, 사이드바 「Control dashboard」 / ko 복원 뒤 「📊 관제 대시보드」, 나머지 기존 한글 그대로.
- 범위 밖 보고(수정 0): en에서 남는 한국어 — 사이드바 아래 다른 5개 메뉴·「다른 프로그램 보기」·「로그아웃」(11-11 이전 추가), 설정 「AI 비서」 메뉴(`features/ai/AiLayer.tsx`, U3 10-24), 「내 계정」 화면(`features/settings/sections/account.tsx`, U2 10-24).
- **새 결함(수정 0, 근거·범위 보고)**: 워크스페이스 안 영수증 화면이 내용이 화면보다 길면 스크롤 불가. 375 iframe에서 `.aww-guide.aww-receipts-view` 높이 768/내용 1101, overflow visible, 상위 `.lit-cursor-listener`·`.lit-body` overflow hidden → 아래 약 333px 접근 불가. 데스크톱도 내용이 길어지면 같음. 원인: WS17-17 `src/litpage/web/features/receipts/receiptsView.css`가 `.aww-guide`의 자체 스크롤을 `overflow: visible; height: auto`로 덮음. 최소 수정안: 같은 파일 `.aww-guide.aww-receipts-view { height: 100%; overflow-y: auto; }`(인쇄 때는 visible 유지) + 관련 DOM 시험. 관제 대시보드(`.aww-studio-dash`, min-height 100%)도 내용이 길면 같은 구조 위험 — 지금 데이터는 짧아 미재현.
- QA019 보완: 외부 구글 연결은 계정에 있으나 자동 전송 경로 없음(`calPushToGoogle` 버튼 수동만, ICS 꺼짐, 로컬 워크스페이스 자동화 0) 확인 뒤 시험 달력에 카드 5장 추가(합계 6: 긴 제목 1·20일 4·25일 1). 긴 제목 말줄임 정상, 20일 4장 240px 칸 안에 들어가 「더 보기」 미발생(6장 제한으로 미검수). 월말·12월 상자 정상. Alt 실검수는 도구 한계로 그대로 미검수(자료 채움으로 대체 0).

## 11. WS-20261117-20 영수증 스크롤 복구 + 사이드바 일반 라벨 영문 (Master msg_9b4f5d72ddf9)
- 코드 `0b43be22c`: `receiptsView.css`(높이 100%·min-height 0·overflow-y auto, 인쇄는 height auto·overflow visible 유지, 기존 패딩·767px 패딩 그대로, 상위 파일 수정 0), `AimasterSidebar.tsx`(다른 프로그램 보기·링크 설명·메뉴 5개·칩 5개·회원 로그인 중·로그아웃 문구·설명 → tx), `i18n.literals.ko-KR.json` 13줄(기존 키 충돌 0 확인). 앱 이름·회원 이메일·링크·로그아웃 동작 변경 0.
- 실측(데스크톱 1560, 발행 탭): 수정 전 client 1175/scroll 1276·휠 10칸 뒤 scrollTop 0·마지막 컨트롤 bottom 1227 > 화면 1219 → 수정 후 client 1175/scroll 1356·휠로 scrollTop 181=최대·마지막 컨트롤 bottom 1046·보관 안내 보임·휠 위로 0 복귀·가로 scrollWidth=clientWidth(1285).
- 실측(375×812 iframe, 증빙 탭): 수정 후 client 768/scroll 1186·휠로 scrollTop 418=최대·하단 보관 안내 보임·문서 폭 375=화면 폭.
- 관제 대시보드: 375 iframe에서 내용 768=영역 768(잘림 미재현) → 코드 수정 0, 스크롤 상자 없는 구조 위험만 유지.
- 시험: `studioI18nDom` 9(사이드바 en/ko 라벨·칩·로그아웃, 이메일 보존 추가) 포함 관련 4파일 30/30. 스크롤은 jsdom이 아닌 실화면 수치로만 판정.
- HMR 실화면: 한국어 기존 문구 그대로 → 영어로 바꿔 사이드바 전부 영어(영수증 본문·머리글은 기존 한국어 전용, 범위 밖) → 한국어 복원 확인.
- 미검수 유지: 실인쇄(인쇄 규칙 소스만), Alt 복사 실조작, 실기기 375.

## 12. 남은 시각 3조건 보완 (Master msg_1e930b6d22a9, Mac msg_e72d5a8f9ae6) — 소스 수정 0
- ① 375 iframe 발행 탭: 휠로 scrollTop 1055=최대(client 768/scroll 1823), 「볼타로 바로 발급」 bottom 635·보관 안내 bottom 748 < 812, 문서 폭 375=화면 폭. 품목 표는 표 안 가로 스크롤(기존 설계). 발급 버튼 누르지 않음.
- ② 시험 달력: 새 카드 0. 기존 시험 카드 2장을 일반 끌기로 날짜 변경 — 「QA 긴 제목 시험 카드…」 11/19→11/20, 「QA 시험 카드」 11/25→11/20 → 11/20에 6장(QA 시험 카드·긴 제목·겹침 1~4). 「1개 더 보기」 표시 → 누르면 6장 펼침(그 주 240→242px). 접기 버튼은 원본 설계상 없음(`CalendarView.view.tsx` 377행 펼침만, 317행 달 이동 때 초기화) → 다음 달→이전 달 이동 뒤 다시 「1개 더 보기」 확인. 긴 제목은 칸에서 말줄임(text-overflow ellipsis, title 풍선 없음), 카드 열면 전체 제목·날짜 11/20 읽힘. 설정 패널 없이 월말·12월 상자까지 확인.
- ③ 375 메뉴: ☰ 누르면 펼침(left 0·폭 260), 바깥 누르면 닫힘(left -240).
- 부수: iframe 메뉴 조작이 같은 출처 사이드바 상태를 바꿔 데스크톱 사이드바가 접힘 → 확인 뒤 ☰로 다시 펼침(원복). 카드 창 안 「Press 'enter'…」·속성명 「Date」는 원본·회원 자료 문구(범위 밖).
- Alt 복사(미검수, 사람 1동작 준비 완료): 엣지 기존 탭 `http://localhost:3457/workspace6433/78f3c5cd9b704e5ba38027c6d00af8dd`(달력 맨 위). 카드 「QA 시험 카드」 현재 11/20(그날 6장). Alt를 누른 채 22일(일요일) 칸으로 끌어 놓기 → 기대: 11/20에 원본 그대로(6장 유지), 11/22에 「QA 시험 카드 (1)」 1장 새로 생김. 도구 Alt 미지원으로 합성 입력·일반 끌기는 Alt PASS로 쓰지 않음.
- 인쇄는 규칙 확인만(실인쇄 미검수) 유지.
