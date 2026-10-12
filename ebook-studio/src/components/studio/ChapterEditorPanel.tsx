"use client";

import React, { useState } from "react";
import {
  Layers,
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Edit3,
  CheckCircle2,
  ListPlus,
  HelpCircle,
  ArrowRight,
  Bold,
  Heading2,
  Heading3,
  Quote,
  List,
  Code,
} from "lucide-react";
import { EbookProject, Chapter } from "@/lib/types";

interface ChapterEditorPanelProps {
  project: EbookProject;
  onUpdateProject: (updates: Partial<EbookProject>) => void;
  onNextStep: () => void;
  apiKey: string;
  selectedModel: string;
}

export function ChapterEditorPanel({
  project,
  onUpdateProject,
  onNextStep,
  apiKey,
  selectedModel,
}: ChapterEditorPanelProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isWritingChapter, setIsWritingChapter] = useState(false);
  const [isWritingAll, setIsWritingAll] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const chapters = project.chapters;
  const currentChapter = chapters[selectedIdx] || null;

  const handleUpdateCurrentChapter = (updates: Partial<Chapter>) => {
    if (!currentChapter) return;
    const updatedChapters = chapters.map((ch, idx) =>
      idx === selectedIdx ? { ...ch, ...updates } : ch
    );
    onUpdateProject({ chapters: updatedChapters });
  };

  const handleAddChapter = () => {
    const newCh: Chapter = {
      id: `ch-${Date.now()}-${chapters.length}`,
      title: `제${chapters.length + 1}장. 새로운 챕터`,
      summary: "이 챕터의 주요 내용을 입력하세요.",
      content: "",
      takeaways: [],
      questions: [],
    };
    onUpdateProject({ chapters: [...chapters, newCh] });
    setSelectedIdx(chapters.length);
  };

  const handleDeleteChapter = (idx: number) => {
    if (chapters.length <= 1) {
      alert("최소 1개 이상의 챕터가 유지되어야 합니다.");
      return;
    }
    if (!confirm("이 챕터를 삭제하시겠습니까?")) return;
    const updated = chapters.filter((_, i) => i !== idx);
    onUpdateProject({ chapters: updated });
    setSelectedIdx(Math.max(0, idx - 1));
  };

  const handleMoveChapter = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= chapters.length) return;
    const updated = [...chapters];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    onUpdateProject({ chapters: updated });
    setSelectedIdx(targetIdx);
  };

  // 단일 챕터 AI 집필
  const handleWriteSingleChapter = async (idx: number) => {
    const ch = chapters[idx];
    if (!ch) return;

    setIsWritingChapter(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/ai/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookTitle: project.title,
          chapterIndex: idx + 1,
          chapterTitle: ch.title,
          chapterSummary: ch.summary,
          keyPoints: ch.takeaways,
          sourceContext: project.rawSourceText || "",
          apiKey,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "챕터 집필에 실패했습니다.");
      }

      const generated = data.chapter;
      const updatedChapters = chapters.map((c, i) =>
        i === idx
          ? {
              ...c,
              title: generated.title || c.title,
              summary: generated.summary || c.summary,
              content: generated.content || c.content,
              takeaways: generated.takeaways || c.takeaways,
              questions: generated.questions || c.questions,
            }
          : c
      );

      onUpdateProject({ chapters: updatedChapters });
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다.");
    } finally {
      setIsWritingChapter(false);
    }
  };

  // 전체 챕터 순차 일괄 집필
  const handleWriteAllChapters = async () => {
    if (!confirm("아직 작성되지 않은 챕터들을 순차적으로 AI 집필하시겠습니까?")) return;

    setIsWritingAll(true);
    setErrorMsg("");

    const currentChs = [...chapters];
    for (let i = 0; i < currentChs.length; i++) {
      if (currentChs[i].content && currentChs[i].content.trim().length > 100) {
        continue; // 이미 작성된 챕터는 스킵
      }

      setBatchProgress(`${i + 1}/${currentChs.length}장 집필 중... (${currentChs[i].title})`);

      try {
        const res = await fetch("/api/ai/chapter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookTitle: project.title,
            chapterIndex: i + 1,
            chapterTitle: currentChs[i].title,
            chapterSummary: currentChs[i].summary,
            keyPoints: currentChs[i].takeaways,
            sourceContext: project.rawSourceText || "",
            apiKey,
            model: selectedModel,
          }),
        });

        const data = await res.json();
        if (res.ok && data.chapter) {
          const gen = data.chapter;
          currentChs[i] = {
            ...currentChs[i],
            title: gen.title || currentChs[i].title,
            summary: gen.summary || currentChs[i].summary,
            content: gen.content || "",
            takeaways: gen.takeaways || [],
            questions: gen.questions || [],
          };
          onUpdateProject({ chapters: [...currentChs] });
        }
      } catch (err) {
        console.warn(`Chapter ${i + 1} write error:`, err);
      }
    }

    setIsWritingAll(false);
    setBatchProgress("");
  };

  // 서식 툴바 삽입 헬퍼
  const insertFormatting = (prefix: string, suffix: string = "") => {
    if (!currentChapter) return;
    const textarea = document.getElementById("chapter-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const replacement = `${prefix}${selected || "내용"}${suffix}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    handleUpdateCurrentChapter({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* 상단 액션 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-black text-slate-800">
            총 {chapters.length}개 챕터 구성
          </span>
          <span className="text-[11px] text-slate-400">
            (선택된 장: {selectedIdx + 1}장)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddChapter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>챕터 추가</span>
          </button>

          <button
            type="button"
            onClick={handleWriteAllChapters}
            disabled={isWritingAll || isWritingChapter}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs shadow-indigo-100 disabled:opacity-50"
          >
            {isWritingAll ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{batchProgress || "일괄 집필 중..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>전체 챕터 일괄 집필</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      {/* 2단 구성: 좌측 챕터 목록 탭 & 우측 상세 에디터 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 챕터 네비게이션 탭 (4단) */}
        <div className="lg:col-span-4 space-y-1.5 max-h-[650px] overflow-y-auto pr-1 custom-scrollbar">
          {chapters.map((ch, idx) => {
            const active = idx === selectedIdx;
            const hasContent = ch.content && ch.content.trim().length > 50;

            return (
              <div
                key={ch.id || idx}
                onClick={() => setSelectedIdx(idx)}
                className={`group p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                  active
                    ? "bg-indigo-50/80 border-indigo-300 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black mt-0.5 ${
                    active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {ch.title}
                    </h4>
                    {hasContent ? (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 shrink-0">
                        작성완료
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 shrink-0">초안</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {ch.summary || "내용 요약 없음"}
                  </p>
                </div>

                {/* 순서 이동 & 삭제 버튼 (마우스오버 시 표시) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveChapter(idx, "up");
                    }}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    title="위로 이동"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveChapter(idx, "down");
                    }}
                    disabled={idx === chapters.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    title="아래로 이동"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChapter(idx);
                    }}
                    className="p-1 text-rose-400 hover:text-rose-600"
                    title="챕터 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 챕터 상세 에디터 (8단) */}
        {currentChapter ? (
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            {/* 챕터 제목 & 원클릭 AI 집필 */}
            <div className="space-y-3 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">
                  CHAPTER {String(selectedIdx + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => handleWriteSingleChapter(selectedIdx)}
                  disabled={isWritingChapter}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition disabled:opacity-50"
                >
                  {isWritingChapter ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>AI 원고 집필 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>이 장만 AI로 집필하기</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">챕터 제목</label>
                <input
                  type="text"
                  value={currentChapter.title}
                  onChange={(e) => handleUpdateCurrentChapter({ title: e.target.value })}
                  className="w-full text-sm font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">챕터 요약 (소개글)</label>
                <input
                  type="text"
                  value={currentChapter.summary}
                  onChange={(e) => handleUpdateCurrentChapter({ summary: e.target.value })}
                  placeholder="이 장의 핵심 줄거리 및 독자가 배울 점"
                  className="w-full text-xs text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition mt-1"
                />
              </div>
            </div>

            {/* 마크다운 본문 에디터 & 서식 툴바 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  본문 원고 (Markdown)
                </label>
                {/* 간이 서식 툴바 */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => insertFormatting("### ")}
                    className="p-1 hover:bg-white rounded text-slate-600"
                    title="소제목 (H3)"
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1 hover:bg-white rounded text-slate-600"
                    title="굵게"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("> ")}
                    className="p-1 hover:bg-white rounded text-slate-600"
                    title="인용문"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("- ")}
                    className="p-1 hover:bg-white rounded text-slate-600"
                    title="목록"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting("`", "`")}
                    className="p-1 hover:bg-white rounded text-slate-600"
                    title="코드"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                id="chapter-editor-textarea"
                rows={12}
                value={currentChapter.content}
                onChange={(e) => handleUpdateCurrentChapter({ content: e.target.value })}
                placeholder="본문 내용을 입력하거나 상단의 [이 장만 AI로 집필하기]를 눌러 풍부한 원고를 자동으로 채워보세요."
                className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
              <div className="text-right text-[11px] text-slate-400">
                본문 글자 수: {(currentChapter.content || "").length.toLocaleString()}자
              </div>
            </div>

            {/* 핵심 인사이트 관리 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  💡 핵심 인사이트 (요약 리스트)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCurrentChapter({
                      takeaways: [...(currentChapter.takeaways || []), "새로운 인사이트"],
                    })
                  }
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>인사이트 추가</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {(currentChapter.takeaways || []).map((t, tIdx) => (
                  <div key={tIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => {
                        const newT = [...(currentChapter.takeaways || [])];
                        newT[tIdx] = e.target.value;
                        handleUpdateCurrentChapter({ takeaways: newT });
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newT = (currentChapter.takeaways || []).filter((_, i) => i !== tIdx);
                        handleUpdateCurrentChapter({ takeaways: newT });
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 생각하고 실천하기 질문 관리 */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  ✍️ 생각하고 실천하기 (독자 점검 질문)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateCurrentChapter({
                      questions: [...(currentChapter.questions || []), "새로운 실천 질문"],
                    })
                  }
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>질문 추가</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {(currentChapter.questions || []).map((q, qIdx) => (
                  <div key={qIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => {
                        const newQ = [...(currentChapter.questions || [])];
                        newQ[qIdx] = e.target.value;
                        handleUpdateCurrentChapter({ questions: newQ });
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = (currentChapter.questions || []).filter((_, i) => i !== qIdx);
                        handleUpdateCurrentChapter({ questions: newQ });
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            챕터를 선택해주세요.
          </div>
        )}
      </div>

      {/* 다음 단계 버튼 */}
      <div className="pt-2 flex justify-between items-center">
        <button
          type="button"
          onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
          disabled={selectedIdx === 0}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30"
        >
          ← 이전 챕터로
        </button>

        <button
          type="button"
          onClick={onNextStep}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-100 transition"
        >
          <span>디자인 & 표지 설정으로 이동</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
