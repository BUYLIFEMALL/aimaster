"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Remotion·Mediabunny는 이 화면에서만 불러온다(다른 화면 무게 그대로). 브라우저 전용이라 서버 렌더를 끈다.
const EditStudio = dynamic(() => import("@/components/edit/EditStudio").then((m) => m.EditStudio), {
  ssr: false,
  loading: () => <p className="text-sm text-zinc-500">영상 합치기 도구를 불러오는 중…</p>,
});

export function EditLoader() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
      <EditStudio />
    </Suspense>
  );
}
