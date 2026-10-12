"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
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
      <NeedStep href="/music" label="1단계로 이동">
        먼저 1단계에서 가사를 만들거나 붙여 넣어주세요.
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
      <StepHeader step={2} title="스토리보드" desc="가사를 장면으로 나누고, 장면마다 영문 촬영 묘사를 만듭니다. 만든 뒤 직접 고칠 수 있습니다." />

      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-gray-900">비주얼 및 시나리오 설정</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="생성할 장면 수">
            <select className={SELECT} value={project.sceneCount} onChange={(e) => update((p) => ({ ...p, sceneCount: Number(e.target.value) as SceneCount }))}>
              {SCENE_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </Field>
          <Field label="기본 화풍">
            <select className={SELECT} value={project.artStyle} onChange={(e) => update((p) => ({ ...p, artStyle: e.target.value as ArtStyleId }))}>
              {ART_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="추가 묘사 (선택)" hint="예: 눈 내리는 밤, 흩날리는 벚꽃 — 서정적·낭만적 분위기가 기본으로 적용됩니다.">
          <textarea className={`${INPUT} min-h-20`} value={project.extra} maxLength={300} onChange={(e) => update((p) => ({ ...p, extra: e.target.value }))} />
        </Field>

        <div>
          <span className="mb-1 block text-xs font-bold text-gray-700">참고 이미지 (선택, 최대 3장)</span>
          <div className="flex flex-wrap items-center gap-2">
            {references.map((r) => (
              <div key={r.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.dataUrl} alt="참고 이미지" className="h-full w-full object-cover" />
                <button type="button" aria-label="참고 이미지 삭제" onClick={() => removeReference(r.id)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {references.length < 3 && (
              <button type="button" onClick={() => fileRef.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:bg-gray-50">
                <ImagePlus className="h-5 w-5" /> 추가
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
          <p className="mt-1 text-[11px] text-gray-500">인물 외형이나 분위기를 따르게 하고 싶을 때 올립니다. 장면 이미지를 만들 때만 사용되며 저장되지 않습니다(새로고침하면 사라집니다).</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={loading} onClick={() => (hasScenes ? setConfirm(true) : void generate())} className={BTN_PRIMARY}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {hasScenes ? "스토리보드 다시 생성" : "스토리보드 생성"}
          </button>
          {loading && <span className="text-xs text-gray-500">AI가 장면을 나누는 중입니다…</span>}
        </div>
        {confirm && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>지금 스토리보드와 만들어 둔 장면 이미지·영상이 사라지고 새로 만들어집니다. 계속할까요?</p>
            <div className="mt-2 flex gap-2">
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
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">뮤직비디오 스토리보드</h2>
            {project.mood && <p className="text-sm italic text-gray-500">{project.mood}</p>}
          </div>
          {project.scenes.map((s, i) => (
            <Card key={s.id} className="space-y-3">
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">SCENE {i + 1}</span>
              <Field label="가사">
                <textarea className={`${INPUT} min-h-16`} value={s.lyric} maxLength={300} onChange={(e) => setScene(s.id, { lyric: e.target.value })} />
              </Field>
              <Field label="촬영 묘사 (영문 — 이미지·영상 생성에 사용)">
                <textarea className={`${INPUT} min-h-24 text-xs`} value={s.prompt} maxLength={900} onChange={(e) => setScene(s.id, { prompt: e.target.value })} />
              </Field>
            </Card>
          ))}
          <div className="flex justify-end">
            <Link href="/scenes" className={BTN_PRIMARY}>
              다음: 장면 제작 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
