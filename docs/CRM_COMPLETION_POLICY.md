# CRM 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** CRM 카테고리는 아직 담당 역할이 없다([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) §3). 담당 세션이 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「CRM」 카테고리 — `crm-google-form`(구글폼 CRM 자동화, 폴더 `crm-google-form/`, 코드 v1.16), `kakao-auto-posting`(카카오톡 뉴스레터 자동화, 폴더 `kakao_auto_poster/`, 코드 v1.30). 앞으로 만드는 고객 명부·신청 접수·문자/알림톡/친구톡·뉴스레터 발송 프로그램에도 적용한다. 같은 SOLAPI·이메일 발송을 쓰는 `stepmail`·`booking-reminder`는 카테고리가 다르지만 「고객 연락처」와 「발송」 부분은 이 기준을 참고한다.
- 관계 문서: [CRM 기능 상세 비교표](CRM_FEATURE_MATRIX.md) · [CRM 통합 작업표](CRM_CONSOLIDATION_TASKS.md) · [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md) · [예약 기능 지침](SCHEDULER_POLICY.md) · [회원 연동 정보](MEMBER_INTEGRATIONS.md) · [회원 연동 5단계(카카오 포함) 플랜](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md) · [핸드폰 필수 정책](PHONE_REQUIRED_POLICY.md).

## 1. 완성 흐름 (목표)

CRM 자동화의 완성 목표는 아래 흐름이 **회원 본인 발송 계정·본인 고객 명부로 끊기지 않고**, 고객(제3자)의 연락처를 안전하게 다루며 이어지는 것이다.

**고객 연락처 받기(구글폼 웹훅·직접 등록·엑셀) → 회원별 명부 저장(중복·발송제외 표시) → 발송 내용 준비(고정 문구·알림톡 템플릿·AI 뉴스레터) → 회원 확인(사전 검토·확인 창) → 채널별 발송(이메일·문자·알림톡·친구톡·RCS·텔레그램) → 결과 기록(성공·실패·대체 발송) → 정기 실행(회원이 고른 방식) → 보관 기한이 지난 연락처·기록 정리**

- 구글폼 CRM 흐름: 폼 연결(웹훅 주소 + Apps Script) → 접수 1건마다 접수 확인 발송 + 회원 텔레그램 요약 → 팔로우업 규칙(N일 뒤 재발송) → RCS 프로모션(회원이 고른 대상에게 즉시 1회).
- 카카오 뉴스레터 흐름: 관심 주제·키워드 등록 → Perplexity 수집 + AI 정리(당해 연도·오늘 날짜 기준) → 리포트 편집 → (선택) 텔레그램 사전 검토 → 본인(나에게 보내기·SOLAPI) + 수신자 목록 발송 → 공유 링크.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 계정·키로 발송**: 이메일(`user_smtp_accounts`), 문자·알림톡·친구톡·RCS(`user_solapi_accounts`), 텔레그램(`user_telegram_links`), 카카오 로그인 앱 키(`user_api_keys`의 `kakao_rest_api_key`·`kakao_client_secret`), AI 키(`user_api_keys`)는 모두 회원 본인 값만 쓴다. 없으면 발송·생성하지 않고 등록 안내를 띄운다. 운영자 솔라피 계정(`getOperatorSmsSender()`)은 메인 사이트 비밀번호 찾기 전용이며 CRM 발송에 쓰지 않는다([최상위 규칙 문서](TOP_RULE_PERSONAL_ACCOUNT_API.md) §8).
2. **고객 연락처 회원별 격리**: 고객 이름·핸드폰·이메일·폼 원본 답변이 들어가는 표는 `user_id` + 본인 전용 RLS를 갖고, 서버 키로 읽을 때도 코드에서 `user_id`로 거른다. 다른 회원·운영자와 명부를 공유·복사·합치지 않는다.
3. **고객 연락처 보관·삭제 규칙**(§6): 회원이 개별·일괄 삭제할 수 있고, 보관 기한이 지난 접수·발송 기록은 자동 정리되며 정리 건수를 회원별로 기록한다. 이 조건이 없으면 「완료」가 아니다.
4. **중복 발송 방지**: 같은 접수·같은 리포트·같은 규칙이 두 번 실행돼도 고객에게 한 번만 나간다(선점 기록·고유 제약·이미 보냄 확인). 유료 발송은 자동 재시도하지 않는다.
5. **수신 동의·수신거부 처리**(§7): 광고성 메시지는 수신 동의한 고객에게만, 표시 의무 문구를 붙여 보내고, 수신거부·발송제외된 고객은 모든 경로(자동·수동·정기)에서 빠진다.
6. **이용 권한 확인**: 화면·서버 액션은 `requireProgramAccess()`, 정기 실행과 외부 웹훅으로 시작되는 발송도 실행 직전에 회원의 정지·핸드폰·사용기간을 확인한다(`checkProgramAccess`).
7. **검수 증거**: 로컬 검사(tsc·시험) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인을 각각 기록한다. 실제 고객에게 나가는 발송은 사전 승인 대상이며, 본인 번호·본인 메일로만 시험한다. 누르지 않은 발송 버튼은 「미검수」로 적는다.
8. **문서 갱신**: 같은 작업에서 [CRM 기능 상세 비교표](CRM_FEATURE_MATRIX.md) 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 항목

회원이 고르지 않은 채널·대상·시점으로 발송하지 않는다.

| 항목 | 선택지 | 프로그램 | 근거 |
|---|---|---|---|
| 접수 확인 채널 | 이메일·텔레그램·문자·알림톡·친구톡(폼마다 켜기/끄기) | 구글폼 | `crm-google-form/lib/crm/dispatch.ts`, 표 `crm_form_sources.notify_*` |
| 고객 칸 연결 | 폼 질문 중 이름·핸드폰·이메일 칸 지정 | 구글폼 | `crm_form_sources.field_mapping`, `app/api/webhooks/form-submit/[token]/route.ts` |
| 팔로우업 규칙 | 규칙별 대기 기간·채널·켜기/끄기 | 구글폼 | `lib/actions/followupRules.ts`, `components/sources/FollowupRulesSection.tsx` |
| RCS 프로모션 대상 | 접수 내역에서 직접 고른 사람만 | 구글폼 | `lib/actions/promotions.ts` `sendRcsPromotionAction` |
| 뉴스레터 주제·조회 범위 | 3일·1주·2주·1개월·3개월, 키워드 칩 추가/삭제 | 카카오 | `kakao_topics.lookback_days`, `src/components/topics/TopicRow.tsx` |
| 예약 생성 주기·동작 시간대 | 주기·종일/특정 시간대, 기본 꺼짐 | 카카오 | `src/lib/schedule.ts` `isWithinActiveHours` |
| 발송 전 사전 검토 | 텔레그램 「카카오로 발행 / 발행 안 함」 | 카카오 | `src/lib/telegramReview.ts`, `src/app/api/telegram/webhook/[userId]/route.ts` |
| 발송 대상 그룹 | 전체 수신자 / 특정 그룹 | 카카오 | `kakao_topics.target_group_id`, `src/lib/kakaoSend.ts` |
| 이메일 함께·대체 발송 | ON(카카오 성공 시 함께, 실패 시 대체) / OFF | 카카오 | `user_solapi_accounts.email_dual_send_enabled` |
| 정기 실행 방식 | AIMaster 기본(Vercel) / 내 cron-job.org(회원 키) | 둘 다 | `lib/schedulerMember/`(구글폼), `src/lib/schedulerMember/`(카카오), [SCHEDULER_POLICY](SCHEDULER_POLICY.md) |

## 4. 하지 않을 것

- **운영자·다른 회원의 발송 계정·키로 대신 보내지 않는다.** 계정이 없으면 폴백하지 않고 등록 안내만 한다.
- **고객 명부를 회원 사이에 공유하거나, 운영자가 모아 쓰는 공용 명부를 만들지 않는다.** 「같은 고객이 다른 회원에게도 있다」는 정보도 보여 주지 않는다.
- **비공식 방식으로 카카오톡에 보내지 않는다.** 오픈채팅방 봇·리버스엔지니어링 발송은 계정 정지 위험이 있어 쓰지 않는다(카카오 `AGENTS.md` 설계 배경). 공식 경로(SOLAPI 알림톡·브랜드메시지·친구톡, 카카오 로그인 「나에게 보내기」, 카카오 JS SDK 공유)만 쓴다.
- **회원 확인 없이 대량 발송하지 않는다.** 선택 발송은 확인 창을 거치고, 정기 생성분은 회원이 켠 발송 설정 범위 안에서만 나간다.
- **지어낸 사실·과장 문구를 뉴스레터에 넣지 않는다.** 수집 프롬프트의 「확인되지 않은 내용을 지어내지 마세요」·「광고성 정보 배제」 지시를 유지한다(`kakao_auto_poster/src/lib/ai/collector.ts`).
- **유료 발송을 시간 초과·오류로 자동 재시도하지 않는다**(이중 요금).
- **고객 연락처를 로그·텔레그램·오류 메시지에 전체로 남기지 않는다.** 실패 기록은 끝 4자리 등으로 가린다(현재 예: `kakaoSend.ts` `recipient.phone.slice(-4)`).
- 공용 사본(`solapi/client.ts`·`telegram/client.ts`·`schedulerMember/memberScheduler.ts`·`programAccess.ts`)은 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.

## 5. 회원 본인 키 규칙 (CRM 적용)

- SOLAPI 계정(키·비밀값·발신번호·카카오 채널·RCS 브랜드)은 공용 `user_solapi_accounts` 한 줄을 모든 프로그램이 함께 쓴다. 프로그램마다 다시 등록하게 하지 않는다.
- 카카오 로그인(「나에게 보내기」)은 회원 본인이 만든 카카오 앱의 REST API 키·Client Secret으로만 연결한다(2026-09-16 전환, `kakao_auto_poster/src/lib/kakao/account.ts`). 연결 토큰은 공용 `member_platform_accounts`(platform `kakao`, 권한 `talk_message`)에도 기록돼 다음 프로그램이 재사용한다(회원 연동 5단계).
- 새 발송 플랫폼이 필요하면 프로그램 전용 표를 만들지 않고 공용 연동 항목(`integration_catalog`·`user_api_keys`·`member_platform_accounts`)에 추가한다.

## 6. 고객 연락처(개인정보) 저장·삭제 규칙 — 카테고리 지도 빈 칸 ①

CRM은 **회원이 아닌 제3자(고객)의 이름·핸드폰·이메일**을 다룬다. 최상위 규칙의 「생성 데이터 회원별 격리·30일 삭제」를 고객 연락처에 아래처럼 적용한다. 보관 기한·법적 판단이 필요한 부분은 주인님 결정 전 초안이다.

1. **저장 위치**: 회원별 표에만 둔다(현재 `crm_submissions`, `kakao_broadcast_recipients`, `kakao_broadcast_send_log`, `crm_followup_sends`). 모두 `user_id` + RLS를 유지한다.
2. **최소 수집**: 발송에 필요한 칸(이름·핸드폰·이메일)과 폼 원본 답변만 저장한다. 폼 원본(`raw_values`)은 화면 표시용이며 다른 용도로 가공·분석하지 않는다.
3. **보관 기한(초안 — 주인님 확인 필요)**: 
   - 구글폼 접수(`crm_submissions`)와 발송 기록(`crm_followup_sends`, `kakao_broadcast_send_log`)은 「일회성 수집 자료」로 보고 **생성일 기준 30일 뒤 자동 삭제**를 기본값으로 한다. 팔로우업 대기 기간보다 짧아지지 않게 규칙 최대 기간을 30일 이하로 두거나, 마지막 팔로우업 발송일 기준으로 센다.
   - 카카오 수신자 명부(`kakao_broadcast_recipients`)는 회원이 계속 쓰는 「구독자 명부」라 30일 자동 삭제가 맞지 않을 수 있다 — 「회원이 직접 지울 때까지 보관 + 일정 기간(예: 1년) 발송이 없으면 정리 안내」 같은 별도 기한을 주인님이 정한다.
4. **회원 삭제 기능**: 접수 1건·여러 건 삭제, 수신자 삭제(현재 있음), 「전체 명부 내보낸 뒤 비우기」를 제공한다. 폼 연결을 지우면 그 폼의 접수도 함께 지워진다는 사실을 화면에서 알린다(`on delete cascade`).
5. **고객 본인 요청**: 고객이 삭제·수신거부를 요청하면 회원이 바로 처리할 수 있는 버튼(수신자 삭제·발송제외)이 있어야 한다.
6. **정리 기록**: 자동 삭제 건수는 공용 `cleanup-usage-log` 사본으로 회원별 `usage_logs`에 남긴다(기준 예: `real_estate_sales/src/lib/cleanupUsageLog.ts`).
7. **회원 탈퇴**: 확인한 CRM 표는 `auth.users` `on delete cascade`라 탈퇴 시 함께 지워진다(마이그레이션 `crm-google-form/supabase/migrations/0001_crm_google_form_tables.sql`·`0004_followup_automation.sql`, `kakao_auto_poster/supabase/migrations/0008_broadcast_recipients.sql`·`0012_send_log_and_exclusion.sql`). 단 카카오 발송 기록(`kakao_broadcast_send_log`)은 수신자를 지워도 `on delete set null`로 남고 이름·번호 사본을 따로 갖는다 — 수신자 삭제가 발송 기록 속 연락처까지 지우지는 않는다.

## 7. 카카오·문자 발송 정책 — 카테고리 지도 빈 칸 ②

1. **채널 구분을 화면에서 분명히**: 알림톡(승인된 고정 템플릿, 채널 친구가 아니어도 도달), 브랜드메시지·친구톡(자유 문구, **채널 친구에게만** 도달 — 비친구 발송은 구독자 5만 명 이상 + 카카오 별도 허가), 카카오 로그인 「나에게 보내기」(회원 본인 채팅방만), 카카오톡 공유(회원이 직접 누를 때만). 카카오 `AGENTS.md` Phase 6·8의 정정 내용을 기준으로 한다.
2. **정보성과 광고성 구분**: 접수 확인·예약 안내처럼 고객이 요청한 거래 안내는 정보성, 프로모션·홍보·이벤트는 광고성이다. **광고성 메시지는**
   - 수신 동의를 받은 고객에게만 보낸다(동의 여부·동의 일시를 명부에 기록할 칸이 필요).
   - 문구 맨 앞에 「(광고)」, 끝에 무료 수신거부 방법을 붙인다(문자는 080 번호 등, 카카오는 채널 차단 안내).
   - 야간(21시~다음 날 8시)에는 별도 동의가 없으면 보내지 않는다.
   - 위 세 가지는 정보통신망법 광고성 정보 전송 규정에 따른 일반 원칙이며, **세부 해석(뉴스레터가 광고성인지 등)은 주인님·법률 확인 대상**이다.
3. **수신거부·발송제외는 모든 경로에 적용**: 자동 접수 확인, 팔로우업, 정기 리포트, 선택 발송, 알림톡·이메일 대체 발송 모두에서 제외 대상을 거른다(현재 카카오는 `kakao_broadcast_recipients.excluded`로 처리, 구글폼은 칸 없음).
4. **중복 발송 금지**: 같은 리포트를 같은 수신자에게 다시 보낼 때는 「이미 보냄(일시)」을 보여 주고 확인 창을 거친다. 텔레그램 승인 버튼처럼 두 번 눌릴 수 있는 곳은 상태를 먼저 선점한 뒤 보낸다.
5. **요금 안내**: 문자·알림톡·친구톡·RCS는 회원 SOLAPI 요금이 나간다는 안내를 발송 버튼 근처에 둔다(현재 구글폼 `/guide`에 문구 있음).
6. **웹훅 남용 방지**: 외부에서 들어오는 접수(구글폼 웹훅)는 본문 크기·횟수 제한과 같은 응답 중복 차단이 있어야 한다 — 주소가 새면 회원 요금으로 임의 번호에 발송될 수 있다.

## 8. AI 생성 원칙 (카카오 뉴스레터)

- 수집·정리 프롬프트에 **오늘 날짜(KST)를 넣어 당해 연도 기준**으로 만든다(현재 `collector.ts` `getTodayKoreanDateLabel()` — 날짜 문자열 주입. `getFullYear` 형태가 아니어도 연도가 포함되면 같은 효과).
- 인물 이미지가 나오면 기본은 한국인으로 묘사한다(현재 구현: 리포트 이미지 `src/lib/ai/reportImage.ts`의 「Korean/East Asian individuals by default」 지시).
- 이미지 생성은 공용 `gemini-image-client` 사본으로만 호출하고 프롬프트는 이 프로그램 고유로 둔다([IMAGE_PROMPT_RULES](IMAGE_PROMPT_RULES.md)).
- AI 리포트(`kakao_reports`)도 회원 생성 데이터이므로 30일 정리 대상이다. 공유 링크(`/share/[token]`)로 이미 밖에 나간 리포트를 지우면 링크가 끊긴다는 점을 화면에서 알린다.

## 9. 완성 보고 양식(CRM)

완성 보고에는 아래를 따로 적는다: 채널별 발송 확인(이메일·문자·알림톡·친구톡·RCS·텔레그램·카카오 로그인) — 본인 번호 시험인지 실제 고객인지 구분 / 중복 발송 방지 확인 / 수신거부·발송제외 적용 경로 / 고객 연락처 삭제·30일 정리 영향 / 회원 본인 계정·키 확인 / 정기 실행 방식 확인 / 비용 리포트(빌드·AI 호출·발송 요금, 누구 계정).
