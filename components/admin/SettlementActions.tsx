"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SettlementActionsProps {
  settlementId: string;
}

export default function SettlementActions({ settlementId }: SettlementActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const updateStatus = async (status: "approved" | "rejected") => {
    setLoading(true);
    await supabase
      .from("settlement_requests")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", settlementId);
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        disabled={loading}
        onClick={() => updateStatus("approved")}
        className="inline-flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        <Check size={12} />
        승인
      </button>
      <button
        disabled={loading}
        onClick={() => updateStatus("rejected")}
        className="inline-flex items-center gap-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        <X size={12} />
        반려
      </button>
    </div>
  );
}
