"use client";

import React, { useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, RefreshCw, Trash2, Upload, X, ExternalLink, Wand2 } from "lucide-react";
import { appendImageMarker, removeImageMarker, renameImageMarker } from "@/lib/blog/article";
import type { BlogPost, ImageSlot } from "@/lib/blog/types";

interface Props {
  post: BlogPost;
  /** 글 생성·저장 등 다른 작업 중이면 버튼을 잠근다 */
  locked: boolean;
  /** 지금 생성 중인 컷 번호(없으면 null) */
  busyIndex: number | null;
  /** 전체 생성 진행 상황 */
  progress: { done: number; total: number } | null;
  hasKey: boolean;
  onChange: (next: BlogPost) => void;
  onGenerate: (index: number) => void;
  onGenerateAll: () => void;
  onUpload: (index: number, file: File) => void;
  onNeedKey: () => void;
}

const MAX_SLOTS = 6;

export function PostImagesPanel({ post, locked, busyIndex, progress, hasKey, onChange, onGenerate, onGenerateAll, onUpload, onNeedKey }: Props) {
  const [viewing, setViewing] = useState<string | null>(null);
  const [openPrompt, setOpenPrompt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadIndex = useRef<number>(0);
  const pending = post.images.filter((s) => !s.url).length;
  const anyBusy = busyIndex !== null || progress !== null;

  const patchSlot = (index: number, patch: Partial<ImageSlot>) => {
    onChange({ ...post, images: post.images.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  };

  const rename = (index: number, value: string) => {
    const slot = post.images[index];
    const next = value.replace(/[\r\n\]\[]/g, " ").trim().slice(0, 80);
    if (!next || next === slot.caption || post.images.some((s, i) => i !== index && s.caption === next)) return;
    onChange({ ...post, article: slot.type === "body" ? renameImageMarker(post.article, slot.caption, next) : post.article, images: post.images.map((s, i) => (i === index ? { ...s, caption: next } : s)) });
  };

  const remove = (index: number) => {
    const slot = post.images[index];
    onChange({ ...post, article: slot.type === "body" ? removeImageMarker(post.article, slot.caption) : post.article, images: post.images.filter((_, i) => i !== index) });
  };

  const addBodyCut = () => {
    if (post.images.length >= MAX_SLOTS) return;
    let n = post.images.filter((s) => s.type === "body").length + 1;
    let caption = `본문 ${n} · 추가 컷`;
    while (post.images.some((s) => s.caption === caption)) caption = `본문 ${++n} · 추가 컷`;
    onChange({
      ...post,
      article: appendImageMarker(post.article, caption),
      images: [...post.images, { type: "body", caption, prompt: `Blog illustration photo about ${post.title}, photorealistic, natural lighting` }],
    });
    setOpenPrompt(post.images.length);
  };

  const addThumbnail = () => {
    if (post.images.some((s) => s.type === "thumbnail")) return;
    onChange({
      ...post,
      images: [{ type: "thumbnail", caption: `${post.title} 대표 이미지`.slice(0, 80), prompt: `Blog cover photo about ${post.title}, bright natural lighting, photorealistic, clean composition` }, ...post.images],
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600"><ImageIcon className="w-4 h-4" /></span>
          <h4 className="text-sm font-bold text-slate-900">이미지 컷 ({post.images.filter((s) => s.url).length}/{post.images.length}장 완성)</h4>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!post.images.some((s) => s.type === "thumbnail") && (
            <button type="button" onClick={addThumbnail} disabled={locked || anyBusy} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">대표 컷 추가</button>
          )}
          <button type="button" onClick={addBodyCut} disabled={locked || anyBusy || post.images.length >= MAX_SLOTS} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" /> 본문 컷 추가
          </button>
          <button
            type="button"
            onClick={() => (hasKey ? onGenerateAll() : onNeedKey())}
            disabled={locked || anyBusy || pending === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {progress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            {progress ? `생성 중 ${progress.done}/${progress.total}` : pending ? `남은 ${pending}장 생성` : "모든 컷 완성"}
          </button>
        </div>
      </div>

      {post.images.length === 0 ? (
        <p className="text-xs text-slate-500">이미지 컷이 없습니다. [본문 컷 추가] 또는 [대표 컷 추가]로 만들 수 있습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {post.images.map((slot, index) => {
            const busy = busyIndex === index;
            return (
              <div key={slot.caption + index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${slot.type === "thumbnail" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-700"}`}>
                    {slot.type === "thumbnail" ? "대표" : `본문 ${post.images.slice(0, index + 1).filter((s) => s.type === "body").length}`}
                  </span>
                  <button type="button" onClick={() => remove(index)} disabled={locked || anyBusy} className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40" aria-label="컷 삭제" title="컷 삭제(본문 자리도 함께 지웁니다)">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-200 border border-slate-200 flex items-center justify-center">
                  {slot.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.url} alt={slot.caption} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setViewing(slot.url!)} />
                  ) : busy ? (
                    <div className="flex flex-col items-center gap-1.5 text-slate-500 text-[11px]"><Loader2 className="w-5 h-5 animate-spin" />이미지 생성 중…</div>
                  ) : (
                    <div className="text-[11px] text-slate-400 flex flex-col items-center gap-1"><ImageIcon className="w-5 h-5" />아직 생성하지 않았습니다</div>
                  )}
                  {slot.url && busy && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-purple-600" /></div>}
                </div>

                <input
                  defaultValue={slot.caption}
                  key={slot.caption}
                  onBlur={(e) => rename(index, e.target.value)}
                  disabled={locked}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  aria-label="컷 이름(본문 이미지 자리와 연결됩니다)"
                />

                <button type="button" onClick={() => setOpenPrompt(openPrompt === index ? null : index)} className="text-[11px] font-bold text-indigo-600 hover:underline">
                  {openPrompt === index ? "프롬프트 접기" : "프롬프트 보기·수정"}
                </button>
                {openPrompt === index && (
                  <textarea
                    value={slot.prompt}
                    onChange={(e) => patchSlot(index, { prompt: e.target.value.slice(0, 1500) })}
                    rows={4}
                    className="w-full px-2.5 py-2 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
                    placeholder="English image prompt"
                  />
                )}

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => (hasKey ? onGenerate(index) : onNeedKey())}
                    disabled={locked || anyBusy || !slot.prompt.trim()}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    {slot.url ? "다시 생성" : "생성"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      uploadIndex.current = index;
                      fileRef.current?.click();
                    }}
                    disabled={locked || anyBusy}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3" /> 내 이미지로
                  </button>
                  {slot.url && (
                    <a href={slot.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
                      <ExternalLink className="w-3 h-3" /> 원본
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUpload(uploadIndex.current, file);
        }}
      />

      <p className="text-[11px] text-slate-500">
        컷 이름은 본문의 이미지 자리와 연결됩니다. 이미지를 만들 때마다 서버 보관함에 자동 저장되며 요금은 회원님 Gemini 계정에 청구됩니다. 컷을 삭제하면 본문의 자리도 함께 사라집니다.
      </p>

      {viewing && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <button type="button" className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-slate-700" aria-label="닫기" onClick={() => setViewing(null)}>
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="크게 보기" className="max-h-full max-w-full rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
