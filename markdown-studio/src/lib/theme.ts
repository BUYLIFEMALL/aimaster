// 2026-10-17 v1.14: 다크 모드 — 선택은 이 기기(localStorage)에만 저장한다.
// "use client" 파일의 상수는 서버 레이아웃에서 문자열로 읽을 수 없어 따로 둔다.
export const THEME_KEY = "md-studio-theme";
/** 화면을 그리기 전에 테마를 적용하는 짧은 스크립트(깜빡임 방지) — (workspace)/layout.tsx에서 넣는다 */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
