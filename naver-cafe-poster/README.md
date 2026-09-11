# 🟢 Naver Cafe Poster — 네이버 카페 자동화

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
```

## DB 테이블

- `ncafe_accounts` — 네이버 로그인 연동(user_id unique, naver_id, nickname, access_token,
  refresh_token, token_expires_at)
- `ncafe_targets` — 게시할 카페 게시판(user_id, label, club_id, menu_id)
- `ncafe_posts` — 게시글 이력(user_id, target_id, title, content, status, cafe_article_url,
  raw_response, error_message)

## 남은 작업

- 네이버 개발자센터 앱 등록(Client ID/Secret 발급) — 사용자가 직접 진행
- 실계정으로 첫 게시 테스트 → `createCafeArticle()` 응답 스키마 확인 후 클라이언트 보강
- `programs` 카탈로그 등록 + Vercel 배포
