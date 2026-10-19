# 개발 플랜 — 예약 발행 실행 방식 회원 선택 (v1.25, 2026-10-19)

- 대상: ① AIMaster 운영 — `insta_auto_poster`(INSTA 포스팅 자동화), 운영 DB `esgxyikcnnvmlhygjkth` + SNS 강의 키트(`KIT/`)
- 지침: 루트 `docs/SCHEDULER_POLICY.md` · 기준 구현: `threads-affiliate-poster` v1.63 / `threads` v1.19(같은 posts 구조), 배포판 처리는 `threads-content-ops` v2.08(KIT·enable-vercel-cron)
- 작성: Claude Code(윈도우), 주인님 지시 「B. 예약 방식 적용 ② INSTA」

## 1. 문제
- 운영자 Vercel 예약 호출(5분)만 있어 회원이 본인 cron-job.org를 고를 수 없다.
- 같은 예약 글을 여러 실행이 동시에 잡으면 두 번 올라갈 수 있다(조건부 상태 변경 없음). 24시간 넘게 밀린 예약 규칙 없음.
- 실행 주소 `dispatch-scheduled`에 `dynamic`·`fetchCache` 선언이 없다(멀티테넌시 원칙 1-7).
- 배포판 안내서 6장이 **사이트 비밀값(CRON_SECRET)을 수강생 cron-job.org에 넣는 옛 방식** — 지침상 회원 전용 토큰이어야 한다.

## 2. 범위
| 파일 | 내용 |
|---|---|
| `src/lib/posts/cronJobOrg.ts`·`memberScheduler.ts` (신규) | 기준 사본. 표 `insta_member_scheduler`, 토큰 `ins_…`, 환경변수 `INSTA_PLATFORM_SCHEDULER`. **기본값: 운영 Vercel / 배포판(STANDALONE) cron-job.org**, 배포판 Vercel 방식은 `=on`(Pro 스크립트)일 때만 |
| `src/lib/posts/dispatch.ts` | 중복 발행 방지·24시간 규칙·운영자 실행 제외 목록·회원 실행 함수(핸드폰 정책은 운영에서만) |
| `src/app/api/posts/dispatch-scheduled/route.ts` | vercel·비일시정지 회원만 + `dynamic`·`fetchCache` |
| `src/app/api/posts/dispatch-member/route.ts` (신규) | 회원 토큰 실행, 즉시 응답 + `after`, 남은 예약 0건이면 작업 끔 |
| `src/lib/actions/scheduler.ts` (신규)·`posts.ts`·`settings.ts`·타입·라벨 | 방식 선택·일시정지·재개, 예약 전 확인·예약 뒤 켜기, 키 변경/삭제 처리, provider `cronjob_org_api_key` |
| 설정 화면 + `SchedulerModePicker`(다크 테마) / 게시글 관리 + `SchedulePublishingControl` | 「⏰ 예약 발행」, 상태 줄·일시정지/재개 |
| `/guide` FAQ·예약 안내 문구 | 두 방식 설명 |
| `supabase/migrations/20261019240000_insta_member_scheduler.sql` | 표 + RLS + `programs.version` v1.25 — 운영 DB(크롬 SQL Editor, 승인 후) |
| `KIT/schema.sql`·`KIT/upgrade-20261019-cronjob.sql`(신규)·`KIT/enable-vercel-cron.*`(신규)·`KIT/README.md` 6장·`KIT/PLATFORMS.md`·`KIT/env.example` | 배포판: 새 표·키 허용, 기존 설치자 업그레이드 SQL, Pro용 Vercel 예약 켜기 스크립트, 안내 「설정 → ⏰ 예약 발행에 키만 등록」 |

## 3. 순서·검수
1. 코드 → `npx tsc --noEmit`, `npm run test:own-meta`, `npm run build`
2. 운영 DB 표 생성(주인님 승인 받아 크롬으로) → 표·버전 확인
3. 버전 v1.25 → 커밋·푸시 → Vercel 배포 1회 → 실행 주소 무인증·가짜 토큰 401, 운영자 예약 실행 새 배포 200
4. 키트 재포장은 B 묶음 끝난 뒤 한 번에(또는 주인님 요청 시)
- 크롬 실화면 검수(방식 전환·작업 자동 생성/꺼짐)는 B 묶음 전체 완료 뒤 한꺼번에(주인님 지시).

## 4. 비용·버전
- 유료 AI 호출 없음, Vercel 빌드 1회. 회원 cron-job.org 무료.
- v1.24 → **v1.25**(코드·DB). 2026-10-18 미배포 예약 안내 문구, 2026-10-19 게시 코드 공용 기준 분리(`instagram/publish.ts`, 동작 동일)도 함께 나감.
