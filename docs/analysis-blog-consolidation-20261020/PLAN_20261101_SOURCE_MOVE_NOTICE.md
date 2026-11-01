# 블로그 원본 이동 안내 띠 + 에이전트 입구 정리 — 플랜·결과 (2026-11-01)

[역할: mac-mini] `claude-mac-20261101-blog` · 주인님 승인(「진행해」, 빌드 4회 포함)

## 결정 반영
- 남는 블로그: 에이전트·SEO·키워드·티스토리·이웃 소통 + **BLOG(`ai-auto-blog`) = 교육용 레퍼런스(FREE 유지, 이동 안내 없음)**.
- 병합 후 정지(주인님이 백업 카테고리로 옮김): 작업실·콘텐츠 제작·올인원 → 화면에 이동 안내 띠.
- 에이전트 간편 모드: 에이전트 권한만(BLOG 권한 입구 제거, v2.23 `9a2c21c6e`).

## 구현
| 프로그램 | 버전 | 띠 버튼 | 넣은 곳 |
|---|---|---|---|
| 작업실 `blog-workroom` | v1.16 | SEO 스튜디오·키워드 | `src/app/(workspace)/layout.tsx` |
| 콘텐츠 제작 `blog-content-maker` | v1.14 | SEO 스튜디오 | `src/app/(workspace)/layout.tsx` |
| 올인원 `naver-blog-allinone` | v1.58 | 블로그 에이전트·키워드 | `src/app/page.tsx` 본문 맨 위 |
| 에이전트 `naver-blog-agent` | v2.23 | (띠 없음) 간편 모드 입구 정리 | `src/lib/access.ts` |

공통 사본: `src/components/MovedNotice.tsx`(띠), `src/lib/movedNotice.ts`(닫기 7일 판단), `tests/moved-notice.test.mjs`. 매뉴얼 화면도 같은 레이아웃 안이라 띠가 함께 보인다.

## 배포(윈도우, 빌드 4회 순차)
에이전트 v2.23 → 작업실 v1.16 → 콘텐츠 제작 v1.14 → 올인원 v1.58. 확장 있는 3개는 prebuild가 manifest·ZIP을 맞추고 DB `version`·`extension_version` SQL, 작업실은 `version`만. 끝나면 `check-extension-release.mjs`.

## 배포 후 검수(맥 크롬, 시험 계정)
띠 3개 모양·버튼 이동·7일 닫기·375px, 에이전트 간편 모드가 에이전트 권한으로만 열림, BLOG FREE(주인님이 배지 켠 뒤).
