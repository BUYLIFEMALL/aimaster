# AI 키 발급 안내 — Threads AI 기획 자동화

> 세 가지 중 **하나만 있어도** 됩니다. 키는 내 사이트 좌측 **🔑 API키 등록·관리**에 붙여 넣고 저장합니다.
> 키는 내 Supabase DB에 내 계정으로만 저장되고, 내 글 생성에만 쓰입니다. **키를 다른 사람에게 보여 주거나 화면 캡처에 넣지 마세요.**

| AI | 추천 대상 | 발급 주소 | 키 모양 | 비용 |
|---|---|---|---|---|
| **OpenAI (GPT)** | 가장 안정적 — 처음이면 이것 | https://platform.openai.com/api-keys | `sk-proj-…` 또는 `sk-…` | 사용한 만큼(선불 충전) |
| **Google Gemini** | 무료로 시작하고 싶을 때 | https://aistudio.google.com/app/apikey | `AIza…` | 무료 사용량 있음(넘으면 유료) |
| **Anthropic Claude** | 문장이 자연스러운 글 | https://console.anthropic.com/settings/keys | `sk-ant-api03-…` | 사용한 만큼(선불 충전) |

---

## 1. OpenAI

1. https://platform.openai.com 에 로그인(없으면 가입)
2. 오른쪽 위 설정 → **Billing** → 결제 수단 등록 후 **Add to credit balance**로 소액(예: 5달러) 충전 — 충전하지 않으면 키가 있어도 「크레딧 부족」 오류가 납니다
3. https://platform.openai.com/api-keys → **Create new secret key** → 이름(예: threads-planner) → **Create**
4. 나타난 키를 **바로 복사**(창을 닫으면 다시 볼 수 없음) → 내 사이트에 붙여 넣고 저장

## 2. Google Gemini

1. https://aistudio.google.com/app/apikey 에 구글 계정으로 로그인
2. **Create API key**(또는 「API 키 만들기」) → 프로젝트 선택(없으면 새로 만들기) → 키 복사
3. 내 사이트에 붙여 넣고 저장 — 무료 사용량 안에서는 결제 없이 동작합니다(분당 호출 수 제한이 있어 연달아 누르면 잠시 기다려야 할 수 있음)

## 3. Anthropic Claude

1. https://console.anthropic.com 에 로그인 → **Billing**에서 결제 수단·충전
2. **Workspaces**에서 사용할 워크스페이스(기본 Default)를 고른 뒤 **API Keys → Create Key**
3. `sk-ant-api03-…`로 시작하는 키를 복사해 저장 — 워크스페이스 없이 만든 `sk-ant-usr-…` 키는 동작하지 않습니다

---

## 모델 고르기와 비용 줄이기

- 글 생성 화면의 **AI 추론 엔진 및 모델 설정**에서 모델을 고릅니다. 키를 등록한 AI의 모델만 실제로 동작합니다.
- 연습·시험은 저렴한 모델(GPT-4o-mini, Gemini 3.5 Flash Lite, Claude Haiku 4.5)로, 실제 게시할 글은 기본 추천 모델로 쓰면 비용을 아낄 수 있습니다.
- 목록에 있지만 내 키 계정에서 아직 열리지 않은 모델은 오류가 날 수 있습니다 — 그때는 기본 추천 모델로 바꾸세요.
- 사용량·요금은 각 AI 사이트의 Usage(사용량) 화면에서 확인하고, 가능하면 월 사용 한도(Limits)를 걸어 두세요.
