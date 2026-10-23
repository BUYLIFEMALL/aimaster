"use client";

// 「🔎 한 페이지 분석」 작업 화면 — 2026-10-21 병합 A로 Website Scraper(ghost-scraper ScraperWorkspace)를 옮김.
// 바뀐 점: 키를 브라우저로 받아 두던 설정 창·브라우저 저장(localStorage)·브라우저 직접 AI 호출을 없애고,
// AI 목록 정리는 서버(/api/inspect/ai)가 회원 본인 키로 처리한다. 모델은 웹 크롤링과 같은 목록에서 고른다.
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Database } from "lucide-react";
import { UrlInputSection } from "@/components/inspect/UrlInputSection";
import { ScraperTabs, type TabId } from "@/components/inspect/InspectTabs";
import { SectorModal } from "@/components/inspect/SectorModal";
import { KpiCard, KpiGrid } from "@/components/ui/KpiCard";
import { AI_MODEL_OPTIONS, AI_MODEL_PROVIDER_ORDER, AI_MODEL_PROVIDER_SHORT_LABELS, DEFAULT_MODEL_BY_PROVIDER, type AiModel } from "@/lib/ai/models";
import type { AiStructuredItem, CrawlResult, SelectedSector } from "@/lib/inspect/types";
import type { ApiKeyProvider } from "@/types/database.types";

export function InspectWorkspace({ providers }: { providers: ApiKeyProvider[] }) {
  const available = AI_MODEL_PROVIDER_ORDER.filter((p) => providers.includes(p));
  const [model, setModel] = useState<AiModel | "">(available.length ? DEFAULT_MODEL_BY_PROVIDER[available[0]] : "");
  const [url, setUrl] = useState("");
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [aiItems, setAiItems] = useState<AiStructuredItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);

  const handleStartCrawl = async (targetOverride?: string) => {
    const target = (targetOverride || url).trim();
    if (!target) { setErrorMessage("분석할 페이지 주소를 넣어 주세요."); return; }
    setIsLoading(true); setErrorMessage(null);
    try {
      const res = await fetch("/api/inspect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: target }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "페이지를 분석하지 못했습니다.");
      setCrawlResult(data); setAiItems(null); setActiveTab("overview");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "페이지 분석 중 오류가 발생했습니다.");
    } finally { setIsLoading(false); }
  };

  const handleRunAiAnalysis = async (customHtml?: string) => {
    const html = customHtml || crawlResult?.cleanedHtml;
    if (!html) { setErrorMessage("먼저 페이지를 분석하거나 화면에서 영역을 골라 주세요."); return; }
    if (!model) { setErrorMessage("AI 목록 정리를 하려면 설정에서 본인 AI 키를 먼저 등록해 주세요."); return; }
    setIsAiLoading(true); setErrorMessage(null);
    try {
      const res = await fetch("/api/inspect/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: crawlResult?.metadata.url || url, html, model }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 분석에 실패했습니다.");
      setAiItems(data.items); setActiveTab("aiResult");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "AI 분석 중 오류가 발생했습니다.");
    } finally { setIsAiLoading(false); }
  };

  const handleSelectSectorForAi = (sector: SelectedSector) => {
    setIsSectorModalOpen(false);
    void handleRunAiAnalysis(sector.html);
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-mx-danger bg-[#4c0519]/40 p-4 text-sm text-[#fecdd3]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-mx-danger" />
          <div className="flex-1"><p className="font-bold">안내 및 오류</p><p className="mt-0.5 leading-relaxed">{errorMessage}</p></div>
          <button type="button" onClick={() => setErrorMessage(null)} className="min-h-[36px] px-2 text-xs font-bold text-[#fda4af] hover:text-white">닫기</button>
        </div>
      )}

      <div className="mx-card flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs text-mx-muted">
          AI 목록 정리에 쓸 모델(본인 키)
          {available.length ? (
            <select value={model} onChange={(e) => setModel(e.target.value as AiModel)} className="mt-1 block min-w-[260px] rounded-lg border border-mx-border bg-mx-raised px-3 py-2 text-sm text-mx-text">
              {available.map((p) => (
                <optgroup key={p} label={AI_MODEL_PROVIDER_SHORT_LABELS[p]}>
                  {AI_MODEL_OPTIONS.filter((m) => m.provider === p).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </optgroup>
              ))}
            </select>
          ) : (
            <span className="mt-1 block text-sm text-mx-accent">등록된 AI 키가 없습니다 — <Link href="/settings" className="underline">설정에서 등록</Link>(페이지 분석·영역 선택은 키 없이 됩니다)</span>
          )}
        </label>
      </div>

      <UrlInputSection url={url} onChangeUrl={setUrl} onStartCrawl={() => void handleStartCrawl()} onOpenSectorModal={() => { if (!url.trim()) { setErrorMessage("영역을 고를 페이지 주소를 먼저 넣어 주세요."); return; } setIsSectorModalOpen(true); }} isLoading={isLoading} />

      {crawlResult && (
        <KpiGrid>
          <KpiCard icon="📝" label="감지된 글목록" value={crawlResult.stats.listItemsCount} hint="반복 목록 후보" />
          <KpiCard icon="🔗" label="링크" value={crawlResult.stats.linksCount} tone="green" />
          <KpiCard icon="🖼️" label="이미지" value={crawlResult.stats.imagesCount} tone="amber" />
          <KpiCard icon="🤖" label="AI 정리 항목" value={aiItems ? aiItems.length : "—"} hint={aiItems ? "AI 분석 완료" : `표 ${crawlResult.stats.tablesCount}개 · ${crawlResult.stats.payloadSizeKb} KB`} tone="muted" />
        </KpiGrid>
      )}

      {crawlResult ? (
        <ScraperTabs activeTab={activeTab} onChangeTab={setActiveTab} crawlResult={crawlResult} aiItems={aiItems} onRunAiAnalysis={() => void handleRunAiAnalysis()} isAiLoading={isAiLoading} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed border-mx-border bg-mx-surface p-8 py-16 text-center">
          <Database className="mx-auto h-10 w-10 text-mx-muted" />
          <h3 className="text-sm font-bold text-mx-text">아직 분석한 페이지가 없습니다</h3>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-mx-muted">
            위 입력창에 페이지 주소를 넣고 분석을 시작하거나, 화면에서 원하는 영역을 직접 눌러 그 부분만 가져오세요.
            여러 페이지를 한꺼번에 모으려면 <Link href="/jobs/new" className="underline">새 작업 만들기</Link>를 쓰세요.
          </p>
        </div>
      )}

      <SectorModal isOpen={isSectorModalOpen} onClose={() => setIsSectorModalOpen(false)} targetUrl={url} onSelectSectorForAi={handleSelectSectorForAi} onNavigateUrl={(newUrl) => { setUrl(newUrl); void handleStartCrawl(newUrl); }} />
    </div>
  );
}
