# 아키텍처 — CRM Google Form

## 1. 구글폼 연동 설계 (핵심 결정 사항)

원본 Make.com 시나리오는 `google-forms:watchResponses` 모듈로 폼을 직접 폴링했다. 이건
Google 계정 하나(운영자 개인 계정)의 OAuth 연결로만 동작하는 방식이라 멀티테넌트 서비스에는
그대로 못 쓴다. 두 가지 대안을 검토해서 **"구글시트 연동 + Apps Script 웹훅"** 방식으로
결정함(2026-08-18, 사용자 확정):

| 방식 | Google OAuth 필요 | 실시간성 | 설정 난이도 |
|------|------|------|------|
| **채택: 구글시트+Apps Script 웹훅** | 불필요 | 진짜 실시간(웹훅) | 사용자가 스크립트 1회 복붙 |
| (기각) Google Forms API OAuth + 서버 폴링 | 필요 (민감 스코프, 앱 심사 가능성) | 폴링 주기만큼 지연 | OAuth 연동 UI 필요 |

### 왜 이 방식인가
- Telegram 연동(real_estate_sales, `docs/PLATFORM_PATTERNS.md` §9)과 같은 철학이다 — 우리가
  대신 인증을 처리하는 게 아니라, **사용자가 본인 자산(시트)에 우리가 준 코드를 직접 연결**한다.
- Google OAuth 앱 심사/스코프 검증이 전혀 필요 없다. shots의 YouTube 연동이 "민감 스코프라
  사용자가 본인 Google OAuth Client ID/Secret을 직접 등록해야 하는" 번거로운 구조인 것과 달리,
  이 방식은 애초에 OAuth를 안 쓴다.
- Apps Script는 사용자 본인 구글 계정 하에서 실행되므로 우리 서버는 아무 인증 없이 웹훅만
  받으면 된다 — music의 Suno 웹훅과 동일한 "외부 콜백 수신" 패턴을 재사용할 수 있다.

### 사용자 설정 흐름 (설정 페이지에 안내)
1. 설정 페이지에서 "폼 소스 추가" → 이름 입력 → 우리 서버가 `webhook_token`(랜덤 UUID)을
   발급하고, 웹훅 URL(`https://<도메인>/api/webhooks/form-submit/{webhook_token}`)과
   아래 Apps Script 코드를 화면에 보여준다.
2. 사용자가 자기 구글폼의 "응답" 탭 → 스프레드시트 아이콘으로 **연결된 시트 생성**.
3. 그 시트에서 **확장 프로그램 → Apps Script** 열고, 아래 코드를 붙여넣은 뒤 저장.
4. Apps Script 편집기에서 **트리거(시계 아이콘) → 트리거 추가** → 이벤트 유형
   "양식 제출 시(On form submit)"로 등록.
5. 폼에 테스트 응답을 1건 제출 → 우리 대시보드에 접수 내역이 뜨는지 확인(연동 확인 버튼 제공).

```javascript
// Apps Script — 스프레드시트에 바인딩해서 사용 (URL의 webhook_token만 사용자별로 다름)
function onFormSubmit(e) {
  var payload = {
    responseId: e.response ? e.response.getId() : Utilities.getUuid(),
    values: e.namedValues // { "질문 제목": ["답변"], ... }
  };
  UrlFetchApp.fetch("https://<도메인>/api/webhooks/form-submit/《설정 페이지에서 발급된 webhook_token》", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
```

- `e.namedValues`는 **질문 "제목" 텍스트를 키로** 쓴다 — 원본 Make 시나리오처럼 질문 ID 해시로
  매핑하지 않아도 돼서 폼 구조가 바뀌어도(질문 순서 변경 등) 매핑이 안 깨진다. 단, **질문 제목을
  바꾸면** 필드 매핑도 다시 해야 하므로, 설정 페이지에서 "필드 매핑"(질문 제목 → 이름/연락처/
  이메일 등 표준 필드) UI를 제공해서 사용자가 직접 연결하게 한다.
- 웹훅 라우트(`app/api/webhooks/form-submit/[token]/route.ts`)는 로그인 세션이 없는 진짜 외부
  콜백이므로 `checkProgramAccessApi()`를 못 쓴다. `webhook_token`이 `crm_form_sources` 테이블의
  실제 레코드와 매칭되는지로만 신뢰성을 확보한다(Suno 웹훅과 동일 원칙,
  `docs/PLATFORM_PATTERNS.md`에 이미 기록된 패턴).

## 2. 발송 채널별 설계

### 2-1. 이메일 — SMTP (stepmail 패턴 재사용)
원본은 Gmail API(`google-email:ActionSendEmail`, `from`이 응답자 이메일로 잘못 매핑돼 있던
그 단계)를 썼지만, Gmail API 발신은 OAuth 인증 계정으로만 가능해서(§ 원본 이슈 참고)
멀티테넌트로 그대로 옮기면 사용자마다 Google OAuth 연동이 또 필요해진다. 대신 stepmail이
이미 검증한 **사용자 본인 SMTP 계정 등록** 패턴을 그대로 재사용한다. 처음엔 이 프로젝트
전용 `crm_smtp_accounts`로 만들었다가, 사용자가 "stepmail에 이미 등록한 계정을 여기서
또 등록해야 하냐"고 지적해서 텔레그램(`user_telegram_links`)과 같은 철학으로 프로그램
접두어 없는 공용 테이블 **`user_smtp_accounts`**로 승격(rename)했다(2026-08-18,
`docs/PLATFORM_PATTERNS.md` §9 참고 — host/port/user/password 구조는 동일). 네이버 SMTP
동시연결 제한 등 트러블슈팅도 `docs/PLATFORM_PATTERNS.md`를 그대로 따른다.

### 2-2. SMS / 카카오 알림톡 / 카카오 친구톡 — SOLAPI (신규 provider)
SOLAPI는 이 저장소에서 처음 쓰는 provider다. 공식 Node.js SDK(`solapi` npm 패키지,
`SolapiMessageService`)를 그대로 쓴다 — HMAC-SHA256 서명 인증을 직접 구현하지 않고
SDK에 맡긴다(2026-08-18, https://solapi.com/developers 확인).

API 인증에 `apiKey`+`apiSecret` 두 값이 필요하고, 발신번호·카카오 채널(pfId)까지 얹으면
필드가 많아서 공용 `user_api_keys`(단일 문자열 구조)에 억지로 끼워 넣지 않는다. SMTP·
텔레그램과 동일한 철학으로 **처음부터 공용 테이블 `user_solapi_accounts`**
(user_id unique, api_key, api_secret, sender_phone, kakao_pf_id)로 설계했다 — 나중에
SMTP처럼 다시 승격하는 실수를 반복하지 않기 위함(§ PLATFORM_PATTERNS.md).

카카오 알림톡 템플릿(templateId)은 사용자가 SOLAPI 콘솔에서 사전 등록·승인받아야 하는
별도 심사 과정이 있어서, 우리 쪽에서 템플릿을 만들어주지 않는다 — 대신 `crm_form_sources`에
`kakao_template_id`(텍스트)와 `kakao_variables`(jsonb, `{"#{변수명}": "구글폼 질문 제목"}`)를
받아서, 접수 시점에 실제 응답값으로 변수를 채워 발송한다.

**카카오 친구톡은 2025-12-31부로 서비스가 종료**되어 2026-01-01부터 SOLAPI가 서버 측에서
자동으로 "브랜드 메시지(자유형)"로 대체 발송한다(SOLAPI 공지
https://solapi.com/notices/notices-2025-12-04). 기존 `type:"CTA"` 요청 코드를 그대로 써도
되므로(개발자 코드 변경 불필요), `lib/solapi/client.ts`의 `sendFriendtalk()`는 그대로
`type:"CTA"`를 명시하는 방식으로 구현했다.

### 2-2-1. RCS 프로모션 발송 (Phase 5)
SOLAPI가 `/msg` 페이지에서 소개한 RCS(3세대 문자, 브랜드 인증 로고+이미지+버튼으로 신뢰도가
높은 채널)를 프로모션 메시지용으로 추가했다. 다른 채널(이메일/SMS/알림톡/친구톡)이 전부
"접수 시점" 또는 "N일 후"처럼 자동 트리거 기반인 것과 달리, RCS는 **사용자가 화면에서 대상을
직접 골라 즉시 1회성으로 보내는 프로모션 발송**이라 규칙 테이블을 따로 두지 않고
`/promotions` 페이지 + `sendRcsPromotionAction()`으로 즉시 실행한다(자동화 규칙이 아니므로
DB에 영구 저장하지 않음, 발송 결과만 화면에 즉시 표시).

- `user_solapi_accounts`에 `rcs_brand_id`(SOLAPI 콘솔에서 사전 승인받는 RCS 브랜드 인증 ID)
  컬럼을 추가했다 — 카카오 채널(`kakao_pf_id`)과 동일한 성격(선택 사항, 해당 채널 쓸 사용자만
  등록).
- `sendRcs()`는 텍스트 길이(45자 기준)로 `RCS_SMS`/`RCS_LMS` 타입을 자동 분기한다.
- 대량 발송(실제 비용 발생)이라 서버 액션이 자동으로 실행되지 않고, 반드시 사용자가
  `/promotions` 화면에서 수신자를 체크박스로 선택하고 버튼을 눌러야만 발송된다(브라우저
  `confirm()`으로 한 번 더 확인).

### 2-3. 텔레그램 — 기존 공용 패턴 100% 재사용
`docs/PLATFORM_PATTERNS.md` §9에서 이미 범용으로 설계해둔 `user_telegram_links` 테이블과
`findChatIdFromUpdates()`/`sendTelegramMessage()`(real_estate_sales)를 코드 그대로 가져와
쓴다. real_estate_sales에서 이미 텔레그램을 연결한 회원은 이 프로그램에서 다시 연결할
필요 없이 바로 재사용된다(테이블이 프로그램 접두어 없이 설계된 이유).

### 2-4. 접수 후 팔로우업 자동화 (SOLAPI CRM 자동화 사례 벤치마킹)
SOLAPI `/crm` 페이지가 소개한 활용 사례(신규 고객 온보딩 — 가입 즉시 환영 → 3일 후 사용법
안내 → 7일 후 만족도 조사, 휴면 고객 재활성화 등)를 벤치마킹해서, 폼별로 "접수 후 N일 경과
시 자동 메시지" 규칙을 여러 개 등록할 수 있게 했다(2026-08-18). `crm_followup_rules`에
규칙(며칠 후, 어떤 채널, 어떤 메시지)을 저장하고, 매일 도는 Vercel Cron
(`app/api/cron/followup`, `vercel.json`에 `0 0 * * *` = KST 09:00 등록)이 조건에 맞는
접수건을 찾아 발송한다. 중복 발송 방지는 `crm_followup_sends`에 `(rule_id, submission_id)`
유니크 제약으로 처리한다 — 이미 보낸 건은 다시 안 보낸다.

**⚠️ 발견한 버그: Next.js Data Cache가 Supabase 조회 결과를 캐싱해서 cron이 오래된 데이터를
계속 반환하는 문제**(2026-08-18, 로컬 개발 서버에서 재현). Route Handler에
`export const dynamic = "force-dynamic"`만 선언해서는 supabase-js 내부 `fetch` 호출이
Next.js Data Cache에 걸리는 걸 완전히 막지 못했다 — 첫 요청 시점의 응답이 서버 프로세스가
살아있는 동안 계속 재사용됐다(개발 서버 재시작 전까지 재현). **`export const fetchCache =
"force-no-store"`를 명시적으로 추가**해야 매 요청 최신 데이터를 읽는다. cron과 웹훅
라우트, 그리고 이 프로젝트의 대시보드 페이지(`settings`/`sources`/`submissions`) 전부에
방어적으로 적용했다. Vercel Fluid Compute는 함수 인스턴스를 재사용하므로, 이 문제를 안
고치면 프로덕션에서도 warm 인스턴스가 오래된 데이터를 계속 반환할 수 있다 — **cron이나
웹훅처럼 "매번 최신 데이터가 필수인" 라우트를 만들 때는 항상 `fetchCache =
"force-no-store"`를 같이 선언할 것.**

## 3. DB 스키마 개요

- `crm_form_sources` — user_id, name, webhook_token(unique), field_mapping(jsonb: 질문제목→표준필드),
  notify_email/notify_telegram/notify_sms/notify_alimtalk/notify_friendtalk(boolean),
  kakao_template_id(text), kakao_variables(jsonb: `#{변수명}`→질문제목), created_at
- `crm_submissions` — user_id, form_source_id, raw_values(jsonb), name/phone/email(매핑 결과 추출),
  status(received/notified/failed), created_at
- `crm_followup_rules` — user_id, form_source_id, name, days_after, channel_*(boolean 4종),
  message_subject/message_text, kakao_template_id/kakao_variables, is_active
- `crm_followup_sends` — user_id, rule_id, submission_id(unique 조합으로 중복방지), status, sent_at
- `user_smtp_accounts` — 공용 테이블(프로그램 접두어 없음). user_id, label, host, port, user,
  password, from_name (원래 stepmail 전용이었다가 승격됨, § 2-1 참고)
- `user_solapi_accounts` — 공용 테이블(프로그램 접두어 없음, 처음부터). user_id unique, api_key,
  api_secret, sender_phone, kakao_pf_id, rcs_brand_id(Phase 5에서 추가)
- `user_telegram_links` — 공용 테이블(real_estate_sales가 원 소유), 그대로 재사용

전부 `user_id` + RLS owner-only 정책 적용(웹훅/cron 라우트만 `createAdminClient()`로 service
role 사용 후 `user_id` 기준 필터링).

## 4. 원본 시나리오에서 발견한 이슈 (이식 시 수정)

- 카카오 알림톡/친구톡 변수 치환에 "성함" 필드가 아니라 "연락처" 필드를 이름 자리에 그대로
  꽂아놓은 실수가 있었다 — 이식 시 필드 매핑 UI에서 사용자가 직접 어떤 필드를 어디에 쓸지
  고르게 해서 이런 실수 자체를 구조적으로 방지한다.
- 이메일 발신자(`from`)가 응답자 이메일로 매핑돼 있었는데, SMTP 방식에서는 발신자가 등록한
  SMTP 계정으로 고정되므로 이 문제 자체가 사라진다.
- 신청자에게 이메일+SMS+알림톡+친구톡을 전부 보내는 게 과할 수 있다는 지적 — 설정 페이지에서
  채널별로 켜고 끌 수 있게 한다(`crm_form_sources`의 notify_* 플래그, Phase 2~3에서 SMS/카카오용
  플래그 추가).
