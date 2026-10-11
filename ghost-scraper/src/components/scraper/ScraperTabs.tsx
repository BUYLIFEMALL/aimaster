"use client";

import React, { useState } from "react";
import {
  FileText,
  Bot,
  Layers,
  List,
  Table as TableIcon,
  Link2,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Loader2,
  FolderArchive,
  ArrowUpRight,
} from "lucide-react";
import JSZip from "jszip";
import { CrawlResult, AiStructuredItem } from "@/lib/types";
import { downloadCsv } from "@/lib/storage";

export type TabId = "overview" | "aiResult" | "structure" | "listItems" | "tables" | "links" | "images";

interface ScraperTabsProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  crawlResult: CrawlResult;
  aiItems: AiStructuredItem[] | null;
  onRunAiAnalysis: () => void;
  isAiLoading: boolean;
}

export function ScraperTabs({
  activeTab,
  onChangeTab,
  crawlResult,
  aiItems,
  onRunAiAnalysis,
  isAiLoading,
}: ScraperTabsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 이미지 일괄 ZIP 다운로드
  const handleDownloadImagesZip = async () => {
    if (!crawlResult.images || crawlResult.images.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("images");

      const promises = crawlResult.images.map(async (img, idx) => {
        try {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(img.src)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) return null;
          const blob = await res.blob();
          const ext = img.src.split(".").pop()?.split("?")[0]?.slice(0, 4) || "jpg";
          const filename = `image_${String(idx + 1).padStart(3, "0")}.${ext}`;
          folder?.file(filename, blob);
        } catch {
          // ignore individual error
        }
      });

      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `ghost_images_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert("이미지 ZIP 생성 중 오류가 발생했습니다.");
    } finally {
      setIsZipping(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview", label: "개요", icon: FileText },
    { id: "aiResult", label: "AI 분석", icon: Bot },
    { id: "structure", label: "구조", icon: Layers },
    { id: "listItems", label: "글목록", icon: List },
    { id: "tables", label: "표", icon: TableIcon },
    { id: "links", label: "링크", icon: Link2 },
    { id: "images", label: "이미지", icon: ImageIcon },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* 탭 네비게이션 헤더 */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-3.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                isActive
                  ? "border-indigo-600 bg-white text-indigo-700 shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.id === "aiResult" && aiItems && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-700 font-extrabold">
                  {aiItems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 영역 */}
      <div className="p-5 sm:p-6">
        {/* 1. 개요 탭 */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <p className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  페이지 제목
                </p>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {crawlResult.metadata.title || "제목 없음"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono break-all">
                  {crawlResult.metadata.url}
                </p>
              </div>

              <button
                type="button"
                onClick={onRunAiAnalysis}
                disabled={isAiLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-98 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gemini AI 분석 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-emerald-200" />
                    <span>AI 구조 분석 시작</span>
                  </>
                )}
              </button>
            </div>

            {/* 메타 설명 */}
            <div>
              <p className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">
                메타 설명 (Description)
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                {crawlResult.metadata.description || "메타 설명 정보가 없습니다."}
              </div>
            </div>

            {/* 세부 통계 그리드 */}
            <div>
              <p className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">
                기술 세부 정보
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold">상태 코드</span>
                  <p className="font-mono font-black text-emerald-600 mt-1">
                    HTTP {crawlResult.metadata.statusCode ?? 200}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold">인코딩</span>
                  <p className="font-mono font-black text-slate-800 mt-1">
                    {crawlResult.metadata.charset}
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold">페이로드 크기</span>
                  <p className="font-mono font-black text-slate-800 mt-1">
                    {crawlResult.stats.payloadSizeKb} KB
                  </p>
                </div>
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold">콘텐츠 타입</span>
                  <p className="font-mono font-bold text-slate-800 mt-1 truncate">
                    {crawlResult.metadata.contentType || "text/html"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. AI 분석 탭 */}
        {activeTab === "aiResult" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>AI 스마트 리스트 추출 결과</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Gemini 2.5 Flash 모델이 분석한 정형화 데이터
                </p>
              </div>

              {aiItems && aiItems.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      [
                        ["No", "Title", "URL", "Image URL"],
                        ...aiItems.map((item) => [
                          item.no.toString(),
                          item.title,
                          item.url,
                          item.imgUrl,
                        ]),
                      ],
                      "AI_스마트리스트"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV 다운로드</span>
                </button>
              )}
            </div>

            {aiItems && aiItems.length > 0 ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-200 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">NO</th>
                      <th className="py-2.5 px-3 w-20 text-center">이미지</th>
                      <th className="py-2.5 px-4">리스트 항목 (제목)</th>
                      <th className="py-2.5 px-4 hidden md:table-cell">URL</th>
                      <th className="py-2.5 px-3 w-16 text-center">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aiItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                          {item.no}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.imgUrl ? (
                            <img
                              src={item.imgUrl}
                              alt={item.title}
                              className="h-10 w-14 object-cover rounded-md border border-slate-200 mx-auto"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="h-10 w-14 bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center text-[9px] text-slate-400 mx-auto">
                              No Img
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 leading-snug">
                          {item.title}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-xs hidden md:table-cell">
                          {item.url}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="링크 열기"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isAiLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  Gemini AI가 HTML 데이터를 정밀 분석하여 스마트 리스트를 생성하고 있습니다...
                </p>
              </div>
            ) : (
              <div className="py-16 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                <Bot className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">
                  아직 AI 분석이 실행되지 않았습니다.
                </p>
                <button
                  type="button"
                  onClick={onRunAiAnalysis}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI 분석 시작하기</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. 구조 탭 */}
        {activeTab === "structure" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase font-mono">
                HTML 시맨틱 헤딩 계층
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    [
                      ["Tag", "Content", "Link"],
                      ...crawlResult.structure.h1.map((h) => ["H1", h.text, h.link || ""]),
                      ...crawlResult.structure.h2.map((h) => ["H2", h.text, h.link || ""]),
                      ...(crawlResult.structure.h3 || []).map((h) => ["H3", h.text, h.link || ""]),
                    ],
                    "페이지_구조"
                  )
                }
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV 다운로드</span>
              </button>
            </div>

            {/* H1 */}
            <div>
              <p className="text-[11px] font-mono font-bold text-slate-400 uppercase mb-2">
                헤딩 계층 (H1) · {crawlResult.structure.h1.length}개
              </p>
              <div className="space-y-1.5">
                {crawlResult.structure.h1.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="font-bold text-slate-900">{item.text}</span>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline shrink-0"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* H2 */}
            <div>
              <p className="text-[11px] font-mono font-bold text-slate-400 uppercase mb-2">
                하위 헤딩 (H2) · {crawlResult.structure.h2.length}개
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {crawlResult.structure.h2.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-100 bg-white text-xs flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <span className="font-medium text-slate-700 truncate">{item.text}</span>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-500 hover:text-indigo-700 shrink-0"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. 글목록 탭 */}
        {activeTab === "listItems" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase font-mono">
                감지된 글/아이템 목록 (상위 {crawlResult.listItems.length}개)
              </p>
              {crawlResult.listItems.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      [
                        ["Title", "Text", "Link"],
                        ...crawlResult.listItems.map((item) => [
                          item.title,
                          item.text,
                          item.link || "",
                        ]),
                      ],
                      "글목록"
                    )
                  }
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV 다운로드</span>
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {crawlResult.listItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-xs font-black text-slate-900 leading-snug">
                      {item.title}
                    </h4>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600 shrink-0"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.text}
                  </p>
                  {item.link && (
                    <p className="text-[10px] text-indigo-500 font-mono truncate">{item.link}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. 표 탭 */}
        {activeTab === "tables" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase font-mono">
                추출된 데이터 표 (총 {crawlResult.tables.length}개)
              </p>
            </div>

            {crawlResult.tables.length > 0 ? (
              crawlResult.tables.map((table, tIdx) => (
                <div key={tIdx} className="space-y-2 rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      TABLE #{tIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const csvRows = [
                          table.headers,
                          ...table.rows.map((row) =>
                            row.map((cell) => (typeof cell === "string" ? cell : cell.text))
                          ),
                        ];
                        downloadCsv(csvRows, `표_데이터_${tIdx + 1}`);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>CSV 받기</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs divide-y divide-slate-100">
                      {table.headers.length > 0 && (
                        <thead className="bg-slate-100 font-mono text-[10px] text-slate-700">
                          <tr>
                            {table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="py-2 px-3 font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody className="divide-y divide-slate-100">
                        {table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => {
                              const text = typeof cell === "string" ? cell : cell.text;
                              const url = typeof cell === "string" ? undefined : cell.url;
                              return (
                                <td key={cIdx} className="py-2 px-3 text-slate-700">
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:underline"
                                    >
                                      {text}
                                    </a>
                                  ) : (
                                    text
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                페이지 내에서 추출된 \`&lt;table&gt;\` 요소가 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 6. 링크 탭 */}
        {activeTab === "links" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase font-mono">
                추출된 하이퍼링크 ({crawlResult.links.length}개)
              </p>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    [["Text", "URL"], ...crawlResult.links.map((l) => [l.text, l.href])],
                    "링크_목록"
                  )
                }
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV 다운로드</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-200 font-mono text-[10px]">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">#</th>
                    <th className="py-2 px-3">앵커 텍스트</th>
                    <th className="py-2 px-3">대상 URL</th>
                    <th className="py-2 px-3 w-12 text-center">열기</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crawlResult.links.map((link, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {link.text || "(텍스트 없음)"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px] truncate max-w-sm">
                        {link.href}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 mx-auto" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. 이미지 탭 */}
        {activeTab === "images" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase font-mono">
                발견된 이미지 ({crawlResult.images.length}개)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImagesZip}
                  disabled={isZipping || crawlResult.images.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>ZIP 압축 중...</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="h-3.5 w-3.5" />
                      <span>ZIP으로 일괄 다운로드</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      [["Alt Text", "Source URL"], ...crawlResult.images.map((img) => [img.alt, img.src])],
                      "이미지_목록"
                    )
                  }
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-indigo-600 border border-slate-200 px-3 py-1.5 rounded-lg bg-white cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {crawlResult.images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl border border-slate-200 bg-white p-2 shadow-2xs hover:border-indigo-400 transition-all flex flex-col justify-between"
                >
                  <div className="h-32 w-full overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
                    <img
                      src={img.src}
                      alt={img.alt || `이미지 ${idx + 1}`}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate" title={img.alt}>
                      {img.alt || `image_${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate" title={img.src}>
                      {img.src}
                    </p>
                  </div>
                  <a
                    href={img.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block w-full text-center py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    원본 열기
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
