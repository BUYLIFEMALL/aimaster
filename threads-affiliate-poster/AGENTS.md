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

### 3. 🔥 바이럴 떡상 탐지기 (/trends) 및 직포스팅 벤치마킹 모달
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

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Threads OAuth 연결(BYOK 회원별 앱 등록 방식), AI 캡션 생성(`generateAffiliatePostContent`), 이미지 생성(NanoBanana 2K/4K/Pro), 즉시/예약 게시 | ✅ 구현 완료 |
| 1 | 쿠팡파트너스 클라이언트(키워드 검색 + 제휴 링크) | ✅ 구현 완료 + 실계정 실호출 검증 완료 |
| 1 | 알리익스프레스 클라이언트(URL → 제휴 링크 변환 `getPromotionLinks` + 공식 썸네일 수집 `getProductDetails`) | ✅ 구현 완료 + 실계정 실호출 및 DB 백필 검증 완료 (2026-09-27) |
| 1 | 네이버 브랜드커넥트 & 토스쇼핑 쉐어링크(Fixie 프록시 고정 IP 연동) | ✅ 구현 완료 + 실계정 전체 검증 완료 |
| 1 | 🎭 10종 AI 페르소나 멀티 보이스 시스템 (`PRESET_PERSONAS`) 및 커스텀 어조 연동 | ✅ 구현 완료 (2026-09-27) |
| 1 | 🔥 바이럴 떡상 탐지기 (/trends) & 3대 AI 엔진(OpenAI 4.1 / Gemini 3.7 / Claude) 선택 & 즉시 포스팅 | ✅ 구현 완료 (2026-09-27) |
| 1 | 게시글 작성(`/posts/new`) 페르소나 선택 연동 및 알리익스프레스 썸네일 403 해제 | ✅ 구현 완료 (2026-09-27) |

---

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
직접 발급받은 본인 제휴 링크를 그대로 붙여넣는다는 전제로 바꿨다
  (2026-09-11). 그래서 `registerCoupangProductAction`은 이제 Access/Secret Key를 전혀
  요구하지 않는다 — 그 키는 상품 검색(`searchCoupangProductsAction`)에만 필요하다. 매출
  15만원 미달로 검색 API 키가 아직 활성화되지 않은 회원도 "URL 직접 입력"으로는 등록할 수
  있다. 실제 상품(무선 이어폰 검색 → 선택 → 등록)으로 end-to-end 성공 확인.
- 쿠팡 상품검색 API는 시간당 호출 제한(약 10회, 커뮤니티 정보 — 쿠팡이 발급 시 제공하는
  가이드 PDF에만 적혀 있고 공개 문서 포털에는 없음)이 있다고 알려져 있어, 화면에도 안내
  문구를 노출하고 검색 결과를 `affiliate_products`에 저장해 재검색을 줄이는 방향으로
  설계했다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Threads OAuth 연결(공용 앱 재사용), AI 캡션 생성(`generatePostContent`/`generateAffiliatePostContent`), 이미지 생성(NanoBanana), 즉시/예약 게시, 예약 발행 dispatch(admin/user 이중화 + CRON_SECRET 보호 라우트) | ✅ 구현 완료 |
| 1 | 쿠팡파트너스 클라이언트(키워드 검색 + 딥링크 생성) | ✅ 구현 완료 + 실계정 실호출 검증 완료(2026-09-11) |
| 1 | 알리익스프레스 클라이언트(URL → 제휴 링크 변환) | ✅ 구현 완료 + 실계정 실호출 검증 완료(2026-08-28) |
| 1 | 네이버 브랜드커넥트 — 공식 API 없음, 직접 발급받은 링크를 수동으로 등록하는 방식으로 구현 | ✅ 구현 완료(구조적으로 계속 수동) |
| 1 | 상품 등록 2가지 입력 방식(URL 간단 입력 / 상품정보+상세페이지 직접 입력) — `affiliate_products.input_mode`, `auto-detail-page`의 `detail_pages` 읽기 전용 참조 | ✅ 구현 완료 |
| 1 | "분석으로 등록" 6단계 흐름(`EnrichmentFields`) — 1.대표이미지 2.상세페이지 이미지(선택,최대10) 3.상품 원본 정보 4.분석 결과 확인/수정 5.게시글용 대표 이미지(업로드 선택 또는 NanoBanana AI 생성) 6.최종 확인. `shop-detail-page`(별도 서브프로젝트, `/products/new`)의 AI 분석 UX를 참고해서 설계했다 — `auto-detail-page`와는 다른 프로젝트이니 혼동 주의. | ✅ 구현 완료(2026-08-28) |
| 1 | 제휴 고지 문구 자동 삽입(쿠팡/알리익스프레스/네이버 전부), 500자 제한 안에 고지 문구가 항상 포함되도록 본문 자동 트리밍 | ✅ 구현 완료 |
| 1 | 게시글 영상 첨부 — Threads API `media_type=VIDEO`+`video_url`(공식 스펙: MP4/MOV, 최대 1GB, 최대 5분). 이미지와 동시 첨부는 불가해 UI/서버 양쪽에서 배타적으로 처리. `tap_posts.video_filename`(미사용 스텁)을 `video_url`로 교체(0003 마이그레이션) | ✅ 구현 완료(2026-08-28, 공식 문서 기준 구현 — 실제 영상 게시 테스트는 아직 안 함) |
| 1 | `programs` 카탈로그 등록 + 썸네일(Gemini 생성) | ✅ 구현 완료(2026-08-27) |
| 1 | Vercel 배포(`buylife` 팀, 공용 Threads 앱 env 재사용) | ✅ 구현 완료(2026-08-27) |
| 1 | 토스쇼핑 쉐어링크 연동 — `src/lib/toss/client.ts`(OAuth2 client_credentials 토큰 발급, 베스트/카테고리/오늘의특가 상품 조회, 쉐어링크 발급). Toss Open API는 사전 등록된 고정 IP에서만 호출을 허용하는데 Vercel 서버리스는 고정 IP가 없어, **Fixie(usefixie.com) 프록시**를 붙여 해결했다 — 모든 요청이 `undici`의 `ProxyAgent`(`dispatcher` 옵션, `FIXIE_URL` env)를 거쳐 고정 IP 2개(`52.87.82.133`, `52.5.155.132`)로 나간다. `user_api_keys`에 `toss_access_key`/`toss_secret_key`/`toss_publisher_id` 3종 추가(0006 마이그레이션), `affiliate_products.platform`에 `'toss'` 추가, 설정 페이지에 고정 IP를 본인 토스 어드민 "허용 IP"에 등록하라는 안내 포함, 제휴 고지 문구도 토스용으로 추가. 키워드 검색 API가 없어 UI는 베스트/카테고리별/오늘의 특가 브라우징 방식으로 구현. **실계정 실호출로 응답 필드명 확인 완료(2026-09-10)**: 문서 예시 부족으로 처음엔 `productName`/`imageUrl`/`price`로 추정 구현했으나, 실제 응답은 `displayName`/`thumbnailUrl`/`displayPrice`였다(그래서 상품 목록은 뜨는데 이름/이미지/가격이 전부 비어 보이는 버그가 있었음) — `normalizeTossProduct()`를 실제 필드명 기준으로 수정. 또한 목록 응답에는 `tacaId` 필드 자체가 없고 `tacaItemId`만 내려온다(쉐어링크 발급은 `tacaItemId` 기준이라 문제 없음). 카테고리 목록(`/categories`)도 같은 이유로 `name`이 아니라 `displayName`이 실제 필드명이라 드롭다운이 빈 값으로 보이던 버그가 있었음 — 수정 완료. 베스트/카테고리별/오늘의특가 3개 탭 전부 실계정으로 상품명·가격·이미지 정상 노출 확인. 쉐어링크 발급(`POST /links`)도 `subTagId`에 회원 user_id를 임의로 채워 보내던 게 원인으로 `SHARELINK_OPENAPI_ACCESS_DENIED`("접근 권한이 없습니다") 오류가 났었다 — subTagId는 `POST /openapi/sub-tags/create`로 사전 등록한 값만 허용되므로 자동 전송 로직을 제거(선택 필드라 생략 가능). 실제 상품으로 쉐어링크 발급까지 end-to-end 성공 확인(2026-09-10). | ✅ 구현 완료 + 실계정 전체 플로우(브라우징 3종+쉐어링크 발급) 검증 완료(2026-09-10) |
| 2 | 실사용자 쿠팡 API 키 실연동 검증 | ✅ 완료(2026-09-11, 위 참고) |
| 2 | 실사용자 알리익스프레스 API 키 실연동 검증, Meta 앱에 새 리디렉션 URI 등록, Vercel Cron 활성화 | ⏳ 예정(의도적으로 미착수) |
| 2 | 토스쇼핑 쉐어링크 실계정 검증 — Access/Secret Key·Publisher ID 발급, Fixie 고정 IP 2개를 토스 어드민 허용 IP에 등록, 베스트/카테고리/오늘의특가 실호출로 응답 필드명 확인·필요시 클라이언트 파싱 로직 수정 | ⏳ 예정(의도적으로 미착수) |
| 2+ | 알리익스프레스 키워드 검색(`listPromotionProduct`), 상품 가격/재고 변동 알림, 다른 채널 동시 배포 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
