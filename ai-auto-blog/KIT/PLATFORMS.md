# AI 키 발급 안내 — 블로그 콘텐츠 자동화

> **처음이면 Google Gemini 키 하나만** 만드세요. Gemini 키 하나로 **글 쓰기와 이미지 만들기**를 모두 할 수 있습니다.
> 키는 내 사이트 좌측 **🔑 API키등록·플랫폼연동**에 붙여 넣고 저장합니다. 키는 내 Supabase DB에 내 계정으로만 저장되고, 내 글 생성에만 쓰입니다.
> **키를 다른 사람에게 보여 주거나 화면 캡처에 넣지 마세요.**

| 키 | 무엇에 쓰나 | 꼭 필요? | 발급 주소 | 키 모양 | 비용 |
|---|---|---|---|---|---|
| **Google Gemini** | 글 쓰기 + **이미지 만들기** | **필수(이미지)** | https://aistudio.google.com/app/apikey | `AIza…` | 무료 사용량 있음, 이미지는 결제 연결이 필요할 수 있음 |
| OpenAI (GPT) | 글 쓰기(선택) | 선택 | https://platform.openai.com/api-keys | `sk-proj-…` | 사용한 만큼(선불 충전) |
| Anthropic Claude | 글 쓰기(선택) | 선택 | https://console.anthropic.com/settings/keys | `sk-ant-api03-…` | 사용한 만큼(선불 충전) |
| Perplexity | 「게시글 주제 수집」의 실시간 트렌드 검색 | 선택 | https://www.perplexity.ai/settings/api | `pplx-…` | 사용한 만큼 |
| YouTube Data API v3 | 「게시글 주제 수집」의 유튜브 쇼츠 떡상 분석 | 선택 | https://console.cloud.google.com/apis/library/youtube.googleapis.com | `AIza…` | 무료(하루 할당량) |

---

## 1. Google Gemini (필수)

1. https://aistudio.google.com/app/apikey 에 구글 계정으로 로그인
2. **Create API key**(또는 「API 키 만들기」) → 프로젝트 선택(없으면 새로 만들기) → 키 복사
3. 내 사이트 좌측 **🔑 API키등록·플랫폼연동** → **Google (Gemini — 이미지 자동생성)** 칸에 붙여 넣고 저장
4. 이미지 만들기에서 「사용량·결제」 오류가 나면 Google AI Studio의 **Billing**에서 결제 수단을 연결하세요(무료 사용량에는 이미지 생성이 적거나 없을 수 있습니다).

## 2. OpenAI (선택 — 글 쓰기만)

1. https://platform.openai.com 로그인 → **Billing**에서 결제 수단 등록 후 소액(예: 5달러) 충전 — 충전하지 않으면 「크레딧 부족」 오류
2. https://platform.openai.com/api-keys → **Create new secret key** → 키를 **바로 복사**(창을 닫으면 다시 볼 수 없음) → 저장

## 3. Anthropic Claude (선택 — 글 쓰기만)

1. https://console.anthropic.com 로그인 → **Billing**에서 결제 수단·충전
2. **Workspaces**에서 워크스페이스(기본 Default)를 고른 뒤 **API Keys → Create Key** → `sk-ant-api03-…` 키 복사 → 저장

## 4. Perplexity (선택 — 실시간 주제 수집)

1. https://www.perplexity.ai/settings/api 로그인 → 결제 수단 등록 → **Generate** → `pplx-…` 키 복사 → 저장
2. 키가 없어도 「게시글 주제 수집」의 웹 주소(URL)·RSS 수집은 그대로 쓸 수 있습니다.

## 5. YouTube Data API v3 (선택 — 쇼츠 떡상 분석)

1. https://console.cloud.google.com 로그인 → 위쪽 프로젝트 선택(없으면 새로 만들기)
2. **API 및 서비스 → 라이브러리**에서 「YouTube Data API v3」 검색 → **사용 설정**
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키** → 키 복사 → **YouTube Data API v3** 칸에 저장
4. 검색 1번에 하루 무료 할당량(10,000)의 약 100을 씁니다.

---

## 모델 고르기와 비용 줄이기

- **✍️ AI 글쓰기** 화면의 「본문 생성 설정」에서 글을 쓸 AI(OpenAI·Claude·Gemini)와 모델을, 「이미지 생성 설정」에서 이미지 화질과 장수(1~5장)를 고릅니다. 키를 저장한 AI만 실제로 동작합니다.
- **Gemini 키 하나만 있으면** 「본문 생성 설정」의 플랫폼을 **Google Gemini**로 바꾸세요(처음 기본값은 OpenAI입니다).
- 연습할 때는 저렴한 모델(Gemini Flash 계열·GPT-4o mini)과 이미지 1~2장, 화질 1K로 시험하면 비용이 거의 들지 않습니다.
- 사용량·요금은 각 AI 사이트의 Usage(사용량) 화면에서 확인하고, 가능하면 월 사용 한도(Limits)를 걸어 두세요.
