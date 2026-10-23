// 2026-10-17 v1.14: 다크 모드 — 선택은 이 기기(localStorage)에만 저장한다.
// "use client" 파일의 상수는 서버 레이아웃에서 문자열로 읽을 수 없어 따로 둔다.
// v1.15: 라이트 / 다크 / 자동(컴퓨터 설정 따라가기) 3가지. 로그인 화면까지 모든 화면에 적용(루트 layout).
export const THEME_KEY = "md-studio-theme";
export type ThemeMode = "light" | "dark" | "auto";

/**
 * 화면을 그리기 전에 테마를 적용하는 짧은 스크립트(깜빡임 방지) — 루트 layout.tsx에서 넣는다.
 * 컴퓨터 설정이 바뀌면 다시 계산하되, 그때마다 저장된 선택을 다시 읽어 "자동"일 때만 따라간다.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_KEY}",q=window.matchMedia("(prefers-color-scheme: dark)"),r=document.documentElement;function f(){var m=localStorage.getItem(k);if(m==="dark"||(m==="auto"&&q.matches))r.dataset.theme="dark";else delete r.dataset.theme}f();q.addEventListener("change",f)}catch(e){}})()`;

export function readThemeMode(): ThemeMode {
  try {
    const m = localStorage.getItem(THEME_KEY);
    return m === "dark" || m === "auto" ? m : "light";
  } catch { return "light"; }
}

/** 선택을 저장하고 바로 적용한다(자동이면 지금 컴퓨터 설정 기준) */
export function applyThemeMode(mode: ThemeMode) {
  try { localStorage.setItem(THEME_KEY, mode); } catch {}
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
}
