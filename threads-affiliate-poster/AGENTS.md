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


