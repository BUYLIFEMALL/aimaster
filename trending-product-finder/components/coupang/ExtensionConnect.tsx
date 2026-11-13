"use client";

import { useEffect, useState } from "react";
import { createExtensionConnectTokenAction } from "@/lib/actions/coupangResults";
import { askExtension } from "@/lib/extensionBridge";


type Ping = { ok: boolean; version: string; connected: boolean };

export function ExtensionConnect() {
  const [ping, setPing] = useState<Ping | null | undefined>(undefined);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    askExtension<Ping>("ping", 1200).then(setPing);
  }, []);

  async function connect() {
    setBusy(true);
    setMessage("");
    const { token, error } = await createExtensionConnectTokenAction();
    if (!token) {
      setMessage(error ?? "연결하지 못했습니다.");
      setBusy(false);
      return;
    }
    const result = await askExtension<{ ok: boolean; error?: string }>("connect", 3000, { token });
    setBusy(false);
    if (!result?.ok) {
      setMessage(result?.error ?? "확장 프로그램을 찾지 못했습니다. 설치 뒤 이 화면을 새로고침해 주세요.");
      return;
    }
    setPing(await askExtension<Ping>("ping", 1200));
    setMessage("연결했습니다. 이제 읽은 결과가 내 계정에 저장됩니다.");
  }

  const status =
    ping === undefined ? "확인 중" : !ping ? "🔴 확장이 설치되지 않음" : ping.connected ? `🟢 연결됨 · 확장 ${ping.version}` : `🟡 설치됨 · 연결 필요 · 확장 ${ping.version}`;

  return (
    <section className="mx-card flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-mx-text">🔗 내 계정과 연결</p>
        <p className="mt-1 text-xs text-mx-muted">{status}</p>
        {message && <p className="mt-1 text-xs text-[#93c5fd]">{message}</p>}
      </div>
      <button type="button" onClick={connect} disabled={busy || !ping} className="mx-btn-primary shrink-0 whitespace-nowrap px-5 py-3 text-sm font-bold disabled:opacity-50">
        {busy ? "연결 중…" : ping?.connected ? "다시 연결" : "확장 연결하기"}
      </button>
    </section>
  );
}
