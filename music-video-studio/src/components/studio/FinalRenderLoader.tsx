"use client";

import dynamic from "next/dynamic";

// Remotion·Mediabunny는 장면 화면의 이 칸에서만 불러온다(다른 화면 무게 그대로). 브라우저 전용이라 서버 렌더를 끈다.
export const FinalRenderLoader = dynamic(() => import("@/components/studio/FinalRender").then((m) => m.FinalRender), {
  ssr: false,
  loading: () => <p className="text-xs text-slate-500">최종 뮤직비디오 만들기 도구를 불러오는 중…</p>,
});
