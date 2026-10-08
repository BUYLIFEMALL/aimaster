"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Search,
  Globe,
  Video,
  Trash2,
  CheckCircle2,
  Archive,
  RotateCcw,
  ExternalLink,
  PenLine,
  AlertCircle,
  Sparkles,
  Play,
  Filter,
  Check,
  ChevronRight,
  TrendingUp,
  Folder,
  FolderInput,
  Settings2,
  ArrowRightLeft,
} from "lucide-react";
import type { BlogViralCandidate, ShortVideo, ShortsOrder, CollectorCategory } from "@/types/collector";
import { INITIAL_SAMPLE_CANDIDATES, DEFAULT_COLLECTOR_CATEGORIES } from "@/types/collector";
import { CategoryManagementModal } from "@/components/collector/CategoryManagementModal";
import ContentRetentionNotice from "@/components/ContentRetentionNotice";
import { retentionDaysLeft, retentionDeleteAt, isRetentionExpired } from "@/lib/retention";

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  ready: { label: "사용 가능", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  used: { label: "사용 완료", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  archived: { label: "보관", tone: "bg-neutral-100 text-neutral-600 border-neutral-200" },
};

const GRADE_TONE: Record<string, string> = {
  초대박: "bg-rose-600 text-white",
  대박: "bg-orange-500 text-white",
  떡상: "bg-amber-400 text-amber-950 font-bold",
  양호: "bg-emerald-100 text-emerald-800",
  보통: "bg-neutral-100 text-neutral-600",
  판정불가: "bg-neutral-100 text-neutral-400",
};

function formatNumber(num: number | null): string {
  if (num === null) return "비공개";
  if (num >= 100_000_000) return `${(num / 100_000_000).toFixed(1)}억`;
  if (num >= 10_000) return `${(num / 10_000).toFixed(1)}만`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}천`;
  return num.toLocaleString();
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export default function CollectorPage() {
  const router = useRouter();

  // 글감 목록 상태
  const [candidates, setCandidates] = useState<BlogViralCandidate[]>([]);
  const [mounted, setMounted] = useState(false);

  // 카테고리 관리 상태
  const [categories, setCategories] = useState<CollectorCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // 수집 시 저장할 카테고리 선택
  const [collectCategory, setCollectCategory] = useState<string>("");

  // 선택한 글감 카테고리 일괄 이동 상태
  const [bulkMoveCategory, setBulkMoveCategory] = useState<string>("");

  // 수집 탭 및 입력값
  const [activeTab, setActiveTab] = useState<"url" | "perplexity" | "shorts">("url");
  const [urlInput, setUrlInput] = useState("");
  const [topicInput, setTopicInput] = useState("");

  // 쇼츠 검색 필터 및 결과
  const [shortsQuery, setShortsQuery] = useState("");
  const [shortsDateFrom, setShortsDateFrom] = useState(() => isoDay(-30));
  const [shortsDateTo, setShortsDateTo] = useState(() => isoDay(0));
  const [shortsOrder, setShortsOrder] = useState<ShortsOrder>("viewCount");
  const [minViews, setMinViews] = useState("");
  const [maxSubs, setMaxSubs] = useState("");
  const [shortsList, setShortsList] = useState<ShortVideo[]>([]);
  const [searchingShorts, setSearchingShorts] = useState(false);
  const [analyzingShortId, setAnalyzingShortId] = useState<string | null>(null);

  // 공통 로딩 및 메시지
  const [collecting, setCollecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; needKey?: boolean } | null>(null);

  // 글감 상태 필터 & 체크박스 선택
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  // 1. LocalStorage 로드 (글감 및 카테고리)
  useEffect(() => {
    // 1-1. 카테고리 로드
    try {
      const savedCats = localStorage.getItem("nba_collector_categories");
      if (savedCats) {
        const parsed = JSON.parse(savedCats);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
        } else {
          setCategories(DEFAULT_COLLECTOR_CATEGORIES);
          localStorage.setItem("nba_collector_categories", JSON.stringify(DEFAULT_COLLECTOR_CATEGORIES));
        }
      } else {
        setCategories(DEFAULT_COLLECTOR_CATEGORIES);
        localStorage.setItem("nba_collector_categories", JSON.stringify(DEFAULT_COLLECTOR_CATEGORIES));
      }
    } catch {
      setCategories(DEFAULT_COLLECTOR_CATEGORIES);
    }

    // 1-2. 글감 로드 (보관 여부 is_archived 하위 호환 마이그레이션 포함)
    try {
      const saved = localStorage.getItem("nba_viral_candidates");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const migrated: BlogViralCandidate[] = parsed.map((item) => {
            let status = item.status;
            let is_archived = Boolean(item.is_archived);
            if (status === "archived") {
              status = "ready";
              is_archived = true;
            }
            return {
              ...item,
              status: status === "used" ? "used" : "ready",
              is_archived,
            };
          });
          const activeCandidates = migrated.filter((item) => {
            if (item.is_archived) return true;
            return !isRetentionExpired(item.created_at);
          });
          setCandidates(activeCandidates);
          localStorage.setItem("nba_viral_candidates", JSON.stringify(activeCandidates));
          setMounted(true);
          return;
        }
      }
      setCandidates(INITIAL_SAMPLE_CANDIDATES);
      localStorage.setItem("nba_viral_candidates", JSON.stringify(INITIAL_SAMPLE_CANDIDATES));
    } catch {
      setCandidates(INITIAL_SAMPLE_CANDIDATES);
    } finally {
      setMounted(true);
    }
  }, []);

  // 2. 글감 저장 헬퍼
  const persistCandidates = (updated: BlogViralCandidate[]) => {
    setCandidates(updated);
    try {
      localStorage.setItem("nba_viral_candidates", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save candidates to local storage:", e);
    }
  };

  // 3. 카테고리 저장 헬퍼
  const persistCategories = (updated: CollectorCategory[]) => {
    setCategories(updated);
    try {
      localStorage.setItem("nba_collector_categories", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save categories to local storage:", e);
    }
  };

  // 4. 카테고리 삭제 시 기존 글감 미분류 전환
  const handleCategoryDeleted = (deletedName: string) => {
    const updated = candidates.map((c) =>
      c.category === deletedName ? { ...c, category: "미분류" } : c
    );
    persistCandidates(updated);
    setMessage({
      type: "success",
      text: `"${deletedName}" 카테고리가 삭제되었으며, 기존 글감은 '미분류'로 안전하게 재분류되었습니다.`,
    });
  };

  // 5. 통계 집계 (사용 가능, 사용 완료, 보관 중)
  const readyCount = candidates.filter((c) => c.status === "ready").length;
  const usedCount = candidates.filter((c) => c.status === "used").length;
  const archivedCount = candidates.filter((c) => Boolean(c.is_archived)).length;

  // 카테고리별 글감 수 집계
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categories) {
      counts[cat.name] = 0;
    }
    let uncategorized = 0;
    for (const c of candidates) {
      if (counts[c.category] !== undefined) {
        counts[c.category] += 1;
      } else {
        uncategorized += 1;
      }
    }
    return { counts, uncategorized };
  }, [categories, candidates]);

  // 필터링된 글감 목록 (상태 필터 + 카테고리 필터)
  const visibleCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 상태 필터 (보관과 무관한 사용 가능/완료 및 보관함 전용 필터)
      if (statusFilter === "ready" && c.status !== "ready") return false;
      if (statusFilter === "used" && c.status !== "used") return false;
      if (statusFilter === "archived" && !c.is_archived) return false;
      if (statusFilter === "unarchived" && c.is_archived) return false;

      // 카테고리 필터
      if (categoryFilter !== "all") {
        if (categoryFilter === "uncategorized") {
          return !categories.some((cat) => cat.name === c.category);
        }
        if (c.category !== categoryFilter) return false;
      }
      return true;
    });
  }, [candidates, statusFilter, categoryFilter, categories]);

  // 삭제 가능한 일반 글감 (보관된 글감은 전체 삭제 대상에서 무조건 제외 및 보호)
  const deletable = visibleCandidates.filter((c) => !c.is_archived);
  const checkedDeletable = checkedIds.filter((id) => deletable.some((c) => c.id === id));
  const unarchivedCount = candidates.filter((c) => !c.is_archived).length;

  // 체크박스 토글
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // 특정 글감 1건의 카테고리 변경
  const handleMoveSingleCandidate = (candidateId: string, newCategory: string) => {
    if (!newCategory) return;
    const updated = candidates.map((c) =>
      c.id === candidateId ? { ...c, category: newCategory } : c
    );
    persistCandidates(updated);
    setMessage({
      type: "success",
      text: `글감 카테고리를 "${newCategory}"(으)로 변경했습니다.`,
    });
  };

  // 선택한 글감 일괄 카테고리 이동
  const handleBulkMoveCategory = () => {
    if (!checkedIds.length || !bulkMoveCategory) return;
    const updated = candidates.map((c) =>
      checkedIds.includes(c.id) ? { ...c, category: bulkMoveCategory } : c
    );
    persistCandidates(updated);
    const count = checkedIds.length;
    setCheckedIds([]);
    setMessage({
      type: "success",
      text: `선택한 ${count}건의 글감을 "${bulkMoveCategory}" 카테고리로 성공적으로 이동했습니다.`,
    });
  };

  // URL 스크랩 수집 실행
  const handleCollectUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim() || collecting) return;
    setCollecting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "url",
          url: urlInput.trim(),
          targetCategory: collectCategory || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "수집 실패", needKey: data.needKey });
        return;
      }
      const newItems: BlogViralCandidate[] = (data.candidates || []).map((c: any) => ({
        ...c,
        status: "ready" as const,
        is_archived: false,
      }));
      const updated = [...newItems, ...candidates];
      persistCandidates(updated);
      setUrlInput("");
      setMessage({
        type: "success",
        text: `웹 페이지에서 블로그 글감 ${newItems.length}건을 성공적으로 발굴·생성했습니다. (카테고리: ${collectCategory || "AI 자동 판정"})`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: "수집 요청 오류: " + err.message });
    } finally {
      setCollecting(false);
    }
  };

  // Perplexity 실시간 트렌드 수집 실행
  const handleCollectPerplexity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topicInput.trim() || collecting) return;
    setCollecting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "perplexity",
          topic: topicInput.trim(),
          targetCategory: collectCategory || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "수집 실패", needKey: data.needKey });
        return;
      }
      const newItems: BlogViralCandidate[] = (data.candidates || []).map((c: any) => ({
        ...c,
        status: "ready" as const,
        is_archived: false,
      }));
      const updated = [...newItems, ...candidates];
      persistCandidates(updated);
      setTopicInput("");
      setMessage({
        type: "success",
        text: `최근 72시간 화제 이슈에서 네이버 블로그 글감 ${newItems.length}건을 수집했습니다. (카테고리: ${collectCategory || "AI 자동 판정"})`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: "화제 검색 오류: " + err.message });
    } finally {
      setCollecting(false);
    }
  };

  // 쇼츠 검색 실행
  const handleSearchShorts = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shortsQuery.trim() || searchingShorts) return;
    setSearchingShorts(true);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shorts_search",
          query: shortsQuery.trim(),
          dateFrom: shortsDateFrom,
          dateTo: shortsDateTo,
          order: shortsOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "쇼츠 검색 실패", needKey: data.needKey });
        return;
      }
      setShortsList(data.videos || []);
    } catch (err: any) {
      setMessage({ type: "error", text: "쇼츠 검색 중 오류 발생: " + err.message });
    } finally {
      setSearchingShorts(false);
    }
  };

  // 필터링된 쇼츠 목록
  const filteredShorts = useMemo(() => {
    const minV = minViews ? Number(minViews) : null;
    const maxS = maxSubs ? Number(maxSubs) : null;
    return shortsList.filter((v) => {
      if (minV !== null && v.views < minV) return false;
      if (maxS !== null && (v.subs === null || v.subs > maxS)) return false;
      return true;
    });
  }, [shortsList, minViews, maxSubs]);

  // 쇼츠 1건 분석 후 글감으로 추출
  const handleAnalyzeShort = async (video: ShortVideo) => {
    setAnalyzingShortId(video.id);
    setMessage(null);

    try {
      const res = await fetch("/api/collector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shorts_analyze",
          video,
          targetCategory: collectCategory || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "분석 실패", needKey: data.needKey });
        return;
      }
      const newItems: BlogViralCandidate[] = (data.candidates || []).map((c: any) => ({
        ...c,
        status: "ready" as const,
        is_archived: false,
      }));
      const updated = [...newItems, ...candidates];
      persistCandidates(updated);
      setMessage({
        type: "success",
        text: `"${video.title.slice(0, 30)}..." 쇼츠에서 떡상 블로그 글감 ${newItems.length}건을 생성했습니다! (카테고리: ${collectCategory || "AI 자동 판정"})`,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: "영상 분석 오류: " + err.message });
    } finally {
      setAnalyzingShortId(null);
    }
  };

  // 1) 사용 상태 토글 (ready ↔ used: 보관 여부와 100% 무관하게 독립 동작)
  const toggleCandidateStatus = (id: string) => {
    const updated = candidates.map((c) => {
      if (c.id !== id) return c;
      const nextStatus: "ready" | "used" = c.status === "used" ? "ready" : "used";
      return { ...c, status: nextStatus };
    });
    persistCandidates(updated);
  };

  // 2) 보관 상태 토글 (is_archived: 사용 상태와 100% 무관하게 독립 동작, 전체 삭제 보호용)
  const toggleCandidateArchive = (id: string) => {
    const updated = candidates.map((c) => {
      if (c.id !== id) return c;
      const nextArchived = !c.is_archived;
      return { ...c, is_archived: nextArchived };
    });
    persistCandidates(updated);
    const target = candidates.find((c) => c.id === id);
    if (target) {
      const willBeArchived = !target.is_archived;
      setMessage({
        type: "success",
        text: willBeArchived
          ? `"${target.title.slice(0, 25)}..." 글감을 보관함에 보관했습니다. 전체 선택 삭제 시에도 안전하게 보호됩니다.`
          : `"${target.title.slice(0, 25)}..." 글감의 보관을 해제했습니다.`,
      });
    }
  };

  // 글감 인라인 편집 (제목/요약 수정)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const startEdit = (item: BlogViralCandidate) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditContent(item.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim()) {
      alert("글감 제목을 입력해 주세요.");
      return;
    }
    const updated = candidates.map((c) =>
      c.id === id ? { ...c, title: editTitle.trim(), content: editContent.trim() } : c
    );
    persistCandidates(updated);
    setEditingId(null);
    setMessage({ type: "success", text: "글감 정보가 수정되었습니다." });
  };

  // 단일 삭제
  const deleteCandidate = (item: BlogViralCandidate) => {
    const warning = item.is_archived
      ? `⚠️ 이 글감은 [보관] 상태로 보호 중입니다!\n정말 삭제하시겠습니까?\n("${item.title.slice(0, 30)}")`
      : `"${item.title.slice(0, 30)}" 글감을 삭제하시겠습니까?`;
    if (!window.confirm(warning)) return;
    const updated = candidates.filter((c) => c.id !== item.id);
    persistCandidates(updated);
    setCheckedIds((prev) => prev.filter((i) => i !== item.id));
  };

  // 일괄 삭제 (보관된 글감 보호 원칙 100% 적용)
  const bulkDelete = (mode: "selected" | "all_unarchived") => {
    if (mode === "selected") {
      if (!checkedIds.length) return;
      // 보관된 글감은 일괄 삭제 대상에서 무조건 제외
      const toDeleteIds = candidates
        .filter((c) => checkedIds.includes(c.id) && !c.is_archived)
        .map((c) => c.id);
      const archivedProtectedCount = checkedIds.length - toDeleteIds.length;

      if (!toDeleteIds.length) {
        alert("선택하신 글감은 모두 [보관] 상태로 보호 중입니다.\n보관된 콘텐츠는 전체 삭제 대상에서 안전하게 제외됩니다.\n삭제를 원하시면 먼저 개별 보관 해제를 진행해 주세요.");
        return;
      }

      const confirmMsg = archivedProtectedCount > 0
        ? `선택한 ${checkedIds.length}건 중 보관된 ${archivedProtectedCount}건은 안전하게 제외(보호)되고, 일반 글감 ${toDeleteIds.length}건만 삭제됩니다.\n계속 진행하시겠습니까?`
        : `선택한 글감 ${toDeleteIds.length}건을 삭제하시겠습니까?`;

      if (!window.confirm(confirmMsg)) return;

      const updated = candidates.filter((c) => !toDeleteIds.includes(c.id));
      persistCandidates(updated);
      setCheckedIds([]);
      setMessage({
        type: "success",
        text: archivedProtectedCount > 0
          ? `선택 글감 중 보관된 ${archivedProtectedCount}건은 안전하게 보존되었으며, 일반 글감 ${toDeleteIds.length}건이 삭제되었습니다.`
          : `선택한 글감 ${toDeleteIds.length}건을 삭제했습니다.`,
      });
    } else {
      if (!unarchivedCount) {
        alert("정리할 수 있는 일반 글감이 없습니다. (모든 글감이 [보관] 상태로 안전하게 보호 중입니다)");
        return;
      }
      const archivedTotal = candidates.length - unarchivedCount;
      if (!window.confirm(`보관된 글감(${archivedTotal}건)은 100% 안전하게 보호되며, 보관되지 않은 일반 글감 전체 ${unarchivedCount}건만 모두 삭제됩니다.\n계속 진행하시겠습니까?`)) return;
      const updated = candidates.filter((c) => Boolean(c.is_archived));
      persistCandidates(updated);
      setCheckedIds([]);
      setMessage({
        type: "success",
        text: `보관된 글감 ${archivedTotal}건을 안전하게 보존하고, 일반 글감 ${unarchivedCount}건을 일괄 정리했습니다.`,
      });
    }
  };

  // 이 글감으로 자동 생성기 이동
  const handleUseCandidate = (item: BlogViralCandidate) => {
    router.push(`/?viralId=${item.id}&topic=${encodeURIComponent(item.title)}&category=${encodeURIComponent(item.category)}`);
  };

  if (!mounted) {
    return <div className="p-8 text-neutral-500 text-sm">글감 수집소를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. 상단 브리핑 헤더 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-sm shadow-sm">
                🔥
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-600">
                Viral Content Collector
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black text-neutral-900 tracking-tight">
              떡상 글감 수집소
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 max-w-3xl">
              실제 검색량과 대중 반응이 터진 소재를 발굴하여, 네이버 C-Rank / D-I-A+ 검색 상위 노출에 최적화된
              블로그 글감으로 자동 변환합니다. 웹 뉴스 스크랩, Perplexity 72시간 핫이슈, 유튜브 쇼츠 대박 분석을
              통해 매력적인 소재를 선점하세요.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition-all"
          >
            <PenLine size={16} />
            글 자동 생성기로 이동
          </Link>
        </div>
      </section>

      {/* 2. 통계 지표 카드 (사용 상태 및 보관함 독립 집계) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-neutral-500">전체 수집 글감</span>
          <p className="mt-1.5 text-2xl font-black text-neutral-900">{candidates.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700">사용 가능</span>
          <p className="mt-1.5 text-2xl font-black text-emerald-700">{readyCount}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
          <span className="text-xs font-semibold text-sky-700">사용 완료 (발행)</span>
          <p className="mt-1.5 text-2xl font-black text-sky-700">{usedCount}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
          <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
            <Archive size={12} /> 보관함 (삭제 보호)
          </span>
          <p className="mt-1.5 text-2xl font-black text-indigo-700">{archivedCount}</p>
        </div>
      </section>

      {/* 2-2. 30일 보관 정책 안내 공지 배너 */}
      <ContentRetentionNotice />

      {/* 메시지 알림 바 */}
      {message && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-medium">{message.text}</p>
            {message.needKey && (
              <p className="mt-1.5 text-xs text-rose-700">
                키 등록이 필요하신가요?{" "}
                <Link href="/settings" className="font-bold underline hover:text-rose-950">
                  [API키등록·플랫폼연동] 메뉴로 이동하기 →
                </Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. [🗂 카테고리 관리] 섹션 (ai-auto-blog 스타일 이식) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Folder size={17} className="text-indigo-600" />
              <h2 className="text-sm font-bold text-neutral-900">🗂 글감 수집 카테고리 관리</h2>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-600">
                {categories.length}개 카테고리
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              카테고리를 추가하고 ▲▼ 버튼으로 순서를 정렬할 수 있으며, 글감 수집 시 자동으로 분류하거나 보관함에서 원하는 카테고리로 이동할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all shadow-sm"
          >
            <Settings2 size={14} />
            ⚙️ 카테고리 추가·수정·삭제 (순서 정렬)
          </button>
        </div>

        {/* 등록된 카테고리 칩 목록 */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-100">
          {categories.map((cat, idx) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600">
                {idx + 1}
              </span>
              {cat.name}
              <span className="text-[10px] text-neutral-400 font-mono">
                ({categoryCounts.counts[cat.name] || 0}건)
              </span>
            </span>
          ))}
          {categoryCounts.uncategorized > 0 && (
            <span className="inline-flex items-center gap-1 rounded-xl border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
              미분류 ({categoryCounts.uncategorized}건)
            </span>
          )}
        </div>
      </section>

      {/* 4. 수집 컨트롤러 박스 (3대 수집 방식 탭 + 수집할 카테고리 선택) */}
      <section className="rounded-2xl border-2 border-neutral-200 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-emerald-600" />
            <h2 className="text-base font-bold text-neutral-900">글감 수집 방식 선택</h2>
          </div>

          {/* 수집할 카테고리 선택 드롭다운 (핵심 기능) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-neutral-700 shrink-0">
              📁 수집할 카테고리:
            </label>
            <select
              value={collectCategory}
              onChange={(e) => setCollectCategory(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 focus:border-neutral-900 focus:outline-none"
            >
              <option value="">✨ AI 자동 판정 (기본)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 탭 버튼들 */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "url"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Globe size={15} />
            ① 웹 페이지 / 뉴스 URL 지정
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("perplexity")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "perplexity"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Sparkles size={15} />
            ② 화제 검색 (Perplexity 72h)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shorts")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "shorts"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Video size={15} />
            ③ 유튜브 쇼츠 떡상 분석
          </button>
        </div>

        {/* 탭 1: URL 수집 */}
        {activeTab === "url" && (
          <form onSubmit={handleCollectUrl} className="mt-4 space-y-3">
            <p className="text-xs text-neutral-600 leading-relaxed">
              기사 1건의 주소를 넣으면 해당 기사를, 목록 페이지(예: 네이버 뉴스 섹션, IT 포털)를 넣으면 상위 기사 중
              무작위로 선별하여 네이버 블로그에 최적화된 글감 후보로 재가공합니다.
              {collectCategory && (
                <span className="font-bold text-indigo-600 ml-1">
                  (선택된 &quot;{collectCategory}&quot; 카테고리로 등록됩니다)
                </span>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://news.naver.com/section/105 또는 기사 전체 URL"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={collecting || !urlInput.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Flame size={16} />
                {collecting ? "분석 및 글감 생성 중..." : "글감 수집"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              ※ SSRF 안전 필터링이 적용되어 공개 웹 페이지만 수집 가능하며, 본인 등록 OpenAI / Gemini / Claude 키가 활용됩니다.
            </p>
          </form>
        )}

        {/* 탭 2: Perplexity 화제 검색 */}
        {activeTab === "perplexity" && (
          <form onSubmit={handleCollectPerplexity} className="mt-4 space-y-3">
            <p className="text-xs text-neutral-600 leading-relaxed">
              시드 키워드나 관심 주제를 입력하면, Perplexity AI가 최근 72시간 이내 한국어권에서 대중의 클릭이 폭발한
              핫이슈와 핵심 팩트를 실시간 웹 검색으로 요약한 뒤, 블로그 글감 후보 4건으로 즉시 기획합니다.
              {collectCategory && (
                <span className="font-bold text-indigo-600 ml-1">
                  (선택된 &quot;{collectCategory}&quot; 카테고리로 등록됩니다)
                </span>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="예: 2026 청년 복지 지원금 정책, 봄 환절기 보습 꿀템, AI 직무 자동화 트렌드"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={collecting || !topicInput.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Sparkles size={16} />
                {collecting ? "실시간 검색 및 기획 중..." : "72h 화제 검색"}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500">
              ※ [API키등록·플랫폼연동] 메뉴에 Perplexity API 키(pplx-...)가 연동되어 있어야 합니다.
            </p>
          </form>
        )}

        {/* 탭 3: 유튜브 쇼츠 떡상 분석 */}
        {activeTab === "shorts" && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-600">
              <p>
                검색어를 입력하여 최근 조회수가 폭발한 쇼츠를 발굴하고, 대박 훅(Hook)과 시청자 공감 포인트를 분석해
                네이버 블로그 포스팅으로 재가공합니다.
              </p>
              {collectCategory && (
                <span className="font-bold text-indigo-600 shrink-0">
                  📁 수집 시 &quot;{collectCategory}&quot; 카테고리로 등록
                </span>
              )}
            </div>

            {/* 검색 폼 */}
            <form onSubmit={handleSearchShorts} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={shortsQuery}
                onChange={(e) => setShortsQuery(e.target.value)}
                placeholder="검색어 (예: 살림 꿀팁, 청소 노하우, 재테크)"
                className="sm:col-span-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
              />
              <select
                value={shortsOrder}
                onChange={(e) => setShortsOrder(e.target.value as ShortsOrder)}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-800"
              >
                <option value="viewCount">조회수 높은 순</option>
                <option value="relevance">정확도 관련도 순</option>
                <option value="date">최신 등록 순</option>
              </select>
              <button
                type="submit"
                disabled={searchingShorts || !shortsQuery.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Search size={15} />
                {searchingShorts ? "검색 중..." : "쇼츠 검색"}
              </button>
            </form>

            {/* 검색 결과 표시 */}
            {shortsList.length > 0 && (
              <div className="mt-4 border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-neutral-800">
                    쇼츠 검색 결과 <span className="text-emerald-600 font-semibold">({filteredShorts.length}건)</span>
                  </h3>
                  <span className="text-xs text-neutral-400">떡상 점수 및 배지 기준 정렬</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredShorts.map((video) => {
                    const isAnalyzing = analyzingShortId === video.id;
                    return (
                      <div
                        key={video.id}
                        className="flex gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 hover:bg-white hover:shadow-sm transition-all"
                      >
                        {/* 썸네일 */}
                        <div className="relative w-24 h-32 shrink-0 rounded-lg overflow-hidden bg-neutral-200">
                          {video.thumbnail && (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span
                            className={`absolute top-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              GRADE_TONE[video.grade] || "bg-neutral-800 text-white"
                            }`}
                          >
                            {video.grade}
                          </span>
                        </div>

                        {/* 영상 정보 */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">
                              {video.title}
                            </p>
                            <p className="mt-1 text-[11px] text-neutral-500 truncate">
                              {video.channelName} • {video.publishedAt.slice(0, 10)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                              <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-medium text-neutral-700">
                                👁️ {formatNumber(video.views)}
                              </span>
                              <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 font-medium text-neutral-700">
                                👥 {formatNumber(video.subs)}
                              </span>
                              {video.vsRatio && (
                                <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold">
                                  {video.vsRatio.toFixed(1)}배 터짐
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center gap-2">
                            <a
                              href={`https://www.youtube.com/shorts/${video.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-0.5"
                            >
                              <Play size={10} />
                              보기
                            </a>
                            <button
                              type="button"
                              onClick={() => handleAnalyzeShort(video)}
                              disabled={isAnalyzing}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <Sparkles size={12} />
                              {isAnalyzing ? "분석 중..." : "글감 추출"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. 수집한 글감 목록 섹션 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6 shadow-sm">
        {/* 상단 타이틀 및 상태 필터 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">
              수집된 글감 보관함
            </h2>
            <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-700">
              {visibleCandidates.length}건
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 focus:border-neutral-900 focus:outline-none"
            >
              <option value="all">전체 상태 보기</option>
              <option value="ready">사용 가능만</option>
              <option value="used">사용 완료만</option>
              <option value="archived">🗄 보관함만 보기 ({archivedCount}건)</option>
              <option value="unarchived">일반 글감만 (보관 제외)</option>
            </select>
          </div>
        </div>

        {/* 카테고리 필터 탭 바 (ai-auto-blog 스타일) */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pb-3 border-b border-neutral-100">
          <span className="text-xs font-bold text-neutral-500 mr-1 flex items-center gap-1">
            <Folder size={13} /> 분류 필터:
          </span>
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              categoryFilter === "all"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            전체 ({candidates.length})
          </button>
          {categories.map((cat) => {
            const count = categoryCounts.counts[cat.name] || 0;
            const isActive = categoryFilter === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.name)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
          {categoryCounts.uncategorized > 0 && (
            <button
              type="button"
              onClick={() => setCategoryFilter("uncategorized")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                categoryFilter === "uncategorized"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              미분류 ({categoryCounts.uncategorized})
            </button>
          )}
        </div>

        {/* 일괄 제어 바 (선택 삭제 + 선택 글감 카테고리 이동) */}
        {candidates.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700 border border-neutral-200">
            {/* 좌측: 체크박스 및 삭제 */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-neutral-900 rounded"
                  checked={deletable.length > 0 && checkedDeletable.length === deletable.length}
                  disabled={busy || !deletable.length}
                  onChange={(e) =>
                    setCheckedIds(e.target.checked ? deletable.map((c) => c.id) : [])
                  }
                />
                일반 목록 전체 선택
              </label>
              <span className="text-neutral-300">|</span>
              <span className="text-neutral-600 font-medium">선택 {checkedIds.length}건</span>
              <button
                type="button"
                disabled={!checkedIds.length || busy}
                onClick={() => bulkDelete("selected")}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="보관된 글감은 자동 제외되고 보호됩니다"
              >
                <Trash2 size={12} />
                선택 삭제 (보관 보호)
              </button>
              <button
                type="button"
                disabled={!unarchivedCount || busy}
                onClick={() => bulkDelete("all_unarchived")}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={12} />
                보관 제외 전체 정리 ({unarchivedCount}건)
              </button>
            </div>

            {/* 우측: 선택한 글감 카테고리 일괄 이동 (핵심 기능) */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowRightLeft size={13} className="text-indigo-600" />
              <span className="font-bold text-neutral-700">카테고리 이동:</span>
              <select
                value={bulkMoveCategory}
                onChange={(e) => setBulkMoveCategory(e.target.value)}
                disabled={!checkedIds.length}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 disabled:opacity-50"
              >
                <option value="">이동할 카테고리 선택</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkMoveCategory}
                disabled={!checkedIds.length || !bulkMoveCategory}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                선택 이동
              </button>
            </div>
          </div>
        )}

        {/* 글감 리스트 */}
        {visibleCandidates.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
            조건에 맞는 글감이 없습니다. 상단에서 URL이나 검색어로 새 글감을 수집하거나 필터를 조정해 보세요.
          </div>
        ) : (
          <div className="mt-4 space-y-3.5">
            {visibleCandidates.map((item) => {
              const statusCfg = STATUS_MAP[item.status] || STATUS_MAP.ready;
              const isLocked = item.status === "archived";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    item.status === "ready"
                      ? "border-neutral-200 bg-white shadow-sm hover:border-neutral-400"
                      : "border-neutral-200 bg-neutral-50/70"
                  }`}
                >
                  {/* 상단 뱃지 및 메타 정보 */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-neutral-900 rounded"
                          checked={checkedIds.includes(item.id)}
                          disabled={busy}
                          onChange={() => toggleCheck(item.id)}
                        />
                      </label>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-700">
                        {item.method === "perplexity"
                          ? "⚡ Perplexity 핫이슈"
                          : item.method === "shorts"
                          ? "🎬 유튜브 쇼츠"
                          : "🌐 웹 기사"}
                      </span>

                      {/* 카테고리 뱃지 & 원클릭 카테고리 변경 셀렉트 */}
                      <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                        <span>📁 {item.category}</span>
                        <select
                          value=""
                          onChange={(e) => handleMoveSingleCandidate(item.id, e.target.value)}
                          className="bg-transparent text-[10px] text-emerald-700 font-bold border-l border-emerald-300 pl-1.5 ml-0.5 focus:outline-none cursor-pointer"
                          title="다른 카테고리로 변경"
                        >
                          <option value="" disabled>
                            변경 ▼
                          </option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 사용 상태 뱃지 (ready: 사용 가능, used: 사용 완료) */}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                          item.status === "used"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {item.status === "used" ? "사용 완료" : "사용 가능"}
                      </span>

                      {/* 보관 상태 뱃지 (보관 중일 때 독립적으로 표시) */}
                      {item.is_archived ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800"
                          title="이 글감은 [보관] 상태로 자동 삭제 대상에서 영구 제외 및 보호됩니다."
                        >
                          <Archive size={10} />
                          <span>보관 (영구 보호)</span>
                        </span>
                      ) : (
                        (() => {
                          const left = retentionDaysLeft(item.created_at);
                          const isWarning = left <= 7;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isWarning
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                              title={`생성일시: ${new Date(item.created_at).toLocaleString("ko-KR")}\n자동삭제 예정: ${retentionDeleteAt(item.created_at).toLocaleDateString("ko-KR")}`}
                            >
                              <span>{left === 0 ? "오늘 자동삭제 예정" : `${left}일 후 자동삭제`}</span>
                            </span>
                          );
                        })()
                      )}

                      <span className="text-[11px] text-neutral-400">
                        {new Date(item.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => (editingId === item.id ? cancelEdit() : startEdit(item))}
                        className={`transition-colors p-1 rounded ${
                          editingId === item.id
                            ? "text-indigo-600 bg-indigo-50"
                            : "text-neutral-400 hover:text-indigo-600 hover:bg-neutral-100"
                        }`}
                        title={editingId === item.id ? "편집 취소" : "글감 제목·내용 수정"}
                      >
                        <PenLine size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCandidate(item)}
                        className="text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 transition-colors p-1 rounded"
                        title="글감 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* 제목 & 본문 (수정 모드 vs 일반 모드) */}
                  {editingId === item.id ? (
                    <div className="mt-3 space-y-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600">글감 제목</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-bold text-neutral-900 focus:border-indigo-600 focus:outline-none"
                          placeholder="블로그 제목을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-600">본문 요약 및 배경 팩트</label>
                        <textarea
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-indigo-600 focus:outline-none"
                          placeholder="본문 요약 및 전개 가이드를 입력하세요"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm"
                        >
                          저장하기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 제목 */}
                      <h3 className="mt-2.5 text-base font-bold text-neutral-900 leading-snug">
                        {item.title}
                      </h3>

                      {/* 공략 앵글 */}
                      {item.angle && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50/70 px-2.5 py-1 rounded-lg border border-amber-200/50">
                          <TrendingUp size={13} className="text-amber-700 shrink-0" />
                          <span className="font-semibold">공략 앵글:</span>
                          <span className="text-amber-800">{item.angle}</span>
                        </div>
                      )}

                      {/* 요약 본문 */}
                      <p className="mt-2 text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </>
                  )}

                  {/* 키워드 태그 */}
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.keywords.map((kw, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 출처 */}
                  <div className="mt-2.5 flex items-center gap-1 text-xs text-neutral-400 truncate">
                    <span>출처:</span>
                    {item.source_input.startsWith("http") ? (
                      <a
                        href={item.source_input}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline inline-flex items-center gap-0.5 truncate"
                      >
                        <span className="truncate">{item.source_input}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="truncate">{item.source_input}</span>
                    )}
                  </div>

                  {/* 하단 액션 버튼 그룹 */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* 1) 사용완료 상태 토글 (ready ↔ used, 파란색 바탕 계열) */}
                      {item.status === "used" ? (
                        <button
                          type="button"
                          onClick={() => toggleCandidateStatus(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
                          title="이 글감을 다시 사용 가능 상태로 복원합니다"
                        >
                          <RotateCcw size={13} className="text-blue-600" />
                          사용 가능으로 복원
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleCandidateStatus(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                          title="이 글감을 사용 완료(발행 완료) 상태로 표시합니다"
                        >
                          <CheckCircle2 size={13} className="text-white" />
                          사용 완료 표시
                        </button>
                      )}

                      {/* 2) 보관 상태 토글 (is_archived: 초록색 계열, 전체 삭제 보호용) */}
                      {item.is_archived ? (
                        <button
                          type="button"
                          onClick={() => toggleCandidateArchive(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-sm"
                          title="보관을 해제하여 일반 상태로 되돌립니다"
                        >
                          <RotateCcw size={13} className="text-emerald-700" />
                          보관 해제
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleCandidateArchive(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                          title="이 글감을 보관함에 보관합니다 (전체선택 삭제 대상에서 100% 제외 및 보호)"
                        >
                          <Archive size={13} className="text-white" />
                          보관
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUseCandidate(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition-all"
                    >
                      <PenLine size={14} />
                      ✍️ 이 글감으로 블로그 글 생성
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 카테고리 관리 모달 */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onUpdateCategories={persistCategories}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
}
