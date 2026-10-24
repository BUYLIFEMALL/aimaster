# 부동산

- 담당: Claude Code(윈도우) — **세션 이름은 담당 세션이 처음 시작할 때 여기에 적는다**(2026-10-24 주인님 지정)
- 맡은 폴더: `real_estate_sales/`(부동산 실거래 투자분석 자동화 `real-estate-sales`) · `realty-listing-alert/`(새 프로그램 AI 부동산 매물 알림 자동화, 아직 없음)
- 카테고리: 부동산(`real-estate`)
- 주력 업무: 부동산 프로그램 개발·유지보수, 새 프로그램 `realty-listing-alert` 구현
- 마지막 갱신: 2026-10-24 22:30 (역할 파일 생성 `claude-win-dotori` [역할: analysis-planning])

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| — | 없음(담당 세션 시작 전) | — | — |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| 🏠 `realty-listing-alert`(새) | 네이버 부동산 매물 무인 수집·정리·알림 — **회원 PC에서만 네이버 접속, 우리 서버 요청 0·매물 데이터 미보관**, 1단계 크롬 확장 → 2단계 PC 프로그램, 텔레그램(엑셀 첨부)·이메일·파일, 간격 10분~24시간·대상 10개·예약 ON/OFF 회원 설정 | **0단계 사전 검증 승인**(주인님 크롬, 단지 1곳 2~3페이지) | `docs/analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md`(기준) · 시작 프롬프트 `docs/analysis-naver-realty-collector-20261024/PROMPT_20261024_REALTY_OWNER.md` |
| `real_estate_sales` v1.18 | N1 「이 단지 네이버 부동산에서 보기」 바로가기 · N2 실거래 엑셀 내보내기 | 담당 플랜 → 승인 | `docs/analysis-naver-realty-collector-20261024/REPORT.md` §4 |
| `real_estate_sales` | 당해 연도 규칙(연도 누락 7곳 중 7번) — `src/lib/ai/analyze.ts` 매물 분석 프롬프트에 `withYearRule()`(기준 `threads-content-ops/lib/yearRule.ts`, 상품소싱 v1.25 사본 방식) | 다음 배포 때 함께 | `docs/PLAN_20261024_EBOOK_KEY_TAROT_RETENTION_YEAR.md` §3 |
| `real_estate_sales` | AI 분석 결과 30일 자동 정리 없음 | 담당 확인 | `docs/REAL_ESTATE_CONSOLIDATION_TASKS.md` |
| 문서 | 카테고리 지침 초안 3종 확인·확정(`REAL_ESTATE_COMPLETION_POLICY.md`·`REAL_ESTATE_FEATURE_MATRIX.md`·`REAL_ESTATE_CONSOLIDATION_TASKS.md`) · 프로그램 비교표 카드 버전 v1.11 → v1.18 | 담당 확인 | `docs/CATEGORY_GUIDE_MAP.md` 부동산 줄 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| — | 확인 필요 | — | — |

## 다음 첫 단계
1. 이 파일 맨 위 「담당」에 내 세션 이름을 적고, `docs/roles/README.md` 역할 표 담당 칸도 고친다(안전 커밋 도우미).
2. `node scripts/dev-requests.mjs list --role real-estate` → 인수인계 문서 §0·§11 → 0단계 개발 플랜을 주인님께 보고.

## 주인님께 여쭐 것
- `realty-listing-alert` 0단계 사전 검증(주인님 크롬에서 네이버 부동산 단지 1곳 목록 2~3페이지 읽기) 진행 승인
