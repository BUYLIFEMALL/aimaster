"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound, LayoutDashboard, Library, LogOut, PenLine, Send, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { APP_VERSION } from "@/threads-content-ops/lib/version";

const flow = [
  { tab: "create", label: "콘텐츠 작성", icon: PenLine },
  { tab: "manage", label: "초안·발행 관리", icon: Send },
  { tab: "accounts", label: "계정 운영정보", icon: UsersRound },
  { tab: "sources", label: "쇼핑제휴 상품 등록", icon: Library },
];

export default function ContentOpsSidebar({ email }: { email: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = searchParams.get("tab") ?? "dashboard";
  const href = (tab: string) => `/threads-content-ops${tab === "dashboard" ? "" : `?tab=${tab}`}`;
  const signOut = async () => { await createClient().auth.signOut(); router.push("/login"); router.refresh(); };
  return <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:sticky md:top-0 md:flex">
    <div className="border-b border-neutral-200 p-5"><p className="text-lg font-bold text-neutral-900">Threads 운영 자동화</p><p className="mt-1 text-xs text-neutral-400">{APP_VERSION}</p><Link className="mt-2 block text-xs text-neutral-500 hover:text-neutral-900" href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</Link></div>
    <nav className="flex-1 p-3"><Link href={href("dashboard")} className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active === "dashboard" ? "bg-sky-50 text-sky-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`}><LayoutDashboard size={16} />대시보드</Link><div className="relative">{flow.map(({ tab, label, icon: Icon }, index) => <Link key={tab} href={href(tab)} className="group relative flex gap-3 pb-2"><div className="flex flex-col items-center"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${active === tab ? "bg-amber-500 text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200"}`}>{index + 1}</span>{index < flow.length - 1 && <span className="mt-1 h-4 w-px bg-neutral-200" />}</div><div className={`flex-1 rounded-lg px-2 py-1.5 ${active === tab ? "bg-amber-50" : "group-hover:bg-neutral-50"}`}><p className={`flex items-center gap-2 text-sm font-bold ${active === tab ? "text-amber-900" : "text-neutral-800"}`}><Icon size={15} />{label}</p></div></Link>)}</div><div className="mt-2 border-t border-neutral-200 pt-3"><Link href={href("settings")} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active === "settings" ? "bg-sky-50 text-sky-700" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"}`}><KeyRound size={16} />API키등록·플랫폼연동</Link><p className="mt-1 truncate px-3 py-2 text-xs text-neutral-500">{email}</p><button onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"><LogOut size={16} />로그아웃</button></div></nav>
  </aside>;
}
