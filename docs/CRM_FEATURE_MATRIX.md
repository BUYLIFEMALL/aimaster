# CRM 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** CRM은 담당 역할이 아직 없다. 담당 세션이 칸을 코드·화면과 대조해 확정하기 전까지는 참고 자료로만 쓴다.

> **CRM 프로그램(고객 접수·명부·문자/알림톡/친구톡/RCS·뉴스레터 발송)을 새로 만들거나 기능을 추가·확장·병합하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「CRM」 줄의 `crm-google-form`(폴더 `crm-google-form/`)·`kakao-auto-posting`(폴더 `kakao_auto_poster/`).
> - 기준 시점: **2026-10-24**, 코드 버전(각 폴더 버전 파일) 구글폼 CRM **v1.16**(`crm-google-form/lib/version.ts`) · 카카오 뉴스레터 **v1.30**(`kakao_auto_poster/src/lib/version.ts`).
> - 근거: 두 폴더의 현재 코드(파일 검색), 각 `AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/ARCHITECTURE.md`, [예약 기능 지침](SCHEDULER_POLICY.md) §8, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드. **운영 DB와 실제 화면은 이번에 확인하지 않았다**(회원 수·발송 건수는 문서 기록 기준).
> - 프로그램이 2개뿐이라 「프로그램 × 기능」 표 대신 **「기능 × 프로그램별 구현 상태·근거」** 표로 쓴다. 이 문서는 사실(지금 코드에 있는 것)만 적고, 추천·계획은 §6에 둔다.
> - 관계 문서: [CRM 자동화 완성 기준](CRM_COMPLETION_POLICY.md) · [CRM 통합 작업표](CRM_CONSOLIDATION_TASKS.md) · [공용 기능 지도](SHARED_FEATURE_MAP.md) · [공용 모듈 등록부](SHARED_MODULES.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4 기준 코드를 읽고 가져다 쓴다.
2. **넣을 곳 판단:** 「외부 폼으로 들어온 신청자에게 응대」는 `crm-google-form`, 「AI가 만든 정보 콘텐츠를 구독자 명부에 정기 발송」은 `kakao_auto_poster`. 두 프로그램의 공통 부분(SOLAPI·이메일·텔레그램·예약 실행)은 이미 공용 사본이다.
3. **개발 후(같은 커밋):** 바뀐 칸과 버전을 §2에서 고치고, 새 기준 코드는 §4, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6 「미배포 대기」에 적는다.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/CRM_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/CRM_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 버전) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 |
|---|---|---|---|---|---|---|
| 구글폼 | 구글폼 CRM 자동화 (`crm-google-form` v1.16) | 신청 접수 즉시 응대 | 구글시트 + Apps Script 웹훅 → 접수 저장 → 접수 확인(이메일·문자·알림톡·친구톡) + 회원 텔레그램 요약 → 팔로우업 규칙(매일 09시) → RCS 프로모션(선택 대상) | 표 `crm_form_sources`·`crm_submissions`·`crm_followup_rules`·`crm_followup_sends` / AI 없음 / 회원 SMTP·SOLAPI·텔레그램·cron-job.org | Google OAuth 심사 없이 실시간 접수, 채널 5종, 팔로우업 발송 전 선점(중복 방지) | 웹훅 같은 응답 중복·크기·횟수 제한 없음, 접수 100건만 표시·CSV 없음, 접수 개별 삭제·30일 정리 없음, 수신 동의·수신거부 칸 없음, Next 14 |
| 카카오 | 카카오톡 뉴스레터 자동화 (`kakao-auto-posting` v1.30) | AI 정보 콘텐츠 정기 발송 | 주제·키워드 → Perplexity 수집 + OpenAI 정리 + Gemini 대표 이미지 → 리포트 편집 → 텔레그램 사전 검토(선택) → 본인(카카오 로그인·SOLAPI) + 수신자 명부(알림톡/브랜드메시지, 이메일 함께·대체) → 공유 링크 | 표 `kakao_topics`·`kakao_reports`·`kakao_broadcast_recipients`·`kakao_broadcast_groups`·`kakao_broadcast_send_log` / Perplexity·OpenAI·Gemini 이미지 / 회원 키 + 회원 카카오 앱 | 공식 경로만 사용, 명부 엑셀·그룹·중복등록 그룹·발송제외, 채널 구분 안내, 오늘 날짜 주입 | 리포트 재발송 확인 없음, 텔레그램 승인 선점 없음, 리포트·발송 기록·이미지 30일 정리 없음, 광고 표시·수신 동의 칸 없음, Next 16.4.0 보안 경고로 로컬 빌드 실패 기록 |

공통: 두 프로그램 모두 로그인 + 공통 권한 판정(`lib/access.ts`·`src/lib/access.ts`), 회원 본인 발송 계정, 회원별 표 + RLS, 회원 cron-job.org 예약 방식(공용 `member-scheduler` 사본), 텔레그램 공용 사본(`telegram-bot-client`), SOLAPI 공용 사본(`solapi-client`, 기준 = 구글폼).

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드를 확인하지 못한 칸. 경로는 각 프로그램 폴더 기준.

### 2-1. 고객 연락처 받기·명부

| 기능 | 구글폼 | 카카오 |
|---|---|---|
| 외부 폼 웹훅 수신(로그인 없음, 토큰 대조) | ○ `app/api/webhooks/form-submit/[token]/route.ts` | × |
| 폼 질문 → 이름·핸드폰·이메일 칸 연결 | ○ `lib/actions/sources.ts` `updateFieldMappingAction` | × |
| 수신자 직접 등록·수정·삭제 | × (접수는 웹훅으로만) | ○ `src/lib/actions/broadcastRecipients.ts` |
| 엑셀 양식 내려받기·업로드, 텍스트 일괄 등록(최대 500명) | × | ○ `src/app/api/broadcast-recipients/template/route.ts`, `importBroadcastRecipientsAction`, `addBulkBroadcastRecipientsAction` |
| 이메일만 있는 수신자 | × | ○ `supabase/migrations/0014_email_only_recipients.sql` |
| 그룹 묶기·이동·필터 | × | ○ `kakao_broadcast_groups`, `moveManyBroadcastRecipientsGroupAction` |
| 기존 명부와 겹치면 「중복등록」 그룹 자동 분류 | × | ○ `src/lib/duplicateGroup.ts` |
| 같은 접수(응답 ID) 중복 차단 | × `response_id` 저장만, 고유 제약·검사 없음(`IMPROVEMENTS.md` #1) | 해당 없음 |
| 웹훅 본문 크기·횟수 제한 | × (`IMPROVEMENTS.md` #2) | 해당 없음 |
| 명부 검색·필터 | ○ 검색·상태·폼 필터 `components/submissions/SubmissionMatrix.tsx` | ○ 이름·번호 검색 `src/components/settings/BroadcastRecipientsSection.tsx` |
| 목록 페이지 나눔·CSV 내보내기 | × 최근 100건(`app/(dashboard)/submissions/page.tsx` `.limit(100)`) | 미확인 |

### 2-2. 고객 연락처 보관·삭제·격리

| 기능 | 구글폼 | 카카오 |
|---|---|---|
| 회원별 표 + 본인 전용 RLS | ○ `supabase/migrations/0001_crm_google_form_tables.sql` | ○ `supabase/migrations/0008_broadcast_recipients.sql`, `0012_send_log_and_exclusion.sql` |
| 회원 탈퇴 시 함께 삭제(`on delete cascade`) | ○ 위 마이그레이션 | ○ 위 마이그레이션 |
| 접수·수신자 1건 삭제 | × 접수 삭제 서버 액션 없음(폼 연결 삭제 시 cascade로만 — `deleteFormSourceAction`) | ○ `deleteBroadcastRecipientAction`(확인 창 있음) |
| 발송 기록 속 연락처 삭제 | × (`crm_followup_sends`는 접수 삭제 시 cascade) | × 수신자를 지워도 `kakao_broadcast_send_log`는 `on delete set null`로 남음 |
| 고객 연락처 30일(또는 정한 기한) 자동 정리 | × 정리 예약 없음(`app/api/cron/`에 `followup`·`dispatch-member`만) | × 정리 예약 없음(`src/app/api/cron/`에 `generate-reports`·`dispatch-member`만) |
| AI 생성물(리포트·이미지) 30일 정리 | 해당 없음 | × `kakao_reports`·버킷 `kakao-report-images`(공개) 정리 없음 |
| 실패 기록에서 번호 가리기 | 미확인(`crm_submissions.error_message`에 들어가는 문구 확인 안 함) | △ 리포트 발송 실패는 끝 4자리(`src/lib/kakaoSend.ts`), 발송 기록 표는 전체 번호 저장 |

### 2-3. 발송 채널

| 기능 | 구글폼 | 카카오 |
|---|---|---|
| 이메일(회원 SMTP 공용 `user_smtp_accounts`) | ○ `lib/email/transport.ts` | ○ `src/lib/email/transport.ts`, 대체 발송 `src/lib/emailFallback.ts` |
| 문자(SMS) | ○ `lib/solapi/client.ts` `sendSms` | × (사본에 함수는 있음) |
| 알림톡(승인 템플릿) | ○ `sendAlimtalk`, 폼별 템플릿 `updateKakaoConfigAction` | ○ 회원 템플릿 `user_solapi_accounts.alimtalk_template_id`, `sendReportAlimtalkToRecipientsAction` |
| 친구톡·브랜드메시지(자유 문구, 채널 친구만) | ○ `sendFriendtalk` | ○ `sendFriendtalk`, `sendCustomBroadcastAction` |
| RCS | ○ `sendRcs`, `lib/actions/promotions.ts` | × (사본에 함수만 있음, 쓰지 않음) |
| 회원 텔레그램 알림 | ○ 접수 요약 `lib/crm/dispatch.ts` | ○ 사전 검토 버튼 `src/lib/telegramReview.ts` |
| 카카오 로그인 「나에게 보내기」(회원 본인 앱) | × | ○ `src/lib/kakao/client.ts` `sendReportMemoToMe`, 콜백 `state`=회원 ID 대조 `src/app/api/kakao/callback/route.ts` |
| 카카오톡 공유(회원이 직접 누름) + 공개 열람 링크 | × | ○ `src/components/reports/KakaoShareButtons.tsx`, `src/app/share/[token]/page.tsx`(추측 불가 `share_token`) |
| 카카오 연결을 공용 연동 표에 기록 | × | ○ `src/lib/kakao/memberAccount.ts`, `member_platform_accounts`(v1.24) |

### 2-4. 발송 안전장치

| 기능 | 구글폼 | 카카오 |
|---|---|---|
| 선택 발송 전 확인 창 | ○ RCS 프로모션 `components/promotions/PromotionSendForm.tsx` `confirm(...)` | ○ 자유·알림톡·이메일 선택 발송 `BroadcastRecipientsSection.tsx` `confirm(...)` |
| 리포트 재발송 시 「이미 보냄」 확인 | 해당 없음 | × `SendKakaoButton.tsx`에 확인 창 없음, `sendReportToKakaoCore`가 `kakao_sent_at`을 보지 않고 다시 발송 |
| 정기 발송 중복 방지(선점) | ○ 팔로우업 선점 `lib/crm/followupDispatch.ts` + `unique (rule_id, submission_id)` | ○ 정기 생성 `last_run_at` 조건부 선점(`src/lib/schedulerMember/dispatch.ts`, v1.21) — 생성만, 발송은 사람이 결정 |
| 텔레그램 승인 두 번 눌림 방지 | 해당 없음 | △ `pending`인지 확인 후 발송(`src/app/api/telegram/webhook/[userId]/route.ts`) — 상태를 먼저 선점하지 않아 동시 두 번은 미확인 |
| 텔레그램 웹훅 비밀값 | 해당 없음(웹훅 미사용) | ○ `src/lib/telegram/webhookSecret.ts` |
| 발송제외(수신 불가·거부) 표시가 모든 경로에 적용 | × 칸 없음 | ○ `excluded` — 리포트 발송·선택 발송 3종 모두 `.eq("excluded", false)` |
| 수신 동의 여부·일시 기록 | × | × |
| 광고성 문구 「(광고)」·무료 수신거부 안내 자동 표시 | × (`/guide`에 「수신 동의 받은 신청자에게만」 안내 문구만) | × |
| 야간 발송 제한 | × | △ 정기 생성에 동작 시간대(`isWithinActiveHours`) — 발송 시간 제한은 아님 |
| 웹훅 접수 즉시 발송 직전 회원 권한 확인 | × 토큰·`is_active`만 확인(`app/api/webhooks/form-submit/[token]/route.ts`) | 해당 없음 |
| 정기 실행 직전 회원 권한 확인 | ○ `lib/schedulerMember/dispatch.ts` `checkProgramAccess` | ○ `src/lib/programAccess.ts` 사본(v1.22) |
| 정기 실행 비밀값 빈 값 차단 | ○ v1.10 | ○ v1.21 |

### 2-5. 콘텐츠(카카오 뉴스레터)

| 기능 | 구글폼 | 카카오 |
|---|---|---|
| Perplexity 최신 정보 수집(회원 키, 없으면 중단) | 해당 없음 | ○ `src/lib/ai/collector.ts` |
| 오늘 날짜(당해 연도) 프롬프트 주입 | 해당 없음(AI 없음) | ○ `getTodayKoreanDateLabel()`(`collector.ts`) |
| 지어내기·광고성 정보 배제 지시 | 해당 없음 | ○ `collector.ts` 프롬프트 |
| 대표 이미지(한국인 기본 묘사, 공용 이미지 사본) | 해당 없음 | ○ `src/lib/ai/reportImage.ts`, `geminiImage.ts`·`nanoBananaModels.ts` |
| 리포트 직접 편집(서식 편집기) | 해당 없음 | ○ `src/components/reports/ReportEditor.tsx` |
| HTTP·RSS 소스 | 해당 없음 | × Phase 7 예정 |

### 2-6. 예약·정기 실행

| 기능 | 구글폼 | 카카오 |
|---|---|---|
| 실행 방식 선택(Vercel / 내 cron-job.org) | ○ 매일 09:00 KST | ○ 5분 확인 |
| 켤 일이 생기면 켜기, 0개면 끄기 | ○ 규칙 기준 | ○ 예약 켜진 주제 기준 |
| 일시정지·재개, 실패 시 되돌리기 | ○ v1.11·v1.12 | ○ v1.23·v1.25 |
| 운영자 Vercel 예약 | ○ `/api/cron/followup` | ○ `/api/cron/generate-reports` |

## 3. 장점 요약

- **구글폼**: OAuth 없이 실시간 접수(회원 시트 + Apps Script), 채널 5종을 폼마다 켜고 끔, 팔로우업 선점으로 정기 중복 방지, SOLAPI 공용 기준 코드 보유.
- **카카오**: 공식 카카오 경로만 사용하고 채널별 도달 조건을 화면에서 구분, 명부 관리 기능이 가장 풍부(엑셀·그룹·중복등록·발송제외·이메일 전용), 사전 검토로 사람이 발송을 결정.

## 4. 기능별 기준 코드 위치

| 기능 | 기준 | 위치 |
|---|---|---|
| SOLAPI 발송(문자·알림톡·친구톡·RCS·잔액) | 공용 `solapi-client` 기준 | `crm-google-form/lib/solapi/client.ts` |
| 외부 웹훅 수신(토큰 대조) | 구글폼 | `crm-google-form/app/api/webhooks/form-submit/[token]/route.ts` |
| 정기 발송 선점(중복 방지) | 구글폼 | `crm-google-form/lib/crm/followupDispatch.ts` |
| 수신자 명부(엑셀·그룹·중복·제외) | 카카오 | `kakao_auto_poster/src/lib/actions/broadcastRecipients.ts`, `src/lib/broadcastRecipients.ts`, `src/lib/duplicateGroup.ts` |
| 이메일 함께·대체 발송 | 카카오 | `kakao_auto_poster/src/lib/emailFallback.ts`, `src/lib/kakaoSend.ts` |
| 카카오 로그인(회원 앱)·공용 연동 기록 | 카카오 | `kakao_auto_poster/src/lib/kakao/account.ts`, `src/lib/kakao/memberAccount.ts` |
| 텔레그램 사전 검토 + 웹훅 비밀값 | 카카오 | `kakao_auto_poster/src/lib/telegramReview.ts`, `src/lib/telegram/webhookSecret.ts` |
| 회원 예약 실행 방식 | 공용 `member-scheduler`(기준 `cardnews-studio/src/lib/instagram/memberScheduler.ts`) | 각 폴더 `schedulerMember/` |
| 텔레그램 봇 연동 | 공용 `telegram-bot-client`(기준 `instagram-comment-reply/lib/telegram/client.ts`) | 각 폴더 `telegram/client.ts` |
| 30일 정리 기록 | 공용 `cleanup-usage-log` | 예: `real_estate_sales/src/lib/cleanupUsageLog.ts`(CRM 두 곳에는 아직 없음) |

## 5. 병합 방향 (분석 의견)

- 두 프로그램은 입력(외부 폼 vs 회원 명부)과 콘텐츠(고정 응대 문구 vs AI 리포트)가 달라 **독립 유지**가 맞다. 공통 부분은 이미 공용 사본이다.
- 프로그램 비교표 §3 「고객 응대·CRM」 묶음의 「한 고객 명부로 메일·문자·알림톡·카톡 채널 발송 통합」은 후보 아이디어다 — 고객 명부 공용 표를 만들면 §6 규칙(회원별 격리·기한 정리·동의 기록)을 한 곳에서 지킬 수 있지만, `stepmail`·`booking-reminder`까지 걸리는 큰 작업이라 주인님 결정 전에는 진행하지 않는다.
- 서로 가져올 만한 것: 카카오 → 구글폼 「발송제외 표시」·「명부 1건 삭제」, 구글폼 → 카카오 「발송 선점」(리포트 발송·텔레그램 승인).

## 6. 확장 로드맵·미배포 대기 (사실 아님 — 계획)

- 우선 처리 항목은 [CRM 통합 작업표](CRM_CONSOLIDATION_TASKS.md) 「우선 처리」를 따른다.
- 미배포 대기(문서 기록 기준): 구글폼 — 텔레그램 `allowed_updates`·`linkButton` 사본, 좁은 칸 버튼 줄바꿈(`f0871e568`), SOLAPI 공용 기준 주석. 카카오 — 좌측 계정 위치(`22c6cda35`), 좁은 칸 버튼(`f0871e568`), SOLAPI 사본, 텔레그램 사본. 카카오는 다음 배포 전에 Next.js 보안 업데이트가 필요할 수 있다(`docs/IMPROVEMENTS.md` 2026-10-23).

## 7. 변경 이력

- 2026-10-24 초안 작성(claude-win-dotori, 코드 검색 기준, 운영 DB·화면 미확인).
