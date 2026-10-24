# 부동산

- 담당: Claude Code(윈도우) `claude-win-20261024-realty`
- 맡은 폴더: `realty-listing-alert/`(v1.01 운영, 준비중) · 부동산 카테고리 프로그램(`real_estate_sales/` 등은 배정 시)
- 카테고리: 부동산
- 주력 업무: 새 프로그램 「AI 부동산 매물 알림 자동화」(`realty-listing-alert`) 구현 — 인수인계 [`HANDOFF_20261024_REALTY_LISTING_ALERT.md`](../analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md) 기준
- 마지막 갱신: 2026-10-25 (claude-win-20261024-realty)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `realty-listing-alert` | 2단계 플랜 작성(DB 표 3개 + 감시 대상·예약·받는 방법 화면) | 2026-10-25 | 플랜 보고 전 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `realty-listing-alert` | 2단계 | 플랜 승인, 운영 DB 마이그레이션 SQL Run, 빌드 1회 | [`IMPROVEMENT_BACKLOG.md`](../../realty-listing-alert/docs/IMPROVEMENT_BACKLOG.md) |
| `realty-listing-alert` | 미배포 대기 | 메뉴 링크 밑줄 제거 `fe323f5e9` — 2단계 배포 때 함께 | [`PENDING_DEPLOYS.md`](../PENDING_DEPLOYS.md) |
| `realty-listing-alert` | 정식 공개 | 테스트 정상 확인 뒤 주인님 결정(그때 준비중 배지 떼기·VIP 부여·썸네일) | 주인님 지시 2026-10-24 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-25 | `realty-listing-alert` v1.01 | 1단계 마무리 문서(인수인계 7종, 비교표·카테고리 지도·외부 분석표·DESIGN 현황판·미배포 대기) | — |
| 2026-10-25 | `realty-listing-alert` v1.01 | 표준 2탭 로그인, 대시보드·매뉴얼 카드 정리, 시험 계정 데스크톱·375px 검수, 확장 바로 연결 확인 | 운영 3회째 배포 |
| 2026-10-24 | `realty-listing-alert` v1.01 | 운영 DB 등록(준비중·요금제 3단계), 시험 계정 30일 권한, Vercel·도메인, `check-extension-release` OK | 운영 배포 |
| 2026-10-24 | `realty-listing-alert` v1.01 | 0단계 사전 검증 완료 — [`PREVALIDATION_20261024.md`](../analysis-naver-realty-collector-20261024/PREVALIDATION_20261024.md) | 없음 |
| 2026-10-24 | `realty-listing-alert` v1.01 | 웹 뼈대 + `extension/` + 프로그램 내 ZIP 다운로드(prebuild) | — |
| 2026-10-24 | — | 부동산 역할 등록(주인님 지정) | — |

## 다음 첫 단계
1. 2단계 플랜을 주인님께 보여 드리고 승인받기(DB 표 3개 SQL·RLS·10개 상한, 화면 3개, 검수: 시험 계정 2개·11번째 거절)

## 주인님께 여쭐 것
- 2단계 플랜 승인(다음 보고에서 올림)
