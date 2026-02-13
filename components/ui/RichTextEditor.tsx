"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Youtube } from "@tiptap/extension-youtube";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { Highlight } from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link as LinkIcon, Image as ImageIcon, Youtube as YoutubeIcon,
  Table as TableIcon, Highlighter, Minus, List, ListOrdered,
  Heading1, Heading2, Heading3, Code, Undo, Redo, Quote, Baseline,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
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
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-gold/20 text-gold"
          : "text-subtext hover:text-white hover:bg-white/10"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-white/10 mx-1" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const supabase = createClient();
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TEXT_COLORS = [
    { label: "기본", value: "" },
    { label: "흰색", value: "#ffffff" },
    { label: "골드", value: "#d4af37" },
    { label: "노랑", value: "#f5c842" },
    { label: "빨강", value: "#ef4444" },
    { label: "주황", value: "#f97316" },
    { label: "초록", value: "#22c55e" },
    { label: "파랑", value: "#3b82f6" },
    { label: "보라", value: "#a855f7" },
    { label: "분홍", value: "#ec4899" },
    { label: "하늘", value: "#38bdf8" },
    { label: "연두", value: "#84cc16" },
    { label: "회색", value: "#9ca3af" },
    { label: "검정", value: "#1f2937" },
  ];

  const setLink = useCallback(() => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl, target: "_blank" }).run();
      setLinkUrl("");
    }
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const handleImageFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `editor/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("program-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("program-images").getPublicUrl(path);
      editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
    } catch (err) {
      alert("이미지 업로드 실패: " + (err instanceof Error ? err.message : "오류"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [editor, supabase]);

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
    <div className="border-b border-white/10">
      {/* Row 1: Block types */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-white/5">
        <ToolbarButton
          title="제목 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="제목 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="제목 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="굵게"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="기울임"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="밑줄"
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
          title="하이라이트"
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

        {/* 글자 색상 */}
        <div className="relative">
          <button
            type="button"
            title="글자 색상"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1.5 rounded transition-colors text-subtext hover:text-white hover:bg-white/10 flex flex-col items-center gap-0.5"
          >
            <Baseline size={15} />
            <span
              className="w-3.5 h-1 rounded-sm"
              style={{
                background: editor.getAttributes("textStyle").color || "#ffffff",
              }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-20 mt-1 bg-[#1a1a2e] border border-white/15 rounded-xl p-3 shadow-xl w-[188px]">
              <p className="text-xs text-subtext mb-2">글자 색상</p>
              <div className="grid grid-cols-7 gap-1.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => {
                      if (c.value) {
                        editor.chain().focus().setColor(c.value).run();
                      } else {
                        editor.chain().focus().unsetColor().run();
                      }
                      setShowColorPicker(false);
                    }}
                    className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                      editor.getAttributes("textStyle").color === c.value
                        ? "border-white scale-110"
                        : "border-white/20"
                    }`}
                    style={{
                      background: c.value || "linear-gradient(135deg, #fff 0%, #fff 45%, #ef4444 45%, #ef4444 55%, #fff 55%)",
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
          title="글머리 기호"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="번호 목록"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="인용"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="구분선"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>
      </div>

      {/* Row 2: Insert elements */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2">
        {/* Image — file upload */}
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />
          <ToolbarButton
            title="이미지 첨부"
            disabled={uploading}
            onClick={() => { setShowLinkInput(false); setShowYoutubeInput(false); fileInputRef.current?.click(); }}
          >
            {uploading ? (
              <span className="text-[10px] text-gold animate-pulse">...</span>
            ) : (
              <ImageIcon size={15} />
            )}
          </ToolbarButton>
        </div>

        {/* YouTube */}
        <div className="relative">
          <ToolbarButton
            title="동영상 삽입"
            active={showYoutubeInput}
            onClick={() => { setShowYoutubeInput(!showYoutubeInput); setShowLinkInput(false); }}
          >
            <YoutubeIcon size={15} />
          </ToolbarButton>
          {showYoutubeInput && (
            <div className="absolute top-full left-0 z-10 mt-1 bg-[#1a1a2e] border border-white/15 rounded-lg p-3 shadow-xl min-w-[320px]">
              <p className="text-xs text-subtext mb-2">YouTube URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 input-dark text-xs py-1.5"
                  onKeyDown={(e) => e.key === "Enter" && addYoutube()}
                  autoFocus
                />
                <button type="button" onClick={addYoutube} className="text-xs px-3 py-1.5 bg-gold/20 text-gold rounded hover:bg-gold/30 transition-colors">삽입</button>
              </div>
            </div>
          )}
        </div>

        {/* Link */}
        <div className="relative">
          <ToolbarButton
            title="링크 삽입"
            active={editor.isActive("link") || showLinkInput}
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput(!showLinkInput);
                setShowYoutubeInput(false);
              }
            }}
          >
            <LinkIcon size={15} />
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-full left-0 z-10 mt-1 bg-[#1a1a2e] border border-white/15 rounded-lg p-3 shadow-xl min-w-[280px]">
              <p className="text-xs text-subtext mb-2">링크 URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 input-dark text-xs py-1.5"
                  onKeyDown={(e) => e.key === "Enter" && setLink()}
                  autoFocus
                />
                <button type="button" onClick={setLink} className="text-xs px-3 py-1.5 bg-gold/20 text-gold rounded hover:bg-gold/30 transition-colors">삽입</button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <ToolbarButton title="표 삽입 (3×3)" onClick={addTable}>
          <TableIcon size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="실행 취소"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="다시 실행"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo size={15} />
        </ToolbarButton>
      </div>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "bg-black/40 rounded-lg p-4 text-sm font-mono" } } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, HTMLAttributes: { class: "max-w-full rounded-lg" } }),
      Youtube.configure({ width: 640, height: 360, HTMLAttributes: { class: "w-full rounded-xl overflow-hidden" } }),
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
        class: "prose-editor min-h-[320px] px-5 py-4 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={`border border-white/10 rounded-xl overflow-hidden bg-white/3 ${className}`}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
