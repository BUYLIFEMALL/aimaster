"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reservationImportAction, type ReservationImportState } from "@/lib/actions/reservationImport";

// v1.28 예약 엑셀 일괄 등록: 파일 선택 → 미리보기(DB에 쓰지 않음) → 등록. 등록 때 서버가 파일을 다시 검사한다.
export function ReservationImportForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ReservationImportState | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function run(mode: "preview" | "import") {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setResult({ error: "엑셀 파일을 선택해 주세요." });
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", mode);
    setIsPending(true);
    try {
      const r = await reservationImportAction(fd);
      setResult(r);
      if (mode === "import" && r.imported) {
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <span>📥</span>
          <span>엑셀로 한 번에 등록</span>
        </h3>
        <a href="/api/reservations/template" className="whitespace-nowrap text-xs font-semibold text-indigo-600 hover:underline">
          ⬇️ 양식 내려받기
        </a>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        열: <strong>고객명</strong>(필수) · 핸드폰 · 이메일 · <strong>예약일시</strong>(필수, 예: 2026-12-24 14:00, 한국 시간) · 메모. 핸드폰과
        이메일 중 하나는 있어야 합니다. 한 번에 500건까지, 이미 지난 예약과 이미 등록된 같은 예약은 건너뜁니다. 미리보기를 먼저 확인한 뒤 등록하세요.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={() => setResult(null)}
          className="min-w-0 flex-1 text-xs"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("preview")}
          className="whitespace-nowrap rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {isPending ? "확인 중…" : "👀 미리보기"}
        </button>
      </div>

      {result?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{result.error}</p>}
      {result?.imported ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          ✅ 예약 {result.imported}건을 등록했습니다{result.skipped?.length ? ` · ${result.skipped.length}건 건너뜀` : ""}.
        </p>
      ) : null}

      {result && !result.error && !result.imported && result.rows && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">
            등록 가능 {result.rows.length}건 · 건너뜀 {result.skipped?.length ?? 0}건
            {result.tooMany ? " · 500건이 넘어 앞의 500행만 읽었습니다" : ""}
          </p>
          {result.rows.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">행</th>
                    <th className="px-2 py-1.5">고객명</th>
                    <th className="px-2 py-1.5">연락처</th>
                    <th className="px-2 py-1.5 whitespace-nowrap">예약일시(한국)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.row} className="border-t border-slate-100">
                      <td className="px-2 py-1.5 text-slate-400">{r.row}</td>
                      <td className="px-2 py-1.5">{r.customer_name}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.customer_phone ?? r.customer_email}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{fmt(r.reservation_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.skipped && result.skipped.length > 0 && (
            <ul className="max-h-32 list-disc space-y-0.5 overflow-auto pl-5 text-xs text-amber-700">
              {result.skipped.map((s) => (
                <li key={`${s.row}-${s.reason}`}>
                  {s.row}행: {s.reason}
                </li>
              ))}
            </ul>
          )}
          {result.rows.length > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run("import")}
              className="whitespace-nowrap rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isPending ? "등록 중…" : `✅ ${result.rows.length}건 등록하기`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
