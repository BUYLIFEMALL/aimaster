# 🟢 Naver Cafe Poster — 네이버 카페 포스팅 자동화

AIMaster 회원이 본인 네이버 계정을 연동하고 본인이 활동하는 카페 게시판을 등록하면, AI가
만든 게시글을 그 카페에 자동으로 등록해주는 프로그램입니다.

## 설계 배경

### 1. threads-affiliate-poster를 스캐폴드 템플릿으로 사용
Next.js 16 App Router, Supabase 인증/RLS, `requireProgramAccess()`/`checkProgramAccessApi()`
패턴, UI 컴포넌트(Button/Input/Textarea 등)를 `threads-affiliate-poster`에서 그대로
가져왔다. Threads/쿠팡/알리익스프레스/토스 관련 코드는 전부 제거하고 네이버 카페 전용
코드로 교체했다.

### 2. 공유 앱 + 회원별 OAuth 연동
네이버 로그인은 이 프로젝트가 등록한 단일 개발자센터 앱을 모든 회원이 공유하고, 각자
본인 계정으로 로그인해 access token을 받는다(Threads 공용 Meta 앱 패턴과 동일). 앱 등록
시 "카페" API를 사용 API로 추가해야 카페 가입/글쓰기 권한이 부여된다.

### 3. 카페 club_id/menu_id는 수동 입력
네이버 카페 오픈API는 "내 카페 목록 조회"/"게시판 목록 조회" API를 제공하지 않는다(가입/
글쓰기 2개 엔드포인트뿐). 그래서 회원이 본인 카페 관리 화면에서 club_id/menu_id를 직접
확인해 설정 페이지에서 등록한다.

자세한 배경/제약사항은 [AGENTS.md](AGENTS.md) 참고.

## 환경변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=https://naver-cafe-poster.vercel.app
NEXT_PUBLIC_MAIN_SITE_URL=https://buylife.xyz

NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
NAVER_REDIRECT_URI=https://naver-cafe-poster.vercel.app/api/naver/callback

# 예약(정기 자동 생성+포스팅) 크론 보호용 — 아무 임의 문자열이나 발급해 등록
CRON_SECRET=
```

## DB 테이블

- `ncafe_accounts` — 네이버 로그인 연동(user_id unique, naver_id, nickname, access_token,
  refresh_token, token_expires_at)
- `ncafe_targets` — 게시할 카페 게시판(user_id, label, club_id, menu_id)
- `ncafe_posts` — 게시글 이력(user_id, target_id, title, content, status, cafe_article_url,
  raw_response, error_message)
- `ncafe_scheduled_sources` — 예약 자동 생성·포스팅 소스(user_id, source_type, source_input,
  source_label, target_id, auto_post, schedule_enabled, interval_minutes, last_run_at,
  is_active, last_error)

## 예약 자동 생성·포스팅 (2026-09-15)

`/candidates`의 "글감 수집" 아래 "🔔 예약 자동 생성·포스팅" 패널에서, 수집 소스(HTTP/RSS/
Perplexity)와 게시할 카페를 등록하고 주기(1시간~매주)를 켜두면 Vercel Cron이 정해둔 주기마다
AI 콘텐츠 1건을 자동 생성한다. 소스별 "자동 포스팅" 스위치가 켜져 있으면 검토 없이 바로
게시하고, 꺼두면 초안으로 저장돼 `/drafts`에서 검수 후 배포한다.

- 크론: `vercel.json`의 `*/5 * * * *` 스케줄이 `/api/cron/generate-and-post`를 5분마다
  깨우고, 이 라우트가 `ncafe_scheduled_sources.last_run_at`/`interval_minutes` 기준으로
  실제 실행 대상을 골라낸다(kakao_auto_poster의 `generate-reports` 크론과 동일한 "5분마다
  깨우기 + 자체 판단" 패턴 — 하나의 크론으로 소스마다 다른 주기를 지원하기 위함).
- 핵심 로직은 `src/lib/naver/account.ts`(계정/타겟 조회, 세션·admin 클라이언트 겸용)와
  `src/lib/scheduledSource/engine.ts`(`runScheduledSource`)에 모아, 수동 "지금 실행"과
  크론 실행이 동일한 코드 경로를 탄다.
- 예약 실행은 항상 정확히 1건만 생성한다 — 수동 "글감 수집"처럼 최대 5건을 한 번에 만들면
  예약 주기마다 비용/게시량이 걷잡을 수 없이 늘어나기 때문.

## 남은 작업

- 네이버 개발자센터 앱 등록(Client ID/Secret 발급) — 사용자가 직접 진행
- 실계정으로 첫 게시 테스트 → `createCafeArticle()` 응답 스키마 확인 후 클라이언트 보강
- `programs` 카탈로그 등록 + Vercel 배포
- 예약 자동 포스팅을 실계정으로 "지금 실행"까지 끝까지 테스트(유료 API 호출 + 실제 게시
  가능성이 있어 사전 승인 후 진행할 것)
