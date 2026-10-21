# 📸 Instagram Comment Reply — INSTA 댓글·DM 자동화 (2026-10-20 INSTA DM답변 자동화 병합)

내 인스타그램 게시물에 달린 댓글을 AI가 읽고 사람처럼 자연스러운 답글(원하는 링크 포함)을
초안으로 만들어주고, 검토 후(또는 텔레그램에서 바로) 게시할 수 있는 프로그램.
`youtube-auto-reply`(유튜브 댓글 자동 답글)를 만들고 운영한 경험을 그대로 이식했다.

## 📌 7대 핵심 항목 (2026-10-20 병합 B 완료 · v1.32 기준 — 다른 CLI는 여기부터 읽는다)

> 2026-10-20 「INSTA DM답변 자동화」(`instagram-dm-reply`)가 이 프로그램 안으로 병합되어 **「INSTA 댓글·DM 자동화」**가 되었다. 아래 이전 기록(Phase 표·버전별 항목)은 댓글 전용 시절 내용이 섞여 있으니, 현재 상태는 이 절과 맨 아래 v1.18~v1.24 항목을 기준으로 한다. 세션 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261020.md`](docs/IMPROVEMENT_HANDOFF_20261020.md)

1. **사용 목적·대상** — 인스타 비즈니스·크리에이터 계정 운영자(쇼핑몰·셀러·브랜드)가 게시물 **댓글**과 **DM 문의**에 빠르게 응대하도록, AI가 답변 초안을 만들고 사람이 「답변승인」으로 게시·발송한다. 인스타 연결 한 번(「DM 답변도 사용」)으로 둘 다 쓴다.
2. **기술 스택·스킬** — Next.js 14 App Router · TypeScript · Tailwind v3(`ig-*` 색상 토큰) · Supabase 공용 DB(`@supabase/ssr`, RLS) · Instagram API with Instagram Login(OAuth, 회원 본인 Meta 앱) · Meta 웹훅(DM 실시간 수신, 서명 검증) · OpenAI/Anthropic/Gemini(회원 본인 키) · 텔레그램 Bot API(승인 버튼 웹훅) · 공용 기준 코드(`memberIntegrations`·`program-notice-banner`, `scripts/check-shared-modules.mjs`).
3. **핵심 기능·구조·장단점**
   - 댓글: `/media`(동기화·대상 선택) → 예약 모니터링 또는 수동 확인 → `/comments`(초안 검토·승인 게시) → `/history`. 표 `ig_accounts`·`ig_media`·`ig_comments`·`ig_settings`. 게시물별 최근 20개.
   - DM: Meta 웹훅 `/api/instagram/dm-webhook/[userId]`(echo 필터·서명 검증) → `lib/dm/process` 초안 → `/dm/conversations` 검토·발송(첫 답장 전 자동 응답 고지, 24시간 창). 표 `dm_accounts`·`dm_settings`·`dm_conversations`·`dm_messages`. DM 전용 코드 `lib/dmApp/`·`components/dm/`.
   - 연결: 콜백 `/api/instagram/callback`이 메시지 권한이 있으면 `dm_accounts`·공용 `member_platform_accounts`에도 저장. 텔레그램은 댓글 봇(`program_slug=instagram-comment-reply`, `/api/telegram/webhook`)·DM 봇(`program_slug=instagram-dm-reply`, `/api/dm/telegram/webhook`) **봇 2개**.
   - 장점: 연결 한 번에 댓글·DM, 승인 후 게시(자동은 동의 후), 텔레그램 승인, 무리 없는 처리량. 단점: 전문 계정 전용, DM 24시간 제한, Meta 앱에 메시지 권한·웹훅을 회원이 직접 등록, 텔레그램 봇 2개 필요, 실제 고객 DM 왕복 시험은 아직 안 함.
4. **현재 버전·변경 히스토리** — **v1.32**. v1.32(2026-10-21) 이중 게시 방지·통합 받은편지함 링크. v1.31(2026-10-21) 토큰 갱신 코드 분리(동작 같음)·게시 묶음 공용 기준 코드 등록. v1.30(2026-10-21) 검토 화면 묶음 머리 공용 `review-group-header`(기준), 대시보드 목록 휴대폰 누르는 영역 44px. v1.29(2026-10-21) 대시보드 두 목록을 공용 기준 코드 `pending-review-list`(`components/PendingReviewList.tsx`, 이 프로그램이 기준)로 바꾸고, 대시보드에서 넘어간 묶음을 2초 강조하는 `hash-highlight`(`components/HashHighlight.tsx`, 기준)를 댓글·DM 검토 화면에 넣음. v1.28(2026-10-21) 대시보드 「검토를 기다리는 댓글」 항목 오른쪽에 게시물 썸네일, 누르면 `/comments#media-<게시물id>`(댓글 검토 화면 게시물 묶음)로 이동 — DM 목록과 같은 동작. v1.27(2026-10-21) 대시보드 「검토를 기다리는 DM」을 대화별 1건으로 묶어 24시간 답장 가능 시간 배지(4시간 미만 경고색·만료 빨강)와 함께 남은 시간이 적은 순(만료는 맨 뒤)으로 3건, 누르면 `/dm/conversations#conv-<대화id>`로 바로 이동. v1.26(2026-10-21) 댓글 검토 화면의 게시물 묶음 머리에 게시물 썸네일(`ig_media.thumbnail_url`, 누르면 인스타 원본 `permalink` 새 창, 없으면 🖼️) · 대시보드 왼쪽 열 댓글 목록 아래에 「💌 검토를 기다리는 DM」 최근 3건(`dm_messages` direction=in·pending_review + `dm_conversations.customer_username`, DM 미사용이면 켜는 안내). v1.25(2026-10-21) 다크 전환 뒤 4개 화면 점검: `/dm/history`·`/history` 선택 탭이 글자색(`bg-ig-text`)을 바탕으로 써서 밝은 알약으로 보이던 것을 `bg-ig-primary text-white`로 수정(나머지 화면·검토 카드는 밝은 색 없음). v1.18 DM 화면·기능 이식 / v1.19~v1.22 텔레그램 연동(봇 이름 표시·봇 구분 배지·`allowed_updates` 수정·실패 진단) / v1.23 대시보드·기록 통합·이름 통일 / v1.24 DM 설정 값 정리·통합 매뉴얼·플로우 위저드 스타일(다크)·공지 띠. 옛 `instagram-dm-reply` v1.17은 화면 이동·API 전달만.
5. **남은 작업·백로그** — [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md): 실제 DM 왕복 시험, 다크 전환 후 댓글·DM 검토·로그인 화면 대비 점검, 옛 instagram-dm-reply 폴더 코드 정리 시점 결정, 텔레그램 연동 공용화.
6. **연계·병합 아이디어** — INSTA 포스팅(같은 템플릿·같은 Meta 앱)에서 게시한 글의 댓글을 바로 모니터링 대상으로 / threads·유튜브 댓글자동화와 「통합 댓글 받은편지함」 / 텔레그램 승인 봇 연동 공용 모듈(`docs/SHARED_FEATURE_MAP.md` 10절).
7. **UI/UX 개선안** — 디자인 「플로우 위저드 스타일 (인스타 바이럴 변형)」(`docs/DESIGN_HANDOFF.md`). 제안: 댓글 검토 카드에 게시물 썸네일, 대시보드에 DM 대기 목록도 함께, 휴대폰에서 검토 카드 한 손 조작(버튼 하단 고정).

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
2. **(선택, 고급) 자동 게시**는 기본 꺼짐이고, 설정 화면에서 위험 고지에 동의해야만 켤 수
   있다. 켜져 있어도 댓글마다 AI가 매번 새로 생성한 답글만 게시된다(youtube-auto-reply와 동일한
   `auto_approve` 패턴, 2026-08-26 추가). 본인 계정이 단 답글을 새 댓글로 잘못 인식해 무한
   자기답글 루프가 생기지 않도록, 작성자 username이 본인 계정과 같으면 항상 제외한다.
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


## 2026-10-16 DB 연동 변수 호환 — v1.06 (instagram-comment-reply)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 디자인 (v1.14)
- [디자인 인수인계](docs/DESIGN_HANDOFF.md) · [개선 원장](docs/IMPROVEMENTS.md) · [인수인계 2026-10-17](docs/IMPROVEMENT_HANDOFF_20261017.md)
