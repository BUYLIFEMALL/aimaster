# 개발 플랜 — 예약 발행 실행 방식 회원 선택 (v1.19, 2026-10-19)

- 대상: ① AIMaster 운영 — `threads/`(Threads 포스팅 자동화, slug `auto-threads-posting`), 운영 DB `esgxyikcnnvmlhygjkth`
- 지침: 루트 `docs/SCHEDULER_POLICY.md` · 기준 구현: `threads-affiliate-poster` v1.63(같은 `posts` 구조), 원 기준 `threads-content-ops` v2.08
- 작성: Claude Code(윈도우), 주인님 지시 「B. 예약 방식 적용 ① 쓰레드 자동포스팅」

## 1. 문제
- 지금은 운영자 Vercel 예약 호출(`vercel.json` 5분)만 있어 회원이 본인 cron-job.org를 고를 수 없다(지침 §1 위반 상태).
- 같은 예약 글을 여러 실행이 동시에 잡으면 두 번 올라갈 수 있다(조건부 상태 변경 없음).
- 장애 뒤 오래 밀린 예약이 한꺼번에 올라가는 것을 막는 24시간 규칙이 없다.

## 2. 범위 (쇼핑제휴 v1.63과 같은 방식, 차이만 맞춤)
| 파일 | 내용 |
|---|---|
| `src/lib/posts/cronJobOrg.ts` (신규) | cron-job.org 작업 만들기·켜기·끄기·지우기 — 기준 사본, 주소 `/api/posts/dispatch-member`, 작업 이름 「AIMaster Threads 포스팅 예약 발행(1분)」 |
| `src/lib/posts/memberScheduler.ts` (신규) | 회원별 방식(`vercel` 기본/`cronjob`)·토큰(`atp_…`, DB엔 해시)·자동 켜기/끄기·일시정지/재개·키 변경/삭제. 표 `atp_member_scheduler`, 환경변수 `ATP_PLATFORM_SCHEDULER`(off면 Vercel 방식 끔). **배포판 모드가 없는 운영 전용 프로그램이라 기본값은 항상 Vercel** |
| `src/lib/posts/dispatch.ts` | 중복 발행 방지(`scheduled → publishing` 조건부 update), 24시간 넘게 밀린 예약은 실패 처리, 운영자 실행에서 cron-job.org·일시정지 회원 제외, 회원 실행용 함수(핸드폰 정책 적용) |
| `src/app/api/posts/dispatch-scheduled/route.ts` | 운영자 Vercel 호출 — vercel 방식·일시정지 아닌 회원만 |
| `src/app/api/posts/dispatch-member/route.ts` (신규) | 회원 토큰 실행 주소 — 즉시 응답 + `after`로 발행, 남은 예약 0건이면 작업 끔 |
| `src/lib/actions/scheduler.ts` (신규) | 방식 선택·일시정지·재개 서버 액션(이용 권한 확인) |
| `src/lib/actions/posts.ts` | 예약 전 방식·키 확인(없으면 거부+안내), 예약 뒤 작업 켜기(실패 시 초안으로 되돌림) |
| `src/lib/actions/settings.ts`·`src/types/database.types.ts` | 허용 목록·타입에 공용 `cronjob_org_api_key` 추가, 키 변경(방식 유지)·삭제(Vercel로) 처리 |
| 설정 화면 `settings/page.tsx` + `components/settings/SchedulerModePicker.tsx` (신규) | 「⏰ 예약 발행」: 실행 방식 선택 + cron-job.org 키 한 줄(다른 프로그램에서 넣은 키면 「등록됨」) |
| 게시글 목록 `posts/page.tsx` + `components/posts/SchedulePublishingControl.tsx` (신규) | 예약 상태 줄 + 전체 일시정지/재개 |
| `/guide` FAQ·예약 안내 문구 | 두 방식 설명 추가(Vercel은 5분 간격, cron-job.org는 1분 간격) |
| `supabase/migrations/20261019230000_atp_member_scheduler.sql` (신규) | 표 `atp_member_scheduler` + RLS(본인 조회만) — 운영 DB 적용 |

## 3. 구현 순서
1. DB 표 마이그레이션 작성·운영 DB 적용 → 확인: 표·정책 조회
2. 실행 로직(cronJobOrg·memberScheduler·dispatch·두 실행 주소)
3. 서버 액션(저장·설정·방식) → 화면(설정·목록·가이드)
4. 로컬 검사: `npx tsc --noEmit`, `npm run build`
5. 버전 v1.19(코드·DB) → 커밋·푸시 → Vercel 배포 1회 → 무인증 호출 401 확인

## 4. 검수
- 이번 배포 직후: 두 실행 주소 무인증 401, 운영자 호출 정상(로그 오류 0), 기존 회원(행 없음 = Vercel)은 지금과 똑같이 발행.
- **크롬 실화면 검수(방식 전환·cron-job.org 작업 자동 생성/꺼짐·일시정지)는 주인님 지시대로 B 묶음 작업을 모두 마친 뒤 한꺼번에 한다.**

## 5. 비용
- 개발·시험: 유료 AI 호출 없음. Vercel 빌드 1회.
- 운영자 인프라: 추가 없음(기존 5분 예약 호출 유지).
- 회원: cron-job.org 무료(1분 간격, 하루 API 100회 — 예약 1건당 1~2회 사용).

## 6. 버전·배포·인수인계
- v1.18 → **v1.19**(`src/lib/version.ts` + DB `programs.version`). 2026-10-18 미배포 예약 안내 문구도 함께 나감.
- `AGENTS.md` 버전 기록, 루트 `docs/SCHEDULER_POLICY.md` §8 현황, `docs/HANDOFF.md`, `docs/PROGRAM_IDEA_BACKLOG.md`는 해당 항목 보완.
- 함께 발견: 쇼핑제휴는 화면에 「24시간 넘게 지난 예약은 올리지 않음」이라고 안내하지만 실제 코드에 그 규칙이 없다 → 쇼핑제휴 다음 배포 때 수정(지침 §8·쇼핑제휴 IMPROVEMENTS에 기록).
