"use client";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyThemeMode, readThemeMode, type ThemeMode } from "@/lib/theme";

// 2026-10-17 v1.14: 다크 모드 켜기/끄기. 작업실 모든 화면에 함께 적용한다.
// v1.15: 라이트 / 다크 / 자동(컴퓨터 설정 따라가기) 세 칸 선택으로 바꿈.
const OPTIONS: { mode: ThemeMode; label: string; title: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "라이트", title: "밝은 화면", Icon: Sun },
  { mode: "dark", label: "다크", title: "어두운 화면", Icon: Moon },
  { mode: "auto", label: "자동", title: "컴퓨터의 화면 설정(밝게·어둡게)을 그대로 따라갑니다", Icon: Monitor },
];

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");
  useEffect(() => { setMode(readThemeMode()); }, []);
  return (
    <span className="theme-toggle" role="group" aria-label="화면 테마">
      {OPTIONS.map(({ mode: m, label, title, Icon }) => (
        <button key={m} type="button" aria-pressed={mode === m} title={title}
          onClick={() => { setMode(m); applyThemeMode(m); }}>
          <Icon size={13} aria-hidden="true" />
          <span className="theme-label">{label}</span>
        </button>
      ))}
    </span>
  );
}
