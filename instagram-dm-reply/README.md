# 📩 Instagram DM Reply — 인스타 DM 자동응답

인스타그램 비즈니스 계정으로 들어오는 DM(다이렉트 메시지)을 AI가 읽고 자연스러운 답장
초안을 만들어주고, 검토 후(또는 설정에서 켠 경우 자동으로) 발송할 수 있는 프로그램.
`instagram-comment-reply`(인스타 댓글자동화)를 만들고 운영한 경험을 그대로 이식했다.

## 설계 배경 — 댓글 3개 프로그램과 무엇이, 왜 다른가

`instagram-comment-reply`/`threads-comment-reply`/`youtube-auto-reply`를 만든 뒤, "다른 사람
게시물에 자동으로 좋아요+댓글을 다는 아웃바운드 참여 자동화"를 검토했으나 세 플랫폼 모두
API/정책상 불가능하다는 결론을 냈다. 대신 공식 문서를 전부 훑어 합법적으로 가능한 대안을
찾았고, 그중 1순위로 추천된 것이 이 DM 자동응답이다(`docs/01-plan/features/social-automation-backlog.plan.md`
참고).

- **DM은 댓글과 달리 1:1 사적 대화라, Meta 비즈니스 메시징 정책이 완전 자동 응답을 명시적으로
  허용한다.** 필요한 것은 "대화 시작 시 자동 응답임을 고지"뿐이다(예: "You are interacting
  with an automated experience"). "1건마다 사람이 승인해야 한다"는 요건은 Meta 정책에 없다 —
  ManyChat/Chatfuel 같은 상용 서비스가 이미 이 방식으로 완전 자동 운영 중이다.
- **그럼에도 이 저장소는 기본값을 "검토 후 발송"으로 정했다**(2026-08-26 실사용자 결정) —
  기존 3개 댓글자동화 프로그램의 안전 철학(사람 승인 우선)과의 일관성을 위해서다. 대신
  `dm_settings.auto_approve` 토글로 사용자가 언제든 완전 자동 모드로 전환할 수 있게 했다.
- `instagram_business_manage_messages` 권한은 본인 Meta 앱 + 본인을 테스터로 등록하면 App
  Review 없이(본인 테스터 계정 25개까지) 즉시 사용 가능하다 — instagram-comment-reply와 동일한
  "본인 앱" 패턴.
- 개인(Personal) 인스타그램 계정은 API 지원 대상이 아니다 — 비즈니스/크리에이터(전문 계정)만
  가능하다.
- 24시간 표준 메시징 윈도우가 적용된다 — 상대방의 마지막 수신 메시지 기준 24시간 이내에만
  자유롭게 발송 가능하다. `human_agent` 태그로 7일까지 연장할 수 있다는 사실은 확인했지만,
  별도 권한 요건이 있는지는 재검증하지 못해 Phase 1에서는 쓰지 않는다.

**반영한 조치:**
1. **대화별 최초 1회 자동 응답 고지 메시지를 실제 답장보다 먼저 발송한다**
   (`dm_conversations.disclosure_sent_at`, `postDmReplyForUser`). 이게 이 프로그램이 Meta
   정책을 지키는 핵심 장치다 — 댓글 프로그램의 "사람이 승인 버튼을 누른다"에 대응하는, DM
   특유의 정책 준수 방법이다.
2. **기본값은 "검토 후 발송"** — AI 초안을 만든 뒤 웹 화면 또는 텔레그램 버튼에서 사람이
   확인·수정하고 승인해야 실제로 나간다. **(선택, 고급) 자동 발송**은 기본 꺼짐이고, 설정
   화면에서 위험 고지에 동의해야만 켤 수 있다(youtube-auto-reply의 `auto_approve` 패턴 재사용).
3. **echo 메시지 필터** — Meta 웹훅은 이 계정(봇 포함) 스스로 보낸 메시지도 `is_echo: true`로
   표시해 되돌려준다. 걸러내지 않으면 threads-comment-reply에서 발견했던 것과 같은 자기 응답
   무한 루프가 생길 수 있어, 항상 무시하도록 처리했다.
4. **웹훅 기반 실시간 수신** — 댓글 3개 프로그램은 폴링(Vercel Cron)이지만, 이 프로그램은 Meta
   웹훅이 이벤트를 실시간으로 보내주므로 자체 폴링/커서 로직이 필요 없다. 대신 "봇 활성화"
   스위치(`dm_settings.bot_enabled`)로, 웹훅이 등록돼 있어도 사용자가 명시적으로 켜야만 실제
   응답을 시작하게 했다.

## 인스타그램 OAuth — "Instagram API with Instagram Login" (Business Login)

- 인증 URL: `https://www.instagram.com/oauth/authorize`
- 스코프: `instagram_business_basic,instagram_business_manage_messages`
- 단기 토큰 교환: `POST https://api.instagram.com/oauth/access_token`
- 장기 토큰(60일) 교환: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token`
- 장기 토큰 갱신(자기 자신으로 60일 연장, 만료 24시간 전부터 가능): `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`
- DM 발송: `POST https://graph.instagram.com/v25.0/<IG_ID>/messages`,
  body `{"recipient":{"id":"<IGSID>"},"message":{"text":"..."}}`

## Meta 웹훅 — 실시간 DM 수신

- 검증 핸드셰이크: `GET /api/instagram/dm-webhook/[userId]?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...`
  — `computeInstagramVerifyToken(userId)`과 일치하면 `hub.challenge`를 그대로 에코한다.
- 실제 이벤트: `POST /api/instagram/dm-webhook/[userId]`, `X-Hub-Signature-256` 헤더를 그
  사용자의 `meta_app_secret`으로 HMAC 검증한 뒤 `entry[].messaging[]`를 순회한다.
- 구독 필드는 `messages` 하나만 쓴다(Phase 1). Meta App Dashboard의 Instagram 제품 →
  Webhooks에서 `/settings` 페이지에 표시되는 콜백 URL/Verify Token을 그대로 등록하면 된다.

## 답장 생성 AI — OpenAI / Anthropic Claude / Google Gemini 중 선택

`instagram-comment-reply`의 `lib/ai/models.ts`를 그대로 재사용하고, `lib/ai/reply.ts`의 시스템
프롬프트만 "댓글 답글" 맥락에서 "DM 1:1 상담" 맥락으로 바꿨다(고지 메시지가 이미 별도로
나가므로, 본문에서 "저는 AI입니다"를 반복하지 말라는 지시 포함).

## 데이터 모델

- `dm_accounts` — 인스타그램 OAuth 연결(user_id unique), `needs_reconnect`/`last_checked_at`/
  `reconnect_notified_at`로 연결 상태 점검·중복 알림 방지
- `dm_settings` — DM 답장 기본 링크, AI 톤 커스텀 지시문, `tone_preset`, `reply_model`,
  `disclosure_message`(자동 응답 고지 문구), `auto_approve`(기본 false), `bot_enabled`/
  `bot_started_at`(봇 활성화 스위치 + 이후 메시지만 처리하는 커트오프)
- `dm_conversations` — 상대방(IGSID)별 대화방. `customer_username`(best-effort 조회),
  `last_inbound_at`, `disclosure_sent_at`(고지 발송 여부 추적)
- `dm_messages` — 수신/발신 메시지. `direction`(in/out), 상태(`pending_review`/`posted`/
  `skipped`/`failed`), AI 초안, 텔레그램 메시지 추적. `(user_id, ig_message_id)` unique로 웹훅
  재전송 시 중복 처리 방지

## 핵심 흐름

1. `/settings` — Meta App ID/Secret + 답장 생성 AI 키(OpenAI/Anthropic/Gemini 중 택1) 등록 →
   인스타그램 계정 연결 → DM 웹훅 콜백 URL/Verify Token을 Meta App Dashboard에 등록 → 봇 활성화
   → (선택) 텔레그램 알림 연동 → 답장 기본 설정(고지 문구/링크/톤/모델)
2. **Meta 웹훅** — 새 DM이 오면 실시간으로 `/api/instagram/dm-webhook/[userId]`가 받아서 대화
   upsert → 메시지 저장 → AI 초안 생성 → (자동 발송이 꺼져 있으면) 텔레그램 승인 버튼 발송
3. `/conversations` — 검토 대기 중인 DM 목록. AI 초안 확인·수정 후 "✅ 답변승인" / "❌ 답변제외"
4. **텔레그램(선택)** — 새 DM이 오면 원본+AI 초안과 함께 승인 버튼 발송, 사용자별 웹훅이 버튼
   클릭을 받아 처리
5. **(선택) 자동 발송** — 켜면 검토 없이 AI 초안이 바로 나간다(고지 메시지 자동 포함)
6. `/history` — 총 발송 수 / 최근 7일 발송 수 / 검토 대기 수 + 최근 발송된 답장 목록

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
META_INSTAGRAM_REDIRECT_URI=
CRON_SECRET=        # Vercel Cron 인증 + 텔레그램 웹훅 secret_token + Meta 웹훅 verify_token 시드로 함께 쓰임
```

## Vercel Cron (`vercel.json`, 아직 미활성화 — 사용자 승인 후 배포)

- `/api/cron/check-connection` — 매일 1회, 인스타그램 연결 상태 점검(실제 DM 읽기/발송 없음)
- DM 수신 자체는 폴링 cron이 아니라 Meta 웹훅이 실시간으로 처리하므로, 댓글 3개 프로그램에
  있는 "5분마다 깨어나는 sync cron"은 이 프로그램에 없다.
