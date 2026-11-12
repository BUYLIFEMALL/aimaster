"use client";
import { useState } from "react";

// U10 유튜브(2026-11-13, 업무 워크스페이스 담당): 올린 기록 한 건 → 업무 워크스페이스 「받은 업무」(서버가 회원 본인 기록을 다시 읽어 보냄).
export function SendToWorkspaceButton({ videoId }: { videoId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [inboxUrl, setInboxUrl] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/work-inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId }) });
      const j = (await res.json().catch(() => ({}))) as { error?: string; inboxUrl?: string };
      if (!res.ok) throw new Error(j.error || "업무 워크스페이스로 보내지 못했습니다.");
      setInboxUrl(j.inboxUrl ?? "");
      setMessage("받은 업무로 보냈습니다. 그곳에서 콘텐츠 캘린더에 넣을 수 있습니다.");
      setState("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <button type="button" disabled={state === "sending"} onClick={() => void send()} className="text-[11px] px-2.5 py-1 rounded-lg border border-[#333] text-[#ddd] hover:border-[#555] disabled:opacity-50">
        {state === "sending" ? "보내는 중…" : "📨 업무 워크스페이스로"}
      </button>
      {message && (
        <span className={`text-[11px] ${state === "error" ? "text-rose-400" : "text-emerald-400"}`}>
          {message}
          {state === "done" && inboxUrl && <> <a href={inboxUrl} target="_blank" rel="noopener noreferrer" className="underline">받은 업무 열기</a></>}
        </span>
      )}
    </div>
  );
}
