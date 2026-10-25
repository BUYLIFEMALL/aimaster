"use client";

// 오늘 수집 사용량(v1.28 — 하루 상한에 닿으면 「지금 수집」이 쉬어서 「왜 안 되지?」가 되던 문제). 이 브라우저의 확장에 숫자만 물어본다.
import { useEffect, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";

type Usage = { pagesToday: number; maxPages: number; limitToday: boolean };

export default function DailyUsage() {
  const [u, setU] = useState<Usage | null>(null);
  useEffect(() => {
    void askExtension<{ ok?: boolean; connected?: boolean; usage?: Usage }>("ping", 2500).then((p) => {
      if (p?.connected && p.usage) setU(p.usage);
    });
  }, []);
  if (!u) return null;
  const pct = Math.min(100, Math.round((u.pagesToday / u.maxPages) * 100));
  return (
    <div className={`ra-usage${u.limitToday ? " full" : ""}`}>
      <span>📶 오늘 수집 사용량 <b>{u.pagesToday}/{u.maxPages}페이지</b></span>
      <span className="ra-usage-bar"><i style={{ width: `${pct}%` }} /></span>
      <span>{u.limitToday ? "오늘 한도에 닿아 쉬어요 — 내일 0시에 다시 시작해요" : "네이버 이용 제한을 막으려고 하루 상한을 둬요"}</span>
    </div>
  );
}
