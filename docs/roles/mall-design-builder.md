# 쇼핑몰 디자인 UI 빌더(프론트)

- 담당: **Claude(B2BFront)** — Claude Code(윈도우) `claude-win-20261114-mall-design`, 쇼핑몰 프론트 작업 담당(2026-11-16 주인님 지정 이름)
- 맡은 폴더: `mall-builder/`의 디자인 빌더 범위(`src/lib/builder/**`·`src/lib/theme.ts`·`src/lib/blocks.ts`·`src/app/s/[store]/admin/design/**`·`admin/home/**`·`home-blocks.tsx`, `(shop)/layout.tsx` 테마 주입부)
- 카테고리: 이커머스
- 주력 업무: **프로셀에서 구현한 쇼핑몰 프론트단 디자인 UI 빌더(위지위그) 개발 전담**(2026-11-14 주인님 지정). B2B+리셀러몰·분양몰·독립몰 세 몰 공통 코어, 백엔드 담당(`mall-builder` 역할)과 계속 조율
- 담당 아님: 주문·결제·가격·정산·분양·공급사 등 운영 기능(백엔드 담당 `mall-builder`), 쿠팡 등 마켓 연동
- 마지막 갱신: 2026-11-19 주인님 지시로 SubPC 새 세션에 인수인계 — [인수인계 문서](../../mall-builder/docs/HANDOFF_20261119_MALL_DESIGN_FRONT_SUBPC.md) (Claude(B2BFront) 윈도우 메인 세션 마지막 기록)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `mall-builder` | **SubPC 새 세션으로 인수인계 중**(2026-11-19 주인님 지시) — 제품 파일 점유 없음 | 2026-11-19 | QUICKBAR `51d4b2207` Mac 최종 확인 대기, [인수인계 문서](../../mall-builder/docs/HANDOFF_20261119_MALL_DESIGN_FRONT_SUBPC.md) §4 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `mall-builder` | FRONT-20261119-QUICKBAR 휴대폰 빠른 메뉴(`794c5fd01`→`1766fe92e`→최종안 A `c8a134486`→미리보기 `51d4b2207`) | Mac 최종 확인 → Master | `.ai/results/FRONT-20261119-QUICKBAR.md` |
| `mall-builder` | HOMETABS `489c888e6`+`9f6b1c131`, S70 현금영수증 `50d3e6162`+`ee35d6eb1`(0105와 같은 묶음) | 검토·Mac 재검토, 0105 적용 | `.ai/results/` |
| `mall-builder` | 다음 배포 묶음: `77c50f27c`·`90248e5b1`(+`7c8ee3a81`·`e4ba29947`)·`86e5ad1bf`·HOMETABS·QUICKBAR | Master 배포 순서 | 인수인계 문서 §4-2 |
| `mall-builder` | Lab 반영된 프론트 묶음(템플릿 4차·어두운 머리글·갤러리 키보드·파란 단추 대비·3색 단추 전용 색·어두운 단추 올림, 출처 `7609748ad`) — 운영 몰 배포는 별도 | 실고객 UI QA037(로그인 대기) | `.ai/results/FRONT-20261117-03-CC-B2B-FRONT-01.md` |
| `mall-builder` | 실화면 검수: 실제 Tab·키보드 눌림·터치·운영 상점, 어두운 테마 평면 단추 올림(FRONT-04로 해결, 실화면 미검수) | Lab Ready 뒤 Mac QA | 같은 결과 파일 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-19 | `mall-builder` 미배포 | FRONT-20261119-QUICKBAR 주인님 휴대폰 실기기 지적(빠른 메뉴가 상품 가림) → 767px 이하 머리글 카테고리 줄 단추 40×40·비가림 0·포커스 복귀·Esc(`c8a134486`, Mac 독립 12/12), 편집기 미리보기 단추 끔(`51d4b2207`). 시험 28/28 | 미배포(다음 묶음) |
| 2026-11-18 | `mall-builder` 미배포 | FRONT-20261118-02 머리글 카테고리 탭 올림 글자 대비 7색 3.25~4.41 → 4.56~4.59(`77c50f27c`, QA045 PASS). FRONT-20261118-01 143 탭은 이미 6.57로 수정 0 | 미배포(다음 묶음) |
| 2026-11-17 | `mall-builder` Lab | FRONT-20261117-04 어두운 테마 평면 단추 마우스 올림 피드백(12색 올림 대비 최저 5.72, `7609748ad`, QA031 PASS) | Lab 반영 |
| 2026-11-17 | `mall-builder` Lab | FRONT-20261117-03 흰 글자 대비 미달 3색(에메랄드·코랄·오렌지) 단추 전용 색 `--mall-primary-btn` 4.51~4.52(`f7120d185`) + QA022 P2 마우스 올림 피드백 복구(`5b02c3399`, Mac 독립 PASS) | Lab 반영 |
| 2026-11-17 | `mall-builder` Lab | FRONT-20261117-02 어두운 테마 파란 단추 대비 2.63→5.17(`acb858a77`), FRONT-20261117-01 갤러리 키보드(`7c8ee3a81`·`e4ba29947`) | Lab 반영 |
| 2026-11-16 | `mall-builder` Lab | 템플릿 4차 6종(`13049d0bd`), FRONT-10 어두운 머리글 대비 1.02→15.91(`59e7e7843`) | Lab 반영 |
| 2026-11-15 | 메인 사이트(주인님 지시) | 로그인 시안 3종 → 인증 화면 5개 공용 틀 AuthShell, 최종 124번 누아르 골드(6606978f6), DESIGN.md 디자인 폴더 D:PDSDesign 등록 | 운영 |
| 2026-11-15 | `mall-builder` 미배포 | E10 블록 제목 글꼴 4종(쓸 때만 불러옴)·블록 스킨 3차(쇼윈도 대표 크게·타임세일 어두운 띠)·템플릿 116·119·120 새 기능 적용, 120·121 대표색을 시안대로. 시험 358 | 미배포 |
| 2026-11-15 | 공용 스크립트 | 공용 스테이징 어긋남 재발 방지: 맞추기 잠금 90초 대기 + 대기열(`scripts/index-pending-sync.mjs`) + 마지막 줄 경고, 묵은 항목 10개 정리, safe-commit 시험 11번 수정(`f6550cf9e`) | 해당 없음 |
| 2026-11-15 | `mall-builder` v1.14 운영 | I8 블록 제목 색·크기, 블록 스킨 2차(탭 알약/밑줄·후기 격자/가로 넘김) — 백엔드 함께 배포(S55). I5 주소창·앱 아이콘 색은 백엔드 처리 | 운영 v1.14 |
| 2026-11-15 | `mall-builder` v1.13 운영 | I13 권장 크기·I14 블록 스킨 1차(배너·카테고리·공지)·I16 카테고리 위아래 글·고정 상품·I17·I18·I22 본문 정렬·I25·I27 — 백엔드 함께 배포(S49) | 운영 v1.13 |

## 다음 첫 단계
0. **[SubPC 인수인계 문서](../../mall-builder/docs/HANDOFF_20261119_MALL_DESIGN_FRONT_SUBPC.md)를 먼저 읽는다** — 규칙·현재 상태·검증 방법·함정 정리.
1. [작업 플랜표](../../mall-builder/docs/DESIGN_BUILDER_TRACKER.md)·[상호 인수인계](../../mall-builder/docs/HANDOFF_DESIGN_BUILDER_BACKEND_SYNC.md) 확인, 작업 전 `docs/ACTIVE_WORK.md` 내 줄에 점유.
2. Master께 새 세션·새 터미널 주소 보고 후 QUICKBAR Mac 최종 확인 결과에 따라 마무리.
3. 새 코드는 Master 배정 뒤에만. 커밋 도우미 출력 맨 끝 ⚠ 줄(공용 스테이징 맞추기 보류)을 반드시 읽는다.

## 주인님께 여쭐 것
- 없음
