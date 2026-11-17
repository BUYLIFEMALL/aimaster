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

## QA017 잔여 — 서버 기대 계정 검사 + 초안 계정 묶음(Master msg_72c6254fc339·msg_2a511e8f8193) — ready_review
- 커밋 `7485791ec`(12파일 +316/−31). 미배포 묶음, 실화면 미확인.
- 서버: `src/app/api/rpc/[name]/route.ts` — `checkProgramAccessApi()` 직후 `x-aww-expected-account`(새 `src/lib/accountGuard.ts`)가 있고 `access.user.id`와 다르면 409 `AccountChanged` 고정 문구·`private, no-store`, 본문 읽기·`loadMemberAiKeys`·`warmModelLists`·`runRpc`·`after/afterRpc` 전에 반환. 헤더 없는 기존 호출 그대로. 헤더는 인증 근거 아님(인가 그대로).
- 클라이언트: `src/lib/standaloneRpc.ts` `rpc(name, body, { expectedAccount })` 선택 옵션, 409 → `AccountChangedError`. 새 `src/app/receipts/receiptRpc.ts` 컨텍스트로 `ReceiptsBoard`·`BoltaPanel`·`AmendPanel`의 모든 rcpt*/bt* 요청에 보드 `accountKey` 전달(전역 변수 0). 409면 보드가 옛 자료·쓰기·인쇄를 숨기고 새로고침 안내만(B 자료 자동 전환·옛 입력 전송 0).
- 초안: **범위 추가 보고** — `src/app/inbox/page.tsx`·`InboxBoard.tsx`가 서버 확인 `user.id`를 받아 초안에 `account`를 넣고 `rcptReadText`에도 기대 계정 전달(작성 계정 확인을 위해 필요). 영수증 쪽 `takeDraft(accountKey)`는 같은 계정 초안만 꺼내 쓰고 지움, 계정 표시 없는 이전 형식·다른 계정 초안은 쓰지 않고 그대로 둠. 초안·탭·알림은 계정 변경 때 초기화(첫 열기와 구분, StrictMode 두 번 실행 안전).
- 시험(DB·실네트워크 0, 관련 6파일 33/33): `rpcAccountGuard` 6(실제 POST 처리기, rcptState·rcptSaveEvidence·btIssue·btAmend 불일치 409와 runRpc/AI/모델/after 0, 같은 계정 정상, 헤더 없는 회귀), `standaloneRpcAccount` 3, `receiptsViewDom` 15(기대 계정 전달, 409 숨김, 볼타 요청 기대 계정, 세 파일 직접 rpc 금지, A 초안→B 입력칸 A 값 0·B 요청만, 다른 계정·이전 형식 초안 미사용·보존, StrictMode 초안), `receiptsRouteSpace` 3, `receiptsRoute` 3, `studioRoute` 3. 수정 전: 새 시험 3파일 모두 모듈 없음으로 실패(행동 단위 수정 전 실패는 초안 시험에 대해 따로 돌리지 않음).
- 한계: 실제 발급·운영 DB·3457·전체 tsc·빌드 0. 409 뒤 「새로고침」은 페이지 전체 다시 열기.
