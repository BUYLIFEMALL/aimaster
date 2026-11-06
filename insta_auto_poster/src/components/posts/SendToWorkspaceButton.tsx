"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

// U10(2026-11-06): 게시글 상세 → 「📨 업무 워크스페이스로 보내기」. 서버(/api/work-inbox)가 회원 본인 행을 읽어 보낸다.
export function SendToWorkspaceButton({ postId }: { postId: string }) {
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
        body: JSON.stringify({ id: postId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; inboxUrl?: string };
      if (!res.ok) throw new Error(json.error || "업무 워크스페이스로 보내지 못했습니다.");
      setInboxUrl(json.inboxUrl ?? "");
      setMessage("업무 워크스페이스 「받은 업무」로 보냈습니다. 그곳에서 콘텐츠 캘린더에 넣거나 페이지로 만들 수 있습니다.");
      setState("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="secondary" disabled={state === "sending"} onClick={() => void send()}>
        {state === "sending" ? "보내는 중..." : "📨 업무 워크스페이스로 보내기"}
      </Button>
      {message && (
        <p className={`text-xs ${state === "error" ? "text-rose-400" : "text-emerald-400"}`}>
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
