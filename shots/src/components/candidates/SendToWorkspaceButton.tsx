"use client";

import { useState } from "react";

// U10 유튜브(2026-11-12, 업무 워크스페이스 담당 작성): 올린 기록 한 건 → 업무 워크스페이스 「받은 업무」.
// 붙이는 곳은 영상 담당이 정함(PostingSection 「올린 기록」 옆). 예: <SendToWorkspaceButton videoId={video.id} youtubeId={u.videoId} />
export function SendToWorkspaceButton({ videoId, youtubeId }: { videoId: string; youtubeId?: string }) {
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
        body: JSON.stringify({ id: videoId, videoId: youtubeId }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; inboxUrl?: string };
      if (!res.ok) throw new Error(json.error || "업무 워크스페이스로 보내지 못했습니다.");
      setInboxUrl(json.inboxUrl ?? "");
      setMessage("업무 워크스페이스 「받은 업무」로 보냈습니다. 그곳에서 콘텐츠 캘린더에 넣을 수 있습니다.");
      setState("done");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.");
      setState("error");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={state === "sending"}
        onClick={() => void send()}
        className="rounded-md border border-neutral-300 bg-white px-2 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        {state === "sending" ? "보내는 중..." : "📨 업무 워크스페이스로"}
      </button>
      {message && (
        <span className={`text-xs ${state === "error" ? "text-rose-600" : "text-emerald-700"}`}>
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
