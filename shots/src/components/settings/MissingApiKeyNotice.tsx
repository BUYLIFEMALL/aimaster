import Link from "next/link";
import { PROVIDER_LABELS } from "@/lib/apiKeys";
import type { ApiKeyProvider } from "@/types/database.types";
import { AlertCircle, Key } from "lucide-react";

export function MissingApiKeyNotice({ missing }: { missing: ApiKeyProvider[] }) {
  if (missing.length === 0) return null;

  const labels = missing.map((p) => PROVIDER_LABELS[p]).join(", ");

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4.5 text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white text-sm mb-0.5">필수 API 키 등록 필요</p>
          <p className="text-slate-300">
            <span className="font-bold text-amber-300">[{labels}]</span> 키가 등록되어 있지 않습니다. 바이럴 주제 수집 및 생성 기능을 쓰려면 본인의 API 키를 먼저 등록해야 합니다.
          </p>
        </div>
      </div>
      <Link href="/settings" className="btn-3d-amber px-4 py-2 text-xs font-black shrink-0 self-start sm:self-auto">
        <Key className="w-3.5 h-3.5 text-zinc-900" />
        <span>API 키 설정하기</span>
      </Link>
    </div>
  );
}
