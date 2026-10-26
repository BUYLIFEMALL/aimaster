"use client";

import { useActionState } from "react";
import { connectYoutubeAction, disconnectYoutubeAction, type ConnectYoutubeState } from "@/lib/actions/youtube";

// 유튜브 채널 연결 상태 + 3D 엠보싱 버튼 (설정 화면·영상 화면 공용)
export function YoutubeConnectCard({ connected, channelTitle, needsReconnect, returnTo }: {
  connected: boolean; channelTitle: string | null; needsReconnect: boolean; returnTo: string;
}) {
  const [state, connectAction, isConnecting] = useActionState(connectYoutubeAction, {} as ConnectYoutubeState);
  const tone = !connected 
    ? "border-[#202945] bg-[#161c33]" 
    : needsReconnect 
    ? "border-amber-500/50 bg-amber-950/30" 
    : "border-emerald-500/50 bg-emerald-950/30";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <p className="text-sm font-bold text-white flex items-center gap-2">
        {!connected ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>유튜브 채널이 연결되어 있지 않습니다</span>
          </>
        ) : needsReconnect ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300">⚠️ 유튜브 연결이 만료되었습니다</span>
          </>
        ) : (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-300">✅ 연결됨{channelTitle ? ` — ${channelTitle}` : ""}</span>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {!connected ? "채널을 연결해야 완성 영상을 유튜브에 올릴 수 있습니다." : needsReconnect ? "아래 「다시 연결하기」를 눌러 구글 계정을 다시 허용해 주세요." : "이 채널로 영상을 올립니다. 다른 채널로 바꾸려면 다시 연결하세요."}
      </p>
      <form action={connectAction} className="mt-3.5 space-y-2.5">
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
          <input type="checkbox" name="withShared" value="1" className="mt-0.5 rounded border-slate-700 bg-[#0f1325]" />
          <span>유튜브 댓글 자동화 권한도 함께 받기 — 한 번 연결로 함께 씁니다 (같은 Google 앱)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="submit"
            disabled={isConnecting}
            className={connected && !needsReconnect ? "btn-3d-dark px-4 py-2 text-xs font-bold" : "btn-3d-rec px-4 py-2 text-xs font-black"}
          >
            {isConnecting ? "연결 중..." : !connected ? "유튜브 채널 연결하기" : "다시 연결하기"}
          </button>
          {connected && (
            <button
              type="submit"
              formAction={disconnectYoutubeAction}
              formNoValidate
              className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900/60 hover:text-white transition-colors"
            >
              연결 해제
            </button>
          )}
        </div>
        {state.error && <p className="text-xs text-rose-400 font-semibold">{state.error}</p>}
      </form>
    </div>
  );
}
