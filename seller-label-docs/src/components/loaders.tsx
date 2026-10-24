"use client";

// 도구 화면은 브라우저 전용 라이브러리(바코드·QR·PDF)를 쓰므로 서버에서 미리 그리지 않고 브라우저에서만 불러온다.
import dynamic from "next/dynamic";

function Loading() {
  return <div className="slw-card p-8 text-center text-sm text-slate-600">도구를 불러오는 중입니다…</div>;
}

export const LabelToolLoader = dynamic(() => import("@/components/label/LabelTool"), { ssr: false, loading: Loading });
export const QrToolLoader = dynamic(() => import("@/components/qr/QrTool"), { ssr: false, loading: Loading });
export const RenameToolLoader = dynamic(() => import("@/components/rename/RenameTool"), { ssr: false, loading: Loading });
