"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import {
  DEFAULT_LYRICS_OPTIONS, LANGS, LIMITS, METAPHORS, STRUCTURES, resolveStructure,
  type LyricsOptions, type MetaResult, type ProjectContent, type SongLyrics, type SunoVariant,
} from "@/lib/playlist/types";
import { CopyButton, ErrorBox, PrimaryButton } from "./common";
import { useAi } from "./useAi";

interface TabProps {
  projectId: string;
  genre: string;
  content: ProjectContent;
  onContent: (patch: Partial<ProjectContent>) => void;
}

/* ───────── Suno 프롬프트 ───────── */
export function SunoTab({ projectId, content, onContent }: TabProps) {
  const { generate } = useAi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = content.suno ?? [];

  async function run() {
    setBusy(true);
    setError(null);
    const d = await generate(projectId, "suno");
    setBusy(false);
    if (d.error) return setError(d.error);
    onContent({ suno: d.suno as SunoVariant[] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">Suno 5.0의 &quot;Style of Music&quot; 칸에 붙여 넣는 영어 프롬프트 3종입니다(각 {LIMITS.sunoMaxChars}자 미만).</p>
        <PrimaryButton busy={busy} onClick={run}>{list.length ? <><RefreshCw size={15} />다시 만들기</> : <><Sparkles size={15} />Suno 프롬프트 만들기</>}</PrimaryButton>
      </div>
      <ErrorBox message={error} />
      {list.map((v, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-neutral-900">{i + 1}. {v.name}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${v.style.length >= LIMITS.sunoMaxChars ? "text-rose-500" : "text-neutral-400"}`}>{v.style.length}자</span>
              <CopyButton text={v.style} />
            </div>
          </div>
          <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-800">{v.style}</p>
          {v.note && <p className="mt-2 text-xs text-neutral-500">{v.note}</p>}
        </div>
      ))}
    </div>
  );
}

/* ───────── 가사 ───────── */
export function LyricsTab({ projectId, genre, content, onContent }: TabProps) {
  const { generate } = useAi();
  const [opts, setOpts] = useState<LyricsOptions>(content.lyrics?.options ?? DEFAULT_LYRICS_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const songs = content.lyrics?.songs ?? [];
  const set = <K extends keyof LyricsOptions>(k: K, v: LyricsOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));
  const best = resolveStructure("auto", genre);

  async function run() {
    setBusy(true);
    setError(null);
    setNote(null);
    const d = await generate(projectId, "lyrics", { options: opts });
    setBusy(false);
    if (d.error) return setError(d.error);
    const lyrics = d.lyrics as { options: LyricsOptions; songs: SongLyrics[] };
    onContent({ lyrics });
    if (typeof d.missing === "number" && d.missing > 0) setNote(`${d.missing}곡은 AI가 완성하지 못해 빠졌습니다. 필요하면 다시 만들어 주세요.`);
  }

  const allText = songs.map((s) => `${s.no}. ${s.title}\n\n${s.lyrics}`).join("\n\n────────────\n\n");

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-neutral-500">
            가사 언어
            <select value={opts.language} onChange={(e) => setOpts((o) => ({ ...o, language: e.target.value, secondLanguage: o.secondLanguage === e.target.value ? "" : o.secondLanguage }))} className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-sm text-neutral-900">
              {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-neutral-500">
            이중 언어 (선택)
            <select value={opts.secondLanguage} onChange={(e) => set("secondLanguage", e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-sm text-neutral-900">
              <option value="">사용 안 함</option>
              {LANGS.filter((l) => l.id !== opts.language).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </label>
        </div>
        {opts.secondLanguage && (
          <label className="block text-xs font-medium text-neutral-500">
            보조 언어 비율: {opts.secondRatio}% (주 언어 {100 - opts.secondRatio}%)
            <input type="range" min={10} max={90} step={10} value={opts.secondRatio} onChange={(e) => set("secondRatio", Number(e.target.value))} className="mt-1 w-full accent-indigo-600" />
          </label>
        )}
        <label className="block text-xs font-medium text-neutral-500">
          곡 수: {opts.songCount}곡
          <input type="range" min={LIMITS.songsMin} max={LIMITS.songsMax} step={1} value={opts.songCount} onChange={(e) => set("songCount", Number(e.target.value))} className="mt-1 w-full accent-indigo-600" />
        </label>
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">은유(비유) 강도</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {METAPHORS.map((m) => (
              <button key={m.level} type="button" onClick={() => set("metaphor", m.level)} title={m.hint} className={`rounded-lg border px-2 py-2 text-xs ${opts.metaphor === m.level ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-800" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
                {m.level}단계 · {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">{METAPHORS.find((m) => m.level === opts.metaphor)?.hint}</p>
        </div>
        <label className="block text-xs font-medium text-neutral-500">
          곡 구조
          <select value={opts.structure} onChange={(e) => set("structure", e.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-2.5 py-2 text-sm text-neutral-900">
            <option value="auto">자동 (장르 추천: {best.label})</option>
            {STRUCTURES.map((s) => <option key={s.id} value={s.id}>{s.id === best.id ? "★ BEST · " : ""}{s.label}</option>)}
          </select>
          <span className="mt-1 block text-[11px] text-neutral-400">{resolveStructure(opts.structure, genre).sections.join(" → ")}</span>
        </label>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={opts.intro} onChange={(e) => set("intro", e.target.checked)} disabled={opts.instrumental} className="accent-indigo-600" />인트로에도 가사 넣기</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={opts.outro} onChange={(e) => set("outro", e.target.checked)} disabled={opts.instrumental} className="accent-indigo-600" />아웃트로에도 가사 넣기</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={opts.instrumental} onChange={(e) => set("instrumental", e.target.checked)} className="accent-indigo-600" />연주곡 모드 (가사 없이 구성 안내만)</label>
        </div>
        <label className="block text-xs font-medium text-neutral-500">
          가사 주제 메모 (선택)
          <textarea value={opts.theme} onChange={(e) => set("theme", e.target.value.slice(0, 300))} rows={2} placeholder="예: 퇴근길 비 오는 창가, 오래된 친구에게 보내는 편지" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
        </label>
        <PrimaryButton busy={busy} onClick={run}>{songs.length ? <><RefreshCw size={15} />가사 다시 만들기</> : <><Sparkles size={15} />가사 만들기</>}</PrimaryButton>
        {busy && <p className="text-xs text-neutral-500">곡 수가 많으면 1~2분 걸릴 수 있습니다. 화면을 닫지 마세요.</p>}
      </div>

      <ErrorBox message={error} />
      {note && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{note}</p>}

      {songs.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">빠른 이동</span>
            {songs.map((s) => (
              <a key={s.no} href={`#song-${s.no}`} className="rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50">{s.no}</a>
            ))}
            <CopyButton text={allText} label="전체 복사" className="ml-auto" />
          </div>
          {songs.map((s) => (
            <div key={s.no} id={`song-${s.no}`} className="scroll-mt-20 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-neutral-900">{s.no}. {s.title}</p>
                <CopyButton text={s.lyrics} />
              </div>
              <p className="mb-2 text-[11px] text-neutral-400">{s.structure.join(" → ")}</p>
              <pre className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 font-sans text-sm leading-relaxed text-neutral-800">{s.lyrics}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── 유튜브 메타데이터 ───────── */
export function MetaTab({ projectId, content, onContent }: TabProps) {
  const { generate } = useAi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = content.meta;

  async function run() {
    setBusy(true);
    setError(null);
    const d = await generate(projectId, "meta");
    setBusy(false);
    if (d.error) return setError(d.error);
    onContent({ meta: d.meta as MetaResult });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-neutral-500">유튜브 업로드 화면에 붙여 넣을 설명글·해시태그·검색 키워드입니다. 가사를 먼저 만들면 곡 정보가 설명에 반영됩니다.</p>
        <PrimaryButton busy={busy} onClick={run}>{meta ? <><RefreshCw size={15} />다시 만들기</> : <><Sparkles size={15} />메타데이터 만들기</>}</PrimaryButton>
      </div>
      <ErrorBox message={error} />
      {meta && (
        <>
          <Block title="설명글" text={meta.description} pre />
          <Block title={`해시태그 ${meta.hashtags.length}개`} text={meta.hashtags.join(" ")} />
          <Block title={`검색 키워드 ${meta.keywords.length}개`} text={meta.keywords.join(", ")} />
        </>
      )}
    </div>
  );
}

function Block({ title, text, pre }: { title: string; text: string; pre?: boolean }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-neutral-900">{title}</p>
        <CopyButton text={text} />
      </div>
      <p className={`rounded-lg bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-800 ${pre ? "whitespace-pre-wrap" : ""}`}>{text}</p>
    </div>
  );
}
