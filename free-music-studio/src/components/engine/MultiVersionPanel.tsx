"use client";

// 여러 버전 한 번에(2026-11-09 주인님 「하나의 가사로 각기 다른 모델·장르로 1곡씩」「최대 8곡」「AI 스타일을 새로 쓰게」「각각 다른 느낌의 곡이 만들어져야해」)
// 엔진 × 장르 조합 → AI가 버전마다 서로 다른 느낌의 음악 스타일을 한 번 호출로 씀 → 버전마다 엔진 대기열에 넣는다.
import { useEffect, useMemo, useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { availableEngines, consentKey, engineInfo, enqueueSong, fetchHfToken, hasQueue, type MusicEngineInfo, type SongForEngine } from "@/lib/engine";
import { useEngine } from "./useEngine";
import { LYRIC_GENRES } from "@/lib/lyricTags";
import { presetCategories, presetsFor } from "@/lib/presets";
import { isInstrumentalLyrics } from "@/lib/lyricRules";
import { MULTI_MAX, buildSlots, slotCount, versionTitle } from "@/lib/multiVersion";

// 2026-11-09 주인님 「내 PC로 노래 만들기와 여러 버전 한 번에를 한 행으로 좌우로 나란히 바로 보이게」 — 생성 칸 밖의 독립 카드
export function MultiVersionPanel({ song, title, songId, ai, tags }: { song: SongForEngine; title: string; songId: string | null; ai: { provider: string; model: string }; tags: string }) {
  const { status, paired } = useEngine();
  const queueMode = paired && hasQueue(status);
  // 2026-11-09 주인님 「좌측 메뉴 링크가 다 안 걸려」 — 그릴 때마다 새 배열이면 아래 useEffect(setConsents)가 끝없이 돌아 화면 이동이 막혔다. 엔진 상태가 바뀔 때만 새로 만든다
  const engines: MusicEngineInfo[] = useMemo(() => (queueMode && status ? availableEngines(status) : []), [queueMode, status]);
  const current = engineInfo("acestep");
  const instrumental = isInstrumentalLyrics(song.lyrics);
  const kindOk = (e: MusicEngineInfo) => e.kind === "both" || e.kind === (instrumental ? "instrumental" : "vocal");
  const list = engines.filter(kindOk);
  const genres = instrumental ? presetCategories(presetsFor("instrumental")) : [...LYRIC_GENRES];
  const [pickedEngines, setPickedEngines] = useState<string[]>([]);
  const [pickedGenres, setPickedGenres] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const c: Record<string, boolean> = {};
    try {
      for (const e of engines) c[e.id] = e.license === "commercial" || localStorage.getItem(consentKey(e.id)) === "1";
    } catch {}
    setConsents(c);
  }, [engines]);

  const total = slotCount(pickedEngines.length, pickedGenres.length);
  const tooMany = total > MULTI_MAX;
  const needConsent = pickedEngines.filter((id) => !consents[id]).map((id) => engines.find((e) => e.id === id)?.name ?? id);
  const canRun = queueMode && !!status && !busy && total >= 2 && !tooMany && !needConsent.length && !!(song.lyrics.trim() || song.style_prompt.trim());
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const run = async () => {
    if (!status) return;
    setMsg(null);
    const chosen = pickedEngines.map((id) => list.find((e) => e.id === id)!).filter(Boolean);
    const slots = buildSlots(chosen, pickedGenres, current);
    try {
      setBusy(`AI가 ${slots.length}가지 다른 느낌의 스타일을 쓰는 중…`);
      const res = await fetch("/api/style-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ai, slots: slots.map((s) => ({ genre: s.genre, engine: s.engineName })), lyrics: song.lyrics, style: song.style_prompt, tags, instrumental }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.styles)) throw new Error(data?.error || "버전별 스타일을 만들지 못했습니다.");
      const needsHf = slots.some((s) => engines.find((e) => e.id === s.engine)?.hfToken);
      const token = needsHf ? await fetchHfToken() : null;
      const show = { genre: pickedGenres.length > 0, engine: chosen.length > 1 };
      let n = 0;
      for (let i = 0; i < slots.length; i++) {
        setBusy(`대기열에 넣는 중… ${i + 1}/${slots.length}`);
        const s = slots[i];
        await enqueueSong({ ...song, style_prompt: data.styles[i] }, { title: versionTitle(title, s, show), songId, device: status.device }, status.quality, s.engine as MusicEngineInfo["id"], engines.find((e) => e.id === s.engine)?.hfToken ? token : null);
        n++;
      }
      setMsg({ ok: true, text: `${n}곡을 대기열에 넣었습니다(AI 호출 1번). 버전마다 스타일이 달라 서로 다른 느낌으로 만들어집니다.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "여러 버전을 넣지 못했습니다." });
    } finally {
      setBusy("");
    }
  };

  const chip = (on: boolean) => `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${on ? "border-violet-400 bg-violet-600 text-white" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-violet-500/60"}`;

  return (
    <section className="space-y-3 rounded-2xl border border-violet-500/25 bg-gradient-to-b from-[#0f0a1d] to-[#070b14] p-5">
      <h2 className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-violet-100">
        <Layers className="h-4 w-4 text-violet-300" /> 🎛 여러 버전 한 번에 <span className="text-[11px] font-normal text-slate-400">같은 가사로 엔진·장르마다 1곡씩, 최대 {MULTI_MAX}곡</span>
      </h2>
      {!queueMode && <p className="text-[11px] text-amber-300">내 PC 엔진을 연결하면 쓸 수 있습니다(대기열이 있는 엔진).</p>}
      <div className="space-y-3 text-xs">
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-400">엔진(여러 개 · 안 고르면 {current.name})</p>
          <div className="flex flex-wrap gap-1.5">
            {list.map((e) => (
              <button key={e.id} type="button" onClick={() => toggle(pickedEngines, setPickedEngines, e.id)} className={chip(pickedEngines.includes(e.id))} title={e.desc}>
                {pickedEngines.includes(e.id) ? "✓ " : ""}
                {e.name}
                {e.license === "noncommercial" ? " · 비상업" : ""}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-400">장르(여러 개 · 안 고르면 AI가 서로 다른 느낌으로 정함)</p>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <button key={g} type="button" onClick={() => toggle(pickedGenres, setPickedGenres, g)} className={chip(pickedGenres.includes(g))}>
                {pickedGenres.includes(g) ? "✓ " : ""}
                {g}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          AI(위 AI 작사에서 고른 {ai.provider === "openai" ? "OpenAI" : ai.provider === "gemini" ? "Gemini" : "Claude"} · 회원님 키, 1번 호출)가 버전마다 빠르기·악기·목소리·분위기가 서로 다른 음악 스타일을 새로 씁니다. 가사·길이는 같고, 제목 뒤에 「(재즈 · YuE2)」처럼 붙습니다.
        </p>
        {needConsent.length > 0 && <p className="text-[11px] text-amber-300">비상업 엔진({needConsent.join(", ")})은 위 엔진 목록에서 한 번 골라 사용 조건에 동의한 뒤 쓸 수 있습니다.</p>}
        {tooMany && <p className="text-[11px] text-amber-300">엔진 × 장르가 {total}곡입니다. 최대 {MULTI_MAX}곡까지라 고른 것을 줄여 주세요.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!canRun} onClick={() => void run()} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />} {busy || (total >= 2 && !tooMany ? `${total}곡 스타일 만들고 대기열에 넣기` : "엔진·장르를 합쳐 2곡 이상 골라 주세요")}
          </button>
        </div>
        {msg && <p className={`text-[11px] font-semibold ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
        {/* 백로그 D-11(2026-11-09): 같은 가사·스타일로 유료 AI 모델(AI 음악 스튜디오 「나란히 비교」)과 들어 보기 — 자동 생성 없음 */}
        <p className="border-t border-violet-500/15 pt-2 text-[11px] text-slate-400">
          {songId ? (
            <a href={`https://ai-music-studio.buylife.xyz/compare?fms=${songId}`} target="_blank" rel="noreferrer" className="font-semibold text-violet-200 underline-offset-2 hover:underline">
              💳 같은 가사로 유료 AI 모델과 비교하기 →
            </a>
          ) : (
            <span>💳 유료 AI 모델과 비교하려면 먼저 이 곡을 저장해 주세요.</span>
          )}{" "}
          AI 음악 스튜디오에서 Lyria·ElevenLabs 등을 나란히 들어 봅니다(회원님 키·유료, 만들기를 누를 때만).
        </p>
      </div>
    </section>
  );
}
