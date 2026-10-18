"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Sparkles, X, Clapperboard, Sliders, Layers } from "lucide-react";
import { ART_STYLES, SCENE_COUNTS, type ArtStyleId, type SceneCount } from "@/lib/music/presets";
import { newSceneId } from "@/lib/music/project";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, Field, INPUT, NeedStep, SELECT, StepHeader } from "@/components/studio/ui";

export default function StoryboardPage() {
  const { project, update, references, addReferences, removeReference, clearMedia } = useStudio();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!project.lyrics.trim()) {
    return (
      <NeedStep href="/music" label="1단계로 이동하여 가사 작성하기">
        먼저 1단계에서 노래 주제를 입력하여 가사를 생성하거나 직접 붙여 넣어주세요.
      </NeedStep>
    );
  }

  const generate = async () => {
    setConfirm(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/music/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          sunoStyle: project.sunoStyle,
          lyrics: project.lyrics,
          sceneCount: project.sceneCount,
          extra: project.extra,
          artStyle: project.artStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "스토리보드를 만들지 못했습니다.", needKey: data.needApiKey });
        return;
      }
      clearMedia();
      update((p) => ({ ...p, mood: data.mood || "", scenes: (data.scenes as { lyric: string; prompt: string }[]).map((s) => ({ id: newSceneId(), lyric: s.lyric, prompt: s.prompt })) }));
    } catch {
      setError({ message: "네트워크 오류로 스토리보드를 만들지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  const setScene = (id: string, patch: { lyric?: string; prompt?: string }) => update((p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const hasScenes = project.scenes.length > 0;

  return (
    <div className="space-y-6">
      <StepHeader step={2} title="스토리보드 분할" desc="가사를 장면으로 나누고, 장면마다 영문 촬영 묘사를 만듭니다. 만든 뒤 직접 고칠 수 있습니다." />

      <Card className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3">
          <Sliders size={16} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-white">비주얼 및 시나리오 설정</h2>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="생성할 장면 수">
            <select className={SELECT} value={project.sceneCount} onChange={(e) => update((p) => ({ ...p, sceneCount: Number(e.target.value) as SceneCount }))}>
              {SCENE_COUNTS.map((n) => (
                <option key={n} value={n} className="bg-[#080c14] text-slate-100">
                  {n}개 장면 (추천)
                </option>
              ))}
            </select>
          </Field>
          <Field label="기본 화풍">
            <select className={SELECT} value={project.artStyle} onChange={(e) => update((p) => ({ ...p, artStyle: e.target.value as ArtStyleId }))}>
              {ART_STYLES.map((s) => (
                <option key={s.value} value={s.value} className="bg-[#080c14] text-slate-100">
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="추가 묘사 (선택)" hint="예: 네온 비 내리는 밤, 흩날리는 벚꽃, 드론 시네마틱 뷰">
          <textarea className={`${INPUT} min-h-20`} value={project.extra} maxLength={300} onChange={(e) => update((p) => ({ ...p, extra: e.target.value }))} placeholder="장면에 공통으로 반영하고 싶은 연출 분위기를 입력하세요." />
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-200">참고 이미지 (선택, 최대 3장)</span>
          <div className="flex flex-wrap items-center gap-2.5">
            {references.map((r) => (
              <div key={r.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#1e293b] bg-[#080c14] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.dataUrl} alt="참고 이미지" className="h-full w-full object-cover" />
                <button type="button" aria-label="참고 이미지 삭제" onClick={() => removeReference(r.id)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-rose-600 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {references.length < 3 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[#1e293b] bg-[#080c14] text-xs text-slate-400 hover:border-cyan-500/50 hover:text-cyan-300 transition-all"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="text-[10px]">추가</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                await addReferences(files);
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 leading-normal">
            인물 외형이나 일관된 아트 스타일을 반영하고 싶을 때 업로드하세요. 장면 이미지를 생성할 때 참조되며 서버에 영구 보관되지 않습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" disabled={loading} onClick={() => (hasScenes ? setConfirm(true) : void generate())} className={BTN_PRIMARY}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>{hasScenes ? "스토리보드 다시 분할" : "스토리보드 자동 생성"}</span>
          </button>
          {loading && <span className="text-xs text-cyan-400 font-mono animate-pulse">AI가 가사를 장면별 영상 콘티로 나누는 중입니다…</span>}
        </div>
        {confirm && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-xs text-amber-200">
            <p className="font-semibold">⚠️ 지금 스토리보드와 만들어 둔 장면 이미지·영상이 사라지고 새로 만들어집니다. 계속할까요?</p>
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={() => void generate()} className={BTN_PRIMARY}>
                다시 생성
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={BTN_GHOST}>
                취소
              </button>
            </div>
          </div>
        )}
        {error && <ErrorNote message={error.message} needKey={error.needKey} />}
      </Card>

      {hasScenes && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-2">
              <Clapperboard size={18} className="text-cyan-400" />
              <h2 className="text-base font-bold text-white">뮤직비디오 장면 콘티 매트릭스</h2>
            </div>
            {project.mood && <span className="text-xs font-mono text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/25">{project.mood}</span>}
          </div>
          <div className="space-y-3.5">
            {project.scenes.map((s, i) => (
              <Card key={s.id} className="space-y-3 border-l-4 border-l-cyan-500">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300">
                    SCENE {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] text-slate-400">타임코드 맞춤 촬영 묘사</span>
                </div>
                <Field label="매칭 가사 구절">
                  <textarea className={`${INPUT} min-h-16 text-xs`} value={s.lyric} maxLength={300} onChange={(e) => setScene(s.id, { lyric: e.target.value })} />
                </Field>
                <Field label="시네마틱 촬영 묘사 (영문 — 이미지 및 Veo 비디오 생성 프롬프트)">
                  <textarea className={`${INPUT} min-h-24 text-xs font-mono text-cyan-200 leading-relaxed`} value={s.prompt} maxLength={900} onChange={(e) => setScene(s.id, { prompt: e.target.value })} />
                </Field>
              </Card>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <Link href="/scenes" className={BTN_PRIMARY}>
              <span>다음: 장면 영상 제작 →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
