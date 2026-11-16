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
