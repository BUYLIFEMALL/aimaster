"use client";

// v1.51 (2026-11-13): 곡을 만들기 전에 가사를 AI로 만들고, 고쳐서 저장한다.
// 저장한 가사는 아래 「Suno AI 음악 생성 콘솔」의 보컬 버전에 그대로 쓰인다(lib/actions/tracks.ts).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { generatePlanningLyricsAction, savePlanningLyricsAction } from "@/lib/actions/planningLyrics";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";

const MAX = 5000;
const SECTION_TAGS = ["[Intro]", "[Verse 1]", "[Pre-Chorus]", "[Chorus]", "[Verse 2]", "[Bridge]", "[Outro]"];

export function PlanningLyricsCard({
  planningId,
  savedLyrics,
  lyricsFailed = false,
}: {
  planningId: string;
  savedLyrics: string | null;
  lyricsFailed?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(savedLyrics ?? "");
  const [saved, setSaved] = useState(savedLyrics ?? "");
  const [busy, setBusy] = useState<"" | "generate" | "save">("");
  const [error, setError] = useState<string | null>(
    lyricsFailed ? "기획은 저장됐지만 가사를 만들지 못했습니다. 「AI로 가사 생성」을 다시 눌러 주세요." : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);
  const dirty = text.trim() !== saved.trim();

  async function handleGenerate() {
    if (dirty && text.trim() && !window.confirm("저장하지 않은 수정 내용이 있습니다. 새 가사로 바꿀까요?")) return;
    setError(null);
    setNotice(null);
    setBusy("generate");
    try {
      const r = await generatePlanningLyricsAction(planningId);
      if (r.needsApiKey) setMissingKey(true);
      else if (r.error) setError(r.error);
      else if (r.lyrics) {
        setText(r.lyrics);
        setSaved(r.lyrics);
        setNotice("새 가사를 만들었습니다. 고칠 부분을 수정한 뒤 「가사 확정」을 눌러 주세요.");
        router.refresh();
      }
    } finally {
      setBusy("");
    }
  }

  async function handleSave() {
    setError(null);
    setNotice(null);
    setBusy("save");
    try {
      const r = await savePlanningLyricsAction(planningId, text);
      if (r.error) setError(r.error);
      else {
        setText(r.lyrics ?? "");
        setSaved(r.lyrics ?? "");
        setNotice(r.lyrics ? "가사를 확정했습니다. 아래 생성 콘솔에서 보컬 버전을 만들면 이 가사로 노래를 만듭니다." : "가사를 비웠습니다. 곡을 만들 때 AI가 새로 작사합니다.");
        router.refresh();
      }
    } finally {
      setBusy("");
    }
  }

  function insertTag(tag: string) {
    setText((t) => (t.trim() ? `${t.replace(/\s+$/, "")}\n\n${tag}\n` : `${tag}\n`).slice(0, MAX));
  }

  return (
    <>
      <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-5 sm:p-6 shadow-xl shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <p className="text-base font-black text-white">가사 수정 · 확정</p>
          </div>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              saved.trim()
                ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                : "text-zinc-400 bg-zinc-500/10 border-zinc-500/30"
            }`}
          >
            {saved.trim() ? (dirty ? "수정 중 · 아직 확정 안 됨" : "✅ 확정된 가사") : "자동 작사(가사 없음)"}
          </span>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-400">
          기획 때 만든 가사를 원하는 대로 고친 뒤 「✅ 가사 확정」을 누르세요. 보컬 버전을 만들 때 확정한 가사가 그대로 Suno에 들어갑니다.
          가사를 비워 확정하면 예전처럼 곡을 만들 때 AI가 새로 작사합니다. 「AI로 가사 다시 생성」은 본인 OpenAI 키로 1회 호출됩니다.
        </p>

        <div className="mb-2 flex flex-wrap gap-1.5" aria-label="가사 구간 넣기">
          {SECTION_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={busy !== ""}
              onClick={() => insertTag(tag)}
              className="rounded-full border border-[#2c2c3a] bg-[#181824] px-2.5 py-1 text-[11px] font-bold text-zinc-300 hover:border-orange-500/50 disabled:opacity-50 whitespace-nowrap"
            >
              {tag}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-zinc-400">
            가사 <span className="font-normal">{text.length.toLocaleString()}/{MAX.toLocaleString()}</span>
          </span>
          <textarea
            aria-label="가사"
            value={text}
            maxLength={MAX}
            rows={14}
            disabled={busy !== ""}
            onChange={(e) => setText(e.target.value)}
            placeholder={"「✨ AI로 가사 생성」을 누르거나 직접 작성하세요.\n예)\n[Verse 1]\n바람이 불어오는 길 위에\n…"}
            className="input w-full font-mono text-xs leading-relaxed"
          />
        </label>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">⚠️ {error}</div>
        )}
        {notice && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">✅ {notice}</div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy !== ""}
            className="rounded-xl border border-orange-500/50 bg-orange-500/15 px-4 py-2 text-xs font-bold text-orange-200 hover:bg-orange-500/25 disabled:opacity-50 whitespace-nowrap"
          >
            {busy === "generate" ? "✨ 가사 만드는 중…" : saved.trim() ? "✨ AI로 가사 다시 생성" : "✨ AI로 가사 생성"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy !== "" || !dirty}
            className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50 whitespace-nowrap"
          >
            {busy === "save" ? "✅ 확정 중…" : "✅ 가사 확정"}
          </button>
          {dirty && (
            <button
              type="button"
              onClick={() => setText(saved)}
              disabled={busy !== ""}
              className="rounded-xl border border-[#2c2c3a] px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 disabled:opacity-50 whitespace-nowrap"
            >
              수정 취소
            </button>
          )}
        </div>
      </div>
      {missingKey && <ApiKeyRequiredModal missingLabels={["OpenAI"]} onClose={() => setMissingKey(false)} />}
    </>
  );
}
