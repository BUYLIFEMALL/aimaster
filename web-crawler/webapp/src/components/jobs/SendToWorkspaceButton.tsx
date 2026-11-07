"use client";

import { useState } from "react";

// U10 2차(2026-11-07): 완료된 수집 작업 → 「📨 워크스페이스로」. 서버(/api/work-inbox)가 회원 본인 작업을 읽어 보낸다.
export function SendToWorkspaceButton({ jobId }: { jobId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [inboxUrl, setInboxUrl] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/work-inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; inboxUrl?: string };
      if (!res.ok) throw new Error(json.error || "업무 워크스페이스로 보내지 못했습니다.");
      setInboxUrl(json.inboxUrl ?? "");
      setMessage("업무 워크스페이스 「받은 업무」로 보냈습니다. 그곳에서 표에 행으로 넣을 수 있습니다.");
      setState("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.");
      setState("error");
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void send()}
        disabled={state === "sending"}
        title="이 수집 결과를 업무 워크스페이스 「받은 업무」로 보냅니다"
        className="whitespace-nowrap rounded-lg border border-mx-border px-3 py-1.5 text-xs font-medium text-mx-text hover:bg-mx-raised disabled:opacity-60"
      >
        {state === "sending" ? "보내는 중..." : state === "done" ? "✓ 보냄" : "📨 워크스페이스로"}
      </button>
      {message && (
        <span className={`max-w-xs text-right text-xs ${state === "error" ? "text-red-400" : "text-mx-muted"}`}>
          {message}
          {state === "done" && inboxUrl && (
            <>
              {" "}
              <a href={inboxUrl} target="_blank" rel="noopener noreferrer" className="underline">
                받은 업무 열기
              </a>
            </>
          )}
        </span>
      )}
    </span>
  );
}
