# 플랜 — gemini-2.5 → 최신 모델 교체 + 회원 모델 선택 (2026-11-03, 승인 대기)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini]
주인님 지시: 「우선 대체가능한 신모델로 교체하고 사용자에게 모델선택을 할수 있도록 실행가능한 모델로 추가해줘」
근거: `docs/GEMINI_25_REPLACEMENT_LIST_20261103.md`(대상 파일·줄), Google 공식 문서(2026-11-03 확인).

## 1. 공통 모델 선택지 (모든 프로그램 같은 이름·순서 — 기준: `docs/AI_MODEL_CATALOG.md` 1절 Gemini 칸)
| 화면 표시 | 모델 | 비고 |
|---|---|---|
| 추천 · 균형 (기본) | `gemini-3.8-flash` | 최신 정식, 무료 등급 있음 |
| 빠르고 저렴 | `gemini-3.5-flash-lite` | 2.5-flash와 같은 가격 |
| 최고 품질 · 결제 연결 키 필요 | `gemini-4-argon` | 무료 등급 없음(안내 문구 표시) |
음성: `gemini-3.8-flash-tts`(고품질), `gemini-3.8-flash-lite-tts`(저렴). 미리보기판(`*-preview`)·자동 연결되는 이전 모델(`3.5-flash`·`3.7-flash`)은 선택지에 넣지 않는다.
옛 저장값 변환: 회원 설정·작업에 저장된 `gemini-2.5-flash`→`3.8-flash`, `2.5-pro`→`3.8-flash`, `2.5-flash-lite`→`3.5-flash-lite`, `3.5-flash`/`3.7-flash`→`3.8-flash`, `2.5-flash-preview-tts`→`3.8-flash-tts`(playlist-channel-studio의 변환표 방식). 회원 본인 키 규칙 그대로.

## 2. 단계
| 단계 | 대상 | 할 일 | 배포 |
|---|---|---|---|
| 1 (긴급, 11-17 종료) | 음성 3곳: `ai-video-studio`(기준)→`music-video-studio`(사본 `--sync`), `shorts-onestop-studio` | 음성 목록 2.5 TTS 삭제, 3.8 TTS 2종 추가, 옛 저장값 변환 | 즉시(회원 피해 예외) 빌드 3회 |
| 2 | 선택 칸이 이미 있는 약 20개(B그룹·`contentModels`·댓글 3종 `models.ts` 등) | 2.5 항목을 1절 선택지로 바꾸고 기본값·변환표 | 미배포 대기 → 12-01 전 묶음 |
| 3 | 2.5를 고정 호출하는 19개(A그룹, 가장 먼저 `ai-prompt-studio` — 2.5만 허용하는 검사 제거) | 기본값 `3.8-flash` + 설정 화면(또는 작업 화면)에 모델 선택 칸 추가, 서버는 허용 목록만 받음 | 미배포 대기 → 12-01 전 묶음 |

지금 다른 세션이 작업 중이라 나중에 할 폴더: `blog-neighbor-care`(윈도우 blog 세션), `ai-auto-blog`·`tistory-auto-blog`(배포 요청 진행 중 — 배포 끝난 뒤).
공용 사본(`compatibleChat/ProviderSelect.tsx` 등)은 기준만 고치고 `--sync`.

## 3. 검사
맥미니: 프로그램마다 `tsc --noEmit`(가능한 곳은 시험). 윈도우: 시험·빌드·배포. 실제 생성 시험은 일괄로 하지 않고 단계 1 음성만 시험 계정 본인 키로 1회(모델마다 1회, 수 센트 이하).

## 4. 비용
| 항목 | 횟수 | 비고 |
|---|---|---|
| 맥미니 코드 수정·tsc | — | 없음 |
| 단계 1 빌드 | 3회 | 즉시 |
| 단계 2·3 빌드 | 약 38회 | 프로그램당 1회, 순차, 12-01 전 다른 대기 수정과 함께 |
| 음성 생성 시험 | 2회 | 시험 계정 본인 키, 수 센트 |
| 회원 부담 | — | 3.8-flash는 2.5-flash보다 입력 2.5배·출력 1.5배 비쌈(회원 본인 키) |

## 5. 버전·기록
배포 때 프로그램마다 +0.01. 프로그램별 `AGENTS.md`·`docs/IMPROVEMENTS.md`, `docs/PENDING_DEPLOYS.md`, 교체 목록 문서 진행 표.
