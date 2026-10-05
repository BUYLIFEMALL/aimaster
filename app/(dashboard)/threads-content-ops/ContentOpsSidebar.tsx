"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, LayoutDashboard, PenLine, Send, Settings2 } from "lucide-react";
import { APP_VERSION } from "@/threads-content-ops/lib/version";

const flow = [
  { tab: "create", label: "콘텐츠 작성", icon: PenLine },
  { tab: "manage", label: "초안·발행 관리", icon: Send },
];

export default function ContentOpsSidebar({ email }: { email: string }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? "dashboard";
  const href = (tab: string) => `/threads-content-ops${tab === "dashboard" ? "" : `?tab=${tab}`}`;
  return <aside className="hidden w-60 shrink-0 self-start rounded-2xl border border-white/10 bg-surface md:flex md:min-h-[calc(100vh-8rem)] md:flex-col">
    <div className="border-b border-white/10 p-5"><p className="text-lg font-bold text-white">Threads 운영 자동화</p><p className="mt-1 text-xs text-gold">{APP_VERSION}</p><Link className="mt-2 block text-xs text-subtext hover:text-white" href="/dashboard">← 다른 프로그램 보기</Link></div>
    <nav className="flex-1 p-3"><Link href={href("dashboard")} className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active === "dashboard" ? "bg-gold/10 text-gold" : "text-subtext hover:bg-white/5 hover:text-white"}`}><LayoutDashboard size={16} />대시보드</Link><div className="relative">{flow.map(({ tab, label, icon: Icon }, index) => <Link key={tab} href={href(tab)} className="group relative flex gap-3 pb-2"><div className="flex flex-col items-center"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${active === tab ? "bg-gold text-black" : "bg-white/10 text-subtext group-hover:bg-white/15"}`}>{index + 1}</span>{index < flow.length - 1 && <span className="mt-1 h-4 w-px bg-white/10" />}</div><div className={`flex-1 rounded-lg px-2 py-1.5 ${active === tab ? "bg-gold/10" : "group-hover:bg-white/[0.03]"}`}><p className={`flex items-center gap-2 text-sm font-bold ${active === tab ? "text-gold" : "text-white"}`}><Icon size={15} />{label}</p></div></Link>)}</div></nav>
    <div className="border-t border-white/10 p-3"><Link href={href("settings")} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active === "settings" ? "bg-gold/10 text-gold" : "text-subtext hover:bg-white/5 hover:text-white"}`}><KeyRound size={16} />API키등록·플랫폼연동</Link><Link href={href("settings")} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-subtext hover:bg-white/5 hover:text-white"><Settings2 size={16} />운영 설정</Link></div>
    <div className="border-t border-white/10 p-4"><p className="truncate text-xs text-subtext">{email}</p></div>
  </aside>;
}
