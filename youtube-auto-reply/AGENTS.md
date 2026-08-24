# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **유튜브 댓글 자동 답글(youtube-auto-reply)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

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
6. **유료 API 호출** (OpenAI 답글 초안 생성 등)
7. **실제 유튜브 댓글 게시(`postReplyAction`)** — 공개적으로 남는 되돌리기 어려운 행동이다.
   화면에서 사람이 "답변승인" 버튼을 직접 누르는 것 자체가 유튜브 개발자 정책(III.I.2조)이 요구하는
   "사전의 명시적 동의"이므로, 이 흐름을 우회해서 자동/일괄 게시하는 코드를 추가하지 말 것
   (Phase 2에서 "자동 승인" 옵션을 만들더라도 반드시 사용자가 설정에서 명시적으로 켠 경우에만).
8. **Vercel Cron(vercel.json의 crons) 활성화/배포** — `/api/cron/check-connection`은 실제
   댓글을 읽거나 게시하지 않는 순수 상태 점검용이라 다른 발송 cron보다 리스크는 낮지만, 배포되는
   순간부터 매일 자동 실행되며 사용자에게 텔레그램 알림을 실제로 보낼 수 있으므로 다른 cron과
   동일하게 배포 전 확인한다.

---

## 🎯 프로젝트 목적

유튜브 채널에 새 댓글이 달리면 AI가 내용을 읽고 자연스러운 답글(원하는 링크 포함)을 초안으로
만들고, 채널 운영자가 검토·수정 후 게시하는 프로그램. 기본은 채널의 모든 영상이 대상이고,
영상별로 개별 on/off할 수 있다.

**참고할 Make.com 시나리오 없이 완전 신규로 기획한 서브프로젝트**다. 유튜브 정책 준수 설계
배경(왜 "사람이 검토 후 게시"가 핵심 안전장치인지, `quotaUser` 사용 이유 등)은
[README.md](README.md) 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `youtube-auto-reply/`
* 모든 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `youtube-auto-reply/` 폴더
  내에서 개발 및 관리합니다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

youtube-auto-reply는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의
`../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로
작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도
그대로 적용된다. 핵심 요약:

- youtube-auto-reply는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램
  (`programs.slug = "youtube-auto-reply"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가
  각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지는 `requireProgramAccess()`(권한 없으면 redirect), API route
  (`app/api/youtube/callback/route.ts`)는 redirect 대신 결과 객체를 반환하는
  `checkProgramAccessApi()`로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`: 본인 키만, 관리자 키로 폴백 없음)을
  그대로 쓴다. 이 프로그램은 `google_client_id`/`google_client_secret`(유튜브 OAuth,
  shots와 provider 공유 가능하나 리디렉션 URI는 별도 등록 필요) + `openai`/`anthropic`/`gemini`
  (답글 생성 AI, `/settings`에서 고른 모델의 provider 키 하나만 있으면 됨 — `lib/ai/models.ts`의
  `getReplyModelProvider()`로 판정) 총 5개 provider를 쓴다.
- 사용자 소유 데이터 테이블(`ytreply_accounts`, `ytreply_videos`, `ytreply_settings`,
  `ytreply_comments`)은 `user_id` + RLS owner-only 정책으로 격리한다. 전역 공유 캐시는 없다
  (채널/댓글 데이터는 사용자마다 완전히 독립적이어야 함).
- 텔레그램 알림은 프로그램 접두어 없는 공용 `user_telegram_links`(real_estate_sales가 만듦,
  `docs/PLATFORM_PATTERNS.md` §9)를 `(user_id, program_slug='youtube-auto-reply')`로 스코프해서
  재사용한다 — 다른 프로그램에서 이미 연동한 봇과는 독립적이다.
- 텔레그램 승인 버튼(답변승인/답변보류/답변제외)은 사용자마다 자기 봇을 쓰는 구조라 사용자 식별용
  웹훅을 새로 등록한다(`setTelegramWebhook`, `lib/actions/telegram.ts`의 연동/해제 시점에
  등록/해제). 웹훅 URL(`/api/telegram/webhook/[userId]`)에 담긴 user_id만으로는 제3자가
  URL을 알아내 가짜 승인 요청을 보낼 수 있으므로, `CRON_SECRET`을 시드로 한 HMAC
  (`computeWebhookSecret()`)을 텔레그램의 `secret_token`으로 함께 등록해 매 요청마다
  `X-Telegram-Bot-Api-Secret-Token` 헤더로 검증한다. "보류"는 별도 상태값 없이 그냥
  `pending_review`로 남겨서 웹 검토 화면에 계속 보이게 하는 방식이다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 유튜브 채널 OAuth 연결, 영상 동기화 + 영상별 모니터링 on/off + 링크 오버라이드, 신규 댓글 수집 + AI 답글 초안 생성, 검토 후 수동 게시 | ✅ 구현 완료 |
| 2 | 매일 Vercel Cron으로 채널 연결 상태 점검 + 끊기면 텔레그램 알림(`/api/cron/check-connection`), 화면 전체에 재연결 배너 표시 | ✅ 구현 완료 |
| 2 | 예약 모니터링 — 사용자별 확인 주기(5분~24시간) 선택 + 시작/중지 + "이 시점 이후 댓글만" 커트오프, Vercel Cron이 5분마다 깨워서 사용자별 주기를 판정(`/api/cron/sync-comments`, `real_estate_sales`의 dispatch 패턴 재사용). 자동으로는 초안 생성까지만, 게시는 여전히 사람 승인 | ✅ 구현 완료 |
| 2 | 텔레그램 승인 버튼 — 새 댓글+AI 초안을 텔레그램으로 보내면서 "✅ 답변승인/⏸ 답변보류/❌ 답변제외" 인라인 버튼을 함께 제공. 웹 화면 없이도 텔레그램에서 바로 승인 가능(초안 수정이 필요하면 여전히 웹 화면 이용) | ✅ 구현 완료 |
| 2 | (선택) "자동 게시" 토글 — 사용자가 설정에서 체크박스로 위험 고지에 동의하고 명시적으로 켠 경우에만 검토 없이 바로 게시(`ytreply_settings.auto_approve`, 기본값 false) | ✅ 구현 완료 |
| 2 | 답글 이력 대시보드(`/history`) — 총 게시 수/최근 7일 게시 수/검토 대기 수 + 최근 게시된 답글 목록(최대 50건) | ✅ 구현 완료 |
| 2 | 답글 생성 AI 다중 provider 지원 — OpenAI 외 Anthropic Claude/Google Gemini 모델 추가(`lib/ai/models.ts`, `lib/ai/reply.ts`). 각 provider 최신 세대 모델을 실제 API 호출로 검증 후 반영, 폐기된 모델(`gemini-2.5-flash-lite` 등)은 제외 | ✅ 구현 완료 |
| 2 | `/videos` 일괄 작업 — 체크박스로 여러 영상 모니터링 시작/중지·숨기기 일괄 처리(`VideosList.tsx`, stepmail의 벌크 선택 패턴 재사용) | ✅ 구현 완료 |
| 2 | 웹훅 재등록 버튼(`ReregisterWebhookButton.tsx`) — 텔레그램 승인 버튼이 응답하지 않을 때 사용자가 직접 웹훅을 다시 등록하는 자가 복구 기능 | ✅ 구현 완료 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
