"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ label = "로그아웃" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="min-h-11 rounded border px-3 text-sm"
      onClick={async () => {
        await createClient().auth.signOut({ scope: "local" });
        router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
