# 쇼핑몰 디자인 UI 빌더(프론트)

- 담당: Claude Code(윈도우) `claude-win-20261114-mall-design`
- 맡은 폴더: `mall-builder/`의 디자인 빌더 범위(`src/lib/builder/**`·`src/lib/theme.ts`·`src/lib/blocks.ts`·`src/app/s/[store]/admin/design/**`·`admin/home/**`·`home-blocks.tsx`, `(shop)/layout.tsx` 테마 주입부)
- 카테고리: 이커머스
- 주력 업무: **프로셀에서 구현한 쇼핑몰 프론트단 디자인 UI 빌더(위지위그) 개발 전담**(2026-11-14 주인님 지정). B2B+리셀러몰·분양몰·독립몰 세 몰 공통 코어, 백엔드 담당(`mall-builder` 역할)과 계속 조율
- 담당 아님: 주문·결제·가격·정산·분양·공급사 등 운영 기능(백엔드 담당 `mall-builder`), 쿠팡 등 마켓 연동
- 마지막 갱신: 2026-11-14 D0 완료 (claude-win-20261114-mall-design)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `mall-builder` | 디자인 빌더 D0 분석 → D1 테마 층 준비 | 2026-11-14 | D0 완료(공개 화면·관리자 디자인 메뉴) — D1 착수 전 백엔드 배포 순서(S4) 확인 대기 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `mall-builder` | D1 테마 층 첫 배포 | 백엔드 미배포 v1.10·0067과 순서(SYNC S4), 빌드 사전 승인 | [상호 인수인계](../../mall-builder/docs/HANDOFF_DESIGN_BUILDER_BACKEND_SYNC.md) |
| `mall-builder` | D5-2 템플릿 시안 3종 | agy 작업 | [작업표](../../mall-builder/docs/DESIGN_BUILDER_TRACKER.md) D5-2 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-14 | `mall-builder` 분석 | D0-1~D0-3: 프로셀 관리자 디자인 메뉴(PC 탭 7개·모바일·공통설정·아이콘·쿠폰·카테고리 목록/상세 세부설정) ego 읽기만 분석, 캡처 7장, I11~I16·E13·E14, 플랜 §1-3 보강 | 없음 |
| 2026-11-14 | `mall-builder` 분석 | D0-0: 프로셀 공개 화면 모듈 구조(세 층·블록 공통 칸·스킨 등록) | 없음 |
| 2026-11-14 | `mall-builder` 플랜 | 주인님 결정 6가지 확정(Puck·순서·D7 뒤·분양자 헤더 메뉴·로그인·시안 agy 3종), 작업 플랜표·백엔드 상호 인수인계 작성 | 없음 |
| 2026-11-14 | `mall-builder` 플랜 | 백엔드 분석 재검증, 편집기 라이브러리 비교(Puck), D0~D7 플랜 | 없음 |

## 다음 첫 단계
0. **[작업 플랜표](../../mall-builder/docs/DESIGN_BUILDER_TRACKER.md)를 먼저 연다** — 작업 상태·개선사항(I)·추가 기능(E)·결정·백엔드 조율을 여기에 계속 채운다.
1. [상호 인수인계](../../mall-builder/docs/HANDOFF_DESIGN_BUILDER_BACKEND_SYNC.md) §1에서 백엔드 답(S4 배포 순서·S5 아이콘 색) 확인.
2. D1-1 `src/lib/theme.ts`(포인트·배경·글자색·모서리·단추·글꼴·**상품 사진 비율**·본문 폭) → D1-2 `(shop)/layout.tsx` 변수 주입 → D1-3 3D 단추 변수화. 로컬 검사까지, 배포는 D2와 묶음.

## 주인님께 여쭐 것
- 없음(결정 6가지 확정). E13 몰 공개 상태(오픈 예정·점검·폐쇄몰)는 백엔드와 협의 뒤 여쭐 예정.
