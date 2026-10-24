# 블로그

- 담당: Claude Code(윈도우) `claude-win-20261024-blog3`(이전 `claude-win-20261023-blog2`)
- 맡은 폴더: `ai-auto-blog/` `blog-keyword/` `blog-workroom/` `naver-blog-agent/` `naver-blog-allinone/` `naver-blog-auto-poster_web/` `naver-blog-seo-studio/` `tistory-auto-blog/` `blog-content-maker/`
- 카테고리: 블로그
- 주력 업무: 블로그 프로그램 병합·개선·배포. 기준 문서: 루트 「🧭 블로그 작업 최우선 핵심 지침」(웹에서 완성 → 확장 자동 입력 → 회원이 고른 방식 ⓐ 발행 전까지 ⓑ 실제 ⓒ 예약 → 결과 기록, 네이버·티스토리·워드프레스·블로그스팟), `docs/BLOG_FEATURE_MATRIX.md`, `docs/BLOG_CONSOLIDATION_TASKS.md`
- 마지막 갱신: 2026-10-24 `claude-win-20261024-blog3` (E-5 v2.21 배포 뒤, 지침 재확인)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| `naver-blog-agent` v2.21 | ② 간편 모드 실제 네이버 입력 시험(비공개 1건, 「발행 전까지」 방식) | 2026-10-24 | 크롬을 시험 계정으로 로그인해 주시길 기다림(지금 관리자 계정) |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| `naver-blog-agent` | 미배포 대기 `89d135c4b`(「발행 전까지」로 바꿀 때 예약 미리 넣기 끄기) | 다음 배포 때 함께 | `naver-blog-agent/docs/IMPROVEMENTS.md` |
| `naver-blog-seo-studio` | ③ 예약 포스팅 추가(핵심 지침 세 방식 중 빠짐) | ② 뒤 플랜 | `docs/BLOG_FEATURE_MATRIX.md` 2-6 |
| `blog-content-maker` | ③ 실제·예약 포스팅과 결과 기록 추가(핵심 지침) | ② 뒤 플랜 | 같은 표 |
| 블로그 5개 | ④ 묶음 E Next.js 보안 업데이트(프로그램마다 빌드 1회) | ③ 뒤 | `docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md` |
| `ai-auto-blog` | BLOG 정리(이동 안내·비공개·FREE 배지 이전) | 시점 결정 | `naver-blog-agent/docs/PLAN_20261024_MAEPSI_E1_E4.md` E-4 5번 |
| `naver-blog-agent` | E-2 회원 선택 빠른 입력(보류) | 재개 결정 | 같은 플랜 |
| `naver-blog-seo-studio` | 도톨이 2차(이전 글 비교·스타일 점수·이미지 노드), N7·N13 | 결정 | `naver-blog-seo-studio/docs/PLAN_20261024_DOTORI_D1_D4.md` |
| 워드프레스·블로그스팟 | 같은 기준으로 기존 프로그램 있는지 점검 | 아래 여쭐 것 답 | 루트 핵심 지침 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-10-24 | `naver-blog-agent` v2.21 | E-5 세 가지 포스팅 방식 한 줄 선택·전송 버튼 옆 안내·간편 4단계 안내 | 배포 |
| 2026-10-24 | 지침 | 「🧭 블로그 작업 최우선 핵심 지침」 루트 3개·블로그 기준 문서 2개 맨 위(`b2cae844b`) | 없음 |
| 2026-10-24 | `naver-blog-agent` v2.20 | E-4 간편 모드 무료 입구(BLOG FREE 회원은 간편 원고만) | 배포 |
| 2026-10-24 | `naver-blog-agent` v2.19 | E-3 간편 모드 | 배포 |
| 2026-10-24 | `blog-keyword` v1.09 | v1.08 실검수 수정 | 배포 |
| 2026-10-24 | `blog-keyword` v1.08 | 병합 묶음 C(도톨이 N8·N9) | 배포 |
| 2026-10-24 | `naver-blog-seo-studio` v2.18 | v2.17 실검수 수정 | 배포 |
| 2026-10-24 | `naver-blog-seo-studio` v2.17 | 도톨이 D-1~D-4 | 배포 |
| 2026-10-24 | 문서 | 블로그 기능 상세 비교표 | 없음 |
| 2026-10-24 | `naver-blog-seo-studio` v2.16 | 병합 B-5~B-8(이전 세션) | 배포 |

## 다음 첫 단계
1. 크롬이 시험 계정(`buylifemall@naver.com`)으로 로그인되면 ② 실제 입력 시험 시작(간편 모드 원고 → 「발행 전까지」 → 확장 입력 결과 확인, 발행은 하지 않음)
2. 그다음 ③ SEO 예약 포스팅·콘텐츠 메이커 포스팅 플랜을 주인님께 보여 드림
3. 관리자 「수정 요청함」 0044가 적용되면 E-3~E-5 결과를 `dev-requests.mjs report`로, 아래 여쭐 것을 `ask`로 올림(지금은 DB 칸 없음)

## 주인님께 여쭐 것
- [로그인] ② 실제 입력 시험을 위해 크롬을 시험 계정 `buylifemall@naver.com`으로 다시 로그인해 주세요(지금 관리자 계정, 네이버 블로그 로그인·확장 연결도 필요)
- [결정] 워드프레스·블로그스팟은 공식 발행 API가 있습니다 — 확장 대신 공식 API로 발행해도 되는지(핵심 지침 예외 한 줄)
- [결정] BLOG(`ai-auto-blog`) 정리 시점(이동 안내·비공개·FREE 배지 이전)
- [결정] E-2 빠른 입력 재개 여부(지금 보류)
