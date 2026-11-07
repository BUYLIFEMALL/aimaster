"use client";

import { useState } from "react";

// U10 2차(2026-11-07): 분석 결과 → 「📨 업무 워크스페이스로 보내기」. 서버(/api/work-inbox)가 회원 본인 분석을 읽어 보낸다.
// type "expand"는 키워드 확장(옛 롱테일) 실행 결과.
export function SendToWorkspaceButton({ analysisId, type = "analysis" }: { analysisId: string; type?: "analysis" | "expand" }) {
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
        body: JSON.stringify({ id: analysisId, type }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; inboxUrl?: string };
      if (!res.ok) throw new Error(json.error || "업무 워크스페이스로 보내지 못했습니다.");
      setInboxUrl(json.inboxUrl ?? "");
      setMessage("업무 워크스페이스 「받은 업무」로 보냈습니다. 그곳에서 페이지로 만들 수 있습니다.");
      setState("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={() => void send()} disabled={state === "sending"} className="mx-btn-ghost self-start">
        {state === "sending" ? "보내는 중..." : "📨 업무 워크스페이스로 보내기"}
      </button>
      {message && (
        <p className={`text-xs ${state === "error" ? "text-mx-danger" : "text-mx-muted"}`}>
          {message}
          {state === "done" && inboxUrl && (
            <>
              {" "}
              <a href={inboxUrl} target="_blank" rel="noopener noreferrer" className="underline">
                받은 업무 열기
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
