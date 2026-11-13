# WP·구글 블로그 P3·P7 차단 — 코드 검수 (2026-11-13, [역할: blog] `claude-win-blog`)

맥미니 요청서 [`REQUEST_20261111_MACMINI_PUBLIC_ACCESS.md`](REQUEST_20261111_MACMINI_PUBLIC_ACCESS.md)에서 P3·P7은 「미검수(조건 맞는 계정 없음)」였다. 시험 계정 `buylifemall@naver.com`은 이용기간(2027-11-10까지)과 본인 Claude 키가 있어 실물로 조건을 만들 수 없고, 기존 회원의 키·기간을 지워 조건을 만드는 것은 금지라 **코드·가짜 DB 시험으로 확인**했다.

| 항목 | 확인 방법 | 결과 |
|---|---|---|
| P3 이용기간 없는 회원 | `src/lib/accessVerdict.ts` 판정을 가짜 DB로 시험 `tests/access.test.mjs` AC01~AC06 | 이용기간 없음·만료 → `denied`(페이지는 메인 상세로, API는 403). 기간 남음·무기한·FREE·유효 구독 → 허용, 등급 부족·정지·핸드폰 없음 → 차단, 관리자 → 허용 |
| P7 본인 Claude 키 없음 | 기존 시험 `tests/draft.test.mjs`(need_key), `tests/image.test.mjs`(need_key) | `createDraft`가 키 없으면 AI 호출 전에 `need_key` 400, 생성 함수 호출 0회. `/write` 화면은 「본인 Anthropic(Claude) API 키가 필요합니다」 안내(`WriteForm.tsx`). 운영자 키 폴백 없음(`memberKeys.ts`) |

- 코드 변경: 판정 함수를 Next 의존 없는 `src/lib/accessVerdict.ts`로 옮기고 `access.ts`는 그대로 감싸 부름(동작 변화 없음). 시험 76개·`tsc` 통과. 린트는 프로젝트에 `eslint.config` 없음(기존 상태).
- 배포: 미배포 대기(동작 변화 없는 내부 정리, 다음 배포 때 함께).
- 남은 것(실물): 화면 문구·이동 실물 확인은 이용기간 없는 별도 시험 계정이나 본인 키 없는 계정이 생길 때만 가능 — 만드는 것은 주인님 결정(계정 추가·기간 회수는 운영 DB 쓰기).
