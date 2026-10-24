# CRM 프로그램 보강·기능 확장 순차 작업목록

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** CRM은 담당 역할이 아직 없다. 담당 세션(또는 주인님이 지정한 세션)이 확인하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·키·회원 권한·버전·배포는 바뀌지 않았다.

대상은 **AIMaster 운영**이다. 공통 DB ref `esgxyikcnnvmlhygjkth`. 프로그램: 구글폼 CRM 자동화 `crm-google-form` v1.16, 카카오톡 뉴스레터 자동화 `kakao-auto-posting`(폴더 `kakao_auto_poster/`) v1.30.

## 현재 위치와 읽는 순서

1. [CRM 자동화 완성 기준](CRM_COMPLETION_POLICY.md) — 끝났다고 말할 조건, 고객 연락처 저장·삭제 규칙(§6), 카카오·문자 발송 정책(§7).
2. [CRM 기능 상세 비교표](CRM_FEATURE_MATRIX.md) — 지금 코드에 있는 기능·기준 코드 위치.
3. 프로그램별 기록: `crm-google-form/AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/ARCHITECTURE.md`·`docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md`, `kakao_auto_poster/AGENTS.md`·`docs/IMPROVEMENTS.md`.
4. 연동·예약: [회원 연동 5단계 플랜](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md), [예약 기능 지침](SCHEDULER_POLICY.md) §8.

**2026-10-24 요약:** 병합 대상은 없다(두 프로그램 독립 유지 의견). 대신 **고객(제3자) 연락처 보관·삭제, 중복 발송, 광고 표시·수신거부**에서 회원·고객에게 실제 피해가 갈 수 있는 빈칸이 있다 — 아래 「우선 처리」.

> **🗣 주인님(관리자) 지시 — 2026-10-24, 절대 지시: 중복 발송·게시를 막는 작업을 작업 목록에 올린다.** 이 문서의 CRM-P1(구글폼 같은 응답 2회 발송)·CRM-P4(카카오 「카카오로 발송」 재클릭 시 전체 재발송)·CRM-P5(텔레그램 발행 두 번 눌림)는 「중복 방지 묶음(DUP)」으로 우선 처리한다. 완료 기준: ① 결과가 불확실(시간 초과·게이트웨이 오류)하면 자동으로 다시 보내지 않고 「확인 필요」로 남긴다 ② 서버에서 상태를 먼저 잡고(조건부 update `where status in (...)` 또는 고유 제약) 이미 보냈거나 보내는 중이면 거절한다 — 화면 버튼 잠금만으로 끝내지 않는다 ③ 같은 대상 재발송은 회원 확인 창을 거친다 ④ 시험은 실제 발송 없이 모의로 하고, 실발송 시험은 주인님 승인 뒤 1건. 담당: 주인님이 나중에 지정.

## 우선 처리 — 회원·고객 피해 가능 (코드 확인 근거 포함)

상태는 **대기 → 플랜 제시 → 구현 중 → 로컬 검수 → 운영 검수 → 완료**. DB 고유 제약·자동 삭제·발송 문구 변경은 주인님 승인 후 진행한다.

| ID | 프로그램 | 문제 | 근거(경로) | 영향 | 제안 첫 단계 | 상태 |
|---|---|---|---|---|---|---|
| CRM-P1 | 구글폼 | **같은 구글폼 응답이 두 번 오면 두 번 발송** — `response_id`를 저장만 하고 중복 검사·고유 제약이 없음 | `crm-google-form/app/api/webhooks/form-submit/[token]/route.ts`(insert 후 바로 `dispatchSubmissionNotifications`), `supabase/migrations/0001_crm_google_form_tables.sql`(`response_id text`, 고유 제약 없음), `docs/IMPROVEMENTS.md` #1·분석 F-007 | 신청자에게 문자·알림톡 중복 도착, 회원 SOLAPI 이중 요금 | `(form_source_id, response_id)` 부분 고유 인덱스(DB 승인) + 충돌 시 발송 생략, 같은 응답 2회 POST로 발송 1회 확인 | 대기(승인 필요) |
| CRM-P2 | 구글폼 | **웹훅 크기·횟수 제한 없음** — 주소가 새면 가짜 접수를 대량으로 넣어 임의 번호에 발송 가능 | 같은 웹훅 파일(본문·질문 수·값 길이 제한 없음), `docs/IMPROVEMENTS.md` #2 | 회원 SOLAPI 요금 소진, 모르는 사람에게 문자 발송 | 본문 크기(예: 64KB)·질문 수·값 길이 제한, 토큰별 분당 횟수 제한, 초과 시 회원 텔레그램 경고 | 대기 |
| CRM-P3 | 구글폼 | **고객 연락처가 기한 없이 쌓이고 개별 삭제 불가** — 접수 삭제 서버 액션·정리 예약이 없음 | `crm-google-form/lib/actions/`(접수 삭제 없음, `sources.ts` `deleteFormSourceAction`만), `app/api/cron/`(`followup`·`dispatch-member`만) | 최상위 규칙(생성·수집 데이터 30일 삭제) 미충족, 고객 삭제 요청 처리 불가 | 완성 기준 §6 기한 확정(주인님) → 접수 1건·여러 건 삭제 + 정리 예약(`cleanup-usage-log` 사본) | 대기(기한 결정 필요) |
| CRM-P4 | 카카오 | **리포트 「카카오로 발송」을 다시 누르면 전체 수신자에게 또 발송** — 확인 창·이미 보냄 확인 없음 | `kakao_auto_poster/src/components/reports/SendKakaoButton.tsx`(확인 창 없음), `src/lib/kakaoSend.ts`(`kakao_sent_at`·`broadcast_sent_at`을 보지 않고 `broadcastReportToRecipients` 실행), `src/lib/actions/reports.ts` `sendReportToKakaoAction` | 문서상 수신자 365명 등록 기록 — 실수 한 번에 수백 건 중복 발송·요금 | 「이미 보냄(일시)」 표시 + 재발송 확인 창, 서버에서 짧은 시간 안 재발송 차단 | 대기 |
| CRM-P5 | 카카오 | **텔레그램 「카카오로 발행」 두 번 눌림** — `pending` 확인 후 바로 발송, 상태를 먼저 선점하지 않음 | `kakao_auto_poster/src/app/api/telegram/webhook/[userId]/route.ts`(상태 확인 → `sendReportToKakaoCore` → 끝나고 `approved` 기록) | 텔레그램 재전송·연타 시 중복 대량 발송 가능(실제 발생은 미확인) | `telegram_review_status`를 `pending → sending`으로 조건부 갱신한 뒤 발송(구글폼 `followupDispatch.ts` 선점 방식) | 대기 |
| CRM-P6 | 둘 다 | **광고성 메시지 표시·수신 동의·수신거부 장치 없음** — 「(광고)」·무료 수신거부 안내 자동 표시, 동의 기록 칸이 없음 | 구글폼 `lib/actions/promotions.ts`(RCS 프로모션 문구 그대로 발송), `/guide`에 안내 문구만(`app/(dashboard)/guide/page.tsx` 143행), 카카오 `kakao_broadcast_recipients`(동의 칸 없음, `excluded`만) | 회원이 법적 의무를 모른 채 광고 발송할 위험 | **주인님 결정(2026-10-24): 수신 동의 기록은 꼭 넣고(명부에 동의 일시·방법 칸), 광고 표시는 발송 문구에만 넣는다**(프로모션 발송 때 「(광고)」·무료 수신거부 문구 자동 첨부, 화면 다른 곳 표시는 하지 않음) | 대기(범위 확정 — 담당 지정 뒤 구현) |
| CRM-P7 | 카카오 | **리포트·발송 기록·리포트 이미지 30일 정리 없음** — 이미지는 공개 버킷 | `src/app/api/cron/`(정리 예약 없음), `supabase/migrations/0007_report_images_bucket.sql`(public 버킷), `src/lib/ai/reportImage.ts` `getPublicUrl` | AI 생성물·발송 기록 속 고객 번호가 기한 없이 남음 | 리포트·이미지·발송 기록 30일 정리(공유 링크가 끊긴다는 안내 포함), 수신자 명부 기한은 주인님 결정 | 대기 |
| CRM-P8 | 구글폼 | **웹훅 접수 즉시 발송이 회원 권한을 확인하지 않음** — 정지·사용기간 만료 회원의 폼도 계속 발송 | `crm-google-form/app/api/webhooks/form-submit/[token]/route.ts`(토큰·`is_active`만), 정기 경로는 `lib/schedulerMember/dispatch.ts`에서 `checkProgramAccess` | 회원 본인 요금이라 비용 피해는 회원 몫이지만 권한 규칙과 어긋남 | 발송 직전 `checkProgramAccess(admin, source.user_id, "crm-google-form")`, 막히면 접수만 저장하고 발송 생략 | 대기 |

당해 연도 프롬프트: 카카오 수집 프롬프트에 오늘 날짜가 들어가 있음(`src/lib/ai/collector.ts` `getTodayKoreanDateLabel`) — 이상 없음. 구글폼은 AI를 쓰지 않는다. 운영자 키 폴백: 두 프로그램 모두 회원 본인 계정만 읽는 코드로 확인(폴백 코드 발견 안 됨).

## 유지할 역할

| 프로그램 | 역할 | 비고 |
|---|---|---|
| 구글폼 CRM 자동화 (`crm-google-form`) | 외부 폼 신청자 즉시 응대·팔로우업·프로모션 | SOLAPI 공용 기준 코드 보유 |
| 카카오톡 뉴스레터 자동화 (`kakao-auto-posting`) | AI 정보 콘텐츠를 구독자 명부에 정기 발송 | 카카오 로그인 공용 연동 첫 프로그램 |
| (후보) 공용 고객 명부 | `stepmail`·`booking-reminder`까지 한 명부로 | 아이디어 단계 — 주인님 결정 전 진행 안 함 |

## 순차 작업 표 — 보강 (우선 처리 다음)

| ID / 순서 | 대상과 범위 | 근거 | 상태 |
|---|---|---|---|
| CRM-B1 | 구글폼: 접수 목록 페이지 나눔 + CSV 내려받기 | `app/(dashboard)/submissions/page.tsx` `.limit(100)`, `IMPROVEMENTS.md` #7 | 대기 |
| CRM-B2 | 구글폼: 실패 건 「다시 보내기」(확인 창 필수, CRM-P1 뒤) | `IMPROVEMENTS.md` #8 | 대기 |
| CRM-B3 | 구글폼: 발송제외 칸(카카오 `excluded` 방식) | 비교표 §2-4 | 대기 |
| CRM-B4 | 카카오: HTTP·RSS 소스 | `AGENTS.md` Phase 7 | 예정(기존) |
| CRM-B5 | 카카오: 알림톡 템플릿 승인 후 비친구 도달·이메일 대체 실검수 | `AGENTS.md` 「미검증 항목」 | 대기(회원 템플릿 필요) |
| CRM-B6 | 카카오: Next.js 보안 업데이트(로컬 빌드 보안 경고) | `kakao_auto_poster/docs/IMPROVEMENTS.md` 2026-10-23 | 대기(주인님 승인) |

## 대기 중인 미배포 변경

- 구글폼: 텔레그램 사본(`allowed_updates`·`linkButton`), 좁은 칸 버튼(`f0871e568`), SOLAPI 기준 주석 — 다음 배포 때 버전 +0.01.
- 카카오: 좌측 계정 위치(`22c6cda35`), 좁은 칸 버튼(`f0871e568`), SOLAPI·텔레그램 사본 — 다음 배포 때 버전 +0.01. 위 CRM-B6 확인 필요.

## 주인님 결정이 필요한 것

1. 고객 연락처 보관 기한 — 구글폼 접수·발송 기록 30일로 할지, 카카오 수신자 명부는 어떤 기한으로 할지(완성 기준 §6-3).
2. 광고성 발송 표시·동의 기록 도입 범위와 뉴스레터가 광고성에 해당하는지(법률 확인 포함, 완성 기준 §7-2).
3. CRM-P1 DB 고유 인덱스 적용 승인.
4. CRM 담당 역할 지정.
