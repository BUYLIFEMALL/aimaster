# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **인스타그램 댓글자동화(instagram-comment-reply)** 프로젝트에서 AI Agent(Claude Code
등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

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
6. **유료 API 호출** (OpenAI/Anthropic/Gemini 답글 초안 생성 등)
7. **실제 인스타그램 댓글 게시(`postReplyAction`)** — 공개적으로 남는 되돌리기 어려운 행동이다.
   기본값은 화면에서 사람이 "답변승인" 버튼을 직접 누르거나 텔레그램에서 승인하는 것이고, 이
   자체가 Meta Developer Policy §1.7이 요구하는 "사전의 명시적 동의"다. **(선택, 고급) 자동
   게시(`ig_settings.auto_approve`, 기본 false)**를 2026-08-26 사용자 요청으로 추가했지만,
   사용자가 설정 화면에서 위험 고지를 읽고 명시적으로 동의 체크 후 켠 경우에만 동작한다 — 이
   흐름을 우회해서 기본값을 바꾸거나 동의 없이 자동/일괄 게시하는 코드를 추가하지 말 것. 자동
   게시 중에도 댓글마다 AI가 매번 새로 생성한 답글만 게시되고, 고정 템플릿 반복 게시는 여전히
   금지다(Meta 정책 §5.2.2(d)).
8. **Vercel Cron(vercel.json의 crons) 활성화/배포** — `/api/cron/check-connection`은 실제
   댓글을 읽거나 게시하지 않는 순수 상태 점검용이라 다른 발송 cron보다 리스크는 낮지만, 배포되는
   순간부터 매일 자동 실행되며 사용자에게 텔레그램 알림을 실제로 보낼 수 있으므로 다른 cron과
   동일하게 배포 전 확인한다.

---

## 🎯 프로젝트 목적

인스타그램 게시물에 새 댓글이 달리면 AI가 내용을 읽고 자연스러운 답글(원하는 링크 포함)을
초안으로 만들고, 계정 운영자가 검토·수정 후(또는 텔레그램에서 바로) 게시하는 프로그램.
`youtube-auto-reply`(유튜브 댓글 자동 답글)를 만든 경험을 그대로 이식해서 설계했다 — 데이터
모델, 텔레그램 승인 버튼, 예약 모니터링, 다중 AI provider 지원 구조가 사실상 동일하다.

**차단당하지 않도록 설계한 방법**은 [README.md](README.md) 참고 — Meta 공식 개발자 문서/정책
문서/커뮤니티 사례/경쟁 서비스를 직접 조사한 뒤 결정한 내용이다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `instagram-comment-reply/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은
  `instagram-comment-reply/` 폴더 내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

instagram-comment-reply는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- instagram-comment-reply는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "instagram-comment-reply"`) 이용 권한(구독/개별부여/등급)이 있는 모든
  사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route
  (`app/api/instagram/callback/route.ts`)는 redirect 대신 결과 객체를 반환하는
  `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `meta_app_id`/`meta_app_secret`(인스타그램 OAuth, 이 프로젝트
  전용으로 새로 추가한 provider) + `openai`/`anthropic`/`gemini`(답글 생성 AI, 고른 모델의
  provider 키 하나만 있으면 됨) 총 5개 provider를 쓴다.
- 사용자 소유 데이터 테이블(`ig_accounts`, `ig_media`, `ig_settings`, `ig_comments`)은
  `user_id` + RLS owner-only 정책으로 격리한다. 전역 공유 캐시는 없다.
- 텔레그램 알림은 프로그램 접두어 없는 공용 `user_telegram_links`를
  `(user_id, program_slug='instagram-comment-reply')`로 스코프해서 재사용한다 — 다른
  프로그램에서 이미 연동한 봇과는 독립적이다.
- 텔레그램 승인 버튼(답변승인/답변보류/답변제외)은 사용자마다 자기 봇을 쓰는 구조라 사용자
  식별용 웹훅을 새로 등록한다(youtube-auto-reply와 완전히 동일한 `computeWebhookSecret`
  HMAC 검증 패턴).

### Meta App ID/Secret — "본인 앱으로 App Review 건너뛰기" 패턴
`google_client_id`/`google_client_secret`과 같은 철학이다: 사용자가 각자 Meta App Dashboard에서
자기 소유의 앱을 만들고, 그 앱의 "역할" 메뉴에서 자기 자신을 테스터로 추가하면, Meta의
App Review(전체 사용자 흐름 스크린캐스트 필수) 없이도 본인 계정만 즉시 연결해 쓸 수 있다 —
App Review는 "앱에 등록되지 않은 제3자에게 권한을 확장할 때"만 필요하기 때문이다. 설정
화면에 이 절차(앱 생성 → 리디렉션 URI 등록 → 본인을 테스터로 추가)를 안내한다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 인스타그램 계정 OAuth 연결(Instagram API with Instagram Login), 게시물 동기화 + 개별 모니터링 on/off + 링크 오버라이드, 신규 댓글 수집 + AI 답글 초안 생성(OpenAI/Anthropic/Gemini 중 선택), 검토 후 수동 게시 | ✅ 구현 완료 |
| 1 | 매일 Vercel Cron으로 연결 상태 점검 + 끊기면 텔레그램 알림, 화면 전체에 재연결 배너 표시 | ✅ 구현 완료 |
| 1 | 예약 모니터링 — 사용자별 확인 주기(5분~24시간) 선택 + 시작/중지 + "이 시점 이후 댓글만" 커트오프 | ✅ 구현 완료 |
| 1 | 텔레그램 승인 버튼 — 새 댓글+AI 초안을 텔레그램으로 보내면서 "✅ 답변승인/⏸ 답변보류/❌ 답변제외" 인라인 버튼 제공 | ✅ 구현 완료 |
| 1 | `/media` 일괄 작업 — 체크박스로 여러 게시물 모니터링 시작/중지·숨기기 일괄 처리 | ✅ 구현 완료 |
| 1 | 답글 이력 대시보드(`/history`) | ✅ 구현 완료 |
| 1 | `programs` 카탈로그 등록(카테고리: 인스타) + 썸네일(Gemini 생성) | ✅ 구현 완료 |
| 2 | Vercel Cron 활성화 — 2026-08-26 실제로는 별도 확인 없이 배포에 포함돼 잠깐 켜져 있었던 것을 발견해 `vercel.json`에서 비워서(`crons: []`) 껐다. 사용자가 실제 계정을 등록하고 정상 동작을 검수한 뒤, 다시 명시적으로 승인받고 켤 예정 | ⏳ 예정(의도적으로 꺼둠) |
| 2 | (선택, 고급) 자동 게시 옵션 — `ig_settings.auto_approve`, 기본 false. 켜면 검토 없이 AI 초안이 바로 게시되고, 텔레그램에는 버튼 없는 결과 알림만 발송(youtube-auto-reply와 동일 패턴). 본인 계정이 단 답글을 새 댓글로 잘못 인식하지 않도록 작성자 username 필터도 함께 추가 | ✅ 구현 완료 |
| 2 | Webhook 기반 실시간 댓글 수신(현재는 폴링) | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
