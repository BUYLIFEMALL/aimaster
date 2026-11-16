# FRONT-20261116-04 결과 — Claude(B2BFront) · ready_review

- 세션: `claude-win-20261114-mall-design`(aimaster-64), 역할 `mall-design-builder`
- 커밋 `685fed7da`(3파일, 107줄 추가·55줄 삭제): `design-editor.tsx`·`my-sections.tsx`·`tests/my-sections.test.mjs`. 그 밖 파일·DB·설치·build·배포·초안 저장/게시 없음. `674caa54e`는 되돌리지 않고 그 위에 후속 수정.
- 점유: 등록(ACTIVE_WORK 본인 줄) → 해제 `bd22231b0`. 편집 직전 세 파일 status/diff 0, 최근 커밋 모두 본인.

## Master 지적 대조
- 모듈 전역 `ui`/`subs`(674caa54e)는 편집기 인스턴스·몰끼리 상태를 나누고, A → B → A에서 옛 열림·목록이 되살아나거나 늦은 A 응답이 B 뒤 전역을 바꿀 수 있었다(코드상 가능 — 재현은 하지 않았고, 이번 수정으로 구조 자체를 없앰).

## 수정
1. **근본 원인(`design-editor.tsx`)**: `overrides.headerActions`에 렌더마다 새 화살표 함수 → Puck이 머리 단추 영역을 매번 새로 만듦. → 파일 수준 고정 컴포넌트 `HeaderActionsSlot` + 고정 객체 `PUCK_OVERRIDES`. 바뀌는 값 `storeId`·`pending`·`run`은 `HeaderActionsCtx` 컨텍스트로 넘김(렌더마다 최신 값 → 옛 클로저에 묶이지 않음, 컴포넌트 정체성은 고정). 초안 저장·게시 단추의 모양·`disabled={pending}`·`run("save"|"publish")` 동작은 그대로 옮김.
2. **`my-sections.tsx`**: 전역 저장소 삭제 → 다시 컴포넌트 안 `useState`(편집기별). `key={storeId}`로 몰이 바뀌면 새로 만듦. 늦은 응답 보호 = 요청 번호(`req`)·살아 있음(`alive`) — 넣기 목록·저장·지우기 응답은 `latest(id)`일 때만 반영, 창 닫기·다시 열기는 번호를 올려 앞 응답을 버림. 저장·지우기는 `finally`에서 「처리 중」 해제(살아 있을 때). `safe()` 서버 오류 보호(`5bfed663d`)·`prepareInsert` 다른 몰 출처 신상품화 그대로.
3. **회귀 시험(`tests/my-sections.test.mjs` +2)**: 화면 컴포넌트는 node 시험에서 못 그려 소스 구조로 고정 — 고정 overrides·화살표 함수 금지·컨텍스트로 최신값·`key={storeId}` / 전역 상태 금지·`latest(id)` 3곳·`finally` 2곳·`close`·`NET_FAIL`·`prepareInsert` 유지.

## 검증
| 완료 조건 | 결과 |
|---|---|
| 타입 | `tsc --noEmit` 0 |
| 시험 | 전체 422/422(내 섹션 5/5) |
| 같은 몰 넣기 안내(Lab 소매몰, ego) | 창 열린 채 「블록 1개를 … 넣었습니다」, 블록 1 → 2 |
| 다른 몰 넣기 안내(도매몰) | 창 열린 채 성공 문구, 5 → 6. 출처 신상품화 문구는 `prepareInsert` 그대로(시험 + FRONT-03 실화면에서 표시 확인) — 이번엔 공지 1블록이라 그 문구 대상 아님 |
| A → B → A | B 진입 때 창 닫힌 처음 상태, B에서 창 연 채 A로 돌아와도 닫힌 처음 상태(옛 상태 안 살아남) |
| 같은 몰 편집기 새 진입 | 창 연 채 새로고침 → 닫힌 처음 상태 |
| 늦은 비동기 응답 | 3초 지연에서 넣기 열고 바로 닫은 뒤 저장 창 열고 6초 대기 → 저장 창 그대로(목록·오류 끼어듦 없음). 한계: 늦은 응답의 실제 도착 시각은 따로 기록하지 않음 |
| 예외 후 처리 중 해제 | 네트워크 끊고 저장 → 「서버와 연결이 끊겼습니다…」, 저장 단추 다시 눌림(`disabled=false`) |
| 중복 삽입 없음 | 넣기 1번당 섹션 블록 수만큼만 증가(1→2, 5→6) |
| 저장·게시 기존 동작 | 실제로 누르지 않음(지시). 정적: 같은 단추 마크업·`disabled={c.pending}`·`c.run("save"/"publish")`, 최신 `run`은 컨텍스트로 렌더마다 갱신 |
| 정리 | 시험 섹션 삭제, Lab `mall_builder_sections` 0건(직접 조회), 네트워크 조건 원복, 두 몰 초안 저장·게시 안 누름 |

## 남은 것
- 미배포 대기(프론트): `5bfed663d` · `7ed5880ef` · `674caa54e` · `685fed7da`(674는 685로 대체됨 — 함께 나가면 됨).
- 비용: 없음.
