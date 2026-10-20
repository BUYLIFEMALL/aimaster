"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { connectYoutubeAction, disconnectYoutubeAction, type ConnectYoutubeState } from "@/lib/actions/youtube";

// 유튜브 채널 연결 상태 + 연결/다시 연결/해제 버튼(설정 화면·영상 화면 공용, 2026-10-21 v1.29).
// 예전엔 버튼이 상태 표시와 같은 작은 알약 모양이고 설정 화면엔 없어 찾기 어려웠다(주인님 지적).
export function YoutubeConnectCard({ connected, channelTitle, needsReconnect, returnTo }: {
  connected: boolean; channelTitle: string | null; needsReconnect: boolean; returnTo: string;
}) {
  const [state, connectAction, isConnecting] = useActionState(connectYoutubeAction, {} as ConnectYoutubeState);
  const tone = !connected ? "border-neutral-300 bg-neutral-50" : needsReconnect ? "border-amber-300 bg-amber-50" : "border-green-300 bg-green-50";
  return (
    <div className={`rounded-xl border-2 p-3 ${tone}`}>
      <p className="text-sm font-semibold text-neutral-900">
        {!connected ? "⚪ 유튜브 채널이 연결되어 있지 않습니다" : needsReconnect ? "⚠️ 유튜브 연결이 만료되었습니다" : `✅ 연결됨${channelTitle ? ` — ${channelTitle}` : ""}`}
      </p>
      <p className="mt-0.5 text-xs text-neutral-600">
        {!connected ? "채널을 연결해야 완성 영상을 유튜브에 올릴 수 있습니다." : needsReconnect ? "아래 「다시 연결하기」를 눌러 구글 계정을 다시 허용해 주세요." : "이 채널로 영상을 올립니다. 다른 채널로 바꾸려면 다시 연결하세요."}
      </p>
      <form action={connectAction} className="mt-3 space-y-2">
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="flex items-start gap-2 text-xs text-neutral-600">
          <input type="checkbox" name="withShared" value="1" className="mt-0.5" />
          <span>유튜브 댓글 자동화 권한도 함께 받기 — 한 번 연결로 함께 씁니다(같은 Google 앱)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant={connected && !needsReconnect ? "secondary" : undefined} disabled={isConnecting}>
            {isConnecting ? "연결 중..." : !connected ? "채널 연결하기" : "다시 연결하기"}
          </Button>
          {connected && (
            <button type="submit" formAction={disconnectYoutubeAction} formNoValidate
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              연결 해제
            </button>
          )}
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
