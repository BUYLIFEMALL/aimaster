# 플랫폼별 가입 · API 키 발급 상세 (Threads 콘텐츠 운영 자동화)

> 2026-10-18 기준 화면 이름입니다. 각 회사 화면은 수시로 바뀌니, 메뉴 이름이 조금 달라도 같은 뜻의 메뉴를 찾으면 됩니다.
> **필수**: 1(Meta Threads 앱) + 2(OpenAI) — 나머지는 쓰는 기능만.

| 번호 | 플랫폼 | 필수 | 쓰는 곳 |
|---|---|---|---|
| 1 | Meta 개발자 · Threads 앱 | ✅ | Threads 계정 연결·게시 |
| 2 | OpenAI | ✅(글 생성 엔진 중 1개) | 글 생성, GPT Image |
| 3 | Google Gemini | 선택 | 나노바나나 이미지, 쇼츠 영상 분석, Gemini 글 엔진 |
| 4 | Anthropic Claude | 선택 | Claude 글 엔진 |
| 5 | Perplexity | 선택 | 떡상 콘텐츠 "화제 검색" |
| 6 | Replicate | 선택 | FLUX·Z-Image 이미지 |
| 7 | YouTube Data API | 선택 | 유튜브 글감·쇼츠 검색 |
| 8 | 쿠팡 파트너스 | 선택 | 쇼핑제휴 상품(공유 코드 방식은 키 없이도 가능) |
| 9 | 알리익스프레스 | 선택 | 쇼핑제휴 상품 |
| 10 | 네이버 브랜드커넥트 | 선택 | 쇼핑제휴 링크(키 없음, 링크 직접 등록) |
| 11 | 토스쇼핑 | 선택(고급) | 고정 IP 프록시 필요 — 기본 설치에서 제외 |

---

## 1. Meta 개발자 · Threads 앱 (필수)

1. https://developers.facebook.com → 오른쪽 위 **시작하기**(처음이면 개발자 등록: 본인 Facebook 계정으로 로그인 → 휴대폰 인증)
2. **내 앱 → 앱 만들기**
   - 앱 이름: 예 `홍길동 Threads 자동화` · 연락처 이메일: 본인
   - **이용 사례: "Threads API에 액세스"** 선택 → 비즈니스 포트폴리오는 "지금은 연결 안 함" → **앱 만들기**
3. 왼쪽 **이용 사례 → Threads API에 액세스 → 맞춤 설정**
   - **권한**: `threads_basic`(기본), **`threads_content_publish` 추가**
   - **설정** 탭
     - **리디렉션 콜백 URL**: `https://내주소/api/threads-content-ops/callback`
     - **제거 콜백 URL**, **삭제 콜백 URL**: `https://내주소` (필수 칸이라 내 사이트 주소를 넣습니다)
     - **저장**
4. **앱 역할 → 역할 → 사람 추가 → Threads 테스터** → 내 Threads 사용자 이름 입력
5. 휴대폰 Threads 앱(또는 https://www.threads.net) → **설정 → 계정 → 웹사이트 권한 → 초대** → 내 앱 **수락**
6. **앱 설정 → 기본 설정** → 화면 **맨 아래 "Threads 앱 ID" / "Threads 앱 시크릿 코드"**(보기 누르면 비밀번호 확인) 복사
   - ⚠ 화면 맨 위의 "앱 ID"는 Meta 앱 ID라 **다릅니다**. 반드시 아래쪽 Threads 앱 ID.
7. 내 사이트 **API키등록·플랫폼연동**에 저장 → **Threads 계정 연결하기**

> 앱은 "개발 모드" 그대로 써도 **테스터로 등록한 본인 계정**은 게시됩니다. 다른 사람 계정까지 쓰려면 Meta 앱 검수(라이브 전환)가 필요합니다.

---

## 2. OpenAI (필수 — 글 생성)

1. https://platform.openai.com 가입·로그인
2. **Settings → Billing** → 결제 카드 등록 후 크레딧 충전(최소 $5)
3. **API keys → Create new secret key** → `sk-...` 복사(다시 볼 수 없으니 바로 저장)
4. 내 사이트 API키등록·플랫폼연동 → **OpenAI API 키** 저장

## 3. Google Gemini (선택 — 나노바나나 이미지 등)

1. https://aistudio.google.com → 로그인 → **Get API key → Create API key** → `AIza...` 복사
2. 이미지 생성(나노바나나)은 무료 한도가 없어 **결제 연결**이 필요합니다: AI Studio **Billing**(Google Cloud 결제 계정 연결)
3. 내 사이트에 **Gemini API 키** 저장
4. 사용량·요금 확인: https://aistudio.google.com/usage

## 4. Anthropic Claude (선택)
https://console.anthropic.com → Billing에서 충전 → **API Keys → Create Key** → `sk-ant-api03-...` 저장

## 5. Perplexity (선택)
https://www.perplexity.ai/settings/api → 결제 등록 → **Generate API Key** → `pplx-...` 저장

## 6. Replicate (선택 — FLUX·Z-Image 이미지)
https://replicate.com → 로그인 → **Account → API tokens** → `r8_...` 저장(사용량 결제)

## 7. YouTube Data API (선택)
1. https://console.cloud.google.com → 새 프로젝트
2. **API 및 서비스 → 라이브러리 → YouTube Data API v3 → 사용**
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키** → 복사(무료, 하루 할당량 있음)

## 8. 쿠팡 파트너스 (선택)
- https://partners.coupang.com 가입·승인
- **키 없이**: 상품 페이지의 **링크 생성 → 공유 코드(HTML)**를 복사해 내 사이트 **쇼핑제휴 상품 등록**에 붙여넣기
- **검색 등록까지**: 파트너스 **추가 기능 → 오픈 API**에서 Access Key·Secret Key 발급(최종 승인 후, 실적 조건 있음) → 내 사이트에 저장

## 9. 알리익스프레스 (선택)
https://portals.aliexpress.com 가입 → **API 신청(Affiliate API)** → App Key·App Secret, Tracking ID 확인 → 내 사이트에 저장

## 10. 네이버 브랜드커넥트 (선택)
https://brandconnect.naver.com 가입 → 상품의 **쇼핑 링크 복사** → 내 사이트 **쇼핑제휴 상품 등록**에 링크 직접 등록(키 없음)

## 11. 토스쇼핑 (선택·고급)
토스 쇼핑 API는 **등록된 고정 IP에서만** 호출됩니다. Vercel은 IP가 바뀌므로 Fixie(https://usefixie.com, 유료) 같은 고정 IP 프록시를 만들고
Vercel 환경변수 `FIXIE_URL`에 넣은 뒤 토스에 그 IP를 등록해야 합니다. 기본 설치에서는 생략하세요.

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
