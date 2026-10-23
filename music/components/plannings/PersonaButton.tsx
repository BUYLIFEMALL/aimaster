"use client";

import { useState } from "react";
import { createPersonaAction } from "@/lib/actions/personas";

// 페르소나(2026-10-21 Suno V6 2차 ③). 완성된 보컬 곡의 목소리·스타일을 저장해 다음 생성에서 「내 페르소나」로 고른다.
// sunoapi.org는 곡 하나당 한 번만 만들 수 있어(409) 이미 만든 곡이면 버튼 대신 이름을 보여 준다.
export function PersonaButton({
  variantId,
  title,
  durationSeconds,
  savedName,
}: {
  variantId: string;
  title: string;
  durationSeconds: number | null;
  savedName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(`${title} 보컬`.slice(0, 80));
  const [description, setDescription] = useState("");
  const [useRange, setUseRange] = useState(false);
  const [start, setStart] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState<string | null>(savedName);

  if (done) {
    return (
      <span className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 flex items-center gap-1">
        🧑‍🎤 페르소나 저장됨: {done}
      </span>
    );
  }

  const maxStart = Math.max(0, Math.floor((durationSeconds ?? 30) - 30));

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await createPersonaAction(variantId, {
        name,
        description,
        ...(useRange ? { vocalStart: start, vocalEnd: start + 30 } : {}),
      });
      if (res.needsApiKey) {
        setMessage({ ok: false, text: "Suno(sunoapi.org) API 키를 [API 키 등록 · 플랫폼 연동]에서 먼저 등록해 주세요." });
      } else if (res.error) {
        setMessage({ ok: false, text: res.error });
      } else {
        setDone(name.trim());
        setOpen(false);
      }
    } catch {
      setMessage({ ok: false, text: "페르소나를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="이 곡의 목소리·스타일을 저장해, 새 곡을 만들 때 같은 보컬로 부르게 합니다. 곡 하나당 한 번만 만들 수 있습니다."
        className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] transition-all flex items-center gap-1"
      >
        <span>🧑‍🎤</span>
        <span>이 목소리 페르소나로 저장</span>
      </button>
      {open && (
        <div className="basis-full space-y-2 rounded-xl border border-[#2a2a3c] bg-[#101018] p-3 text-[11px] text-zinc-300">
          <label className="block space-y-1">
            <span className="font-bold">페르소나 이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-[#2d2d3e] bg-[#16161f] px-2 py-1.5 text-xs text-white"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-bold">목소리·스타일 설명</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="예: 따뜻하고 허스키한 여성 보컬, 잔잔한 어쿠스틱 발라드"
              className="w-full rounded-lg border border-[#2d2d3e] bg-[#16161f] px-2 py-1.5 text-xs text-white"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useRange} onChange={(e) => setUseRange(e.target.checked)} />
            <span>목소리가 잘 들리는 30초 구간 직접 고르기 (안 고르면 처음 30초)</span>
          </label>
          {useRange && (
            <label className="flex items-center gap-2">
              <span>시작</span>
              <input
                type="number"
                min={0}
                max={maxStart}
                value={start}
                onChange={(e) => setStart(Math.min(maxStart, Math.max(0, Number(e.target.value) || 0)))}
                className="w-20 rounded-lg border border-[#2d2d3e] bg-[#16161f] px-2 py-1 text-xs text-white"
              />
              <span>초 ~ {start + 30}초</span>
            </label>
          )}
          <p className="text-zinc-500">곡 하나당 한 번만 만들 수 있습니다. 만든 페르소나는 「음악 생성」에서 고를 수 있고, 원곡이 30일 뒤 지워져도 계속 쓸 수 있습니다.</p>
          {message && <p className={message.ok ? "text-emerald-300" : "text-rose-300"}>⚠️ {message.text}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy || !name.trim() || !description.trim()}
            className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-orange-400 disabled:opacity-50"
          >
            {busy ? "페르소나 만드는 중..." : "페르소나 만들기"}
          </button>
        </div>
      )}
    </>
  );
}
