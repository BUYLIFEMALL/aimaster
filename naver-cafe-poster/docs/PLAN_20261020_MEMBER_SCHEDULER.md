# 개발 플랜 — 정기 자동 실행 방식 회원 선택 (v1.21, 2026-10-20)

- 대상: ① AIMaster 운영 — `naver-cafe-poster`(네이버 카페 포스팅 자동화), 운영 DB `esgxyikcnnvmlhygjkth`
- 지침: 루트 `docs/SCHEDULER_POLICY.md` · 인수인계 `docs/SCHEDULER_ROLLOUT_HANDOFF_20261019.md` §4-2 · 기준 구현 `threads/`(v1.19)
- 결정: 2026-10-20 주인님 「정기형에도 적용」. 작성: Claude Code(윈도우)

## 1. 문제
- 정기 자동 실행(글감 수집 → 글 생성 → 카페 게시)은 운영자 Vercel 예약 호출(5분)로만 돈다 — 회원 본인 cron-job.org 선택지가 없다(지침 §1).
- **같은 소스 중복 실행 방지가 없다**: `last_run_at`을 실행이 **끝난 뒤** 갱신해, 실행이 겹치면 같은 글이 카페에 두 번 올라갈 수 있다.
- **비밀값 검사 빈틈**: 운영자 주소가 `Bearer ${CRON_SECRET}`만 비교 — 비밀값이 비어 있으면 `Bearer undefined`로 통과.

## 2. 정기형에 맞춘 차이(글마다 예약형과 다른 점)
| 항목 | 글마다 예약형(쓰레드·인스타) | 이 프로그램(정기형) |
|---|---|---|
| 작업 켜기 | 예약 저장 때 | **정기 실행을 켤 때**(소스 등록·스위치 켜기, 「내 cron-job.org」 회원) |
| 작업 끄기 | 남은 예약 0건 | **켜진 정기 소스 0개**(스위치 끄기·소스 삭제·회원 실행 뒤 확인) |
| cron-job.org 확인 주기 | 1분 | **5분**(정기 주기가 1시간 이상이라 1분 불필요, 무료 한도 절약) |
| 24시간 규칙 | 밀린 예약 실패 처리 | 해당 없음 — 한 번 깨울 때 소스당 최대 1회(기존 `isScheduleDue`) |

## 3. 범위
| 파일 | 내용 |
|---|---|
| `src/lib/scheduledSource/cronJobOrg.ts`·`memberScheduler.ts` (신규) | 기준 사본. 표 `ncafe_member_scheduler`, 토큰 `ncafe_…`, 환경변수 `NCAFE_PLATFORM_SCHEDULER`, 기본 Vercel, 회원 주소 `/api/cron/dispatch-member`, 주기 5분, 「남은 일」= 켜진 정기 소스 수 |
| `src/lib/scheduledSource/dispatch.ts` (신규) | 운영자 주소에 있던 실행 로직을 옮겨 `userId`·`excludeUserIds`·`failWithMessage` 옵션 + **조건부 `last_run_at` 선점**(먼저 가져간 실행만 진행) |
| `api/cron/generate-and-post/route.ts` | 비밀값 비어 있으면 401, vercel·비일시정지 회원만 |
| `api/cron/dispatch-member/route.ts` (신규) | 회원 토큰 → 즉시 응답 + `after` → 켜진 소스 0개면 작업 끔 |
| `src/lib/actions/scheduler.ts` (신규)·`scheduledSources.ts`·`settings.ts` | 방식·일시정지·재개 / 정기 실행 켤 때 방식 확인 후 작업 켜기(실패 시 스위치를 끄고 안내), 끄기·삭제 때 꺼도 되는지 확인 / 키 허용·변경·삭제 |
| 타입·키 이름표, 설정 화면 「⏰ 예약 발행」, 글감 수집 화면 상태 줄, `/guide` FAQ | 밝은 테마(기존 화면) |
| `supabase/migrations/20261020110000_ncafe_member_scheduler.sql` | 표 + RLS 본인 조회 + `programs.version` v1.21 |

## 4. 순서·검수
1. 코드 → `npx tsc --noEmit`, `npm run build` → 버전 v1.21 → 커밋·푸시
2. 운영 DB 표 생성(2026-10-20 주인님 「정기형 적용」 승인 범위, 크롬 SQL Editor) → 배포 1회 → 무인증·가짜 토큰 401, 첫 운영자 실행 200
3. 크롬 실검수(관리자 본인 키, **실제 카페 게시 없음**): cron-job.org 선택 → 정기 소스 스위치 켜기 → 작업 자동 켜짐 → 일시정지·재개 → 스위치 끄기 → 작업 자동 꺼짐 → Vercel 복귀. 시험 중 글 생성·게시가 돌지 않게 `last_run_at`이 최근인 소스로 하거나 끈 상태로 되돌린다.

## 5. 비용·버전
- 유료 AI 호출 없음(시험에서 정기 실행이 실제로 돌지 않게 함), Vercel 빌드 1회. 회원 cron-job.org 무료.
- v1.20 → **v1.21**(코드·DB).
