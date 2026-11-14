"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ label = "로그아웃" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-all"
      onClick={async () => {
        await createClient().auth.signOut({ scope: "local" });
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        router.refresh();
      }}
    >
      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {label}
    </button>
  );
}
