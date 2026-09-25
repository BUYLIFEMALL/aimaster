"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Edit2, Trash2, Tag, Search, Filter, RefreshCw, 
  Check, AlertCircle, FileText, Wand2, Sparkles, Layers, X 
} from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface PromptItem {
  id: string;
  style_id: string;
  label: string;
  prompt: string;
  display_order: number;
  created_at: string;
}

const PRESET_STYLES = [
  { id: "all", name: "전체 화풍 보기" },
  { id: "photorealistic", name: "실사 포토리얼리즘" },
  { id: "pixar_3d", name: "픽사 3D 애니메이션" },
  { id: "ghibli_anime", name: "지브리 감성 애니" },
  { id: "japanese_anime", name: "일본 2D 극장판 애니" },
  { id: "3d_digital", name: "3D 디지털 아트" },
  { id: "artistic_editorial", name: "감성 패션 화보" },
  { id: "vector_illustration", name: "벡터 일러스트" },
  { id: "cyberpunk_neon", name: "사이버펑크 네온" },
  { id: "oriental_ink", name: "동양 수묵화" },
  { id: "watercolor_pastel", name: "수채화 파스텔" },
  { id: "cinematic_film", name: "35mm 필름" },
  { id: "claymation", name: "클레이 스톱모션" },
  { id: "webtoon_lineart", name: "웹툰 라인아트" },
  { id: "architectural", name: "건축 & 인테리어" },
  { id: "dark_fantasy", name: "다크 판타지" },
  { id: "minimal_flat", name: "미니멀 플랫 아트" },
];

export default function PromptsManagementPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);

  // Form states
  const [formStyleId, setFormStyleId] = useState("photorealistic");
  const [formLabel, setFormLabel] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formOrder, setFormOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const url = selectedStyle && selectedStyle !== "all" 
        ? `/api/prompts?style_id=${selectedStyle}` 
        : `/api/prompts`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setPrompts(data.prompts || []);
      } else {
        console.error("Fetch prompts error:", data.error);
      }
    } catch (err) {
      console.error("Failed to load prompts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [selectedStyle]);

  const openCreateModal = () => {
    setEditingPrompt(null);
    setFormStyleId(selectedStyle === "all" ? "photorealistic" : selectedStyle);
    setFormLabel("");
    setFormPrompt("");
    setFormOrder(0);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PromptItem) => {
    setEditingPrompt(item);
    setFormStyleId(item.style_id);
    setFormLabel(item.label);
    setFormPrompt(item.prompt);
    setFormOrder(item.display_order || 0);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim() || !formPrompt.trim()) {
      setErrorMsg("태그 이름과 프롬프트 아이디어 문장을 모두 입력해주세요.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const isEdit = !!editingPrompt;
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        id: editingPrompt?.id,
        style_id: formStyleId,
        label: formLabel.startsWith("#") ? formLabel : `#${formLabel}`,
        prompt: formPrompt,
        display_order: formOrder,
      };

      const res = await fetch("/api/prompts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }

      setIsModalOpen(false);
      fetchPrompts();
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/prompts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPrompts((prev) => prev.filter((p) => p.id !== id));
        setDeletingId(null);
      } else {
        const data = await res.json();
        alert(`삭제 실패: ${data.error}`);
      }
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSeedData = async () => {
    if (!confirm("기본 13개 화풍 x 10개 (총 130개)의 초기 추천 프롬프트 데이터셋을 DB에 주입하시겠습니까?")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/prompts/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`성공적으로 130개 초기 프롬프트 데이터가 주입되었습니다!`);
        fetchPrompts();
      } else {
        alert(`시드 주입 실패: ${data.error}`);
      }
    } catch (err) {
      alert("시드 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = prompts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.label.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q);
  });

  const getStyleName = (id: string) => {
    const s = PRESET_STYLES.find((st) => st.id === id);
    return s ? s.name : id;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              화풍 프롬프트 게시판 관리
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              13가지 화풍별 추천 아이디어 태그 및 프롬프트 예시를 게시판 형태로 등록·수정·삭제할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSeedData}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
            title="기본 130개 프롬프트 데이터셋 DB 주입"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            초기 130개 주입
          </button>
          <button
            type="button"
            onClick={fetchPrompts}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-amber-400" : ""}`} />
            새로고침
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            새 예시 프롬프트 등록
          </button>
        </div>
      </div>

      {/* Style Filter Tabs & Search */}
      <div className="space-y-4">
        {/* Horizontal Filter Chips */}
        <div className="flex flex-wrap gap-2 pb-1">
          {PRESET_STYLES.map((st) => {
            const isSelected = selectedStyle === st.id;
            const count = st.id === "all" 
              ? prompts.length 
              : prompts.filter((p) => p.style_id === st.id).length;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStyle(st.id)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-amber-500 bg-amber-500/10 text-amber-300 font-bold shadow-sm shadow-amber-500/10"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <span>{st.name}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                  isSelected ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="태그 라벨 또는 프롬프트 검색..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Prompts Table / Board View */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3.5 w-36">화풍 카테고리</th>
                <th className="px-4 py-3.5 w-44">추천 태그 (#)</th>
                <th className="px-4 py-3.5">아이디어 프롬프트 전문</th>
                <th className="px-4 py-3.5 w-24 text-center">정렬 순서</th>
                <th className="px-4 py-3.5 w-28 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-400" />
                    프롬프트 데이터 로딩 중...
                  </td>
                </tr>
              ) : filteredPrompts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                    등록된 화풍 프롬프트가 없습니다. 상단 "+ 새 예시 프롬프트 등록" 버튼으로 추가해보세요!
                  </td>
                </tr>
              ) : (
                filteredPrompts.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 border border-zinc-800 px-2.5 py-1 text-xs font-semibold text-amber-400">
                        {getStyleName(item.style_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-amber-300">
                      {item.label}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-200 font-medium leading-relaxed">
                      {item.prompt}
                    </td>
                    <td className="px-4 py-3.5 text-center text-zinc-400 font-mono">
                      {item.display_order ?? 0}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                          title="수정"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-amber-400" />
                {editingPrompt ? "화풍 프롬프트 수정" : "새 화풍 프롬프트 등록"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">적용 화풍 카테고리</label>
                <select
                  value={formStyleId}
                  onChange={(e) => setFormStyleId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {PRESET_STYLES.filter((s) => s.id !== "all").map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">태그 버튼 명칭 (#)</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="예: #한옥카페 인물"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">아이디어 프롬프트 상세 문장 (한글)</label>
                <textarea
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="예: 서울 경복궁 한옥 카페에서 노트북으로 작업 중인 한복을 입은 20대 한국 여성, 따뜻한 오후 햇살"
                  rows={4}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">정렬 순서 (숫자 작을수록 상단)</label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="w-24 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {editingPrompt ? "수정 완료" : "등록 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              프롬프트 삭제 확인
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              정말로 이 추천 프롬프트 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
