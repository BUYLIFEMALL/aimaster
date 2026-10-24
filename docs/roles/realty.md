# 부동산

- 담당: Claude Code(윈도우) `claude-win-20261024-realty`
- 맡은 폴더: `realty-listing-alert/`(새 프로그램, 아직 없음) · 부동산 카테고리 프로그램(`real_estate_sales/` 등은 배정 시)
- 카테고리: 부동산
- 주력 업무: 새 프로그램 「AI 부동산 매물 알림 자동화」(`realty-listing-alert`) 구현 — 인수인계 [`HANDOFF_20261024_REALTY_LISTING_ALERT.md`](../analysis-naver-realty-collector-20261024/HANDOFF_20261024_REALTY_LISTING_ALERT.md) 기준
- 마지막 갱신: 2026-10-24 (claude-win-20261024-realty)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `realty-listing-alert` | 1단계 등록·뼈대 (뼈대 코드 완료, 등록·배포 남음) | 2026-10-24 | 주인님 승인 대기 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `realty-listing-alert` | 1단계 등록 | 운영 DB `programs` 등록·요금제 3단계 SQL 승인, Vercel 프로젝트·도메인·빌드 1회 승인 | 인수인계 §6-1·§8 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-24 | `realty-listing-alert` v1.01 | 0단계 사전 검증 완료 — [`PREVALIDATION_20261024.md`](../analysis-naver-realty-collector-20261024/PREVALIDATION_20261024.md) | 없음 |
| 2026-10-24 | `realty-listing-alert` v1.01 | 웹 뼈대 + `extension/` + 프로그램 내 ZIP 다운로드(prebuild) | 미배포 |
| 2026-10-24 | — | 부동산 역할 등록(주인님 지정) | — |

## 다음 첫 단계
1. 주인님 승인 뒤 1단계 등록: 운영 DB `programs` 등록·요금제 3단계·VIP 확인(크롬 SQL 편집기, Run은 주인님) → Vercel 프로젝트·`realty-listing-alert.buylife.xyz` → 빌드 1회 → 크롬 데스크톱·375px 검수 → `check-extension-release.mjs` 목록 추가

## 주인님께 여쭐 것
- 1단계 등록 승인: 운영 DB `programs` 등록·요금제 3단계 SQL, Vercel 프로젝트·도메인·빌드 1회
