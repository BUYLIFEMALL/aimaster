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
| 1 | 프로젝트 뼈대, 관심 주제/키워드 등록(`kakao_topics`), Perplexity 기반 "지금 생성" 수동 버튼, 생성된 콘텐츠(`kakao_reports`)를 보는 웹 리포트 페이지 | ✅ 구현 완료, 미검증(실계정 API 키로 첫 생성 테스트 필요) |
| 2 | 설정 페이지에 카카오 채널(SOLAPI) 연동 섹션 추가(`user_solapi_accounts` 공용 테이블 재사용), 리포트 상세 페이지에 "💬 카카오로 발송" 버튼(`sendReportToKakaoAction`) — 수신 번호는 `profiles.phone`(trending-product-finder Phase 10과 동일 패턴) | ✅ 구현 완료, 미검증(실계정 SOLAPI 계정으로 첫 발송 테스트 필요) |
| 3 | ① 날짜 앵커링 수정 — `lib/ai/collector.ts`가 Perplexity/OpenAI 프롬프트에 오늘 날짜(KST)를 명시적으로 주입해 학습 데이터 시점을 "현재"로 착각하는 문제 해결. ② 데이터 조회 범위 회원 선택(`kakao_topics.lookback_days`, 3일/1주/2주/1개월/3개월, `TopicForm`/`TopicRow` UI). ③ 예약(정기 자동 생성) on/off — `kakao_topics.schedule_enabled`/`interval_minutes`/`last_run_at`, 기본값 꺼짐, 5분 tick 크론(`/api/cron/generate-reports`, `vercel.json` 등록). ④ 카카오 발송 전 텔레그램 사전 검토 — 공용 `user_telegram_links` 재사용, 리포트 생성 시(수동/예약 모두) 텔레그램으로 "✅ 카카오로 발행/❌ 발행 안 함" 인라인 버튼 발송(`lib/telegramReview.ts`, `app/api/telegram/webhook/[userId]/route.ts`), 텔레그램 미연동 시 기존처럼 웹 화면에서만 수동 발송 | ✅ 구현 완료, 미검증(실계정으로 예약 자동 생성 1주기 + 텔레그램 승인/거부 버튼 동작 확인 필요) |
| 4 | 카카오 로그인("나에게 보내기" 무료 API) 연동 추가 — 회원이 카카오톡 채널 개설/SOLAPI 계정 없이 카카오 로그인 동의 1회만으로 본인 "나와의 채팅방"으로 리포트를 받을 수 있다. 기본 템플릿(피드형)에 제목/요약/링크를 매번 JSON으로 동적으로 채워 넣는 방식이라 콘솔에서 템플릿을 미리 만들어둘 필요가 없다(`lib/kakao/client.ts`의 `sendReportMemoToMe`). `lib/kakaoSend.ts`가 `user_kakao_accounts` 연동이 있으면 이 채널을 우선 사용하고, 없으면 기존 SOLAPI 경로로 자동 전환한다 — SOLAPI 방식을 대체하는 게 아니라 진입장벽 낮은 대안으로 나란히 제공 | ✅ 구현 완료, 미검증(카카오 개발자 앱 등록 필요 — 아래 참고) |
| 5 | ① 예약 자동 생성에 "동작 시간대"(종일/특정 시간대만) 추가 — `kakao_topics.active_hour_start/end`, `lib/schedule.ts`의 `isWithinActiveHours`/`currentKstHour`(real_estate_sales MonitoringSettings.tsx·trending-product-finder Phase 14/18과 동일 패턴), 크론(`generate-reports`)이 due 판정에 함께 반영. ② 예약 설정 UI를 자동저장 방식(MonitoringSettings.tsx와 동일 — 토글/셀렉트 변경 즉시 저장, 별도 "저장" 버튼 없음)으로 전환. ③ 주제 안의 키워드를 개별로 추가/삭제하는 기능(`updateTopicKeywordsAction`, 칩+×, trending-product-finder Phase 20과 동일 패턴) — 전에는 키워드 하나를 빼려 해도 주제 전체를 삭제하고 재등록해야 했다. ④ 리포트 알림 채널에 이메일(SMTP) 추가 — 공용 `user_smtp_accounts` 재사용(`lib/email/transport.ts`, `SmtpAccountSection.tsx`), 예약 자동 생성분에만 발송(수동 "지금 생성"은 이미 화면을 보고 있어 제외 — trending-product-finder Phase 10과 동일 판단). 카카오(카카오 로그인/SOLAPI)·텔레그램은 이미 "연동=on, 연동 해제=off"로 채널 켜고 끄기가 되어 있어 추가 작업 없이 이메일만 새로 붙였다 | ✅ 구현 완료, 미검증(SMTP 계정 등록 후 예약 자동 생성 1건이 실제로 이메일까지 도착하는지, 동작 시간대 제한이 실제로 크론에 반영되는지 확인 필요) |
| 6 | HTTP/RSS 소스 추가, `programs` 등록 확인(4단계 기본 요금제는 관리자 화면 `ProgramForm.tsx`의 `DEFAULT_PLANS`가 자동 처리) | ⏸️ 예정 |

## ⚠️ 미검증 항목 (실사용 전 반드시 확인)

- **Phase 4(카카오 로그인) 실사용 전 필수 설정**: https://developers.kakao.com 에서 이 프로젝트용 앱을 하나 등록하고(threads의 Meta 앱과 동일한 성격 — 앱은 프로젝트당 1개, 회원 각자는 이 앱을 통해 개별 로그인/동의), "카카오 로그인" 활성화 + 동의항목에서 `talk_message` 사용 설정, Redirect URI에 `{배포 URL}/api/kakao/callback`을 등록해야 한다. 발급받은 REST API 키/시크릿을 `.env.local`(로컬)과 Vercel 환경변수(배포)에 `KAKAO_REST_API_KEY`/`KAKAO_CLIENT_SECRET`/`KAKAO_REDIRECT_URI`로 등록할 것 — 아직 등록 전이라 실계정으로 연동/발송을 테스트하지 못했다.
- 카카오 access_token은 짧게(몇 시간) 만료되고 refresh_token으로 자동 갱신하도록 구현했지만(`lib/kakao/account.ts`), 실제 refresh_token 만료 주기(카카오 콘솔 설정에 따라 다름)에 걸친 장기 동작은 아직 검증하지 못했다 — 회원이 오래 방치했다가 다시 발송을 시도하는 시나리오를 한 번은 확인할 것.

- Phase 1 전체(주제 등록 → Perplexity 검색 → AI 구조화 → 리포트 저장/조회)는 아직 실계정
  API 키로 end-to-end 테스트하지 않았다. 첫 사용 시 반드시 실제로 주제를 등록하고 "지금
  생성"을 눌러 리포트가 정상적으로 만들어지는지 확인할 것.
- `programs` 테이블에 `kakao-auto-posting` slug가 이미 등록돼 있는지(이름은 "뉴스레터
  자동화"로 변경 완료, 2026-09-08) 재확인할 것 — 없으면 `requireProgramAccess()`가 막는다.
- Phase 3 예약 자동 생성 크론과 텔레그램 웹훅은 `CRON_SECRET` 환경변수가 Vercel 프로젝트에
  실제로 설정돼 있어야 동작한다 — 배포 전 반드시 확인할 것(`.env.local.example` 참고).
  없으면 크론은 401로 실패하고, 텔레그램 웹훅 시크릿 계산(`computeWebhookSecret`)도
  에러를 던진다.
- 텔레그램 사전 검토 흐름(연동 → 리포트 생성 → 버튼으로 발행/거부 → 실제 카카오 발송)은
  아직 실계정으로 E2E 검증하지 않았다.
