# Groq·OpenRouter·NVIDIA·Cloudflare 공식 문서 확인

확인일: 2026-10-24 · Codex 연구 세션 · G-1 공급자 기획용. **공식 문서 읽기 조사만 수행했으며 API 호출·키 조회·로그인·유료 호출·코드/DB/설정 변경은 없습니다.** 아래 모델/한도는 공개 문서의 확인 시점 정보이며 회원 계정의 실제 허용 모델·잔여량을 시험한 결과는 아닙니다.

## 1. API 주소·인증

| 공급자 | OpenAI 호환 Base URL | Chat Completions 최종 주소 | 회원이 준비할 값·공식 근거 |
|---|---|---|---|
| Groq | `https://api.groq.com/openai/v1` | `https://api.groq.com/openai/v1/chat/completions` | 본인 Groq API 키, `Authorization: Bearer <키>`, JSON 요청. [OpenAI 호환](https://console.groq.com/docs/openai), [Chat API](https://console.groq.com/docs/api-reference#chat) |
| OpenRouter | `https://openrouter.ai/api/v1` | `https://openrouter.ai/api/v1/chat/completions` | 본인 API 키, Bearer. `HTTP-Referer`·`X-OpenRouter-Title`은 선택 사항이며 인증 키를 대신하지 않음. [Quickstart](https://openrouter.ai/docs/quickstart) |
| NVIDIA 호스팅 NIM | `https://integrate.api.nvidia.com/v1` | `https://integrate.api.nvidia.com/v1/chat/completions` | 본인 NVIDIA Developer API 키, Bearer. [모델 API 레퍼런스](https://docs.api.nvidia.com/nim/reference/meta-llama-3_1-8b-infer), [키 발급 안내](https://docs.api.nvidia.com/nim/docs/api-quickstart) |
| Cloudflare Workers AI | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1` | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions` | 본인 계정 ID와 API 토큰, Bearer. 토큰 권한은 Workers AI Read/Edit 안내 확인. [OpenAI 호환 주소](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/), [REST 시작 안내](https://developers.cloudflare.com/workers-ai/get-started/rest-api/) |

Cloudflare의 네이티브 `.../ai/run/<모델>` 주소와 위 OpenAI 호환 주소를 혼동하지 않습니다. SDK Base URL 뒤에 `/chat/completions`를 붙이는 방식으로 사용할 때 `/v1` 중복도 피해야 합니다.

## 2. 모델 ID와 무료·유료 조건

### Groq

- 공개 Production 모델에서 확인한 저가 후보는 **`openai/gpt-oss-20b`**, 상위 후보는 **`openai/gpt-oss-120b`**입니다. 공개 유료 단가는 각각 입력/출력 100만 토큰당 **$0.075/$0.30**, **$0.15/$0.60**입니다. 모델 호출 가능 여부는 회원 계정에서 재확인합니다. [모델 목록](https://console.groq.com/docs/models).
- 기존에 흔히 쓰던 `llama-3.1-8b-instant`와 `llama-3.3-70b-versatile`도 목록에는 있으나, **현재 모델 표는 Enterprise·Contact Sales로 표시**합니다. 예전 글의 “Llama 무료 한도”를 그대로 기본 안내로 옮기지 않습니다. [모델 목록](https://console.groq.com/docs/models).
- 종료 이력도 확인했습니다. 두 Llama ID는 **2026-08-16에 Free/Developer tier에서 종료**됐으며 약정 Enterprise 고객은 예외입니다. 공식 대체 권장은 `openai/gpt-oss-20b`·`openai/gpt-oss-120b`입니다. 대체 권장 사실을 모든 계정의 무제한 무료 제공으로 해석하지 않습니다. [종료/교체 이력](https://console.groq.com/docs/deprecations).
- Free tier의 존재와 Developer tier로의 유료 전환은 공식 FAQ로 확인했습니다. Developer 전환에는 결제 수단이 필요하고 사용량에 따라 청구되므로 무료 한도 초과 때 앱이 유료 계정으로 자동 변경하거나 유료 모델로 바꾸지 않습니다. [Billing FAQ](https://console.groq.com/docs/billing-faqs).
- **이번 공개 문서만으로 회원 Free tier의 모델별 확정 수치는 확인하지 못했습니다.** 현재 rate-limits 본문은 해당 표를 Developer plan의 기본 한도라고 명시하며, 조직별 실제 값은 계정 Limits 페이지를 보라고 합니다. 같은 모델의 모델 목록과 rate-limits 표 수치도 다르므로 고정 수치를 제품에 넣기보다 실제 계정/응답 헤더를 확인합니다. [Rate Limits](https://console.groq.com/docs/rate-limits).
- `groq.com/pricing`은 확인 시 홈페이지로 이동해 별도 무료 모델 적용표를 확보하지 못했습니다. Free tier 존재는 Billing FAQ, 현재 GPT-OSS ID·유료 단가는 모델 목록, Free/Developer 대체 권장은 종료 이력으로 각각 확인한 것이며 **GPT-OSS의 특정 회원 무료 할당/잔여량 자체는 미확인**입니다.
- 제한은 조직 단위이고 RPM/RPD/TPM/TPD 등 먼저 도달한 조건이 적용됩니다. 초과 시 429·`retry-after`, 잔여량/리셋 헤더를 사용할 수 있습니다. 일일 제한의 고정 리셋 시각을 이번 문서 조사로 확정하지 않았습니다. [Rate Limits](https://console.groq.com/docs/rate-limits).

### OpenRouter

- 특정 무료 모델 후보는 **`meta-llama/llama-3.3-70b-instruct:free`**입니다. 공식 모델 페이지가 해당 ID와 입력/출력 토큰 가격 0을 명시합니다. 무료 모델의 실제 가용성은 바뀔 수 있습니다. [모델 페이지](https://openrouter.ai/meta-llama/llama-3.3-70b-instruct:free).
- **`openrouter/free`는 고정 모델이 아닙니다.** 현재 이용 가능한 무료 모델들 중 요청 기능을 지원하는 모델을 골라 무작위로 라우팅합니다. 봇 동작 재현성과 품질 비교를 위해 고정 `:free` 모델과 별도 선택지로 구분하는 편이 좋습니다. [Free Models Router](https://openrouter.ai/openrouter/free).
- 무료 모델 한도는 **20회/분·50회/일**, 누적 **$10 이상 크레딧 구매 후 1,000회/일**로 공식 가격 안내에 명시되어 있습니다. $10 구매는 무료 이용의 필수 조건이 아니라 상향 조건입니다. [가격/한도](https://openrouter.ai/pricing).
- 추가 계정/키로 한도를 우회할 수 없으며 `GET /api/v1/key`에서 무료 모델의 일일 카운터·허용치와 신용/예산 상태를 확인할 수 있습니다. 일일 카운터의 정확한 초기화 시각은 이번 공개 문서 조사로 확정하지 못했습니다. [Limits](https://openrouter.ai/docs/api_reference/limits).
- 유료 모델은 모델별 토큰 요금이 적용되므로 “OpenRouter 연결=무료”로 표시하지 않습니다. 무료 선택은 정확한 무료 ID를 유지하고 유료 모델·라우터로의 자동 대체는 허용하지 않는 계획이 필요합니다. 무료 요청 실패도 일일 한도에 산입될 수 있어 반복 재시도를 제한합니다. [공식 저비용 안내](https://openrouter.ai/blog/tutorials/how-to-get-the-lowest-cost-llm-inference-on-openrouter/).

### NVIDIA(build.nvidia.com) 호스팅 NIM

- 확인한 텍스트 모델 후보는 **`meta/llama-3.1-8b-instruct`**이며, 목록에는 **`meta/llama-3.3-70b-instruct`**도 있습니다. 모델별 실제 이용 허용 여부는 회원 계정에서 확인합니다. [8B API 레퍼런스](https://docs.api.nvidia.com/nim/reference/meta-llama-3_1-8b-infer), [LLM API 목록](https://docs.api.nvidia.com/nim/reference/llm-apis).
- **무료 접근은 프로토타입·연구·개발·시험용**입니다. 공식 FAQ는 실제 최종 사용자를 서비스하는 비시험 동작을 production으로 구분하며 별도 NVIDIA AI Enterprise 라이선스가 필요하다고 설명합니다. 따라서 AIMaster 운영 회원에게 상시 무료 공급자로 기본 제공할 수 있다고 단정할 수 없습니다. [General FAQ](https://docs.api.nvidia.com/nim/docs/product).
- 공식 API Trial 약관도 production 또는 제공 크레딧 소진 후 이용에는 별도 서비스 구독을 요구합니다. NVIDIA를 G-1에 포함하더라도 **우선 연구/시제품 후보로 분리하고 운영 이용 조건을 확인한 뒤 운영 노출 여부를 결정**하는 방향을 권합니다. [API Trial 약관](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf).
- **공통 “1,000 무료 크레딧”·“40 RPM”·일일 무료 토큰 수는 이번 공식 문서로 확정하지 않았습니다.** NVIDIA 직원 작성 FAQ는 모델·동시 이용량에 따라 제한이 다르며 build.nvidia.com 계정에서 확인하라고 명시합니다. 무료 체험은 혼잡 시 지연될 수 있고 production 보장은 아닙니다. [NVIDIA 직원 FAQ](https://forums.developer.nvidia.com/t/nvidia-nim-faq/300317).

### Cloudflare Workers AI

- 확인한 무료 할당 내 시험 후보는 **`@cf/meta/llama-3.2-3b-instruct`**와 **`@cf/meta/llama-3.1-8b-instruct-fp8`**입니다. 공식 모델 페이지에 ID·텍스트 생성·스트리밍 파라미터가 있습니다. [3B 모델](https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/), [8B FP8 모델](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/).
- **무료 할당은 하루 10,000 Neurons**, **00:00 UTC(한국 09:00) 초기화**입니다. 토큰이나 호출 10,000회라는 뜻이 아니며 모델별 계산 비용에 따라 소모됩니다. Workers Free에서 초과하면 요청이 실패하고, Workers Paid는 무료분을 넘긴 사용량에 **$0.011/1,000 Neurons**가 부과됩니다. [가격](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- 일부 최신 모델은 유료 결제 수단/Workers Paid 또는 AI Gateway 선불 크레딧을 요구합니다. 모든 모델이 무료 할당만으로 이용 가능한 것은 아닙니다. 위 시험 후보와 유료 전용 모델을 목록에서 구분해야 합니다. [가격](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- 일반 텍스트 생성 기본 제한은 **300회/분**이며, 유료 전용 모델 등에는 별도 제한이 있습니다. 무료 Neurons 할당과 별개의 호출 속도 제한입니다. [Limits](https://developers.cloudflare.com/workers-ai/platform/limits/).

## 3. 스트리밍·공통 호출 모듈의 차이

| 공급자 | 공식 문서로 확인한 사항 | G-1 설계에서 고려할 부분 |
|---|---|---|
| Groq | Chat Completions의 `stream:true`, OpenAI 유사 completion delta. 일부 OpenAI 필드 미지원, `n`은 1만 허용, 온도 0은 작은 양수로 변환. [텍스트/스트리밍](https://console.groq.com/docs/text-chat), [호환 차이](https://console.groq.com/docs/openai) | 메시지/모델/온도/최대 출력/stream의 최소 계약부터. OpenAI 전용 필드 무조건 전달하지 않음. GPT-OSS의 Structured Outputs도 별도 확인: 해당 기능은 streaming/tool use와 동시 지원하지 않으므로 JSON 라우터는 비스트리밍 경로로 분리. [구조화 응답](https://console.groq.com/docs/structured-outputs) |
| OpenRouter | Chat API·스트리밍 지원. [Quickstart](https://openrouter.ai/docs/quickstart) | 고정 무료 모델/무료 라우터를 구분하고 실제 응답 모델 기록. 스트림 오류·중단 시 중복 재요청 주의 |
| NVIDIA | 8B API는 SSE `data:` delta와 `[DONE]`, 모델별 파라미터 범위 명시. [API](https://docs.api.nvidia.com/nim/reference/meta-llama-3_1-8b-infer) | 연구용 연결 후보. 해당 모델 온도 범위(0~1) 등은 모델별 사양 확인 |
| Cloudflare | 대부분 텍스트 모델의 Chat Completions 호환. GPT-OSS 전용 Responses API는 별도이며 `stream:false`만 지원. [호환 문서](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/) | G-1은 Chat Completions로 제한. Responses API 지원을 일반 Chat 스트리밍 지원과 혼동하지 않음 |

공통화할 수 있는 것은 HTTP 호출/취소/표준 메시지·결과/스트림 파싱 틀입니다. 제공 모델·온도·출력 제한·구조화 응답·추론 필드·요금/무료 한도는 공급자와 모델별로 분리해야 합니다. 이는 이번 공식 문서를 비교한 설계 판단이며 아직 구현/실호출로 검수한 결과가 아닙니다.

## 4. 개발 플랜에 반영할 결론

1. Groq·OpenRouter·Cloudflare를 우선 후보로 삼되 실제 회원 본인 키의 가용 모델/한도를 최소 시험으로 확인합니다. 무료 한도 0이나 429를 유료 대체 실행의 동의로 해석하지 않습니다.
2. NVIDIA 호스팅 NIM은 API 주소와 모델 형식은 확인했지만 **운영 서비스 이용 조건이 선결 사항**입니다. 네 공급자가 모두 같은 의미의 “상시 무료 운영 API”라는 전제를 수정해야 합니다.
3. 문서 챗봇의 임베딩·문서 읽기는 이번 조사 대상이 아닙니다. 답변 공급자와 임베딩을 동시에 교체하는 계획으로 확장하지 않습니다.
4. 실제 한국어 응답·RAG 인용·JSON 라우터 정확성·취소·SSE 오류·계정별 한도·NVIDIA 운영 이용 권한은 아직 검수하지 않았습니다. 원고/보고서에 확인한 주소·정책과 실동작 확인을 구분합니다.

비용 리포트: 공식 문서 조사만 수행. AI API 시험 0회·Vercel 빌드 0회·계정/DB 쓰기 0회, 비용 없음.
