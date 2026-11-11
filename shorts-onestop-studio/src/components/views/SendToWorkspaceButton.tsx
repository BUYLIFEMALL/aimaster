"use client";
import { useState } from "react";

// U10 유튜브(2026-11-12, 업무 워크스페이스 담당): 올린 기록 한 건 → 업무 워크스페이스 「받은 업무」(서버가 회원 본인 기록을 다시 읽어 보냄).
export function SendToWorkspaceButton({ projectId, youtubeId }: { projectId: string; youtubeId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [inboxUrl, setInboxUrl] = useState("");

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/work-inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: projectId, videoId: youtubeId }) });
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
    <span className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" className="ghost" disabled={state === "sending"} onClick={() => void send()} style={{ fontSize: 12, padding: "2px 8px" }}>
        {state === "sending" ? "보내는 중…" : "📨 업무 워크스페이스로"}
      </button>
      {message && (
        <small className="muted" style={{ color: state === "error" ? "#f87171" : undefined }}>
          {message}
          {state === "done" && inboxUrl && <> <a href={inboxUrl} target="_blank" rel="noopener noreferrer">받은 업무 열기</a></>}
        </small>
      )}
    </span>
  );
}
