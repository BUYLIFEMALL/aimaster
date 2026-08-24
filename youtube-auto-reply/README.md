# 💬 YouTube Auto Reply — 유튜브 댓글 자동 답글

내 유튜브 채널에 달린 댓글을 AI가 읽고 사람처럼 자연스러운 답글(원하는 링크 포함)을 초안으로
만들어주고, 검토 후(또는 텔레그램에서 바로) 게시할 수 있는 프로그램. 라이브: https://youtube-auto-reply.vercel.app

## 설계 배경

Make.com 시나리오 없이 완전 신규로 기획했다. 기본은 채널의 **모든 영상**에 댓글 자동화가
동작하고, 원치 않는 영상만 개별로 끌 수 있게 만들었다(사용자 요청사항).

### 유튜브 정책 준수 — "봇 로직에 걸리지 않게" 설계한 방법

사용자가 "유튜브 AI 로직 검토에 안 걸리게, 각 사용자의 PC자원(IP/아이디) 기준으로 서로 다른
데이터가 오가게 만들어야 한다"고 요청해서, 실제로 [YouTube API Services Developer
Policies](https://developers.google.com/youtube/terms/developer-policies) 원문과 커뮤니티
사례를 조사했다. 결론: **IP를 사용자별로 분리하는 게 정책 요건이 아니다.**

- **III.I.2조**: *"you must not automate or trigger... comments... without the user's prior
  specific and express consent"* — 자동화 자체가 아니라 **행동마다 사용자의 사전 명시적 동의**가
  요구된다.
- **III.E.3.d조**: 사용자를 대신해 데이터를 등록/변경하는 행동은 실행 전에 사용자가 명시적으로
  동의해야 한다.
- IP 주소·서버 분리에 대한 요구사항은 정책 어디에도 없다. 대신 구글이 공식적으로 제공하는
  다중 사용자 구분 메커니즘은 `quotaUser` 파라미터(사용자별 식별값)다 — IP가 아니라 이 값으로
  요청 주체를 구분한다.
- 실제 스팸 판정 기준은 서버 IP 개수가 아니라 **내용/패턴**이다(판에 박힌 문구 반복, 짧은 간격
  연속 게시, 무차별 링크 도배). replient.ai/commentshark.com/replytide.co 같은 상용 서비스가
  이미 공식 API로 같은 기능을 정상 운영 중이다.

**반영한 조치:**
1. **AI가 댓글마다 다른 답글 초안을 생성 → 사람이 검토·수정 → "답변승인"을 직접 눌러야만 실제로
   올라간다.** 이 클릭 자체가 정책이 요구하는 "건별 사전 명시적 동의"다(`lib/comments/post.ts`의
   `postCommentReplyForUser`, 웹 화면과 텔레그램 승인 버튼 양쪽에서 공유). 기본값은 항상 이 방식.
2. 모든 YouTube API 호출에 `quotaUser=user.id`를 넣어 사용자별로 요청을 구분한다
   (`lib/youtube/client.ts`).
3. 한 번 동기화당 영상별 최근 댓글 20개까지만 가져와서, 몰아서 대량 처리하지 않는다.
4. (선택, 기본 꺼짐) "자동 게시"를 켜더라도 각 댓글마다 AI가 **매번 새로 생성**한 답글만 올라간다
   — 고정 템플릿을 반복 게시하는 기능은 없다.

## 유튜브 OAuth — shots(유튜브 쇼츠 자동생성)와 같은 원칙, 다른 스코프

`youtube.upload`/`youtube.readonly`처럼 `youtube.force-ssl`도 Google이 "민감 범위"로 분류해서,
앱이 구글 검증을 통과하기 전까지는 사용자가 각자 자신의 **Google Cloud OAuth Client ID/Secret**을
등록해야 한다(공용 buylife 앱 불가). `google_client_id`/`google_client_secret`은 이미
`user_api_keys`의 공용 provider라 shots에서 이미 등록한 사용자는 값 재사용이 가능하지만,
**리디렉션 URI는 이 프로젝트 것을 Google Cloud Console에 추가로 등록**해야 한다(설정 화면에
안내 문구 있음). 스코프가 shots와 달라서 **OAuth 토큰 자체는 공유하지 않고**
`ytreply_accounts`(이 프로젝트 전용 테이블)에 따로 저장한다.

앱이 미검증 상태면 refresh_token이 7일 후 만료되어 재연결이 필요해지는 것도 shots와 동일하다
(`getYoutubeConnectionStatus()`의 `needsReconnect` 패턴 재사용). 매일 자동 점검 cron
(`/api/cron/check-connection`)이 끊김을 감지하면 텔레그램으로 알려준다.

## 답글 생성 AI — OpenAI / Anthropic Claude / Google Gemini 중 선택

`lib/ai/models.ts`에 provider별 모델 카탈로그가 있고(`lib/ai/reply.ts`가 provider에 맞는 API로
분기 호출), 사용자는 `/settings`의 "답글 생성 AI 모델"에서 아래 중 하나를 고른다. **선택한
모델의 provider 키 하나만** 등록하면 되고(세 개 다 등록할 필요 없음), 설정 페이지 상단에 지금
어떤 모델·어떤 키가 실제로 쓰이는지 안내 배너 + "지금 사용 중" 배지로 항상 보여준다.

| Provider | 모델(가성비 → 플래그십) |
|---|---|
| OpenAI | GPT-5.6 Luna(기본값) → Terra → Sol, (구형) GPT-4o |
| Anthropic Claude | Claude Haiku 4.5 → Sonnet 5 → Opus 5 → Fable 5 |
| Google Gemini | Gemini 3.5 Flash Lite → (구형) 3.6 Flash → 3.7 Flash → 2.5 Pro → 3.1 Pro Preview |

모델 ID는 각 공식 문서(platform.claude.com, ai.google.dev/gemini-api/docs/models)로 최신 라인업을
확인한 뒤, 실제 API 호출로 살아있는지 재검증하고 반영했다(문서에만 있고 이미 폐기된 모델,
예: `gemini-2.5-flash-lite`의 404를 실제 호출로 발견해서 제외한 사례 있음).

## 데이터 모델

- `ytreply_accounts` — 유튜브 OAuth 연결(user_id unique), `needs_reconnect`/`last_checked_at`/
  `reconnect_notified_at`로 연결 상태 점검·중복 알림 방지
- `ytreply_videos` — 채널 영상 동기화 결과. `is_monitored`(기본 true) + `custom_link`(영상별 링크
  오버라이드) + `is_hidden`(목록에서 숨김, 모니터링도 함께 꺼짐). 동기화 시 "Deleted video" 항목은
  아예 제외
- `ytreply_settings` — 채널 기본 링크, AI 답글 톤 커스텀 지시문, `tone_preset`, `reply_model`,
  `auto_approve`(기본 false), 예약 모니터링 설정(`monitoring_enabled`/`monitoring_interval_minutes`/
  `monitoring_started_at`/`last_run_at`)
- `ytreply_comments` — 수집한 댓글 + AI 초안 + 상태(`pending_review`/`posted`/`skipped`/`failed`) +
  텔레그램 메시지 추적(`telegram_chat_id`/`telegram_message_id`, 승인 버튼 응답 시 메시지를
  갱신하기 위함)

## 핵심 흐름

1. `/settings` — Google OAuth Client ID/Secret + 답글 생성 AI 키(OpenAI/Anthropic/Gemini 중 택1)
   등록 → 유튜브 채널 연결 → (선택) 텔레그램 알림 연동 → 답글 기본 설정(링크/톤/모델) →
   예약 모니터링 → (선택, 고급) 자동 게시
2. `/videos` — "채널 영상 동기화" → 영상 목록(기본 전체 모니터링) → 개별 on/off·링크 오버라이드·
   숨기기, 체크박스로 여러 영상 일괄 모니터링 시작/중지·숨기기
3. `/comments` — 상단에 지금 적용 중인 답글 설정/예약 모니터링 상태를 스크롤해도 안 사라지는
   sticky 요약으로 보여줌. "지금 새 댓글 확인하기"(`syncCommentsAction` → `runCommentSync`)로
   신규 댓글 수집 + AI 초안 생성 → 검토·수정 → "✅ 답변승인"(`postReplyAction`, 실제 유튜브 API
   호출) / "❌ 답변제외"
4. **텔레그램(선택)** — 새 댓글이 오면 원본+AI 초안과 함께 **✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외**
   인라인 버튼을 발송(`lib/comments/sync.ts` → `sendTelegramMessageWithButtons`). 사용자별 웹훅
   (`/api/telegram/webhook/[userId]`)이 버튼 클릭을 받아 그 자리에서 게시/보류/제외를 처리하고
   메시지를 결과로 갱신한다. 웹훅은 `CRON_SECRET` 기반 HMAC(`computeWebhookSecret`)으로 서명
   검증하며, 응답이 없으면 설정 페이지의 "웹훅 재등록" 버튼으로 자가 복구 가능
5. **예약 모니터링** — 사용자가 고른 주기(5분~24시간, `MONITORING_INTERVAL_OPTIONS`)마다 Vercel
   Cron이 자동으로 새 댓글을 확인해 초안까지 만들어둔다(게시는 자동 게시가 꺼져 있으면 여전히
   사람 승인)
6. **(선택, 고급) 자동 게시** — 위험 고지에 체크 후 명시적으로 켜야만 검토 없이 즉시 게시. 켜져
   있으면 텔레그램에는 버튼 없는 결과 알림만 발송
7. `/history` — 총 게시 수 / 최근 7일 게시 수 / 검토 대기 수 + 최근 게시된 답글 목록(최대 50건)

## Phase 진행 상태

[AGENTS.md](AGENTS.md)의 Phase 표 참고.

## 명령어

```bash
npm run dev       # 로컬 개발 서버
npm run build     # 프로덕션 빌드
```

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAIN_SITE_URL=
NEXT_PUBLIC_SITE_URL=
GOOGLE_YOUTUBE_REDIRECT_URI=
CRON_SECRET=        # Vercel Cron 인증 + 텔레그램 웹훅 secret_token 시드로 함께 쓰임
```

## Vercel Cron (`vercel.json`)

- `/api/cron/check-connection` — 매일 1회, 유튜브 연결 상태 점검(실제 댓글 읽기/게시 없음)
- `/api/cron/sync-comments` — 5분마다 깨어나, 사용자별 예약 모니터링 주기가 됐는지 판정 후
  해당 사용자만 `runCommentSync` 실행(`real_estate_sales`의 dispatch 패턴 재사용)
