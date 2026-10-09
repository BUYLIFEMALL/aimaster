"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Trash2,
  Send,
  Eye,
  Copy,
  SquarePen,
  FileText,
  Plus,
  ImageIcon,
  X,
  Layers,
  Sparkles,
  BookOpen,
  Folder,
  FolderInput,
  Settings2,
  ArrowRightLeft,
  Flame,
  Check,
  Filter,
} from "lucide-react";
import BlogSmartEditorModal from "@/components/BlogSmartEditorModal";
import type { CollectorCategory } from "@/types/collector";
import { useContentCategories } from "@/hooks/useContentCategories";
import { CategoryManagementModal } from "@/components/collector/CategoryManagementModal";
import ContentRetentionNotice from "@/components/ContentRetentionNotice";
import { retentionDaysLeft, retentionDeleteAt } from "@/lib/retention";

interface SavedPostItem {
  id: string;
  blog_id: string;
  category_name: string;
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  images?: { url: string; type: "thumbnail" | "body"; caption: string; prompt: string }[];
  status: "draft" | "queued" | "publishing" | "published" | "failed";
  created_at: string;
  published_at?: string;
  post_url?: string;
  error_message?: string;
}

export default function QueuePage() {
  const [posts, setPosts] = useState<SavedPostItem[]>([]);
  const [selectedPost, setSelectedPost] = useState<SavedPostItem | null>(null);
  const [viewingDetailPost, setViewingDetailPost] = useState<SavedPostItem | null>(null);
  const [editingPost, setEditingPost] = useState<SavedPostItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. 카테고리 연계 상태 (떡상 글감 수집와 동일한 로컬스토리지 공유)
  const { categories, saveCategories } = useContentCategories();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [bulkMoveCategory, setBulkMoveCategory] = useState<string>("");

  // 2. 다중 선택 체크박스 상태
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // 발행 공개 범위: 기본은 비공개. 화면을 새로 열 때마다 비공개로 돌아가 실수로 공개되지 않게 한다.
  const [publishVisibility, setPublishVisibility] = useState<"private" | "public">("private");
  const visibilityLabel = publishVisibility === "public" ? "전체공개" : "비공개";

  // 4. 원고 목록 로드
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        if (data?.posts && Array.isArray(data.posts) && data.posts.length > 0) {
          setPosts(data.posts);
          localStorage.setItem("nba_saved_posts", JSON.stringify(data.posts));
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("서버 원고 로드 실패, 로컬 캐시 확인:", err);
    }

    // 서버에 글이 없거나 실패 시 로컬스토리지 캐시 확인
    const saved = localStorage.getItem("nba_saved_posts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosts(parsed);
          setIsLoading(false);
          return;
        }
      } catch {}
    }

    setPosts([]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const savePosts = (items: SavedPostItem[]) => {
    setPosts(items);
    localStorage.setItem("nba_saved_posts", JSON.stringify(items));
  };

  // 5. 카테고리 업데이트 핸들러 (모달 연계)
  const handleUpdateCategories = (updatedCats: CollectorCategory[]) => {
    return saveCategories(updatedCats);
  };

  // 6. 카테고리 삭제 시 연계 원고 안전 전환
  const handleCategoryDeleted = async (deletedCategoryName: string) => {
    const affectedPosts = posts.filter((p) => p.category_name === deletedCategoryName);
    if (affectedPosts.length === 0) return;

    const updated = posts.map((p) => {
      if (p.category_name === deletedCategoryName) {
        return { ...p, category_name: "일반" };
      }
      return p;
    });
    savePosts(updated);

    // 서버 DB에도 비동기 반영
    try {
      await Promise.allSettled(
        affectedPosts.map((p) =>
          fetch("/api/posts", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: p.id, category_name: "일반" }),
          })
        )
      );
    } catch (err) {
      console.warn("카테고리 삭제 후 원고 일괄 갱신 오류:", err);
    }
  };

  // 7. 단일 원고 카테고리 즉시 변경
  const handleUpdatePostCategory = async (postId: string, newCategory: string) => {
    const updated = posts.map((p) => {
      if (p.id === postId) {
        return { ...p, category_name: newCategory };
      }
      return p;
    });
    savePosts(updated);

    if (viewingDetailPost?.id === postId) {
      setViewingDetailPost((prev) => (prev ? { ...prev, category_name: newCategory } : null));
    }

    try {
      await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: postId, category_name: newCategory }),
      });
    } catch (err) {
      console.warn("서버 원고 카테고리 갱신 실패:", err);
    }
  };

  // 8. 다중 선택 체크박스 조작
  const handleToggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (filteredList: SavedPostItem[]) => {
    const allFilteredIds = filteredList.map((p) => p.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => checkedIds.includes(id));
    if (isAllSelected) {
      setCheckedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...checkedIds, ...allFilteredIds]));
      setCheckedIds(merged);
    }
  };

  // 9. 선택 원고 카테고리 일괄 이동 (Bulk Move)
  const handleBulkMoveCategory = async () => {
    if (!bulkMoveCategory) {
      alert("이동할 대상 카테고리를 선택해주세요.");
      return;
    }
    if (checkedIds.length === 0) {
      alert("카테고리를 이동할 원고를 1건 이상 선택해주세요.");
      return;
    }

    setIsBulkUpdating(true);
    const targetCat = bulkMoveCategory;
    const targetIds = [...checkedIds];

    const updated = posts.map((p) => {
      if (targetIds.includes(p.id)) {
        return { ...p, category_name: targetCat };
      }
      return p;
    });
    savePosts(updated);

    try {
      await Promise.allSettled(
        targetIds.map((id) =>
          fetch("/api/posts", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, category_name: targetCat }),
          })
        )
      );
    } catch (err) {
      console.warn("서버 카테고리 일괄 이동 실패:", err);
    }

    setIsBulkUpdating(false);
    setCheckedIds([]);
    setBulkMoveCategory("");
    alert(`선택하신 원고 ${targetIds.length}건이 "${targetCat}" 카테고리로 안전하게 이동되었습니다!`);
  };

  // 10. 선택 원고 일괄 발행 큐 전송
  const handleBulkPublishNow = async () => {
    if (checkedIds.length === 0) return;
    if (!confirm(`선택한 원고 ${checkedIds.length}건을 ${visibilityLabel}로 스마트에디터 ONE 자동 발행 큐에 일괄 등록하시겠습니까?`)) {
      return;
    }

    setIsBulkUpdating(true);
    const targetIds = [...checkedIds];
    const updated = posts.map((p) => {
      if (targetIds.includes(p.id)) {
        return { ...p, status: "queued" as const };
      }
      return p;
    });
    savePosts(updated);

    try {
      await Promise.allSettled(
        targetIds.map((id) =>
          fetch("/api/posts", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: "queued", publish_visibility: publishVisibility }),
          })
        )
      );
    } catch (err) {
      console.warn("서버 상태 일괄 갱신 실패:", err);
    }

    setIsBulkUpdating(false);
    setCheckedIds([]);
    alert(`선택한 원고 ${targetIds.length}건이 크롬 확장 자동 발행 큐에 등록되었습니다!`);
  };

  // 11. 선택 원고 일괄 삭제
  const handleBulkDelete = async () => {
    if (checkedIds.length === 0) return;
    if (!confirm(`선택한 원고 ${checkedIds.length}건을 보관함에서 정말 삭제하시겠습니까?`)) {
      return;
    }

    setIsBulkUpdating(true);
    const targetIds = [...checkedIds];
    const updated = posts.filter((p) => !targetIds.includes(p.id));
    savePosts(updated);

    if (viewingDetailPost && targetIds.includes(viewingDetailPost.id)) {
      setViewingDetailPost(null);
    }

    try {
      await Promise.allSettled(
        targetIds.map((id) =>
          fetch(`/api/posts?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          })
        )
      );
    } catch (err) {
      console.warn("서버 원고 일괄 삭제 실패:", err);
    }

    setIsBulkUpdating(false);
    setCheckedIds([]);
    alert(`선택한 원고 ${targetIds.length}건이 삭제되었습니다.`);
  };

  // 즉시 발행 요청 (단일)
  const handlePublishNow = async (id: string) => {
    if (publishVisibility === "public" && !confirm("이 원고를 전체공개로 네이버 블로그에 발행합니다. 계속하시겠습니까?")) return;
    const updated = posts.map((p) => {
      if (p.id === id) {
        return { ...p, status: "queued" as const };
      }
      return p;
    });
    savePosts(updated);

    try {
      await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "queued", publish_visibility: publishVisibility }),
      });
    } catch (err) {
      console.warn("서버 상태 갱신 실패:", err);
    }

    alert(
      `크롬 확장의 자동 발행 큐에 ${visibilityLabel}로 등록되었습니다!\n크롬 브라우저가 열려 있으면 스마트에디터 ONE에 직접 타이핑 및 이미지 첨부를 시작합니다.`
    );
  };

  // 단일 원고 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("이 원고를 보관함에서 삭제하시겠습니까?")) return;
    const updated = posts.filter((p) => p.id !== id);
    savePosts(updated);
    setCheckedIds((prev) => prev.filter((i) => i !== id));
    if (viewingDetailPost?.id === id) setViewingDetailPost(null);

    try {
      await fetch(`/api/posts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("서버 원고 삭제 실패:", err);
    }
  };

  // 원고 복사
  const handleCopyPost = (post: SavedPostItem) => {
    let formatted = post.content || "";
    const images = post.images || [];

    let bodySlotIndex = 1;
    formatted = formatted.replace(/\[IMAGE INSERT\s*-\s*([^\]]+)\]/g, (match, desc) => {
      const img = images[bodySlotIndex] || images.find((item) => item.type === "body");
      bodySlotIndex++;
      if (img?.url) {
        return `\n\n![${img.caption || desc}](${img.url})\n\n`;
      }
      return match;
    });

    const thumbImg = images[0]?.url ? `![${post.title} 대표 썸네일](${images[0].url})\n\n` : "";
    const tagsStr = post.tags && post.tags.length > 0 ? `\n\n태그: ${post.tags.map((t) => "#" + t).join(" ")}` : "";
    const full = `# ${post.title}\n\n${thumbImg}${formatted}${tagsStr}`;

    navigator.clipboard.writeText(full);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
    alert("원고 내용과 이미지 링크가 클립보드에 복사되었습니다!");
  };

  // 에디터 수정 완료 저장
  const handleSaveEditor = async (updated: {
    title: string;
    content: string;
    excerpt: string;
    tags: string[];
    category?: string;
    isHtml: boolean;
  }) => {
    if (!editingPost) return;
    const targetId = editingPost.id;
    const nextCategory = updated.category || editingPost.category_name || "일반";

    const updatedList = posts.map((p) => {
      if (p.id === targetId) {
        return {
          ...p,
          title: updated.title,
          content: updated.content,
          excerpt: updated.excerpt,
          tags: updated.tags,
          category_name: nextCategory,
        };
      }
      return p;
    });
    savePosts(updatedList);
    setEditingPost(null);

    try {
      await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetId,
          title: updated.title,
          content: updated.content,
          excerpt: updated.excerpt,
          tags: updated.tags,
          category_name: nextCategory,
        }),
      });
    } catch (err) {
      console.warn("서버 원고 수정 실패:", err);
    }

    alert("원고가 스마트 에디터에서 성공적으로 수정 및 저장되었습니다!");
  };

  // 본문 스마트 렌더링 파서
  const renderSmartArticle = (content: string, images: any[] = []) => {
    if (!content) return null;

    const isHtmlContent = /<(p|h1|h2|h3|img|div|ul|ol|table|blockquote)[^>]*>/i.test(content);
    if (isHtmlContent) {
      return (
        <div
          className="prose max-w-none text-sm text-neutral-800 leading-relaxed font-sans space-y-3"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let currentParagraphLines: string[] = [];
    let bodySlotIndex = 0;

    const flushParagraph = (key: string) => {
      if (currentParagraphLines.length > 0) {
        const text = currentParagraphLines.join("\n").trim();
        if (text) {
          elements.push(
            <p key={key} className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line my-3">
              {text}
            </p>
          );
        }
        currentParagraphLines = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("[SECTION") && trimmed.endsWith("]")) {
        flushParagraph(`sec-p-${idx}`);
        const secTitle = trimmed.replace(/^\[SECTION\s*-\s*/, "").replace(/\]$/, "");
        elements.push(
          <div key={`sec-${idx}`} className="pt-3 pb-1 border-b border-neutral-200 my-3">
            <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <span className="text-emerald-600">📌</span>
              <span>{secTitle}</span>
            </h3>
          </div>
        );
        return;
      }

      if (trimmed.startsWith("[IMAGE INSERT") && trimmed.endsWith("]")) {
        flushParagraph(`img-p-${idx}`);
        const imgDesc = trimmed.replace(/^\[IMAGE INSERT\s*-\s*/, "").replace(/\]$/, "");
        bodySlotIndex++;
        const targetSlot = bodySlotIndex;
        const matchedImage = images[targetSlot] || (bodySlotIndex === 1 ? images.find((i) => i.type === "body") : undefined);

        if (matchedImage && matchedImage.url) {
          elements.push(
            <figure key={`img-${idx}`} className="my-4 rounded-xl overflow-hidden border border-neutral-200 bg-white shadow-2xs">
              <img
                src={matchedImage.url}
                alt={matchedImage.caption || imgDesc}
                className="w-full max-h-[380px] object-cover"
              />
              <figcaption className="text-center text-xs text-neutral-500 py-2 bg-neutral-50 border-t border-neutral-100">
                📷 {matchedImage.caption || imgDesc}
              </figcaption>
            </figure>
          );
        } else {
          elements.push(
            <div key={`img-${idx}`} className="my-3 p-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 text-xs text-blue-800 font-medium">
              🖼️ 본문 이미지 배치 위치: {imgDesc}
            </div>
          );
        }
        return;
      }

      currentParagraphLines.push(line);
    });

    flushParagraph("final-p");
    return elements;
  };

  // 등록된 카테고리 이름 목록 + 미분류/기타 처리
  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  // 카테고리별 원고 개수 집계
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach((p) => {
      const cat = p.category_name || "일반";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [posts]);

  // 필터링된 게시글 (상태 필터 + 카테고리 필터 동시 적용)
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // 1) 상태 필터
      if (filterStatus !== "all" && p.status !== filterStatus) {
        return false;
      }
      // 2) 카테고리 필터
      if (filterCategory === "all") {
        return true;
      }
      if (filterCategory === "__uncategorized__") {
        return !p.category_name || !categoryNames.includes(p.category_name);
      }
      return p.category_name === filterCategory;
    });
  }, [posts, filterStatus, filterCategory, categoryNames]);

  // 모든 카테고리 옵션 목록 (선택 셀렉트용: 기본 + 현재 원고들에 존재하는 커스텀 카테고리 포함)
  const allSelectableCategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    posts.forEach((p) => {
      if (p.category_name) set.add(p.category_name);
    });
    if (!set.has("일반")) set.add("일반");
    return Array.from(set);
  }, [categories, posts]);

  const isAllFilteredSelected =
    filteredPosts.length > 0 && filteredPosts.every((p) => checkedIds.includes(p.id));

  return (
    <div className="space-y-6">
      {/* 1. 상단 타이틀 & 퀵 액션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              콘텐츠 보관소
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-500">자동 저장 및 원클릭 발행 관리</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">
            생성 원고 보관함 & 발행 큐
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            5단계 AI로 생성된 모든 원고와 이미지가 자동 보관되며, 떡상 글감 수집와 연계된 카테고리별 분류, 에디터 편집, 스마트에디터 ONE 자동 발행이 가능합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/collector"
            className="px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            title="떡상 글감 수집으로 이동"
          >
            <Flame size={14} className="text-rose-600" />
            <span>떡상 글감 수집</span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>새 블로그 글 자동 생성</span>
          </Link>
        </div>
      </div>

      {/* 발행 공개 범위 (모든 발행 전송에 적용, 기본 비공개) */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
        <span className="text-xs font-bold text-neutral-900">발행 공개 범위</span>
        <div className="inline-flex rounded-xl border border-neutral-300 p-0.5 bg-neutral-50">
          {([
            ["private", "비공개"],
            ["public", "전체공개"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPublishVisibility(value)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                publishVisibility === value ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900"
              }`}
              aria-pressed={publishVisibility === value}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-neutral-500">
          {publishVisibility === "private"
            ? "비공개로 발행합니다. 네이버에서 나만 볼 수 있습니다."
            : "전체공개로 발행합니다. 누구나 볼 수 있으니 주의하세요."}
        </span>
      </div>

      {/* 2. 상태 요약 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          {
            key: "all",
            label: "전체 보관 원고",
            count: posts.length,
            color: "text-neutral-900 bg-white border-neutral-200 hover:border-neutral-400",
            icon: "📑",
          },
          {
            key: "draft",
            label: "임시보관 원고",
            count: posts.filter((p) => p.status === "draft").length,
            color: "text-neutral-700 bg-neutral-50 border-neutral-200 hover:border-neutral-400",
            icon: "📝",
          },
          {
            key: "queued",
            label: "발행 대기 중",
            count: posts.filter((p) => p.status === "queued" || p.status === "publishing").length,
            color: "text-amber-700 bg-amber-50/70 border-amber-200 hover:border-amber-300",
            icon: "⏳",
          },
          {
            key: "published",
            label: "네이버 발행 완료",
            count: posts.filter((p) => p.status === "published").length,
            color: "text-emerald-700 bg-emerald-50/70 border-emerald-200 hover:border-emerald-300",
            icon: "✅",
          },
        ].map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => setFilterStatus(stat.key)}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
              filterStatus === stat.key
                ? "ring-2 ring-emerald-600 font-bold " + stat.color
                : stat.color
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{stat.label}</span>
              <span className="text-base">{stat.icon}</span>
            </div>
            <div className="text-2xl font-black mt-2 tracking-tight">{stat.count}건</div>
          </button>
        ))}
      </div>

      {/* 2-2. 30일 보관 정책 공지 배너 */}
      <ContentRetentionNotice />

      {/* 3. 떡상 글감 수집 연계 카테고리 분류 탭 & 관리 바 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
              <Folder size={14} />
            </span>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">
                카테고리별 원고 분류
              </h3>
              <span className="text-[11px] text-neutral-400 hidden sm:inline">
                (떡상 글감 수집와 100% 동일한 카테고리 공유)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Settings2 size={13} className="text-neutral-500" />
              <span>카테고리 관리</span>
            </button>
          </div>
        </div>

        {/* 카테고리 칩 필터 바 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterCategory === "all"
                ? "bg-neutral-900 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <span>전체 카테고리</span>
            <span className="ml-1.5 opacity-80">({posts.length})</span>
          </button>

          {categories.map((cat) => {
            const count = categoryCounts[cat.name] || 0;
            const isSelected = filterCategory === cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-emerald-200/60 text-emerald-900"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* 등록된 카테고리 외 기타/미분류가 있는 경우 */}
          {posts.some((p) => !categoryNames.includes(p.category_name || "일반")) && (
            <button
              type="button"
              onClick={() => setFilterCategory("__uncategorized__")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                filterCategory === "__uncategorized__"
                  ? "bg-neutral-800 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <span>기타/미분류</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 text-neutral-700">
                {posts.filter((p) => !categoryNames.includes(p.category_name || "일반")).length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 4. 선택 원고 일괄 액션 바 (선택 항목 있을 때 상단 고정 바 표시) */}
      {checkedIds.length > 0 && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 p-3.5 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
              {checkedIds.length}
            </span>
            <div>
              <div className="text-xs font-bold text-emerald-950">
                선택된 원고 {checkedIds.length}건 작업
              </div>
              <div className="text-[11px] text-emerald-700">
                카테고리 일괄 이동, 발행 전송 또는 일괄 삭제가 가능합니다.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 카테고리 일괄 이동 드롭다운 & 버튼 */}
            <div className="flex items-center gap-1.5 bg-white rounded-xl border border-emerald-300 p-1 shadow-2xs">
              <FolderInput size={14} className="text-emerald-700 ml-1.5" />
              <select
                value={bulkMoveCategory}
                onChange={(e) => setBulkMoveCategory(e.target.value)}
                disabled={isBulkUpdating}
                className="text-xs font-semibold px-2 py-1 bg-transparent text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="">카테고리 선택...</option>
                {allSelectableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleBulkMoveCategory}
                disabled={!bulkMoveCategory || isBulkUpdating}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              >
                {isBulkUpdating ? "이동 중..." : "카테고리 이동"}
              </button>
            </div>

            {/* 일괄 발행 전송 */}
            <button
              type="button"
              onClick={handleBulkPublishNow}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <Send size={12} />
              <span>일괄 발행 전송</span>
            </button>

            {/* 일괄 삭제 */}
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isBulkUpdating}
              className="px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={12} />
              <span>선택 삭제</span>
            </button>

            {/* 선택 해제 */}
            <button
              type="button"
              onClick={() => setCheckedIds([])}
              className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 font-semibold"
            >
              해제
            </button>
          </div>
        </div>
      )}

      {/* 5. 원고 보관 목록 카드 */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {/* 목록 헤더 바 */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
          <div className="flex items-center gap-3">
            {/* 전체 선택 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={() => handleToggleSelectAll(filteredPosts)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-neutral-700">
                {checkedIds.length > 0 ? `선택 (${checkedIds.length}건)` : "전체 선택"}
              </span>
            </label>

            <span className="text-neutral-300">|</span>

            <div className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
              <BookOpen size={14} className="text-emerald-600" />
              <span>
                보관 원고 목록 ({filteredPosts.length}건
                {filterCategory !== "all" && (
                  <span className="text-emerald-700 ml-1">· [{filterCategory}]</span>
                )}
                )
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] text-neutral-400">
              제목을 클릭하면 완성된 서식과 이미지가 포함된 상세 뷰어가 열립니다.
            </span>
            <button
              type="button"
              onClick={fetchPosts}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-all disabled:opacity-50 cursor-pointer"
              title="원고 목록 새로고침"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin text-emerald-600" : ""} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto" />
            <div className="text-sm font-semibold text-neutral-700">
              서버 보관함에서 원고 목록을 불러오는 중...
            </div>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="text-3xl">📭</div>
            <div className="text-sm font-bold text-neutral-700">
              {filterCategory !== "all"
                ? `"${filterCategory}" 카테고리에 속한 원고가 없습니다.`
                : "보관된 원고가 없습니다."}
            </div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              [블로그 글 자동 생성] 메뉴에서 첫 글을 생성해보세요. 생성되는 즉시 이곳에 카테고리별로 자동 저장됩니다.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Link
                href="/collector"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-all shadow-2xs"
              >
                <Flame size={13} className="text-rose-600" />
                <span>떡상 글감 수집하기</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Sparkles size={13} />
                <span>첫 블로그 글 생성하기</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredPosts.map((post) => {
              const isChecked = checkedIds.includes(post.id);
              const thumbUrl = post.images?.[0]?.url;
              const imageCount = post.images?.length || 0;
              const charCount = (post.content || "").length;

              return (
                <div
                  key={post.id}
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    isChecked ? "bg-emerald-50/40" : "hover:bg-neutral-50/60"
                  }`}
                >
                  {/* 좌측: 체크박스 & 썸네일 & 메타 정보 */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* 선택 체크박스 */}
                    <div className="pt-2 shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(post.id)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer"
                      />
                    </div>

                    {/* 대표 썸네일 */}
                    <div
                      onClick={() => setViewingDetailPost(post)}
                      className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-neutral-200 bg-neutral-100 shrink-0 overflow-hidden cursor-pointer group shadow-2xs"
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-1">
                          <FileText size={20} />
                          <span className="text-[10px]">텍스트 원고</span>
                        </div>
                      )}
                      {imageCount > 0 && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                          {imageCount}장
                        </span>
                      )}
                    </div>

                    {/* 본문 정보 */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      {/* 상태 배지 & 카테고리 연계 드롭다운 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.status === "published" && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>발행완료</span>
                          </span>
                        )}
                        {post.status === "queued" && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>발행 대기 중</span>
                          </span>
                        )}
                        {post.status === "publishing" && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>에디터 작성 중</span>
                          </span>
                        )}
                        {post.status === "draft" && (
                          <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                            임시보관
                          </span>
                        )}

                        {/* 카테고리 빠른 변경 인라인 셀렉트 */}
                        <div className="relative inline-flex items-center" title="클릭하여 카테고리 즉시 변경">
                          <select
                            value={post.category_name || "일반"}
                            onChange={(e) => handleUpdatePostCategory(post.id, e.target.value)}
                            className="text-[11px] font-semibold pl-2 pr-5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 hover:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none"
                          >
                            {allSelectableCategories.map((cName) => (
                              <option key={cName} value={cName}>
                                📁 {cName}
                              </option>
                            ))}
                          </select>
                          <span className="absolute right-1 text-[9px] pointer-events-none text-emerald-600">
                            ▼
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-neutral-400">
                          ID: {post.blog_id || "myblog"}
                        </span>

                        {/* 30일 보관 — 삭제까지 남은 일수 배지 */}
                        {(() => {
                          const left = retentionDaysLeft(post.created_at);
                          const isWarning = left <= 7;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isWarning
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                              title={`생성일시: ${new Date(post.created_at).toLocaleString("ko-KR")}\n자동삭제 예정: ${retentionDeleteAt(post.created_at).toLocaleDateString("ko-KR")}`}
                            >
                              <Clock size={10} className={isWarning ? "text-rose-600 animate-pulse" : "text-amber-600"} />
                              <span>{left === 0 ? "오늘 자동삭제 예정" : `${left}일 후 자동삭제`}</span>
                            </span>
                          );
                        })()}
                      </div>

                      {/* 제목 (클릭 시 상세 열람) */}
                      <h3
                        onClick={() => setViewingDetailPost(post)}
                        className="font-extrabold text-sm sm:text-base text-neutral-900 hover:text-emerald-700 transition-colors cursor-pointer line-clamp-1"
                      >
                        {post.title}
                      </h3>

                      {/* 요약문 미리보기 */}
                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                        {post.excerpt || post.content.slice(0, 150).replace(/\[SECTION - [^\]]+\]/g, "")}
                      </p>

                      {/* 태그 및 날짜 */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-neutral-400 flex-wrap">
                        <span>약 {charCount.toLocaleString()}자</span>
                        <span>·</span>
                        <span>생성: {new Date(post.created_at).toLocaleString("ko-KR")}</span>
                        {post.published_at && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-medium">
                              발행: {new Date(post.published_at).toLocaleString("ko-KR")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 우측: 액션 버튼 그룹 */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center">
                    {/* 1. 상세 본문 열람 */}
                    <button
                      type="button"
                      onClick={() => setViewingDetailPost(post)}
                      className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="원고 및 이미지 전체 열람"
                    >
                      <Eye size={13} className="text-neutral-500" />
                      <span>열람</span>
                    </button>

                    {/* 2. 클립보드 복사 */}
                    <button
                      type="button"
                      onClick={() => handleCopyPost(post)}
                      className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="마크다운 및 이미지 클립보드 복사"
                    >
                      <Copy size={13} className="text-neutral-500" />
                      <span>{copiedId === post.id ? "복사됨!" : "복사"}</span>
                    </button>

                    {/* 3. 스마트 에디터 수정 */}
                    <button
                      type="button"
                      onClick={() => setEditingPost(post)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 flex items-center gap-1 transition-colors cursor-pointer"
                      title="스마트 에디터로 본문 수정"
                    >
                      <SquarePen size={13} className="text-emerald-600" />
                      <span>편집</span>
                    </button>

                    {/* 4. 크롬 확장의 스마트에디터 ONE으로 즉시 자동 발행 */}
                    {post.status !== "published" && post.status !== "publishing" && (
                      <button
                        type="button"
                        onClick={() => handlePublishNow(post.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Send size={13} />
                        <span>{post.status === "queued" ? "대기 재요청" : "발행 전송"}</span>
                      </button>
                    )}

                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1 transition-colors"
                      >
                        <span>블로그</span>
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {/* 5. 삭제 */}
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer ml-1"
                      title="원고 삭제"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. 상세 원고 열람 모달 (Viewing Detail Modal) */}
      {viewingDetailPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* 모달 헤더 */}
            <header className="border-b border-neutral-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                    원고 상세 열람
                  </span>
                  <span className="text-neutral-300">·</span>
                  {/* 상세 뷰어 내부 카테고리 변경 */}
                  <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-neutral-300">
                    <Folder size={11} className="text-emerald-600" />
                    <select
                      value={viewingDetailPost.category_name || "일반"}
                      onChange={(e) => handleUpdatePostCategory(viewingDetailPost.id, e.target.value)}
                      className="text-xs font-semibold text-neutral-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      {allSelectableCategories.map((cName) => (
                        <option key={cName} value={cName}>
                          {cName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 line-clamp-1">
                  {viewingDetailPost.title}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPost(viewingDetailPost);
                    setViewingDetailPost(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-800 flex items-center gap-1 transition-colors"
                >
                  <SquarePen size={13} className="text-emerald-600" />
                  <span>스마트 에디터 편집</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyPost(viewingDetailPost)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1 transition-colors"
                >
                  <Copy size={13} />
                  <span>복사</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDetailPost(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* 모달 본문 (스크롤 영역) */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* 대표 썸네일 */}
              {viewingDetailPost.images?.[0]?.url && (
                <figure className="rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-xs">
                  <img
                    src={viewingDetailPost.images[0].url}
                    alt={viewingDetailPost.title}
                    className="w-full max-h-[420px] object-cover"
                  />
                  <figcaption className="text-center text-xs text-neutral-500 py-2 bg-neutral-50 border-t border-neutral-100 font-medium">
                    📷 대표 썸네일: {viewingDetailPost.title}
                  </figcaption>
                </figure>
              )}

              {/* 본문 서식 내용 */}
              <div className="p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200 font-sans shadow-inner space-y-2">
                {renderSmartArticle(viewingDetailPost.content, viewingDetailPost.images)}
              </div>

              {/* 태그 */}
              {viewingDetailPost.tags && viewingDetailPost.tags.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                    추천 SEO 검색 태그
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingDetailPost.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-800 text-xs font-semibold border border-neutral-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <footer className="border-t border-neutral-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
                <span>생성: {new Date(viewingDetailPost.created_at).toLocaleString("ko-KR")}</span>
                <span>·</span>
                <span className="text-amber-800 font-semibold">
                  자동삭제 예정: {retentionDeleteAt(viewingDetailPost.created_at).toLocaleDateString("ko-KR")} ({retentionDaysLeft(viewingDetailPost.created_at)}일 남음)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingDetailPost(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-200 transition-colors"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePublishNow(viewingDetailPost.id);
                    setViewingDetailPost(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Send size={13} />
                  <span>스마트에디터 ONE 자동 발행 전송</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* 7. 스마트 에디터 편집 모달 (Editing Modal) */}
      {editingPost && (
        <BlogSmartEditorModal
          isOpen={true}
          onClose={() => setEditingPost(null)}
          title={editingPost.title}
          content={editingPost.content}
          excerpt={editingPost.excerpt || ""}
          tags={editingPost.tags || []}
          category={editingPost.category_name || "일반"}
          categories={categories}
          generatedImages={editingPost.images || []}
          onSave={handleSaveEditor}
        />
      )}

      {/* 8. 떡상 글감 수집 연계 카테고리 관리 모달 */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onUpdateCategories={handleUpdateCategories}
        onCategoryDeleted={handleCategoryDeleted}
      />
    </div>
  );
}
