# 플랜 — 12월 모델 교체 묶음: Gemini 2.5 + GPT-5 + o3 (2026-11-03, 결정 확정 — 따로 빌드하지 않음)

작성: Claude Code(맥미니) `claude-mac-20261101-blog` [역할: mac-mini]
주인님 지시: 「묶어서 합친 플랜 만들어줘」(2026-11-03) — 기존 [`PLAN_20261103_GEMINI_25_MIGRATION.md`](PLAN_20261103_GEMINI_25_MIGRATION.md) 단계 2·3에 12-11 종료 모델(`gpt-5`·`o3`)을 합친 것. 그 플랜의 단계 1(음성)은 11-03 배포 완료.
근거: 2026-11-03 오후 저장소 다시 집계(따옴표로 감싼 모델 이름, 옛 값 변환표·종료 주석 제외 — `docs/AI_MODEL_CATALOG.md` 4절과 같은 방법). 모델 선택은 `docs/AI_MODEL_CATALOG.md` 1절.

## 1. 종료 일정 (왜 지금 묶나)
| 모델 | 날짜 | 그날 생기는 일 |
|---|---|---|
| `gemini-2.5-flash`·`-flash-lite`·`-pro` | 2026-12-01 | Google이 새 모델로 **자동 연결**(호출은 계속 됨, 결과·가격이 바뀜) |
| `gpt-5`·`o3` | 2026-12-11 | **호출 실패**(회원이 그 모델을 고르면 오류) |

두 건이 열흘 차이라 프로그램마다 한 번 빌드로 함께 처리한다. 고르는 순서는 실패가 나는 `gpt-5`·`o3`이 먼저.

## 2. 바꿀 값 (모든 프로그램 같은 기준)
| 옛 값 | 새 값 | 비고 |
|---|---|---|
| `gemini-2.5-flash`·`gemini-2.5-pro` | `gemini-3.8-flash` | 기본(균형) |
| `gemini-2.5-flash-lite` | `gemini-3.5-flash-lite` | 저렴 |
| `gemini-3.5-flash`·`gemini-3.7-flash`(자동 연결되는 이전 모델, 대체 목록 안에 있는 것) | `gemini-3.8-flash` | 선택지에 넣지 않음 |
| `gpt-5`·`o3` | `gpt-5.6-sol` | 공식 대체. 추론 모델 처리는 공용 기준 코드 `openai-request-params`(`/^(gpt-5|gpt-6|o\d)/`)가 이미 맡음 — 호출 코드 수정 없음 |

선택 칸 기본 3개(Gemini): 균형 `gemini-3.8-flash`(기본) · 저렴 `gemini-3.5-flash-lite` · 최고 `gemini-4-argon`(결제 연결 키 필요 안내).
**옛 저장값 변환(실제 동작 보장)**: 회원 설정·작업 기록·브라우저 저장값에 옛 이름이 남아 있으므로, 목록에서 지우는 것과 함께 **읽는 곳에서 옛 값 → 새 값으로 바꾼 뒤 호출**한다(11-03 이미지 교체의 `RETIRED_OPENAI_IMAGE` 방식). 서버는 허용 목록에 있는 값만 받는다.

## 3. 대상 36개 프로그램
### 묶음 A — 12-11에 실패하는 것 먼저 (5개)
| 프로그램 | 바꿀 곳 |
|---|---|
| `ai-auto-blog` | `utils/ai/contentModels.ts`(gpt-5·2.5 flash·pro), `utils/news/imageGenerator.ts` 고정 2.5 |
| `tistory-auto-blog` | 위와 같은 구조(별도 파일) |
| `naver-blog-seo-studio` | `lib/ai/openaiModels.ts`(gpt-5), `lib/ai/contentModels.ts`(2.5 pro) |
| `real_estate_sales` | `src/lib/ai/models.ts` `o3` 선택지·타입 삭제 + 변환 |
| `threads-affiliate-poster` | `src/lib/ai/models.ts` `o3` 선택지 삭제 + 변환 |

### 묶음 B — Gemini 선택 칸이 있는 것 (13개)
`ai-mastering-studio`, `ai-webtoon-studio`(설정 창·저장 기본값·타입), `blog-content-maker`, `blog-workroom`, `ebook-studio`(설정 창·작업 화면·스타일 패널·API 기본값), `emotion-writer`, `ghost-scraper`(설정 창·저장 기본값·호출 기본값), `instagram-comment-reply`·`threads-comment-reply`·`youtube-auto-reply`(**같은 내용 파일 3개** — 한 번 고쳐 똑같이 복사), `web-crawler`(`blog-neighbor-care`와 **같은 내용 파일**), `playlist-channel-studio`(「이전 모델」 항목 삭제 — 변환표는 이미 있음), `blog-neighbor-care`(아래 제외 참고)

### 묶음 C — 2.5를 고정으로 부르는 것 (18개)
| 종류 | 프로그램 |
|---|---|
| 고정 상수·호출 한 곳 | `ai-slide-builder`, `allinone-graphic`, `cinematic-storyboard-studio`, `persona-style-studio`, `photo-remake-studio`, `portrait-photo`, `react-ui-showcase`, `ui-canvas`(2곳), `vinyl-lp-studio`, `fashion-style`(standard 등급) |
| 실패 시 다음 모델 목록(`["gemini-3.5-flash","gemini-2.5-flash"]` 등) | `ai-writing-editor`, `banana-canvas`, `blog-keyword`, `personality-suite`, `thumbnail-master`, `landing-architect`, `reverse-prompt` → `["gemini-3.8-flash","gemini-3.5-flash-lite"]` |
| 여러 곳 + 검사 | `ai-prompt-studio` 12곳 — **2.5만 허용하는 서버 검사**(`api/templates/execute`)를 새 허용 목록으로 바꿔야 실행됨 |

묶음 C는 이번엔 **값만 바꾼다**(기존 플랜의 「선택 칸 새로 만들기」는 화면 작업이라 빌드와 무관하게 커서, 필요하면 프로그램별로 따로 승인). → 주인님 결정 1.

### 제외·순서 조정
- `blog-neighbor-care`: 윈도우 blog 세션이 작업 중(작업 중 표) → 그 세션에 같은 변경을 요청하고 맥미니는 건드리지 않음.
- `ai-auto-blog`·`tistory-auto-blog`·`blog-keyword`: **MAC 7개 배포 요청(`DEPLOY_REQUEST_20261103_MAC.md`)이 아직 시작 전** → 이 셋을 먼저 고쳐 커밋하면 그 배포에 함께 실려 **빌드 3회 절약**. 배포가 먼저 시작되면 다음 배포로 미룸.
- 31개 프로그램은 이미 `docs/PENDING_DEPLOYS.md`에 다른 미배포 수정이 있다 → 이번 배포에 함께 나가 대기분도 정리됨(배포하는 세션이 대기 목록 확인).

## 4. 순서
1. 맥미니: 묶음 A(블로그 3개 먼저) → 묶음 B → 묶음 C, 프로그램마다 `tsc --noEmit`(시험 있는 곳은 윈도우가 실행), 프로그램마다 경로 지정 커밋. `docs/PENDING_DEPLOYS.md`에 「12월 모델 교체」 줄.
2. 맥미니: 배포 요청서 `docs/DEPLOY_REQUEST_20261103_MODEL_DEC.md`(순서·버전·확인 방법) + 요청함 ask.
3. 윈도우: 한 번에 하나씩 빌드·배포(동시 빌드 금지), 버전 +0.01(코드+DB), 확장 있는 프로그램은 manifest·ZIP·DB 함께.
4. 배포 뒤 실제 생성 시험(시험 계정 본인 키, 대표만): `gpt-5.6-sol` 1회(ai-auto-blog), `gemini-3.8-flash` 1회(ai-prompt-studio — 서버 검사 확인), 옛 값 저장된 설정으로 1회(변환 확인).
5. 기록: 프로그램별 `AGENTS.md`·`docs/IMPROVEMENTS.md`, `docs/AI_MODEL_CATALOG.md` 4절, `docs/GEMINI_25_REPLACEMENT_LIST_20261103.md` 진행 표, `docs/PROGRAM_CAPABILITY_MAP.md` 버전.

마감: 코드 11-20까지, 배포 11-30까지(12-01 자동 연결 전).

## 5. 비용
| 항목 | 횟수 | 비고 |
|---|---|---|
| 맥미니 코드 수정·tsc | — | 없음 |
| Vercel 빌드 | **약 32회** | 36개 − MAC 배포에 실리는 3 − `blog-neighbor-care`(윈도우 blog 세션 몫 1). 순차, 프로그램당 1회 |
| 실제 생성 시험 | 3회 | 시험 계정 본인 키, 1달러 미만 |
| 회원 부담 | — | `gemini-3.8-flash`는 2.5-flash보다 입력 약 2.5배·출력 1.5배(회원 본인 키). `gpt-5.6-sol`은 `gpt-5`와 비슷한 고가 구간 |

## 6. 주인님 결정
1. ~~묶음 C~~ → **값만 바꾸기로 확정**(주인님 채팅 11-03).
2. ~~빌드 약 32회~~ → **따로 빌드하지 않는다**(주인님 11-03 「수정해놨다 다른 프로그램 수정할때 같이 업데이트」): 코드만 고쳐 `docs/PENDING_DEPLOYS.md` 미배포 대기로 두고, 그 프로그램의 다음 배포 때 함께 나간다. **예외 — 묶음 A 5개(`gpt-5`·`o3`, 12-11 호출 실패)**: 12-05까지 다른 배포가 없으면 12-10 전에 그 5개만 배포를 주인님께 여쭌다. Gemini 2.5는 12-01 뒤에도 자동 연결로 동작하므로 기다려도 된다.

## 7. 진행 (맥미니)
| 날짜 | 묶음 | 프로그램 · 커밋 | 확인 |
|---|---|---|---|
| 11-03 | A 완료 | `ai-auto-blog` `142cb45ec` · `tistory-auto-blog` `7eb961fbd` · `naver-blog-seo-studio` `6103af9a8` · `real_estate_sales` `7b55bd09d` · `threads-affiliate-poster` `0caadc5ee` | tsc 5개 통과, SEO 시험 158 통과(기대값 1줄 `gpt-5`→`gpt-5.6-sol`), 옛 값 변환 직접 확인 |
| 11-03 | C 일부 | `blog-keyword` `fb1d16075` · `ai-writing-editor` `aae03dda7` · `banana-canvas` `b8fa1638c` · `personality-suite` `73e8ac110` · `thumbnail-master` `dc64d2eae` | tsc 5개 통과 |
| 11-03 | C 나머지 완료 | `ai-doc-chatbot`(새로 찾음, 공용 기준) · `ai-prompt-studio` · `ai-slide-builder` · `allinone-graphic` · `cinematic-storyboard-studio` · `persona-style-studio` · `photo-remake-studio` · `portrait-photo` · `react-ui-showcase` · `ui-canvas` · `vinyl-lp-studio` · `fashion-style` · `landing-architect` · `reverse-prompt` (해시: `docs/PENDING_DEPLOYS.md`) | tsc 14개 통과 |
| 11-03 | B 12개 완료 | 댓글 3종 · `web-crawler` · `ai-mastering-studio` · `playlist-channel-studio` · `blog-content-maker` · `blog-workroom` · `emotion-writer` · `ghost-scraper` · `ai-webtoon-studio` · `ebook-studio` | tsc 12개 통과, 옛 저장값 변환 코드로 확인. 시험 3개는 맥에서 못 돌림(윈도우 배포 때) |
| 11-04 | B `blog-neighbor-care` 배포 | v1.15 `0a3a8c9f1`(윈도우 blog 세션) — `web-crawler`와 같은 모델 파일 + 입력 검사·호출에서 옛 값 변환, 시험 통과 | 운영 배포 완료 |
| — | 남음 | ~~`blog-neighbor-care`(윈도우 blog 세션)~~ 11-04 완료, 배포는 각 프로그램 다음 배포 때. **묶음 A 5개 중 `real_estate_sales`는 v1.42로 배포됨** — `ai-auto-blog`·`tistory-auto-blog`·`naver-blog-seo-studio`(MAC 배포 요청에 함께)와 `threads-affiliate-poster`는 12-05에 배포 여부 점검 | — |
