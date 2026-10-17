# 플랫폼별 가입 · API 키 발급 상세 (INSTA 포스팅 자동화)

> 2026-10-18 기준 화면 이름입니다. 메뉴 이름이 조금 달라도 같은 뜻의 메뉴를 찾으면 됩니다.
> **필수**: 1(Meta 앱 + 인스타 프로페셔널 계정) + 2(Gemini, 이미지) + 3(OpenAI 또는 4 Claude, 캡션)

| 번호 | 플랫폼 | 필수 | 쓰는 곳 |
|---|---|---|---|
| 1 | Meta 개발자 · Instagram 앱 | ✅ | 인스타 계정 연결·게시 |
| 2 | Google Gemini | ✅ | 피드·카드뉴스 이미지 생성 |
| 3 | OpenAI | ✅(3·4 중 1개) | 캡션·해시태그 생성 |
| 4 | Anthropic Claude | 선택 | 캡션 생성 엔진 |
| 5 | Perplexity | 선택 | 실시간 주제 수집 |

---

## 0. 인스타그램을 프로페셔널 계정으로 전환 (필수)
인스타 앱 → 프로필 → ☰ → **설정 및 활동 → 계정 유형 및 도구 → 프로페셔널 계정으로 전환** → 카테고리 선택 → **비즈니스** 또는 **크리에이터**.
개인 계정은 Meta 정책상 API 자동 게시가 불가합니다.

## 1. Meta 개발자 · Instagram 앱 — Instagram 로그인 방식 (권장)

1. https://developers.facebook.com → **시작하기**(처음이면 본인 Facebook으로 개발자 등록·휴대폰 인증)
2. **내 앱 → 앱 만들기**
   - 앱 이름: 예 `홍길동 인스타 자동화` · 이메일: 본인
   - **이용 사례: "Instagram에서 메시지 및 콘텐츠 관리"**(Manage messaging & content on Instagram) → 비즈니스 포트폴리오 "지금은 연결 안 함" → **앱 만들기**
3. **이용 사례 → 맞춤 설정 → Instagram 로그인이 포함된 API 설정**
   - 권한: `instagram_business_basic`, **`instagram_business_content_publish`** 가 포함돼 있는지 확인(없으면 추가)
   - **4. Instagram 비즈니스 로그인 설정** → **OAuth 리디렉션 URI**: `https://내주소/api/instagram/callback/byok` → **저장**
   - 같은 화면 위쪽 **Instagram 앱 ID**, **Instagram 앱 시크릿 코드**(보기) 복사
     ⚠ 앱 설정 맨 위 "앱 ID"(Meta 앱 ID)와 **다릅니다**.
4. **앱 역할 → 역할 → 사람 추가 → Instagram 테스터** → 내 인스타 사용자 이름
5. 인스타 앱(또는 instagram.com) → **설정 → 앱 및 웹사이트 → 테스터 초대** → **수락**
6. **앱 설정 → 기본 설정 → 앱 도메인**: `hong-insta.vercel.app`(내 사이트 도메인) → 저장
7. 내 사이트 **API키등록·플랫폼연동** → Instagram 앱 ID/시크릿 저장 → 초록색 **Instagram 로그인 방식으로 연결하기**

> 개발 모드에서도 **테스터 본인 계정**은 게시됩니다. 다른 사람 계정까지 쓰려면 Meta 앱 검수(라이브 전환)가 필요합니다.

### (다른 방법) Facebook 페이지 방식
인스타가 **Facebook 페이지에 연결**돼 있을 때 쓰는 방식입니다.
- 이용 사례: **"비즈니스용 Facebook 로그인"** 추가 → 설정 → **유효한 OAuth 리디렉션 URI**: `https://내주소/api/instagram/callback`
- **앱 설정 → 기본 설정**의 **앱 ID / 앱 시크릿 코드**를 내 사이트의 **Facebook 앱 ID / Facebook 앱 시크릿 코드** 칸에 저장 → 파란색 **Facebook 페이지로 연결하기**
- 처음이면 Instagram 로그인 방식이 더 간단합니다.

## 2. Google Gemini (필수 — 이미지)
1. https://aistudio.google.com → **Get API key → Create API key** → `AIza...` 복사
2. 이미지 생성(나노바나나)은 무료 한도가 없어 **결제 연결** 필요: AI Studio **Billing**(Google Cloud 결제 계정)
3. 내 사이트에 **Google (Gemini)** 키 저장 · 사용량: https://aistudio.google.com/usage

## 3. OpenAI (캡션)
https://platform.openai.com → **Billing** 충전(최소 $5) → **API keys → Create new secret key** → `sk-...` 저장

## 4. Anthropic Claude (선택)
https://console.anthropic.com → 충전 → **API Keys → Create Key** → 저장

## 5. Perplexity (선택)
https://www.perplexity.ai/settings/api → 결제 등록 → **Generate API Key** → `pplx-...` 저장

---

## Supabase · Vercel 계정 메모

| 항목 | 어디서 | 어디에 넣나 |
|---|---|---|
| Supabase Project URL | Supabase → Connect 또는 Project Settings → Data API | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable(anon) key | Project Settings → API Keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret(service_role) key | Project Settings → API Keys | `SUPABASE_SERVICE_ROLE_KEY` (비공개) |
| 사이트 주소 | Vercel → 프로젝트 → Settings → Domains | `NEXT_PUBLIC_SITE_URL` |
| 예약 실행 비밀값 | 설치 스크립트 자동 생성 | `CRON_SECRET` (cron-job.org 헤더에도) |
| 내 이름/브랜드 | 직접 정함 | `NEXT_PUBLIC_BRAND_NAME` |
