"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, Archive, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { findTheme, measureLength, renderHtml, renderMarkdown, renderPlainText } from "@/lib/blog/article";
import type { BlogPost, ReviewStatus } from "@/lib/blog/types";
import { PostEditorPanel } from "./PostEditorPanel";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

interface Props {
  post: BlogPost;
  saveState: SaveState;
  saveError: string;
  /** 글·이미지 생성이 진행 중이면 편집을 잠근다 */
  locked: boolean;
  onChange: (next: BlogPost) => void;
  onSaveNow: () => void;
  onSyncToExtension: () => void;
  onOpenLibrary: () => void;
  imagesPanel: React.ReactNode;
}

const REVIEW: Record<ReviewStatus, { label: string; cls: string }> = {
  PASS: { label: "검수 통과", cls: "bg-emerald-100 text-emerald-800" },
  WARN: { label: "확인 필요", cls: "bg-amber-100 text-amber-800" },
  FAIL: { label: "수정 필요", cls: "bg-red-100 text-red-800" },
  UNKNOWN: { label: "검수 전", cls: "bg-slate-100 text-slate-600" },
};

export function PostResultView({ post, saveState, saveError, locked, onChange, onSaveNow, onSyncToExtension, onOpenLibrary, imagesPanel }: Props) {
  const [tab, setTab] = useState<"naver" | "markdown" | "text">("naver");
  const [copied, setCopied] = useState<"" | "html" | "markdown" | "text">("");
  const [synced, setSynced] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const html = useMemo(() => renderHtml(post.article, post.images, post.settings.themeId), [post]);
  const markdown = useMemo(() => renderMarkdown(post.article, post.images, post.title), [post]);
  const plain = useMemo(() => renderPlainText(post.article), [post]);
  const chars = measureLength(post.article);
  const review = REVIEW[post.reviewStatus];
  const theme = findTheme(post.settings.themeId);

  const flash = (kind: "html" | "markdown" | "text") => {
    setCopied(kind);
    setTimeout(() => setCopied(""), 1800);
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([plain], { type: "text/plain" }) })]);
    } catch {
      await navigator.clipboard.writeText(html);
    }
    flash("html");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6" id="result-section">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${review.cls}`}>{review.label}</span>
            <span className="text-[11px] text-slate-500">
              본문 {chars.toLocaleString()}자 (목표 {post.settings.targetLength.toLocaleString()}자) · 이미지 {post.images.filter((s) => s.url).length}/{post.images.length}장
            </span>
            <SaveBadge state={saveState} error={saveError} onRetry={onSaveNow} />
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">{post.title}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onOpenLibrary} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50">
            <Archive className="w-3.5 h-3.5" /> 내 보관함
          </button>
          <a href="https://blog.naver.com/GoBlogWrite.naver" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg transition">
            <span>네이버 글쓰기 열기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => {
              onSyncToExtension();
              setSynced(true);
              setTimeout(() => setSynced(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-lg transition"
            title="설치된 크롬 확장 프로그램으로 원고를 전달하여 네이버 글쓰기에서 자동 주입합니다"
          >
            {synced ? <><Check className="w-3.5 h-3.5" /><span>확장에 전달됨!</span></> : <><Sparkles className="w-3.5 h-3.5" /><span>⚡ 크롬 확장에 전달</span></>}
          </button>
          <button type="button" onClick={() => void copyHtml()} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs">
            {copied === "html" ? <><Check className="w-3.5 h-3.5" /><span>서식 복사됨!</span></> : <><Copy className="w-3.5 h-3.5" /><span>스마트에디터 ONE 서식 복사</span></>}
          </button>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(markdown); flash("markdown"); }} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition">
            {copied === "markdown" ? <><Check className="w-3.5 h-3.5" /><span>복사됨</span></> : <><Copy className="w-3.5 h-3.5" /><span>마크다운 복사</span></>}
          </button>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(plain); flash("text"); }} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
            {copied === "text" ? <><Check className="w-3.5 h-3.5" /><span>복사됨</span></> : <><Copy className="w-3.5 h-3.5" /><span>텍스트만 복사</span></>}
          </button>
        </div>
      </div>

      {/* 검수 의견 + 단계 기록 */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-2">
        <p className="text-xs text-slate-700"><b>검수 의견:</b> {post.reviewNote || "—"}</p>
        <button type="button" onClick={() => setShowSteps((v) => !v)} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">
          {showSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} 생성 단계 기록 ({post.steps.length})
        </button>
        {showSteps && (
          <ul className="space-y-1.5">
            {post.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                {s.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />}
                <span><b className="text-slate-800">{s.step}</b> · {s.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {imagesPanel}

      {/* 요약·태그 */}
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
        {post.summary && (
          <div>
            <span className="text-[11px] font-bold text-slate-600">스니펫 요약:</span>
            <p className="text-xs text-slate-700 mt-0.5">{post.summary}</p>
          </div>
        )}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 mr-1">추천 태그:</span>
            {post.tags.map((t, i) => (
              <span key={i} className="px-2 py-0.5 text-xs font-medium bg-white border border-slate-200 rounded-md" style={{ color: theme.color }}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      <PostEditorPanel key={post.article.length + post.title} post={post} locked={locked} onApply={onChange} />

      {/* 3가지 형식 미리보기 */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {([["naver", "네이버 블로그 (HTML 서식)"], ["markdown", "마크다운 (티스토리·워드프레스)"], ["text", "일반 텍스트"]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${tab === k ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400">
            {tab === "naver" ? "[서식 복사] 후 스마트에디터에 붙여넣기(Ctrl+V)하면 서식이 유지됩니다." : tab === "markdown" ? "마크다운을 지원하는 블로그에 붙여넣기하세요." : "메모장이나 SNS에 바로 활용하세요."}
          </span>
        </div>

        {tab === "naver" && <div className="max-w-none text-sm" dangerouslySetInnerHTML={{ __html: html }} />}
        {tab === "markdown" && <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">{markdown}</pre>}
        {tab === "text" && <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">{plain}</div>}
      </div>
    </div>
  );
}

function SaveBadge({ state, error, onRetry }: { state: SaveState; error: string; onRetry: () => void }) {
  if (state === "idle") return null;
  if (state === "error") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-red-600" title={error}>
        <AlertCircle className="w-3.5 h-3.5" /> 저장 실패
        <button type="button" onClick={onRetry} className="font-bold underline">다시 시도</button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-slate-500">
      {state === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : state === "saved" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : null}
      {state === "dirty" ? "저장 대기 중…" : state === "saving" ? "저장 중…" : "보관함에 자동 저장됨"}
    </span>
  );
}
