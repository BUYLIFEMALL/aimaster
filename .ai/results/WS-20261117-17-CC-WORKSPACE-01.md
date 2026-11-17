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
