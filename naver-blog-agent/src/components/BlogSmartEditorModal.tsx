"use client";

import { useState, useRef, useEffect } from "react";
import {
  SquarePen,
  ArrowLeft,
  Check,
  Tag,
  Folder,
  Eye,
  Code,
  Sparkles,
  Link as LinkIcon,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Quote,
  List,
  X,
  Plus,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";

interface BlogSmartEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  category?: string;
  categories?: { id: string; name: string }[];
  generatedImages: { url: string; type: "thumbnail" | "body"; caption: string; prompt: string }[];
  activeImageModel?: string;
  onSave: (updated: {
    title: string;
    content: string;
    excerpt: string;
    tags: string[];
    category?: string;
    isHtml: boolean;
  }) => void;
}

// 원본 텍스트([SECTION], [IMAGE INSERT])를 Tiptap 위지윅 에디터용 HTML로 변환하는 유틸리티
function convertTextToEditorHtml(
  raw: string,
  images: { url: string; caption: string; type: "thumbnail" | "body" }[]
): string {
  if (!raw) return "";

  // 이미 HTML 태그를 포함하고 있는 경우 그대로 사용
  if (/<(p|h1|h2|h3|img|div|ul|ol|blockquote)[^>]*>/i.test(raw)) {
    return raw;
  }

  const lines = raw.split("\n");
  const htmlParts: string[] = [];
  let bodyImageIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. 소제목 [SECTION - ...]
    const sectionMatch = line.match(/^\[SECTION\s*-\s*(.+?)\]$/i);
    if (sectionMatch) {
      htmlParts.push(`<h2>${sectionMatch[1].trim()}</h2>`);
      continue;
    }

    // 2. 이미지 삽입 위치 [IMAGE INSERT - ...]
    const imageMatch = line.match(/^\[IMAGE INSERT\s*-\s*(.+?)\]$/i);
    if (imageMatch) {
      const caption = imageMatch[1].trim();
      // 생성된 이미지 중에서 순서대로 매핑
      const matchedImg = images[bodyImageIdx] || images.find((im) => im.caption.includes(caption));
      if (matchedImg) {
        bodyImageIdx++;
        htmlParts.push(
          `<p><img src="${matchedImg.url}" alt="${caption}" /></p><p><em>📷 ${caption}</em></p>`
        );
      } else {
        htmlParts.push(
          `<p><strong>[📷 이미지 위치: ${caption}]</strong></p>`
        );
      }
      continue;
    }

    // 3. 마크다운 스타일 소제목 (##, ###)
    if (line.startsWith("### ")) {
      htmlParts.push(`<h3>${line.slice(4).trim()}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      htmlParts.push(`<h2>${line.slice(3).trim()}</h2>`);
      continue;
    }

    // 4. 일반 본문 단락
    htmlParts.push(`<p>${line}</p>`);
  }

  return htmlParts.join("");
}

export default function BlogSmartEditorModal({
  isOpen,
  onClose,
  title: initialTitle,
  content: initialContent,
  excerpt: initialExcerpt,
  tags: initialTags,
  category: initialCategory = "일반",
  categories = [],
  generatedImages,
  activeImageModel,
  onSave,
}: BlogSmartEditorModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [category, setCategory] = useState(initialCategory || "일반");
  const [tagInput, setTagInput] = useState("");

  // 듀얼 에디터 모드 (비주얼 vs 코드)
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");

  // 비주얼 에디터 HTML 콘텐츠
  const [htmlContent, setHtmlContent] = useState("");
  // 코드 에디터 원본 텍스트 콘텐츠
  const [codeContent, setCodeContent] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState("");

  // 모달이 열릴 때 초기 데이터 세팅
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setExcerpt(initialExcerpt);
      setTags([...initialTags]);
      setCategory(initialCategory || "일반");
      setCodeContent(initialContent);

      const converted = convertTextToEditorHtml(initialContent, generatedImages);
      setHtmlContent(converted);
    }
  }, [isOpen, initialTitle, initialContent, initialExcerpt, initialTags, initialCategory, generatedImages]);

  if (!isOpen) return null;

  // 태그 추가
  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  // 태그 삭제
  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  // 모드 전환 핸들러
  const switchToVisual = () => {
    if (editorMode === "code") {
      // 코드 내용을 HTML로 변환하여 비주얼 에디터에 주입
      const converted = convertTextToEditorHtml(codeContent, generatedImages);
      setHtmlContent(converted);
      setEditorMode("visual");
    }
  };

  const switchToCode = () => {
    if (editorMode === "visual") {
      // HTML 내용을 줄글/텍스트로 보존
      setEditorMode("code");
    }
  };

  // 코드 모드 서식 삽입 도구
  const insertFormatting = (prefix: string, suffix = "") => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = codeContent.substring(start, end) || "텍스트";
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = codeContent.substring(0, start) + replacement + codeContent.substring(end);
    setCodeContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // 코드 모드 링크 삽입
  const insertLink = () => {
    const raw = linkUrlInput.trim();
    if (!raw || !textareaRef.current) return;
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = codeContent.substring(start, end) || "링크";
    const replacement = `[${selectedText}](${href})`;
    const newContent = codeContent.substring(0, start) + replacement + codeContent.substring(end);
    setCodeContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 0);

    setLinkUrlInput("");
    setShowLinkPopover(false);
  };

  // 최종 저장 적용
  const handleSave = () => {
    if (!title.trim()) {
      alert("게시글 제목을 입력해주세요.");
      return;
    }

    const finalContent = editorMode === "visual" ? htmlContent : codeContent;
    const isHtml = editorMode === "visual";

    onSave({
      title: title.trim(),
      content: finalContent,
      excerpt: excerpt.trim(),
      tags,
      category: category.trim(),
      isHtml,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-neutral-50 rounded-2xl md:rounded-3xl shadow-2xl border border-neutral-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* 1. 상단 헤더 바 */}
        <header className="border-b border-neutral-200 bg-white px-5 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-900 text-xs font-bold transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100"
            >
              <ArrowLeft size={15} /> 닫기
            </button>
            <div className="h-4 w-px bg-neutral-200" />
            <div className="flex items-center gap-2">
              <SquarePen size={18} className="text-emerald-600" />
              <h2 className="text-base font-extrabold text-neutral-900">
                스마트 에디터 (원고 본문 편집기)
              </h2>
            </div>
            <a
              href="https://www.buylife.xyz/programs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-neutral-700 text-xs font-medium transition-colors hidden sm:inline ml-2"
            >
              ← 다른 프로그램 보기 ↗
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={15} />
              <span>편집 완료 및 본문 적용</span>
            </button>
          </div>
        </header>

        {/* 2. 에디터 메인 바디 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* A. 추천 SEO 검색 태그 설정 */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                <Tag size={14} /> 추천 검색 태그 설정 ({tags.length}개)
              </label>
              <span className="text-[11px] text-neutral-400">
                태그를 클릭하면 삭제되며, 새 태그를 직접 입력할 수 있습니다.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 border border-neutral-200 px-2.5 py-1 text-xs font-semibold text-neutral-800 group"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="text-neutral-400 hover:text-red-600 transition-colors ml-0.5"
                    title="태그 삭제"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              {/* 새 태그 입력 */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="+ 태그 추가 (Enter)"
                  className="w-32 rounded-lg border border-neutral-300 px-2.5 py-1 text-xs text-neutral-900 outline-none focus:border-emerald-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* A-2. 블로그 카테고리 분류 (떡상 글감 수집소 연계) */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
                <Folder size={14} className="text-emerald-600" />
                <span>블로그 카테고리 분류</span>
              </label>
              <span className="text-[11px] text-neutral-400">
                떡상 글감 수집소 카테고리와 실시간 연계됩니다.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {categories && categories.length > 0 && (
                <select
                  value={categories.some((c) => c.name === category) ? category : "__custom__"}
                  onChange={(e) => {
                    if (e.target.value !== "__custom__") {
                      setCategory(e.target.value);
                    }
                  }}
                  className="sm:w-56 px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white font-semibold text-neutral-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="__custom__">직접 입력 / 기타</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="카테고리명 (예: 생활/살림꿀팁, IT/테크리뷰)"
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>
          </div>

          {/* B. 제목 (Title) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
              블로그 글 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="게시글 제목을 입력하세요..."
              className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 text-base font-extrabold placeholder-neutral-400 focus:outline-none focus:border-emerald-600 transition-colors shadow-2xs"
            />
          </div>

          {/* C. 요약 설명 (Excerpt) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
              요약 설명 (Excerpt)
            </label>
            <textarea
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="게시글 요약 문구를 입력하세요..."
              className="w-full rounded-2xl border border-neutral-300 bg-white p-3.5 text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-emerald-600 transition-colors resize-none shadow-2xs"
            />
          </div>

          {/* D. 듀얼 에디터 본문 섹션 */}
          <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            {/* 상단 모드 스위처 (비주얼 vs 코드) */}
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                <SquarePen size={14} className="text-emerald-600" />
                <span>원고 본문 편집기</span>
              </div>

              <div className="flex items-center bg-neutral-200/70 rounded-xl p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={switchToVisual}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    editorMode === "visual"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Eye size={13} />
                  <span>비주얼 스마트 위지윅</span>
                </button>
                <button
                  type="button"
                  onClick={switchToCode}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    editorMode === "code"
                      ? "bg-white text-emerald-700 shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Code size={13} />
                  <span>코드 / 텍스트</span>
                </button>
              </div>
            </div>

            {/* 1) 비주얼 모드 (RichTextEditor) */}
            {editorMode === "visual" && (
              <div className="p-2 sm:p-3">
                <RichTextEditor
                  value={htmlContent}
                  onChange={setHtmlContent}
                  placeholder="스마트에디터 ONE에 맞춘 원고를 자유롭게 수정하세요..."
                  activeImageModel={activeImageModel}
                  className="border-0 shadow-none rounded-none"
                />
              </div>
            )}

            {/* 2) 코드 / 텍스트 모드 */}
            {editorMode === "code" && (
              <div className="flex flex-col">
                {/* 코드 모드 서식 툴바 */}
                <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50/70 px-3 py-2">
                  <button
                    type="button"
                    title="소제목 (H2)"
                    onClick={() => insertFormatting("## ", "\n")}
                    className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600"
                  >
                    <Heading2 size={15} />
                  </button>
                  <button
                    type="button"
                    title="소제목 (H3)"
                    onClick={() => insertFormatting("### ", "\n")}
                    className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600"
                  >
                    <Heading3 size={15} />
                  </button>
                  <div className="h-4 w-px bg-neutral-200 mx-1" />
                  <button
                    type="button"
                    title="굵게"
                    onClick={() => insertFormatting("**", "**")}
                    className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    title="기울임"
                    onClick={() => insertFormatting("*", "*")}
                    className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    title="인용"
                    onClick={() => insertFormatting("> ", "\n")}
                    className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600"
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    title="글머리 기호"
                    onClick={() => insertFormatting("- ", "\n")}
                    className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600"
                  >
                    <List size={15} />
                  </button>
                  <div className="h-4 w-px bg-neutral-200 mx-1" />

                  {/* 코드 모드 링크 팝오버 */}
                  <div className="relative">
                    <button
                      type="button"
                      title="링크 삽입"
                      onClick={() => setShowLinkPopover(!showLinkPopover)}
                      className="p-1.5 rounded hover:bg-neutral-200 text-neutral-600 flex items-center gap-1"
                    >
                      <LinkIcon size={15} />
                    </button>
                    {showLinkPopover && (
                      <div className="absolute top-full left-0 z-20 mt-1 w-64 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
                        <p className="mb-1 text-xs font-semibold text-neutral-600">링크 URL</p>
                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            value={linkUrlInput}
                            onChange={(e) => setLinkUrlInput(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-emerald-600"
                            onKeyDown={(e) => e.key === "Enter" && insertLink()}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={insertLink}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            삽입
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 코드 모드 텍스트에어리어 */}
                <textarea
                  ref={textareaRef}
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  rows={18}
                  placeholder="원고 텍스트를 입력하세요..."
                  className="w-full p-4 font-mono text-xs sm:text-sm text-neutral-900 leading-relaxed outline-none resize-y min-h-[420px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. 하단 푸터 바 */}
        <footer className="border-t border-neutral-200 bg-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-neutral-500">
            편집된 원고는 네이버 블로그 스마트에디터 ONE 원클릭 발행 및 원고 복사에 즉시 반영됩니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={15} />
              <span>편집 완료 및 본문 적용</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
