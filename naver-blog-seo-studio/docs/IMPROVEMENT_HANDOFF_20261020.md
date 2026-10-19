# 인수인계 — 2026-10-20 v1.74 (Claude Code 윈도우)

프로그램: https://naver-blog-seo-studio.buylife.xyz · 플랜: [PLAN_20261020_SEO_HELPER_UPGRADE.md](PLAN_20261020_SEO_HELPER_UPGRADE.md) · 원장: [IMPROVEMENTS.md](IMPROVEMENTS.md) #12~#17

## 한 일
| 구분 | 내용 | 파일 |
|---|---|---|
| 버그 | 홈판 스토리·인사이트 엣지 전략 400 거부 → 전략 목록 단일화 | `lib/ai/generator.ts`(`SEO_STRATEGY_NAMES`), `app/api/drafts/generate/route.ts` |
| 기능 | 경험 메모·경험 질문 API·문체·FAQ 옵션 | `components/studio/TitleView.tsx`, `useStudio.ts`, `app/api/drafts/experience-questions/route.ts` |
| 기능 | 발행 전 점검·단어 빈도·모바일 미리보기 | `lib/seoQuality.ts`, `components/studio/QualityPanel.tsx`, `NewDraftView.tsx`, `app/globals.css` |
| 개선 | 분량 보강 최대 2회·부족분 지시·1,500자 이상 저장+`lengthNotice` | `lib/ai/generator.ts`, `shared.ts`(`reportLabels`) |
| 문서 | 매뉴얼 TIP 2줄·FAQ 1개 | `app/guide/page.tsx` |
| 테스트 | `npm run test:seo-quality`(6개, 전략 이름 일치 회귀 포함) | `tests/seo-quality.test.mjs`, `package.json` |

## 검수
- 자동: tsc 0, eslint 새 경고 0(기존 3), 테스트 37개 통과(1 건너뜀), build 통과.
- 운영(크롬, 관리자 세션 — 공유 세션이 관리자라 일반 회원 계정 검수는 미실시): 경험 질문 5개, 홈판 스토리 생성 성공 2,052자·메모 경험 반영, 점검 5/10·단어 빈도·모바일 미리보기 확인, 400px iframe 1열 전환. 이미지 생성 요청은 시험 탭에서 막아 비용 없음.
- AI 비용(관리자 본인 OpenAI 키): 제목 추천 1 + 경험 질문 1 + 글 생성 시도 4회(gpt-4o-mini 2·gpt-4o 1·gpt-5.6-luna 1, 각 1~3호출). 상위 모델 사용 없음.

## 못 한 것·주의
- GPT-5 계열 400(원장 #14) 미수정 — 원인 추정만(`temperature`). 다음 첫 단계: 모델 이름이 `gpt-5`/`gpt-6`로 시작하면 온도를 빼는 공통 처리 + 오류에 OpenAI 사유 표시, 시험 1회.
- 휴대폰 폭 가로 넘침(원장 #15)은 기존 목록 문제.
- 창 최대화로 실제 창 폭 검수는 못 하고 iframe으로 대신함.
- 시험으로 만든 글 1건이 관리자 생성 기록에 남아 있음(30일 후 자동 삭제).

## 이어서 — v1.75 (같은 날, Claude Code 윈도우)
| 원장 | 처리 | 파일 |
|---|---|---|
| #14 GPT-5 계열 400 | **수정** — 원인은 온도 지정. `openAITemperature()`·`openAIErrorReason()`, OpenAI 호출 6곳 적용 | `lib/ai/openaiModels.ts` 외 6곳 |
| #15 휴대폰 목록 넘침 | **수정** — `min-width:0` 2줄 | `app/globals.css` |
| #16 여러 단어 키워드 | **수정** — 단어 모두 포함이면 통과 | `lib/seoQuality.ts` |
| #18 대시보드 상태 안내 초기값 | **새로 발견·미수정** | `components/studio/useStudio.ts:17` |

- 검수: tsc 0, 테스트 39개 통과(1 건너뜀), build, 배포 `naver-blog-seo-studio-5070zzgwa` Ready, DB·확장 v1.75 OK. 크롬: v1.75 표시, `gpt-5.6-luna` 경험 질문 200, 400px 폭 넘침 없음.
- 비용: 관리자 본인 OpenAI 키로 `gpt-5.6-luna` 짧은 호출 1회.
- 못 한 것: GPT-5 계열로 **글 생성 전체** 시험(비용 때문에 짧은 호출로 같은 수정 경로만 확인), 일반 회원 계정 검수.
- 다음 첫 단계: #18 수정(다음 배포 때 함께) → #17 SNS 문구 연계 검토.

## 이어서 — v1.76
- #18 수정(상태 안내 초기값 비움·있을 때만 표시). 배포 `naver-blog-seo-studio-lrsl9fczp` Ready, DB·확장 v1.76 OK, 크롬 확인.
- 남은 일: #17 SNS 연계, GPT-5 계열 글 생성 전체 시험, 일반 회원 계정 검수.
