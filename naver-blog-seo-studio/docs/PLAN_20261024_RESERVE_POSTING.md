# 플랜 — SEO 스튜디오 예약 포스팅 추가 (블로그 핵심 지침 ③ 보강)

- 작성: 2026-10-24 · [역할: blog] Claude Code(윈도우) `claude-win-20261024-blog3` · **주인님 확인 전 — 코드 미수정**
- 기준: 루트 「🧭 블로그 작업 최우선 핵심 지침」 ③ 포스팅 방식은 회원이 ⓐ 발행 전까지 ⓑ 실제 포스팅 ⓒ 예약 포스팅 중 고른다. 블로그 기능 비교표 2-6에서 SEO 스튜디오는 「예약 발행 ×」.
- 대상: `naver-blog-seo-studio` 운영 v2.18 (운영 DB `esgxyikcnnvmlhygjkth`, DB 표 변경 없음)

## 1. 지금 상태 (코드로 확인)
| 방식 | 지금 | 위치 |
|---|---|---|
| ⓐ 발행 전까지 | ○ 사이드패널 「입력」 버튼 | `extension/sidepanel.js` `fill` |
| ⓑ 실제 포스팅 | ○ 사이드패널 「자동 포스팅」 — 서버가 단계 기록(`claim` → `writing` → `arm` → `publishing` → `published`/`uncertain`/`failed`), 결과 불확실하면 재발행 금지 | `app/api/extension/drafts/library/[draftId]/auto-publish/route.ts`, `extension/auto-publish.js`, `auto-publish-page.js` |
| ⓒ 예약 포스팅 | **× — 오히려 「예약 설정이 남아 있으면 즉시 발행하지 않음」으로 막혀 있음** | `auto-publish-page.js` `settings`·`final` |

참고 구현: 에이전트 확장 `naver-blog-agent/extension/editor.js` — 예약 설정(달력 날짜·시·분 입력 후 반영 확인, 498~540행)과 예약 목록에서 제목·시각 1건 일치 확인(`reserved` 명령, 262~281행). 같은 저장소 코드라 그대로 옮겨 쓴다(공용 기준 코드 등록은 아래 6번 후보).

## 2. 구현 순서
| 단계 | 할 일 | 파일 |
|---|---|---|
| 1 | 서버: `claim`에 선택 값 `scheduleAt`(ISO) — 10분 단위, 지금부터 20분 이후, 너무 먼 날짜 막기(에이전트 `validateReservation`와 같은 규칙, 순수 함수로) → 실행 기록에 `mode:"reserve"`, `scheduledAt` 저장 | auto-publish `route.ts`, `lib/reserveTime.ts`(새) |
| 2 | 서버: 새 결과 `reserved`(예약 목록 확인 결과 + 예약 시각) — `publishing`/`uncertain` 상태에서만, 같은 실행 한 번만. 기존 `published` 흐름은 그대로 | 같은 `route.ts` |
| 3 | 확장 사이드패널: 「예약 포스팅」 버튼 + 날짜·시각 칸(10분 단위). 고르지 않으면 지금처럼 「입력」·「자동 포스팅」만 | `sidepanel.html`·`sidepanel.js` |
| 4 | 확장 편집기: 예약 실행이면 `settings`에서 예약을 켜고 날짜·시·분 입력 후 반영 확인, `final`은 예약이 켜져 있어야만 누름. 즉시 실행은 지금처럼 예약이 켜져 있으면 멈춤 | `auto-publish-page.js` |
| 5 | 확장 결과 확인: 예약 실행은 예약 목록에서 제목·시각 1건 일치를 확인해 `reserved` 기록. 못 찾으면 `uncertain`(자동 재발행 안 함) | `auto-publish.js` |
| 6 | 웹: 발행 결과에 「예약 완료 · ○월 ○일 ○시」 표시, 사용 안내(`/guide`·`AutoPublishGuide`)에 세 방식 설명 | `PublicationResult.tsx`, `AutoPublishGuide.tsx`, `app/guide/page.tsx` |
| 7 | 시험: 예약 시각 규칙(순수 함수), 서버 `reserved` 상태 전이, 가짜 편집기에서 예약 설정·확인(기존 `tests/browser/auto-publish-page.test.mjs` 방식) | `tests/` |

## 3. 하지 않는 것
- 즉시 발행 흐름 변경 없음(회원 동작 그대로), DB 표·컬럼 변경 없음(`seo_report.autoPublish` 안에 저장).
- 에이전트 코드는 고치지 않음(읽어서 옮기기만).

## 4. 검수
- 자동 시험 전부 + `tsc` + 빌드.
- **실제 네이버 예약은 Claude 브라우저 도구로 `blog.naver.com`을 열 수 없어 주인님이 직접 시험해야 함**: 시험 계정 블로그에서 비공개 + 예약(30분 뒤) 1건 → 예약 목록 확인 → 결과 기록 확인 → 네이버에서 예약 취소. 그 전까지 「예약 포스팅」은 화면에 「시험 중」 표시를 둘지 주인님 결정.

## 5. 비용·버전
- 빌드 1회(v2.19, 확장 코드 변경 → manifest·ZIP·DB `extension_version` 함께, `check-extension-release`). AI 호출 없음.
- 회원 안내: 확장 ZIP을 다시 받아 덮어쓰고 `chrome://extensions` 새로고침.

## 6. 후보
- 네이버 예약 설정·예약 목록 확인 코드를 에이전트·SEO 두 곳이 갖게 되므로 공용 기준 코드(`naver-reserve`) 등록 후보 — `docs/SHARED_FEATURE_MAP.md`에 후보로 기록.
