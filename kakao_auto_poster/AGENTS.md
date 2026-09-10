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
다음 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **Git push**
3. **실제 서비스 배포 (Vercel 프로덕션)**
4. **데이터베이스 데이터 삭제**
5. **환경변수와 API 키 변경**
6. **유료 API 호출** (Perplexity/OpenAI는 회원 본인 키로 소량 과금 발생)
7. **Vercel Cron 스케줄/활성화 변경** (Phase 3 도입 이후)

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
