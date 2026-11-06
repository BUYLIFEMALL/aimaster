# 플랜 — 내 PC 앨범 그림(원본 이식 마지막 항목) · 2026-11-06

역할: music · 세션 `claude-win-20261024-music` · 상위 플랜 [`PLAN_20261106_ORIGINAL_PORT_ALL.md`](PLAN_20261106_ORIGINAL_PORT_ALL.md) 1절 「내 PC 앨범 그림 — 나중」 줄.

## 1. 원본 기능(boks-music beta.5, MIT)

| 파일 | 하는 일 |
|---|---|
| `electron/image-catalog.mjs` | stable-diffusion.cpp 실행 파일(윈도우 CUDA 12 / Vulkan / CPU, 맥 Metal) + 모델 두 가족을 그래픽 메모리 순으로. 모든 파일 크기·SHA-256 고정 |
| `electron/image-engine.mjs` | 엔진·모델 받기(검증) → `--help`로 실행 확인 → 1024×1024 PNG 1장. 한글 경로에서 sd-cli가 죽어서 모델 폴더 안 ASCII 상대 경로로 실행, 5분(CPU 30분) 무응답이면 중단, 결과 PNG 검사 |
| `electron/art-prompt.mjs` | AI가 영어 그림 설명문(60~140단어, 글자 없는 그림)을 쓰고, 엔진이 읽을 수 있게 ASCII만 남김 |

모델(라이선스는 배포처 표기 확인):

| 가족 | 라이선스 | 단계 | 판(그래픽 메모리 권장) | 받는 크기(엔진 제외) |
|---|---|---|---|---|
| Z-Image Turbo 6B (Tongyi-MAI) | Apache-2.0 | 8 | Q3_K 6GB · Q4_K 8GB · Q6_K 10GB · Q8_0 10GB · BF16 18GB | 약 5.6 ~ 19.3GB |
| FLUX.2 klein 4B (Black Forest Labs) | Apache-2.0 | 4 | Q4_0 6GB · Q8_0 8GB · BF16 12GB | 약 4.9 ~ 15.8GB |
| 글 이해 모델 Qwen3-4B(두 가족 공용) | Apache-2.0 | — | Q4 2.3GB · Q8 4.0GB · BF16 7.5GB | 위 크기에 포함 |
| 엔진 stable-diffusion.cpp | MIT | — | NVIDIA 약 860MB(CUDA 런타임 포함) · Vulkan 29MB · CPU 17MB | 처음 한 번 |

원본 실측: RTX 5080에서 Z-Image Q8_0 1024×1024 그래픽 메모리 7.4GB.

## 2. 원본 / AIMaster / 채택

| 기능 | 원본 | AIMaster(지금) | 채택·이유 |
|---|---|---|---|
| 앨범 그림 만들기 | 내 PC 모델(무료, 키 없음) | 회원 본인 키로 Gemini·GPT Image·FLUX 2(유료, 서버 경유) | **둘 다** — 플랫폼 버튼에 「내 PC(무료)」를 하나 더. 키 없는 회원도 그림을 만들 수 있음 |
| 모델 받기·검증 | 크기·SHA-256 고정, 이어받기 | 엔진 0.6.9 `download.mjs`(원본 이식, 이어받기·재시도) | 우리 것(이미 원본 코드) |
| 그래픽카드 순서 | GPU 작업 한 줄 | 대기열 + `exclusiveRun`(한 번에 한 엔진) | 우리 대기열에 작업 종류 `art` 추가 |
| 모델 고르기 화면 | 환경설정 「앨범아트 이미지」 | 환경설정 추천 구성 카드·저장 공간 | 우리 환경설정에 「내 PC 앨범 그림 모델」 칸(추천 표시·받기·지우기), 저장 공간 목록에도 |
| 영어 설명문 | Claude·Codex CLI 구독이 씀 | AI 작사가 회원 본인 키(OpenAI·Claude·Gemini) | 결정 2 |
| 결과 저장 | 프로젝트 폴더 PNG | 노래 저장 폴더 「곡 제목.png」 = 곡 표지(0.6.8) | 우리 것 그대로 |

## 3. 결정 항목(주인님) — **2026-11-06 채팅으로 확정: 1 두 가족 8개 판 모두 · 2 회원 AI 키 자동 + 직접 입력 · 3 배포는 빌드 때 승인**

1. **모델 범위** — 권장: 두 가족 8개 판 모두(원본 그대로, PC 사양에 맞는 판을 「추천」으로 표시).
2. **영어 설명문** — 권장: 회원 본인 AI 키(OpenAI·Claude·Gemini 중 등록된 것, AI 작사와 같은 방식)로 자동 작성 + 회원이 영어로 직접 적을 수도 있게. 키가 없으면 직접 적기만.
3. **배포** — 구현이 끝나면 엔진 0.7.0 설치 파일 + 사이트 v1.27을 빌드 1회로(빌드 때 다시 승인).

## 4. 구현 순서

1. 엔진 `imageArt.mjs`: 원본 `image-catalog`·`image-engine` 이식(우리 `download.mjs`·`device.mjs`·데이터 폴더 구조로), 시험.
2. 게이트웨이: `GET /image-models`(판·상태·추천), `POST /image-models/<id>`(받기, 진행률), `DELETE`(지우기), 대기열 종류 `art`(설명문 → PNG → 「곡 제목.png」). 기능 표시 `local-art`.
3. 사이트: 앨범 그림 플랫폼 「내 PC(무료)」, 영어 설명문 만들기(`/api/album-art/prompt`, 회원 본인 키, 재시도 0), 환경설정 모델 칸, 저장 공간 항목.
4. 시험(엔진·tsc) → 이 PC(CPU)에서 FLUX.2 klein Q4_0으로 실물 한 장 → 커밋·미배포 대기.

## 5. 비용

- 운영자 비용: 없음(그림은 회원 PC에서). 개발 시험: 이 PC CPU, AI 호출은 설명문 1~2회(관리자 본인 키, 1원 안팎).
- 회원 부담: 모델 받기 약 5~21GB(PC 저장 공간), 설명문 자동 작성은 회원 키 1회 호출(아주 적음).
- 배포: 빌드 1회(나중에 승인).
- DB 변경: 없음.
