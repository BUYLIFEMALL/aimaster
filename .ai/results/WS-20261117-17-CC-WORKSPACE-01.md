# WS-20261117-17 영수증·세금계산서 왼쪽 메인 메뉴 — CC-WORKSPACE-01 (ready_review)

- 주인님 직접 지시(2026-11-17): 「이 페이지도 좌측에 메인 메뉴 보이게 처리해줘」, 「좌측에 메인 메뉴 보이게 해줘」(운영 캡처 `ai-work-workspace.buylife.xyz/receipts`). Master msg_31221254104e 배정.
- 커밋: `9d6875e4b` (7파일, +129/−2). 미배포 묶음.
- 변경
  - `src/litpage/web/lib/router.ts`: `{ name: 'receipts'; domain }`, SPECIAL에 `receipts`, `/<domain>/receipts` 해석.
  - `src/litpage/web/features/shell/Workspace.tsx`: `case 'receipts'` → `ReceiptsView`(워크스페이스 본문 영역, 왼쪽 메뉴 유지).
  - 새 `src/litpage/web/features/receipts/ReceiptsView.tsx`: 기존 브라우저 컴포넌트 `src/app/receipts/ReceiptsBoard.tsx` 그대로 재사용(회원 인가 `/api/rpc/rcpt*`), 머리글만 별도 페이지와 같게. 「워크스페이스로 돌아가기」 없음.
  - 새 `receiptsView.css`: `.aww-guide`(전체 높이·자체 스크롤)를 본문 영역에 맞춤, 767px 이하 여백 축소, 인쇄 때 이 화면이 열려 있을 때만 왼쪽 메뉴 숨김(`body:has(.aww-receipts-view)`).
  - `src/litpage/web/features/shell/AimasterSidebar.tsx`: 영수증 링크를 `/<domain>/receipts`로(SPA 이동, Ctrl/Shift 클릭은 기본 동작). 워크스페이스 미확정이면 기존 `/receipts`.
  - 기존 `/receipts` 페이지 보존(변경 0). 서버·API·DB·권한 로직 변경 0.
- 자료 범위: 영수증 rpc는 기존과 같은 회원 단위 → 워크스페이스 전환 시 다른 회원 자료 노출 없음(기존 동작 그대로).
- 시험(DB 없음, 관련 3파일만): `receiptsRoute`(3, 새로고침·끝 슬래시·기존 주소 회귀), `receiptsViewDom`(1, jsdom에 실제 ReceiptsBoard 마운트·rcpt* 호출만), `studioRoute`(3) → 7/7 통과. tsc 전체·빌드·전체 시험·3457 재시작 0(메모리 보류 지시).
- 남은 것: 실화면 미확인(로컬 3457 보류) — 데스크톱/375px 왼쪽 메뉴·접힘, 뒤로가기, 인쇄, ko/en(ReceiptsBoard 자체는 한국어 고정, 기존과 같음). 같은 형태의 별도 페이지(`/inbox`·`/calendar-sync`·`/guide`·`/settings/keys`·`/settings/public-pages`)도 메뉴가 없으나 이번 지시 범위 밖 — 필요하면 같은 방식으로.

## QA017 P1/P2 수정(Master msg_a9f4e95d8c12, Mac msg_7ba69f851b09) — ready_review
- 커밋 `792be25a9`(7파일 +179/−23). 미배포 묶음, 실화면 미확인.
- P1 계정 전환: `src/app/receipts/ReceiptsBoard.tsx`에 `accountKey`(워크스페이스 안=세션 `userId`, 별도 `/receipts`=서버 `requireProgramAccess()`의 `user.id`). 불러온 자료에 계정 표시를 붙여 지금 계정 것만 그림(A→B·로그아웃 즉시 숨김), 요청 번호로 늦은 이전 성공·실패와 화면 해제 뒤 응답 무시(StrictMode 정리 포함), 계정 변경 때 알림·인쇄 대기·탭 안 상태(`.rc` key) 초기화. `ReceiptsView`는 로그아웃이면 보드를 그리지 않고 회원별로 새로 만듦. 서버 인가·user_id·자료 범위 변경 0.
- P2 워크스페이스 주소: 새 `src/litpage/web/features/shell/routeSpace.ts` `spaceForDomainRoute()`(receipts 경로만, 내 워크스페이스 domain일 때만 그 공간 id) → `Workspace.tsx` 효과에서 `setSpace`(사이드바 함께). home·page·studio는 기존 효과 그대로.
- 시험(수정 전 실패 → 후 통과, DB 없음): `receiptsViewDom` 7(A→B 늦은 A, 로그아웃 즉시 숨김, 해제 뒤 응답, StrictMode, 공용 보드 accountKey A→B 즉시 숨김, 늦은 A 실패 알림 0) — 수정 전 5개 실패, `receiptsRouteSpace` 3 — 수정 전 모듈 없음 실패. 함께 `receiptsRoute` 3·`studioRoute` 3 → 4파일 16/16 통과. 참고: P2 시험은 상대 경로 import가 vitest에서 풀리지 않아(원인 미확인) `@/` 별칭으로 불러옴.
- 한계: 별도 `/receipts`에서 다른 탭으로 계정을 바꾼 경우는 페이지를 새로 열 때까지 기존 화면이 남음(서버가 그린 회원 id 기준). tsc 전체·빌드·전체 시험·3457 재시작 0.
