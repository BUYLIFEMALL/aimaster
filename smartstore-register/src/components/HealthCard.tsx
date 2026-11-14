"use client";

import { useEffect, useRef, useState } from "react";
import { getLatestHealthAction, requestHealthCheckAction, type HealthView } from "@/lib/actions/health";
import { ExtensionPresence } from "@/components/ExtensionPresence";

/** 판매자센터 화면 점검 카드 — 확장이 7일마다(또는 「지금 점검」) 상품 등록 화면을 읽기만 해서 확장이 쓰는 칸이 그대로 있는지 확인 */
export function HealthCard({ initial }: { initial: HealthView | null }) {
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState(initial?.status === "queued" || initial?.status === "running");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function poll(started: number) {
    timer.current = setTimeout(async () => {
      const v = await getLatestHealthAction();
      setView(v);
      if (v && (v.status === "queued" || v.status === "running") && Date.now() - started < 5 * 60_000) poll(started);
      else setBusy(false);
    }, 4000);
  }
  useEffect(() => { if (busy) poll(Date.now()); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    setBusy(true);
    const r = await requestHealthCheckAction();
    if (r.error) { setBusy(false); return; }
    setView(await getLatestHealthAction());
    poll(Date.now());
  }

  const when = view ? new Date(view.at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  const s = view?.status;
  return (
    <div className="slw-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#6B7280]">판매자센터 화면 점검</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${s === "ok" ? "bg-[rgba(3,199,90,0.12)] text-[#03C75A]" : s === "changed" ? "bg-rose-50 text-rose-700" : s === "failed" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
          {s === "ok" ? "HEALTH OK" : s === "changed" ? "CHANGED" : s === "failed" ? "FAILED" : "STANDBY"}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-black ${s === "ok" ? "text-[#03C75A]" : s === "changed" ? "text-rose-700" : s === "failed" ? "text-amber-700" : "text-[#111827]"}`}>
        {!view ? "아직 안 함" : s === "ok" ? "LIVE NORMAL" : s === "changed" ? `⚠️ 바뀐 칸 ${view.missing.length}개` : s === "failed" ? "점검 실패" : "점검 중…"}
      </p>
      {view && <p className="mt-1 text-[11px] text-[#9CA3AF]">{when}{view.storeName ? ` · ${view.storeName}` : ""}</p>}
      {s === "changed" && <p className="mt-1 text-[11px] text-rose-700">판매자센터 화면이 바뀌어 확장이 찾지 못하는 칸: {view!.missing.join(", ")} — 등록 결과를 꼭 확인해 주세요. 담당자가 확장을 고칩니다.</p>}
      {s === "failed" && view?.error && <p className="mt-1 text-[11px] text-amber-700">{view.error}</p>}
      <div className="mt-2 flex items-center justify-between text-xs">
        <ExtensionPresence compact />
        <button type="button" onClick={run} disabled={busy} className="font-bold text-[#03C75A] hover:underline disabled:opacity-50 whitespace-nowrap">
          {busy ? "점검 중…" : "지금 점검 →"}
        </button>
      </div>
      <p className="mt-1 text-[10px] text-[#9CA3AF]">확장이 7일마다 자동으로 점검합니다.</p>
    </div>
  );
}
