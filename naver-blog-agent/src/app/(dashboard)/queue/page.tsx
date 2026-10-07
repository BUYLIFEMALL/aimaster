"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import BlogSmartEditorModal from "@/components/BlogSmartEditorModal";

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
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const saved = localStorage.getItem("nba_saved_posts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPosts(parsed);
        }
      } catch {}
    } else {
      const initial: SavedPostItem[] = [
        {
          id: "post-sample-1",
          blog_id: "myblog_sample",
          category_name: "생활정보",
          title: "2026 청년 취업지원금 신청 자격 및 필수 서류 총정리",
          content:
            "[SECTION - 2026 청년 취업지원금이란?]\n올해 새롭게 개편된 청년 지원 정책으로, 취업을 준비하는 만 19세~34세 청년을 위한 실질적인 구직활동 지원금입니다.\n\n[IMAGE INSERT - 청년 취업 준비 서류와 노트북]\n\n[SECTION - 신청 자격 및 소득 기준]\n가구 기준 중위소득 120% 이하를 충족해야 하며, 졸업 후 2년 이내인 미취업 청년이 우선 대상자입니다.\n\n[SECTION - 필수 제출 서류 및 신청 방법]\n주민등록등본, 최종학력 졸업증명서, 구직활동 계획서를 고용복지플러스센터 누리집을 통해 온라인 제출하시면 됩니다.",
          excerpt: "2026년 청년 취업지원금의 신청 자격, 지원 금액, 필수 서류 및 신청 노하우를 한눈에 정리했습니다.",
          tags: ["청년취업지원금", "2026청년정책", "취업지원금신청", "구직활동지원금"],
          images: [
            {
              url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80",
              type: "thumbnail",
              caption: "청년 취업 서류 준비 대표 썸네일",
              prompt: "A young person studying with laptop and notebook",
            },
            {
              url: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
              type: "body",
              caption: "청년 취업 지원 서류 및 노트북 작업 공간",
              prompt: "Desk with documents and laptop",
            },
          ],
          status: "published",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          published_at: new Date().toISOString(),
          post_url: "https://blog.naver.com/myblog_sample/2234567890",
        },
      ];
      setPosts(initial);
      localStorage.setItem("nba_saved_posts", JSON.stringify(initial));
    }
  }, []);

  const savePosts = (items: SavedPostItem[]) => {
    setPosts(items);
    localStorage.setItem("nba_saved_posts", JSON.stringify(items));
  };

  // 즉시 발행 요청 (크롬 확장 큐로 전송)
  const handlePublishNow = (id: string) => {
    const updated = posts.map((p) => {
      if (p.id === id) {
        return { ...p, status: "queued" as const };
      }
      return p;
    });
    savePosts(updated);
    alert(
      "크롬 확장의 자동 발행 큐에 등록되었습니다!\n크롬 브라우저가 열려 있으면 스마트에디터 ONE에 직접 타이핑 및 이미지 첨부를 시작합니다."
    );
  };

  // 원고 삭제
  const handleDelete = (id: string) => {
    if (!confirm("이 원고를 보관함에서 삭제하시겠습니까?")) return;
    const updated = posts.filter((p) => p.id !== id);
    savePosts(updated);
    if (viewingDetailPost?.id === id) setViewingDetailPost(null);
  };

  // 원고 복사
  const handleCopyPost = (post: SavedPostItem) => {
    let formatted = post.content || "";
    const images = post.images || [];

    // [IMAGE INSERT] 마크다운 치환
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
  const handleSaveEditor = (updated: {
    title: string;
    content: string;
    excerpt: string;
    tags: string[];
    isHtml: boolean;
  }) => {
    if (!editingPost) return;
    const updatedList = posts.map((p) => {
      if (p.id === editingPost.id) {
        return {
          ...p,
          title: updated.title,
          content: updated.content,
          excerpt: updated.excerpt,
          tags: updated.tags,
        };
      }
      return p;
    });
    savePosts(updatedList);
    setEditingPost(null);
    alert("원고가 스마트 에디터에서 성공적으로 수정 및 저장되었습니다!");
  };

  // 본문 스마트 렌더링 파서
  const renderSmartArticle = (content: string, images: any[] = []) => {
    if (!content) return null;

    // 만약 위지윅 에디터에서 편집된 HTML 콘텐츠인 경우
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

      // 소제목
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

      // 인라인 이미지
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

  // 필터링된 게시글
  const filteredPosts = posts.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

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
            5단계 AI로 생성된 모든 원고와 이미지가 자동 보관되며, 언제든 본문 열람, 에디터 수정, 네이버 스마트에디터 ONE 자동 발행이 가능합니다.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
        >
          <Plus size={15} />
          <span>새 블로그 글 자동 생성</span>
        </Link>
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

      {/* 3. 원고 보관 목록 그리드 */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {/* 목록 헤더 바 */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/60">
          <div className="font-bold text-xs text-neutral-800 flex items-center gap-2">
            <BookOpen size={14} className="text-emerald-600" />
            <span>보관된 블로그 원고 목록 ({filteredPosts.length}건)</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            제목을 클릭하면 완성된 서식과 이미지가 포함된 상세 뷰어가 열립니다.
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="text-3xl">📭</div>
            <div className="text-sm font-bold text-neutral-700">보관된 원고가 없습니다.</div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              [블로그 글 자동 생성] 메뉴에서 첫 글을 생성해보세요. 생성되는 즉시 이곳에 안전하게 자동 저장됩니다.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Sparkles size={13} />
              <span>첫 블로그 글 생성하기</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredPosts.map((post) => {
              const thumbUrl = post.images?.[0]?.url;
              const imageCount = post.images?.length || 0;
              const charCount = (post.content || "").length;

              return (
                <div
                  key={post.id}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors"
                >
                  {/* 좌측: 썸네일 & 메타 정보 */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
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
                      {/* 상태 배지 & 카테고리 */}
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

                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          {post.category_name || "일반"}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">
                          ID: {post.blog_id || "myblog"}
                        </span>
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

      {/* 4. 상세 원고 열람 모달 (Viewing Detail Modal) */}
      {viewingDetailPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-neutral-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* 모달 헤더 */}
            <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                  원고 상세 열람 ({viewingDetailPost.category_name})
                </span>
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
            <footer className="border-t border-neutral-200 px-6 py-3.5 flex items-center justify-between bg-neutral-50 shrink-0">
              <span className="text-xs text-neutral-400">
                생성일시: {new Date(viewingDetailPost.created_at).toLocaleString("ko-KR")}
              </span>
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

      {/* 5. 스마트 에디터 편집 모달 (Editing Modal) */}
      {editingPost && (
        <BlogSmartEditorModal
          isOpen={true}
          onClose={() => setEditingPost(null)}
          title={editingPost.title}
          content={editingPost.content}
          excerpt={editingPost.excerpt || ""}
          tags={editingPost.tags || []}
          generatedImages={editingPost.images || []}
          onSave={handleSaveEditor}
        />
      )}
    </div>
  );
}
