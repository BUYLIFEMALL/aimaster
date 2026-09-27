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

## 📦 Phase 진행 상태 (2026-09-27 기준)

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Threads OAuth 연결(BYOK 회원별 앱 등록 방식), AI 캡션 생성(`generateAffiliatePostContent`), 이미지 생성(NanoBanana 2K/4K/Pro), 즉시/예약 게시 | ✅ 구현 완료 |
| 1 | 쿠팡파트너스 클라이언트(키워드 검색 + 제휴 링크) | ✅ 구현 완료 + 실계정 실호출 검증 완료 |
| 1 | 알리익스프레스 클라이언트(URL → 제휴 링크 변환 `getPromotionLinks` + 공식 썸네일 수집 `getProductDetails`) | ✅ 구현 완료 + 실계정 실호출 및 DB 백필 검증 완료 (2026-09-27) |
| 1 | 토스쇼핑 쉐어링크 연동 (Fixie 프록시 고정 IP 연동, 베스트/카테고리/오늘의특가 브라우징 + 쉐어링크 발급) | ✅ 구현 완료 + 실계정 전체 검증 완료 |
| 1 | 네이버 브랜드커넥트 (수동 제휴 쉐어링크 수집 등록 연동) | ✅ 구현 완료 |
| 1 | 🎭 10종 AI 페르소나 멀티 보이스 시스템 (`PRESET_PERSONAS`) 및 커스텀 어조 연동 | ✅ 구현 완료 (2026-09-27) |
| 1 | 🔥 바이럴 떡상 탐지기 (/trends) & 3대 AI 엔진(OpenAI 4.1 / Gemini 3.7 / Claude) 선택 & 즉시 포스팅 | ✅ 구현 완료 (2026-09-27) |
| 1 | 게시글 작성(`/posts/new`) 10종 페르소나 선택 연동 & 알리 썸네일 403 블로킹 해제 | ✅ 구현 완료 (2026-09-27) |
| 1 | 🚀 대시보드 5단계 프로세스 비주얼 사용 가이드 카드 적용 및 사이드바 메뉴명 업데이트 | ✅ 구현 완료 (2026-09-27) |

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

3. **제휴 고지 문구 자동 포함 의무화**:
   - `src/lib/ai/affiliateGenerator.ts`에서 `generateAffiliatePostContent()` 호출 시 각 플랫폼(쿠팡, 알리, 토스, 네이버)에 맞는 제휴 수수료 고지 문구가 500자 이내에 무조건 자동 트리밍되어 삽입됩니다. 우회하거나 지우면 안 됩니다.


