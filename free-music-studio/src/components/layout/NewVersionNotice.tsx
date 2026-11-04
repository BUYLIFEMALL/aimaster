"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

/**
 * 새 판이 배포됐는데 이 탭은 예전 판이면 「새 판 vX.YY · 새로고침」(2026-11-04 주인님 마스터PC: 탭이 v1.13에 머물러 새 기능이 안 보임).
 * 이 사이트는 처음 연 뒤 메뉴를 옮겨도 새로 불러오지 않아, 탭을 오래 켜 두면 예전 판이 남는다. 10분마다·탭으로 돌아올 때 확인한다.
 */
export function NewVersionNotice() {
  const [latest, setLatest] = useState("");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const v = r.ok ? ((await r.json()) as { version?: string }).version : "";
        if (alive && v && v !== APP_VERSION) setLatest(v);
      } catch {}
    };
    void check();
    const t = setInterval(check, 10 * 60_000);
    const onFocus = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  if (!latest) return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-3 flex w-full items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-2 text-left text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20"
    >
      <RefreshCw size={13} className="shrink-0" /> 새 판 {latest}이 나왔습니다 · 눌러서 새로고침
    </button>
  );
}
