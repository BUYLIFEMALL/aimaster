"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, Archive, Calendar, Check, CheckCircle2, ChevronDown, ChevronUp, Clock, Copy, ExternalLink, Loader2, Send, Sparkles, Zap } from "lucide-react";
import { findTheme, measureLength, renderHtml, renderMarkdown, renderPlainText } from "@/lib/blog/article";
import type { BlogPost, ReviewStatus } from "@/lib/blog/types";
import { PostEditorPanel } from "./PostEditorPanel";
import { NaverCategoryPicker } from "./NaverCategoryPicker";
import { saveLastNaverCategory } from "@/lib/blog/naverCategory";

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
          <button type="button" onClick={onOpenLibrary} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition shadow-2xs">
            <Archive className="w-3.5 h-3.5 text-slate-600" /> 내 보관함
          </button>
          <a href="https://blog.naver.com/GoBlogWrite.naver" target="_blank" rel="noreferrer" className="btn-platform-signup flex items-center gap-1.5 text-xs font-bold transition">
            <span>네이버 글쓰기 열기</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 네이버 블로그 스마트에디터 ONE 자동 포스팅 제어 센터 (네이버 스마트 그린 저널 테마) */}
      <div className="rounded-2xl border border-emerald-200 bg-[#edfbf3] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#03c75a] text-white shadow-xs">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                스마트에디터 ONE 포스팅 모드 & 자동 전송
              </h3>
              <p className="text-[11px] text-emerald-800 font-medium">
                원하는 발행 방식을 선택한 후 3D 실행 버튼을 누르면 크롬 확장을 통해 네이버 에디터에 자동 전송됩니다.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#047857] border border-emerald-300">
            네이버 공식 블로그 연동 규격
          </span>
        </div>

        {/* 1. 카테고리 선택 */}
        <div className="bg-white rounded-xl p-3 border border-emerald-100 shadow-2xs">
          <NaverCategoryPicker
            value={post.settings.naverCategory ?? null}
            disabled={locked}
            onChange={(c) => {
              saveLastNaverCategory(window.localStorage, c);
              const { naverCategory: _drop, ...rest } = post.settings;
              void _drop;
              onChange({ ...post, settings: c ? { ...rest, naverCategory: c } : rest });
            }}
          />
        </div>

        {/* 2. 포스팅 방식 3종 라디오 칩셋 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800">포스팅 방식 선택 (원고별 개별 지정)</span>
            <span className="text-[10px] text-slate-500 font-medium">회원이 고르지 않은 방식으로는 절대 발행되지 않습니다</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { id: "draft", label: "📝 발행 전까지", desc: "제목·본문·이미지 자동 입력 후 최종 검토" },
              { id: "immediate", label: "⚡ 즉시 포스팅", desc: "자동 입력 완료 후 즉시 원클릭 발행" },
              { id: "scheduled", label: "⏰ 예약 포스팅", desc: "지정한 예약 일시로 예약 발행" },
            ] as const).map((m) => {
              const currentMode = post.settings.postingMode ?? "draft";
              const isSelected = currentMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    onChange({
                      ...post,
                      settings: {
                        ...post.settings,
                        postingMode: m.id,
                      },
                    });
                  }}
                  className={`flex flex-col text-left p-3 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "bg-white border-[#03c75a] shadow-xs ring-2 ring-[#03c75a]/20"
                      : "bg-white/80 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isSelected ? "text-[#029a45]" : "text-slate-800"}`}>
                      {m.label}
                    </span>
                    <span className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-[#03c75a] bg-[#03c75a]" : "border-slate-300"}`}>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 leading-snug">{m.desc}</span>
                </button>
              );
            })}
          </div>

          {/* 예약 포스팅 선택 시 일시 인풋 */}
          {(post.settings.postingMode === "scheduled") && (
            <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-amber-200 text-xs">
              <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="font-bold text-slate-700 shrink-0">예약 일시 설정:</span>
              <input
                type="datetime-local"
                value={post.settings.scheduledAt || ""}
                onChange={(e) => {
                  onChange({
                    ...post,
                    settings: {
                      ...post.settings,
                      scheduledAt: e.target.value,
                    },
                  });
                }}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#03c75a]"
              />
            </div>
          )}
        </div>

        {/* 3. 메인 3D 전송 버튼 및 서식 복사 그룹 */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              onSyncToExtension();
              setSynced(true);
              setTimeout(() => setSynced(false), 2500);
            }}
            className="btn-3d-naver flex-1 sm:flex-initial text-xs font-black"
            title="설치된 크롬 확장 프로그램으로 원고를 전달하여 네이버 글쓰기에서 자동 주입합니다"
          >
            {synced ? (
              <>
                <Check className="w-4 h-4" />
                <span>🎉 확장에 전달 완료! (네이버 글쓰기에서 1초 주입)</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-emerald-200" />
                <span>🚀 네이버 스마트에디터 ONE 자동 전송 & 포스팅</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => void copyHtml()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white hover:bg-emerald-50 text-[#029a45] border border-emerald-300 rounded-xl transition shadow-2xs cursor-pointer"
          >
            {copied === "html" ? <><Check className="w-3.5 h-3.5" /><span>서식 복사됨!</span></> : <><Copy className="w-3.5 h-3.5" /><span>스마트에디터 ONE 서식 복사</span></>}
          </button>
          <button
            type="button"
            onClick={async () => { await navigator.clipboard.writeText(markdown); flash("markdown"); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
          >
            {copied === "markdown" ? <><Check className="w-3.5 h-3.5" /><span>복사됨</span></> : <><Copy className="w-3.5 h-3.5" /><span>마크다운 복사</span></>}
          </button>
          <button
            type="button"
            onClick={async () => { await navigator.clipboard.writeText(plain); flash("text"); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
          >
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
