# AI 상세페이지 이미지 자동생성기 (shop-detail-page)

상품 이미지와 정보를 입력하면 AI가 분석 후, 헤더/핵심특징/스펙/사용법/타겟/비포애프터/라이프스타일/
인증/FAQ/리뷰/배송/CTA 등 커머스 상세페이지에 필요한 섹션별 이미지 15장을 자동 생성하고, 한 장의
긴 상세페이지 이미지로 병합해주는 프로그램.

## 파이프라인 (Phase 1 — 현재 구현 범위)

1. `/products/new`: 상품 이미지 업로드(Supabase Storage 직접 업로드) + 선택 텍스트 입력
2. "AI로 상품 분석하기" → Gemini vision이 이미지(+텍스트)를 분석해 상품명/카테고리/핵심특징/
   상세스펙/사용법/타겟고객/디자인톤(메인컬러·서브컬러·배경스타일·분위기키워드·폰트스타일)을
   자동으로 채움 → 사용자가 검토/수정 후 저장
3. `/products/[id]`: "전체 이미지 생성" → 15개 섹션 프롬프트 템플릿을 순회하며 상품변수를
   치환한 프롬프트 + 원본이미지를 Gemini `gemini-3-pro-image-preview`(나노바나나 프로)에
   image-to-image로 요청 → 섹션별 이미지 생성
4. "병합 이미지 다운로드" → 생성된 섹션 이미지를 순서대로 세로 병합한 PNG 1장을 다운로드

## 설계 배경 — n8n 자동화 파이프라인 이식 (2026-08-13)

사용자가 n8n + Airtable로 이미 운영 중이던 "상세페이지 자동화" 파이프라인(`D:\PDS\#0~#6 상세페이지
자동화*.json`, 7개 워크플로우)을 분석해서 AIMaster 서브프로젝트로 이식했다. 원래 구조는 Airtable
베이스 하나(`(n8n)상세페이지 자동화`)를 관리자 1인이 수동으로 채워 넣고, n8n 웹훅으로 트리거하는
"1인 운영 자동화"였다. 이를 로그인한 모든 AIMaster 회원이 각자 자기 계정으로 쓸 수 있는 멀티테넌트
SaaS로 다시 설계했다.

### n8n 파이프라인 전체 구조 (참고용, Phase 1은 #0/#1/#6만 구현)

| # | n8n 워크플로우 | 하는 일 | 이 프로젝트 대응 |
|---|---------------|---------|-----------------|
| 0 | 상품분석 | 이미지+텍스트 → Gemini few-shot 분석 → 상품 필드 채움 | `lib/actions/products.ts` `analyzeProductAction` |
| 1 | 이미지생성(레퍼런스) | 활성 템플릿마다 상품변수 치환 프롬프트 + 원본이미지로 나노바나나 프로 image-to-image 15장 생성 | `lib/actions/images.ts` `generateSectionImageAction` |
| 2 | 커스텀 이미지생성 | 섹션 1개를 "템플릿 재선택" 또는 "직접 프롬프트"로 재생성 | Phase 2 (미구현) |
| 3 | 다국어생성 | #1과 동일 + 13개 언어 프리셋 + 번역단계 + 로고보호 지시문 | Phase 3 (미구현) |
| 4 | 자유생성 | 기존 생성이미지 여러 장을 레퍼런스로 자유 프롬프트 합성 | Phase 4 (미구현) |
| 5 | 로고+파일명 | AI 아님 — 픽셀 합성으로 로고 삽입 + 파일명 규칙 | Phase 4 (미구현) |
| 6 | 이미지병합 | GraphicsMagick CLI로 세로 병합 | `app/api/products/[id]/export/route.ts` (Vercel엔 gm 바이너리가 없어 `sharp`로 대체) |

### 주요 설계 결정

- **DB**: Airtable "상품마스터"/"프롬프트템플릿"/"생성이미지"를 각각 `shop_products`/
  `shop_prompt_templates`/`shop_product_images`(+ 병합 결과용 `shop_page_exports`)로 재설계했다.
  `shop_product_images`는 shots(`shorts_video_segments`)와 동일한 "활성 이미지(`image_url`) +
  생성 이력 배열(`image_urls`)" 패턴을 써서, 나중에 Phase 2(개별 재생성)를 붙이기 쉽게 만들었다.
- **프롬프트 템플릿 원문**: n8n 워크플로우 JSON에는 Airtable 필드를 동적으로 조회하는 부분만 있고
  실제 15개 섹션 프롬프트 원문은 없었다(Airtable 데이터라 워크플로우 파일 밖에 존재). Phase 1에서는
  합리적인 초안 프롬프트를 새로 작성해 `supabase/migrations/0003_seed_prompt_templates.sql`로
  시드했다 — `shop_prompt_templates.user_id`가 null이면 시스템 기본 템플릿(전체 공개, 읽기전용
  기본값)이고, 사용자가 앱 안에서 자유롭게 수정하거나 자기만의 템플릿을 추가할 수 있는 구조로
  잡아뒀다(어차피 n8n에서도 Airtable에서 수동으로 다듬던 부분).
- **이미지 저장소**: Google Drive/Cloudinary 2단계 업로드(n8n 방식) 대신 Supabase Storage
  (`shop-detail-images` 버킷, public)로 통일했다 — 다른 서브프로젝트와 동일하고 사용자가 별도
  계정을 만들 필요가 없다. 원본 상품이미지는 브라우저에서 Storage로 직접 업로드한다
  (`lib/uploadImageClient.ts`) — Vercel 서버리스 함수 요청 본문 크기 제한을 피하기 위한 패턴
  (insta_auto_poster/threads에서 이미 검증됨).
- **이미지 병합**: n8n은 GraphicsMagick(`gm convert -resize -append`) CLI를 셸에서 직접 호출했는데,
  Vercel 서버리스 환경엔 이 바이너리가 없어서 Node.js `sharp` 라이브러리(리사이즈 + 세로 합성)로
  대체했다 (`app/api/products/[id]/export/route.ts`).
- **Phase 분할**: 파이프라인이 7단계로 크기 때문에, 사용자 요청에 따라 한 번에 다 만들지 않고
  Phase 1(상품분석+템플릿 이미지생성+병합)부터 실제로 동작 확인 후 Phase 2~4를 순서대로 붙여
  나가기로 했다. DB 스키마는 미리 확장 가능하게(예: `shop_product_images`가 이력 배열을 가짐,
  `shop_prompt_templates`가 사용자별 커스텀 템플릿을 지원) 잡아뒀지만, Phase 2~4 전용 테이블
  (예: 자유합성 기록용 테이블)은 해당 Phase 착수 시점에 추가한다.
- **shop-detail-page ↔ auto-detail-page 관계**: 완전히 별개의 독립 프로젝트다(2026-08-13 사용자
  확정). n8n 파이프라인 출력 필드(상품명/핵심특징/타겟고객/메인컬러 등)가 auto-detail-page의 입력
  폼 필드와 비슷해 보이지만, auto-detail-page는 Claude로 상세페이지 *HTML*을 생성하는 도구이고
  이 프로젝트는 Gemini(나노바나나)로 상세페이지 섹션 *이미지*를 생성하는 도구라 목적이 다르다.
  멀티테넌시 스캐폴딩(`lib/access.ts`, `lib/apiKeys.ts`, Supabase 클라이언트, 로그인/설정 페이지)만
  auto-detail-page의 검증된 코드를 그대로 포팅해서 재사용했다.

## 환경 변수

```
# Supabase (AIMaster 전체가 공유하는 프로젝트)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AIMaster(회원가입/구독/결제 통합 플랫폼) URL
NEXT_PUBLIC_MAIN_SITE_URL=https://buylife.xyz
```

`GEMINI_API_KEY` 같은 서버 공용 키는 등록하지 않는다 — 모든 사용자는 로그인 후 `/settings`에서
본인의 Gemini API 키를 등록해야 상품분석/이미지생성 기능을 쓸 수 있다(관리자 키 폴백 없음 정책).

## DB 마이그레이션

- `supabase/migrations/0001_multitenancy.sql`: `shop_products`/`shop_prompt_templates`/
  `shop_product_images`/`shop_page_exports` 테이블 + RLS
- `supabase/migrations/0002_storage.sql`: `shop-detail-images` Storage 버킷 + RLS
- `supabase/migrations/0003_seed_prompt_templates.sql`: 15개 섹션 시스템 기본 프롬프트 템플릿 시드

모두 Supabase MCP(`apply_migration`)로 실제 프로젝트(esgxyikcnnvmlhygjkth)에 적용 완료했다.
`programs` 테이블에도 `slug: shop-detail-page`로 등록했다(`required_grade_id`는 null 상태라
가격 정책 확정 전까지는 로그인한 회원이면 등급과 무관하게 이용 가능 — auto-detail-page와 동일한
"남은 과제" 상태).

**`programs.is_active`는 지금 `false`로 유지 중이다.** 이 값을 `true`로 켜면 로컬 개발 서버의
`requireProgramAccess()` 통과뿐 아니라, **운영 사이트(`buylife.xyz/programs/shop-detail-page`)에도
즉시 공개 노출**된다 — 로컬과 운영이 같은 Supabase `programs` 테이블을 공유하기 때문에 "개발 중에만
보이게" 하는 별도 플래그가 없다(2026-08-13, 썸네일/가격플랜도 없는 상태로 잠깐 노출됐다가 되돌린
사례 있음). 따라서 다음 조건이 갖춰지기 전에는 켜지 말 것:
- `thumbnail_url` 등록 (지금 null이라 히어로 영역이 빈 placeholder로 보임)
- `pricing_plans`에 최소 1개 이상 활성 플랜 등록 (없으면 "요금 플랜" 섹션 자체가 안 보이고
  "지금 구독하기" 버튼도 동작하지 않음)
- Vercel 배포 완료 + `programs.app_url` 갱신
로컬에서 실제 로그인 플로우를 테스트해야 할 때는 이 값을 잠깐 `true`로 켰다가 테스트 후 반드시
`false`로 되돌릴 것.

## 배포 정보

아직 Vercel 배포 전이다(로컬 개발 단계). 배포 시 `programs.app_url`을 실제 배포 URL로 갱신해야 한다.

## 남은 과제

- Phase 2(섹션별 커스텀 재생성 — 템플릿 재선택 또는 직접 프롬프트+비율+추가지시사항), Phase 3
  (다국어생성), Phase 4(자유합성+로고합성) 미구현 — AGENTS.md의 Phase 진행 상태 표 참고.
- 가격 정책(`pricing_plans`)이 아직 정해지지 않았다.
- 15개 섹션 프롬프트 템플릿은 초안이라 실제 생성 품질을 보며 다듬어야 한다. 사용자가 상품
  상세페이지에서 직접 수정 가능하지만, 아직 "내 템플릿으로 저장" UI는 없다(전부 시스템 기본
  템플릿을 그대로 씀 — Phase 2에서 커스텀 재생성 UI와 함께 추가 예정).
- Vercel 배포 전이라 로컬 `next dev` 환경에서의 동작만 검증했다.
