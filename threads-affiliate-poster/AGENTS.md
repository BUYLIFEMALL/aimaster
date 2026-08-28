# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **Threads 쇼핑제휴 자동화(threads-affiliate-poster)** 프로젝트에서 AI Agent(Claude
Code 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

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
6. 유료 API 호출(AI 캡션/이미지 생성, 쿠팡/알리익스프레스 API 호출 등)
7. **제휴 고지 문구(`src/lib/ai/affiliateGenerator.ts`의 `DISCLOSURE_TEXT`) 삭제/우회** —
   쿠팡파트너스/알리익스프레스는 표시광고법 + 자체 운영정책상 "이 포스팅은 제휴 활동의 일환으로
   수수료를 제공받을 수 있다"는 고지가 법적으로 필수다. 어떤 경로(즉시 게시/예약 게시)로 가든
   `generateAffiliatePostContent()`를 거쳐 이 문구가 항상 포함되도록 되어 있으니, 이 로직을
   지우거나 조건부로 만들지 말 것.
8. **실제 게시(`publishPost`)** — 사람이 대시보드에서 캡션을 직접 확인·수정한 뒤 "게시" 버튼을
   눌러야만 실행된다(DM/댓글 자동응답류와 달리 이 프로젝트는 외부 이벤트에 반응하는 게 아니라
   사람이 대시보드에서 상품을 고르고 캡션을 만들어 직접 게시하는 흐름이라, 애초에 "자동 승인"
   개념 자체가 없다 — 게시는 언제나 사람의 명시적 클릭이 트리거다).
9. Vercel Cron(`vercel.json`) 활성화/배포 — 예약 게시 dispatch가 매 순간 자동 실행되므로 배포
   전 확인한다.

---

## 🎯 프로젝트 목적

상품(쿠팡파트너스/알리익스프레스/네이버 브랜드커넥트) 정보를 등록하면, 제휴 링크를 자동으로
붙인 쓰레드 홍보 게시글을 AI가 만들어주고, 사람이 확인 후 즉시/예약 게시하는 프로그램.

**핵심 설계**: 새로 만들지 않고 기존 두 서브프로젝트를 최대한 재사용했다.
- Threads 연동(OAuth/게시/예약 발행/AI 캡션 생성 뼈대)은 `threads/`(쓰레드 자동 포스팅,
  `programs.slug = "auto-threads-posting"`)의 코드를 그대로 복제·이식했다.
- 상품 정보를 "URL만 넣기(간단)" 대신 "직접 입력하기(풍부)"로 등록할 때는, 이미 존재하는
  `auto-detail-page`(상세페이지 자동화, "15P")의 `detail_pages` 테이블을 같은 공용 Supabase
  프로젝트 안에서 읽기 전용으로 참고할 수 있다(그 프로젝트를 수정하지 않음).

설계 배경 상세는 [README.md](README.md) 참고.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `threads-affiliate-poster/`
* Next.js 16(App Router, `src/` 디렉토리 구조 — `threads/`와 동일).

---

## 🔗 AIMaster 플랫폼 공통 원칙

threads-affiliate-poster는 AIMaster 저장소 안의 서브프로젝트다. 루트 `../CLAUDE.md`를 메인
지침으로 함께 따른다. 핵심 요약:

- `programs.slug = "threads-affiliate-poster"` 이용 권한(구독/개별부여/등급)이 있는 모든
  AIMaster 회원이 각자 계정으로 쓸 수 있는 멀티테넌시 SaaS다.
- 페이지는 `requireProgramAccess()`, API route는 `checkProgramAccessApi()`로 권한을 확인한다
  (`src/lib/access.ts`).
- 사용자 소유 데이터(`tap_accounts`, `tap_posts`, `affiliate_products`)는 `user_id` + RLS
  owner-only로 격리한다.
- **API 키는 본인 키만 사용, 관리자 키 폴백 없음** — `threads/`의 `apiKeys.ts`는 이 정책이
  생기기 전(2026-08-12 이전)에 만들어져 앱 공용 키 폴백이 남아있지만, 이 프로젝트는 처음부터
  최신 정책대로 폴백 없이 구현했다(`src/lib/apiKeys.ts`). `threads/`의 apiKeys.ts를 참고
  코드로 삼지 말 것.

### 테이블명이 `threads/`와 겹치지 않도록 접두어를 붙였다
같은 공용 Supabase 프로젝트를 쓰다 보니 `threads/`가 이미 `threads_accounts`/`posts`라는
테이블명을 쓰고 있어서, 이 프로젝트는 **`tap_accounts`/`tap_posts`**(threads-affiliate-poster
접두어)로 분리했다. 새 테이블을 추가할 때도 이름이 겹치지 않는지 먼저 확인할 것 — 이 저장소는
여러 서브프로젝트가 하나의 Supabase 프로젝트를 공유하므로, 프로젝트 로컬 마이그레이션 파일만
보고 테이블명이 안 겹칠 거라고 가정하면 안 된다. `information_schema.tables`로 실제 라이브
스키마와 대조하고 결정할 것.

### Threads OAuth — 새 Meta 앱을 만들지 않고 `threads/`의 공용 앱을 재사용한다
`THREADS_APP_ID`/`THREADS_APP_SECRET` 값은 `threads/.env.local`에 있는 것과 동일한 값을 그대로
쓴다(새 권한이 필요 없어서 앱을 새로 만들 이유가 없음). 대신 그 Meta 앱의 "유효한 리디렉션
URI" 목록에 `https://threads-affiliate-poster.vercel.app/api/threads/callback`을 **추가로**
등록해야 한다(기존 threads/ 콜백 URI는 그대로 둔 채 추가만 하는 것 — instagram-comment-reply/
instagram-dm-reply가 같은 Meta 앱에 리디렉션 URI를 여러 개 등록했던 것과 동일한 패턴).

### 제휴 API 클라이언트(쿠팡/알리익스프레스) — 실제 계정 연동 전 재검증 필요
- `src/lib/coupang/client.ts`, `src/lib/aliexpress/client.ts`는 커뮤니티 SDK/공식 문서를
  근거로 구현했고, 엔드포인트/서명 방식(쿠팡: CEA HmacSHA256, 알리익스프레스: TOP API MD5)을
  1차 소스로 재확인까지 마쳤다(2026-08-27). 다만 **실제 Access/Secret Key로 첫 호출을 해본
  적은 없으니**, 사용자가 실제 키를 등록하고 처음 연동을 시도할 때 오류가 나면 이 두 파일의
  엔드포인트/파라미터를 공식 문서와 다시 대조할 것.
- 쿠팡 상품검색 API는 시간당 호출 제한(약 10회, 커뮤니티 정보)이 있다고 알려져 있어, 검색
  결과를 `affiliate_products`에 저장해 재검색을 줄이는 방향으로 설계했다.

## 📦 Phase 진행 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | Threads OAuth 연결(공용 앱 재사용), AI 캡션 생성(`generatePostContent`/`generateAffiliatePostContent`), 이미지 생성(NanoBanana), 즉시/예약 게시, 예약 발행 dispatch(admin/user 이중화 + CRON_SECRET 보호 라우트) | ✅ 구현 완료 |
| 1 | 쿠팡파트너스 클라이언트(키워드 검색 + 딥링크 생성), 알리익스프레스 클라이언트(URL → 제휴 링크 변환) | ✅ 구현 완료(실계정 미검증) |
| 1 | 네이버 브랜드커넥트 — 공식 API 없음, 직접 발급받은 링크를 수동으로 등록하는 방식으로 구현 | ✅ 구현 완료(구조적으로 계속 수동) |
| 1 | 상품 등록 2가지 입력 방식(URL 간단 입력 / 상품정보+상세페이지 직접 입력) — `affiliate_products.input_mode`, `auto-detail-page`의 `detail_pages` 읽기 전용 참조 | ✅ 구현 완료 |
| 1 | "분석으로 등록" 6단계 흐름(`EnrichmentFields`) — 1.대표이미지 2.상세페이지 이미지(선택,최대10) 3.상품 원본 정보 4.분석 결과 확인/수정 5.게시글용 대표 이미지(업로드 선택 또는 NanoBanana AI 생성) 6.최종 확인. `shop-detail-page`(별도 서브프로젝트, `/products/new`)의 AI 분석 UX를 참고해서 설계했다 — `auto-detail-page`와는 다른 프로젝트이니 혼동 주의. | ✅ 구현 완료(2026-08-28) |
| 1 | 제휴 고지 문구 자동 삽입(쿠팡/알리익스프레스), 500자 제한 안에 고지 문구가 항상 포함되도록 본문 자동 트리밍 | ✅ 구현 완료 |
| 1 | `programs` 카탈로그 등록 + 썸네일(Gemini 생성) | ✅ 구현 완료(2026-08-27) |
| 1 | Vercel 배포(`buylife` 팀, 공용 Threads 앱 env 재사용) | ✅ 구현 완료(2026-08-27) |
| 2 | 실사용자가 쿠팡/알리익스프레스 API 키 발급 후 실제 연동 검증, Meta 앱에 새 리디렉션 URI 등록, Vercel Cron 활성화 | ⏳ 예정(의도적으로 미착수) |
| 2+ | 알리익스프레스 키워드 검색(`listPromotionProduct`), 상품 가격/재고 변동 알림, 다른 채널 동시 배포 | ⏳ 예정 |

한 번에 다 만들지 않고 Phase별로 하나씩 붙여나가기로 했다. 새 Phase를 시작할 때는 이 표를
갱신할 것.
