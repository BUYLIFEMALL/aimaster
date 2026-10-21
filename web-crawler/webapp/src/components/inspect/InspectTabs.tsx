"use client";
// 2026-10-21 병합 A: Website Scraper(ghost-scraper)에서 옮김 — 웹 크롤링 자동화 「한 페이지 분석」(/inspect).

import React, { useMemo, useState } from "react";
import {
  FileText,
  Bot,
  Layers,
  List,
  Table as TableIcon,
  Link2,
  Image as ImageIcon,
  Download,
  Sparkles,
  Loader2,
  FolderArchive,
  ArrowUpRight,
} from "lucide-react";
import JSZip from "jszip";
import { CrawlResult, AiStructuredItem } from "@/lib/inspect/types";
import { downloadCsv } from "@/lib/inspect/csv";

export type TabId = "overview" | "aiResult" | "structure" | "listItems" | "tables" | "links" | "images";

interface ScraperTabsProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  crawlResult: CrawlResult;
  aiItems: AiStructuredItem[] | null;
  onRunAiAnalysis: () => void;
  isAiLoading: boolean;
}

// 공통: 섹션 머리(제목 + 오른쪽 버튼)
function TabHeader({ title, sub, children }: { title: React.ReactNode; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-mx-border pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-black text-mx-text">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-mx-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

function CsvButton({ onClick, label = "CSV 다운로드" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="mx-btn-ghost min-h-[36px] px-3 text-xs">
      <Download className="h-3.5 w-3.5 text-mx-success" />
      <span>{label}</span>
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="mx-input min-h-[40px] py-2 text-sm sm:max-w-xs"
    />
  );
}

function OpenLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-mx-muted hover:bg-mx-raised hover:text-mx-link"
      title="새 창에서 열기"
      aria-label="새 창에서 열기"
    >
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}

const includes = (q: string, ...fields: (string | undefined)[]) =>
  !q || fields.some((f) => (f ?? "").toLowerCase().includes(q));

export function ScraperTabs({
  activeTab,
  onChangeTab,
  crawlResult,
  aiItems,
  onRunAiAnalysis,
  isAiLoading,
}: ScraperTabsProps) {
  const [isZipping, setIsZipping] = useState(false);
  const [zipMessage, setZipMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredAi = useMemo(() => (aiItems ?? []).filter((i) => includes(q, i.title, i.url)), [aiItems, q]);
  const filteredList = useMemo(
    () => crawlResult.listItems.filter((i) => includes(q, i.title, i.text, i.link)),
    [crawlResult.listItems, q],
  );
  const filteredLinks = useMemo(
    () => crawlResult.links.filter((l) => includes(q, l.text, l.href)),
    [crawlResult.links, q],
  );

  // 이미지 일괄 ZIP 다운로드
  const handleDownloadImagesZip = async () => {
    if (!crawlResult.images || crawlResult.images.length === 0 || isZipping) return;
    setIsZipping(true);
    setZipMessage(null);
    try {
      const zip = new JSZip();
      const folder = zip.folder("images");
      let saved = 0;

      await Promise.all(
        crawlResult.images.map(async (img, idx) => {
          try {
            const res = await fetch(`/api/inspect/image?url=${encodeURIComponent(img.src)}`);
            if (!res.ok) return;
            const blob = await res.blob();
            const ext = img.src.split(".").pop()?.split("?")[0]?.slice(0, 4) || "jpg";
            folder?.file(`image_${String(idx + 1).padStart(3, "0")}.${ext}`, blob);
            saved += 1;
          } catch {
            // 개별 이미지 실패는 건너뛴다
          }
        }),
      );

      if (saved === 0) {
        setZipMessage("내려받을 수 있는 이미지가 없습니다(사이트가 이미지 다운로드를 막았을 수 있어요).");
        return;
      }
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `web_crawler_images_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      const failed = crawlResult.images.length - saved;
      setZipMessage(`✅ ${saved}개 저장${failed > 0 ? ` · ${failed}개는 사이트에서 받을 수 없어 제외` : ""}`);
    } catch {
      setZipMessage("이미지 ZIP 생성 중 오류가 발생했습니다.");
    } finally {
      setIsZipping(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: "overview", label: "개요", icon: FileText },
    { id: "aiResult", label: "AI 분석", icon: Bot, count: aiItems?.length },
    { id: "structure", label: "구조", icon: Layers },
    { id: "listItems", label: "글목록", icon: List, count: crawlResult.listItems.length },
    { id: "tables", label: "표", icon: TableIcon, count: crawlResult.tables.length },
    { id: "links", label: "링크", icon: Link2, count: crawlResult.links.length },
    { id: "images", label: "이미지", icon: ImageIcon, count: crawlResult.images.length },
  ];

  const changeTab = (id: TabId) => {
    setQuery("");
    onChangeTab(id);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-mx-border bg-mx-surface">
      {/* 탭 네비게이션 */}
      <div className="flex gap-1 overflow-x-auto border-b border-mx-border p-2" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => changeTab(tab.id)}
              className={`mx-toggle ${isActive ? "mx-toggle-active" : ""}`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-mx-link" : ""}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={tab.id === "aiResult" ? "mx-chip-green px-1.5 py-0 text-[10px]" : "mx-chip px-1.5 py-0 text-[10px]"}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        {/* 1. 개요 */}
        {activeTab === "overview" && (
          <>
            <TabHeader title={crawlResult.metadata.title || "제목 없음"} sub={crawlResult.metadata.url}>
              <button type="button" onClick={onRunAiAnalysis} disabled={isAiLoading} className="mx-btn-primary">
                {isAiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI 분석 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>🤖 AI 구조 분석 시작</span>
                  </>
                )}
              </button>
            </TabHeader>

            <div>
              <p className="mb-1 text-xs font-bold text-mx-muted">메타 설명 (Description)</p>
              <div className="rounded-xl border border-mx-border bg-mx-raised p-3 text-sm leading-relaxed text-mx-text">
                {crawlResult.metadata.description || "메타 설명 정보가 없습니다."}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold text-mx-muted">기술 세부 정보</p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  { label: "상태 코드", value: `HTTP ${crawlResult.metadata.statusCode ?? 200}`, tone: "text-mx-success" },
                  { label: "인코딩", value: crawlResult.metadata.charset, tone: "text-mx-text" },
                  { label: "페이로드 크기", value: `${crawlResult.stats.payloadSizeKb} KB`, tone: "text-mx-text" },
                  { label: "콘텐츠 타입", value: crawlResult.metadata.contentType || "text/html", tone: "text-mx-text" },
                ].map((d) => (
                  <div key={d.label} className="rounded-xl border border-mx-border bg-mx-raised p-3">
                    <span className="text-xs font-bold text-mx-muted">{d.label}</span>
                    <p className={`mt-1 truncate font-mono font-black ${d.tone}`}>{d.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 2. AI 분석 */}
        {activeTab === "aiResult" && (
          <>
            <TabHeader
              title={
                <>
                  <Sparkles className="h-4 w-4 text-mx-success" />
                  AI 스마트 리스트 추출 결과
                </>
              }
              sub="회원님 본인 AI 키로 분석한 정형화 데이터 (순번·제목·링크·썸네일)"
            >
              {aiItems && aiItems.length > 0 && (
                <>
                  <SearchBox value={query} onChange={setQuery} placeholder="🔎 제목·링크 검색" />
                  <CsvButton
                    onClick={() =>
                      downloadCsv(
                        [["No", "Title", "URL", "Image URL"], ...filteredAi.map((i) => [i.no.toString(), i.title, i.url, i.imgUrl])],
                        "AI_스마트리스트",
                      )
                    }
                  />
                </>
              )}
            </TabHeader>

            {aiItems && aiItems.length > 0 ? (
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="mx-table min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">No</th>
                      <th className="w-20 text-center">이미지</th>
                      <th>리스트 항목 (제목)</th>
                      <th className="hidden md:table-cell">URL</th>
                      <th className="w-14 text-center">열기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAi.map((item, idx) => (
                      <tr key={idx}>
                        <td className="text-center font-mono font-bold text-mx-muted">{item.no}</td>
                        <td className="text-center">
                          {item.imgUrl ? (
                            <img
                              src={item.imgUrl}
                              alt={item.title}
                              className="mx-auto h-10 w-14 rounded-md border border-mx-border object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="mx-auto flex h-10 w-14 items-center justify-center rounded-md border border-mx-border bg-mx-raised text-[10px] text-mx-muted">
                              없음
                            </div>
                          )}
                        </td>
                        <td className="font-bold leading-snug">{item.title}</td>
                        <td className="hidden max-w-xs truncate font-mono text-xs text-mx-muted md:table-cell">{item.url}</td>
                        <td className="text-center">
                          <OpenLink href={item.url} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAi.length === 0 && <p className="py-8 text-center text-sm text-mx-muted">검색 결과가 없습니다.</p>}
              </div>
            ) : isAiLoading ? (
              <div className="space-y-3 py-16 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-mx-success" />
                <p className="text-sm font-bold text-mx-text">AI가 HTML을 분석해 스마트 리스트를 만들고 있습니다...</p>
                <p className="text-xs text-mx-muted">보통 10~30초 걸립니다.</p>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-dashed border-mx-border py-16 text-center">
                <Bot className="mx-auto h-8 w-8 text-mx-muted" />
                <p className="text-sm text-mx-muted">아직 AI 분석이 실행되지 않았습니다.</p>
                <button type="button" onClick={onRunAiAnalysis} className="mx-btn-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>AI 분석 시작하기</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* 3. 구조 */}
        {activeTab === "structure" && (
          <>
            <TabHeader title="HTML 시맨틱 헤딩 계층" sub="페이지의 제목(H1)과 소제목(H2) 구조">
              <CsvButton
                onClick={() =>
                  downloadCsv(
                    [
                      ["Tag", "Content", "Link"],
                      ...crawlResult.structure.h1.map((h) => ["H1", h.text, h.link || ""]),
                      ...crawlResult.structure.h2.map((h) => ["H2", h.text, h.link || ""]),
                      ...(crawlResult.structure.h3 || []).map((h) => ["H3", h.text, h.link || ""]),
                    ],
                    "페이지_구조",
                  )
                }
              />
            </TabHeader>

            <div>
              <p className="mb-2 font-mono text-xs font-bold text-mx-muted">H1 · {crawlResult.structure.h1.length}개</p>
              <div className="space-y-1.5">
                {crawlResult.structure.h1.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-mx-border bg-mx-raised p-3 text-sm">
                    <span className="font-bold text-mx-text">
                      <span className="mx-chip-blue mr-2 px-1.5 py-0 text-[10px]">H1</span>
                      {item.text}
                    </span>
                    {item.link && <OpenLink href={item.link} />}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs font-bold text-mx-muted">H2 · {crawlResult.structure.h2.length}개</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {crawlResult.structure.h2.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-mx-border p-2.5 text-sm">
                    <span className="truncate text-mx-text">
                      <span className="mx-chip mr-2 px-1.5 py-0 text-[10px]">H2</span>
                      {item.text}
                    </span>
                    {item.link && <OpenLink href={item.link} />}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 4. 글목록 */}
        {activeTab === "listItems" && (
          <>
            <TabHeader title="감지된 글·아이템 목록" sub={`상위 ${crawlResult.listItems.length}개 — 반복되는 목록을 자동으로 찾았어요`}>
              {crawlResult.listItems.length > 0 && (
                <>
                  <SearchBox value={query} onChange={setQuery} placeholder="🔎 글목록 검색" />
                  <CsvButton
                    onClick={() =>
                      downloadCsv(
                        [["Title", "Text", "Link"], ...filteredList.map((i) => [i.title, i.text, i.link || ""])],
                        "글목록",
                      )
                    }
                  />
                </>
              )}
            </TabHeader>

            <div className="grid gap-2.5 md:grid-cols-2">
              {filteredList.map((item, idx) => (
                <div key={idx} className="space-y-1.5 rounded-xl border border-mx-border bg-mx-raised p-4 hover:border-mx-primary">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-black leading-snug text-mx-text">{item.title}</h4>
                    {item.link && <OpenLink href={item.link} />}
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-mx-muted">{item.text}</p>
                  {item.link && <p className="truncate font-mono text-[11px] text-mx-link">{item.link}</p>}
                </div>
              ))}
            </div>
            {filteredList.length === 0 && (
              <p className="py-8 text-center text-sm text-mx-muted">{q ? "검색 결과가 없습니다." : "감지된 글목록이 없습니다."}</p>
            )}
          </>
        )}

        {/* 5. 표 */}
        {activeTab === "tables" && (
          <>
            <TabHeader title={`추출된 데이터 표 (총 ${crawlResult.tables.length}개)`} sub="페이지 안의 <table>을 그대로 옮겼습니다" />

            {crawlResult.tables.length > 0 ? (
              crawlResult.tables.map((table, tIdx) => (
                <div key={tIdx} className="space-y-2 rounded-xl border border-mx-border bg-mx-raised p-4">
                  <div className="flex items-center justify-between">
                    <span className="mx-chip-amber px-2 py-0.5 font-mono text-[11px]">TABLE #{tIdx + 1}</span>
                    <CsvButton
                      label="CSV 받기"
                      onClick={() =>
                        downloadCsv(
                          [table.headers, ...table.rows.map((row) => row.map((cell) => (typeof cell === "string" ? cell : cell.text)))],
                          `표_데이터_${tIdx + 1}`,
                        )
                      }
                    />
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-mx-border bg-mx-surface">
                    <table className="mx-table">
                      {table.headers.length > 0 && (
                        <thead>
                          <tr>
                            {table.headers.map((h, hIdx) => (
                              <th key={hIdx}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {table.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => {
                              const text = typeof cell === "string" ? cell : cell.text;
                              const url = typeof cell === "string" ? undefined : cell.url;
                              return (
                                <td key={cIdx}>
                                  {url ? (
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-mx-link hover:underline">
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
              <p className="py-12 text-center text-sm text-mx-muted">페이지 안에서 추출된 표(&lt;table&gt;)가 없습니다.</p>
            )}
          </>
        )}

        {/* 6. 링크 */}
        {activeTab === "links" && (
          <>
            <TabHeader title={`추출된 하이퍼링크 (${crawlResult.links.length}개)`}>
              <SearchBox value={query} onChange={setQuery} placeholder="🔎 링크 텍스트·주소 검색" />
              <CsvButton
                onClick={() => downloadCsv([["Text", "URL"], ...filteredLinks.map((l) => [l.text, l.href])], "링크_목록")}
              />
            </TabHeader>

            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="mx-table min-w-[560px]">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>앵커 텍스트</th>
                    <th>대상 URL</th>
                    <th className="w-14 text-center">열기</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link, idx) => (
                    <tr key={idx}>
                      <td className="text-center font-mono text-mx-muted">{idx + 1}</td>
                      <td className="font-medium">
                        {link.text || "(텍스트 없음)"}
                        {link.isExternal && <span className="mx-chip ml-2 px-1.5 py-0 text-[10px]">외부</span>}
                      </td>
                      <td className="max-w-sm truncate font-mono text-xs text-mx-muted">{link.href}</td>
                      <td className="text-center">
                        <OpenLink href={link.href} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLinks.length === 0 && <p className="py-8 text-center text-sm text-mx-muted">검색 결과가 없습니다.</p>}
            </div>
          </>
        )}

        {/* 7. 이미지 */}
        {activeTab === "images" && (
          <>
            <TabHeader title={`발견된 이미지 (${crawlResult.images.length}개)`}>
              <button
                type="button"
                onClick={handleDownloadImagesZip}
                disabled={isZipping || crawlResult.images.length === 0}
                className="mx-btn-primary min-h-[36px] px-3 text-xs"
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
              <CsvButton
                label="CSV"
                onClick={() => downloadCsv([["Alt Text", "Source URL"], ...crawlResult.images.map((img) => [img.alt, img.src])], "이미지_목록")}
              />
            </TabHeader>
            {zipMessage && <p className="text-sm text-mx-muted">{zipMessage}</p>}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {crawlResult.images.map((img, idx) => (
                <div key={idx} className="group flex flex-col justify-between rounded-xl border border-mx-border bg-mx-raised p-2 hover:border-mx-primary">
                  <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg bg-mx-surface">
                    <img
                      src={img.src}
                      alt={img.alt || `이미지 ${idx + 1}`}
                      className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="truncate text-xs font-bold text-mx-text" title={img.alt}>
                      {img.alt || `image_${idx + 1}`}
                    </p>
                    <p className="truncate font-mono text-[10px] text-mx-muted" title={img.src}>
                      {img.src}
                    </p>
                  </div>
                  <a
                    href={img.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex min-h-[36px] w-full items-center justify-center rounded-lg bg-mx-surface text-xs font-bold text-mx-link hover:bg-mx-border"
                  >
                    원본 열기
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
