"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { restoreToStorageAction, type RestoreKind } from "@/lib/actions/storageRestore";

// D-68-02(2026-10-22): 「Suno 생성 완료」와 「우리 저장소 보관 완료」를 구분해 보여 준다.
// 화면에 오는 우리 저장소 주소는 서명 주소(…/storage/v1/object/sign/…)이고, 복사에 실패한 결과는 Suno 임시 주소로 남는다.
export function isTemporaryUrl(url: string | null | undefined): boolean {
  return !!url && !url.includes("/storage/v1/object/");
}

export function TemporaryStorageNotice({
  kind,
  id,
  urls,
}: {
  kind: RestoreKind;
  id: string;
  urls: (string | null | undefined)[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!urls.some(isTemporaryUrl)) return null;

  async function handleRestore() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await restoreToStorageAction(kind, id);
      if (result.error) setMessage(result.error);
      if (result.restored) router.refresh();
    } catch {
      setMessage("다시 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-2 text-[11px] text-amber-200 space-y-1.5">
      <p>
        ⚠️ <strong>임시 보관</strong> — Suno에서 만들어졌지만 내 보관함에 저장되지 않아 Suno 임시 주소로 열립니다(약 14일 뒤 만료).
      </p>
      <button
        type="button"
        onClick={handleRestore}
        disabled={busy}
        className="font-bold text-amber-300 hover:text-amber-200 disabled:opacity-60"
      >
        {busy ? "저장 중..." : "📥 내 보관함에 다시 저장"}
      </button>
      {message && <p className="text-rose-300">{message}</p>}
    </div>
  );
}
