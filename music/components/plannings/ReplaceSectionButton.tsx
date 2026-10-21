"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { replaceSectionAction } from "@/lib/actions/replaceSection";
import { checkReplaceRange, fmtTime } from "@/lib/replaceRange";

// 구간 다시 만들기(2026-10-21 Suno V6 2차 ④). 곡 카드에서 한 구간(10초 이상·곡 길이 절반 이하)만 새로 만들고 나머지는 원곡 그대로.
// 시작·끝은 같은 카드의 재생기(id `audio-<변주 id>`) 현재 위치로 찍거나 초로 입력한다. 결과는 새 곡으로 쌓인다.
export function ReplaceSectionButton({
  variantId,
  durationSeconds,
  isVocal,
  lyrics,
  personas,
}: {
  variantId: string;
  durationSeconds: number | null;
  isVocal: boolean;
  lyrics: string;
  personas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(20);
  const [sectionLyrics, setSectionLyrics] = useState("");
  const [fullLyrics, setFullLyrics] = useState(lyrics);
  const [personaId, setPersonaId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const rangeError = checkReplaceRange(start, end, durationSeconds);

  function playerTime(): number {
    const el = document.getElementById(`audio-${variantId}`) as HTMLAudioElement | null;
    return el ? Math.round(el.currentTime * 100) / 100 : 0;
  }

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await replaceSectionAction(variantId, {
        startS: start,
        endS: end,
        sectionLyrics,
        fullLyrics,
        personaId: personaId || null,
      });
      if (res.needsApiKey) setMessage("Suno(sunoapi.org) API 키를 [API 키 등록 · 플랫폼 연동]에서 먼저 등록해 주세요.");
      else if (res.error) setMessage(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setMessage("요청을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const input = "rounded-lg border border-[#2d2d3e] bg-[#16161f] px-2 py-1 text-xs text-white";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="곡의 한 구간만 새로 만들고 나머지는 그대로 둡니다. 결과는 새 곡으로 추가돼 원곡과 비교할 수 있습니다."
        className="px-3 py-1.5 rounded-full text-xs font-bold border border-[#2d2d3e] bg-[#20202e] text-zinc-300 hover:text-white hover:border-orange-500/40 hover:bg-[#28283a] transition-all flex items-center gap-1"
      >
        <span>✂️</span>
        <span>구간 다시 만들기</span>
      </button>
      {open && (
        <div className="basis-full space-y-2 rounded-xl border border-[#2a2a3c] bg-[#101018] p-3 text-[11px] text-zinc-300">
          <p className="font-bold">바꿀 구간 (10초 이상, 곡 길이의 절반 이하)</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              시작
              <input type="number" min={0} step={0.5} value={start} onChange={(e) => setStart(Number(e.target.value))} className={`${input} w-20`} />
              초
            </label>
            <button type="button" onClick={() => setStart(playerTime())} className="rounded-full border border-[#2d2d3e] px-2 py-1 hover:text-white">
              ⏱ 재생 위치를 시작으로
            </button>
            <label className="flex items-center gap-1">
              끝
              <input type="number" min={0} step={0.5} value={end} onChange={(e) => setEnd(Number(e.target.value))} className={`${input} w-20`} />
              초
            </label>
            <button type="button" onClick={() => setEnd(playerTime())} className="rounded-full border border-[#2d2d3e] px-2 py-1 hover:text-white">
              ⏱ 재생 위치를 끝으로
            </button>
          </div>
          <p className={rangeError ? "text-rose-300" : "text-emerald-300"}>
            {rangeError ? `⚠️ ${rangeError}` : `✅ ${fmtTime(start)} ~ ${fmtTime(end)} (${Math.round(end - start)}초)를 다시 만듭니다.`}
          </p>
          <label className="block space-y-1">
            <span className="font-bold">{isVocal ? "이 구간에서 부를 가사" : "이 구간의 연주 느낌 (선택)"}</span>
            <textarea
              value={sectionLyrics}
              onChange={(e) => setSectionLyrics(e.target.value)}
              rows={3}
              maxLength={5000}
              placeholder={isVocal ? "예: 원래 가사에서 이 구간 줄을 복사해 고치거나, 같은 줄을 그대로 넣어 다시 부르게 합니다." : "비우면 원래 곡 설명을 그대로 씁니다."}
              className={`${input} w-full`}
            />
          </label>
          {isVocal && (
            <label className="block space-y-1">
              <span className="font-bold">곡 전체 가사 (바뀐 구간 가사를 넣은 전체)</span>
              <textarea value={fullLyrics} onChange={(e) => setFullLyrics(e.target.value)} rows={6} maxLength={5000} className={`${input} w-full`} />
            </label>
          )}
          {isVocal && personas.length > 0 && (
            <label className="flex items-center gap-2">
              <span>🧑‍🎤 페르소나</span>
              <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className={input}>
                <option value="">사용 안 함</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-zinc-500">본인 sunoapi.org 크레딧이 곡 생성 1회와 비슷하게 사용됩니다. 결과는 「✂️ 구간 수정본」으로 새로 추가되고 원곡은 그대로 남습니다.</p>
          {message && <p className="text-rose-300">⚠️ {message}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy || !!rangeError || (isVocal && (!sectionLyrics.trim() || !fullLyrics.trim()))}
            className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-orange-400 disabled:opacity-50"
          >
            {busy ? "요청 중..." : "이 구간 다시 만들기"}
          </button>
        </div>
      )}
    </>
  );
}
