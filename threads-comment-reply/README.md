# 🧵 Threads Comment Reply — Threads 댓글자동화

내 쓰레드(Threads) 게시물에 달린 댓글을 AI가 읽고 사람처럼 자연스러운 답글(원하는 링크 포함)을
초안으로 만들어주고, 검토 후(또는 텔레그램에서 바로) 게시할 수 있는 프로그램.
`instagram-comment-reply`(INSTA 댓글자동화)를 만들고 운영한 경험을 그대로 이식했다.

## 설계 배경 — "차단당하지 않게" 설계한 방법

instagram-comment-reply를 만들 때와 동일하게, Meta 공식 개발자 문서를 직접 확인한 뒤 설계했다.

- **댓글 조회/답글 게시가 공식 API로 전부 지원된다** — `GET /{media-id}/conversation`(대댓글
  포함 전체 댓글 조회) + 게시물 작성과 동일한 컨테이너 흐름에 `reply_to_id`를 추가하는 방식의
  답글 게시. (공식 문서:
  `developers.facebook.com/docs/threads/retrieve-and-manage-replies/replies-and-conversations/`)
- **Meta Developer Policy는 Facebook/Instagram/Threads 전체에 적용되는 단일 문서**라, §1.7(사전
  동의)·§5.2.2(d)(정형화된 메시지 금지)가 instagram-comment-reply 때와 동일하게 적용된다고 보고
  설계했다 — 댓글마다 AI가 매번 새로 생성한 답글만 게시하고, 고정 템플릿 반복 게시 기능은 없다.
- **`threads_manage_replies` 권한은 App Review가 필요하다** — 단, 앱 소유자가 "역할(Roles)"에
  본인을 테스터로 등록해두면 App Review 없이 Standard Access로 즉시 사용 가능하다(인스타그램과
  동일한 원리). **기존 `threads/`(Threads 자동 포스팅) 서브프로젝트가 쓰는 공용 Meta 앱은 이미
  라이브 상태(다수 사용자 대상)라 여기에 새 권한을 추가하면 새 App Review가 필요하므로, 그 앱을
  확장하지 않고 이 프로젝트도 인스타그램과 동일하게 "사용자별 본인 앱 등록" 패턴을 그대로
  쓴다.**

**반영한 조치:**
1. **AI가 댓글마다 다른 답글 초안을 생성 → 사람이 검토·수정 → "답변승인"을 직접 눌러야만
   실제로 올라간다.** (`lib/comments/post.ts`의 `postCommentReplyForUser`, 웹 화면과 텔레그램
   승인 버튼 양쪽에서 공유)
2. **(선택) 자동 게시 기능은 Phase 1에 만들지 않는다** — instagram-comment-reply와 동일한
   안전 마진.
3. 한 번 동기화당 게시물별 최근 댓글 20개까지만 가져온다.

## 쓰레드 OAuth — 기존 `threads/` 서브프로젝트와 같은 흐름, 사용자별 본인 앱

- 인증 URL: `https://threads.net/oauth/authorize`
- 스코프: `threads_basic,threads_content_publish,threads_read_replies,threads_manage_replies`
- 단기 토큰 교환: `POST https://graph.threads.net/oauth/access_token`
- 장기 토큰(60일) 교환: `GET https://graph.threads.net/access_token?grant_type=th_exchange_token`
- 장기 토큰 갱신(발급 후 24시간~60일 사이 가능): `GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token`

기존 `threads/`의 OAuth·컨테이너/게시 흐름(`createReplyContainer`/`publishReplyContainer`,
게시물 작성과 동일한 2단계 흐름에 `reply_to_id`만 추가)을 그대로 재사용한다. 유튜브/인스타그램과
달리 별도 refresh_token이 없다 — 같은 장기 access_token으로 스스로를 갱신한다(만료 3일 전부터
미리 갱신, `getValidThreadsAccessToken()`). `meta_app_id`/`meta_app_secret`은 사용자가 본인 Meta
App Dashboard에서 만든 앱의 값이며(공용 buylife 앱 불가), 리디렉션 URI를 그 앱에 추가로 등록하고
본인 계정을 테스터로 추가해야 한다(설정 화면에 안내 문구 있음).

## 답글 생성 AI — OpenAI / Anthropic Claude / Google Gemini 중 선택

instagram-comment-reply의 `lib/ai/models.ts`/`lib/ai/reply.ts`를 그대로 재사용한다. 사용자는
`/settings`의 "답글 생성 AI 모델"에서 provider별 모델 중 하나를 고르고, 그 provider의 키만
등록하면 된다.

## 데이터 모델

- `th_accounts` — 쓰레드 OAuth 연결(user_id unique), `needs_reconnect`/`last_checked_at`/
  `reconnect_notified_at`로 연결 상태 점검·중복 알림 방지
- `th_posts` — 게시물 동기화 결과. `is_monitored`(기본 true) + `custom_link`(게시물별 링크
  오버라이드) + `is_hidden`(목록에서 숨김, 모니터링도 함께 꺼짐)
- `th_settings` — 게시물 기본 링크, AI 답글 톤 커스텀 지시문, `tone_preset`, `reply_model`,
  예약 모니터링 설정(`monitoring_enabled`/`monitoring_interval_minutes`/`monitoring_started_at`/
  `last_run_at`). **`auto_approve` 컬럼 없음**(Phase 1 범위 아님)
- `th_comments` — 수집한 댓글 + AI 초안 + 상태(`pending_review`/`posted`/`skipped`/`failed`) +
  텔레그램 메시지 추적

## 핵심 흐름

1. `/settings` — Meta App ID/Secret + 답글 생성 AI 키(OpenAI/Anthropic/Gemini 중 택1) 등록 →
   쓰레드 계정 연결 → (선택) 텔레그램 알림 연동 → 답글 기본 설정(링크/톤/모델) → 예약 모니터링
2. `/media` — "게시물 동기화" → 게시물 목록(기본 전체 모니터링) → 개별 on/off·링크
   오버라이드·숨기기, 체크박스로 여러 게시물 일괄 처리
3. `/comments` — 상단에 지금 적용 중인 답글 설정/예약 모니터링 상태를 sticky 요약으로 표시.
   "지금 새 댓글 확인하기" → 신규 댓글 수집 + AI 초안 생성 → 검토·수정 → "✅ 답변승인" / "❌ 답변제외"
4. **텔레그램(선택)** — 새 댓글이 오면 원본+AI 초안과 함께 승인 버튼 발송, 사용자별 웹훅이
   버튼 클릭을 받아 처리(다른 승인-버튼 프로그램과 봇을 공유하면 웹훅 슬롯이 충돌하므로 **반드시
   별도 봇을 만들어 연결**해야 함)
5. **예약 모니터링** — 사용자가 고른 주기마다 Vercel Cron이 자동으로 새 댓글을 확인해 초안까지
   만들어둔다(게시는 항상 사람 승인)
6. `/history` — 총 게시 수 / 최근 7일 게시 수 / 검토 대기 수 + 최근 게시된 답글 목록

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
META_THREADS_REDIRECT_URI=
CRON_SECRET=        # Vercel Cron 인증 + 텔레그램 웹훅 secret_token 시드로 함께 쓰임
```

## Vercel Cron (`vercel.json`, 아직 미활성화 — 사용자 승인 후 배포)

- `/api/cron/check-connection` — 매일 1회, 쓰레드 연결 상태 점검(실제 댓글 읽기/게시 없음)
- `/api/cron/sync-comments` — 5분마다 깨어나, 사용자별 예약 모니터링 주기가 됐는지 판정 후
  해당 사용자만 `runCommentSync` 실행
