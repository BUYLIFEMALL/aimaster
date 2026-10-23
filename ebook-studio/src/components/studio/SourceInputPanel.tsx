"use client";

import React, { useState } from "react";
import {
  Sparkles,
  FileText,
  Upload,
  RefreshCw,
  Globe,
  ClipboardPaste,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ListOrdered,
  RotateCcw,
} from "lucide-react";
import { EbookProject, SourceItem, OutlineItem } from "@/lib/types";
import { YOUTUBE_TRANSCRIPT_SCRIPT } from "@/lib/themes";
import { parseUploadedFile } from "@/lib/fileParser";

interface SourceInputPanelProps {
  project: EbookProject;
  onUpdateProject: (updates: Partial<EbookProject>) => void;
  onNextStep: () => void;
  apiKey: string;
  selectedModel: string;
}

export function SourceInputPanel({
  project,
  onUpdateProject,
  onNextStep,
  apiKey,
  selectedModel,
}: SourceInputPanelProps) {
  // 1. 입력 모드 탭/아코디언 상태
  const [activeTab, setActiveTab] = useState<"file" | "url" | "paste">("file");
  const [urlInput, setUrlInput] = useState("");
  const [isScrapingUrls, setIsScrapingUrls] = useState(false);
  const [urlScrapeNotice, setUrlScrapeNotice] = useState<string | null>(null);

  // 직접 붙여넣기 상태
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [copiedYtScript, setCopiedYtScript] = useState(false);

  // 로딩 및 에러
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const sources: SourceItem[] = project.sources || [];
  const outline: OutlineItem[] = project.outline || [];

  // 총 글자 수
  const totalChars = sources.reduce((sum, s) => sum + s.charCount, 0);

  // 목차 자동 분할 함수 (소스 기반)
  const generateOutlineFromSources = (currentSources: SourceItem[]): OutlineItem[] => {
    const items: OutlineItem[] = [];

    // 파일명 숫자 정렬 (01_, 02_ 등) 확인
    const sorted = [...currentSources].sort((a, b) => {
      const numA = parseInt(a.name.match(/^\d+/)?.[0] || "");
      const numB = parseInt(b.name.match(/^\d+/)?.[0] || "");
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return 0;
    });

    sorted.forEach((src) => {
      // 본문 안에 마크다운 헤딩(#, ##)이 있는지 확인
      const lines = src.content.split("\n");
      const headings: { title: string; lineIdx: number }[] = [];

      lines.forEach((line, idx) => {
        const match = line.trim().match(/^(#{1,3})\s+(.+)$/);
        if (match) {
          headings.push({ title: match[2].trim(), lineIdx: idx });
        }
      });

      if (headings.length > 0) {
        // 소제목 단위로 분할
        headings.forEach((h, hIdx) => {
          const nextH = headings[hIdx + 1];
          const sectionLines = lines.slice(
            h.lineIdx,
            nextH ? nextH.lineIdx : lines.length
          );
          const rawSection = sectionLines.join("\n").trim();
          items.push({
            id: `sec-${Date.now()}-${items.length}`,
            sourceId: src.id,
            title: h.title,
            originalTitle: h.title,
            rawContent: rawSection,
            charCount: rawSection.length,
          });
        });
      } else {
        // 소제목이 없으면 통째로 또는 3000자 초과 시 문단 단위 분할
        if (src.content.length > 3500) {
          // 문단 분할
          const paragraphs = src.content.split(/\n\s*\n/);
          let currentChunk = "";
          let chunkNum = 1;

          paragraphs.forEach((p) => {
            if (currentChunk.length + p.length > 3000 && currentChunk.length > 0) {
              const baseName = src.name.replace(/\.[^/.]+$/, "");
              const titleWithNum = `${baseName} (${chunkNum})`;
              items.push({
                id: `sec-${Date.now()}-${items.length}`,
                sourceId: src.id,
                title: titleWithNum,
                originalTitle: titleWithNum,
                rawContent: currentChunk.trim(),
                charCount: currentChunk.trim().length,
              });
              currentChunk = p;
              chunkNum++;
            } else {
              currentChunk += (currentChunk ? "\n\n" : "") + p;
            }
          });

          if (currentChunk.trim()) {
            const baseName = src.name.replace(/\.[^/.]+$/, "");
            const titleWithNum = `${baseName} (${chunkNum})`;
            items.push({
              id: `sec-${Date.now()}-${items.length}`,
              sourceId: src.id,
              title: titleWithNum,
              originalTitle: titleWithNum,
              rawContent: currentChunk.trim(),
              charCount: currentChunk.trim().length,
            });
          }
        } else {
          const baseName = src.name.replace(/\.[^/.]+$/, "");
          items.push({
            id: `sec-${Date.now()}-${items.length}`,
            sourceId: src.id,
            title: baseName,
            originalTitle: baseName,
            rawContent: src.content,
            charCount: src.charCount,
          });
        }
      }
    });

    return items;
  };

  // 소스 추가 헬퍼
  const addSourcesAndSync = (newSources: SourceItem[]) => {
    const updated = [...sources, ...newSources];
    const newOutline = generateOutlineFromSources(updated);

    // 전체 본문 합침
    const combinedRaw = updated.map((s) => s.content).join("\n\n---\n\n");

    onUpdateProject({
      sources: updated,
      outline: newOutline,
      rawSourceText: combinedRaw,
      // 제목이 없으면 첫 번째 자료명으로 설정
      title: project.title || updated[0]?.name.replace(/\.[^/.]+$/, "") || "",
    });
  };

  // 1. 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg("");
    const newItems: SourceItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseUploadedFile(file);
        if (parsed.text.length > 0) {
          newItems.push({
            id: `file-${Date.now()}-${i}`,
            name: parsed.name,
            type: "file",
            charCount: parsed.charCount,
            content: parsed.text,
          });
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "파일 읽기 실패");
      }
    }

    if (newItems.length > 0) {
      addSourcesAndSync(newItems);
    }
    e.target.value = "";
  };

  // 2. 웹 주소 일괄 분석 핸들러
  const handleScrapeUrls = async () => {
    const rawList = urlInput
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (rawList.length === 0) {
      setErrorMsg("분석할 웹 주소를 한 줄에 하나씩 입력해 주세요.");
      return;
    }

    if (rawList.length > 12) {
      setErrorMsg("웹 주소는 한 번에 최대 12개까지 입력 가능합니다.");
      return;
    }

    setIsScrapingUrls(true);
    setErrorMsg("");
    setUrlScrapeNotice(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: rawList }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "웹 주소 분석에 실패했습니다.");
      }

      const successes: SourceItem[] = [];
      const failed = data.failedUrls || [];

      data.results?.forEach((item: any, idx: number) => {
        if (item.success) {
          successes.push({
            id: `url-${Date.now()}-${idx}`,
            name: item.title || item.url,
            type: "url",
            charCount: item.charCount,
            content: item.content,
            url: item.url,
          });
        }
      });

      if (successes.length > 0) {
        addSourcesAndSync(successes);
      }

      if (failed.length > 0) {
        setUrlInput(failed.join("\n"));
        setUrlScrapeNotice(
          `성공: ${successes.length}개 / 수집 실패: ${failed.length}개 (실패한 주소는 입력창에 남겨두었습니다)`
        );
      } else {
        setUrlInput("");
        setUrlScrapeNotice(`성공적으로 ${successes.length}개 웹페이지를 가져왔습니다.`);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "주소 수집 중 오류가 발생했습니다.");
    } finally {
      setIsScrapingUrls(false);
    }
  };

  // 3. 직접 붙여넣기 자료 추가
  const handleAddPastedSource = () => {
    if (!pasteContent.trim() || pasteContent.trim().length < 50) {
      setErrorMsg("본문을 최소 50자 이상 입력해 주세요.");
      return;
    }

    setErrorMsg("");
    const name = pasteTitle.trim() || `직접 입력 자료 (${sources.length + 1})`;
    const newItem: SourceItem = {
      id: `paste-${Date.now()}`,
      name,
      type: "paste",
      charCount: pasteContent.trim().length,
      content: pasteContent.trim(),
    };

    addSourcesAndSync([newItem]);
    setPasteTitle("");
    setPasteContent("");
  };

  // 유튜브 자막 추출 스크립트 복사
  const handleCopyYoutubeScript = () => {
    navigator.clipboard.writeText(YOUTUBE_TRANSCRIPT_SCRIPT);
    setCopiedYtScript(true);
    setTimeout(() => setCopiedYtScript(false), 3000);
  };

  // 자료 삭제
  const handleRemoveSource = (id: string) => {
    const updated = sources.filter((s) => s.id !== id);
    const newOutline = generateOutlineFromSources(updated);
    const combinedRaw = updated.map((s) => s.content).join("\n\n---\n\n");
    onUpdateProject({
      sources: updated,
      outline: newOutline,
      rawSourceText: combinedRaw,
    });
  };

  // 목차 제목 인라인 수정
  const handleUpdateOutlineTitle = (outlineId: string, newTitle: string) => {
    const updated = outline.map((item) =>
      item.id === outlineId ? { ...item, title: newTitle } : item
    );
    onUpdateProject({ outline: updated });
  };

  // 목차 제목 원래대로 되돌리기
  const handleResetOutlineTitles = () => {
    const updated = outline.map((item) => ({
      ...item,
      title: item.originalTitle,
    }));
    onUpdateProject({ outline: updated });
  };

  // AI 스마트 목차 제안
  const handleAiSuggestOutline = async () => {
    if (outline.length === 0) {
      setErrorMsg("먼저 분석할 자료를 하나 이상 등록해 주세요.");
      return;
    }
    if (!apiKey) {
      setErrorMsg("AI 목차 제안을 위해 상단 [AI 연결 설정]에서 본인 Gemini API 키를 먼저 입력해 주세요.");
      return;
    }

    setIsAiSuggesting(true);
    setErrorMsg("");

    try {
      const outlinePreviews = outline.map((o) => ({
        id: o.id,
        currentTitle: o.title,
        snippet: o.rawContent.slice(0, 300),
      }));

      const res = await fetch("/api/ai/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: JSON.stringify(outlinePreviews),
          mode: "concise",
          apiKey,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI 목차 제안에 실패했습니다.");
      }

      // 제안된 챕터 제목 매핑
      if (data.result?.chapters && Array.isArray(data.result.chapters)) {
        const updated = outline.map((item, idx) => {
          const suggested = data.result.chapters[idx]?.title;
          return suggested ? { ...item, title: suggested } : item;
        });
        onUpdateProject({ outline: updated });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "AI 목차 제안 중 오류가 발생했습니다.");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 상단 섹션 타이틀 & 안내 뱃지 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
              01
            </span>
            <span className="truncate">원본 문서 자료 넣기</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            파일을 끌어다 놓거나, 웹 주소를 붙여 넣거나, 본문을 직접 붙여 넣으세요. 세 가지를 섞어도 한 권으로 묶입니다.
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          <div className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 whitespace-nowrap">
            총 {sources.length}개 자료 · {totalChars.toLocaleString()}자
          </div>
        </div>
      </div>

      {/* 3가지 입력 방식 탭 바 */}
      <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("file")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "file"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>파일 올리기</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("url")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "url"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>웹 주소 가져오기</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("paste")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "paste"
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>직접 붙여넣기</span>
        </button>
      </div>

      {/* 탭 1: 파일 업로드 드롭존 */}
      {activeTab === "file" && (
        <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-6 text-center transition cursor-pointer relative">
          <input
            type="file"
            multiple
            accept=".txt,.md,.docx,.text"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black text-slate-800">
            TXT · MD · DOCX 문서를 끌어다 놓거나 클릭하여 선택
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            기기 안에서 직접 텍스트를 읽어오며 서버로 파일을 전송하지 않습니다.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-500 font-medium">
            <span>파일당 최대 20MB</span>
            <span>•</span>
            <span>합계 최대 200,000자</span>
            <span>•</span>
            <span>최대 80장 구성</span>
          </div>
        </div>
      )}

      {/* 탭 2: 웹 주소 가져오기 */}
      {activeTab === "url" && (
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>기사·블로그·문서 주소 (한 줄에 하나씩)</span>
            </label>
            <span className="text-[11px] text-slate-400">최대 12개</span>
          </div>
          <textarea
            rows={4}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/article-1&#10;https://blog.naver.com/post-2"
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono transition"
          />

          {urlScrapeNotice && (
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-800 text-[11px] font-medium">
              {urlScrapeNotice}
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <p className="text-[11px] text-slate-400">
              * 본문 텍스트만 자동으로 골라오며, 실패한 주소는 입력창에 남겨 수정할 수 있습니다.
            </p>
            <button
              type="button"
              onClick={handleScrapeUrls}
              disabled={isScrapingUrls || !urlInput.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            >
              {isScrapingUrls ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>주소 분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>주소 분석 & 가져오기</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 탭 3: 직접 붙여넣기 */}
      {activeTab === "paste" && (
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="자료 이름 (선택, 비워두면 자동 지정)"
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 transition"
            />
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleCopyYoutubeScript}
                className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-slate-50 flex items-center gap-1.5 transition"
              >
                {copiedYtScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">스크립트 복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>유튜브 자막 추출 스크립트 복사</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="자료 본문을 50자 이상 붙여넣으세요. 유튜브 자막이나 복사한 인터뷰, 메모 등을 넣을 수 있습니다."
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed focus:bg-white focus:border-indigo-600 transition"
          />

          <div className="flex justify-between items-center pt-1">
            <small className="text-[11px] text-slate-400">
              * 유튜브 자막은 위 스크립트를 복사해 유튜브 페이지의 F12 콘솔에 넣으면 즉시 클립보드에 담깁니다.
            </small>
            <button
              type="button"
              onClick={handleAddPastedSource}
              disabled={!pasteContent.trim() || pasteContent.trim().length < 50}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black transition disabled:opacity-50"
            >
              자료로 추가 {pasteContent.trim().length > 0 && `(${pasteContent.trim().length.toLocaleString()}자)`}
            </button>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 등록된 원본 자료 목록 */}
      {sources.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>불러온 원본 자료 ({sources.length}개)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              * 등록된 순서가 책의 기본 장 순서가 됩니다.
            </span>
          </div>

          <div className="space-y-2">
            {sources.map((s, idx) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {s.type.toUpperCase()} · {s.charCount.toLocaleString()}자
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSource(s.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                  title="자료 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 스마트 목차 확인 & 제목 수정 영역 */}
      {outline.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">목차 구성 및 장 분할 ({outline.length}개 장)</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                여기 보이는 것이 그대로 책의 장이 됩니다. 제목을 직접 클릭해 고칠 수 있습니다.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetOutlineTitles}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1 transition whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>제목 되돌리기</span>
              </button>
              <button
                type="button"
                onClick={handleAiSuggestOutline}
                disabled={isAiSuggesting}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 flex items-center gap-1 transition disabled:opacity-50 whitespace-nowrap"
              >
                {isAiSuggesting ? (
                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                ) : (
                  <Sparkles className="w-3 h-3 shrink-0" />
                )}
                <span>AI 목차 제안</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {outline.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/60 border border-slate-200/80 hover:bg-white hover:border-indigo-200 transition"
              >
                <span className="w-6 text-[11px] font-black text-slate-400 text-center shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleUpdateOutlineTitle(item.id, e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs font-bold text-slate-800 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded-lg transition"
                />
                <span className="text-[10px] text-slate-400 shrink-0 pr-2">
                  {item.charCount.toLocaleString()}자
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 개인정보 및 팁 안내 */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          문서와 웹페이지의 텍스트로 구성합니다. 스캔 PDF는 OCR이 필요하며, 유튜브는 자막 추출 스크립트로 직접 붙여 넣어주세요. 입력된 원문은 회원님의 Google Gemini API 키로만 처리됩니다.
        </p>
      </div>

      {/* 다음 단계 버튼 */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onNextStep}
          disabled={outline.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>전자책 구성 정하기 (다음 단계)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
