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
- **공식 TOP API 연동 (`getProductDetails`)**: `src/lib/aliexpress/client.ts`에 `extractAliexpressProductId` 및 `getProductDetails` (`aliexpress.affiliate.productdetail.get`) API를 연동하여 상품 ID 추출 시 고화질 원본 `product_main_image_url`을 수집(빈도 제한 시 자동 재시도 — 2026-09-29, 아래 트러블슈팅 1번).
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
   - ~~이 파이프라인은 … 썸네일 수집이 100% 보장됩니다.~~ **(2026-09-29 정정)** 보장되지 않았다. 같은 증상이 재발했고
     진짜 원인은 **알리 API 호출 빈도 제한(`ApiCallLimit`)** 이었다 — 링크 생성 직후 이미지 조회가 거의 매번 제한에 걸리는데
     `getProductDetails()`가 오류를 삼켜 `image_url = null`로 조용히 저장됐다. v1.05에서 `callTopApi()` 재시도(1.2/2.5/4초),
     이미지 못 찾으면 경고 표시, 상품 목록 "이미지 다시 가져오기" 버튼을 추가했다.
     **원인·조치·점검 순서 전문: [`docs/ALIEXPRESS_IMAGE_TROUBLESHOOTING.md`](docs/ALIEXPRESS_IMAGE_TROUBLESHOOTING.md) — 알리 이미지 문제는 이 문서부터 볼 것.**

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
     **이미지·영상 미리보기 (2026-09-29, v1.04)**: 검색 요청에 `media_url,thumbnail_url,children{id,media_type,media_url,thumbnail_url}`를 함께 요청해
     결과 카드에 최대 4장 미리보기(영상은 썸네일+▶, 클릭 시 원본)를 보여준다(`toViralMedia` → `ViralPostItem.media` → `MediaPreviewStrip`).
     주소는 Meta CDN이라 약 4일 뒤 만료(`oe` 파라미터) → **DB에 저장하지 않고**, 깨진 이미지는 숨긴다. 저작권 때문에 게시글에 재사용하지 않도록 안내 문구 표시.
     좋아요·조회수는 여전히 API가 주지 않는다. 테스트 회원 토큰으로 본인 글 검색 시 필드 요청이 정상 동작함을 확인(타인 글은 승인 후 확인 필요).
     코드 변경 없이 회원 앱이 승인되면 바로 타인 글이 나오는 구조다.
     B 칸에는 회원용 **"비즈니스 앱 승인 절차 매뉴얼"**(`platform_guides` id `ae85d991-d907-4349-809e-818a6b3a2f54`,
     https://www.buylife.xyz/guides/ae85d991-d907-4349-809e-818a6b3a2f54) 팝업 버튼이 있다 — 준비물·기본 설정·콜백 3개·권한 추가·테크 제공업체·
     비즈니스/액세스 인증·데이터 처리 질문·영문 제출 문구·승인 후 순서. 절차가 바뀌면 이 매뉴얼(DB)과 `docs/META_APP_REVIEW.md`를 함께 고칠 것.
   - **"떡상글 직접 가져오기"**(`importViralPostAction`): 앱 심사 전에도 타인 글로 벤치마킹할 수 있게, 회원이 링크(선택)+본문(필수)을 붙여넣으면 `tap_saved_posts`에 저장한다. 링크는 토큰 없이 호출되는 공개 oEmbed(`graph.threads.net/v1.0/oembed`)로 공개 게시글 여부만 확인한다 — oEmbed는 본문 텍스트를 주지 않으므로 본문은 회원이 붙여넣는다. `post_id`가 `mn-<shortcode>`면 `https://www.threads.com/t/<shortcode>`로 원문 링크를 복원하고, 링크 없이 가져온 글은 `mn-x-<uuid>`.
   - 회원별 Threads 앱 ID/시크릿은 **`threads_app_id`/`threads_app_secret`**에 저장한다(2026-09-28 분리, 쓰레드 3개 프로그램 공통). 그전에는 인스타 프로그램들과 같은 `meta_app_id` 칸을 공유해서, 인스타 앱 ID나 Meta 상단 앱 ID가 덮어쓰면 OAuth가 `error_code=4476002`("앱 ID가 전송되지 않았습니다")로 실패했다. 값은 반드시 앱 설정 > 기본 설정 **하단의 Threads 앱 ID**여야 한다. 인스타 프로그램은 계속 `meta_app_id`를 쓴다. 마이그레이션: 루트 `supabase/migrations/0017_split_threads_app_credentials.sql`.

4. **제휴 고지 문구 자동 포함 의무화**:
   - `src/lib/ai/affiliateGenerator.ts`에서 `generateAffiliatePostContent()` 호출 시 각 플랫폼(쿠팡, 알리, 토스, 네이버)에 맞는 제휴 수수료 고지 문구가 500자 이내에 무조건 자동 트리밍되어 삽입됩니다. 우회하거나 지우면 안 됩니다.

5. **새 글 작성(/posts/new) 3대 AI 엔진 및 최신 모델 선택 확장 (2026-10-04, v1.15 ~ v1.19)**:
   - **기능 개요**: 기존 `gpt-4o-mini` 단일 고정 생성 방식에서, 블로그(`ai-auto-blog`) 및 기획기(`threads-easy-planner`)와 일관된 구조로 **GPT(OpenAI), Claude(Anthropic), Gemini(Google)** 3대 엔진 및 2026 최신 세부 모델 라인업(총 16종)을 자유롭게 선택하여 홍보 글을 생성할 수 있도록 확장.
   - **연동 흐름**:
     - `ProductPostForm.tsx` & `ViralPostDetector.tsx`: **GPT / Claude / Gemini** 3대 엔진 선택 탭 버튼 순서 및 볼드 라벨 통일화. 세부 모델 드롭다운 연동. `localStorage`에 최근 선택 엔진/모델을 자동 저장 및 복원.
     - **UI 레이아웃 최적화 (v1.17)**: `ProductPostForm.tsx`에서 "🤖 AI 글 생성 엔진 선택 (GPT / Claude / Gemini)" 섹션을 "이미지 & 캐러셀 (최대 20장)" 섹션의 바로 위로 재배치하여, 상단(상품/페르소나) ➔ 중단(게시글 내용) ➔ 하단(글 생성 엔진 선택 ➔ 이미지/캐러셀 생성)으로 자연스러운 제작 흐름 완성.
     - **불필요한 API 키 인풋 제거 (v1.18)**: 환경설정 메뉴(`/settings`)에서 이미 계정별로 API 키를 등록하여 사용하므로, 글 작성 폼 내 불필요했던 API 키 수동 입력창(`customApiKey`)을 완전 제거하고 DB 저장 키 자동 연동(`resolveApiKey`)으로 심플화.
     - **글 작성 폼 직관적 박스 및 색상 구분 개편 (v1.19)**: `ProductPostForm.tsx`에서 밋밋하게 나열되어 있던 상단 영역을 역할별 독립 카드 박스 및 테마 색상으로 구분(⚡ AI 안내 배너, 🛍️ 1. 제휴 상품 선택-블루, 🎭 2. AI 페르소나-퍼플, 🏷️ 3. 키워드/링크-에메랄드, ✍️ 4. 게시글 본문-슬레이트, 🤖 5. AI 엔진 선택, 🖼️ 6. 이미지 & 캐러셀). 직관적인 1~6단계 제작 UX 완성.
     - `generator.ts` (`generatePostContent`): `provider` 및 `model` 매개변수 지원. Anthropic (`@anthropic-ai/sdk`), Gemini (`@google/generative-ai`), OpenAI (`openai`) SDK 호출 완벽 연동.
     - `affiliateGenerator.ts` (`generateAffiliatePostContent`): 엔진/모델 옵션을 `generatePostContent`로 정확히 포워딩.
     - `actions/ai.ts` (`generateAffiliateContentAction`): 플랫폼별 API 키를 `resolveApiKey`로 동적 조회하고 `logProgramUsage`에 엔진별 사용량 기록.

6. **4대 AI 이미지 생성 플랫폼(NanoBanana, GPT Image, FLUX, Z-Image) 및 세부 모델 선택 확장 (2026-10-04, v1.20)**:
   - **기능 개요**: 기존 Gemini NanoBanana 단일 플랫폼에서, `ai-image-studio`의 기술 스택을 바탕으로 **NanoBanana(Google Gemini), GPT Image(OpenAI), FLUX 2.0(Black Forest Labs), Z-Image(Alibaba 6B)** 4대 플랫폼 및 16종 세부 모델을 자유롭게 선택하여 캐러셀/홍보 이미지를 생성할 수 있도록 확장.
   - **연동 흐름**:
     - `imageModels.ts`: 4대 플랫폼 정보, 세부 모델 목록, 기본 모델 매핑 정의.
     - `imageGenerator.ts`: Gemini REST API, OpenAI Image API, Replicate API(FLUX, Z-Image 동기/폴링) 통합 호출기 구현. 핵심 원칙 3번(인물 동아시아인 기본 묘사) 자동 결합. 생성된 이미지는 Supabase Storage `post-images` 버킷에 영구 저장되어 절대 깨지지 않는 영구 Public URL 반환.
     - `actions/ai.ts` (`generateImageAction`): 선택된 플랫폼에 맞춰 `gemini`, `openai`, `replicate` API 키를 `resolveApiKey`로 동적 조회하여 안전하게 생성.
     - `settings/page.tsx`: Replicate(FLUX) API 키 등록 필드 및 발급 매뉴얼(`78a00b16-eef5-...`) 링크 신설.
     - `ProductPostForm.tsx`: 4분할 직관적 카드 탭 버튼(아이콘, 플랫폼명, 제공사) + 세부 모델 셀렉트박스 + 프롬프트/멀티컷 생성 옵션 제공. `localStorage` 최근 선택 엔진/모델 자동 복원. 원클릭 글+이미지 일괄 생성(`runGenerateAll`) 시에도 선택된 이미지 엔진으로 자동 생성 연동 완료.




7. **글 작성 폼 대형 테마 컨테이너 박스 및 은은한 배경색 대구분 UI 전면 개편 (2026-10-04, v1.21)**:
   - **기능 개요**: `🤖 AI 글 생성 엔진 선택 (GPT / Claude / Gemini)`을 중간 기준으로 삼아 상단 전체(글 콘텐츠 기획/작성)와 하단 전체(이미지 & 미디어 생성/등록)를 명확히 분리되는 대형 컨테이너 박스(`border-2` 테두리 및 옅은 파스텔 배경색)로 감싸, 복잡했던 작성 폼을 단계별 워크플로우로 한눈에 구분할 수 있도록 전면 개선.
   - **4대 메이저 대형 섹션 구성**:
     1. **[STEP 1] 📝 게시글 작성 및 콘텐츠 설정 (상단 대형 블루 박스 - `bg-blue-50/25 border-blue-200/80`)**:
        - 내부 흰색 카드들: 🛍️ 1. 제휴 상품 선택, 🎭 2. AI 페르소나, 🏷️ 3. 키워드 & 참고 링크, ✍️ 4. Threads 본문 & 원클릭 일괄 생성.
     2. **[STEP 2] 🤖 AI 글 생성 엔진 선택 (중간 기준 대형 퍼플 박스 - `bg-purple-50/30 border-purple-200/90`)**:
        - 3대 글 생성 AI(GPT / Claude / Gemini) 탭 버튼 및 세부 모델 셀렉트박스.
     3. **[STEP 3] 🖼️ 이미지 & 미디어 설정 (하단 대형 앰버 박스 - `bg-amber-50/25 border-amber-200/90`)**:
        - 내부 흰색 카드들: 4대 이미지 생성 AI 엔진(NanoBanana / GPT Image / FLUX / Z-Image), 대표 이미지 추가, 파일 직접 업로드, 캐러셀 썸네일 그리드, 영상 등록.
     4. **[STEP 4] 🚀 게시방식 결정 및 최종 발행 (발행 대형 슬레이트 박스 - `bg-neutral-100/60 border-neutral-300`)**:
        - 즉시 게시 / 예약 발행 / 임시 저장 선택 및 최종 발행 실행 버튼.

8. **글 생성 엔진 및 이미지/미디어 설정 대형 통합 박스 개편 (2026-10-04, v1.22)**:
   - **개편 배경**: "🤖 AI 글 생성 엔진 선택"과 "🖼️ 이미지 & 미디어 설정"이 둘 다 생성 모델 및 관련 미디어를 선택/설정하는 영역이므로, 바깥 분리 박스를 하나의 거대한 통합 컨테이너 박스(`STEP 2`)로 합쳐서 직관성과 일체감을 극대화.
   - **전체 3대 메이저 워크플로우 재편**:
     1. **[STEP 1] 📝 게시글 작성 및 콘텐츠 설정 (블루 테마)**: 제휴 상품 선택, AI 페르소나, 키워드 & 링크, Threads 본문 및 원클릭 자동 생성.
     2. **[STEP 2] 🤖 AI 생성 엔진 및 미디어 설정 (퍼플 테마 통합 박스)**:
        - `[서브 카드 A] 🤖 AI 글 생성 엔진 선택`: GPT / Claude / Gemini 3대 탭 및 16종 세부 모델 선택기.
        - `[서브 카드 B] 🖼️ 이미지 & 미디어 설정`: NanoBanana / GPT Image / FLUX / Z-Image 4대 플랫폼 및 세부 모델, 대표 이미지 추가, 다중 미디어 직접 업로드(최대 20장), 동영상 첨부.
     3. **[STEP 3] 🚀 게시방식 결정 및 최종 발행 (슬레이트 테마)**: 즉시 게시 / 예약 발행 / 임시 저장 및 최종 발행 버튼.

9. **FLUX 모델 라인업 최적화 - FLUX.1 계열 모델 제거 (2026-10-04, v1.23)**:
   - **개편 배경**: 품질 및 디테일이 떨어지는 구형 FLUX.1 계열 모델(`flux-dev`, `flux-schnell`)을 선택 옵션에서 완전 제거.
   - **유지 모델**: 상업용 극실사 고품질 최신 FLUX 2 플래그십 3종만 엄선 유지:
     - `black-forest-labs/flux-2-dev` (정밀 디테일 & 초고속 최적화 - 기본 추천)
     - `black-forest-labs/flux-2-pro` (상업용 극실사 고해상도)
     - `black-forest-labs/flux-2-max` (최대 해상도 플래그십)

10. **GPT Image 모델 라인업 최적화 - DALL-E 3 모델 삭제 (2026-10-04, v1.24)**:
   - **개편 배경**: 품질 및 선명도가 부족한 구형 `dall-e-3` 모델을 GPT Image 선택 옵션에서 완전 제거.
   - **유지 모델**: 최신 고품질 GPT Image 전용 라인업만 엄선 유지:
     - `gpt-image-2` (OpenAI 표준 비주얼 - 기본 추천)
     - `chatgpt-image-latest` (최신 통합 플래그십)
     - `gpt-image-1` (표준 1세대)
     - `gpt-image-1-mini` (초고속 경량 미니)
     - `gpt-image-2.5-flare` (데일리 고품질)
     - `gpt-image-2.5-sunburst` (최상위 플래그십)

11. **STEP 2 헤더 텍스트 간소화 - 긴 부제 배지 제거 (2026-10-04, v1.25)**:
   - **개편 배경**: `STEP 2` 헤더에 있던 긴 부제 텍스트 배지("글 생성 모델 (GPT·Claude·Gemini) & 이미지·미디어 모델")가 화면 폭에 따라 글자가 잘려 보이는 현상 개선.
   - **조치 사항**: `ProductPostForm.tsx`의 STEP 2 헤더에서 긴 부제 배지를 깔끔히 삭제하고 메인 타이틀 `<span>🤖 AI 생성 엔진 & 미디어 설정</span>`만 심플하게 노출하도록 최적화.

12. **AI 이미지 생성 장수 선택기(1~10장) 개편 및 멀티컷 토글 제거 (2026-10-04, v1.26)**:
   - **개편 배경**: 기존의 "🎨 AI 멀티컷 카드뉴스 연속 생성" 체크박스 토글 방식 대신, 직관적으로 원하는 장수(1~10장)를 직접 선택하여 단발/연속 생성할 수 있도록 개편.
   - **조치 사항**:
     - 기본값: **1장** (1장 선택 시 단일 이미지 생성).
     - 2~10장 선택 시 지정된 수량만큼 비주얼 씬별 프롬프트로 연속 자동 생성되어 캐러셀 슬라이드에 추가.
     - 프롬프트 인풋 및 생성 버튼 우측에 `생성 장수: [1장 (기본) ~ 10장]` 셀렉트박스 통합 배치.
     - 선택 장수에 따라 버튼 텍스트가 `✨ 이미지 N장 연속 생성`으로 실시간 변경되어 실행 동작 명확화.

13. **사용자 이미지 추가/삭제 및 캐러셀 순서 조정 관리 시스템 구축 (2026-10-04, v1.27)**:
   - **개편 배경**: 사용자가 원하는 이미지를 자유롭게 추가하고, 불필요한 이미지는 즉시 삭제 및 전체 비우기, 그리고 슬라이드 순서(대표 썸네일 등)를 자유롭게 변경할 수 있도록 강화.
   - **주요 기능**:
     - **다양한 추가 수단**:
       1) PC 로컬 파일 다중 선택 업로드 (`📂 내 PC에서 이미지 파일 추가`)
       2) 외부 웹 이미지 URL 직접 입력 추가 (`[URL 입력] + [+ URL로 추가]`, Enter 키 지원)
       3) 캐러셀 그리드 내 `[ ➕ 이미지 추가 ]` 점선 카드로 원클릭 파일 추가
       4) AI 이미지 생성 및 대표 상품 이미지 추가 연동
     - **완벽한 삭제 기능**:
       1) 각 이미지 썸네일 우측 상단 선명한 빨간색 `✕` 삭제 버튼
       2) 카드 하단 `삭제` 텍스트 버튼
       3) 상단 우측 `🗑️ 전체 이미지 삭제` 원클릭 일괄 비우기 버튼 (안내 컨펌 포함)
     - **순서 재정렬 (캐러셀 슬라이드 컨트롤)**:
       - 각 이미지 카드 하단 `◀`, `▶` 버튼으로 1번째 대표 이미지 및 슬라이드 순서를 직관적으로 교체.
     - **실시간 카운트 배지**: 현재 등록 수량(`N / 20장`) 및 빈 상태 가이드 박스 표시.

14. **생성 장수 옵션 문구 최적화 - '연속' ➔ '생성' 단어 교체 (2026-10-04, v1.28)**:
   - **개편 배경**: `연속.png` 스크린샷 피드백 반영 — 생성 장수 선택 드롭다운 옵션의 "N장 연속" 문구를 "N장 생성"으로 교체하여 직관성 및 명확성 향상.
   - **조치 사항**:
     - 옵션 라벨: `1장 (기본)`, `2장 생성`, `3장 생성`, ..., `10장 생성`으로 정돈.
     - 실행 버튼: `✨ 이미지 N장 생성`으로 통일.

15. **생성 버튼 명칭 직관화 및 이미지 선별 워크플로우 정립 (2026-10-04, v1.29)**:
   - **개편 배경**: 기존 "이미지만 다시 생성" 버튼 명칭의 오해 소지(덮어쓰기 오인)를 해소하고, "AI로 여러 이미지를 생성하여 마음에 드는 이미지를 고르고 추가/삭제하여 최종 콘텐츠를 완성"하는 기획 방향(1번 방식) 확정.
   - **조치 사항**:
     - 버튼 텍스트를 `✨ AI 이미지 생성` (1장 초과 시 `✨ 이미지 N장 생성`)으로 명확히 변경.
     - 썸네일 그리드 상단 가이드 문구를 `* 생성/추가된 이미지 중 마음에 드는 것만 남기고 ✕로 삭제하거나, ◀ ▶로 순서를 조정하세요.`로 다듬어 선별 및 완성 UX 완성.

16. **프롬프트 인풋 한 줄 확장 및 생성 장수 상단 모델 옆 재배치 레이아웃 개편 (2026-10-05, v1.30)**:
   - **개편 배경**: `이미지 프롬프트.png` 스크린샷 피드백 반영 — 모델 선택 아래 좁게 몰려있던 프롬프트 입력창의 가로폭을 시원하게 한 줄 전체로 확장하고, 생성 장수 선택기를 윗줄 세부 모델 우측 공간으로 이동 배치.
   - **조치 사항**:
     - **윗줄**: 세부 실행 모델 드롭다운(`flex-1`)과 `🔢 생성 장수` 드롭다운(`auto`)을 나란히 배치(`grid-cols-1 sm:grid-cols-[1fr_auto]`).
     - **아랫줄**: `✍️ 이미지 설명 프롬프트 입력` 인풋 필드를 가로 한 줄 전체(`flex-1`)로 넓히고, 그 바로 우측에 `✨ AI 이미지 생성` 버튼을 배치하여 프롬프트 작성 편의성과 시각적 균형감 극대화.

17. **AI 이미지 생성 버튼 바탕색 및 가독성 개선 (2026-10-05, v1.31)**:
   - **개편 배경**: 기존에 흰색 바탕(secondary)으로 되어 있어 흰색 입력창/카드 안에서 눈에 잘 띄지 않고 가독성이 낮았던 피드백 반영.
   - **조치 사항**:
     - `Button` 컴포넌트에 선명한 보라색 테마의 `purple` variant(`bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 disabled:bg-neutral-200`) 추가.
     - `ProductPostForm.tsx`의 `✨ AI 이미지 생성` 버튼에 `variant="purple"`을 적용하여, 보라색 바탕 위의 선명한 흰색 굵은 텍스트로 시인성과 가독성을 극대화.

18. **AI 이미지 생성 버튼 상단 일치형 주황색(Amber) 테마 및 이모티콘 독립 색상 연동 (2026-10-05, v1.32)**:
   - **개편 배경**: "위에 주황색 색상으로 맞춰줘", "이모티콘은 다른 색상으로 해야겠지" 피드백 반영 — 상단의 NanoBanana(Google Gemini) 대표 선택 버튼과 동일한 따뜻하고 시인성 높은 주황색(Amber)으로 색상 톤을 통일하고, 주황색 바탕 위에서 이모티콘이 묻히지 않도록 독립된 화사한 골드 옐로우 색상으로 차별화.
   - **조치 사항**:
     - `Button` 컴포넌트에 상단 NanoBanana 버튼과 동일한 `amber` variant 추가.
     - `ProductPostForm.tsx`의 생성 버튼에 `variant="amber"`를 적용하여 상단 대표 모델 선택 영역과의 시각적 일체감 구현.

19. **AI 이미지 생성 버튼 상시 주황색 노출 및 비활성화 회색 변환 방지 (2026-10-05, v1.33)**:
   - **개편 배경**: `주황색.png` 스크린샷 피드백 반영 — 프롬프트가 비어있을 때 버튼이 `disabled` 상태로 인해 회색 박스로 변하여 주황색 테마가 보이지 않던 문제를 근본 해결.
   - **조치 사항**:
     - `Button.tsx`의 `amber` variant에서 disabled 시 회색으로 덮어쓰지 않고 `disabled:opacity-60`으로 주황색을 유지.
     - `ProductPostForm.tsx`에서 버튼 `disabled` 조건 중 `(!imagePrompt.trim() && !selectedProduct)`를 제거하여, 초기 진입 시(프롬프트 미입력 시)에도 상단의 Gemini 버튼과 동일한 선명한 주황색(`bg-amber-500 text-white`)으로 상시 노출.
     - 프롬프트 미입력 상태로 버튼 클릭 시 친절한 안내 문구(`이미지 설명 프롬프트를 입력하거나 먼저 제휴 상품을 선택해주세요`) 표시.
     - 주황색 버튼 내 이모티콘을 선명한 화이트 원형 칩(`bg-white`) 내 `✨`로 구성하여 시인성 및 가독성 완성.

20. **글 생성 엔진 및 이미지 모델 선택 버튼 활성 주황색(Amber) 통일 (2026-10-05, v1.34)**:
   - **개편 배경**: `색상.png` 스크린샷 피드백 반영 — 모델마다 제각각이던 선택 상태 색상(검정, 보라, 파랑, 초록 등)을 배제하고, "선택된 모델은 지금 사용된 주황색으로 보여줘, 선택 안 된 건 흰색 바탕이고" 지시 완벽 반영.
   - **조치 사항**:
     - **AI 글 생성 엔진(GPT / Claude / Gemini)**: 선택 시 모두 선명한 주황색(`border-amber-500 bg-amber-500 text-white shadow-xs`), 미선택 시 깔끔한 흰색 바탕(`border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100`)으로 통일.
     - **이미지 & 미디어 모델(NanoBanana / GPT Image / FLUX 2.0 / Z-Image)**: 선택 시 모두 동일한 주황색(`border-amber-500 bg-amber-500 text-white shadow-xs`), 미선택 시 흰색 바탕으로 완벽 통일.
     - STEP 2 전체 모델 선택기부터 하단 AI 이미지 생성 버튼까지 일관된 프리미엄 주황색 테마 완성.

21. **실시간 프리뷰 & 검수 및 즉시 포스팅 vs 임시저장 2대 스마트 분기 프로세스 구축 (2026-10-05, v1.35)**:
   - **개편 배경**: "생성된 그 자체로 자동 포스팅도 되고, 임시저장으로 생성된 콘텐츠와 이미지를 추가/삭제 영상 추가 후 최종 발행하고 싶다"는 프로세스 최적화 지시 반영. (언제든 100% 원복 가능하도록 `ProductPostForm.backup-v1.34.tsx` 백업 생성 완료)
   - **조치 사항**:
     - **1) 상단 실시간 원클릭 생성 액션 바 신설**: `[ ⚡ AI 글 & 이미지 생성하기 ]` 클릭 시 페이지 이동 없이 현재 화면에 본문 캡션과 고화질 AI 이미지가 실시간 프리뷰로 채워짐.
     - **2) 세밀한 독립 검수 및 편집**: 본문 헤더에 `[ 🔄 AI 글만 다시 생성 ]` 추가, 이미지 영역에서 불필요한 이미지 ✕ 삭제, 순서 변경, 내 PC 실물 사진 추가, 동영상 교체 등 자유롭게 다듬기 가능.
     - **3) STEP 3 최종 액션 2대 스마트 분기 버튼 개편**:
       - 🚀 `[ ⚡ 즉시 Threads에 포스팅하기 ]`: 검토/수정된 현재 내용 그대로 즉시 Threads 계정에 발행 (미생성 상태 클릭 시 자동 생성 후 즉시 발행 지원).
       - 📁 `[ 💾 임시저장하기 ]`: 보관함에 안전하게 임시저장하여 언제든 다시 꺼내 수정·발행 가능.
       - ⏰ `[ 📅 예약 발행 설정하기 ]`: 특정 일시에 자동 발행되도록 예약 접이식 설정 제공.

22. **글 생성 기본 선택 모델 GPT-4.1 설정 (2026-10-05, v1.36)**:
   - **개편 배경**: 새 게시글 작성 화면(`/posts/new`) 진입 시 기본 선택 엔진 및 모델을 "GPT / GPT-4.1"로 항상 선택되도록 설정 요청 반영.
   - **조치 사항**:
     - `src/lib/ai/models.ts`: OpenAI 모델 목록 최상단 첫 번째 항목으로 `GPT-4.1`(`gpt-4.1`, 최신 세대 스마트 모델 · 기본 추천) 배치.
     - `src/components/posts/ProductPostForm.tsx`: 초기 상태를 `openai` / `gpt-4.1`로 기본 지정 및 마이그레이션 플래그(`threads_post_ai_default_v136`) 적용.

23. **NanoBanana 2-1K (표준 경량 모델) 네이밍 포맷 통일 및 2K 기본값 복원 (2026-10-05, v1.37)**:
   - **개편 배경**: "앞에 Nanobanana 2-1K (표준 경량 모델) 로 해줘야지, 다른 모델명도 같은 포맷으로 맞춰주고, 기본값은 2K 로 해줘" 지시 완벽 반영.
   - **조치 사항**:
     - `src/lib/ai/imageModels.ts`:
       - 네이밍 포맷 통일:
         - `NanoBanana 2-2K (고화질 시네마틱 · 기본 추천)` (기본값)
         - `NanoBanana 2-1K (표준 경량 모델)`
         - `NanoBanana 2-4K (울트라 HD)`
         - `NanoBanana Pro (프로페셔널 정밀 비주얼)`
       - 나노바나나 기본 선택값(`DEFAULT_IMAGE_MODELS.nanobanana`)을 `nanobanana-2-2k`로 재설정.
     - `src/lib/ai/generator.ts`: NanoBanana 기본 모델 폴백을 `nanobanana-2-2k`로 복원.
     - `src/components/trends/ViralPostDetector.tsx`: 셀렉트 옵션 및 기본 상태를 통일된 포맷과 `nanobanana-2-2k`로 동기화.
     - `src/components/posts/ProductPostForm.tsx`: 마이그레이션 플래그(`threads_post_img_default_v137`)를 적용하여 기존 브라우저 캐시와 무관하게 NanoBanana 선택 시 `2-2K (고화질 시네마틱 · 기본 추천)`이 깔끔하게 기본 선택되도록 보장.

24. **하단 제휴 문구 '상품링크:' 통일 및 실제 클릭 가능 하이퍼링크 연동 (2026-10-05, v1.38)**:
   - **개편 배경**: `게시글.png` 스크린샷 피드백 반영 — "위에 (광고)쿠팡파트너스 라고 표시되니, 하단부에는 상품링크 라고 표시해주고 제휴링크 실제로 링크해줘" 지시 완벽 반영.
   - **조치 사항**:
     - `src/lib/ai/affiliateGenerator.ts`: `PLATFORM_DEFAULT_CTA_TEXT`의 모든 플랫폼(쿠팡, 알리, 네이버, 토스) 하단 문구를 `상품링크:`로 통일.
     - `src/lib/actions/viral.ts`: 벤치마킹 캡션 생성 시 `ctaText`를 `상품링크:`로 변경.
     - `src/components/posts/PostContentRenderer.tsx`: 본문 내 URL(제휴 링크)을 자동 파싱하여 실제 클릭 시 새 탭(`target="_blank" rel="noopener noreferrer"`)으로 이동하는 파란색 하이퍼링크(`text-blue-600 underline font-semibold`) 및 `ExternalLink` 아이콘 컴포넌트 신설. 기존 저장된 글의 '지금 쿠팡에서 확인' 등 레거시 문구도 화면 표시 시 `상품링크:`로 자동 치환.
     - `src/app/(dashboard)/posts/[id]/page.tsx`: 게시글 결과 상세 화면에 `PostContentRenderer`를 적용하여 상품 링크가 실제로 클릭 가능하도록 구현.
     - `src/components/posts/ProductPostForm.tsx`: 새 게시글 작성 화면 본문 입력창 아래에 "🔗 상품 링크 바로가기 검수" 실시간 프리뷰 박스 연동.
     - `src/components/trends/ViralPostDetector.tsx`: 떡상 탐지기 결과 캡션 영역에도 `PostContentRenderer` 적용.

25. **생성 및 등록된 이미지 클릭 시 전체 이미지 확대 뷰어(라이트박스 모달) 연동 (2026-10-05, v1.39)**:
   - **개편 배경**: 새 게시글 작성 화면(`/posts/new`)에서 "생성된 이미지를 클릭했을 때 전체 이미지를 볼 수 있게 해줘" 지시 완벽 반영.
   - **조치 사항**:
     - `src/components/ui/ImageLightboxModal.tsx` 신설: 고화질 원본 전체 화면 모달, 이전/다음 네비게이션(◀, ▶, 키보드 좌우 화살표), ESC 키 닫기, 새 탭 원본 열기, 하단 썸네일 스트립 연동.
     - `src/components/posts/ProductPostForm.tsx`:
       - 썸네일 그리드에 호버 시 돋보기 아이콘 및 "확대 보기" 오버레이 적용.
       - 썸네일 클릭 시 해당 이미지 인덱스로 라이트박스 전체 화면 모달 즉시 팝업.
       - 삭제 버튼 및 순서 이동 버튼 클릭 시 이벤트 버블링 방지(`e.stopPropagation()`).

26. **NanoBanana 2-2K 기본 모델 선택 강제화 및 이전 브라우저 캐시 완벽 격리 (2026-10-05, v1.40)**:
   - **개편 배경**: "NANOBANANA 2-2K 기본 모델로 선택하게 해줘" 지시 완벽 반영. 브라우저 localStorage에 남아있던 이전 1K 캐시로 인해 덮어써지던 현상을 근본 방지.
   - **조치 사항**:
     - `src/components/posts/ProductPostForm.tsx`: `useEffect` 내에서 이미지 공급자가 NanoBanana일 경우 무조건 `nanobanana-2-2k`(`NanoBanana 2-2K (고화질 시네마틱 · 기본 추천)`)를 기본값으로 강제 세팅 및 localStorage 동기화 처리.

27. **Server Component 렌더링 500 에러 해결: PostContentRenderer 'use client' 명시 (2026-10-05, v1.41)**:
   - **증상**: `/posts/[id]` 게시글 결과 상세 페이지 접근 시 `This page couldn't load / A server error occurred. Reload to try again.` (500 에러) 발생.
   - **원인**: Server Component인 `src/app/(dashboard)/posts/[id]/page.tsx`에서 렌더링하는 `PostContentRenderer.tsx`에 `"use client";`가 빠져 있어 직렬화 단계에서 `onClick` 핸들러로 인한 에러 발생.
   - **조치 사항**:
     - `src/components/posts/PostContentRenderer.tsx`: 최상단에 `"use client";` 지시어 추가하여 명시적 클라이언트 컴포넌트로 선언. 상세 페이지(`/posts/[id]`) 500 에러 완벽 해결.

28. **캐러셀 다중 이미지(쉼표 구분) 파싱 및 상세 페이지 미디어 뷰어(PostMediaViewer) 연동 (2026-10-05, v1.42)**:
   - **증상**: `/posts/[id]` 상세 페이지(예: `posts/7c950668-8223-4a68-a29b-2fdcfa304005`)에서 이미지가 엑박이 나고 보이지 않는 현상.
   - **원인**: 2장 이상의 캐러셀 이미지가 쉼표(`,`)로 구분되어 DB `image_url`에 저장되는데, 상세 페이지에서 `<img src={post.image_url} />`로 통째로 대입하여 브라우저가 유효하지 않은 URL을 요청함.
   - **조치 사항**:
     - `src/components/posts/PostMediaViewer.tsx` 신설: 쉼표로 연결된 다중 이미지 URL 목록을 파싱하여, 여러 장일 때 좌우 슬라이드 탐색(◀, ▶), 카운트 배지(`📷 N / M장`), 하단 미니 썸네일 스트립 제공.
     - 이미지 클릭 시 전체 화면 확대 라이트박스(`ImageLightboxModal`) 팝업 연동.
     - `src/app/(dashboard)/posts/[id]/page.tsx`: 단일 img 태그를 `PostMediaViewer`로 교체하여 다중 캐러셀 이미지 및 동영상을 완벽하게 지원.








29. **최종 발행 방식 선택 버튼 순서 변경 및 임시저장하기 기본 선택 적용 (2026-10-05, v1.43)**:
   - **개편 배경**: 새 글 작성 화면 STEP 3에서 "임시 저장하기를 왼쪽으로 하고 기본값으로 선택되게 해줘" 주인님 지시 반영.
   - **조치 사항**:
     - src/components/posts/ProductPostForm.tsx:
       - STEP 3의 최종 발행 방식 버튼 순서 재배치: [📁 💾 임시저장하기]를 왼쪽 첫 번째로, [🚀 ⚡ 즉시 Threads에 포스팅하기]를 오른쪽 두 번째로 배치.
       - 왼쪽 [임시저장하기] 버튼을 기본 주 버튼(Primary: bg-neutral-900 text-white) 및 기본값 배지 부여로 시각적 기본값 지정.
       - 오른쪽 [즉시 Threads에 포스팅하기] 버튼은 보조 버튼(Secondary: bg-white text-neutral-900 border-2 border-neutral-300)으로 배치.
       - 안내 문구 순서 통일 ("임시저장 또는 즉시 포스팅").

30. **불필요한 중복 이미지 추가/삭제 관리 박스 제거 및 캐러셀 UI 일원화 (2026-10-05, v1.44)**:
   - **개편 배경**: 이미지추가.png 피드백 반영. 캐러셀 그리드 내 [➕ 이미지 추가] 카드가 이미 존재하므로, 상단의 거대한 붉은색 박스 영역("사용자 이미지 추가 및 삭제 관리")의 중복을 제거.
   - **조치 사항**:
     - src/components/posts/ProductPostForm.tsx:
       - 상단 중복 박스("사용자 이미지 추가 및 삭제 관리", 파일 첨부 버튼, 웹 URL 입력창) 완전 제거.
       - fileInputRef를 hidden으로 배치하여 캐러셀의 [➕ 이미지 추가] 카드 및 빈 상태의 [📂 내 PC에서 이미지 파일 추가] 버튼과 직결.
       - 캐러셀 헤더 우측에 [🗑️ 전체 이미지 삭제] 버튼을 단정하게 통합 배치.
       - 이미지가 없을 때도 점선 카드 내에 명확한 추가 버튼 제공.

31. **혼합 미디어 캐러셀(이미지+동영상 동시 포스팅) 및 30일 보관/자동·수동 삭제 파이프라인 (2026-10-05, v1.45)**:
   - **개편 배경**: "쓰레드 포스팅시 이미지와 영상은 동시에 포스팅이 가능한지 관련 문서 확인해보고 진행해줘. 그리고 이미지, 영상 등 데이터 보관 기간은 등록시점 한달후 자동삭제로 동작되도록 해주고 사용자가 필요없는건 수동으로 삭제할 수 있도록도 해주고" 주인님 지시 완벽 반영.
   - **조치 사항**:
     - **혼합 미디어 캐러셀**:
       - src/lib/threads/client.ts의 publishThreadsPost를 기반으로 src/lib/posts/publish-core.ts에서 이미지와 영상을 하나의 캐러셀(mediaItems: [{ url, type: "IMAGE" | "VIDEO" }])로 결합하여 Meta Threads API로 동시 발행 지원 (최대 20개).
       - src/components/posts/ProductPostForm.tsx: 이미지와 영상의 배타적 초기화를 제거하고 통합 미디어 캐러셀로 개편. 점선 카드([➕ 이미지 추가], [🎬 영상 추가]), 순서 이동(◀, ▶), 동영상 미리보기 재생 오버레이 지원.
       - src/components/posts/PostMediaViewer.tsx: 상세 페이지에서 이미지와 비디오가 섞여 있어도 슬라이드로 자연스럽게 전환·재생·확대 지원.
     - **30일 자동 삭제 (Auto Cleanup)**:
       - src/lib/mediaRetention.ts: 보관 기간 30일(MEDIA_RETENTION_DAYS = 30) 상수 및 컷오프 계산, 버킷 경로 추출 유틸 구현.
       - src/app/api/cron/cleanup-media/route.ts: Vercel Cron(0 18 * * * = 매일 KST 03:00) 연동 자동 정리 엔드포인트 구현 (30일 지난 tap_posts 및 post-images 스토리지 파일 자동 영구 삭제).
       - threads-affiliate-poster/vercel.json: /api/cron/cleanup-media 및 /api/posts/dispatch-scheduled 크론 등록.
     - **사용자 수동 삭제 (Manual Cleanup)**:
       - src/lib/actions/posts.ts:
         - deleteMediaFileAction: 작성 폼에서 개별 ✕ 삭제 또는 전체 미디어 삭제 시 본인이 업로드한 Storage 파일까지 즉시 삭제 연동.
         - deletePostAction: 게시글 삭제 시 연결된 Storage 미디어 파일도 함께 회수.

32. **Zod validation.ts의 단일 미디어 배타적 규칙 잔존 버그 해결 (2026-10-05, v1.46)**:
   - **증상**: 이미지와 동영상을 함께 첨부 후 최종 포스팅 시 "이미지와 영상은 동시에 첨부할 수 없습니다. 하나만 선택해주세요." 에러 발생.
   - **원인**: 과거 단일 미디어 시절 src/lib/validation.ts의 postFormSchema에 정의되어 있던 data.imageUrl && data.videoUrl 동시 첨부 금지 규칙 및 단일 URL 검증(z.string().url())이 남아 있어 서버 액션 폼 검증 단계에서 걸림.
   - **조치 사항**:
     - src/lib/validation.ts: 동시 첨부 금지 규칙 완전 삭제, 쉼표 다중 URL을 지원하는 mediaUrlStringSchema 적용, 이미지+영상 총합 20개 이하 검증으로 개편하여 혼합 캐러셀 포스팅 정상화.

33. **게시글 30일 자동삭제 정책 안내 및 삭제 버튼 우측 남은 시점 표시 연동 (2026-10-05, v1.47)**:
   - **개편 배경**: `https://threads-affiliate-poster.vercel.app/posts` "게시될 글은 30일후 자동삭제된다는 문구과 '삭제' 버튼 우측 남은 시점 표시해줘" 주인님 지시 반영.
   - **조치 사항**:
     - `src/lib/mediaRetention.ts`: `getRemainingRetentionTime(createdAt)` 헬퍼 함수 구현 (30일 기준 잔여 일수 및 시간 계산, 만료 시 '삭제 예정' 표시, 잔여 3일 이하 긴급 빨간색 강조).
     - `src/app/(dashboard)/posts/page.tsx`:
       - 상단에 `⏳ 게시글 및 미디어 자동 보관 정책 (30일 후 자동 삭제)` 안내 배너 추가.
       - 게시글 목록의 각 `DeleteButton` 우측에 남은 시점 배지(`remaining.text`) 렌더링.
     - `src/app/(dashboard)/posts/[id]/page.tsx`:
       - 상세 페이지 하단 삭제 버튼 우측에도 일관되게 남은 시점 배지 연동.

34. **상품 관리 "상품·상세페이지 분석으로 등록" 기능 삭제 (2026-10-08, v1.48)**:
    - **배경**: `https://threads-affiliate-poster.vercel.app/products` 주인님 "상품, 상세페이지 분석으로 등록 기능은 필요 없을 것 같아 해당 기능 삭제" 지시.
    - **조치 사항**:
      - `PlatformTabs.tsx`: "링크로 빠르게 / 상품·상세페이지 분석으로" 모드 토글 및 `RegistrationMode` 타입 삭제 → 링크·검색 등록만 유지. props는 `initialKeyword`만 받음.
      - `Coupang/Aliexpress/Naver/TossProductForm.tsx`: `mode`/`detailPages` props, `analyze` 분기, `EnrichmentFields` 사용 전부 제거(상품명·이미지는 선택 상품 hidden input 또는 직접 입력으로 고정).
      - `products/page.tsx`: `listUserDetailPages` 조회 제거, 사용방법의 "AI 소구점 분석" 항목 삭제. `guide/page.tsx`: 등록 방식 2종/분석 6단계 안내 삭제 후 번호 재정렬.
    - **남겨둔 것(의도적)**: 서버쪽 `parseEnrichmentFields`/`analyzeProductImagesAction`/`productAnalyzer.ts`/`detailPages.ts`와 `EnrichmentFields.tsx` 파일은 호출처만 사라진 미사용 코드다. 기존에 `input_mode='manual'`로 등록된 상품의 `detailPageExcerpt` 반영(`affiliateGenerator.ts`)이 계속 동작해야 해서 지우지 않았다. 완전 삭제하려면 주인님 승인 후 별도 작업.
    - 버전 v1.48: `version.ts`, DB `programs.version`, 마이그레이션 `0008_bump_version_v1_48.sql`.

35. **네이버 트렌드·시장 조사를 회원 본인 네이버 API 키로 전환 (2026-10-09, v1.49)**: 최상위 규칙(docs/TOP_RULE_PERSONAL_ACCOUNT_API.md) 위반 수정.
    - 이전: 운영자 하나의 `NAVER_TREND_CLIENT_ID/SECRET` 환경변수를 모든 회원이 공유 → 운영자 키 한도·책임이 회원 전체에 퍼짐.
    - 이후: `fetchTrendAction`/`fetchMarketResearchAction`이 `user_api_keys`의 본인 `naver_client_id`/`naver_client_secret`만 사용(없으면 "API키등록·플랫폼연동에서 등록" 안내). 결과 캐시(공개 시장 데이터)는 유지하되 캐시 읽기 전에 본인 키 등록을 먼저 확인.
    - 화면: API키등록·플랫폼연동에 "네이버 검색·데이터랩" 입력 칸 추가. DB provider 제약에는 이미 `naver_client_id/secret`이 있어 스키마 변경 없음.
    - 시험: `npm run test:naver-key`. 버전 v1.49: `version.ts`, DB `programs.version`, 마이그레이션 `0009_bump_version_v1_49.sql`.
    - 남은 일: Vercel 환경변수 `NAVER_TREND_CLIENT_ID/SECRET`(이제 코드가 안 읽음) 삭제.
- v1.50 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.
- v1.51 (2026-10-12): 예약·자동 실행(cron/스케줄) 작업에도 핸드폰 번호 필수 정책 적용 — 번호가 없는 회원(관리자 제외)의 예약·자동 작업은 실행하지 않습니다. 상세: `docs/PHONE_REQUIRED_POLICY.md`.


## 2026-10-16 DB 연동 변수 호환 — v1.52 (threads-affiliate-poster)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.53 (Claude Code 윈도우)
- 새 주소 `https://threads-affiliate-poster.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 /settings 재로그인 없이 열림(시험 계정 표시), 옛 주소 화면 308, 옛 주소 콜백 → 새 주소 307(시험 요청). 설정 화면 콜백 주소 안내는 옛 주소 그대로(회원 Meta 앱 변경 불필요). 실제 계정 연결은 회원 앱 필요로 미시험
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-16 v1.54 — 옛 vercel.app 삭제 대비 두 주소 지원 (Claude Code 윈도우)
- 플랜: `../docs/OLD_DOMAIN_RETIREMENT_PLAN_20261016.md`(기준 구현 threads-comment-reply v1.08). `src/lib/oauthRedirect.ts`: SITE_ORIGIN(독립 배포본이면 `NEXT_PUBLIC_SITE_URL`, 아니면 새 주소)·`THREADS_REDIRECT_OLD()`(기존 환경변수 `THREADS_REDIRECT_URI`)·`THREADS_REDIRECT_FOR(mode)`·`isLegacyHost()`.
- 콜백: 기본 연결은 옛 콜백, 설정 화면 [새 주소로 (다시) 연결](`connectThreadsAccountNewCallbackAction`)·/trends [새 콜백 주소로 연결](`...WithKeywordSearchNewCallbackAction`)은 새 콜백. 옛 주소 307에 via=old, 교환은 via=old면 옛 주소·없으면 새 주소. 연결 후 이동 SITE_ORIGIN. 설정 화면에 두 콜백 주소 표시. `getThreadsAuthorizeUrl(state, appId, redirectUri, options?)`·`exchangeCodeForToken(code, appId, appSecret, redirectUri)`로 시그니처 변경, 미사용이 된 `getEnv` 제거.
- **독립 배포본 보완**: SSO(v1.53)에서 넣은 "옛 vercel.app → buylife.xyz" 이동이 clone-kit 독립 배포본(자기 vercel.app에서 운영)까지 걸리던 문제 — `src/proxy.ts`·콜백에서 `NEXT_PUBLIC_STANDALONE_MODE=true`면 이동하지 않게 함.
- 검수: 빌드·배포, 옛 콜백 → via=old 307, 새 콜백 → /login, 옛 화면 308. 시험 계정 [새 주소로 다시 연결] → Meta "리디렉션 URI 화이트리스트에 없음"(새 콜백 전송 확인, 시험 계정 앱 미등록). 실제 연결 성공은 새 주소 등록 후 확인 필요.

## 2026-10-17 v1.55 — 등록 주소 한눈에 보기·복사 버튼 (Claude Code 윈도우)
- 주인님 요청(INSTA 포스팅 v1.14·threads v1.09와 같은 형식): 설정 화면 맨 위 `ThreadsMetaAddressSummary`(① 앱 도메인 ② Threads API 액세스 › 설정 › 리디렉션 콜백 URL 새·옛 ③ 제거·삭제 콜백 URL(`SITE_ORIGIN` 기준 `/api/threads/uninstall`·`/delete`) ④ Threads 앱 ID 위치 ⑤ 테스터 추가·초대 수락). 콜백 주소 표시는 `CopyAddress`(복사 버튼)로 교체.
- 독립 배포본: 앱 도메인·콜백은 `SITE_ORIGIN`/`THREADS_REDIRECT_NEW`의 호스트에서 계산(자기 주소로 표시, buylife.xyz 고정 아님).
- 같은 날 주인님이 Meta 앱 리디렉션 콜백에 새 주소 추가·제거/삭제 콜백을 새 주소로 교체 → 관리자 [새 주소로 다시 연결] 성공(`tap_accounts` 갱신).
- 검수: 빌드·배포·DB v1.55, 크롬 화면 텍스트로 카드·제거/삭제 주소·복사 버튼 확인.
## v1.56 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/ai/generator.ts` `src/lib/ai/imageGenerator.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.57 — 이미지 생성 호출·모델 목록을 공용 기준 코드로 (2단계 SNS 생성기 묶음, Claude Code 윈도우)
- `src/lib/ai/generator.ts`의 모델 목록·호출 코드를 공용 사본으로 교체. (`imageGenerator.ts`의 다중 플랫폼 생성기는 OpenAI·Replicate 등과 함께 쓰는 별도 구조라 이번 묶음에서 그대로 둠 — 다음 묶음)
- 통합 값: 1K=`gemini-3.1-flash-lite-image`, 2K·4K=`gemini-nano-banana-2.1`, Pro=`gemini-3-pro-image`(온도 0.4). 개선: 키 머리글 전송, 시간 제한, 서버 오류·혼잡 1회 재시도, 모든 조각 탐색, 안전 차단·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·한국인 지시문·비율·기본 등급(`GEMINI_IMAGE_MODEL` 환경변수 포함)은 그대로.
- 이 프로그램에서 바뀐 값: 1K → flash-lite, Pro 모델 → `3-pro-image`.
- 검수: tsc·eslint 0, test:naver-key 통과, build, 배포·DB v1.57. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`(호출)·`nanoBananaModels.ts`(등급별 모델)는 공용 기준 코드 `gemini-image-client`·`gemini-image-models`의 사본이다(기준: `ai-image-studio/lib/providers/`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.58 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.59 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.60 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.61 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-17 v1.61 — 스레드 바이럴 스튜디오 다크 콘솔 스타일 리뉴얼 & 시스템 규격화 (Antigravity 윈도우)
- **디자인 리뉴얼**: **스레드 바이럴 스튜디오 스타일 — 쇼핑제휴 변형 (Threads Viral Studio Style - Affiliate Variant)** 전면 적용
  - Meta Threads 모노 블랙(`#171717`) 캔버스 + 카드(`#1f1f1f`) + 테두리(`#262626`/`#333333`) + 이커머스 골드/앰버(`#f59e0b`) & 로열블루(`#3b82f6`) 포인트 결합.
  - 모바일(375px) 상단 고정 헤더(`Threads 쇼핑제휴 자동화` + 버전 칩 + 햄버거 토글 버튼) 및 슬라이드 오버레이 드로어 메뉴 지원.
  - 사이드바 메뉴명 표준화: `📖 연동 & 사용 매뉴얼`로 통일 및 3단계 작업 파이프라인 칩 시각화.
  - 비주얼 사용 매뉴얼(`/guide`) 신규 구축: 🤖 마스코트 말풍선, 4단계 파이프라인 다이어그램, 4대 제휴사(쿠팡/알리/네이버/토스) 비교 연동표, 공정위 고지 준수 가이드, FAQ 4종 구축.
  - 대시보드(`/dashboard`) 다크 테마 정돈: 프로그램 소개, 5단계 가이드 카드, 통계 카드 5종, 예약 게시 리스트 다크 테마 완비.
- **인수인계 문서 규격화**:
  - `docs/PLAN_20261017_DESIGN_RENEWAL.md` (사전 플랜)
  - `docs/DESIGN_HANDOFF.md` (디자인 인수인계서)
  - `docs/IMPROVEMENTS.md` (3대 과제 및 타 프로그램 탐색 제안)
  - `docs/IMPROVEMENT_BACKLOG.md` (대기 백로그)
- **검수**: Next.js 16.2.11 Turbopack 빌드 성공, Vercel 배포 완료, DB `v1.61` 동기화, Microsoft Edge 포그라운드 실세션 검수 완료 (`edge_threads_affiliate_*_v161.png`). 비용 0원.

---

## 🏛️ [규격화 7대 핵심 항목 가이드]

### 1) 프로그램 사용 목적 및 대상
- **사용 목적**: 쿠팡파트너스, 알리익스프레스 어필리에이트, 네이버 브랜드커넥트, 토스쇼핑 쉐어링크 상품을 기반으로 10종 AI 페르소나와 나노바나나 AI 이미지를 결합한 Threads 바이럴 카드뉴스 및 캡션을 자동 생성·발행하는 SaaS.
- **대상**: 이커머스 제휴 마케터, 부업 크리에이터, Threads 기반 인플루언서 및 쇼핑 큐레이터.

### 2) 개발 구현 도구 / 기술 스택
- **프레임워크**: Next.js 16.2.11 (Turbopack, App Router), React 19, TypeScript
- **스타일링**: Tailwind CSS v4 (`@import "tailwindcss";`), 다크 모노 테마 토큰
- **인프라/DB**: Supabase SSR (공유 DB), Vercel Serverless Functions
- **연동 엔진**: Meta Threads Graph API (OAuth), Google Gemini (텍스트/나노바나나 이미지), OpenAI (GPT-4.1), Claude, Coupang Partners API, AliExpress Affiliate TOP API, Toss Shopping API

### 3) 핵심 기능 / 시스템 로직 / 아키텍처 및 장단점
- **핵심 기능**:
  - 10종 AI 페르소나 맞춤형 카피라이팅 엔진 (`src/lib/constants/personas.ts`)
  - 4대 플랫폼(쿠팡, 알리, 네이버, 토스) 제휴 링크 파싱 및 썸네일 수집
  - 공정거래위원회 추천·보증 심사지침 필수 문구 자동 삽입
  - 나노바나나 AI 멀티컷 카드뉴스 자동 생성
  - Threads OAuth 즉시 포스팅 및 스케줄링 예약 발행
- **장점**:
  - 쿠팡 API 키가 없는 초보자도 직접 발급 링크로 즉시 사용 가능
  - Threads 감성에 특화된 모노 다크 디자인 및 모바일 완벽 대응
  - 회원 본인 API 키 사용 원칙으로 운영비 0원 및 프라이버시 보장
- **단점/한계**:
  - 알리익스프레스 및 토스쇼핑의 경우 사전 API 키 발급 및 고정 IP 설정 등 초기 연동 과정 필요
  - Threads API 심사 전에는 개발자 테스터 등록 계정 위주 연동

### 4) 현재 버전 및 변경 히스토리
- **현재 버전**: `v1.79` (2026-10-22, DB 및 UI 일치) — v1.62 이후 기록은 이 문서 맨 아래 날짜별 항목
- **히스토리**:
  - `v1.57 ~ v1.60`: 공용 이미지 기준 코드 동기화 및 타임아웃 이중 과금 방지
  - `v1.61`: 구글 AI 스튜디오 사용량 안내 정정 및 **스레드 바이럴 스튜디오 다크 콘솔 스타일 전면 리뉴얼 완결**

### 5) 추가 프로그램 및 디자인 대기 백로그
- `docs/IMPROVEMENT_BACKLOG.md` 참조 (제휴 링크 품절 자동 체크, Threads 첫댓글 제휴 링크 자동 부착, 서브페이지 폼 세부 튜닝)

### 6) 타 프로그램 연계 / 기능 병합 제안
- **8번 `detail-page-12p`**: 12단 상세페이지 3줄 요약을 제휴 캡션으로 원클릭 가져오기
- **34번 `threads-video-downloader`**: 다운로드한 인기 숏클립 영상을 쇼핑제휴 캡션 미디어로 연계
- **46번 `threads-comment-reply`**: 쇼핑 글에 달린 구매 문의 댓글에 제휴 링크 자동 대댓글 발송

### 7) 디자인 UI 개선안 및 레이아웃/스타일 변경 제안
- `docs/DESIGN_HANDOFF.md` 및 `docs/IMPROVEMENTS.md` 참조


## 2026-10-18 v1.62 — 다중 엔진 이미지 생성기의 Gemini 부분을 공용 기준 코드로 (이미지 공용화 마지막 1곳, Claude Code 윈도우)
- `src/lib/ai/imageGenerator.ts` `generateWithGemini`: 직접 REST 호출(키를 주소에 넣음, 시간 제한 없음, 첫 이미지만 꺼냄) → 공용 사본 `geminiImage.ts`로 호출, 등급별 모델·화질·온도는 공용 목록 `nanoBananaModels.ts`의 `getNanoBananaConfig()`에서 가져옴. 시간 제한 240초(서버 액션 기본 한도 300초), 재시도 0. 프롬프트·한국인 지시문·비율 1:1은 그대로. OpenAI·Replicate(FLUX·Z-Image) 부분은 그대로.
- **모델 대응을 같은 프로그램의 `generator.ts`와 일치시킴**: 예전엔 이 파일만 모든 등급을 `gemini-nano-banana-2.1`로 보내, 같은 「NanoBanana Pro」·「2-1K」 선택이 화면에 따라 다른 모델이었다. 이제 1K = `gemini-3.1-flash-lite-image`(더 저렴), 2K·4K = `gemini-nano-banana-2.1`(변화 없음), Pro = `gemini-3-pro-image`(1장 가격 오름, 회원 본인 키).
- 검수: tsc 0, eslint(바뀐 파일) 0, `test:naver-key` 통과, `check-shared-modules` OK(시간 240초), Vercel 프로덕션 배포 1회·DB v1.62, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).
- **주의(다음 CLI)**: `geminiImage.ts`·`nanoBananaModels.ts`는 공용 기준 코드 사본(기준 `ai-image-studio/lib/providers/`) — 직접 고치지 않는다.

## 2026-10-18 — 예약 화면 안내 문구 「예약 시각 후 1분 안에 자동으로 발행됩니다」 (Claude Code 윈도우, **미배포 — 다음 배포 때 함께**)
- `src/components/posts/ProductPostForm.tsx`(기존 안내에 덧붙임) 예약 시각 입력란에 안내 추가. 정확히 그 분에 안 올라가도 회원이 헷갈리지 않게(예약 게시 누락 방지 ②, 플랜 `docs/PLAN_20261018_SCHEDULED_DISPATCH_MONITOR.md`).
- 급하지 않은 화면 문구라 비용 규칙에 따라 커밋만 함. **다음에 이 프로그램을 배포하는 CLI는 버전 +0.01(코드·DB)하고 버전 기록에 이 항목을 넣을 것.** 검수: tsc 0.

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-004(P1)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-19 v1.63 — 예약 발행 실행 방식 회원 선택(Vercel / 본인 cron-job.org) + 중복 발행 방지 (Claude Code 윈도우, 주인님 지시)
- 지침: 루트 [`docs/SCHEDULER_POLICY.md`](../docs/SCHEDULER_POLICY.md) — 기준 구현 `threads-content-ops` v2.08을 이 프로그램에 맞춰 적용. 운영 기본 Vercel, 복제본(`NEXT_PUBLIC_STANDALONE_MODE=true`) 기본 cron-job.org.
- 화면: 설정 「⏰ 예약 발행」(실행 방식 라디오 `components/settings/SchedulerModePicker.tsx` + cron-job.org 키 `ApiKeyRow`, 공용 provider `cronjob_org_api_key` — Threads 운영 자동화에 넣은 키가 그대로 「등록됨」), 게시글 목록 위 상태 줄·전체 일시정지/재개(`components/posts/SchedulePublishingControl.tsx`).
- 코드: `src/lib/posts/cronJobOrg.ts`·`memberScheduler.ts`(표 `tap_member_scheduler`, 토큰 `tap_…`, 환경변수 `TAP_PLATFORM_SCHEDULER`), `src/lib/actions/scheduler.ts`(방식 선택·일시정지·재개), `actions/posts.ts` create/update에 예약 전 방식 확인·예약 뒤 작업 켜기(실패 시 초안으로 되돌림), `actions/settings.ts` 키 변경(방식 유지)·삭제(운영은 Vercel로) 처리, 새 주소 `/api/posts/dispatch-member`(회원 토큰, 즉시 응답 + `after`로 발행, 남은 예약 0건이면 작업 끔), `/api/posts/dispatch-scheduled`는 vercel·비일시정지 회원만.
- **중복 발행 방지(새로 추가)**: `dispatch.ts`가 글마다 `scheduled → publishing` 조건부 update로 먼저 가져간 실행만 발행(예전엔 없어서 호출이 겹치면 두 번 올라갈 수 있었음). 회원 실행에도 핸드폰 필수 정책 적용.
- 운영 DB(`esgxyikcnnvmlhygjkth`): `tap_member_scheduler` 생성(RLS 본인 조회) — `supabase/migrations/20261019220000_tap_member_scheduler.sql`. 복제 키트: `clone-kit/database/99_finalize.sql` 허용 목록에 `cronjob_org_api_key`, `clone-kit/README.md` 8장·`env.example` 갱신.
- 검수: tsc 0, `test:naver-key` 통과, 빌드(`/api/posts/dispatch-member` 포함), 배포 `threads-affiliate-poster-iew3xqyvl`, DB v1.63, 두 실행 주소 무인증 401, 15분 오류 로그 0. 크롬(관리자): 설정 v1.63·Vercel 기본·공용 키 「등록됨」 → 「내 cron-job.org」 전환 → 게시글 목록 「내 cron-job.org 대기」 → 상품 선택 후 시험 글 이틀 뒤 예약 → 작업 자동 생성(8676864)·켜짐, DB 예약 시각 KST 정상 → 임시저장으로 초안 복귀 → 약 10초에 작업 자동 꺼짐 → 방식 Vercel로 원복. 시험 글은 초안 상태로 남아 있음(30일 뒤 자동 삭제). 실제 자동 발행은 기준 구현(threads-content-ops)에서 확인됨.
- 이번 배포에 2026-10-18 미배포 항목(예약 화면 「예약 시각 후 1분 안에 자동으로 발행됩니다」 안내)도 함께 나감. 린트는 이 폴더에서 설정 파일 인식 문제로 실행 못 함(타입 검사·빌드로 대체).

## 2026-10-19 — 배포 키트를 AIMaster 표준 `KIT/` 방식으로 통합 (Claude Code 윈도우, 주인님 지시 — 코드·버전·배포 변경 없음)
- `clone-kit/` → `KIT/`(git mv): `KIT/README.md`(수강생용 표준 목차로 재작성), `KIT/PLATFORMS.md`(신규), `KIT/kit.json`(신규 — schema `generate`: `KIT/database/00_core_tables.sql` + `supabase/migrations/*` + `KIT/database/99_finalize.sql`, extraEnv: 운영자 이름·이메일·FIXIE_URL), `KIT/vercel.json`(무료용: 정리 작업만), `KIT/enable-vercel-cron.*`(Pro), `KIT/setup.*`(공용 템플릿), `KIT/manuals/`·`DB_DESIGN.md`·`GUIDELINES.md`·`env.example` 이동. `make-clone.mjs`·생성물 `schema.sql` 삭제(포장 스크립트가 대신).
- 키트 허용 목록(`KIT/database/99_finalize.sql`)에 빠져 있던 `naver_client_id`·`naver_client_secret`·`replicate` 추가.
- 발견(미수정): 운영 설정 화면의 Claude·Replicate 키 칸이 `src/lib/actions/settings.ts` `VALID_PROVIDERS`에 없어 저장 실패 — **다음 배포 때 수정**(지침 `docs/DISTRIBUTION_KIT_GUIDE.md` §11-7).
- 시험 포장: `python scripts/make_lecture_kit.py --name TAP_Kit_TEST --programs threads-affiliate-poster` → 149개 파일, DB 파일 16조각 자동 생성(예약 표·cron-job.org 키 포함), 무료용 vercel.json, 비밀값 검사 통과. 실제 리허설은 아직(지침 §6).
- 코드는 주석만(`clone-kit` → `KIT/`) — 동작 변화 없음, 배포 불필요. 지침: 루트 `docs/DISTRIBUTION_KIT_GUIDE.md`.

## 2026-10-19 v1.64 — 날짜 한국 시간 표시 + 24시간 규칙 + Claude·Replicate 키 저장 (Claude Code 윈도우)
- **날짜 표시**: 서버 화면(`dashboard`·`posts`·`posts/[id]`·`settings`)과 `MarketResearch`·`actions/viral.ts`의 날짜 10곳에 `timeZone: "Asia/Seoul"` — Vercel(UTC) 기준으로 9시간 이르게 보이던 문제(INSTA v1.25 검수 중 같은 문제 발견). 가격 같은 숫자 표시는 그대로.
- **24시간 규칙(밀린 보완)**: 화면은 「24시간 넘게 지난 예약은 올리지 않음」이라 안내하는데 `src/lib/posts/dispatch.ts`에 규칙이 없었다 → threads v1.19와 같은 코드(`MAX_LATE_MS`·`TOO_LATE_MESSAGE`, 실패 처리 + 안내 문구). 루트 `docs/SCHEDULER_POLICY.md` §8 ⚠ 항목 처리.
- **키 저장(밀린 보완)**: 설정 화면에 Claude(`anthropic`)·Replicate 칸이 있는데 `src/lib/actions/settings.ts` `VALID_PROVIDERS`에 없어 「알 수 없는 provider」로 저장이 막혀 있었다 → 두 값 추가(운영 DB 허용 목록에는 이미 있음 확인). 루트 `docs/DISTRIBUTION_KIT_GUIDE.md` §11-7 처리. 실제 키 입력 시험은 하지 않음(에이전트는 키를 입력하지 않음 — 회원 저장 시 확인).
- 버전 기록 `supabase/migrations/20261019260000_kst_24h_keys_v1_64.sql`(구조 변경 없음). 검수: tsc 0, `test:naver-key` 통과, build, 배포 `threads-affiliate-poster-5ql36sudm`(Ready), DB v1.64, 크롬: v1.64 표시, 「등록: 2026. 10. 19. 오후 8:30:29」 = DB `11:30:29Z`의 한국 시각.

## 2026-10-20 — 다음 배포자 할 일: 버전 +0.01 (Claude Code 윈도우, agy 작업 이어받음 — 코드 변경 없음)
- agy가 2026-10-20 설정 화면 주소 카드 색 개선(`ThreadsMetaAddressSummary`·`CopyAddress` 밝게, 커밋 `fd69da1d`)을 **버전을 올리지 않고 배포**함(배포 `dpl_EQoNqeWQ6fU4ZQsscaezUyzgjsyQ`, 코드·DB 모두 v1.64 그대로).
- 급하지 않아 다시 배포하지 않음(빌드 비용 규칙). **다음에 이 프로그램을 배포하는 CLI는 v1.65(코드 `src/lib/version.ts` + DB `programs.version`)로 올리고, 버전 기록에 이 카드 색 개선을 함께 적을 것.**

## 2026-10-20 v1.66 — 회원 연동 정보 공용 저장 ③단계: Threads 계정 한 번 연결 → 여러 Threads 프로그램 함께 사용 (Claude Code 윈도우)
- 루트 [`docs/MEMBER_INTEGRATIONS.md`](../docs/MEMBER_INTEGRATIONS.md). 공용 부품 사본 `src/lib/memberIntegrations.ts`(기준 루트 `lib/memberIntegrations.ts`, `check-shared-modules.mjs` 「member-integrations」 — 사본 직접 수정 금지).
- `src/lib/threads/memberAccount.ts` `getThreadsAccountForUser()`: 공용 표(게시 권한·재연결 필요 아님) → 없으면 `tap_accounts`. 즉시 게시(`actions/posts.ts`·`actions/viral.ts` 즉시 포스팅)·예약 발행(`posts/dispatch.ts`, 토큰 자동 연장은 읽은 곳에 기록 `saveRefreshedToken`)·대시보드/설정/새 글/글 상세/수정 화면. **키워드 검색(`viral.ts` 230줄)은 `tap_accounts`만** — `threads_keyword_search`는 연결 때 고르는 선택 권한이라 다른 프로그램 토큰에 없을 수 있음.
- **배포판(`IS_STANDALONE`)은 공용 표를 전혀 건드리지 않음**(수강생 DB에 표 없음).
- 연결 콜백 이중 기록(게시 권한, `app_ref`=회원 Threads 앱 ID), 연결 해제 시 공용 행도 삭제 + 설정 화면 안내.
- **Meta 제거·삭제 콜백**(`/api/threads/uninstall`·`/delete`, `lib/threads/signedRequest.ts`): 공용 표·운영 자동화(`tco_threads_accounts`)에만 연결이 있는 회원도 후보에 포함(서명은 회원 앱 시크릿으로 똑같이 확인), 공용 표 행 삭제, 운영 자동화는 **행을 지우지 않고 토큰만 무효화**(빈 토큰 + 만료=지금) — 그 표는 글·운영 설정·글감이 `on delete cascade`라 지우면 회원이 쓴 글까지 사라짐. (기존엔 운영 자동화 토큰이 삭제 요청 후에도 남던 빈틈.)
- 운영 DB: `supabase/migrations/20261020130000_member_integrations_v1_66.sql` — 공용 행 없는 회원만 백필 + 버전.
- 함께 나감(버전 없이 배포됐던 agy `fd69da1d` 카드 색 개선, 위 2026-10-20 「다음 배포자 할 일」 항목)은 v1.65(`ccf80d68`, 다른 세션 배포)에 이미 포함됨.

## 2026-10-20 v1.67 — GPT-5.x·GPT-6 모델로 홍보 글 생성 시 400 오류 수정 (Claude Code 윈도우)
- 증상(운영 v1.66에서 재현): 새 글 작성에서 글 엔진을 GPT-5.6·GPT-6 계열로 고르고 생성하면 `400 Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.` — 선택지 6개 모두 해당.
- 수정: `src/lib/ai/generator.ts` OpenAI 호출에서 `gpt-4` 계열만 `max_tokens: 600`·`temperature: 0.8`, 그 밖(추론 모델)은 `max_completion_tokens: 4000`(생각 단계도 한도에 포함돼 600이면 빈 응답 위험). 같은 폴더의 다른 OpenAI 호출(`viral.ts` 2곳·`productAnalyzer.ts`)은 고정 모델이거나 이미 온도만 조건부라 해당 없음.
- 검수: tsc 0, `test:naver-key` 통과, build, 배포 `threads-affiliate-poster-mgsqzhmd0` Ready, DB v1.67(ref `esgxyikcnnvmlhygjkth`, `supabase/migrations/20261020170000_bump_version_v1_67.sql`). 크롬(관리자): v1.67 표시, 같은 상품·`gpt-5.6-luna`로 「AI 글만 다시 생성」 → 오류 없이 490자 생성·제휴 고지 포함(저장 안 함), 화면 기본 모델은 GPT-4.1로 되돌림. 비용: 관리자 본인 OpenAI 키 실패 1회 + 성공 1회.
- 함께 나감: 다른 세션의 공용 사본 `src/lib/memberIntegrations.ts`(④단계 `authMethod` 선택 인자, 커밋 `62686273`, 기존 동작 같음).

## 2026-10-20 v1.68 — OpenAI 모델별 요청 규칙을 공용 기준 코드로 + GPT-5·GPT-6 응답 지연 안내 (Claude Code 윈도우)
- 공용 기준 코드 `openai-request-params` 사본 `src/lib/ai/openaiRequestParams.ts`(기준 `naver-blog-seo-studio/lib/ai/openaiRequestParams.ts`, **직접 고치지 않음**). `generator.ts`(v1.67 임시 분기 → `openAIGenerationParams(selectedModel, { temperature: 0.8, maxTokens: 600 })`)·`actions/viral.ts`(벤치마킹 캡션 온도) 적용. 동작은 v1.67과 같음.
- 화면: 새 글 작성·떡상 탐지기의 글 모델 선택 칸 아래에 GPT-5·GPT-6 계열이면 「⏳ … 응답이 조금 느릴 수 있습니다」(`openAIModelNotice`).
- 테스트 `npm run test:openai-params`(기준 테스트와 같은 내용, 경로만 `src/lib`). 검수: tsc 0 · test:naver-key · 5개 통과 · build · 배포 `threads-affiliate-poster-reqa8hqmk` Ready · DB v1.68 · 크롬: v1.68, 안내 표시, `gpt-5.6-luna` 글 489자 생성, 기본 모델 GPT-4.1로 되돌림.

## 2026-10-20 v1.69 — 글 모델 선택 칸에 모델 성격 표시 (Claude Code 윈도우)
- 새 글 작성·떡상 탐지기 글 모델 선택 칸 아래 「모델 성격: ⚡ 빠름 / ⚖️ 균형 / 💎 고품질」(공용 기준 코드 `openAIModelTier`, 사본 `src/lib/ai/openaiRequestParams.ts` 갱신 — 직접 고치지 않음). 검수: tsc 0 · test:naver-key · test:openai-params 6 · build · 배포 `threads-affiliate-poster-ewejj63fv` Ready · DB v1.69 · 크롬: luna ⚡·astra 💎·4.1 ⚖️ 표시, 기본 모델 GPT-4.1 유지(호출 없음).

## 2026-10-20 v1.70 — 모델 성격 표시에 한 줄 설명 (Claude Code 윈도우)
- 「모델 성격: … ⓘ」에 마우스를 올리면 말풍선(`title`), 누르면 펼침(`<details>`)으로 설명(공용 기준 코드 `openAIModelTierHint`, 사본 갱신). 배포 `threads-affiliate-poster-7q30yno6l` Ready · DB v1.70 · 크롬(일반 회원 세션): luna 「짧은 글·빠른 응답에 적합…」, 닫힘 17px→열림 35px, 기본 모델 GPT-4.1 유지(호출 없음).

## 2026-10-20 v1.71 — 모델 선택 칸에 상대 비용 표시 (Claude Code 윈도우)
- 「모델 성격: ⚡ 빠름 · 비용 💰 ⓘ」(공용 기준 코드 `openAIModelBadge`·`openAIModelCostLevel`, 사본 갱신). 💰=빠름·💰💰=균형·💰💰💰=고품질, 설명에 「OpenAI 모델끼리 비교한 상대 표시, 정확한 단가 아님」. 배포 `threads-affiliate-poster-90ad8afiv` Ready · DB v1.71 · 크롬: luna 💰·sol 💰💰💰·4.1 💰💰, 기본 모델 GPT-4.1 유지(호출 없음).

## 2026-10-20 (버전 변경 없음·미배포) — 회원 예약 실행 방식 코드를 공용 기준 코드 `member-scheduler` 사본으로 (Claude Code 윈도우)
- 한 일: `src/lib/posts/memberScheduler.ts`를 **공용 기준 코드 `member-scheduler`의 사본**으로 바꿨다(기준 `cardnews-studio/src/lib/instagram/memberScheduler.ts`, 예약 프로그램 15개 공용). 이 프로그램만의 값(사이트 주소·실행 방식 표 `tap_member_scheduler`·토큰 앞글자 `tap`·환경변수 `TAP_PLATFORM_SCHEDULER`·설치 키트 여부·「남은 일」= 예약 글 수)은 같은 폴더 새 `schedulerConfig.ts`로 옮겼다(원래 값과 자동 대조 일치). **앞으로 `memberScheduler.ts`는 직접 고치지 말고** 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.
- 동작 변경 없음. tsc·build 통과, 설치 키트 DB 대조 통과. 플랜 `cardnews-studio/docs/PLAN_20261020_MEMBER_SCHEDULER_SHARED.md`.
- **미배포**(주인님 결정: 이 프로그램을 다음에 배포할 때 함께 반영) — 그 배포 때 버전 +0.01, 예약 상태 화면과 회원 실행 주소 가짜 토큰 401을 확인할 것.

## 2026-10-22 v1.76~v1.79 — 대시보드 「📊 최근 7일 게시」 그래프·게시 시각 칸·그날 게시 글·글자 크게 (Claude Code 윈도우)
- v1.76: 상태 통계 아래 7일 게시 그래프(공용 기준 코드 `week-reply-chart` 사본, 기준 comment-inbox). v1.77: **`tap_posts.published_at` 칸 추가**(주인님 승인, 운영 DB 적용 — 기존 게시 10건은 그때의 `updated_at`으로 채우고 트리거를 잠깐 꺼 `updated_at` 유지), 게시 완료 때 기록(칸이 없는 DB면 빼고 다시 저장), 막대 누르면 그날 게시한 글(`src/lib/actions/weekPosts.ts`, 공용 `week-reply-panel`). v1.78: 그날 목록 썸네일(`image_url` 첫 장). v1.79: 그래프 글자 한 단계씩 크게(주인님 요청).
- 상세·검수·배포 주소: [`docs/IMPROVEMENT_HANDOFF_20261022.md`](docs/IMPROVEMENT_HANDOFF_20261022.md). 미배포(다음 배포 때 함께): 공용 그날 목록의 「이미지가 안 열리면 썸네일 숨김」.
- 같은 날 이 문서 정리: 2026-10-20부터 남아 있던 미커밋 변경 371줄은 줄바꿈 차이뿐(내용 0줄)이라 버림, 예전 스크립트가 `\0`·`\t`·`\b`·`\f`를 제어 문자로 바꿔 깨졌던 글자 5곳(396·397·374·375·383줄 부근 `0 18 * * *`·`tap_posts`·`threads-affiliate-poster/`·`bg-…`·`fileInputRef`) 복구(커밋 `05d616c6`). 이제 일반 텍스트 파일로 검색·비교가 됨.
