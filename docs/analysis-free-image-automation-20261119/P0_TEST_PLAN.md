# AI 무료 이미지 자동화 — P0 실기 비교 시험 계획

2026-11-19 · IMG-20261119-P0 · [역할: ecommerce-image] CC-ECOM-01(`claude-win-sdp`) · 검수 CX-QA-01 · 장비 실행 조율 Master

**상태** 준비 문서. 내려받기·실행·생성 0건. [개발 플랜](PLAN.md) · [인수인계](HANDOFF.md) · [모델 조사](MODEL_RESEARCH.md)

## 1. 기준 엔진과 고정 값

근거는 [로컬 이미지 실행기](../../free-music-studio/engine/src/imageArt.mjs)(읽기만, 수정 0)다.

| 항목 | 값 |
|---|---|
| 추론 엔진 | `stable-diffusion.cpp` 릴리스 `master-956-1b0ba10` (`IMAGE_ENGINE_RELEASE`) |
| Z-Image Turbo | 8단계, cfg 1, VAE `Comfy-Org/z_image_turbo` `ae.safetensors` |
| FLUX.2 klein 4B | 4단계, cfg 1, VAE `Comfy-Org/flux2-klein-4B` `flux2-vae.safetensors` |
| 글 이해 모델(공용) | `unsloth/Qwen3-4B-GGUF` Q4_K_M·Q8_0, `qwen_3_4b.safetensors`(BF16) |
| 현재 실행 인자 | `--diffusion-model … --vae … --llm … -p … --cfg-scale … --steps … -W 1024 -H 1024 --offload-to-cpu --diffusion-fa -s <seed> -o …` |
| 프롬프트 | 윈도우 실행 파일이 ASCII만 읽으므로 P0 프롬프트는 영문으로 고정 |

내려받는 주소는 코드가 `resolve/main`을 쓴다. 리비전은 파일마다 코드에 적힌 바이트 수와 SHA-256으로 고정하고, 내려받은 뒤 해시를 대조해 결과 문서에 적는다.

## 2. 장비별 내려받기·실행 목록

크기는 코드의 바이트 수를 GiB로 바꾼 값이다.

### 2-1. 이 세션 PC — Intel Arc 내장 그래픽 (Vulkan)

확인한 사양: Intel(R) Arc(TM) Graphics 드라이버 32.0.101.9150, 시스템 메모리 31.5GB, NVIDIA 없음, 엔진·`ImageModels` 미설치. 엔진 판정 코드상 `win-vulkan` 빌드를 고른다. 내장 그래픽이라 그래픽 메모리는 시스템 메모리를 함께 쓴다(윈도우 보고값 4GB, 실제 사용량은 실측).

| 파일 | 크기 |
|---|---|
| `sd-master-1b0ba10-bin-win-vulkan-x64.zip` | 0.03 |
| `z_image_turbo-Q4_K.gguf` | 3.60 |
| Z-Image VAE `ae.safetensors` | 0.31 |
| `flux-2-klein-4b-Q4_0.gguf` | 2.29 |
| FLUX.2 VAE `flux2-vae.safetensors` | 0.31 |
| `Qwen3-4B-Q4_K_M.gguf` | 2.33 |
| **합계** | **약 8.9** |
| (선택) `z_image_turbo-Q3_K.gguf` — Q4_K가 실패하거나 지나치게 느릴 때만 | 2.93 |

### 2-2. NVIDIA 장비 — 마스터PC (문서 기록상 RTX 5080 15.9GB, 가용 여부 Master 조율)

| 묶음 | 파일 | 크기 |
|---|---|---|
| 핵심 | CUDA 실행 파일 2개(`…win-cuda12-x64.zip`·`cudart-sd-bin-win-cu12-x64.zip`) | 0.84 |
| 핵심 | `z_image_turbo-Q8_0.gguf` · `flux-2-klein-4b-Q8_0.gguf` | 6.13 · 4.01 |
| 핵심 | VAE 2개 · `Qwen3-4B-Q8_0.gguf` | 0.62 · 3.99 |
| | **핵심 합계** | **약 15.6** |
| 양자화 비교 | `z_image_turbo-Q4_K.gguf` · `flux-2-klein-4b-Q4_0.gguf` · `Qwen3-4B-Q4_K_M.gguf` | 8.2 |
| 원본 대조(선택) | `flux-2-klein-4b.safetensors` · `qwen_3_4b.safetensors` | 14.7 |

Z-Image BF16은 16GB에서 「sampling failed」 기록(2026-11-09)이 있어 뺀다. 마스터PC에 이미 받아 둔 파일이 있으면 그 파일을 쓰고 받지 않는다(설치 현황은 그 PC에서 확인).

### 2-3. 대조군 ERNIE-Image-Turbo

고정 릴리스 `master-956-1b0ba10`의 지원 여부를 확인하지 못했다. 실행 파일 `--help`와 릴리스 기록으로 먼저 확인하고, 지원하지 않으면 내려받지 않고 「미검증」으로 남긴다.

## 3. 로컬 출력 조건

- 모델·실행 파일·결과물은 모두 저장소 밖 `F:\FreeImageP0\`(여유 221GB)에 둔다: `engine\`, `models\`, `out\<모델>-<양자화>\<번호>-<시드>.png`, `logs\`.
- 저장소에는 [결과 문서](P0_RESULTS.md)와 선별한 대표 이미지 경로만 적는다. 이미지 파일은 커밋하지 않는다.
- 서버 업로드 0, 유료 AI 호출 0, API 키 0. 내려받기만 인터넷을 쓴다.
- 엔진 앱은 설치하지 않고 실행 파일을 직접 부른다. 기존 회원용 엔진·무료음악 설치·다른 세션 작업에 영향이 없다.
- 주의: 이 PC는 저장소가 `D:\AIMaster`다. 엔진의 독립 폴더 규칙은 음악 모델 폴더가 있는 드라이브의 `\AIMaster\ImageModels`를 쓰므로, D 드라이브에 음악 모델 폴더를 두면 저장소 안에 모델이 놓일 수 있다. P0는 엔진 앱을 쓰지 않아 해당 없음. P1 설계 때 확인한다.

## 4. 시험 순서와 중단 기준

1. **1장 확인**: 모델마다 1024×1024, 시드 1001, 프롬프트 1번으로 1장. PNG 크기·무결성 확인.
2. **본 시험**: 프롬프트 24개 × 시드 2개(1001, 2002) × 모델 2개 = 장비·양자화 구성마다 96장. 한 번에 한 작업.
3. **비율 시험**: 프롬프트 표의 비율대로 1024×1024, 1344×768, 768×1344를 실행 인자로 직접 지정. 실패하면 원인과 함께 미검증으로 기록.
4. **중단 기준**: 1장에 5분을 넘으면 본 시험을 프롬프트 8개(분류마다 2개)로 줄이고 그 사실을 적는다. 같은 원인 실패가 3번 이어지면 멈추고 한 단계 작은 구성으로 바꾼다.

## 5. 측정 항목

| 항목 | 방법 |
|---|---|
| 첫 실행(모델 읽기 포함)·이후 실행 시간, p50/p95 | 실행 전후 시각, 실행 파일 기록 |
| 최대 그래픽 메모리 | NVIDIA는 `nvidia-smi` 1초 간격, Arc는 윈도우 성능 카운터 `GPU Adapter Memory`(전용·공유) |
| 최대 시스템 메모리 | 프로세스 최대 작업 집합 |
| 장당 저장까지 시간 · 파일 크기 | 결과 파일 시각 |
| 성공률 · 실패 원인 | 종료 코드, 기록 원문 |
| 품질 | 모델·양자화 이름을 가린 2인 평가: 요청 준수 · 시각 품질 · 사용 가능 여부 |

통과 기준은 [개발 플랜](PLAN.md)과 같다(기본 모델 사용 가능률 80% 이상, 설명 안 되는 실패 0).

## 6. 시험 프롬프트 24개

모든 프롬프트 끝에 `no text, no letters, no watermark`를 붙인다. 인물은 한국인으로 적는다(핵심 원칙 3).

| 번호 | 분류 | 비율 | 프롬프트 |
|---|---|---|---|
| 1 | 실사·블로그 | 1:1 | a Korean woman in her 30s working on a laptop at a bright cafe window, natural light, candid photo |
| 2 | 실사·블로그 | 16:9 | a Korean family having breakfast at a wooden table in a modern apartment, morning sunlight, lifestyle photo |
| 3 | 실사·블로그 | 16:9 | a quiet street in Seoul at dusk with warm shop lights, wet pavement, cinematic photo |
| 4 | 실사·블로그 | 9:16 | a Korean man in his 40s jogging along the Han River park at sunrise, full body, sports photo |
| 5 | 실사·블로그 | 1:1 | a steaming bowl of Korean bibimbap on a dark stone table, top view, food photography |
| 6 | 실사·블로그 | 9:16 | a cozy reading corner with a floor lamp, a knitted blanket and a cup of tea, interior photo |
| 7 | 상품 배경 | 1:1 | an empty white marble podium with soft shadow on a pastel beige background, studio product backdrop |
| 8 | 상품 배경 | 1:1 | a light wooden tabletop with blurred green plants behind, empty center for product placement |
| 9 | 상품 배경 | 16:9 | a clean kitchen counter with morning light and blurred shelves, empty foreground space |
| 10 | 상품 배경 | 9:16 | a pink gradient background with floating soap bubbles, empty center, cosmetic advertisement backdrop |
| 11 | 상품 배경 | 1:1 | dark slate surface with water droplets and dramatic side lighting, premium product backdrop |
| 12 | 상품 배경 | 16:9 | a sunny beach sand surface with soft waves at the edge, empty center, summer product backdrop |
| 13 | 썸네일 구도 | 16:9 | a surprised Korean man in his 20s pointing to the right side, plain yellow background, large empty space on the right |
| 14 | 썸네일 구도 | 16:9 | a Korean woman holding a smartphone with a shocked expression, blue background, empty space on the left |
| 15 | 썸네일 구도 | 16:9 | a pile of gold coins and a rising green arrow on a dark background, bold composition, empty top area |
| 16 | 썸네일 구도 | 9:16 | a Korean chef presenting a dish toward the camera, kitchen background blurred, empty space at the top |
| 17 | 썸네일 구도 | 1:1 | a before and after split composition of a messy desk and a tidy desk, clear center dividing line |
| 18 | 썸네일 구도 | 9:16 | a close-up of hands typing on a keyboard with glowing screen light, empty dark area at the bottom |
| 19 | 일러스트 | 1:1 | flat vector illustration of a small online shop with delivery boxes and a friendly Korean shop owner, pastel colors |
| 20 | 일러스트 | 16:9 | isometric illustration of a home office with computer, plants and a cat, soft colors |
| 21 | 일러스트 | 9:16 | watercolor illustration of cherry blossoms along a stream in spring, gentle pink tones |
| 22 | 일러스트 | 1:1 | cute 3D render of a robot assistant holding a paintbrush, soft studio lighting, pastel background |
| 23 | 일러스트 | 16:9 | minimal line art illustration of a mountain landscape at sunset, two colors only |
| 24 | 일러스트 | 9:16 | children book style illustration of a Korean girl flying a kite on a green hill, bright colors |

## 7. 결정·조율 대기

| 항목 | 누가 | 상태 |
|---|---|---|
| 이 PC에 약 8.9GiB 내려받기와 Vulkan 실행 | 주인님 승인 · Master 순번 | 대기 |
| 마스터PC 가용 여부·설치 현황·실행 순번 | Master 조율 | 대기 |
| 2인 가림 평가자 | 주인님 | 대기 |
| 한국어 설명 처리(1차는 영문 프리셋·직접 편집 추천) | 주인님 | 대기 |
