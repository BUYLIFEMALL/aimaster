"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from "@/lib/image/models";

export type ImageItem = { slot: string; section: number | null; prompt: string; alt: string; status: "planned" | "done"; url?: string };

export function ImagePanel({ postId, images, editable }: { postId: string; images: ImageItem[]; editable: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(2);
  const [model, setModel] = useState<string>(DEFAULT_IMAGE_MODEL);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const note = IMAGE_MODELS.find((m) => m.id === model)?.note ?? "";

  async function call(method: "POST" | "DELETE", body: unknown) {
    const res = await fetch(`/api/posts/${postId}/images`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    return { ok: !!res?.ok, data };
  }

  async function plan() {
    if (images.some((i) => i.status === "done") && !window.confirm("지금 이미지를 모두 지우고 새로 기획할까요?")) return;
    setBusy("plan"); setError("");
    const r = await call("POST", { action: "plan", count });
    setBusy("");
    if (!r.ok) { setError(r.data.error ?? "장면을 만들지 못했습니다."); return; }
    router.refresh();
  }

  async function generate(slots: string[]) {
    setError("");
    for (const slot of slots) {
      setBusy(slot);
      const r = await call("POST", { action: "generate", slot, imageModel: model });
      if (!r.ok) { setBusy(""); setError(r.data.error ?? "이미지를 만들지 못했습니다."); router.refresh(); return; }
    }
    setBusy("");
    router.refresh();
  }

  async function remove(slot: string) {
    setBusy(slot); setError("");
    const r = await call("DELETE", { slot });
    setBusy("");
    if (!r.ok) setError(r.data.error ?? "빼지 못했습니다.");
    router.refresh();
  }

  const planned = images.filter((i) => i.status === "planned").map((i) => i.slot);
  const label = (i: ImageItem) => (i.slot === "featured" ? "🖼 대표 이미지" : `📷 소제목 ${i.section}`);

  return (
    <div className="lp-card space-y-3">
      <p className="text-sm font-black">🖼 이미지</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-extrabold text-[color:var(--muted)]">본문 이미지 수
          <select className="mt-1 w-full rounded-xl border-2 border-[color:var(--border)] px-2 py-2 text-sm" value={count} onChange={(e) => setCount(Number(e.target.value))} disabled={!editable || !!busy}>
            {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}장 + 대표 1장</option>)}
          </select>
        </label>
        <label className="text-xs font-extrabold text-[color:var(--muted)]">이미지 AI(본인 Gemini 키)
          <select className="mt-1 w-full rounded-xl border-2 border-[color:var(--border)] px-2 py-2 text-sm" value={model} onChange={(e) => setModel(e.target.value)} disabled={!!busy}>
            {IMAGE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-[color:var(--muted)]">{note} · 장면 설명은 본인 Claude 키로 1번(약 1원)</p>
      <button type="button" onClick={plan} disabled={!editable || !!busy} className="lp-btn-ghost w-full justify-center disabled:opacity-50">{busy === "plan" ? "장면 기획 중…" : images.length ? "↻ 장면 다시 기획" : "1. 장면 기획하기"}</button>

      {images.length > 0 && (
        <>
          <ul className="space-y-2">
            {images.map((i) => (
              <li key={i.slot} className="rounded-xl border-2 border-[color:var(--border)] p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold">{label(i)}</span>
                  <span className={`lp-tag ${i.status === "done" ? "lp-tag-ok" : "lp-tag-idle"}`}>{busy === i.slot ? "만드는 중…" : i.status === "done" ? "완료" : "대기"}</span>
                </div>
                {i.url && <img src={i.url} alt={i.alt} className="mt-2 w-full rounded-lg" />}
                <p className="mt-1 text-[11px] text-[color:var(--muted)]">{i.alt}</p>
                {editable && (
                  <div className="mt-1 flex gap-2">
                    <button type="button" onClick={() => generate([i.slot])} disabled={!!busy} className="text-xs font-bold text-[color:var(--wp)] underline disabled:opacity-50">{i.status === "done" ? "다시 만들기" : "만들기"}</button>
                    {i.status === "done" && <button type="button" onClick={() => remove(i.slot)} disabled={!!busy} className="text-xs font-bold text-red-600 underline disabled:opacity-50">빼기</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {editable && planned.length > 0 && (
            <button type="button" onClick={() => generate(planned)} disabled={!!busy} className="lp-btn w-full disabled:opacity-50">2. 남은 {planned.length}장 모두 만들기</button>
          )}
        </>
      )}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">⚠️ {error}</p>}
    </div>
  );
}
