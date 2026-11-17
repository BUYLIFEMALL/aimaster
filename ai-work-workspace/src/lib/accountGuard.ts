// 2026-11-17 WS-20261117-17 QA017(Master msg_72c6254fc339): 단독 화면이 「이 계정으로 열었다」고 기대하는 회원 id를 요청 헤더로 보내고,
// /api/rpc/[name]이 실제 로그인 회원(checkProgramAccessApi)과 다르면 명령 실행 전에 409로 돌려보낸다.
// 헤더는 인증 근거가 아니다 — 서버 인가는 그대로이고, 다른 탭에서 계정이 바뀐 화면이 새 계정 자료를 읽거나 쓰지 않게 막는 비교일 뿐.
export const EXPECTED_ACCOUNT_HEADER = "x-aww-expected-account";
export const ACCOUNT_CHANGED_NAME = "AccountChanged";
export const ACCOUNT_CHANGED_MESSAGE = "다른 계정으로 로그인이 바뀌었습니다. 이 화면을 새로고침하면 지금 계정의 자료로 다시 열립니다.";
