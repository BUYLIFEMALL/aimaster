# 📸 Instagram Comment Reply — 인스타그램 댓글자동화

내 인스타그램 게시물에 달린 댓글을 AI가 읽고 사람처럼 자연스러운 답글(원하는 링크 포함)을
초안으로 만들어주고, 검토 후(또는 텔레그램에서 바로) 게시할 수 있는 프로그램.
`youtube-auto-reply`(유튜브 댓글 자동 답글)를 만들고 운영한 경험을 그대로 이식했다.

## 설계 배경 — "차단당하지 않게" 설계한 방법

`youtube-auto-reply`를 만들 때처럼, 실제로 계정이 차단(Action Blocked)되지 않도록 착수 전에
Meta 공식 개발자 문서·정책 문서·커뮤니티 사례·기존 상용 서비스를 조사했다.

- 공식 API(Instagram Graph API, `GET /{ig-media-id}/comments` + `POST /{ig-comment-id}/replies`)로
  댓글을 읽고 답글을 다는 것 자체는 **커뮤니티에서 안전하다고 평가되는 방식**이다. 실제 계정
  차단 사례는 거의 전부 **비공식 도구**(Selenium/instagrapi류 스크래퍼, 브라우저 확장 등)에서
  나온다 — 공식 API 호출이 원인이 된 사례는 확인되지 않았다.
- **Meta Developer Policy §1.7**: "API로 사용자를 대신해 게시하거나 행동을 취하기 전에 반드시
  사용자의 사전 동의를 받아야 한다" — 유튜브의 III.I.2조와 정확히 같은 취지다.
- **§5.2.2(d)는 유튜브보다 더 엄격하다**: "사전에 채워진(pre-filled)/정형화된(templated)
  메시지"는 원칙적으로 금지된다(앱 사용자 본인이나 승인된 담당자가 직접 작성한 경우만 예외).
  즉 "댓글마다 AI가 매번 새로 생성하는 답글"은 정책상 요구사항이지 선택사항이 아니다.
- `instagram_business_manage_comments` 같은 권한은 App Review(전체 사용자 흐름 스크린캐스트
  필수)를 통과해야 "그 앱을 쓰는 아무 사용자"에게 열린다. 하지만 유튜브 프로젝트와 동일하게
  **사용자마다 자기 소유의 Meta 앱을 만들어 자기 자신을 그 앱의 테스터로 등록**하면, App
  Review 없이도 본인 계정만 즉시 연결해 쓸 수 있다(App Review는 "등록된 사용자 외의 제3자에게
  권한을 확장할 때"만 필요하기 때문 — 유튜브의 "검증 안 된 앱 + 본인 프로젝트" 패턴과 동일한
  원리).
- 개인(Personal) 인스타그램 계정은 API 지원 대상이 아니다 — 비즈니스/크리에이터(전문 계정)만
  가능하다.
- Rate Limit은 고정 수치가 아니라 **계정 노출수(impression) 비례**(24시간당 `4800 × 노출수`)라,
  한 번 동기화당 게시물별 최근 댓글 20개까지만 가져오는 것으로 충분히 안전하게 관리된다
  (youtube-auto-reply의 영상당 20개 제한과 동일한 접근).

**반영한 조치:**
1. **AI가 댓글마다 다른 답글 초안을 생성 → 사람이 검토·수정 → "답변승인"을 직접 눌러야만
   실제로 올라간다.** 이 클릭 자체가 §1.7이 요구하는 "건별 사전 명시적 동의"다
   (`lib/comments/post.ts`의 `postCommentReplyForUser`, 웹 화면과 텔레그램 승인 버튼 양쪽에서
   공유).
2. **(선택) 자동 게시 기능은 Phase 1에 아예 만들지 않는다** — §5.2.2(d)가 유튜브보다 엄격해
   안전 마진을 더 뒀다. youtube-auto-reply의 자동 게시 토글도 매번 새로 AI가 생성한다는 전제는
   같지만, 인스타그램은 정책 문구 자체가 "정형화 금지"를 더 명시적으로 걸고 있어 신중을 기했다.
3. 한 번 동기화당 게시물별 최근 댓글 20개까지만 가져와서, 몰아서 대량 처리하지 않는다.

## 인스타그램 OAuth — "Instagram API with Instagram Login" (Business Login)

Facebook Page 연결이 필요했던 예전 방식(Facebook Login) 대신, 인스타그램 비즈니스/크리에이터
계정만으로 바로 로그인할 수 있는 최신 방식을 쓴다.

- 인증 URL: `https://www.instagram.com/oauth/authorize`
- 스코프: `instagram_business_basic,instagram_business_manage_comments`
- 단기 토큰 교환: `POST https://api.instagram.com/oauth/access_token`
- 장기 토큰(60일) 교환: `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token`
- 장기 토큰 갱신(자기 자신으로 60일 연장, 만료 24시간 전부터 가능): `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`

유튜브와 달리 별도 refresh_token이 없다 — 같은 장기 access_token으로 스스로를 갱신한다(만료
3일 전부터 미리 갱신, `getValidInstagramAccessToken()`). `meta_app_id`/`meta_app_secret`은
사용자가 본인 Meta App Dashboard에서 만든 앱의 값이며(공용 buylife 앱 불가), 리디렉션 URI를
그 앱에 추가로 등록하고 본인 계정을 테스터로 추가해야 한다(설정 화면에 안내 문구 있음).

## 답글 생성 AI — OpenAI / Anthropic Claude / Google Gemini 중 선택

`youtube-auto-reply`의 `lib/ai/models.ts`/`lib/ai/reply.ts`를 그대로 재사용한다. 사용자는
`/settings`의 "답글 생성 AI 모델"에서 provider별 모델 중 하나를 고르고, 그 provider의 키만
등록하면 된다.

## 데이터 모델

- `ig_accounts` — 인스타그램 OAuth 연결(user_id unique), `needs_reconnect`/`last_checked_at`/
  `reconnect_notified_at`로 연결 상태 점검·중복 알림 방지
- `ig_media` — 게시물 동기화 결과. `is_monitored`(기본 true) + `custom_link`(게시물별 링크
  오버라이드) + `is_hidden`(목록에서 숨김, 모니터링도 함께 꺼짐)
- `ig_settings` — 게시물 기본 링크, AI 답글 톤 커스텀 지시문, `tone_preset`, `reply_model`,
  예약 모니터링 설정(`monitoring_enabled`/`monitoring_interval_minutes`/`monitoring_started_at`/
  `last_run_at`). **`auto_approve` 컬럼 없음**(Phase 1 범위 아님)
- `ig_comments` — 수집한 댓글 + AI 초안 + 상태(`pending_review`/`posted`/`skipped`/`failed`) +
  텔레그램 메시지 추적

## 핵심 흐름

1. `/settings` — Meta App ID/Secret + 답글 생성 AI 키(OpenAI/Anthropic/Gemini 중 택1) 등록 →
   인스타그램 계정 연결 → (선택) 텔레그램 알림 연동 → 답글 기본 설정(링크/톤/모델) → 예약
   모니터링
2. `/media` — "계정 게시물 동기화" → 게시물 목록(기본 전체 모니터링) → 개별 on/off·링크
   오버라이드·숨기기, 체크박스로 여러 게시물 일괄 처리
3. `/comments` — 상단에 지금 적용 중인 답글 설정/예약 모니터링 상태를 sticky 요약으로 표시.
   "지금 새 댓글 확인하기" → 신규 댓글 수집 + AI 초안 생성 → 검토·수정 → "✅ 답변승인" / "❌ 답변제외"
4. **텔레그램(선택)** — 새 댓글이 오면 원본+AI 초안과 함께 승인 버튼 발송, 사용자별 웹훅이
   버튼 클릭을 받아 처리
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
META_INSTAGRAM_REDIRECT_URI=
CRON_SECRET=        # Vercel Cron 인증 + 텔레그램 웹훅 secret_token 시드로 함께 쓰임
```

## Vercel Cron (`vercel.json`, 아직 미활성화 — 사용자 승인 후 배포)

- `/api/cron/check-connection` — 매일 1회, 인스타그램 연결 상태 점검(실제 댓글 읽기/게시 없음)
- `/api/cron/sync-comments` — 5분마다 깨어나, 사용자별 예약 모니터링 주기가 됐는지 판정 후
  해당 사용자만 `runCommentSync` 실행
