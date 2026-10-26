"use client";

import { useCallback, useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";

// 웹 ↔ 확장: 이 화면에서만 web-bridge.js와 postMessage로 대화한다(같은 주소끼리만). 토큰은 웹에 오지 않는다.
const DOWNLOAD = "/downloads/smartstore-register-extension-latest.zip";

function ask(type: "ping" | "connect", extra: Record<string, string> = {}, timeout = 1500): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || e.origin !== location.origin) return;
      const d = e.data as { source?: string; requestId?: string; result?: Record<string, unknown> };
      if (d?.source !== "ssr-extension" || d.requestId !== requestId) return;
      window.removeEventListener("message", onMsg);
      resolve(d.result ?? null);
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ source: "ssr-app", type, requestId, ...extra }, location.origin);
    setTimeout(() => { window.removeEventListener("message", onMsg); resolve(null); }, timeout);
  });
}

export function ExtensionConnect() {
  const [installed, setInstalled] = useState<{ version: string; connected: boolean } | null | undefined>(undefined);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    const r = await ask("ping");
    setInstalled(r ? { version: String(r.version ?? ""), connected: r.connected === true } : null);
  }, []);
  useEffect(() => { void check(); }, [check]);

  async function connect() {
    setBusy(true); setNote(null);
    try {
      const res = await fetch("/api/extension/auth", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "연결 번호를 받지 못했습니다.");
      const r = await ask("connect", { code: json.pairCode }, 15000);
      if (!r) throw new Error("확장이 응답하지 않습니다. 확장을 설치·새로고침한 뒤 이 화면도 새로고침해 주세요.");
      if (r.ok !== true) throw new Error(String(r.error ?? "연결하지 못했습니다."));
      setNote("✅ 연결했습니다. 이제 「등록할 상품」에서 확장으로 보내면, 스마트스토어센터에 로그인된 이 크롬에서 칸을 채웁니다.");
      await check();
    } catch (e) { setNote(e instanceof Error ? e.message : "연결하지 못했습니다."); } finally { setBusy(false); }
  }

  const outdated = installed?.version && installed.version !== APP_VERSION;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="slw-card p-4">
          <p className="text-[11px] font-black text-emerald-700">STEP 1</p>
          <p className="mt-1 font-extrabold text-slate-900">⬇️ 확장 내려받기</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">ZIP을 받아 압축을 풀고, 크롬 주소창에 <code>chrome://extensions</code> → 오른쪽 위 「개발자 모드」 켜기 → 「압축해제된 확장 프로그램을 로드합니다」로 푼 폴더를 고릅니다.</p>
          <a href={DOWNLOAD} className="slw-primary mt-3 w-full">⬇️ 확장 ZIP 받기 ({APP_VERSION})</a>
        </div>
        <div className="slw-card p-4">
          <p className="text-[11px] font-black text-emerald-700">STEP 2</p>
          <p className="mt-1 font-extrabold text-slate-900">🔎 설치 확인</p>
          <p className="mt-2 text-sm font-bold">
            {installed === undefined ? "확인 중…" : installed ? <span className="text-emerald-700">설치됨 · {installed.version}{installed.connected ? " · 연결됨" : ""}</span> : <span className="text-amber-700">설치되지 않았거나 이 화면을 새로고침해야 합니다</span>}
          </p>
          {outdated && <p className="mt-1 text-xs font-bold text-rose-700">새 버전({APP_VERSION})이 있습니다. ZIP을 다시 받아 같은 폴더에 덮어쓰고 확장을 새로고침해 주세요.</p>}
          <button type="button" onClick={() => void check()} className="slw-btn mt-3 w-full">🔄 다시 확인</button>
        </div>
        <div className="slw-card p-4">
          <p className="text-[11px] font-black text-emerald-700">STEP 3</p>
          <p className="mt-1 font-extrabold text-slate-900">🔗 내 계정과 연결</p>
          {installed?.connected ? (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-sm font-extrabold text-emerald-800">✅ 내 계정과 연결됨</p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">버튼 한 번이면 이 계정 전용 연결 번호(10분)를 만들어 확장에 넘깁니다. 비밀번호·판매자 키는 쓰지 않습니다.</p>
          )}
          <button type="button" onClick={() => void connect()} disabled={busy || !installed} className={`${installed?.connected ? "slw-btn" : "slw-primary"} mt-3 w-full`}>{busy ? "연결 중…" : installed?.connected ? "🔄 다시 연결하기" : "🔗 확장 연결하기"}</button>
        </div>
      </div>
      {note && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-bold text-emerald-900">{note}</p>}
    </div>
  );
}
