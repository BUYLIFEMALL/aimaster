"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Youtube } from "@tiptap/extension-youtube";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Highlight } from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useCallback, useRef, useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Video as YoutubeIcon,
  Table as TableIcon,
  Highlighter,
  Minus,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Undo,
  Redo,
  Quote,
  Baseline,
  Sparkles,
  Loader2,
  Upload,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  activeImageModel?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded p-1.5 transition-colors ${
        active
          ? "bg-blue-100 text-blue-700 font-bold"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      } ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-neutral-200" />;
}

function Toolbar({
  editor,
  activeImageModel,
}: {
  editor: Editor;
  activeImageModel?: string;
}) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAiImageInput, setShowAiImageInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // AI 이미지 생성 핸들러 (프롬프트 입력 -> /api/generate-image 호출 -> 에디터에 삽입)
  async function handleGenerateImage() {
    if (!aiPrompt.trim()) return;
    setIsGeneratingImage(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          imageModel: activeImageModel || "nanobanana-2-2k",
          ratio: "1:1",
          caption: aiPrompt.trim(),
          type: "body",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI 이미지 생성에 실패했습니다.");
      }
      editor.chain().focus().setImage({ src: data.url, alt: aiPrompt }).run();
      setAiPrompt("");
      setShowAiImageInput(false);
    } catch (err: any) {
      setAiError(err?.message || "이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingImage(false);
    }
  }

  const TEXT_COLORS = [
    { label: "기본", value: "" },
    { label: "검정", value: "#1f2937" },
    { label: "빨강", value: "#ef4444" },
    { label: "주황", value: "#f97316" },
    { label: "노랑", value: "#eab308" },
    { label: "초록", value: "#22c55e" },
    { label: "파랑", value: "#3b82f6" },
    { label: "보라", value: "#a855f7" },
    { label: "분홍", value: "#ec4899" },
    { label: "하늘", value: "#38bdf8" },
    { label: "회색", value: "#9ca3af" },
  ];

  const setLink = useCallback(() => {
    if (linkUrl) {
      const href = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href, target: "_blank" }).run();
      setLinkUrl("");
    }
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  // 로컬 파일 첨부 업로드
  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setUploadError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "이미지 업로드에 실패했습니다.");
        }
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } catch (err: any) {
        setUploadError("이미지를 올리지 못했습니다: " + (err?.message || "오류"));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor]
  );

  const addYoutube = useCallback(() => {
    if (youtubeUrl) {
      editor.commands.setYoutubeVideo({ src: youtubeUrl, width: 640, height: 360 });
      setYoutubeUrl("");
    }
    setShowYoutubeInput(false);
  }, [editor, youtubeUrl]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  return (
    <div className="border-b border-neutral-200 bg-neutral-50/70">
      {/* 1행: 글자 서식 및 정렬 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200/60 px-3 py-2">
        <ToolbarButton
          title="대제목 (H1)"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="중제목 (H2)"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="소제목 (H3)"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="굵게 (Bold)"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="기울임 (Italic)"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="밑줄 (Underline)"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="취소선"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="형광펜 하이라이트"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="코드"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={15} />
        </ToolbarButton>

        {/* 글자 색상 팔레트 */}
        <div className="relative">
          <button
            type="button"
            title="글자 색상"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex flex-col items-center gap-0.5 rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Baseline size={15} />
            <span
              className="h-1 w-3.5 rounded-xs"
              style={{ background: editor.getAttributes("textStyle").color || "#1f2937" }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-30 mt-1 w-[180px] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
              <p className="mb-2 text-xs font-semibold text-neutral-600">글자 색상 선택</p>
              <div className="grid grid-cols-6 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      if (c.value) editor.chain().focus().setColor(c.value).run();
                      else editor.chain().focus().unsetColor().run();
                      setShowColorPicker(false);
                    }}
                    className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                      editor.getAttributes("textStyle").color === c.value
                        ? "border-neutral-900 scale-110 ring-2 ring-blue-500/30"
                        : "border-neutral-200"
                    }`}
                    style={{
                      background:
                        c.value ||
                        "linear-gradient(135deg, #fff 0%, #fff 45%, #ef4444 45%, #ef4444 55%, #fff 55%)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider />

        <ToolbarButton
          title="왼쪽 정렬"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="가운데 정렬"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="오른쪽 정렬"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="양쪽 정렬"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="글머리 기호 목록"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="번호 매기기 목록"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="인용구"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="가로 구분선"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>
      </div>

      {/* 2행: 미디어 및 부가 기능 (이미지 파일 첨부, AI 이미지 생성, 유튜브, 링크, 표, Undo/Redo) */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2">
        {/* 1. PC 이미지 첨부 */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />
          <button
            type="button"
            title="PC 이미지 첨부"
            disabled={uploading}
            onClick={() => {
              setShowLinkInput(false);
              setShowYoutubeInput(false);
              setShowAiImageInput(false);
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={13} className="animate-spin text-blue-600" />
                <span className="text-[11px] text-blue-600 font-bold">업로드 중...</span>
              </>
            ) : (
              <>
                <Upload size={13} className="text-neutral-600" />
                <span>이미지 첨부</span>
              </>
            )}
          </button>
        </div>

        {/* 2. AI 이미지 생성 및 삽입 */}
        <div className="relative">
          <button
            type="button"
            title="AI 이미지 즉시 생성 삽입"
            disabled={isGeneratingImage}
            onClick={() => {
              setShowAiImageInput(!showAiImageInput);
              setShowLinkInput(false);
              setShowYoutubeInput(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100/90 text-xs font-bold text-blue-700 transition-colors disabled:opacity-50"
          >
            {isGeneratingImage ? (
              <>
                <Loader2 size={13} className="animate-spin text-blue-600" />
                <span className="text-[11px] text-blue-700 font-bold">AI 생성 중...</span>
              </>
            ) : (
              <>
                <Sparkles size={13} className="text-blue-600" />
                <span>✨ AI 이미지 생성</span>
              </>
            )}
          </button>

          {showAiImageInput && (
            <div className="absolute top-full left-0 z-30 mt-1 min-w-[340px] max-w-sm rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <Sparkles size={13} className="text-blue-600" /> 어떤 이미지를 만들까요?
                </span>
                <button
                  type="button"
                  onClick={() => setShowAiImageInput(false)}
                  className="text-neutral-400 hover:text-neutral-600 text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-neutral-500 mb-2">
                한글로 상황이나 피사체를 설명하면 본문 커서 위치에 고화질 이미지를 즉시 생성해 삽입합니다.
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="예: 깔끔하게 정리된 주방 싱크대와 수납함, 감성적인 햇살"
                rows={2}
                className="mb-2 w-full resize-none rounded-lg border border-neutral-300 p-2 text-xs text-neutral-900 outline-none focus:border-blue-600 transition-colors"
                autoFocus
              />
              {aiError && <p className="mb-2 text-[11px] text-red-600 font-medium">{aiError}</p>}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiImageInput(false)}
                  className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !aiPrompt.trim()}
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <span>✨ 생성해서 삽입</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. YouTube 동영상 삽입 */}
        <div className="relative">
          <ToolbarButton
            title="동영상 삽입 (YouTube)"
            active={showYoutubeInput}
            onClick={() => {
              setShowYoutubeInput(!showYoutubeInput);
              setShowLinkInput(false);
              setShowAiImageInput(false);
            }}
          >
            <YoutubeIcon size={15} />
          </ToolbarButton>
          {showYoutubeInput && (
            <div className="absolute top-full left-0 z-30 mt-1 min-w-[300px] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
              <p className="mb-1.5 text-xs font-semibold text-neutral-600">YouTube 영상 링크</p>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-blue-600"
                  onKeyDown={(e) => e.key === "Enter" && addYoutube()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={addYoutube}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                >
                  삽입
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. 링크 삽입 */}
        <div className="relative">
          <ToolbarButton
            title="하이퍼링크 삽입"
            active={editor.isActive("link") || showLinkInput}
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput(!showLinkInput);
                setShowYoutubeInput(false);
                setShowAiImageInput(false);
              }
            }}
          >
            <LinkIcon size={15} />
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-full left-0 z-30 mt-1 min-w-[280px] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
              <p className="mb-1.5 text-xs font-semibold text-neutral-600">연결할 URL 입력</p>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-blue-600"
                  onKeyDown={(e) => e.key === "Enter" && setLink()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={setLink}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                >
                  적용
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. 표 삽입 */}
        <ToolbarButton title="표 삽입 (3×3)" onClick={addTable}>
          <TableIcon size={15} />
        </ToolbarButton>

        <Divider />

        {/* 6. Undo / Redo */}
        <ToolbarButton
          title="실행 취소 (Undo)"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="다시 실행 (Redo)"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo size={15} />
        </ToolbarButton>

        {uploadError && (
          <span className="ml-2 text-[11px] text-red-600 font-medium">{uploadError}</span>
        )}
      </div>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "원고 내용을 자유롭게 편집하세요...",
  className = "",
  activeImageModel,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: { class: "rounded-xl bg-neutral-100 p-4 font-mono text-xs text-neutral-900" },
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({
        inline: false,
        HTMLAttributes: { class: "my-4 max-w-full rounded-2xl border border-neutral-200 shadow-sm" },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: { class: "my-4 w-full overflow-hidden rounded-2xl aspect-video" },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose max-w-none min-h-[420px] px-6 py-5 focus:outline-none text-sm text-neutral-900 leading-relaxed font-sans",
      },
    },
  });

  // 외부 value 변경 동기화 (초기 로드 등)
  useEffect(() => {
    if (editor && value && editor.getHTML() !== value) {
      // 본문이 완전히 비어있거나 다를 때만 동기화
      const current = editor.getHTML();
      if (!current || current === "<p></p>") {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={`overflow-hidden rounded-2xl border border-neutral-300 bg-white shadow-xs ${className}`}>
      <Toolbar editor={editor} activeImageModel={activeImageModel} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
