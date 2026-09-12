# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **네이버 카페 자동화(naver-cafe-poster)** 프로젝트에서 AI Agent(Claude Code 등)가
협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
파일 생성/코드 수정, 패키지 설치, 로컬 테스트/빌드, 스키마 추가/마이그레이션.

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
1. 파일이나 폴더 삭제
2. Git push
3. 실제 서비스 배포(Vercel 프로덕션)
4. 데이터베이스 데이터 삭제
5. 환경변수와 API 키 변경
6. 유료 API 호출(AI 게시글 생성 등)
7. **실제 게시(`publishCafePost`)** — 사람이 대시보드에서 내용을 직접 확인·수정한 뒤 "게시"
   버튼을 눌러야만 실행된다. 예약 게시 개념 자체가 없다(즉시 게시만 지원).

---

## 🎯 프로젝트 목적

AIMaster 회원이 각자 본인 네이버 계정을 연동하고, 본인이 운영/활동하는 카페의 게시판을
등록하면, AI가 만든 게시글을 그 카페에 자동으로 등록해주는 멀티테넌시 SaaS 프로그램.

**중요 — 이 프로젝트는 buylifemall 내부 도구가 아니다.** "공동구매 공식카페 가입 연결",
"강의 수강생 전용카페 가입" 같은 아이디어가 처음 논의됐을 때 표현만 보면 운영자 전용 도구처럼
보였지만, 2026-09-11 사용자에게 직접 확인한 결과 **AIMaster 회원이 각자 본인 카페를 연동해
쓰는 SaaS 기능**으로 확정됐다(threads-affiliate-poster 등 기존 서브프로젝트와 동일한 멀티테넌시
원칙 적용). 카페 "가입 유도 자동화"는 아직 구현 전(Phase 2)이며, 착수 전에 이 문서의 Phase
표부터 갱신할 것.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `naver-cafe-poster/`
* Next.js 16(App Router, `src/` 디렉토리 구조) — `threads-affiliate-poster/`를 스캐폴드
  템플릿으로 복제해서 시작했다(2026-09-11). 인증/레이아웃/UI 컴포넌트 등 범용 코드는
  그대로 재사용했고, Threads/쿠팡/알리익스프레스/토스 관련 코드는 전부 제거했다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

naver-cafe-poster는 AIMaster 저장소 안의 서브프로젝트다. 루트 `../CLAUDE.md`를 메인 지침으로
함께 따른다. 핵심 요약:

- `programs.slug = "naver-cafe-poster"` 이용 권한(구독/개별부여/등급)이 있는 모든 AIMaster
  회원이 각자 계정으로 쓸 수 있는 멀티테넌시 SaaS다.
- 페이지는 `requireProgramAccess()`, API route는 `checkProgramAccessApi()`로 권한을 확인한다
  (`src/lib/access.ts`).
- 사용자 소유 데이터(`ncafe_accounts`, `ncafe_targets`, `ncafe_posts`)는 `user_id` + RLS
  owner-only로 격리한다.
- **API 키는 본인 키만 사용, 관리자 키 폴백 없음** — `src/lib/apiKeys.ts` (openai만 사용).

### 테이블명이 다른 서브프로젝트와 겹치지 않도록 접두어를 붙였다
공용 Supabase 프로젝트에 이미 `naver_search_cache`/`naver_trend_cache`(threads-affiliate-poster,
검색어트렌드 기능용) 테이블이 있어서, 이 프로젝트는 **`ncafe_accounts`/`ncafe_targets`/
`ncafe_posts`**(naver-cafe-poster 접두어)로 분리했다(2026-09-11, `information_schema.tables`
전체 대조 후 결정). 새 테이블을 추가할 때도 이름이 겹치지 않는지 먼저 확인할 것.

### 네이버 로그인 OAuth — 공유 앱 + 회원별 연동 구조
- Threads/Instagram(threads-affiliate-poster, threads/, instagram-comment-reply 등)이 공용
  Meta 앱을 재사용하는 것과 같은 구조다: 이 프로젝트가 네이버 개발자센터에 앱을 **하나만**
  등록(`NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`)하고, 모든 회원이 그 앱을 통해 각자 본인
  네이버 계정으로 로그인해 access token을 받는다. 그 토큰으로는 **연동한 본인 명의로만**
  카페 가입/글쓰기가 된다.
- 네이버 로그인 authorize 엔드포인트(`https://nid.naver.com/oauth2.0/authorize`)는 OAuth2
  표준과 달리 `scope` 파라미터가 없다 — 카페 가입/글쓰기 같은 "제공 정보" 접근 권한은
  개발자센터 앱 등록 화면에서 미리 체크해둔 설정으로 결정된다(2026-09-11 확인,
  blog.itcode.dev의 OAuth 가이드 근거).
- **앱 등록 시 필요한 것**: 개발자센터에서 애플리케이션 등록 → "로그인 오픈 API" 체크 →
  사용 API에 "카페" 추가 → Callback URL에 `https://naver-cafe-poster.vercel.app/api/naver/callback`
  등록 → 발급받은 Client ID/Secret을 Vercel 환경변수에 설정.

### 네이버 카페 오픈API의 구조적 한계 (설계에 반영됨)
2026-09-11 확인: 네이버 카페 오픈API는 **가입(`POST /v1/cafe/{clubid}/members`)과 글쓰기
(`POST /v1/cafe/{clubid}/menu/{menuid}/articles`) 딱 2개뿐**이고, "내 카페 목록 조회"나
"게시판(메뉴) 목록 조회" API가 아예 없다. 그래서:
- 회원이 게시할 카페의 `club_id`/`menu_id`를 **직접 입력**해야 한다(`ncafe_targets` 테이블,
  설정 페이지의 `CafeTargetManager`) — 본인 카페 관리 화면 URL의 쿼리스트링에서 확인 가능.
- 글쓰기 API의 정확한 요청 파라미터는 커뮤니티 문서로 확인했다(`subject`/`content`/`openyn`,
  URL-encoded POST body, `Authorization: Bearer {token}` 헤더) — 이건 신뢰도가 높다.
- **하지만 성공 응답의 정확한 JSON 필드명(게시글 ID/URL 등)은 아직 확인 못 했다** —
  developers.naver.com 상세 문서는 로그인이 필요해 이 환경(WebFetch)에서 접근이 막혀 있다.
  그래서 `src/lib/naver/client.ts`의 `createCafeArticle()`은 HTTP status만으로 성공/실패를
  판단하고, 원본 응답 전체를 `ncafe_posts.raw_response`(jsonb)에 그대로 저장해둔다.
  **실계정으로 첫 게시 테스트를 할 때 이 raw_response를 확인해서, 응답에서 게시글 URL 등을
  파싱해 보여줄 가치가 있는 필드가 있으면 그때 클라이언트/화면 코드를 보강할 것** — 이
  프로젝트에서 처음으로 실제 API를 두드려보는 순간이니, 쿠팡파트너스 때처럼 가정과 실제
  응답이 다를 가능성을 염두에 둘 것(threads-affiliate-poster의 쿠팡 서명/딥링크 버그 사례
  참고).

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | 네이버 로그인 OAuth 연결(공용 앱), 카페 게시판(club_id/menu_id) 수동 등록, AI 게시글 생성(OpenAI, 제목+본문), 즉시 게시(`createCafeArticle`), 게시 이력 관리 | ✅ 구현 완료 — **2026-09-12 실계정으로 실제 게시 성공까지 검증 완료**(cafe.naver.com/buylife/2984~2991). 이 과정에서 여러 버그를 발견·수정했다: (1) access token 만료(1시간) 시 자동 갱신 로직 부재 → `getNaverAccountOrError()`에 refresh_token 갱신 추가 (2) 한글이 깨져서 올라가는 문제 → 아래 별도 항목 참고 (3) 비활성화 버튼 글자색 대비 부족(공용 `Button` 컴포넌트 버그, 흰 글자+연한 회색 배경이라 사실상 안 보였음) 수정 |
| 1 | `programs`/`pricing_plans` 카탈로그 등록(네이버 카테고리, required_grade_id=일반, 1/2/3개월 기본 3단계 요금제) | ✅ 완료(2026-09-11) — 등록 전엔 로그인 후 `/dashboard` 등 진입 시 `requireProgramAccess()`가 `buylife.xyz/programs/naver-cafe-poster`로 리다이렉트했는데 그 프로그램 자체가 카탈로그에 없어 404가 났었다(사용자가 직접 발견해 알려줌) — 등록 후 200 확인 |
| 1 | Vercel 배포(Client ID/Secret, Supabase 접속정보 env 설정) | ✅ 완료(2026-09-11) — `vercel env pull`로 다른 프로젝트 값을 옮기려다 이 환경이 pull 결과값을 "[SENSITIVE]" 자리표시자로 치환하는 걸 모르고 그대로 넣어 Supabase URL 등이 전부 깨졌던 사고가 있었다. Supabase URL/anon key는 Supabase MCP(`get_project_url`/`get_publishable_keys`)로, service_role key는 사용자에게 직접 복사해서 받아 해결했다. **교훈: 이 환경에서 `vercel env pull`로 받은 파일의 값은 그대로 다른 곳에 재사용하지 말 것** — 항상 [SENSITIVE]로 치환되어 있을 수 있다. Supabase 값은 MCP로, 그 외 비밀값은 사용자에게 직접 요청해서 받을 것.
| 1 | 글감 수집(HTTP/RSS-NewsBlur/Perplexity) — threads/shots의 콘텐츠 수집 패턴(docs/PLATFORM_PATTERNS.md §2) 그대로 재사용. `ncafe_candidates` 테이블(RLS owner-only), `newsblur_accounts`는 앱 무관 공유 테이블이라 그대로 재사용, `/candidates`에서 후보 생성 후 "이 후보로 AI 글쓰기" → `/drafts?title=...&content=...`로 프리필 | ✅ 구현 완료(2026-09-11) — HTTP/RSS 스크래핑 로직은 threads와 100% 동일, AI 구조화 프롬프트만 카페 톤(존댓말, 글자수 제한 없음)으로 교체. Perplexity API 키 항목을 `ApiKeyProvider`/설정 페이지에 추가 |
| 1 | **AI 글쓰기(`/drafts`)** — "생성 → 수정 → 검수 → 배포"를 명확히 분리된 단계로 만들었다. 기존엔 `/posts/new`에서 작성 즉시 자동 게시됐는데, 사용자가 "자동 생성하고 수정하고 검수후 배포하는 작업을 할 것"이라고 명시적으로 요청해 구조를 바꿨다: `saveDraftAction`은 카페(targetId) 없이도 초안(status='draft')만 저장하고 게시하지 않는다. `/drafts` 목록(상태가 draft 또는 failed인 글만)에서 각 초안을 인라인으로 수정(`updateDraftAction`)하거나 "검수 완료 · 배포" 버튼으로 실제 게시(`deployDraftAction`, 기존 발행 로직 재사용)한다. `/posts/new`는 제거하고 `/posts`(게시글 관리)는 전체 이력 로그 역할만 남겼다 | ✅ 구현 완료(2026-09-11) |
| 1 | **AI 글쓰기 세부 옵션 확장(blog AI 글쓰기 폼 전체 이식)** — 사용자가 "blog(BLOG(원문)생성 자동화)의 AI 글쓰기 폼을 적용해달라"고 두 번 요청(처음엔 텍스트 옵션만 이식해서 "다 안 했다"는 지적을 받음)해, `blog/app/write/ai-form/page.tsx` + `blog/utils/news/generator.ts`의 옵션을 **전부** 이식했다: 추천 주제 칩, 글 분위기(tone), 대상 독자, 목표 분량 슬라이더(500~2000단어, blog와 동일 range), 키워드 칩 입력, 참고 URL 최대 3개, 추천 링크(CTA), 추가 지시사항 + **나노바나나(Gemini) AI 이미지 생성**(이미지 모델 4종 선택, 인라인 API 키 오버라이드, 커스텀 엔드포인트, `post-images` 공용 Storage 버킷에 업로드해 `ncafe_posts.image_url`로 저장). 참고 URL은 blog와 동일하게 실제로 스크랩하지 않고 URL 문자열만 AI에게 참고하라고 넘긴다(모델이 아는 URL일 때만 반영됨 — 실제 스크랩이 필요하면 `lib/ai/collector.ts`의 `fetchUrlText`를 붙이는 걸 고려할 것). `CafeTone`/`CAFE_TONE_OPTIONS`는 `lib/ai/tone.ts`로 따로 뺐다 — 클라이언트 컴포넌트(`DraftComposer`)가 `server-only`가 붙은 `cafeGenerator.ts`를 직접 import하면 빌드 에러가 나기 때문. **의도적으로 이식하지 않은 것**: blog의 "카테고리(복수선택)"는 카페 자동화에서 이미 "등록할 카페(target)" 선택이 그 역할을 대신하므로 빼먹은 게 아니라 대응 개념이 달라 제외함 | ✅ 구현 완료(2026-09-11) |
| 1 | **한글 인코딩 + 실제 이미지 첨부** — 2026-09-12 실계정 게시에서 제목/본문 한글이 전부 깨져서 올라가는 버그와 이미지가 첨부되지 않는 문제를 실계정 재현 테스트로 조사·수정했다. **한글 인코딩**: 전송 방식에 따라 네이버 서버의 디코딩 횟수가 다르다 — `application/x-www-form-urlencoded`는 값을 퍼센트 인코딩 후 **한 번 더** 인코딩해야 정상 표시되고(`encodeURIComponent`를 두 번 적용), `multipart/form-data`는 **한 번만** 인코딩해야 한다(두 번 하면 "%EC%9D%B4..." 문자열이 그대로 저장되고, 인코딩을 안 하면 "&#65533;"/"�"로 깨짐 — 둘 다 실계정 테스트로 재현). **이미지 첨부**: 이미지 URL을 본문에 텍스트로 붙이는 방식은 실제 이미지로 렌더링되지 않고 링크로만 보였다 — 다른 개발자들의 공개 구현 사례를 조사해, 이 오픈API가 원래 `multipart/form-data`로 이미지 파일을 `image[0]` 필드에 직접 첨부하는 방식을 지원한다는 것을 확인했다. `createCafeArticle()`을 x-www-form-urlencoded에서 multipart로 전환하고, Supabase Storage 이미지 URL에서 실제 바이트를 내려받아 `image[0]`으로 첨부하도록 구현 — 네이버 CDN(`cafeptthumb-phinf.pstatic.net`)에 실제 업로드되어 `contentElements`에 진짜 IMAGE 요소가 생기는 것까지 실계정으로 확인했다. 영상은 이 방식으로 첨부 가능한지 아직 미확인이라 기존처럼 링크로만 넣는다 | ✅ 구현 완료(2026-09-12) |
| 2 | 카페 가입 유도 자동화(`POST /v1/cafe/{clubid}/members`) — 회원이 본인 카페 초대 링크를 만들어 자신의 고객/구독자가 그 링크로 네이버 로그인하면 자동으로 그 카페에 가입되는 흐름 | ⏳ 예정(의도적으로 미착수, 이번 세션 범위는 게시글 자동 포스팅까지) |
| 2+ | 영상 실제 첨부(이미지처럼 multipart로 가능한지 확인), 예약 게시 | ⏳ 예정(필요성 확인 후) |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
