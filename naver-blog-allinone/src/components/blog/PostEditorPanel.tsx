"use client";

import React, { useState } from "react";
import { AlertCircle, Check, PenLine } from "lucide-react";
import { imageMarkerProblems, measureLength } from "@/lib/blog/article";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  post: BlogPost;
  locked: boolean;
  onApply: (next: BlogPost) => void;
}

/** 제목·요약·태그·본문 직접 편집. 본문은 [SECTION - …]/[IMAGE INSERT - …] 표식이 있는 원고 텍스트다. */
export function PostEditorPanel({ post, locked, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [summary, setSummary] = useState(post.summary);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [article, setArticle] = useState(post.article);

  const reopen = () => {
    setTitle(post.title);
    setSummary(post.summary);
    setTags(post.tags.join(", "));
    setArticle(post.article);
    setOpen(true);
  };

  const problems = imageMarkerProblems(article, post.images);

  const apply = () => {
    const cleanTags = tags.split(/[,，\n]/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean).slice(0, 15);
    onApply({
      ...post,
      title: title.trim() || post.title,
      summary: summary.trim(),
      tags: cleanTags,
      article,
      reviewStatus: "UNKNOWN",
      reviewNote: `직접 편집함 — 최종 원고를 다시 읽고 확인해주세요. (본문 ${measureLength(article)}자)`,
    });
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" onClick={reopen} disabled={locked} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50">
        <PenLine className="w-3.5 h-3.5" /> 본문·제목 편집
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 space-y-3 w-full">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">원고 편집</h4>
        <span className="text-[11px] text-slate-500">본문 {measureLength(article)}자</span>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">제목</label>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">요약(검색 결과에 보이는 2줄)</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value.slice(0, 300))} rows={2} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">태그(쉼표로 구분)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">본문</label>
        <textarea
          value={article}
          onChange={(e) => setArticle(e.target.value.slice(0, 60000))}
          rows={18}
          className="w-full px-3 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          [SECTION - 소제목] 소제목 · [IMAGE INSERT - 컷 이름] 이미지 자리 · 줄 앞 “- ” 목록 · 줄 앞 “&gt; ” 인용 · **강조** · 빈 줄로 단락 구분
        </p>
      </div>
      {problems.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
          {problems.map((p) => (
            <p key={p} className="flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{p}</p>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={apply} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
          <Check className="w-3.5 h-3.5" /> 편집 적용
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50">취소</button>
      </div>
    </div>
  );
}
