# 예약 방식 2순위 프로그램 조사·판단 자료 (2026-10-20)

> 작성: Claude Code(윈도우), 주인님 지시 「다른 세션과 충돌 없이 할 수 있는 작업 ③」. **코드는 바꾸지 않았다** — 적용 여부를 주인님이 정하기 위한 자료다.
> 관련: 예약 지침 [`SCHEDULER_POLICY.md`](SCHEDULER_POLICY.md) §7 체크리스트 · 전체 검토 [`MEMBER_CRONJOB_SCHEDULER_REVIEW_20261019.md`](MEMBER_CRONJOB_SCHEDULER_REVIEW_20261019.md) §3 · 1순위 진행 [`SCHEDULER_ROLLOUT_HANDOFF_20261019.md`](SCHEDULER_ROLLOUT_HANDOFF_20261019.md)
> 대상 ①: AIMaster 운영. 1순위(쓰레드·INSTA·카드뉴스·네이버 카페·카카오)는 다른 Claude 세션 담당이라 여기서 다루지 않는다.

## 1. 한눈에 보기

| 프로그램 | 운영자 예약 호출 | 무엇을 기준으로 실행 | 회원 켜기/끄기 | 중복 실행 방지 | 실행 결과 |
|---|---|---|---|---|---|
| `stepmail` (스텝메일) | 매시 `/api/cron/dispatch` | 캠페인 `stepmail_campaigns`(`is_active`, `send_hour`·`recurrence`·`weekly_day`, `last_run_at`) — `isCampaignDue` | 캠페인 활성 | ❌ `last_run_at` 조건 없이 갱신 | **메일 실제 발송** |
| `booking-reminder` (예약 알림) | 15분 `/api/cron/reminder` | 규칙 `booking_reminder_rules`(`is_active`) → `runReminderRule` | 규칙 활성 | 확인 필요(규칙 실행 함수 안 발송 기록 방식) | **알림 실제 발송** |
| `crm-google-form` (CRM 후속 연락) | 매일 09:00 KST `/api/cron/followup` | 규칙 `crm_followup_rules`(`is_active`) → `runFollowupRule` | 규칙 활성 | 확인 필요 | **후속 연락 실제 발송** |
| `youtube-auto-reply` (유튜브 자동 답글) | 5분 `/api/cron/sync-comments` | 설정 `ytreply_settings`(`monitoring_enabled`, `monitoring_interval_minutes`, `last_run_at`) — `isMonitoringDue` | 모니터링 켜기 | ❌ `last_run_at` 조건 없이 갱신 | 댓글 수집·AI 초안까지(**게시는 사람이**) |
| `trending-product-finder` (트렌딩 상품) | 5분 소싱 알림·5분 가격 알림·매일 리포트 | 관심 목록 `trend_watchlist`(`sourcing_alert_enabled`, 주기·활동 시간) / 찜 상품 `sourcing_saved_products`(`alert_enabled`, 주기) / 관심 목록 리포트 | 알림 켜기 | ❌ 실행 시각 조건 없이 갱신 | 텔레그램 등 알림 발송·리포트 생성 |

- 5개 모두 **정기 자동 실행형**(네이버 카페·카카오와 같은 유형): 「글마다 예약」이 아니라 회원이 만든 규칙마다 주기가 있고, 운영자 호출이 깨우면 「차례인지」를 판단한다. 따라서 적용한다면 1순위 정기형(`naver-cafe-poster` v1.21, 커밋 `f757b12d`)과 같은 방식 — **켜진 규칙이 0개면 회원 작업 끄기, 규칙을 켤 때 켜기, 회원 cron-job.org 주기는 1분이 아니라 규칙 주기에 맞게(예: 5분·매시)**.
- 5개 모두 핸드폰 필수 정책·`dynamic = "force-dynamic"`은 이미 있다.

## 2. 함께 발견한 것 (적용 여부와 무관하게 고칠 가치)

### 2-1. 실행 주소 비밀값 검사 — 22곳 (방어적 보완 권장)
- 코드: `return auth === \`Bearer ${process.env.CRON_SECRET}\`` → **`CRON_SECRET`이 비어 있으면 `Bearer undefined`를 보낸 누구나 통과**한다.
- 지금 위 5개 프로그램 Vercel에는 `CRON_SECRET`이 **모두 등록돼 있어 실제로 뚫린 상태는 아니다**(2026-10-20 `vercel env ls`로 이름만 확인). 다만 변수가 지워지거나 새 프로그램에 복사될 때 바로 열린다.
- 같은 패턴 22개 파일(9개 프로그램): `stepmail`, `booking-reminder`, `crm-google-form`, `youtube-auto-reply`(3), `trending-product-finder`(4), `real_estate_sales`(2), `threads-comment-reply`(3), `instagram-comment-reply`(3), `instagram-dm-reply`(2), `kakao_auto_poster`(1 — 다른 세션 담당).
- 고치는 법(네이버 카페 v1.21과 같음): `const secret = process.env.CRON_SECRET; return Boolean(secret) && request.headers.get("authorization") === \`Bearer ${secret}\`;`
- 급한 회원 영향은 없으므로 **각 프로그램 다음 배포 때 함께**(비용 규칙) 또는 주인님 지시 시 한 번에 순차 배포.

### 2-2. 같은 규칙 두 번 실행 위험
- `stepmail`·`youtube-auto-reply`·`trending-product-finder`는 「차례인지」 판단 후 실행 시각을 **조건 없이** 덮어쓴다. 지금은 운영자 호출 하나뿐이라 겹칠 일이 드물지만, **회원 cron-job.org 방식을 추가하면 두 실행이 같은 규칙을 동시에 잡을 수 있다** → 메일·알림 중복 발송.
- 적용한다면 먼저 **조건부 갱신**(예: `update … where id = ? and last_run_at is not distinct from <읽은 값>` 후 갱신된 행이 있을 때만 실행)으로 막아야 한다. `booking-reminder`·`crm-google-form`은 규칙 실행 함수 안의 발송 기록 방식을 보고 판단.

## 3. 적용할지 — 판단 자료

| 기준 | 내용 |
|---|---|
| 최상위 규칙(본인 계정 선택지) | 회원이 원하면 본인 cron-job.org로 돌릴 수 있어야 한다는 원칙상 「적용」 쪽 |
| 운영 비용 | 회원 cron-job.org를 써도 **처리는 운영자 Vercel 함수에서** 돈다 → 비용 절감 효과는 거의 없음. 오히려 예약 호출이 늘 수 있어 「켜진 규칙 0개면 끄기」가 필수 |
| 실행 빈도 | 스텝메일 매시·CRM 하루 1번 → 무료 cron-job.org(작업당 1분 1회)로도 충분. 유튜브·트렌딩 5분 |
| 위험 | 실제 발송형(스텝메일·예약 알림·CRM)은 중복 발송이 곧 회원 고객에게 메일·문자가 두 번 가는 사고 → 2-2를 먼저 |
| 작업량 | 프로그램당 1순위 정기형과 비슷(코드 10여 파일 + 운영 DB 표 1개 + 배포 1회 + 실검수) |

### 추천 (주인님 결정 필요)
1. **지금**: 2-1 비밀값 검사 보완 + 2-2 중복 실행 방지만 먼저(회원 화면 변화 없음, 사고 예방). 5개 프로그램 순차 배포(+0.01).
2. **회원 선택지(Vercel / 본인 cron-job.org)**: 1순위 정기형(네이버 카페 v1.21·카카오)이 운영에서 안정적인지 며칠 본 뒤, 같은 방식으로 한 개씩. 우선순위 제안: `youtube-auto-reply` → `trending-product-finder` → `stepmail` → `booking-reminder` → `crm-google-form`(발송 사고 위험이 낮은 것부터).
3. `real_estate_sales`(공공 키 예외로 지역 공용 수집)는 운영자 유지 가능성 — 별도 확인.

## 4. 다음 첫 단계
- 주인님이 추천 1을 고르면: 프로그램마다 플랜(문서) → 비밀값 검사 + 조건부 갱신 → tsc·빌드 → 버전 +0.01 → 배포(한 개씩) → 무인증·`Bearer undefined` 401 확인 → 첫 운영자 실행 200 확인 → 기록.
- 2를 고르면: `SCHEDULER_ROLLOUT_HANDOFF_20261019.md` §2 10단계 + 정기형 차이(네이버 카페 v1.21 `PLAN_20261020_MEMBER_SCHEDULER.md`) 그대로.
