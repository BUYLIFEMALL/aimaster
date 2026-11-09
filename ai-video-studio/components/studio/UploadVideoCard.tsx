"use client";

// 2026-11-09 내 영상 올리기 — 직접 찍은 영상을 보관함에 넣어 후처리(립싱크·업스케일·배경 제거)에 쓴다.
// 영상은 서버를 거치지 않고 일회용 주소로 회원 폴더에 바로 올린다. AI 호출 없음. 권리 확인을 먼저 받는다.
import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ClientGeneration } from "@/lib/generationTypes";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_SECONDS } from "@/lib/postprocess";

const BUCKET_NAME = "ai-video-studio";

/** 영상 길이·크기 읽기(브라우저 안) */
function readMeta(file: File): Promise<{ seconds: number; width: number; height: number }> {
  return new Promise((ok, bad) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { ok({ seconds: v.duration, width: v.videoWidth, height: v.videoHeight }); URL.revokeObjectURL(url); };
    v.onerror = () => { bad(new Error("영상을 읽지 못했습니다. MP4(H.264) 영상인지 확인해 주세요.")); URL.revokeObjectURL(url); };
    v.src = url;
  });
}

export function UploadVideoCard({ onCreated }: { onCreated: (g: ClientGeneration) => void }) {
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    try {
      if (!rights) throw new Error("먼저 「내가 찍었거나 권리를 가진 영상입니다」에 체크해 주세요.");
      if (!/\.mp4$/i.test(file.name)) throw new Error("MP4 영상만 올릴 수 있습니다.");
      if (file.size > UPLOAD_MAX_BYTES) throw new Error(`영상은 ${Math.round(UPLOAD_MAX_BYTES / 1048576)}MB 이하만 올릴 수 있습니다.`);
      const meta = await readMeta(file);
      if (!(meta.seconds > 0) || meta.seconds > UPLOAD_MAX_SECONDS + 0.5) throw new Error(`${UPLOAD_MAX_SECONDS}초 이하 영상만 올릴 수 있습니다. 영상 합치기에서 잘라 쓴 뒤 올려 주세요.`);
      setBusy("올리는 중…");
      const start = await fetch("/api/generations/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "start", name: file.name, size: file.size, rights: true }) });
      const s = await start.json().catch(() => ({}));
      if (!start.ok) throw new Error(s.error || "업로드를 시작하지 못했습니다.");
      const { error } = await createClient().storage.from(BUCKET_NAME).uploadToSignedUrl(s.path, s.token, file, { contentType: "video/mp4" });
      if (error) throw new Error("영상을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      const fin = await fetch("/api/generations/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "finish", id: s.id, name: file.name, seconds: meta.seconds, width: meta.width, height: meta.height, rights: true }) });
      const f = await fin.json().catch(() => ({}));
      if (!fin.ok) throw new Error(f.error || "보관함에 저장하지 못했습니다.");
      const created = (f.generations as ClientGeneration[] | undefined)?.[0];
      if (created) onCreated(created);
      setMsg({ ok: true, text: `「${file.name}」을 보관함에 넣었습니다. 카드의 「✨ 후처리」에서 립싱크·업스케일·배경 제거를 할 수 있습니다.` });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "영상을 올리지 못했습니다." });
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-sm font-bold text-white">📁 내 영상 올리기 <span className="ml-1 text-[11px] font-normal text-zinc-400">직접 찍은 영상에 립싱크·업스케일·배경 제거를 할 때(MP4, {UPLOAD_MAX_SECONDS}초·{Math.round(UPLOAD_MAX_BYTES / 1048576)}MB 이하, 올리기는 무료)</span></p>
      <label className="flex items-start gap-2 text-xs text-zinc-300">
        <input type="checkbox" checked={rights} disabled={!!busy} onChange={(e) => setRights(e.target.checked)} className="mt-0.5" />
        <span>내가 찍었거나 권리를 가진 영상입니다(다른 사람의 영상·출연자 동의 없는 얼굴은 올리지 않습니다).</span>
      </label>
      <label className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${rights && !busy ? "cursor-pointer border-sky-500/50 text-sky-200 hover:bg-sky-500/10" : "border-zinc-700 text-zinc-500"}`}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
        {busy || "영상 고르기"}
        <input type="file" accept=".mp4,video/mp4" hidden disabled={!rights || !!busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-xs ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
    </section>
  );
}
