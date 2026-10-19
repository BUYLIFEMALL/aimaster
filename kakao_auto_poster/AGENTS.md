# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **카카오톡 뉴스레터 자동화(kakao_auto_poster, 폴더/slug는 하위호환을 위해 그대로 유지)**
프로젝트에서 AI Agent(Claude Code 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.
(2026-09-08: 화면 표시 이름을 "카카오톡 정보 콘텐츠 자동화" → "뉴스레터 자동화" → "카카오톡
뉴스레터 자동화"로 변경 — `programs.name`과 앱 내 표시 문자열만 바뀌었고, 폴더명/
`programs.slug`(`kakao-auto-posting`)는 그대로다.)

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm` 등)
- 로컬 테스트 및 빌드 실행
- 스키마 추가/마이그레이션

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출** (Perplexity/OpenAI는 회원 본인 키로 소량 과금 발생)
5. **Vercel Cron 스케줄/활성화 변경** (Phase 3 도입 이후)

---

## 🎯 프로젝트 목적

회원이 관심 주제/키워드를 등록해두면, 관련 최신 뉴스·정보·정책·트렌드·분석 자료를 AI가
자동으로 찾아 정리한 뒤, 카카오톡 채널로 정기 발송해주는 프로그램입니다.

**설계 배경(2026-09-07)**: 처음엔 "카카오톡 오픈채팅방에 자동 포스팅"을 검토했으나, 조사
결과 카카오톡 **오픈채팅방**에는 외부 봇/webhook 연동용 공식 API가 존재하지 않는다(카카오톡
채널의 오픈빌더도 채널에만 연동되고 오픈채팅방엔 연동 안 됨). 비공식(리버스엔지니어링)
방식은 계정 정지 위험이 있어 이 저장소의 "공식 API + BYOK만 사용" 원칙과 맞지 않아 배제했다.
대신 **카카오톡 "채널"** 메시지 발송(친구톡→브랜드메시지/알림톡)은 공식 API로 지원되고,
AIMaster의 여러 서브프로젝트(trending-product-finder, crm-google-form, booking-reminder,
real_estate_sales)가 SOLAPI 경유로 이미 실사용 검증까지 마쳤다. 그래서 이 프로젝트는
**카카오톡 채널 발송**을 실제 배포 채널로 삼는다. 오픈채팅방은 (원한다면) 채널 링크를
공유하는 안내 용도로만 쓸 수 있다.

**재사용 원조 패턴**:
- 콘텐츠 수집+생성 파이프라인: `insta_auto_poster`의 "주제 등록 → Perplexity 수집 → AI
  구조화" 패턴(`src/lib/ai/collector.ts`)을 그대로 가져와 SNS 캡션이 아닌 뉴스/정보 톤으로
  프롬프트만 바꿨다.
- 카카오 채널 발송: `trending-product-finder`/`crm-google-form`이 만든 공용
  `user_solapi_accounts` 테이블 + `lib/solapi/client.ts`(`sendFriendtalk`/`sendAlimtalk`)를
  Phase 2에서 새 마이그레이션 없이 그대로 재사용할 예정이다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `kakao_auto_poster/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 이 폴더 내에서 개발 및
  관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

kakao_auto_poster는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug =
  "kakao-auto-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의
  계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route(Phase 3 크론
  등)는 redirect 대신 결과 객체를 반환하는 `checkProgramAccessApi()`로 로그인 여부뿐 아니라
  프로그램 이용 권한까지 확인한다. **이 둘을 쓰는 모든 layout.tsx/route.ts에는
  `export const dynamic = "force-dynamic"`과 `export const fetchCache = "force-no-store"`
  두 줄을 반드시 같이 선언한다** — 누락 시 Vercel 정적 캐싱으로 권한 체크가 무력화되는 버그가
  있다(`docs/PLATFORM_PATTERNS.md` §10 참고).
- 사용자 소유 데이터 테이블(`kakao_topics`, `kakao_reports`)은 `user_id` + RLS owner-only
  정책으로 격리한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `openai`/`anthropic`(택1)/`gemini`(예비)/`perplexity`(필수)를
  쓴다. Phase 2부터는 공용 `user_solapi_accounts`(카카오 채널 발송), Phase 3부터는 공용
  `user_telegram_links`(카카오 발행 전 사전 검토, `program_slug='kakao-auto-posting'`)도
  함께 쓴다.
- **카카오 로그인("나에게 보내기")도 2026-09-16부터 BYOK로 전환됨**: 예전엔
  `KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET` 환경변수(앱 공용 카카오 앱)로 OAuth를 했으나,
  그 앱이 카카오의 "비즈니스 앱 전환" 심사를 받지 않은 동안은 앱의 테스터로 등록된 계정
  (운영자 본인)만 로그인을 완료할 수 있는 문제가 있었다(threads의 meta_app_id 전환과 동일한
  원인). 회원마다 본인이 만든 카카오 앱의 REST API 키/Client Secret을 설정 페이지에서
  `user_api_keys`(`kakao_rest_api_key`/`kakao_client_secret`, 마이그레이션
  `0018_kakao_login_byok.sql`)에 등록하고 `resolveKakaoAppCredentials()`(`lib/kakao/account.ts`)로
  조회해서 쓰는 방식으로 바꿨다(`lib/kakao/client.ts`가 `restApiKey`/`clientSecret`을
  파라미터로 받음). `KAKAO_REDIRECT_URI`(콜백 주소, 회원과 무관하게 고정)만 env var로 남고
  `KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET`은 더 이상 코드에서 읽지 않는다. 전환 전 이미
  연동된 기존 `user_kakao_accounts` 토큰은 삭제하지 않아 access_token이 살아있는 동안은 계속
  동작하지만, refresh가 필요해지는 시점부터는 본인 앱 등록이 있어야 갱신되고(없으면
  SOLAPI 경로로 자동 폴백), 재연결도 본인 앱 등록이 선행돼야 한다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 프로젝트 뼈대, 관심 주제/키워드 등록(`kakao_topics`), Perplexity 기반 "지금 생성" 수동 버튼, 생성된 콘텐츠(`kakao_reports`)를 보는 웹 리포트 페이지 | ✅ 구현 완료, **실계정 검증 완료**(2026-09-10 DB 확인: 주제 2개 등록, 리포트 3건 실제 생성됨) |
| 2 | 설정 페이지에 카카오 채널(SOLAPI) 연동 섹션 추가(`user_solapi_accounts` 공용 테이블 재사용), 리포트 상세 페이지에 "💬 카카오로 발송" 버튼(`sendReportToKakaoAction`) — 수신 번호는 `profiles.phone`(trending-product-finder Phase 10과 동일 패턴) | ✅ 구현 완료, **실계정 검증 완료**(2026-09-10 DB 확인: SOLAPI 연동됨, `kakao_reports.kakao_sent_at` 성공 기록 존재) |
| 3 | ① 날짜 앵커링 수정 — `lib/ai/collector.ts`가 Perplexity/OpenAI 프롬프트에 오늘 날짜(KST)를 명시적으로 주입해 학습 데이터 시점을 "현재"로 착각하는 문제 해결. ② 데이터 조회 범위 회원 선택(`kakao_topics.lookback_days`, 3일/1주/2주/1개월/3개월, `TopicForm`/`TopicRow` UI). ③ 예약(정기 자동 생성) on/off — `kakao_topics.schedule_enabled`/`interval_minutes`/`last_run_at`, 기본값 꺼짐, 5분 tick 크론(`/api/cron/generate-reports`, `vercel.json` 등록). ④ 카카오 발송 전 텔레그램 사전 검토 — 공용 `user_telegram_links` 재사용, 리포트 생성 시(수동/예약 모두) 텔레그램으로 "✅ 카카오로 발행/❌ 발행 안 함" 인라인 버튼 발송(`lib/telegramReview.ts`, `app/api/telegram/webhook/[userId]/route.ts`), 텔레그램 미연동 시 기존처럼 웹 화면에서만 수동 발송 | ✅ 구현 완료, **예약 자동 생성 실계정 검증 완료**(2026-09-10 DB 확인: `kakao_topics.last_run_at`이 24시간 주기로 실제 갱신 중, 텔레그램도 연동돼 있음). 다만 텔레그램 인라인 버튼으로 실제 "발행/거부"를 눌러보는 조작까지는 미확인 |
| 4 | 카카오 로그인("나에게 보내기" 무료 API) 연동 추가 — 회원이 카카오톡 채널 개설/SOLAPI 계정 없이 카카오 로그인 동의 1회만으로 본인 "나와의 채팅방"으로 리포트를 받을 수 있다. 기본 템플릿(피드형)에 제목/요약/링크를 매번 JSON으로 동적으로 채워 넣는 방식이라 콘솔에서 템플릿을 미리 만들어둘 필요가 없다(`lib/kakao/client.ts`의 `sendReportMemoToMe`). `lib/kakaoSend.ts`가 `user_kakao_accounts` 연동이 있으면 이 채널을 우선 사용하고, 없으면 기존 SOLAPI 경로로 자동 전환한다 — SOLAPI 방식을 대체하는 게 아니라 진입장벽 낮은 대안으로 나란히 제공 | ✅ 구현 완료, **실계정 검증 완료**(2026-09-10 확인: 카카오 개발자 앱 등록 및 Vercel 환경변수 `KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET`/`KAKAO_REDIRECT_URI` 등록 완료, `user_kakao_accounts`에 access_token 보유한 연동 1건 확인). refresh_token 장기 만료 시나리오는 여전히 미확인 |
| 5 | ① 예약 자동 생성에 "동작 시간대"(종일/특정 시간대만) 추가 — `kakao_topics.active_hour_start/end`, `lib/schedule.ts`의 `isWithinActiveHours`/`currentKstHour`(real_estate_sales MonitoringSettings.tsx·trending-product-finder Phase 14/18과 동일 패턴), 크론(`generate-reports`)이 due 판정에 함께 반영. ② 예약 설정 UI를 자동저장 방식(MonitoringSettings.tsx와 동일 — 토글/셀렉트 변경 즉시 저장, 별도 "저장" 버튼 없음)으로 전환. ③ 주제 안의 키워드를 개별로 추가/삭제하는 기능(`updateTopicKeywordsAction`, 칩+×, trending-product-finder Phase 20과 동일 패턴) — 전에는 키워드 하나를 빼려 해도 주제 전체를 삭제하고 재등록해야 했다. ④ 리포트 알림 채널에 이메일(SMTP) 추가 — 공용 `user_smtp_accounts` 재사용(`lib/email/transport.ts`, `SmtpAccountSection.tsx`), 예약 자동 생성분에만 발송(수동 "지금 생성"은 이미 화면을 보고 있어 제외 — trending-product-finder Phase 10과 동일 판단). 카카오(카카오 로그인/SOLAPI)·텔레그램은 이미 "연동=on, 연동 해제=off"로 채널 켜고 끄기가 되어 있어 추가 작업 없이 이메일만 새로 붙였다 | ✅ 구현 완료, SMTP 계정 2개 연동 확인(2026-09-10 DB 확인). 단 **이메일이 실제로 수신함까지 도착하는지는 여전히 미확인**(추적 컬럼이 없어 DB로는 발송 성공 여부를 볼 수 없음 — 직접 받은 편지함을 확인해야 함) |
| 6 | 카카오톡 수신자 목록 브로드캐스트 — 회원이 설정 페이지에서 전화번호(+메모)를 여러 개 등록해두면(`kakao_broadcast_recipients`, `BroadcastRecipientsSection.tsx`), 리포트를 본인 알림(카카오 로그인/SOLAPI)과는 별개로 그 번호들에도 함께 발송한다(`lib/kakaoSend.ts`의 `broadcastReportToRecipients`). **정정(2026-09-09, SOLAPI 공식 문서 재확인)**: 처음엔 "브랜드메시지는 채널 친구가 아니어도 도달 가능"이라고 잘못 판단했는데, 실제로는 기본값(`targeting: 'I'`)이 **채널 친구에게만** 발송되고, 비친구 대상(`M`/`N`)은 채널 구독자 5만 명 이상 + 카카오 별도 인허가가 있어야만 가능하다. 그래서 (a) `user_solapi_accounts.channel_friend_url`(공개 채널 친구추가 링크, `pf.kakao.com/_xxxx` 형태 — 인증용 내부 `kakao_pf_id`와는 다름)을 추가해 수신자 등록 화면에 "먼저 채널 친구 추가해달라" 안내 링크를 보여주고, (b) `user_solapi_accounts.alimtalk_template_id`(회원이 직접 승인받은 알림톡 템플릿, 변수명 `#{title}`/`#{url}`로 등록 필요)를 등록해두면 채널 친구 여부와 무관하게 도달하는 알림톡으로 대체 발송하도록 분기했다. 카카오톡 "공유하기"(카카오링크)는 서버 자동 발송이 불가능(REST API 없음, 사용자가 직접 버튼을 눌러야만 동작)해서 배제했고, "카카오톡 소셜-친구에게 메시지 보내기" API는 앱에 로그인한 회원끼리만(하루 30건 제한, 별도 심사 필요) 가능해 불특정 다수 배포에 부적합해 배제했다. 본인 알림과 수신자 발송은 결과를 각각 별도 컬럼(`kakao_reports.kakao_sent_at`/`kakao_send_error` vs `broadcast_sent_at`/`broadcast_error`)으로 추적해 한쪽이 실패해도 다른 쪽 성공 여부에 영향 없다 | ✅ 구현 완료, **실계정 검증 완료**(2026-09-10 DB 확인: 수신자 365명 등록됨, 최근 예약 자동 생성 리포트의 `broadcast_sent_at` 성공 기록 확인 — 단, 현재는 알림톡 템플릿 미등록 상태라 채널 친구가 아닌 사람에게는 여전히 도달하지 않는다) |
| 6-1 | 수신자 목록 UX 개선 — ① 수신자를 엑셀 양식(`/api/broadcast-recipients/template`)으로 다운로드해 채운 뒤 업로드(`parseBroadcastRecipientsWorkbook`)하거나 텍스트로 붙여넣어(`addBulkBroadcastRecipientsAction`) 한 번에 최대 500명까지 일괄 등록 가능 — stepmail의 리드 엑셀 가져오기(`app/api/leads/template`, `lib/leads.ts`)와 동일한 패턴. 전화번호는 엑셀이 숫자로 인식해 맨 앞 0을 지우는 문제(`normalizePhone()`)를 자동 복구. ② 삭제 버튼 옆 "수정"으로 이름/전화번호를 바로 고치는 인라인 편집(`updateBroadcastRecipientAction`) 추가. ③ 수신자를 그룹으로 묶어 관리(`kakao_broadcast_groups` 신규 테이블, `group_id` 컬럼)하고 행마다 드롭다운으로 그룹 간 이동(`moveBroadcastRecipientGroupAction`) 가능, 상단 탭으로 그룹별 필터링. 그룹 삭제 시 수신자는 삭제되지 않고 미분류로 복귀(on delete set null). ④ 수신자가 많아지면 화면이 길어진다는 피드백으로 설정 페이지에서 사이드바 전용 페이지(`/recipients`)로 분리 | ✅ 구현 완료 |
| 6-2 | 검색/다중선택/즉시발송/발송제외/발송내역 — ① 이름·전화번호 검색, 체크박스 다중 선택 후 그룹 일괄 이동(`moveManyBroadcastRecipientsGroupAction`, crm-google-form의 PromotionSendForm과 동일한 다중선택 패턴). ② 선택한 사람에게 자유 메시지를 즉시 발송하는 기능(`sendCustomBroadcastAction`, `lib/actions/broadcastSend.ts`) — 알림톡은 고정 템플릿만 가능해 브랜드메시지(자유형)로만 보낸다. ③ 수신이 안 되는 사람을 발송제외 처리(`kakao_broadcast_recipients.excluded`, stepmail 리드의 "발송제외 처리"와 동일 개념) — 제외되면 리포트 자동 발송(`broadcastReportToRecipients`)과 수동 발송 양쪽 대상 조회에서 걸러지고, 체크박스도 비활성화된다. ④ 수동 발송 결과를 `kakao_broadcast_send_log`에 기록해 좌측 메뉴 "발송 내역"(`/broadcast-log`, 최근 200건)에서 조회 가능 — 리포트 자동 발송 결과는 기존처럼 리포트 상세 화면에서 확인(이 로그의 대상이 아님) | ✅ 구현 완료 |
| 7 | HTTP/RSS 소스 추가, `programs` 등록 확인(4단계 기본 요금제는 관리자 화면 `ProgramForm.tsx`의 `DEFAULT_PLANS`가 자동 처리) | ⏸️ 예정 |
| 8 | ① 메시지를 "두 그룹"으로 명확히 분리 — 자유 문구 발송(브랜드메시지, 채널 친구만 도달)과 정보 콘텐츠 발송(알림톡, 고정 템플릿, 비친구도 도달)이 서로 다른 제약을 가진다는 걸 사용자가 헷갈리지 않도록, 수신자 목록 화면의 선택 액션바에 "📤 자유 메시지 발송"과 "📨 알림톡으로 리포트 발송" 두 버튼을 나란히 두고 각각 안내 문구를 붙였다(사용자 지시, 2026-09-10). 알림톡 버튼은 자유 문구 입력란 없이 이미 생성된 리포트 중 하나를 골라 제목/URL만 템플릿 변수(`#{title}`/`#{url}`)에 채워 발송한다(`sendReportAlimtalkToRecipientsAction`) — 알림톡 템플릿이 등록되지 않았으면 버튼 대신 안내 문구만 보여준다. ② 수신자에 이메일(선택) 필드 추가(`kakao_broadcast_recipients.email`, 단건/일괄/엑셀 등록·수정 전부 지원) — 카카오톡 발송(브랜드메시지/알림톡)이 **실패했을 때만** 그 이메일로 대체 발송한다(`lib/emailFallback.ts`의 `sendEmailFallback`, 항상 이중 발송하지 않음, 이메일 발송 계정은 회원 본인의 `user_smtp_accounts`를 재사용 — 관리자 공용 계정 폴백 없음). 예약 자동 발송(`broadcastReportToRecipients`)·자유 메시지 발송(`sendCustomBroadcastAction`)·알림톡 리포트 발송 세 경로 모두에 동일하게 적용했다. ③ 발송 내역(`kakao_broadcast_send_log`)에 `channel`('brand'/'alimtalk')과 `fallback_email`(이메일로 대체됐는지) 컬럼 추가 | ✅ 구현 완료, 미검증(실계정으로 알림톡 실제 발송, 카카오 실패 시 이메일 대체 발송이 실제로 되는지 확인 필요 — 알림톡 템플릿이 아직 미등록 상태라 알림톡 자체도 아직 실사용 못 함) |

| 9 | 전화번호 없이 이메일만으로도 수신자 등록 가능(`kakao_broadcast_recipients.phone`을 nullable로 변경 + "전화번호 또는 이메일 중 하나는 필수" DB check 제약, `0014_email_only_recipients.sql`) — 카카오톡 채널 없이 이메일로만 정보성 콘텐츠를 받고 싶은 사람을 위한 경로다(사용자 지시, 2026-09-10). 단건/일괄 텍스트("이름,전화번호,이메일" — 전화번호 자리를 비우면 이메일 전용)/엑셀 등록·수정 모두 지원. 수신자 목록 필터에 "이메일 전용" 탭 추가(전화번호 없고 이메일만 있는 사람). ① 기존 카카오 발송 세 경로(예약 자동 발송/자유 메시지 발송/알림톡 리포트 발송)는 전화번호가 없는 대상을 만나면 카카오 시도 자체를 건너뛰고 곧장 이메일로 보낸다(이메일이 있으면). ② 신규 "📧 이메일로 리포트 발송" 버튼(`sendReportEmailToRecipientsAction`) 추가 — 알림톡 버튼과 같은 구조(자유 문구 없이 리포트 선택 후 발송)이지만 카카오의 대체가 아니라 이메일이 주 발송 경로다. 회원 본인의 `user_smtp_accounts`가 있어야 버튼이 노출된다(없으면 안내 문구만 표시). ③ `kakao_broadcast_send_log.recipient_phone`을 nullable로, `recipient_email` 컬럼 추가 — 발송 내역 화면에 채널 배지(브랜드메시지/알림톡/이메일)와 이메일 대체 여부 표시 | ✅ 구현 완료, 미검증(실계정으로 이메일 전용 등록 후 실제 이메일 발송, 전화번호 있는 대상의 카카오 실패 시 자동 이메일 전환까지 확인 필요) |

| 10 | 대량등록(엑셀/텍스트 붙여넣기) 시 전화번호나 이메일 중 하나라도 기존 수신자와 겹치면 조용히 건너뛰지 않고 "중복등록" 그룹을 자동 생성해(`lib/duplicateGroup.ts`의 `findOrCreateDuplicateGroupId` — 이미 같은 이름 그룹이 있으면 재사용) 그 그룹으로 분류해서 등록한다. 회원이 직접 "중복등록" 필터 탭에서 확인하고 삭제 여부를 판단할 수 있다(사용자 지시, 2026-09-10: "중복등록 그룹을 자동으로 만들고 사용자가 직접 삭제여부를 결정할 수 있게"). 일괄 등록 결과 목록에 중복 여부를 성공/실패와 별개로 색상 구분(주황색)해서 보여준다. 엑셀 안으로 자체(같은 파일 안 중복)는 기존처럼 `parseBroadcastRecipientsWorkbook`이 조용히 첫 건만 남기고, 이 기능은 "이미 DB에 있는 기존 수신자와 겹치는 경우"만 대상으로 한다 | ✅ 구현 완료, 실계정 검증 완료(로컬에서 기존 수신자와 전화번호가 겹치는 줄을 붙여넣어 "중복등록" 그룹 자동 생성 및 필터링까지 확인) |

| 11 | 카카오 발송 시 이메일을 함께/대체로 쓸지 회원이 직접 켜고 끄는 토글 추가(`user_solapi_accounts.email_dual_send_enabled`, `0015_email_dual_send_toggle.sql`, 기본값 ON) — 수신자 목록 선택 액션바의 "📤 자유 메시지 발송" 버튼 바로 옆에 같은 자리에 ON/OFF 버튼(`setEmailDualSendEnabledAction`)을 두었다(사용자 지시, 2026-09-10). ON이면 전화번호가 있는 수신자에게 카카오 발송이 **성공해도** 이메일이 등록돼 있으면 이메일을 함께 보내고, 카카오 발송이 **실패하면** 이메일로 대체 발송한다. OFF면 이 자동화 발송 경로들(예약 자동 발송/자유 메시지 발송/알림톡 리포트 발송)에서 이메일을 전혀 건드리지 않고 카카오만 시도한다. 전화번호 없는 이메일 전용 수신자는 이 토글과 무관하게 항상 이메일로 받는다(애초에 카카오 발송 자체가 없으므로). "📧 이메일로 리포트 발송"(전화번호 없이 이메일만으로 보내는 별도 기능)은 이 토글의 영향을 받지 않는다 — 완전히 독립적인 이메일 전용 경로이기 때문. 이 버튼은 초록색(`Button`의 신규 `success` variant)으로 스타일하고, 그 오른쪽에 구분선(`\|`)을 두어 "이메일 함께 발송 ON/OFF"(카카오 보조 채널)와 "이메일로 리포트 발송"(이메일 단독 채널)이 서로 다른 기능임을 시각적으로 분리했다. SOLAPI 계정이 없으면 토글 버튼 대신 안내 문구만 보여준다(계정이 있어야 켤 대상이 있으므로) | ✅ 구현 완료, 실계정 검증 완료(로컬에서 토글 ON→OFF→ON 전환 시 DB `email_dual_send_enabled` 값이 실제로 바뀌는 것까지 확인) |

| 12 | 회원이 원하는 채팅방에 리포트를 직접 공유하는 기능(카카오톡 "공유하기", Kakao JS SDK) 추가 — 기존 Phase 2/4/6의 자동 발송(SOLAPI/카카오 로그인/알림톡)은 전부 "정해진 대상에게 서버가 자동으로 보내는" 방식이라, "그때그때 원하는 채팅방을 직접 골라 공유"하는 방식과는 성격이 다르다(사용자 지시, 2026-09-15: "생성된 컨텐츠를 카카오톡 공유 기능으로 원하는 채팅방에 공유하고 싶어"). mbti/mbti-character에서 실기기까지 검증한 `Kakao.Share.sendDefault()` 패턴을 그대로 가져왔다. 받는 사람이 AIMaster 회원이 아니어도 로그인 없이 내용을 바로 읽을 수 있어야 한다는 것도 사용자의 명시적 요구사항이라(`report_id`를 그대로 노출하는 로그인 필요 페이지로는 불충분), 별도 `share_token`(uuid, `0016_report_share_token.sql`)으로만 접근하는 공개 읽기 전용 페이지(`/share/[token]`)를 새로 만들었다 — RLS를 anon에 풀어주는 대신 admin(service role) 클라이언트로 서버 라우트 자체가 유일한 공개 진입점이 되도록 설계했다(테이블 전체가 anon 키로 노출되는 것을 방지). 카카오톡 Feed 템플릿의 `content.imageUrl`은 사실상 필수라, 리포트에 회원이 직접 삽입한 이미지가 없어도 항상 보여줄 브랜드 카드를 텍스트만으로 동적 생성하는 `/api/og`도 함께 추가했다(Gemini 유료 생성 없음, mbti/mbti-character와 동일 패턴). 이후 실배포·실기기 검증까지 완료(카카오 개발자 콘솔 "플랫폼 키 > JavaScript SDK 도메인"에 도메인 등록 누락으로 "요청 실패" 에러가 한 번 났었는데, 등록 후 정상 공유 확인) + 본문에 이미지가 있는 리포트는 그 이미지를 카카오 카드/링크 미리보기에 우선 사용하도록 개선(`extractFirstImageUrl()`) | ✅ 구현 완료, **실계정 검증 완료**(2026-09-15) |
| 13 | 예약 리포트(카카오톡) 발송 대상을 "전체 수신자"가 아니라 특정 그룹으로 좁히는 기능 추가 — 수신자 중 전화번호만 등록된 사람/이메일만 등록된 사람이 섞여 있고, 그룹(드림팀/무료특강 등)으로 이미 분류해뒀는데 예약 발송은 항상 전체에게만 나가던 것을 사용자가 지적(2026-09-15: "그룹을 선택해서 특정 그룹에 속한 사람들에게만 발송하게 하는 기능을 구현하고 싶어"). `kakao_topics.target_group_id`(uuid, `0017_topic_target_group.sql`, null이면 기존과 동일하게 전체) 컬럼을 추가하고, 주제 카드의 "🔔 예약 리포트 알림" 패널에 "발송 대상" 그룹 셀렉트를 넣었다. `lib/kakaoSend.ts`의 `sendReportToKakaoCore()`가 리포트 → 주제 → target_group_id를 조회해 `broadcastReportToRecipients()`에 전달하므로, 카카오 채널 즉시 발송·텔레그램 승인 발행·리포트 화면 수동 발송 세 경로 전부 이 설정을 일관되게 따른다(본인 알림에는 영향 없음, 수신자 목록 발송에만 적용) | ✅ 코드 구현 완료, 로컬 빌드/lint 통과 — **아직 미배포·실계정 미검증**(아래 미검증 항목 참고) |

## ⚠️ 미검증 항목 (실사용 전 반드시 확인)

**2026-09-10 전수 점검**: 아래는 실제 DB(`kakao_topics`/`kakao_reports`/`user_*` 연동 테이블)와
Vercel 프로덕션 환경변수를 직접 조회해서 확인한 결과다 — 그 결과 이전 버전의 이 섹션에 있던
"미검증" 표시 대부분이 이미 실계정으로 검증된 상태임이 확인돼 위 Phase 표에 반영했다(Phase
1·2·3·4·6). 아래는 그 점검에서도 **여전히 확인되지 않은** 항목만 남긴 것이다.

- **Phase 5 이메일(SMTP) 실제 도착 여부**: `user_smtp_accounts` 연동 자체는 2개 확인했지만,
  예약 자동 생성분이 실제로 그 계정 받은편지함까지 도착하는지는 DB 추적 컬럼이 없어 확인할
  방법이 없다 — 다음 예약 실행 후 실제 메일함을 확인해볼 것.
- **Phase 3 텔레그램 인라인 버튼 조작**: 텔레그램 연동과 리포트 생성 시 알림 발송 자체는
  확인했지만, "✅ 카카오로 발행/❌ 발행 안 함" 버튼을 실제로 눌러 발행/거부가 반영되는지는
  아직 조작해보지 않았다.
- **Phase 4 refresh_token 장기 만료 시나리오**: 카카오 access_token은 짧게(몇 시간) 만료되고
  refresh_token으로 자동 갱신하도록 구현했지만(`lib/kakao/account.ts`), 실제 refresh_token
  만료 주기(카카오 콘솔 설정에 따라 다름)에 걸친 장기 동작(회원이 오래 방치했다가 다시 발송을
  시도하는 시나리오)은 아직 검증하지 못했다.
- **Phase 6 알림톡 비친구 도달**: 알림톡 템플릿이 아직 승인·등록되지 않은 상태라, 채널을
  친구 추가하지 않은 수신자에게는 여전히 브랜드메시지가 도달하지 않는다. 알림톡 템플릿을
  승인받아 등록한 뒤 비친구 실제 번호로 도달을 확인할 것.
- **Phase 7**: HTTP/RSS 소스 추가는 아직 착수 전이다.
- **Phase 8 알림톡 리포트 발송**: 알림톡 템플릿이 아직 미등록 상태라 실제 발송 자체를
  테스트하지 못했다(버튼도 아직 화면에 노출되지 않음). 템플릿 승인 후 확인할 것.
- **Phase 8/9 이메일 대체·전용 발송**: `sendEmailFallback`/`sendReportEmailToRecipientsAction`
  둘 다 실제 발송 API를 호출해보지 않았다(비용이 발생하는 실제 발송이라 사전 확인 없이
  트리거하지 않음) — UI 등록/필터/패널 노출까지만 로컬에서 확인했다. 실사용 전 (1) 카카오
  발송이 실패하는 대상에게 실제로 이메일 대체 발송이 오는지, (2) "이메일 전용" 필터로 고른
  이메일 전용 수신자에게 "📧 이메일로 리포트 발송" 버튼으로 실제 리포트 이메일이 도착하는지
  반드시 확인할 것.
- **Phase 11 이메일 함께 발송 ON/OFF**: 토글 자체가 DB에 정상 저장되는 것은 확인했지만,
  실제로 카카오 발송이 성공했을 때 ON 상태에서 이메일이 진짜로 함께 도착하는지는 아직
  실계정으로 확인하지 못했다(비용이 발생하는 실제 발송이라 사전 확인 없이 트리거하지
  않음). 실사용 전 ON 상태로 카카오 발송 성공 케이스에서 이메일이 동시에 오는지 확인할 것.
- **Phase 12 카카오톡 공유는 실계정 검증 완료**(2026-09-15) — 실제로 "플랫폼 키 > JavaScript
  SDK 도메인"에 `kakaoautoposter.vercel.app` 등록이 빠져 있어 "요청 실패(잘못된 요청으로
  인증에 실패)" 에러가 실제로 발생했었다. "제품 링크 관리 > 웹 도메인"만 등록하고 이쪽을
  빠뜨리기 쉬우니, 앞으로 새 도메인에 카카오 공유를 붙일 때는 **반드시 이 두 화면 모두**
  확인할 것. 등록 후 실제 채팅방 공유 → 카드 클릭 → `/share/[token]` 로그인 없이 열람까지
  확인 완료.
- **Phase 13 발송 대상 그룹 좁히기**: 코드 구현과 로컬 빌드만 확인했고, 아직 실계정으로
  그룹을 지정해 카카오 발송을 실제로 트리거해보지 않았다. 배포 후 (1) 특정 그룹을 골라
  저장하면 `kakao_topics.target_group_id`가 정상 반영되는지, (2) 그 상태로 "지금 생성" +
  카카오 채널 ON으로 발송했을 때 실제로 그 그룹 소속 수신자에게만 나가고 다른 그룹/미분류는
  제외되는지, (3) "전체 수신자"로 되돌렸을 때 다시 전원에게 나가는지 확인할 것.
- v1.04 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.05 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.
- v1.06 (2026-10-15): 엑셀 라이브러리 `xlsx`를 npm 0.18.5(배포 중단·알려진 취약점)에서 **SheetJS 공식 CDN 패키지 0.20.3**(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`)으로 교체 — 회원이 올린 엑셀을 서버에서 읽는 `src/lib/broadcastRecipients.ts parseBroadcastRecipientsWorkbook`와 양식 다운로드 라우트가 대상. 사용 API(read·sheet_to_json·aoa_to_sheet·write) 변경 없음. 검수: 빌드, `server-only`를 뺀 임시 사본으로 새 판에서 실제 파싱 함수 실행(전화번호 보정·이메일 처리 동일), `npm audit`에서 xlsx 항목 사라짐(다른 패키지 취약점은 남아 있음), 프로덕션 배포·비로그인 401 확인. 로그인 상태 양식 다운로드는 엣지가 `vercel.app` 주소에 로그인되어 있지 않아 미확인.
- v1.07 (2026-10-15, **주인님 승인 후 푸시·배포**): 패키지 보안 업데이트 — `next`·`eslint-config-next` 16.2.11 → **16.4.0**(같은 16 안), `nodemailer` 9.1.1 → **10.1.1**(기본 SMTP만 사용 — 큰 변경 해당 없음, Vercel Node 24.x), `@types/nodemailer` 최신, `npm audit fix`. 운영 의존성 취약점 5 → **0**(남은 5건은 개발용 eslint 도구 안에만 있음). 검수: 빌드, nodemailer `jsonTransport`로 메일 생성(실제 발송 없음), 로컬 `next start` — 로그인 200·보호 화면 307·API 401, 프로덕션 배포·운영 같은 확인. `vercel.json`(5분 cron) 변경 없음, 카카오·메일 실제 발송 없음.
- 정정(2026-10-15): v1.06(xlsx 교체)은 이 문서 "사전 승인 필수"(Git push·프로덕션 배포)를 확인하지 못하고 승인 없이 푸시·배포했다. 변경은 xlsx뿐이었고 vercel.json은 그대로였다.

- **v1.08 (2026-10-15, 주인님 승인 후 배포)** — 도메인 연동(SSO): 새 주소 **https://kakao-auto-posting.buylife.xyz**(`programs.app_url` 갱신). 쿠키 `.buylife.xyz` 공유(`src/lib/supabase/cookieDomain.ts`, client·server), `src/proxy.ts`가 옛 `kakaoautoposter.vercel.app` 화면 요청을 새 주소로 308. **카카오 로그인 콜백**: 회원 카카오 앱에 등록된 콜백은 옛 주소(`KAKAO_REDIRECT_URI`)라 그대로 두고, `/api/kakao/callback`이 옛 주소로 들어오면 같은 쿼리로 새 주소에 307로 넘겨 거기서(로그인 쿠키 있는 곳) 토큰 교환 — 회원 설정 변경 불필요. 공유 링크·이미지 기준 `NEXT_PUBLIC_SITE_URL`은 옛 주소 그대로(화면은 새 주소로 넘어감, 크론·`/api/og`는 옛 주소에서도 동작). **주인님 할 일**: 리포트 "카카오톡 공유" 버튼은 운영자 카카오 앱(JavaScript 키)을 쓰므로 카카오 개발자 콘솔 → 내 애플리케이션 → 플랫폼 → Web 사이트 도메인에 `https://kakao-auto-posting.buylife.xyz` 추가 필요(추가 전 새 주소에서 공유 버튼만 동작 안 함). 검수: 엣지 시험 계정 재로그인 없이 대시보드·주제·리포트·수신자·발송 내역·설정 6화면 200, 수신자 엑셀 양식 정상 xlsx, 옛 주소 화면 308·콜백 307·크론 401(살아 있음). 발송 없음. 마이그레이션 `supabase/migrations/20261015130000_kakao_v1_08_sso_domain.sql`.
- **v1.08 후속 확인 (2026-10-15)**: 주인님이 카카오 개발자 콘솔 → 앱 → 플랫폼 키 → JavaScript 키 수정 → **JavaScript SDK 도메인**에 `https://kakao-auto-posting.buylife.xyz` 추가(기존 4개 유지; 새 콘솔에서는 예전 "플랫폼 → Web → 사이트 도메인"이 이 칸). 새 주소에서 SDK 초기화 → 공유 창(친구 선택) 열림 → 주인님이 실제 공유까지 정상 확인. 코드 변경 없음.


## 2026-10-16 DB 연동 변수 호환 — v1.09 (kakao-auto-posting)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 v1.10 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`(기준 구현 threads-comment-reply v1.08). `src/lib/oauthRedirect.ts`(SITE_ORIGIN·OLD_HOST·`KAKAO_REDIRECT_OLD()`=env `KAKAO_REDIRECT_URI`·`KAKAO_REDIRECT_FOR(mode)`).
- 카카오 콜백: 기본 연결은 옛 콜백, 설정 화면 [새 주소로 (다시) 연결](`connectKakaoAccountNewCallbackAction`)은 새 콜백. 옛 주소 307에 via=old, 교환은 via로 선택(`exchangeCodeForToken(code, restApiKey, redirectUri, clientSecret?)`), 연결 후 이동 SITE_ORIGIN. 설정 화면 Redirect URI 두 주소 표시. 미사용 `getEnv` 제거.
- 텔레그램 웹훅 등록 기준 SITE_ORIGIN + `/api/telegram/migrate-webhooks`(관리자 로그인/CRON_SECRET). 연동 1건(주인님 관리자 봇) 이전 미실행.
- **바꾸지 않은 것(의도)**: 리포트 공유·카카오 "나에게 보내기"·이메일·브로드캐스트 메시지 안의 링크 기준(`NEXT_PUBLIC_SITE_URL`, 옛 주소). 카카오 메시지 링크는 회원 본인 카카오 앱 "웹 도메인"(+ 운영자 앱 JavaScript SDK 도메인)에 등록된 도메인만 허용되므로, 회원 공지(새 도메인 추가) 후에 전환해야 함. 이미 보낸 메시지 속 옛 링크도 있으므로 옛 주소의 화면 이동(308)은 오래 유지해야 함 — 플랜 항목 I.
- 검수: 빌드·배포, 옛 콜백 → via=old 307, 새 콜백 → /login, migrate 비인증 401, 시험 계정 설정 화면 두 주소·[새 주소로 연결] 표시. 시험 계정 카카오 앱 키 미등록이라 `?error=kakao_app_missing`(카카오 인증 화면 확인 못 함).

## v1.11 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/ai/reportImage.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.12 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (3묶음 단일 주소형, Claude Code 윈도우)
- `src/lib/ai/reportImage.ts` `generateReportImage()`가 공용 사본(`src/lib/ai/geminiImage.ts`·`nanoBananaModels.ts`)으로 위임. 모델은 공용 목록 기본 등급(`gemini-nano-banana-2.1`, 이전과 같음). **버그 수정**: 응답 첫 조각만 봐서 이미지를 놓칠 수 있던 문제.
- 개선: 키 머리글 전송, 시간 제한, 서버 오류·혼잡 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 차단·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·비율·화질은 그대로.
- 검수: tsc·eslint(바뀐 파일) 0, build, 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.13 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.14 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.15 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.16 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-19 v1.20 — 플로우 위저드 카카오 옐로우 뉴스레터 에디션 디자인 리뉴얼 & 가이드북 구축 (Antigravity agy)
- **도메인**: [https://kakao-auto-posting.buylife.xyz](https://kakao-auto-posting.buylife.xyz)
- **디자인 테마**: 플로우 위저드 스타일 — 카카오 옐로우 뉴스레터 마케팅 에디션 (카카오 옐로우 `#fee500`, 웜 앰버 `#f59e0b`, 다크 차콜 `#191919`, 슬레이트 라이트 `#f8fafc`).
- **주요 변경 사항**:
  - `src/app/globals.css`: 카카오 옐로우 테마 변수 및 `.studio-hero`, `.stat-card`, `.guide-card` 등 프리미엄 스타일 클래스 추가.
  - `src/components/layout/Sidebar.tsx`: `DESIGN.md` 9번 필수 원칙을 충족하는 `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설, `v1.20` 배지, 4단계 파이프라인 스텝퍼, 모바일(56px 헤더) 대응 햄버거 토글 슬라이드 오버레이 드로어 구현.
  - `src/app/(dashboard)/dashboard/page.tsx`: `.studio-hero` 프리미엄 그라데이션 배너, 3대 핵심 KPI 통계 카드, 4단계 파이프라인 가이드 바 탑재.
  - `src/app/(dashboard)/guide/page.tsx`: 4단계 워크플로우 다이어그램, 발송 채널별(카카오톡 나에게/친구톡, 텔레그램, 이메일) 기능 매트릭스 표, 7대 황금 수칙, 5종 FAQ 아코디언이 포함된 독립 비주얼 가이드북 전면 신설.
- **버전 3중 동기화**: `package.json` (`1.20.0`), `src/lib/version.ts` (`v1.20`), Supabase DB `programs` 테이블 (`v1.20`).
- **검수**: Next.js 16.4.0 로컬 빌드 성공, Vercel 프로덕션 배포 완료, Microsoft Edge 포그라운드(headless: false) 실세션 캡처 7종 수집 및 10분간 화면 유지 세션 검증 완료.

## 2026-10-20 v1.21 — ⏰ 정기 자동 생성 실행 방식 회원 선택(AIMaster 기본 Vercel / 본인 cron-job.org) + 중복 생성 방지·비밀값 검사·FAQ 정정 (Claude Code 윈도우)
- 주인님 「정기형에도 적용」. 지침 루트 `docs/SCHEDULER_POLICY.md`, 플랜 `docs/PLAN_20261020_MEMBER_SCHEDULER.md`, 기준 `naver-cafe-poster` v1.21(정기형).
- 정기형: 작업은 **주제 예약을 켤 때**(예약 스위치·예약 켜진 주제의 활성화) 켜고 **켜진 정기 주제가 0개면** 끈다(예약 끄기·비활성화·삭제·회원 실행 뒤 확인). cron-job.org 확인 5분. 활동 시간대·주기 판정 그대로. **카카오 발송은 지금처럼 사람이 결정**(바꾸지 않음).
- 코드: `src/lib/schedulerMember/cronJobOrg.ts`·`memberScheduler.ts`(표 `kakao_member_scheduler`, 토큰 `kakao_…` DB엔 해시, 끄기 스위치 `KAKAO_PLATFORM_SCHEDULER=off`)·`dispatch.ts`(운영자 주소에서 옮긴 로직 + `userId`·`excludeUserIds`·`failWithMessage` + **조건부 `last_run_at` 선점**, 생성 실패 시 되돌려 예전처럼 다음 tick 재시도), `/api/cron/generate-reports`(vercel·비일시정지 회원만, **`CRON_SECRET` 비면 401**), 새 `/api/cron/dispatch-member`, `src/lib/actions/scheduler.ts`, `topics.ts` `syncMemberScheduler`, `settings.ts` 키 허용·변경·삭제.
- 화면: 설정 「⏰ 예약 발행」(`SchedulerModePicker` + 키 칸 + 가입 3단계), 관심 주제 화면 「정기 자동 생성」 상태 줄·일시정지/재개(`components/topics/SchedulePublishingControl.tsx`), `/guide` FAQ — 예약 리포트 답변의 「15분 주기」「생성하고 발송」을 실제(5분, 발송은 사람이 결정)로 정정 + 실행 방식 항목 추가.
- DB(운영 `esgxyikcnnvmlhygjkth`): `supabase/migrations/20261020120000_kakao_member_scheduler.sql` — 2026-10-20 크롬 SQL Editor로 적용, 결과 `kakao_member_scheduler`·`v1.21`. `package.json` 1.21.0.
- 검수: tsc 0, build(새 주소 포함), 배포 `kakaoautoposter-at4fi42eb`(Ready), 무인증·`Bearer undefined`·가짜 토큰 401, `/login` 200, 새 배포 운영자 실행 200. 크롬(관리자 본인 키, **실제 생성·발송 없음** — 실제 주제 3개는 모두 예약 꺼짐이라 건드리지 않고, 시험 주제를 「예약 꺼짐·마지막 실행=지금·매주」로 DB에 넣음): 「내 cron-job.org」 선택 → 상태 줄 「대기 · 0개」 → 시험 주제 예약 켜기 → 약 3초에 작업 8678825 자동 켜짐 → 「실행 중 · 1개」 → 일시정지·재개 → 예약 끄기 → 작업 즉시 꺼짐 → Vercel 복귀 → 시험 주제 삭제. 회원 실행 주소의 실제 cron-job.org 호출은 작업이 켜진 1분 사이 5분 단위 시각이 없어 기록 없음(같은 코드의 네이버 카페에서 200 확인).
- 주의(검수 중 확인): 설정·주제 저장이 cron-job.org를 부르는 동안 **20~40초 걸릴 수 있다** — 그 사이 방식을 빠르게 바꿔 누르면 늦게 끝난 저장이 마지막에 반영된다(루트 `docs/ERROR_LESSONS.md` 2026-10-20).

## 2026-10-20 v1.22 — 정기 생성 직전 프로그램 이용 권한 확인 (Claude Code 윈도우)
- **v1.22 (2026-10-20, Claude Code 윈도우) — 정기 실행 직전 프로그램 이용 권한 확인** — 주인님 지시. 예전엔 핸드폰 번호만 확인해 사용기간이 끝난 회원의 켜 둔 정기 실행도 계속 돌았다. `src/lib/programAccess.ts`(카드뉴스·메인 사이트와 같은 판정: 정지→관리자→핸드폰→FREE→구독→등급+사용기간, 사본)를 실행 로직에서 회원별 1회 확인, 권한 없으면 실행하지 않음(카카오 주제 표에는 안내 칸이 없어 건너뛰기만 함). 적용 시점 영향: 정기 생성 켜진 주제 0건. 검수: tsc 0, build, 배포 `kakaoautoposter-pw5stukxe`, DB v1.22, `package.json` 1.22.0.

## 2026-10-20 v1.23 — 예약 공용 코드 「실패 시 상태 되돌리기」 (Claude Code 윈도우)
- 주인님 「순서대로 진행해줘」(남은 일 4번). 「내 cron-job.org」로 바꿀 때 cron-job.org 작업 켜기가 실패하면(하루 호출 한도 초과·키 오류) **이전 방식으로 되돌림**(예전엔 cronjob으로 남아 운영자 실행에서도 빠져 예약이 멈출 수 있었음), 「재개」가 실패하면 **일시정지 상태로 되돌림**(예전엔 화면은 일시정지·DB는 대기로 어긋남). `memberScheduler.ts`의 `setMemberSchedulerMode`·`resumeMemberScheduler` 두 곳, 11개 사본 같은 수정. 커밋 `ccf80d68`, DB 버전 크롬 SQL Editor로 갱신, 11개 순차 배포 모두 Ready·`/login` 정상·회원 실행 주소 가짜 토큰 401. 이 프로그램 배포 `kakaoautoposter-nxhxthux8`.
- 실검수는 같은 코드인 booking-reminder에서 실패 경로 3가지를 실제로 확인(cron-job.org 하루 한도 소진 상태 이용).
