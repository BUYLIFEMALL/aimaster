# 플랫폼별 가입 · API 키 발급 상세 (Threads 포스팅 자동화)

> 2026-11-16 기준 화면 이름입니다. 각 회사 화면은 수시로 바뀌니, 메뉴 이름이 조금 달라도 같은 뜻의 메뉴를 찾으면 됩니다.
> **필수**: 1(Meta Threads 앱) + 2 또는 3(글 생성 AI 키 1개) — 나머지는 쓰는 기능만.
> 모든 키는 **내 사이트의 「API키등록·플랫폼연동」 화면에만** 넣습니다. 채팅·문서·다른 사람에게 보내지 마세요.

| 번호 | 플랫폼 | 필수 | 쓰는 곳 |
|---|---|---|---|
| 1 | Meta 개발자 · Threads 앱 | ✅ | Threads 계정 연결·게시 |
| 2 | OpenAI | 글 생성 엔진 중 1개 | 글 생성 |
| 3 | Google Gemini | 글 생성 엔진 중 1개 · 이미지 | 글 생성, 나노바나나 이미지 |
| 4 | Perplexity | 선택 | 실시간 주제 수집 |
| 5 | Pixabay · Pexels | 선택(무료) | 글 첨부 무료 사진 검색 |
| 6 | cron-job.org | 예약 게시를 쓸 때 ✅(무료) | 예약 시각에 자동 게시 |

---

## 1. Meta 개발자 · Threads 앱 (필수)

1. https://developers.facebook.com → 오른쪽 위 **시작하기**(처음이면 개발자 등록: 본인 Facebook 계정으로 로그인 → 휴대폰 인증)
2. **내 앱 → 앱 만들기**
   - 앱 이름: 예 `홍길동 Threads 자동화` · 연락처 이메일: 본인
   - **이용 사례: "Threads API에 액세스"** 선택 → 비즈니스 포트폴리오는 "지금은 연결 안 함" → **앱 만들기**
3. 왼쪽 **이용 사례 → Threads API에 액세스 → 맞춤 설정**
   - **권한**: `threads_basic`(기본), **`threads_content_publish` 추가**
   - **설정** 탭 (내 사이트 「API키등록·플랫폼연동」 화면 맨 위 「내 Meta 앱에 등록할 주소 한눈에 보기」에서 복사 버튼으로 그대로 가져올 수 있습니다)
     - **리디렉션 콜백 URL**: `https://내주소/api/threads/callback`
     - **제거 콜백 URL**: `https://내주소/api/threads/uninstall`
     - **삭제 콜백 URL**: `https://내주소/api/threads/delete`
     - **저장**
4. **앱 설정 → 기본 설정 → 앱 도메인**에 `내주소`(https:// 없이, 예 `my-threads.vercel.app`) 추가 → **변경 내용 저장**
5. **앱 역할 → 역할 → 사람 추가 → Threads 테스터** → 내 Threads 사용자 이름 입력
6. 휴대폰 Threads 앱(또는 https://www.threads.com) → **설정 → 계정 → 웹사이트 권한 → 초대** → 내 앱 **수락**
7. **이용 사례 → Threads API에 액세스 → 설정** 화면 맨 위 **"Threads 앱 ID" / "Threads 앱 시크릿 코드"** 복사
   - ⚠ 앱 대시보드 맨 위의 "앱 ID"(Facebook 앱 ID)와 **다릅니다**. 반드시 Threads 앱 ID.
8. 내 사이트 **API키등록·플랫폼연동**에 두 값 저장 → **Threads 계정 연결하기**

> 앱은 "개발 모드" 그대로 써도 **테스터로 등록한 본인 계정**은 게시됩니다. 다른 사람 계정까지 쓰려면 Meta 앱 검수(라이브 전환)가 필요합니다.

---

## 2. OpenAI (글 생성 엔진 중 1개)

1. https://platform.openai.com 가입·로그인
2. **Settings → Billing** → 결제 카드 등록 후 크레딧 충전(최소 $5)
3. **API keys → Create new secret key** → 키 복사(다시 볼 수 없으니 바로 저장)
4. 내 사이트 API키등록·플랫폼연동 → **OpenAI API 키** 저장

## 3. Google Gemini (글 생성 엔진 중 1개 · 이미지)

1. https://aistudio.google.com → 로그인 → **Get API key → Create API key** → 복사
2. 이미지 생성(나노바나나)은 무료 한도가 없어 **결제 연결**이 필요합니다: AI Studio **Billing**(Google Cloud 결제 계정 연결)
3. 내 사이트에 **Gemini API 키** 저장
4. 사용량·요금 확인: https://aistudio.google.com/usage

## 4. Perplexity (선택 — 실시간 주제 수집)
https://www.perplexity.ai/settings/api → 결제 등록 → **Generate API Key** → 내 사이트에 저장

## 5. Pixabay · Pexels (선택 — 무료 사진)
- Pixabay: https://pixabay.com/api/docs/ → 로그인하면 페이지 안에 **내 API 키**가 보입니다 → 복사
- Pexels: https://www.pexels.com/api/ → **Your API Key** → 복사
- 내 사이트에 저장한 뒤 「연결 확인」 버튼으로 동작을 확인합니다.

## 6. cron-job.org (예약 게시를 쓸 때 — 무료)
1. https://console.cron-job.org/signup 가입 → 이메일 인증 → 로그인
2. **Settings → API → Create API key** → 키 복사 (**IP 제한은 켜지 마세요**)
3. 내 사이트 **API키등록·플랫폼연동 → ⏰ 예약 발행** 칸에 저장 → 「내 cron-job.org」 선택
4. 그다음은 프로그램이 알아서 합니다: 글을 예약하면 내 cron-job.org에 1분마다 확인하는 작업을 켜고, 남은 예약이 없으면 끕니다.

---

## Supabase · Vercel 계정 메모

| 항목 | 어디서 | 어디에 넣나 |
|---|---|---|
| Supabase Project URL | Supabase → Connect 또는 Project Settings → Data API | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable(anon) key | Project Settings → API Keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret(service_role) key | Project Settings → API Keys | `SUPABASE_SERVICE_ROLE_KEY` (비공개) |
| 사이트 주소 | Vercel → 프로젝트 → Settings → Domains | `NEXT_PUBLIC_SITE_URL` |
| 정리·예약 실행 비밀값 | 패키지 설치마법사 자동 생성 | `CRON_SECRET` (cron-job.org에는 넣지 않음) |
| 내 이름/브랜드 | 직접 정함 | `NEXT_PUBLIC_BRAND_NAME` |
