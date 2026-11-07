"use client";

import { useEffect, useState } from "react";

// U10 2차(2026-11-07): 분석 결과 → 「📨 워크스페이스로」. 서버(/api/work-inbox)가 회원 본인 기록을 읽어 보낸다(AI 호출 없음).
export function SendToWorkspaceButton({ reportId }: { reportId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [inboxUrl, setInboxUrl] = useState("");
  useEffect(() => { setState("idle"); setMessage(""); }, [reportId]);

  async function send() {
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/work-inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: reportId }) });
      const json = (await res.json().catch(() => ({}))) as { error?: string; inboxUrl?: string };
      if (!res.ok) throw new Error(json.error || "업무 워크스페이스로 보내지 못했습니다.");
      setInboxUrl(json.inboxUrl ?? "");
      setMessage("업무 워크스페이스 「받은 업무」로 보냈습니다.");
      setState("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.");
      setState("error");
    }
  }

  return (
    <>
      <button type="button" className="kw-mini" disabled={state === "sending"} onClick={() => void send()} title="이 분석 결과를 업무 워크스페이스 「받은 업무」로 보냅니다(그곳에서 페이지로 만들기)">
        {state === "sending" ? "보내는 중..." : state === "done" ? "✓ 워크스페이스로 보냄" : "📨 워크스페이스로"}
      </button>
      {message && (
        <span className={state === "error" ? "error" : "muted"} role="status">
          {message}
          {state === "done" && inboxUrl && (
            <>
              {" "}
              <a href={inboxUrl} target="_blank" rel="noopener noreferrer">받은 업무 열기</a>
            </>
          )}
        </span>
      )}
    </>
  );
}
