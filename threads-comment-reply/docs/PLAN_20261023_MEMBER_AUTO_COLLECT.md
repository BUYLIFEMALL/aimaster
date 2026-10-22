# 개발 플랜 — 댓글 자동 수집을 회원이 켜고 끄기 (2026-10-23 Claude Code 윈도우)

> 주인님 결정: 쓰레드 분석 §6-3 「고객이 본인이 선택하게 해줘」. 근거: [`../../docs/analysis-threads-consolidation-20261023/REPORT.md`](../../docs/analysis-threads-consolidation-20261023/REPORT.md).
> 대상: ① 운영 AIMaster, DB ref `esgxyikcnnvmlhygjkth`. 기준 구현: `youtube-auto-reply` v1.12(같은 구조의 유튜브 댓글 프로그램). 지침: 루트 `docs/SCHEDULER_POLICY.md`.

## 1. 지금 상태 (코드·DB 확인)
- 설정 화면에 「⏱ 예약 모니터링」(켜기·확인 주기 5분~24시간·시작 시점)이 **이미 있고** `th_settings.monitoring_enabled`에 저장된다(`lib/actions/monitoring.ts`).
- 그러나 실행 주소 `/api/cron/sync-comments`를 부르는 예약이 없다(`vercel.json` crons 비어 있음, 처음부터 「승인 후 활성화」). → **회원이 켜도 아무 일도 안 일어나는 상태.**
- 운영 DB(읽기): 설정 행 1개, 그중 모니터링 켬 1명(12시간 주기), 자동 게시 켬 0명.

## 2. 바꿀 것 (유튜브 v1.12와 같은 방식)
1. **실행 방식 회원 선택**: 설정에 「⏰ 예약 실행 방식」 — AIMaster 기본(Vercel, 5분마다 깨움) / 내 cron-job.org(공용 키 `cronjob_org_api_key`, 다른 프로그램에서 등록했으면 그대로). 공용 기준 코드 `member-scheduler` 사본 + 이 앱 값 `lib/schedulerMember/schedulerConfig.ts`(표 `th_member_scheduler`, 토큰 `threply_…`, 끄기 스위치 `THREPLY_PLATFORM_SCHEDULER=off`, 「남은 일」= 모니터링 켠 설정 수).
2. **켜기/끄기 연동**: 모니터링을 켜면 회원 cron-job.org 작업을 켜고(준비 안 되면 다시 끄고 안내), 끄면 작업도 끈다. 실행 상태 줄·일시정지/재개.
3. **실행 안전장치**: 회원 실행 주소 `/api/cron/dispatch-member`(회원 전용 토큰, DB엔 해시), 운영자 주소는 Vercel 방식·비일시정지 회원만. 처리 전 **이용 권한(사용기간) 확인**, `last_run_at` **조건부 선점**(두 호출이 겹쳐도 한 번만), 정지·핸드폰 정책 유지.
4. `vercel.json`에 `/api/cron/sync-comments` 5분마다 등록(실제 확인은 회원이 고른 주기로 판단 — 지금 코드 그대로).
5. 매뉴얼(`/guide`) FAQ에 실행 방식 안내.
6. (선택 — 같은 배포에 넣으면 빌드 1회 절약) **AI 답글 지시문이 「유튜브 채널 운영자·영상」으로 된 버그**(`lib/ai/reply.ts:23`)를 Threads용으로 고침. 자동 수집을 켜면 이 지시문으로 초안이 자동 생성되므로 함께 고치는 것을 추천.

## 3. 바꾸지 않는 것
- 자동 게시는 기존처럼 회원이 「자동 승인」을 켤 때만(기본 꺼짐). 수집·초안 생성만 자동.
- 30일 자동 삭제는 이번 범위 아님(개선 문서에 기록됨).
- 인스타 댓글 프로그램(`instagram-comment-reply`)도 같은 상태(예약 없음)라 다음 후보로 기록만.

## 4. DB
- 새 표 `th_member_scheduler`(회원별 실행 방식·토큰 해시·cron-job.org 작업 번호, RLS 본인 조회) — 유튜브 `ytreply_member_scheduler`와 같은 구조. 크롬 SQL Editor로 적용(승인 필요).

## 5. 검수
- tsc·build, 실행 주소 무인증·`Bearer undefined`·가짜 토큰 401.
- 크롬(관리자, 실제 발송·게시 없음): 방식 선택 → 모니터링 켜기 → 상태 줄 → 일시정지·재개 → Vercel 복귀. Vercel 실행 1회 후 `last_run_at` 갱신·수집 결과 확인(회원 본인 키로 AI 초안 생성이 일어날 수 있음 — 새 댓글이 있을 때만).

## 6. 버전·비용
- v1.25 → **v1.26**(코드·DB).
- 비용: Vercel 빌드 1회. 배포 후 Vercel 예약 호출이 5분마다 돈다(함수 실행 시간 소량 — 켠 회원이 없으면 바로 끝남). 자동 수집 때 AI 초안은 **회원 본인 키** 비용(지금 켠 회원 1명, 12시간마다, 새 댓글이 있을 때만).
