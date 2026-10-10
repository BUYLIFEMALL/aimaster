# 유튜브 떡상 쇼츠 발굴 자동화 v1.05 상세 인수인계 문서

> **작성일자**: 2026-10-10  
> **프로그램명**: 유튜브 떡상 쇼츠 발굴 자동화  
> **Slug**: `youtube-viral-studio`  
> **현재 버전**: `v1.05` (`src/lib/version.ts`, `package.json` 및 DB `programs.version`)  
> **공식 라이브 주소**: [https://youtube-viral-studio.buylife.xyz](https://youtube-viral-studio.buylife.xyz)  
> **Vercel 주소**: [https://youtube-viral-studio.vercel.app](https://youtube-viral-studio.vercel.app)  
> **공유 DB**: Supabase Project `esgxyikcnnvmlhygjkth`  

---

## 1. 개요 및 배경
- 쇼츠/롱폼 크리에이터가 **"소형 채널에서 터진 순수 알고리즘 떡상 콘텐츠"**를 실시간으로 발굴하고 벤치마킹할 수 있는 독립 웹 스튜디오입니다.
- AIMaster의 4단계 로드맵([`docs/YOUTUBE_AUTOMATION_ROADMAP.md`](YOUTUBE_AUTOMATION_ROADMAP.md)) 중:
  - **Phase 1(벤치마킹 & 떡상 발굴 엔진)** 완료.
  - **Phase 2(떡상 쇼츠 훅킹 대본 AI 분석 & 벤치마킹 인사이트)** 완료 (v1.02).
  - **Phase 3 준비(도메인 SSO 연동 및 로그인/세션 아키텍처 보강)** 완료 (v1.03).

---

## 2. ★ 최상위 절대 불변 규칙 (BYOK)
- **모든 사용자는 본인의 계정과, 본인이 사용할 본인 YouTube Data API v3 키 및 AI 키(Gemini/OpenAI)를 각각 직접 등록·연동해서 사용합니다.**
- 운영자(주인님)의 API 키나 타인의 키로 폴백하지 않으며, 키가 등록되지 않은 회원이 조회를 시도하면 HTTP 400 (`needApiKey: true`)과 함께 `/settings` 메뉴로 안내합니다.
- API 키는 공유 Supabase DB의 `user_api_keys` 테이블에 `provider = 'youtube_api_key'`, `'gemini_api_key'`, `'openai_api_key'`로 회원별 격리 저장됩니다.

---

## 3. 도메인 SSO 및 로그인 연동 (v1.03)
- **커스텀 도메인**: `https://youtube-viral-studio.buylife.xyz`
  - Vercel 커스텀 도메인 등록 완료 (`vercel domains add youtube-viral-studio.buylife.xyz youtube-viral-studio --scope buylife`)
  - Cloudflare 와일드카드 `*.buylife.xyz` A 레코드(76.76.21.21)에 의해 자동 SSL 및 라우팅 보장.
- **자체 로그인 화면 (`/login`)**:
  - 서브프로그램 내부에서 직접 로그인할 수 있는 화이트 베이스 폼 구현.
  - 로그인 성공 시 Server Action (`signInAction`)을 거쳐 본래 요청한 경로(`/viral-shorts` 등)로 딥링크 복귀.
- **메인 사이트 연동**:
  - 메인 사이트 `LoginForm.tsx`가 `redirectTo` 절대 URL 이동을 지원하도록 배포 완료.
- **쿠키 도메인**:
  - `cookieDomainForHost` 유틸리티를 적용하여 `.buylife.xyz` 도메인으로 세션 쿠키 공유.

---

## 4. 가격 플랜 표준 준수
- 프로그램 신규 등록 시 플랫폼 표준 기본 요금제(3단계)를 엄격히 준수:
  - **1개월**: 10,000원 (정가 10,000원)
  - **2개월**: 20,000원 (정가 20,000원)
  - **3개월**: 30,000원 (정가 30,000원)
- DB `pricing_plans` 테이블 동기화 완료.

---

## 5. 인프라 및 DB 배포 현황

### Vercel 배포
- **프로젝트**: `buylife/youtube-viral-studio`
- **배포 ID**: `dpl_3UvzX9GYYiMxsrtbKZPFCxoNa2DA` (상태: **READY**)
- **커스텀 도메인**: `youtube-viral-studio.buylife.xyz`

### 공유 Supabase DB 등록 및 메인 사이트 연동 완료
- `programs` 테이블:
  - `slug`: `'youtube-viral-studio'`
  - `name`: `'유튜브 떡상 쇼츠 발굴 자동화'`
  - `version`: `'v1.05'`
  - `category_id`: `'cb3c7c75-da5e-4474-a185-f069a6dcbda9'` (카테고리: `영상/유튜브`, `slug: 'youtube'`)
  - `badges`: `['free', 'new']`
  - `thumbnail_url`: `'https://www.buylife.xyz/thumbnails/youtube-viral-studio.png'`
  - `app_url`: `'https://youtube-viral-studio.buylife.xyz'`

---

## 6. 직접 검수 및 테스트 증거

1. **미인증 보호 및 리다이렉트**:
   - `curl -I https://youtube-viral-studio.buylife.xyz/viral-shorts`
   - 결과: `HTTP/1.1 307 Temporary Redirect` ➔ `Location: /login?redirect=%2Fviral-shorts` (정상 통과)
2. **자체 로그인 화면 접근**:
   - `curl -I https://youtube-viral-studio.buylife.xyz/login`
   - 결과: `HTTP/1.1 200 OK` (정상 렌더링)
3. **메인 사이트 배포**:
   - `dpl_4pA8xPbCyujsb9eMKfW3roytXTp8` READY, `https://www.buylife.xyz` 반영 확인
