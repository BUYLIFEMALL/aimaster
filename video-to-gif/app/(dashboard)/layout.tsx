export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link href="/dashboard" className="font-black">Video<span className="text-amber-500">ToGIF</span></Link><span className="text-xs text-slate-500">상세페이지 GIF 자동화</span></div></header>{children}</div>;
}
