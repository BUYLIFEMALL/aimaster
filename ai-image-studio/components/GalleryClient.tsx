"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Trash2,
  Maximize2,
  X,
  Sparkles,
  ArrowRight,
  CheckSquare,
  Square,
  Layers,
  AlertTriangle
} from "lucide-react";

interface GalleryItem {
  id: string;
  provider: string;
  model: string;
  prompt: string;
  enhanced_prompt?: string;
  image_url: string;
  created_at: string;
}

interface GalleryClientProps {
  initialItems: GalleryItem[];
}

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI (GPT Image)",
  gemini: "Google Gemini",
  replicate: "Replicate (FLUX / Recraft)",
  stability: "Stability AI",
};

const MODEL_NAMES: Record<string, string> = {
  "gpt-image-2": "GPT Image 2 (표준)",
  "gpt-image-2-large": "GPT Image 2 Large (고화질)",
  "gpt-image-1.5": "GPT Image 1.5",
  "gemini-3.1-flash": "Gemini 3.1 Flash",
  "gemini-3.1-pro": "Gemini 3.1 Pro",
  "flux-2-dev": "FLUX.2 dev",
  "flux-2-pro": "FLUX.2 pro",
  "flux-2-flex": "FLUX.2 flex",
  "flux-2-max": "FLUX.2 max",
  "sd3.5-large": "Stable Diffusion 3.5 Large",
};

function getProviderLabel(providerId: string): string {
  return PROVIDER_NAMES[providerId.toLowerCase()] || providerId.toUpperCase();
}

function getModelLabel(modelId: string): string {
  return MODEL_NAMES[modelId] || modelId;
}

const MODEL_FILTER_MAP: Record<string, { id: string; label: string }[]> = {
  all: [
    { id: "all", label: "전체 모델" },
    { id: "flux-2-dev", label: "FLUX.2 dev" },
    { id: "flux-2-pro", label: "FLUX.2 pro" },
    { id: "flux-2-flex", label: "FLUX.2 flex" },
    { id: "flux-2-max", label: "FLUX.2 max" },
    { id: "gpt-image-2", label: "GPT Image 2" },
    { id: "gpt-image-2-large", label: "GPT Image 2 Large" },
    { id: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
    { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
    { id: "sd3.5-large", label: "SD 3.5 Large" },
  ],
  replicate: [
    { id: "all", label: "전체 Replicate 모델" },
    { id: "flux-2-dev", label: "FLUX.2 dev" },
    { id: "flux-2-pro", label: "FLUX.2 pro" },
    { id: "flux-2-flex", label: "FLUX.2 flex" },
    { id: "flux-2-max", label: "FLUX.2 max" },
  ],
  openai: [
    { id: "all", label: "전체 OpenAI 모델" },
    { id: "gpt-image-2", label: "GPT Image 2 (표준)" },
    { id: "gpt-image-2-large", label: "GPT Image 2 Large (고화질)" },
    { id: "gpt-image-1.5", label: "GPT Image 1.5" },
  ],
  gemini: [
    { id: "all", label: "전체 Gemini 모델" },
    { id: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
    { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
  ],
  stability: [
    { id: "all", label: "전체 Stability 모델" },
    { id: "sd3.5-large", label: "Stable Diffusion 3.5 Large" },
  ],
};

export function GalleryClient({ initialItems }: GalleryClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeModalItem, setActiveModalItem] = useState<GalleryItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);

  const filteredItems = items.filter((item) => {
    const matchesProvider =
      selectedProvider === "all" || item.provider.toLowerCase() === selectedProvider.toLowerCase();
    const matchesModel =
      selectedModel === "all" || item.model.toLowerCase() === selectedModel.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProvider && matchesModel && matchesSearch;
  });

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setSelectedModel("all");
  };

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (imageUrl: string, filenameSuffix: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `ai_image_${filenameSuffix}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  const handleUsePrompt = (prompt: string) => {
    const encoded = encodeURIComponent(prompt);
    router.push(`/dashboard?prompt=${encoded}`);
  };

  // Toggle single item selection
  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle select all filtered items
  const toggleSelectAll = () => {
    const filteredIds = filteredItems.map((i) => i.id);
    const isAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Single deletion
  const handleDelete = async (id: string) => {
    if (!confirm("이 이미지를 갤러리 및 DB/저장소에서 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/gallery/delete?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedIds((prev) => prev.filter((i) => i !== id));
        if (activeModalItem?.id === id) {
          setActiveModalItem(null);
        }
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  // Batch delete selected checked items
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개의 이미지를 갤러리 및 DB/저장소에서 완전히 삭제하시겠습니까?`)) return;

    setIsBatchDeleting(true);
    try {
      const res = await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
        setSelectedIds([]);
        alert(`${selectedIds.length}개의 이미지가 성공적으로 삭제되었습니다.`);
      } else {
        alert("선택 삭제에 실패했습니다.");
      }
    } catch (err) {
      alert("삭제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Batch delete current category/filtered items
  const handleDeleteFilteredCategory = async () => {
    if (filteredItems.length === 0) return;
    const filterName =
      selectedProvider === "all"
        ? "현재 검색/조회 조건 전체"
        : `${getProviderLabel(selectedProvider)} 카테고리`;

    if (!confirm(`[${filterName}] 목록의 이미지 ${filteredItems.length}개를 일괄 삭제하시겠습니까?\nDB와 저장소 파일이 함께 영구 정리됩니다.`)) return;

    setIsBatchDeleting(true);
    const targetIds = filteredItems.map((i) => i.id);
    try {
      const res = await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targetIds }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => !targetIds.includes(item.id)));
        setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
        alert(`${targetIds.length}개의 이미지가 성공적으로 일괄 삭제되었습니다.`);
      } else {
        alert("카테고리 일괄 삭제에 실패했습니다.");
      }
    } catch (err) {
      alert("일괄 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Batch delete ALL user images in gallery
  const handleDeleteAll = async () => {
    if (items.length === 0) return;
    if (!confirm(`⚠️ 갤러리의 전체 이미지 ${items.length}개를 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 DB와 저장소에서 전부 삭제됩니다.`)) return;

    setIsBatchDeleting(true);
    try {
      const res = await fetch("/api/gallery/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteAll: true }),
      });
      if (res.ok) {
        setItems([]);
        setSelectedIds([]);
        alert("갤러리의 전체 이미지가 완전히 삭제되었습니다.");
      } else {
        alert("전체 삭제 처리에 실패했습니다.");
      }
    } catch (err) {
      alert("전체 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const providersList = [
    { id: "all", label: "전체 플랫폼" },
    { id: "openai", label: "OpenAI (GPT Image)" },
    { id: "gemini", label: "Google Gemini (Nanobanana)" },
    { id: "replicate", label: "Replicate (FLUX / Recraft / SDXL)" },
    { id: "stability", label: "Stability AI" },
  ];

  const currentModelList = MODEL_FILTER_MAP[selectedProvider] || MODEL_FILTER_MAP.all;
  const isAllFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((i) => selectedIds.includes(i.id));

  return (
    <div className="space-y-6">
      {/* Search, Provider & Model Filters */}
      <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 backdrop-blur-md space-y-3">
        {/* Row 1: Provider Filter Chips & Search Box */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Provider Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-zinc-400 shrink-0 ml-1 mr-1">플랫폼:</span>
            {providersList.map((p) => {
              const isSelected = selectedProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleProviderSelect(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-400/10"
                      : "bg-zinc-950/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="프롬프트 또는 모델 검색..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Row 2: Model Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-zinc-800/60 scrollbar-none">
          <span className="text-xs font-bold text-amber-400 shrink-0 ml-1 mr-1">세부 모델:</span>
          {currentModelList.map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold"
                    : "bg-zinc-950/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-800/80">
        {/* Left: Select All Checkbox & Count Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            disabled={filteredItems.length === 0}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isAllFilteredSelected
                ? "bg-amber-400 text-zinc-950 font-bold"
                : "bg-zinc-950 text-zinc-300 border border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            {isAllFilteredSelected ? (
              <CheckSquare className="h-4 w-4 text-zinc-950" />
            ) : (
              <Square className="h-4 w-4 text-zinc-500" />
            )}
            <span>
              {isAllFilteredSelected ? "선택 해제" : "현재 목록 전체 선택"} ({filteredItems.length}개)
            </span>
          </button>

          {selectedIds.length > 0 && (
            <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30 animate-pulse">
              ✓ {selectedIds.length}개 선택됨
            </span>
          )}
        </div>

        {/* Right: Batch Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Delete Selected Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isBatchDeleting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all shadow-md shadow-amber-500/10"
            >
              <Trash2 className="h-3.5 w-3.5 text-amber-400" />
              <span>선택항목 삭제 ({selectedIds.length})</span>
            </button>
          )}

          {/* Delete Current Filtered Category Button */}
          {filteredItems.length > 0 && (
            <button
              onClick={handleDeleteFilteredCategory}
              disabled={isBatchDeleting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-zinc-950 text-zinc-300 border border-zinc-800 hover:border-amber-500/50 hover:text-amber-300 transition-all"
            >
              <Layers className="h-3.5 w-3.5 text-zinc-400" />
              <span>현재 카테고리 일괄 삭제 ({filteredItems.length})</span>
            </button>
          )}

          {/* Delete All Gallery Items Button */}
          {items.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={isBatchDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-950/60 hover:text-red-300 transition-all"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <span>전체 갤러리 삭제 ({items.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500 mb-3">
            <ImageIcon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-300">
            {items.length === 0 ? "아직 생성된 이미지가 없습니다" : "검색 조건에 맞는 이미지가 없습니다"}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            {items.length === 0
              ? "[이미지 생성] 메인 작업실로 이동하여 AI 최적화 프롬프트로 첫 번째 고품질 이미지를 생성해보세요!"
              : "필터를 변경하거나 다른 프롬프트 검색어를 입력해보세요."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`group overflow-hidden rounded-2xl border transition-all flex flex-col shadow-lg relative ${
                  isSelected
                    ? "border-amber-400 bg-zinc-900/90 ring-2 ring-amber-400/30"
                    : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                {/* Checkbox Overlay Top-Left */}
                <button
                  onClick={() => toggleSelectItem(item.id)}
                  className={`absolute top-3 left-3 z-20 flex items-center justify-center p-1.5 rounded-xl backdrop-blur-md transition-all ${
                    isSelected
                      ? "bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-400/30 scale-105"
                      : "bg-zinc-950/80 text-zinc-400 hover:text-white border border-zinc-800 hover:border-amber-400/50"
                  }`}
                  title={isSelected ? "선택 해제" : "항목 선택"}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-zinc-950" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>

                {/* Image Thumbnail Container */}
                <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
                  <img
                    src={item.image_url}
                    alt={item.prompt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Top Badges (Shifted slightly right for checkbox) */}
                  <div className="absolute top-3 left-12 flex items-center gap-1.5 flex-wrap max-w-[75%]">
                    <span className="rounded-lg bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-zinc-800">
                      {getProviderLabel(item.provider)}
                    </span>
                    <span className="rounded-lg bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-zinc-300 border border-zinc-800">
                      {getModelLabel(item.model)}
                    </span>
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setActiveModalItem(item)}
                      className="p-3 rounded-xl bg-zinc-950/90 text-white hover:bg-amber-400 hover:text-zinc-950 transition-colors border border-zinc-700"
                      title="크게 보기"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(item.image_url, item.provider)}
                      className="p-3 rounded-xl bg-zinc-950/90 text-white hover:bg-emerald-400 hover:text-zinc-950 transition-colors border border-zinc-700"
                      title="다운로드"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-3 rounded-xl bg-zinc-950/90 text-white hover:bg-red-500 hover:text-white transition-colors border border-zinc-700"
                      title="삭제"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Card Footer Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-zinc-300 font-mono line-clamp-2 leading-relaxed bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/50">
                    {item.prompt}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      <span>{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyPrompt(item.id, item.prompt)}
                        className="text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{copiedId === item.id ? "복사됨" : "프롬프트"}</span>
                      </button>
                      <button
                        onClick={() => handleUsePrompt(item.prompt)}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                      >
                        <span>재생성</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Batch Action Bar (Appears when items are selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-950/95 border border-amber-500/50 backdrop-blur-xl px-6 py-3.5 rounded-2xl flex items-center gap-4 shadow-2xl shadow-amber-500/10 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs sm:text-sm font-bold text-white">
              <strong className="text-amber-400">{selectedIds.length}개</strong> 항목 선택됨
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded-lg transition-colors"
          >
            선택 해제
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={isBatchDeleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-md shadow-amber-400/20 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            <span>선택 항목 일괄 삭제</span>
          </button>
        </div>
      )}

      {/* Fullscreen Detail View Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  작업 결과 상세보기 [{getProviderLabel(activeModalItem.provider)} — {getModelLabel(activeModalItem.model)}]
                </h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <img
                  src={activeModalItem.image_url}
                  alt={activeModalItem.prompt}
                  className="w-full object-contain max-h-[500px]"
                />
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <span className="font-bold text-zinc-300">사용된 프롬프트 (Prompt):</span>
                  <p className="font-mono text-zinc-200 bg-zinc-900 p-3 rounded-xl border border-zinc-800 leading-relaxed max-h-48 overflow-y-auto">
                    {activeModalItem.prompt}
                  </p>
                </div>

                {activeModalItem.enhanced_prompt && activeModalItem.enhanced_prompt !== activeModalItem.prompt && (
                  <div className="space-y-1.5">
                    <span className="font-bold text-emerald-400">AI 보정 프롬프트 (Enhanced Prompt):</span>
                    <p className="font-mono text-zinc-300 bg-zinc-900 p-3 rounded-xl border border-zinc-800 leading-relaxed max-h-48 overflow-y-auto">
                      {activeModalItem.enhanced_prompt}
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 space-y-1.5">
                  <div>
                    <strong className="text-zinc-200">생성 일시:</strong>{" "}
                    {new Date(activeModalItem.created_at).toLocaleString("ko-KR")}
                  </div>
                  <div>
                    <strong className="text-zinc-200">플랫폼 / 모델:</strong> {getProviderLabel(activeModalItem.provider)} / {getModelLabel(activeModalItem.model)}
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    onClick={() => handleCopyPrompt(activeModalItem.id, activeModalItem.prompt)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium border border-zinc-800 transition-colors"
                  >
                    {copiedId === activeModalItem.id ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span>{copiedId === activeModalItem.id ? "복사됨" : "프롬프트 복사"}</span>
                  </button>

                  <button
                    onClick={() => handleDownload(activeModalItem.image_url, activeModalItem.provider)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold transition-colors shadow-md shadow-emerald-400/10"
                  >
                    <Download className="h-4 w-4" />
                    <span>다운로드</span>
                  </button>

                  <button
                    onClick={() => handleUsePrompt(activeModalItem.prompt)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold transition-colors shadow-md shadow-amber-400/10 mt-1"
                  >
                    <span>이 프롬프트로 작업실 이동</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
