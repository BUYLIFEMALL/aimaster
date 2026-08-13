# AI 상세페이지 자동생성기 (auto-detail-page)

제품 이미지와 정보를 입력하면 Claude가 쿠팡/스마트스토어/프리미엄 스타일의 완성된 HTML
상세페이지를 생성해주는 프로그램. 필요하면 나노바나나(Gemini)/Replicate(FLUX)/GPT Image 1로
제품 이미지를 추가 생성할 수 있고, 완성된 페이지는 HTML 또는 긴 이미지(PNG)로 내려받을 수 있다.

## 파이프라인

1. 템플릿 선택 (쿠팡 / 스마트스토어 / 프리미엄)
2. 제품 정보 입력 (이미지, 설명, 셀링포인트, 스펙, 신뢰 데이터, 구매 보장 정보 등)
   — 이미지는 직접 업로드하거나 AI(나노바나나/Replicate/GPT Image 1)로 생성
3. "상세페이지 생성하기" → Claude(claude-sonnet-4-5)가 완성된 HTML 반환
4. 생성 결과는 `detail_pages` 테이블에 저장되고 `/preview/[id]`로 이동
5. 미리보기 화면에서 HTML 다운로드 또는 Puppeteer로 렌더링한 긴 이미지(PNG) 다운로드

## 설계 배경 — 2026-08-13 AIMaster 서브프로젝트 편입

원래 이 프로그램은 AIMaster 저장소 밖의 별도 위치(`D:\Antigravity\AIMaster\auto-detail-page`)에서,
별도 GitHub 저장소(`BUYLIFEMALL/ShopPage`)로 독립적으로 개발되고 있었다. 로그인/구독 권한 체크가
전혀 없이 누구나 URL만 알면 쓸 수 있었고, 상세페이지 생성(Claude 호출)은 **관리자 개인
`ANTHROPIC_API_KEY`를 서버 환경변수로 박아넣고 모든 방문자가 그 키로 비용을 발생시키는 구조**였다.
생성된 페이지도 서버 메모리(Map, 1시간 TTL)에만 있어 재배포하면 사라졌다.

AIMaster 루트 `CLAUDE.md`의 "Platform-hub 구조"와 "멀티테넌시 원칙"에 맞춰 이 저장소 안의
서브프로젝트로 편입하면서 아래를 함께 정리했다:

- **로그인 + 프로그램 이용 권한**: `lib/access.ts`의 `requireProgramAccess()`/
  `checkProgramAccessApi()`가 AIMaster의 `programs`(slug: `auto-detail-page`,
  이미 카탈로그에 등록돼 있었음)/`subscriptions`/`user_program_access` 테이블 기준으로 접근을
  통제한다. 로그인만으로는 부족하고, 이 프로그램에 대한 구독/개별부여/등급 권한까지 확인한다.
- **API 키는 반드시 본인 것만 사용, 관리자 키 폴백 없음**: 공용 `user_api_keys` 테이블을
  그대로 재사용한다. 상세페이지 생성(Claude)은 `anthropic`, 이미지 생성은 플랫폼별로
  나노바나나→`gemini`, GPT Image 1→`openai`(둘 다 다른 서브프로젝트와 동일 provider 재사용),
  Replicate→`replicate`(이 프로그램 때문에 새로 추가 — `supabase/migrations/0001_multitenancy.sql`
  에서 `user_api_keys_provider_check` 제약을 넓혔다). 키가 없으면 `/settings`로 안내하는
  팝업(`ApiKeyRequiredModal`, 상세페이지 생성 시)이나 에러 메시지(이미지 생성 시)로 막는다.
  기존에 있던 "이미지 생성 API 키를 브라우저 localStorage에 직접 입력" 방식은 제거했다 —
  Vercel 함수의 요청 본문 크기와 상관없는 안전한 서버 사이드 키 조회로 통일했다.
- **생성된 페이지의 영구 저장 + 사용자별 격리**: `public.detail_pages` 테이블(RLS
  owner-only)로 옮겼다. `lib/store.ts`가 이제 이 테이블을 읽고 쓴다. `/api/page/[id]`,
  `/api/export-image`는 요청자 본인 소유의 페이지만 조회할 수 있다.
- **폴더 위치**: `D:\Antigravity\AIMaster\auto-detail-page`(별도 클론, 별도 GitHub 저장소)에서
  이 저장소(`AIMaster/auto-detail-page`)로 옮겨왔다. **앞으로는 이 폴더가 유일한 소스**이고,
  `BUYLIFEMALL/ShopPage` 저장소는 더 이상 사용하지 않는다(삭제하지는 않았음 — 필요하면 과거
  이력 참고용으로만 남겨둔다).

## 환경 변수

```
# Supabase (AIMaster 전체가 공유하는 프로젝트)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AIMaster(회원가입/구독/결제 통합 플랫폼) URL
# 로그인 후 리다이렉트, 구독 권한 없을 때 이동할 프로그램 구매 페이지에 사용
NEXT_PUBLIC_MAIN_SITE_URL=https://buylife.xyz
```

주의: `ANTHROPIC_API_KEY`는 더 이상 서버 환경변수로 등록하지 않는다. 모든 사용자는 로그인 후
`/settings`에서 본인의 Anthropic/Gemini/OpenAI/Replicate 키를 등록해야 생성 기능을 쓸 수 있다.

## 배포 정보

- Vercel 프로젝트: `buylife/auto-detail-page` (2026-08-13에 `shop-page`에서 이름 변경함)
- 프로덕션 URL: `https://shop-page-seven.vercel.app`
- Puppeteer(`/api/export-image`)는 Vercel 환경에서 `@sparticuz/chromium-min` + `puppeteer-core`
  조합을 쓴다. 로컬 개발 시에는 `CHROME_PATH` 환경변수(또는 기본 Windows Chrome 경로)로 설치된
  Chrome을 그대로 사용한다.

### ⚠️ 프로덕션 URL이 `shop-page-seven`인 이유 (건드리지 말 것)

프로젝트 이름·폴더·GitHub 소스는 전부 `auto-detail-page`로 통일했지만, **실제 프로덕션
URL만 옛 이름(`shop-page-seven.vercel.app`)이 그대로 남아있다.** 의도적으로 안 바꾼 것이 아니라
Vercel 플랫폼 제약 때문에 **못 바꾼 것**이다:

- Vercel은 프로젝트마다 "Vercel Authentication(로그인 필요 인증벽)이 면제된 대표 도메인" 딱
  하나를 프로젝트 최초 생성 시점에 영구 고정한다. 이후 `vercel project rename`으로 이름을 바꾸거나
  `vercel alias set`으로 새 별칭(`auto-detail-page.vercel.app`,
  `auto-detail-page-buylife.vercel.app` 등)을 아무리 추가해도, 그 새 별칭들은 전부 인증벽에 막혀
  로그인한 팀 멤버만 접속 가능하고 일반 사용자는 못 들어간다(2026-08-13에 직접 재현 확인함 — 다른
  서브프로젝트의 `<이름>-buylife.vercel.app`류 별칭도 동일하게 막혀 있고, 오직
  `insta-auto-poster-red`/`shots-inky`/`real-estate-sales-delta`처럼 최초 배포 시 자동 할당된
  단어 하나짜리 별칭만 예외였다).
- 이 대표 도메인 별칭(`shop-page-seven`)을 지워봐도, 다음 `vercel --prod` 배포 시 **똑같은 이름으로
  자동 재생성**된다 — 새 프로젝트 이름을 반영한 다른 이름으로 바뀌지 않는다.
- 완전히 새 이름의 주소를 쓰려면 이 Vercel 프로젝트 자체를 삭제하고 새로 만드는 방법뿐인데,
  배포 이력·환경변수를 다시 세팅해야 하고 되돌리기 어려워 진행하지 않기로 했다(사용자 확인,
  2026-08-13). 기능·보안(로그인 게이트, RLS, API 키 정책)에는 URL 이름과 무관하게 전혀 영향 없다.

**따라서 이후 다른 CLI 작업이나 이 프로젝트를 다시 정리할 때, `shop-page-seven.vercel.app`
도메인/별칭을 "이름이 안 맞으니까" 지우거나 바꾸려고 시도하지 말 것** — 지워도 똑같이
`shop-page-seven`으로 재생성될 뿐이고, 그 사이 실제 서비스가 일시적으로 끊긴다. `programs.app_url`
도 이 주소를 가리키도록 이미 맞춰뒀다.

## 남은 과제

- 가격 정책(`pricing_plans`)이 아직 정해지지 않았다 — 현재 `programs.required_grade_id`가
  null이라 로그인한 AIMaster 회원이면 등급과 무관하게 이용 가능한 상태.
- `detail_pages`를 사용자가 직접 목록으로 보고 다시 열람/삭제할 수 있는 화면은 아직 없다
  (지금은 생성 직후 `/preview/[id]`로만 접근). 필요해지면 `insta_auto_poster`의 게시글 목록
  화면과 같은 패턴으로 추가하면 된다.
