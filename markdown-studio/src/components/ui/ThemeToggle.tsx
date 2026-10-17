"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_KEY } from "@/lib/theme";

// 2026-10-17 v1.14: 다크 모드 켜기/끄기. 작업실 모든 화면에 함께 적용한다.

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch {}
  }
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-pressed={dark} title={dark ? "밝은 화면으로 바꾸기" : "어두운 화면으로 바꾸기"}>
      {dark ? <Sun size={14} /> : <Moon size={14} />}
      {dark ? "라이트 모드" : "다크 모드"}
    </button>
  );
}
