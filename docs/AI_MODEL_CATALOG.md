# AI 모델 선택표 — OpenAI · Claude · Gemini (등급별 사용 가능 모델·성능/가격 평가)

> **마지막 확인: 2026-11-03** · 작성 Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini] · 주인님 지시(2026-11-03): 「실행가능한 모델들로 저가 가성비 / 중가 밸런스 / 최상급 성능 군으로 나누고 … 플랫폼별 사용가능 모델 리스트와 성능/가격 평가표를 인수인계 문서로 남기고, 지침으로 프로그램 개발·수정 시 모델 선택지로 참고」
> 근거(공식 문서만): Gemini `aistudio.google.com/docs/models`·`/deprecations`·`/pricing` · OpenAI `developers.openai.com/api/docs/models/all`·`/deprecations`·`/pricing` · Claude `platform.claude.com/docs/en/about-claude/model-deprecations` + `claude-api` 스킬 모델 표.
> 연동 규칙(회원 본인 키·미리보기 기본값 금지·옛 저장값 변환 등)은 [`AI_MODEL_INTEGRATION_STANDARD.md`](AI_MODEL_INTEGRATION_STANDARD.md)가 기준이다. 이 문서는 **어떤 모델을 고를지**의 기준이다. 이미지 모델의 호출 방식 기준은 그대로 `ai-image-studio`(루트 `CLAUDE.md` 이미지 레퍼런스 규칙).

## 0. 쓰는 법 (프로그램 개발·수정 때)
1. 모델 선택 칸에는 **플랫폼마다 아래 1절의 「추천」 3개(저가·중가·최상급)를 기본 선택지**로 넣는다. 기본값은 **중가 균형**, 대량·단순 반복 작업(분류·요약·태그·키워드)은 **저가**를 기본값으로 해도 된다.
2. 같은 등급 안의 「다른 선택지」는 필요할 때만 추가한다. **5절 「넣지 않는 모델」은 넣지 않는다.**
3. 화면 표시는 등급 이름 + 모델 이름으로 통일한다. 예: `가성비 · Gemini 3.5 Flash-Lite`, `균형(추천) · Claude Sonnet 5.5`, `최고 품질 · GPT-6 Astra`. 무료 등급이 없는 모델은 「결제 연결 키 필요」를 붙인다.
4. 이 표는 날짜가 지나면 틀린다. **새로 모델 칸을 만들 때 마지막 확인 날짜가 30일 넘었으면 공식 문서를 다시 확인하고 이 문서를 고친 뒤** 작업한다(바꾼 줄과 날짜를 맨 아래 변경 이력에).
5. 최상위 규칙 그대로: 회원 기능은 회원 본인 키, 관리자 화면·개발 시험은 Claude 크레딧 우선(루트 `CLAUDE.md`).

## 1. 글·추론 모델 — 등급별 추천 (가격: 100만 토큰당 입력 / 출력, 미국 달러, 표준 등급)

| 등급 | Gemini | OpenAI | Claude |
|---|---|---|---|
| **저가 가성비** (추천) | `gemini-3.5-flash-lite` $0.30 / $2.50 · 무료 등급 있음 | `gpt-6-luna` $0.10 / $0.50 | `claude-haiku-5-5` $0.10 / $0.50 (입력 10만 토큰 넘으면 $0.50 / $2.50) |
| **중가 균형** (추천·기본값) | `gemini-3.8-flash` $0.75 / $3.75 · 무료 등급 있음 (2027-01-01 인상 예정) | `gpt-6.1-terra` $1 / $5 | `claude-sonnet-5-5` $2 / $10 |
| **최상급 성능** (추천) | `gemini-4-argon` $2 / $10 → **2026-12-01부터 $4 / $20** · 무료 등급 없음 | `gpt-6-astra` $10 / $50 | `claude-opus-5-5` $4 / $20 |

### 1-1. 등급 안의 다른 선택지 (사이사이 모델)
| 등급 | 플랫폼 | 모델 | 가격 (입력 / 출력) | 평가 |
|---|---|---|---|---|
| 저가 | Gemini | `gemini-3.1-flash-lite` | $0.25 / $1.50 | 가장 쌈. **2027-05-07 종료 예정** → 새 작업엔 비추천 |
| 저가 | Gemini | `gemini-2.5-flash-lite` | $0.10 / $0.40 | 종료일 없음, 구형. 기존 코드만 유지 |
| 저가 | OpenAI | `gpt-5.6-luna` | $0.20 / $1.20 | 이전 세대 저가 |
| 저가~중가 | OpenAI | `gpt-5.4-mini` | $0.75 / $4.50 | 이전 세대 mini |
| 중가 | Gemini | `gemini-3.6-flash` | $0.75 / $3.75 (2027-01-01 $1.50 / $7.50) | 이전 세대, 3.8-flash와 같은 값 → 3.8 권장 |
| 중가 상단 | OpenAI | `gpt-6.1-sol` · `gpt-6-sol` | $2 / $10 | OpenAI 주력 상위급, Claude Sonnet 5.5와 같은 가격대 |
| 중가 상단 | OpenAI | `gpt-5.6-terra` · `gpt-5.4` | $2 / $12 · $2.50 / $15 | 이전 세대 |
| 중가 | Claude | `claude-sonnet-5` · `claude-sonnet-4-6` | $2 / $10 · $3 / $15 | 이전 세대 |
| 최상급 | Gemini | `gemini-3.1-pro-preview` | $2 / $12 | **미리보기** — 기본값 금지, 무료 등급 없음 |
| 최상급 | OpenAI | `gpt-5.6-sol` · `gpt-5.5` | $4 / $20 · $5 / $30 | 이전 세대 상위 |
| 최상급 | OpenAI | `gpt-5.5-pro` · `gpt-5.4-pro` | $30 / $180 | 아주 비쌈 — 회원 선택지에 넣지 않는 것을 권장 |
| 최상급 | Claude | `claude-opus-5` · `claude-opus-4-8` · `4-7` · `4-6` | $5 / $25 | 이전 세대 Opus |
| 최상급 이상 | Claude | `claude-fable-5-1` | $10 / $50 | Anthropic 최상위. 생각 단계 항상 켜짐·응답이 김 — 특별한 경우만 |

### 1-2. 성능·가격 평가 (★ 5개 만점)
> 성능 별점은 **공급사가 밝힌 등급 위치(주력·이전 세대·경량)와 세대 순서로 매긴 상대 평가**다. 벤치마크 수치가 아니며, 품질이 중요한 기능은 시험 계정 본인 키로 실제 결과를 비교해 정한다.

| 모델 | 성능 | 가격 부담(★ 많을수록 쌈) | 속도 | 이럴 때 |
|---|---|---|---|---|
| `gpt-6-luna` | ★★☆☆☆ | ★★★★★ | 빠름 | 대량 분류·태그·짧은 요약 |
| `claude-haiku-5-5` | ★★★☆☆ | ★★★★★ | 빠름 | 대량 작업 중 한국어 품질이 필요할 때 |
| `gemini-3.5-flash-lite` | ★★☆☆☆ | ★★★★☆ | 빠름 | 무료 등급으로 시작하는 회원, 2.5-flash 대체(같은 가격) |
| `gemini-3.8-flash` | ★★★★☆ | ★★★★☆ | 빠름 | **Gemini 기본값** — 블로그 본문·대본·분석 |
| `gpt-6.1-terra` | ★★★★☆ | ★★★★☆ | 빠름 | **OpenAI 기본값** |
| `claude-sonnet-5-5` | ★★★★☆ | ★★★☆☆ | 보통 | **Claude 기본값** — 긴 글·코드·에이전트 |
| `gpt-6.1-sol` | ★★★★☆ | ★★★☆☆ | 보통 | OpenAI에서 한 단계 더 높은 품질 |
| `gemini-4-argon` | ★★★★★ | ★★★☆☆ (12-01 인상 후 ★★☆☆☆) | 느림 | 어려운 분석·긴 문서 |
| `claude-opus-5-5` | ★★★★★ | ★★☆☆☆ | 느림 | 최고 품질 글·복잡한 판단 |
| `gpt-6-astra` | ★★★★★ | ★☆☆☆☆ | 느림 | 최고 품질 추론·코드 |
| `claude-fable-5-1` | ★★★★★+ | ★☆☆☆☆ | 아주 느림 | 특별한 경우만 |

## 2. 이미지 모델
| 등급 | Gemini (1장 가격, 1K 기준) | OpenAI | Claude |
|---|---|---|---|
| 저가 | `gemini-3.1-flash-lite-image` $0.034 (1K만) | `gpt-image-2.5-flare` (장당 가격은 공식 계산기 확인) | 이미지 생성 없음 |
| 중가(기본) | `gemini-nano-banana-2.1` $0.034 · 2K $0.050 · 4K $0.113 | `gpt-image-2.5-sunburst` | — |
| 최상급 | `gemini-3-pro-image` $0.134 · 4K $0.24 | `gpt-image-2` | — |
| 다른 선택지 | `gemini-3.1-flash-image` $0.067 (종료 예고, 비추천) | — | — |
Gemini 이미지 모델은 모두 **무료 등급 없음**(회원 결제 연결 키 필요).

## 3. 음성(TTS)·받아쓰기·임베딩
| 용도 | Gemini | OpenAI | Claude |
|---|---|---|---|
| 음성 저가 | `gemini-3.8-flash-lite-tts` ($0.50 / 음성 출력 $6) | `gpt-realtime-2.1-mini` (음성 출력 $20, **실시간 API 방식**) | 없음 |
| 음성 고품질 | `gemini-3.8-flash-tts` ($0.50 / 음성 출력 $9) | `gpt-realtime-2.1` (음성 출력 $64) | 없음 |
| 받아쓰기 | `gemini-3.5-transcribe` (분당 약 $0.003) | `gpt-transcribe` (분당 $0.0045) · `gpt-live-transcribe` | 없음 |
| 임베딩 | `gemini-embedding-2` ($0.20 글) | `text-embedding-3-small` $0.02 · `-large` $0.13 | 없음 |
**OpenAI에는 지금 일반 음성 합성(TTS) 전용 모델이 없다** — `tts-1`·`tts-1-hd`·`gpt-4o-mini-tts`는 2027-01-06 종료, 공식 대체는 실시간 API(`gpt-realtime-2.1-mini`)라 호출 방식이 다르다.

## 4. 종료 일정 — 저장소에 아직 남은 모델 (2026-11-03 다시 집계)
집계 방법: `git ls-files`의 `*.ts·*.tsx·*.js·*.mjs`(node_modules·시험·백업·`labs/`·`docs/`·`public/`·`scripts/` 제외)에서 **따옴표로 감싼 모델 이름**만 찾고, 옛 값 변환표·종료 주석 줄은 뺀 「실제 호출·선택지」 기준. 처음 집계(같은 날 오전)는 검색이 느슨해 `dall-e-3`·`gpt-4-turbo` 등을 잘못 셌다.

| 모델 | 종료(공식) | 대체 | 실제 사용 프로그램 |
|---|---|---|---|
| `gemini-2.5-flash-preview-tts` | **2026-11-17** | `gemini-3.8-flash-tts` | **0** — 3곳 교체 `9045a5005`, 2026-11-03 배포·실제 생성 시험 통과(`d9448b5bb`) |
| `gpt-image-1`·`-1-mini`·`-1.5`·`chatgpt-image-latest` | 10-23 이미 종료 / 12-01 | `gpt-image-2.5-flare`·`-sunburst` | **0** — 7곳 교체 `87b12267e`, 이미지 스튜디오·플레이리스트·쓰레드 3개 11-03 배포(블로그 2개는 다음 배포), flare 생성·편집 시험 통과(남은 것은 옛 값 변환표·이미지 스튜디오 갤러리의 옛 기록 이름표) |
| `dall-e-3` | 2026-05-12 이미 종료 | 위와 같음 | 0 (이미지 스튜디오 `types.ts` 주석만) |
| `o3-mini`·`o1`·`gpt-4-turbo` | 2026-10-23 이미 종료 | `gpt-5.6-sol` | **0** — 타로 교체 `22fbd1b03`, 11-03 배포(v1.28)·gpt-5.6-luna 시험 통과 |
| `claude-sonnet-4-5` | 2026-11-30 | `claude-sonnet-5-5` | 0 |
| `gemini-2.5-flash`·`-pro` | 2026-12-01 자동 연결(3.5-flash-lite·3.8-flash) | 1절 | **0** — `blog-neighbor-care` 2026-11-04 v1.15 배포로 교체, v1.16에서 선택지 3개(3.8 Flash 기본·3.5 Flash Lite·4 Argon). 나머지 35개는 코드 교체 완료·**배포 대기**(`PLAN_20261103_MODEL_MIGRATION_DEC.md` 7절, 남은 이름은 옛 값 변환표·`ai-prompt-studio` 호환 검사뿐). 블로그 묶음은 `DEPLOY_REQUEST_20261103_BLOG.md` |
| `gpt-5` | 2026-12-11 | `gpt-5.6-sol` → 새로는 `gpt-6.1-sol` | **0** — 3곳 교체 완료(ai-auto-blog `142cb45ec`·tistory `7eb961fbd`·SEO `6103af9a8`), **배포 대기**(`DEPLOY_REQUEST_20261103_BLOG.md`, 12-05 점검) |
| `gpt-5-mini` | 2026-12-11 | `gpt-5.6-terra`·`gpt-6-luna` | 0 |
| `o3` | 2026-12-11 | `gpt-5.6-sol` | **0** — real_estate_sales v1.42 배포됨, threads-affiliate-poster `0caadc5ee` 배포 대기(12-05 점검) |
| `tts-1`·`gpt-4o-mini-tts` | 2027-01-06 | `gpt-realtime-2.1-mini`(음성 합성 전용 모델 없음) | 3·4: ai-video-studio, music-video-studio(사본), shorts-onestop-studio, (+`gpt-4o-mini-tts`만 shots) |
| `gpt-4o` | 2027-01-14 | `gpt-6-luna`·`gpt-6.1-terra` | 18 |
| `gpt-4o-mini` | 2027-01-14 | `gpt-6-luna` | 32 (타로 기본값 포함) |
| `gpt-4.1` | 2027-01-14 | `gpt-6.1-terra` | 21 |
| `gpt-4.1-mini` | 2027-01-14 | `gpt-6-luna` | 2: blog-content-maker, music |
| `whisper-1` | 2027-02-26 | `gpt-transcribe` | 3: ai-video-studio, insta_auto_poster, shorts-onestop-studio |
| `claude-haiku-4-5` | 2026-10-15 이후 언제든 가능 | `claude-haiku-5-5` | 17 |
| `claude-3-*` | 이미 종료 | `claude-haiku-5-5`·`sonnet-5-5` | (이번 집계 제외 — 필요 시 같은 방법으로) |
(프로그램 목록이 긴 줄은 다시 세는 법: `git ls-files -- '*.ts' '*.tsx' | xargs grep -lE "[\"'\`]<모델>[\"'\`]"`)

## 5. 넣지 않는 모델 (새 선택지·기본값 금지)
- 종료됐거나 종료 일정이 잡힌 모델: 4절 전부, `gpt-4o*`·`gpt-4.1*`·`gpt-5`·`gpt-5-mini`·`gpt-5-nano`·`o3*`·`o4-mini`·`gpt-image-1*`·`dall-e-*`·`tts-1*`·`whisper-1`·`claude-3-*`·`claude-sonnet-4-5`·`gemini-2.5-flash`·`gemini-2.5-pro`.
- 자동으로 다른 모델로 연결되는 이전 모델: `gemini-3.5-flash`(→3.6-flash), `gemini-3.7-flash`(→3.8-flash).
- 미리보기(`*-preview`)는 기본값 금지(선택지에 넣으면 이름에 「미리보기」).
- 아주 비싼 pro 계열(`gpt-5.5-pro`·`gpt-5.4-pro` $30/$180)은 회원 선택지에 넣지 않는다.

## 6. 변경 이력
- 2026-11-03: 처음 작성(세 회사 공식 문서 확인, 저장소 사용 현황 집계).
- 2026-11-03 오후: 4절 다시 집계(따옴표 이름·변환표 제외) — 음성·이미지·o3-mini/o1 교체 반영, 남은 사용처 목록화.
- 2026-11-03 저녁: 12월 묶음(2.5·`gpt-5`·`o3`) 코드 교체 완료 반영 — 다시 집계 결과 실제 사용은 `blog-neighbor-care`의 2.5만 남음, 나머지는 배포 대기.
