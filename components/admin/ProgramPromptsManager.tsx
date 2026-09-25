"use client";

import { useState, useMemo } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  Trash2,
  Filter,
  Power,
  RefreshCw,
  FolderOpen,
  Tag,
  Layers,
  HelpCircle,
} from "lucide-react";
import GoldGradientText from "@/components/ui/GoldGradientText";

export interface ProgramPromptItem {
  id: string;
  program_slug: string;
  category: string;
  title: string;
  prompt_text: string;
  description?: string;
  tags?: string[];
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProgramInfo {
  slug: string;
  name: string;
}

interface Props {
  initialPrompts: ProgramPromptItem[];
  programsList: ProgramInfo[];
}

export default function ProgramPromptsManager({ initialPrompts, programsList }: Props) {
  const [prompts, setPrompts] = useState<ProgramPromptItem[]>(initialPrompts);
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 모달 상태 (추가 / 수정)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<ProgramPromptItem | null>(null);

  // 폼 상태
  const [formProgramSlug, setFormProgramSlug] = useState<string>("ai-image-studio");
  const [formCategory, setFormCategory] = useState<string>("화풍/스타일");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formPromptText, setFormPromptText] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formTags, setFormTags] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formSortOrder, setFormSortOrder] = useState<number>(0);

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 목록 새로고침
  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 카테고리 목록 추출
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    prompts.forEach((p) => {
      if (p.category) categories.add(p.category);
    });
    return Array.from(categories);
  }, [prompts]);

  // 필터링된 프롬프트 목록
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchProg = selectedProgram === "all" || p.program_slug === selectedProgram || p.program_slug === "all";
      const matchCat = selectedCategory === "all" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.prompt_text.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)));

      return matchProg && matchCat && matchSearch;
    });
  }, [prompts, selectedProgram, selectedCategory, searchQuery]);

  // 프로그램 이름 매핑
  const getProgramName = (slug: string) => {
    if (slug === "all") return "🌐 전체 프로그램 공통";
    const found = programsList.find((p) => p.slug === slug);
    return found ? found.name : slug;
  };

  // 복사 기능
  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("클립보드에 프롬프트가 복사되었습니다!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 모달 열기 (신규)
  const openNewModal = () => {
    setEditingPrompt(null);
    setFormProgramSlug(selectedProgram !== "all" ? selectedProgram : "ai-image-studio");
    setFormCategory("기본 프롬프트");
    setFormTitle("");
    setFormPromptText("");
    setFormDescription("");
    setFormTags("");
    setFormIsActive(true);
    setFormSortOrder(0);
    setIsModalOpen(true);
  };

  // 모달 열기 (수정)
  const openEditModal = (p: ProgramPromptItem) => {
    setEditingPrompt(p);
    setFormProgramSlug(p.program_slug);
    setFormCategory(p.category || "일반");
    setFormTitle(p.title);
    setFormPromptText(p.prompt_text);
    setFormDescription(p.description || "");
    setFormTags(p.tags ? p.tags.join(", ") : "");
    setFormIsActive(p.is_active);
    setFormSortOrder(p.sort_order || 0);
    setIsModalOpen(true);
  };

  // 저장 (POST / PUT)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPromptText.trim()) {
      alert("제목과 프롬프트 내용은 필수 입력 항목입니다.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        program_slug: formProgramSlug,
        category: formCategory.trim() || "general",
        title: formTitle.trim(),
        prompt_text: formPromptText.trim(),
        description: formDescription.trim(),
        tags: formTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        is_active: formIsActive,
        sort_order: Number(formSortOrder),
      };

      let res;
      if (editingPrompt) {
        res = await fetch("/api/admin/prompts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingPrompt.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        await fetchPrompts();
        showToast(editingPrompt ? "프롬프트가 수정되었습니다." : "새 프롬프트가 등록되었습니다.");
      } else {
        const err = await res.json();
        alert(`저장 실패: ${err.error || "오류가 발생했습니다."}`);
      }
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 상태 토글
  const handleToggleActive = async (p: ProgramPromptItem) => {
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
      });
      if (res.ok) {
        setPrompts((prev) => prev.map((item) => (item.id === p.id ? { ...item, is_active: !item.is_active } : item)));
        showToast(`${p.title} 프롬프트 상태가 변경되었습니다.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 삭제
  const handleDelete = async (p: ProgramPromptItem) => {
    if (!confirm(`'${p.title}' 프롬프트를 정말 삭제하시겠습니까?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/prompts?id=${p.id}`, { method: "DELETE" });
      if (res.ok) {
        setPrompts((prev) => prev.filter((item) => item.id !== p.id));
        showToast("프롬프트가 삭제되었습니다.");
      } else {
        alert("삭제 실패");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 시드 샘플 생성
  const handleSeedSamples = async () => {
    if (!confirm("기본 프롬프트 샘플 데이터를 생성하시겠습니까?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prompts/seed", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await fetchPrompts();
        showToast(data.seeded ? "기본 프롬프트 샘플이 정상 추가되었습니다!" : data.message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-amber-500 text-zinc-950 font-bold px-4 py-3 shadow-xl border border-amber-400 flex items-center gap-2 animate-bounce">
          <Check size={18} />
          {toastMessage}
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gold/20 bg-surface/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtext uppercase tracking-wider">등록된 프롬프트 총계</span>
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{prompts.length}</span>
            <span className="text-xs text-gold">개 항목</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gold/20 bg-surface/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtext uppercase tracking-wider">연동 프로그램 종류</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{programsList.length}</span>
            <span className="text-xs text-cyan-400">개 등록됨</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gold/20 bg-surface/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-subtext uppercase tracking-wider">프롬프트 카테고리</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FolderOpen size={18} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{availableCategories.length}</span>
            <span className="text-xs text-indigo-400">개 분류</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Action Buttons */}
      <div className="rounded-2xl border border-gold/20 bg-surface p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Program Select Filter */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-gold/20 rounded-xl px-3 py-2 text-xs">
            <Filter size={14} className="text-gold" />
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-zinc-900 text-white">
                🌐 모든 프로그램 ({prompts.length})
              </option>
              {programsList.map((prog) => (
                <option key={prog.slug} value={prog.slug} className="bg-zinc-900 text-white">
                  {prog.name} ({prog.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div className="flex items-center gap-1.5 bg-black/40 border border-gold/20 rounded-xl px-3 py-2 text-xs">
              <FolderOpen size={14} className="text-subtext" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-white focus:outline-none cursor-pointer font-medium"
              >
                <option value="all" className="bg-zinc-900 text-white">
                  전체 카테고리
                </option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtext" />
            <input
              type="text"
              placeholder="제목, 프롬프트 내용, 태그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-gold/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-subtext focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchPrompts}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gold/20 bg-black/40 text-subtext hover:text-white hover:border-gold/40 transition-colors"
            title="새로고침"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleSeedSamples}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-bold hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            🌱 샘플 생성
          </button>

          <button
            onClick={openNewModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold to-amber-500 text-zinc-950 text-xs font-black hover:opacity-90 transition-all shadow-md shadow-gold/20 flex items-center gap-1.5"
          >
            <Plus size={16} />
            새 프롬프트 추가
          </button>
        </div>
      </div>

      {/* Prompts Cards Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/20 bg-surface/40 p-12 text-center">
          <Sparkles className="mx-auto text-gold/40 mb-3" size={36} />
          <p className="text-white font-bold text-base">등록된 프롬프트가 없거나 검색 조건에 맞지 않습니다.</p>
          <p className="text-xs text-subtext mt-1">상단의 [+ 새 프롬프트 추가] 또는 [🌱 샘플 생성] 버튼을 클릭해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPrompts.map((p) => {
            const isCopied = copiedId === p.id;
            return (
              <div
                key={p.id}
                className={`group rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  p.is_active
                    ? "border-gold/20 bg-surface hover:border-gold/50 hover:shadow-lg hover:shadow-gold/5"
                    : "border-zinc-800 bg-zinc-950/60 opacity-60"
                }`}
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-full bg-gold/10 text-gold border border-gold/30 px-2.5 py-0.5 text-[11px] font-bold">
                        {getProgramName(p.program_slug)}
                      </span>
                      <span className="rounded-full bg-zinc-800 text-zinc-300 px-2.5 py-0.5 text-[11px] font-medium border border-zinc-700">
                        {p.category || "일반"}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        p.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      <Power size={10} />
                      {p.is_active ? "활성" : "비활성"}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-gold transition-colors">{p.title}</h3>
                  {p.description && <p className="text-xs text-subtext mt-1 leading-relaxed">{p.description}</p>}

                  {/* Prompt Text Box */}
                  <div className="relative mt-3 rounded-xl bg-black/60 border border-zinc-800 p-3 text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {p.prompt_text}
                  </div>

                  {/* Tags */}
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <Tag size={12} className="text-subtext" />
                      {p.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-md px-1.5 py-0.5">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">순서: {p.sort_order}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyPrompt(p.id, p.prompt_text)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        isCopied
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white border border-white/10"
                      }`}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      {isCopied ? "복사됨" : "복사"}
                    </button>

                    <button
                      onClick={() => openEditModal(p)}
                      className="px-2 py-1 rounded-lg bg-white/5 text-zinc-300 hover:bg-gold/20 hover:text-gold border border-white/10 text-xs font-medium transition-colors"
                      title="수정"
                    >
                      <Edit2 size={12} />
                    </button>

                    <button
                      onClick={() => handleDelete(p)}
                      className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-gold/30 bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gold/20 pb-4">
              <h2 className="text-lg font-bold text-white">
                <GoldGradientText>{editingPrompt ? "프롬프트 수정" : "새 프롬프트 등록"}</GoldGradientText>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-subtext hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Target Program & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-subtext font-bold mb-1">대상 프로그램 *</label>
                  <select
                    value={formProgramSlug}
                    onChange={(e) => setFormProgramSlug(e.target.value)}
                    className="w-full rounded-xl bg-black/60 border border-gold/30 p-2.5 text-white focus:outline-none focus:border-gold"
                  >
                    <option value="all">🌐 전체 프로그램 공통 (all)</option>
                    {programsList.map((prog) => (
                      <option key={prog.slug} value={prog.slug}>
                        {prog.name} ({prog.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-subtext font-bold mb-1">카테고리 (분류)</label>
                  <input
                    type="text"
                    placeholder="예: 실사 포토리얼리즘, SEO가이드, 바이럴"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl bg-black/60 border border-gold/30 p-2.5 text-white placeholder-subtext focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-subtext font-bold mb-1">프롬프트 제목 *</label>
                <input
                  type="text"
                  placeholder="예: 8K 네이처 포트레이트"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl bg-black/60 border border-gold/30 p-2.5 text-white placeholder-subtext focus:outline-none focus:border-gold"
                />
              </div>

              {/* Prompt Content Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-subtext font-bold">실제 프롬프트 내용 *</label>
                  <span className="text-[10px] text-gold">{formPromptText.length} 자</span>
                </div>
                <textarea
                  rows={5}
                  placeholder="AI 모델에게 전달될 영문/한문 프롬프트 구문을 입력하세요..."
                  value={formPromptText}
                  onChange={(e) => setFormPromptText(e.target.value)}
                  className="w-full rounded-xl bg-black/60 border border-gold/30 p-3 text-white placeholder-subtext font-mono focus:outline-none focus:border-gold leading-relaxed"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-subtext font-bold mb-1">설명 및 활용 팁</label>
                <input
                  type="text"
                  placeholder="예: 인물과 자연 배경의 조화를 강조하는 8K 실사용 템플릿"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl bg-black/60 border border-gold/30 p-2.5 text-white placeholder-subtext focus:outline-none focus:border-gold"
                />
              </div>

              {/* Tags & Sort Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-subtext font-bold mb-1">태그 (쉼표 분리)</label>
                  <input
                    type="text"
                    placeholder="실사, 포트레이트, 8K"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full rounded-xl bg-black/60 border border-gold/30 p-2.5 text-white placeholder-subtext focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-subtext font-bold mb-1">정렬 순서</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl bg-black/60 border border-gold/30 p-2.5 text-white focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modal_is_active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 accent-gold cursor-pointer"
                />
                <label htmlFor="modal_is_active" className="text-white font-bold cursor-pointer">
                  이 프롬프트 즉시 활성화 (사용자 노출)
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gold/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-subtext font-bold hover:bg-white/10 hover:text-white"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-gold to-amber-500 text-zinc-950 font-black hover:opacity-90 shadow-md shadow-gold/20"
                >
                  {loading ? "저장 중..." : editingPrompt ? "수정 완료" : "등록 하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
