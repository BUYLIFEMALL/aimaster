# 개발 플랜 — 정기 자동 생성 실행 방식 회원 선택 (v1.21, 2026-10-20)

- 대상: ① AIMaster 운영 — `kakao_auto_poster`(카카오톡 뉴스레터 자동화, slug `kakao-auto-posting`), 운영 DB `esgxyikcnnvmlhygjkth`
- 지침: 루트 `docs/SCHEDULER_POLICY.md` · 인수인계 `docs/SCHEDULER_ROLLOUT_HANDOFF_20261019.md` §4-3 · 기준 구현 `naver-cafe-poster` v1.21(정기형, 원 기준 `threads` v1.19)
- 결정: 2026-10-20 주인님 「정기형에도 적용」. 작성: Claude Code(윈도우)

## 1. 문제
- 주제별 정기 자동 생성은 운영자 Vercel 예약 호출(5분)로만 돈다 — 회원 본인 cron-job.org 선택지가 없다.
- 같은 주제 중복 생성 방지 없음(`last_run_at`을 생성 성공 뒤 갱신), `CRON_SECRET`이 비면 `Bearer undefined`로 통과 가능.
- 매뉴얼 FAQ가 「15분 주기」「생성하고 발송」으로 사실과 다름(실제 5분, 카카오 발송은 사람이 결정).

## 2. 범위(네이버 카페 v1.21과 같은 정기형)
- `src/lib/schedulerMember/cronJobOrg.ts`·`memberScheduler.ts`(표 `kakao_member_scheduler`, 토큰 `kakao_…`, 환경변수 `KAKAO_PLATFORM_SCHEDULER`, 5분, 「남은 일」= 켜진 정기 주제 수)·`dispatch.ts`(운영자 주소 로직 이동 + 회원 필터 + 조건부 `last_run_at` 선점, 실패 시 되돌려 다음 tick 재시도 — 기존 동작 유지, 활동 시간대 판정 그대로)
- `/api/cron/generate-reports`(제외 목록·비밀값 검사), 새 `/api/cron/dispatch-member`, `src/lib/actions/scheduler.ts`, `topics.ts`(예약 스위치·주제 활성화·삭제 때 작업 맞추기), `settings.ts`·타입·이름표, 설정 「⏰ 예약 발행」, 관심 주제 화면 상태 줄, `/guide` FAQ 정정·추가
- `supabase/migrations/20261020120000_kakao_member_scheduler.sql`, 버전 v1.20 → **v1.21**(`version.ts`·`package.json`·DB)
- **바꾸지 않는 것**: 카카오 발송은 자동으로 하지 않고 텔레그램/웹에서 사람이 결정하는 구조.

## 3. 검수·비용
- tsc·build → 커밋 → 운영 DB(크롬 SQL Editor) → 배포 → 401 확인·첫 운영자 실행 200 → 크롬 실검수(시험 주제를 「예약 꺼짐·마지막 실행=지금·매주」로 넣어 생성이 돌지 않게, 실제 주제는 건드리지 않음).
- 유료 AI 호출 없음, Vercel 빌드 1회.
