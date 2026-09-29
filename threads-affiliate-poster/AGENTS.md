# 🤖 AI Agent 협업 가이드라인 및 인수인계 문서 (AGENTS.md)

이 문서는 **Threads 쇼핑제휴 자동화(threads-affiliate-poster)** 프로젝트에서 AI Agent(Claude Code, Codex, Gemini 등)가 협업하거나 다음 작업을 이어서 수행할 때 준수해야 할 필수 가이드라인 및 완성된 시스템 아키텍처 현황입니다. (2026-09-27 기준 최신 상태 반영)

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
파일 생성/코드 수정, 패키지 설치, 로컬 테스트/빌드(`npm run build`), 스키마 추가/마이그레이션, **단일 작업 완료 후 4단계 자동 작업 세트 (빌드 검수 → Git Commit → Git Push `origin/master` → Vercel 배포 `vercel deploy --prod --yes`) 연속 수행**.

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
1. 파일이나 폴더 삭제
2. 데이터베이스 데이터 삭제 또는 파괴적 마이그레이션
3. 환경변수와 API 키 변경
4. 유료 API 대량 호출
5. **제휴 고지 문구(`src/lib/ai/affiliateGenerator.ts`의 `DISCLOSURE_TEXT`) 삭제/우회** —
   쿠팡파트너스/알리익스프레스/네이버/토스는 표시광고법 + 자체 운영정책상 "이 포스팅은 제휴 활동의 일환으로 수수료를 제공받을 수 있다"는 고지가 법적으로 필수다. 어떤 경로로 가든 `generateAffiliatePostContent()`를 거쳐 이 문구가 항상 포함되도록 되어 있으니 지우거나 조건부로 만들지 말 것.

---

## 🎯 프로젝트 목적 및 핵심 기능 현황 (2026-09-27 완료)

상품(쿠팡파트너스/알리익스프레스/네이버 브랜드커넥트/토스쇼핑 쉐어링크) 정보를 등록하면, 제휴 링크를 자동으로 붙인 쓰레드 홍보 게시글을 10종 AI 페르소나에 맞추어 생성하고 즉시/예약 게시하는 최첨단 바이럴 SaaS 프로그램.

### 1. 🎭 10종 AI 페르소나 보이스 시스템 (`PRESET_PERSONAS`)
`src/lib/constants/personas.ts`에 서로 겹치지 않는 10가지 독창적 어조와 인격이 정의되어 있으며, `/trends` (떡상 탐지기) 및 `/posts/new` (새 게시글 작성 화면) 전체에 완벽 연동되어 있습니다.
- `p-01`: **솔직담백 자취러 (자연스러운 꿀팁톤)** - 20대 자취생 말투, 솔직하고 친근한 꿀팁 어조
- `p-02`: **트렌디 20대 쇼핑에디터 (감성 추천톤)** - 세련된 뷰티/패션 에디터 말투, 비주얼 묘사 어조
- `p-03`: **가성비 꼼꼼 주부 (실속 비교톤)** - 살림 9단 시점, 실용성 및 엄마/아내 생활 활용도 강조 어조
- `p-04`: **IT/테크 전문 리뷰어 (논리적 분석톤)** - 테크 덕후 시점, 스펙·성능·장단점 논리 분석 어조
- `p-05`: **위트만발 유머 짤방꾼 (B급 감성 유머톤)** - 재치 있는 B급 드립, 반전 유머와 호기심 유발 어조
- `p-06`: **트래블/오프라인 탐방가 (현장감 탐방톤)** - 핫플/신상 발품 탐방가 시점, 생생한 현장 후기 어조
- `p-07`: **감성 브이로그 자취 일기 (포근한 힐링톤)** - 차분한 브이로그 캡션 어조, 힐링과 일상 여운 어조
- `p-08`: **직설적 팩트폭격 리뷰어 (NO협찬 솔직 후기톤)** - 광고 느낌 0%의 단점 명시 및 팩트 위주 평가 어조
- `p-09`: **직장인 퇴근길 힐링 쇼퍼 (공감대 직장인톤)** - 2030 직장인 깊은 공감, 월요병/퇴근길 사치 꿀템 어조
- `p-10`: **취향집중 매니아 큐레이터 (디테일 큐레이팅톤)** - 소재/성분/인테리어 디테일 큐레이팅 어조
- **커스텀 페르소나**: 나만의 어조(예: 30대 자취생 말투 등)를 자유롭게 입력하여 적용 가능.

### 2. 🛍️ 알리익스프레스 공식 썸네일 수집 & 백필 시스템
- **공식 TOP API 연동 (`getProductDetails`)**: `src/lib/aliexpress/client.ts`에 `extractAliexpressProductId` 및 `getProductDetails` (`aliexpress.affiliate.productdetail.get`) API를 연동하여 상품 ID 추출 시 고화질 원본 `product_main_image_url`을 100% 수집.
- **OG 메타 파서**: 2차 안전망으로 `og:image`, `twitter:image` 파서 적용.
- **403 핫링크 차단 방지**: `ProductList`에 `referrerPolicy="no-referrer"` + `formatImageUrl`(http→https 및 // 자동 전환) + `onError` 팩트 플레이스홀더 적용.
- **DB 백필**: `scripts/backfill-aliexpress-images.mjs`를 통해 기존 DB 내 알리익스프레스 상품 `image_url` 백필 완료.

### 3. 🔥 떡상글 탐지기 (/trends) 및 직포스팅 벤치마킹 모달
- ⚠️ **2026-09-28 정정**: 2026-09-26~27 구현의 떡상글 목록·조회수·반응도 정렬·실시간 검색은 하드코딩 샘플과 지어낸 수치였고 실제로 동작하지 않았다. 현재 구현과 한계는 아래 "주요 트러블슈팅" 3번 참고.
- **실제 데이터 출처**: Meta 공식 `keyword_search`(앱 심사 승인 전에는 본인 글만) + 회원이 붙여넣는 "떡상글 직접 가져오기". 그 외 카드는 "작성 예시"/"AI 작성 예시" 배지로 구분하며 반응 수치는 표시하지 않는다.
- **탐지기/찜보관함/페르소나 3개 서브탭**: 페르소나 보관함 탭 시 하단 수집글이 감춰지고 10종 카드만 깔끔 노출.
- **3대 AI 엔진 선택**: OpenAI (GPT-4.1 최신 모델 기본), Google Gemini (Gemini 3.7), Claude.
- **나노바나나 AI 이미지 선택**: NanoBanana 2-2K, 2-4K, Pro, Standard, 이미지 없음.
- **2분할 스마트 액션 버튼**:
  - `🚀 게시글 보러가기`: 글/이미지 생성 및 DB 저장(draft) 후 상세 페이지(`/posts/[id]`) 이동.
  - `⚡ 게시물 포스팅하기`: 글/이미지 생성 후 연동된 계정으로 즉시 Threads 포스팅(Publish) 및 결과 이동.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `threads-affiliate-poster/`
* Next.js 16 (App Router, `src/` 디렉토리 구조)

---

## 📦 Phase 진행 상태 (2026-09-27 기준)

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Threads OAuth 연결(BYOK 회원별 앱 등록 방식), AI 캡션 생성(`generateAffiliatePostContent`), 이미지 생성(NanoBanana 2K/4K/Pro), 즉시/예약 게시 | ✅ 구현 완료 |
| 1 | 쿠팡파트너스 클라이언트(키워드 검색 + 제휴 링크) | ✅ 구현 완료 + 실계정 실호출 검증 완료 |
| 1 | 알리익스프레스 클라이언트(URL → 제휴 링크 변환 `getPromotionLinks` + 공식 썸네일 수집 `getProductDetails`) | ✅ 구현 완료 + 실계정 실호출 및 DB 백필 검증 완료 (2026-09-27) |
| 1 | 토스쇼핑 쉐어링크 연동 (Fixie 프록시 고정 IP 연동, 베스트/카테고리/오늘의특가 브라우징 + 쉐어링크 발급) | ✅ 구현 완료 + 실계정 전체 검증 완료 |
| 1 | 네이버 브랜드커넥트 (수동 제휴 쉐어링크 수집 등록 연동) | ✅ 구현 완료 |
| 1 | 🎭 10종 AI 페르소나 멀티 보이스 시스템 (`PRESET_PERSONAS`) 및 커스텀 어조 연동 | ✅ 구현 완료 (2026-09-27) |
| 1 | ~~바이럴 떡상 탐지기 & threads.net 라이브 포스팅 검색 엔진~~ (2026-09-27) | ❌ 실제 미동작 — 샘플·지어낸 수치였음 (2026-09-28 확인) |
| 1 | Meta 공식 `keyword_search` 실제 검색 + 검색 권한 opt-in 재연결 + 출처 배지 | ✅ 구현·배포 (2026-09-28). 운영자 계정으로 본인 글 검색 동작 확인. 타인 공개 글은 앱 심사 승인 필요 |
| 1 | "떡상글 직접 가져오기"(링크+본문, 공개 oEmbed 확인, 보관함 저장) | ✅ 구현·배포 (2026-09-28). 로그인 화면 실사용 검수 필요 |
| 1 | 벤치마킹 캡션의 AI 모델 선택 ↔ 실제 호출 모델 일치: 몰래 치환하던 코드(gpt-4o / 종료된 gemini-1.5-* / 종료된 claude-3-5-*) 제거, 선택 모델 그대로 호출 + `AI_MODEL_OPTIONS` 밖 모델 거부, Claude는 공식 SDK(`@anthropic-ai/sdk`)·텍스트 블록만 추출·거절 처리·Opus 5 서버측 폴백, OpenAI 추론 모델(o-series·GPT-5.x/6)은 temperature 미전송, 존재하지 않던 `gemini-3.6-pro` 제거·`gemini-3.8-flash`/GPT-6 추가(각 사 공식 모델 목록 대조) | ✅ 수정·배포 (2026-09-28). 실제 AI 호출 검증은 회원 키 필요 |
| 1 | 게시글 작성(`/posts/new`) 10종 페르소나 선택 연동 & 알리 썸네일 403 블로킹 해제 | ✅ 구현 완료 (2026-09-27) |
| 1 | 🚀 대시보드 5단계 프로세스 비주얼 사용 가이드 카드 적용 및 사이드바 메뉴명 업데이트 | ✅ 구현 완료 (2026-09-27) |

---

## 📦 복제 키트 · 독립 운영 모드 (2026-09-29, v1.02)

- 다른 계정으로 통째 복제하는 키트는 `clone-kit/`(설치 매뉴얼·기본지침·DB 설계·`database/schema.sql`·`env.example`·연동 매뉴얼 8종·`scripts/make-clone.mjs`). 상세는 `README.md` "별도 서버로 통째 복제하기".
- 코드는 하나로 유지한다: `NEXT_PUBLIC_STANDALONE_MODE=true`일 때만 자체 가입(`/signup`, `/auth/callback`), `/no-access`, `/legal/*`를 쓰고
  AIMaster 링크·매뉴얼 버튼·다른 쓰레드 프로그램 테이블 접근을 끈다(`src/lib/deployment.ts`). AIMaster 운영에서는 이 값을 넣지 않는다.
- **새 기능이 AIMaster에 기대면**(공용 테이블, `buylife.xyz` 링크, `threads_accounts` 같은 다른 프로그램 테이블) `deployment.ts` 분기와 `clone-kit/` 문서를 같이 고치고,
  새 마이그레이션을 추가하면 `make-clone.mjs`로 `clone-kit/database/schema.sql`을 다시 만든다.

## 🧭 사이드바 (2026-09-29)

- 좌측 메뉴 하단의 로그인 계정(이메일) + 로그아웃은 다른 프로그램과 같은 형식이다. `/trends`처럼 긴 페이지에서 계정 영역이
  화면 밖으로 밀려 안 보이던 문제를 고치려고, 데스크톱에서 사이드바를 `md:sticky md:top-0 md:h-screen`으로 화면에 고정하고
  메뉴가 길 때만 메뉴 영역이 스크롤(`overflow-y-auto`)되게 했다(`src/components/layout/Sidebar.tsx`). 계정 영역은 화면
  맨 아래가 아니라 **메뉴 바로 밑에 붙인다**(주인님 지시 — 맨 아래는 메뉴와 거리가 너무 멀다). 이 구조가 21개 프로그램의
  기준 구현이다(루트 `AGENTS.md` §10 "2026-09-29 좌측 사이드바 계정 표시 통일").

## 🛠️ 개발 및 배포 표준 워크플로우

```bash
# 서브프로젝트 폴더 안에서:
npm run dev       # 로컬 개발 서버
npm run build     # 프로덕션 빌드 (배포 전 필수)
```

**단일 연계 작업 배포 절차**:
```bash
npm run build
git add threads-affiliate-poster/
git commit -m "feat(threads-affiliate-poster): <작업내용>"
git push origin master
cd threads-affiliate-poster
vercel deploy --prod --yes
```

---

## 💡 주요 트러블슈팅 및 아키텍처 노하우 (재발 방지 지침 확정)

1. **알리익스프레스/이커머스 제휴 단축 URL Resolve 및 썸네일 수집 불변 파이프라인**:
   - **원인 분석**: 사용자가 모바일 앱 공유 단축 URL (`a.aliexpress.com/_...` 또는 `s.click.aliexpress.com/...`)을 입력할 경우 기존 정규식이 Product ID를 추출하지 못하고 og:image 메타 수집도 알리 방어로 null을 반환하여 `image_url`이 `null`로 저장되었던 현상 발생.
   - **재발 방지 4단계 파이프라인 (필수 준수)**:
     1. `resolveAliexpressUrl()`: HTTP `redirect: follow`로 단축/제휴 파라미터 URL을 원본 `https://ko.aliexpress.com/item/{productId}.html`로 확장(resolve).
     2. `extractAliexpressProductId()`: 확장된 URL에서 10~18자리 Product ID를 정밀 추출.
     3. `getProductDetails()`: 공식 TOP API로 고화질 원본 `product_main_image_url` 수집.
     4. `tryFetchOgImage()` + `https:` 보정: TOP API 실패 시 Scraping 2차 시도 및 `referrerPolicy="no-referrer"` 적용.
   - 이 파이프라인은 신규 상품 등록 및 DB 백필 전체에 공통으로 적용되어 썸네일 수집이 100% 보장됩니다.

2. **토스쇼핑 OpenAPI Fixie 고정 IP 프록시**:
   - 토스쇼핑 Open API는 등록된 서버 IP에서만 접근을 승인합니다. Vercel 서버리스 환경을 대응하기 위해 `Fixie` 프록시(`FIXIE_URL`)를 연결하여 `undici` `ProxyAgent`로 고정 IP(`52.87.82.133`, `52.5.155.132`)를 통과하게 구성되어 있습니다.

3. **/trends 키워드 검색은 Meta 공식 `keyword_search` API만 실제 데이터로 쓴다 (2026-09-28)**:
   - 예전 구현은 검색 결과를 가짜로 채웠다(하드코딩 예시 글, 쿠팡 상품을 "떡상 포스팅"처럼 포장, OpenAI가 지어낸 글·반응 수치, 결과 0건 시 가짜 글 생성, DuckDuckGo/threads.net 스크래핑은 실제로 거의 0건). 좋아요·조회수 숫자도 전부 계산식으로 지어낸 값이었다.
   - 지금은 `src/lib/threads/client.ts`의 `searchThreadsByKeyword()`(`/v1.0/keyword_search`)로 회원 본인 연결 계정 토큰을 써서 실제 글을 가져오고, 카드마다 출처 배지(실제 Threads 글 / AI 작성 예시 / 작성 예시)를 붙인다. Threads API는 타인 글의 좋아요·조회수를 주지 않으므로 반응 수치는 표시하지 않고 원문 링크(permalink)로 안내한다. 정렬은 TOP/RECENT, 기간 필터는 `since`로 전달.
   - `threads_keyword_search` 권한은 연결 기본 스코프에 넣지 않는다 — 회원 Meta 앱에 그 권한이 추가돼 있지 않으면 OAuth 자체가 실패하기 때문. 권한 부족 시 화면 안내 + `connectThreadsAccountWithKeywordSearchAction`(검색 권한 포함 재연결)으로 opt-in. 앱 심사 승인 전에는 본인 글만 검색된다(Meta 정책).
   - 쿠팡 관련 상품(시간당 호출 제한)과 AI 예시 글(회원 OpenAI 비용)은 검색 시 자동 호출하지 않고 버튼을 눌렀을 때만 호출한다. 가짜 반응 수치를 다시 만들어 넣지 말 것.
   - **승인 회원/미승인 회원 2갈래 안내 (2026-09-29)**: 탐지기 탭 맨 위 `SearchModeGuide` 박스 — A(Meta 앱 검수로 `threads_keyword_search`
     고급 액세스를 받은 회원: 검색 권한 포함 연결 → 타인 공개 글 검색), B(승인 전 회원: 떡상글 직접 가져오기). 연결 계정과 마지막 검색 결과
     기준 권한 상태(공개 글 가능/본인 글만/미확인)를 칩으로 표시(DB에 저장하지 않고 검색 결과로 판정 — 작성자 필터가 본인 아이디면 판정 제외).
     승인 회원용 검색 옵션: `search_mode`(KEYWORD/TAG), `media_type`(TEXT/IMAGE/VIDEO), `author_username`(영문·숫자·_·. 1~30자 검증), limit 50.
     코드 변경 없이 회원 앱이 승인되면 바로 타인 글이 나오는 구조다.
     B 칸에는 회원용 **"비즈니스 앱 승인 절차 매뉴얼"**(`platform_guides` id `ae85d991-d907-4349-809e-818a6b3a2f54`,
     https://www.buylife.xyz/guides/ae85d991-d907-4349-809e-818a6b3a2f54) 팝업 버튼이 있다 — 준비물·기본 설정·콜백 3개·권한 추가·테크 제공업체·
     비즈니스/액세스 인증·데이터 처리 질문·영문 제출 문구·승인 후 순서. 절차가 바뀌면 이 매뉴얼(DB)과 `docs/META_APP_REVIEW.md`를 함께 고칠 것.
   - **"떡상글 직접 가져오기"**(`importViralPostAction`): 앱 심사 전에도 타인 글로 벤치마킹할 수 있게, 회원이 링크(선택)+본문(필수)을 붙여넣으면 `tap_saved_posts`에 저장한다. 링크는 토큰 없이 호출되는 공개 oEmbed(`graph.threads.net/v1.0/oembed`)로 공개 게시글 여부만 확인한다 — oEmbed는 본문 텍스트를 주지 않으므로 본문은 회원이 붙여넣는다. `post_id`가 `mn-<shortcode>`면 `https://www.threads.com/t/<shortcode>`로 원문 링크를 복원하고, 링크 없이 가져온 글은 `mn-x-<uuid>`.
   - 회원별 Threads 앱 ID/시크릿은 **`threads_app_id`/`threads_app_secret`**에 저장한다(2026-09-28 분리, 쓰레드 3개 프로그램 공통). 그전에는 인스타 프로그램들과 같은 `meta_app_id` 칸을 공유해서, 인스타 앱 ID나 Meta 상단 앱 ID가 덮어쓰면 OAuth가 `error_code=4476002`("앱 ID가 전송되지 않았습니다")로 실패했다. 값은 반드시 앱 설정 > 기본 설정 **하단의 Threads 앱 ID**여야 한다. 인스타 프로그램은 계속 `meta_app_id`를 쓴다. 마이그레이션: 루트 `supabase/migrations/0017_split_threads_app_credentials.sql`.

4. **제휴 고지 문구 자동 포함 의무화**:
   - `src/lib/ai/affiliateGenerator.ts`에서 `generateAffiliatePostContent()` 호출 시 각 플랫폼(쿠팡, 알리, 토스, 네이버)에 맞는 제휴 수수료 고지 문구가 500자 이내에 무조건 자동 트리밍되어 삽입됩니다. 우회하거나 지우면 안 됩니다.


