"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// 관리자가 아닌 계정으로 /admin에 들어와 내 구독으로 넘어왔을 때(?notice=admin_only):
// 지금 계정에서 로그아웃하고, 로그인하면 관리자 화면으로 돌아오는 로그인 화면으로 보낸다(2026-10-23).
// 로그인한 채로 /login에 가면 미들웨어가 홈으로 보내므로 반드시 먼저 로그아웃한다.
export default function RelogAdminButton() {
  const [busy, setBusy] = useState(false);
  const relogin = async () => {
    setBusy(true);
    try {
      await fetch("/api/session/logout", { method: "POST" }).catch(() => {});
      await createClient().auth.signOut();
    } finally {
      window.location.href = "/login?redirect=/admin";
    }
  };
  return (
    <button
      type="button"
      onClick={relogin}
      disabled={busy}
      className="ml-2 inline-flex items-center rounded-lg border border-amber-300/50 bg-amber-300/15 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-300/25 disabled:opacity-50"
    >
      {busy ? "로그아웃 중..." : "관리자 계정으로 다시 로그인"}
    </button>
  );
}
