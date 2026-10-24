# 부동산

- 담당: Claude Code(윈도우) `claude-win-20261024-realty`
- 맡은 폴더: `realty-listing-alert/`(v1.02 운영, 준비중) · 부동산 카테고리 프로그램(`real_estate_sales/` 등은 배정 시)
- 카테고리: 부동산
- 주력 업무: 새 프로그램 「AI 부동산 매물 알림 자동화」(`realty-listing-alert`) 구현 — 인수인계 [`HANDOFF_20261024_REALTY_LISTING_ALERT.md`](../analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md) 기준
- 마지막 갱신: 2026-10-25 (claude-win-20261024-realty)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `realty-listing-alert` | 3단계(확장 수집 엔진) 플랜 준비 | 2026-10-25 | 플랜 보고 전 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `realty-listing-alert` | 2단계 남은 시험 | 「기존 부동산 봇 가져오기」·RLS 시험용 계정(주인님 답) | [`IMPROVEMENT_BACKLOG.md`](../../realty-listing-alert/docs/IMPROVEMENT_BACKLOG.md) |
| `realty-listing-alert` | 정식 공개 | 테스트 정상 확인 뒤 주인님 결정(그때 준비중 배지 떼기·VIP 부여·썸네일) | 주인님 지시 2026-10-24 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-25 | `realty-listing-alert` v1.02 | 2단계: 표 3개·RLS·10개 상한, 감시 대상·예약·받는 방법 화면, 기존 부동산 봇 가져오기, 메뉴 밑줄 제거, 확장 1.2.0, DB·ZIP 버전 일치(`check-extension-release` OK) | 운영 배포 1회 |
| 2026-10-25 | `realty-listing-alert` v1.01 | 1단계 마무리 문서(인수인계 7종, 비교표·카테고리 지도·외부 분석표·DESIGN 현황판·미배포 대기) | — |
| 2026-10-25 | `realty-listing-alert` v1.01 | 표준 2탭 로그인, 대시보드·매뉴얼 카드 정리, 시험 계정 데스크톱·375px 검수, 확장 바로 연결 확인 | 운영 3회째 배포 |
| 2026-10-24 | `realty-listing-alert` v1.01 | 운영 DB 등록(준비중·요금제 3단계), 시험 계정 30일 권한, Vercel·도메인, `check-extension-release` OK | 운영 배포 |
| 2026-10-24 | `realty-listing-alert` v1.01 | 0단계 사전 검증 완료 — [`PREVALIDATION_20261024.md`](../analysis-naver-realty-collector-20261024/PREVALIDATION_20261024.md) | 없음 |
| 2026-10-24 | `realty-listing-alert` v1.01 | 웹 뼈대 + `extension/` + 프로그램 내 ZIP 다운로드(prebuild) | — |
| 2026-10-24 | — | 부동산 역할 등록(주인님 지정) | — |

## 다음 첫 단계
1. 3단계(확장 수집 엔진) 플랜을 주인님께 보여 드리고 승인받기 — 백로그 3단계

## 주인님께 여쭐 것
- 「기존 부동산 봇 가져오기」·다른 회원 설정 안 보임(RLS) 시험에 쓸 계정(부동산 실거래 프로그램에 텔레그램을 연결한 계정, 두 번째 회원 계정) — 없으면 3단계 시험 때 함께
