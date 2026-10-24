# 플랜 — 영상 프롬프트 게시판 A안 (관리자 편집 + 내 프롬프트 저장) · v1.19

> 상태: **주인님 「이방법으로 진행해」(2026-10-24) — 플랜 보고, 빌드·DB 실행 승인 대기** · Claude Code(윈도우, 영상 담당 `claude-win-video`)
> 운영 DB `esgxyikcnnvmlhygjkth`(① AIMaster 운영). 회원끼리 공유하는 기능은 넣지 않는다(최상위 규칙: 생성 데이터는 회원 본인 소유).

## 1. 문제
- 지금(v1.14 B안) 예시 24개가 코드(`lib/promptBoard.ts`)에 들어 있어, 고치거나 늘리려면 개발·배포가 필요하다.
- 회원이 마음에 든 설명을 다시 쓰려면 매번 새로 써야 한다.

## 2. 만들 것
| 기능 | 내용 | 누가 보나 |
|---|---|---|
| 관리자 편집 | 게시판 화면에서 관리자(`profiles.is_admin`)에게만 「편집」이 보인다 — 예시 추가·고치기·숨기기·순서 | 공개한 예시를 모든 회원 |
| 내 프롬프트 저장 | 생성 화면 1단계에 「내 프롬프트로 저장」(설명·화풍·카메라) → 게시판 「내 프롬프트」 탭에서 「이 설명으로 만들기」·삭제. 30일 뒤 자동 삭제, 회원당 100개까지 | 본인만 |

## 3. DB (마이그레이션 `supabase/migrations/0005_prompt_board.sql`)
- `avs_preset_prompts` — id(text, 영문 소문자·하이픈)·category(6개 중 하나)·title·idea·style_id·camera_id·input(text|photo)·sort_order·is_published·updated_at. RLS: 로그인 회원은 공개(`is_published`)한 줄만 읽기. 쓰기 정책 없음(관리자 API가 서버 키로 쓰되, 코드에서 `is_admin` 확인). **지금 24개를 처음 값으로 넣는다.**
- `avs_user_prompts` — id(uuid)·user_id·title·idea·style_id·camera_id·created_at·expires_at(+30일). RLS: 본인 줄만 읽기·넣기·지우기.
- 30일 정리: 기존 `/api/cron/cleanup`에 `avs_user_prompts` 만료분 삭제 + 관리자 정리 표 개수(`prompts`) 추가.

## 4. 코드
1. `lib/promptBoard.ts` — 입력 검사 함수(카테고리·화풍·카메라·글자 수) 추가. 코드 속 24개는 **DB가 비었거나 읽기 실패할 때의 예비 목록**으로 남긴다(게시판이 빈 화면이 되지 않게).
2. API — `GET /api/prompts`(공개 예시 + 내 프롬프트), `POST·DELETE /api/prompts/mine`(본인), `POST·PATCH /api/prompts/presets`(관리자만). 모든 쓰기 라우트에 `checkProgramAccessApi` + `dynamic`·`fetchCache` 두 줄.
3. 화면 — `/prompts`에 「예시 / 내 프롬프트」 탭, 관리자 편집 칸. `/create`에 저장 버튼, `?mine=<id>`로 채우기(`?preset=`은 DB id로).
4. 시험 — 입력 검사·예비 목록 전환·저장 개수 제한(`tests/promptBoard.test.mjs`에 추가).

## 5. 검수
- `npm test`·`tsc`·`npm run build`.
- 운영 크롬 2계정: 관리자(`buylifemall@gmail.com`)로 예시 1개 고치기·숨기기 → 시험 계정(`buylifemall@naver.com`)으로 바뀐 것 확인. 시험 계정으로 내 프롬프트 저장·불러오기·삭제 → 관리자 화면에 시험 계정 것이 안 보이는지 확인. 고친 예시는 원래대로 되돌린다.

## 6. 비용·버전·인수인계
| 항목 | 횟수 | 비용 |
|---|---|---|
| Vercel 빌드(ai-video-studio) | 1회 | 승인 필요 |
| 운영 DB SQL 실행(표 2개 + 처음 값 24개) | 1회 | 없음 — 주인님 로그인 크롬의 Supabase SQL 편집기에서 실행(승인 필요) |
| AI 호출 | 0 | 없음 |
- 버전 v1.19(코드 + DB `programs.version`).
- 문서: `AGENTS.md`, `docs/IMPROVEMENT_BACKLOG.md`(A안 체크), 루트 `docs/HANDOFF.md`·`PENDING_DEPLOYS.md`·프로그램 비교표.
