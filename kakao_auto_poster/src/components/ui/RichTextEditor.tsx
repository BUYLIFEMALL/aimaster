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
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateReportImageAction, type GenerateImageState } from "@/lib/actions/reports";
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
  Youtube as YoutubeIcon,
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
} from "lucide-react";

const generateImageInitialState: GenerateImageState = {};

// 루트 AIMaster의 components/ui/RichTextEditor.tsx(Tiptap 기반, 이미지 업로드+YouTube
// 삽입)와 동일한 구성/툴바를 그대로 재사용하되, 이 프로젝트는 별도 Next.js 프로젝트라
// 컴포넌트를 그대로 import할 수 없어 복사해서 팔레트만 이 프로젝트의 밝은 테마(흰
// 배경 + neutral)로 다시 맞췄다. 이미지는 이 프로젝트 전용 공개 버킷
// kakao-report-images(본인 폴더에만 업로드 가능)에 저장한다.
interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  userId: string;
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
      className={`rounded p-1.5 transition-colors ${
        active ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      } ${disabled ? "cursor-not-allowed opacity-30" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-neutral-200" />;
}

function Toolbar({ editor, userId }: { editor: Editor; userId: string }) {
  const supabase = createClient();
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAiImageInput, setShowAiImageInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [genState, genFormAction, isGeneratingImage] = useActionState(
    generateReportImageAction,
    generateImageInitialState,
  );

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
      editor.chain().focus().setLink({ href: linkUrl, target: "_blank" }).run();
      setLinkUrl("");
    }
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("kakao-report-images").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("kakao-report-images").getPublicUrl(path);
        editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
      } catch (err) {
        alert("이미지 업로드 실패: " + (err instanceof Error ? err.message : "오류"));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor, supabase, userId],
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

  // AI 이미지 생성(docs/PLATFORM_PATTERNS.md §12 — Gemini 직접 호출 + Storage 업로드) 결과가
  // 오면 자동으로 본문에 삽입한다. insertedUrlRef로 같은 결과를 두 번 넣지 않게 막는다.
  const insertedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (genState.url && genState.url !== insertedUrlRef.current) {
      insertedUrlRef.current = genState.url;
      editor.chain().focus().setImage({ src: genState.url }).run();
      setAiPrompt("");
      setShowAiImageInput(false);
    }
  }, [genState.url, editor]);

  return (
    <div className="border-b border-neutral-200">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-100 px-3 py-2">
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

        <ToolbarButton title="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton title="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
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
        <ToolbarButton title="코드" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={15} />
        </ToolbarButton>

        <div className="relative">
          <button
            type="button"
            title="글자 색상"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex flex-col items-center gap-0.5 rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Baseline size={15} />
            <span
              className="h-1 w-3.5 rounded-sm"
              style={{ background: editor.getAttributes("textStyle").color || "#1f2937" }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-20 mt-1 w-[176px] rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
              <p className="mb-2 text-xs text-neutral-500">글자 색상</p>
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
                      editor.getAttributes("textStyle").color === c.value ? "border-neutral-900 scale-110" : "border-neutral-200"
                    }`}
                    style={{
                      background:
                        c.value || "linear-gradient(135deg, #fff 0%, #fff 45%, #ef4444 45%, #ef4444 55%, #fff 55%)",
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
        <ToolbarButton title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={15} />
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2">
        <div className="relative">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <ToolbarButton
            title="이미지 첨부"
            disabled={uploading}
            onClick={() => {
              setShowLinkInput(false);
              setShowYoutubeInput(false);
              fileInputRef.current?.click();
            }}
          >
            {uploading ? <span className="animate-pulse text-[10px] text-blue-600">...</span> : <ImageIcon size={15} />}
          </ToolbarButton>
        </div>

        <div className="relative">
          <ToolbarButton
            title="AI 이미지 생성"
            active={showAiImageInput}
            disabled={isGeneratingImage}
            onClick={() => {
              setShowAiImageInput(!showAiImageInput);
              setShowLinkInput(false);
              setShowYoutubeInput(false);
            }}
          >
            {isGeneratingImage ? (
              <span className="animate-pulse text-[10px] text-blue-600">...</span>
            ) : (
              <Sparkles size={15} />
            )}
          </ToolbarButton>
          {showAiImageInput && (
            <form
              action={genFormAction}
              className="absolute top-full left-0 z-10 mt-1 min-w-[320px] rounded-lg border border-neutral-200 bg-white p-3 shadow-xl"
            >
              <p className="mb-2 text-xs text-neutral-500">어떤 이미지를 만들까요? (한글로 설명해주세요)</p>
              <textarea
                name="prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="예: 카페에서 노트북으로 이커머스 데이터를 분석하는 사람"
                rows={2}
                className="mb-2 w-full resize-none rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                autoFocus
              />
              {genState.error && <p className="mb-2 text-[11px] text-red-600">{genState.error}</p>}
              <button
                type="submit"
                disabled={isGeneratingImage || !aiPrompt.trim()}
                className="rounded bg-blue-100 px-3 py-1.5 text-xs text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50"
              >
                {isGeneratingImage ? "생성 중... (몇 초 걸려요)" : "✨ 생성해서 삽입"}
              </button>
            </form>
          )}
        </div>

        <div className="relative">
          <ToolbarButton
            title="동영상 삽입 (YouTube)"
            active={showYoutubeInput}
            onClick={() => {
              setShowYoutubeInput(!showYoutubeInput);
              setShowLinkInput(false);
            }}
          >
            <YoutubeIcon size={15} />
          </ToolbarButton>
          {showYoutubeInput && (
            <div className="absolute top-full left-0 z-10 mt-1 min-w-[320px] rounded-lg border border-neutral-200 bg-white p-3 shadow-xl">
              <p className="mb-2 text-xs text-neutral-500">YouTube URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                  onKeyDown={(e) => e.key === "Enter" && addYoutube()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={addYoutube}
                  className="rounded bg-blue-100 px-3 py-1.5 text-xs text-blue-700 transition-colors hover:bg-blue-200"
                >
                  삽입
                </button>
              </div>
            </div>
          )}
        </div>

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
            <div className="absolute top-full left-0 z-10 mt-1 min-w-[280px] rounded-lg border border-neutral-200 bg-white p-3 shadow-xl">
              <p className="mb-2 text-xs text-neutral-500">링크 URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                  onKeyDown={(e) => e.key === "Enter" && setLink()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={setLink}
                  className="rounded bg-blue-100 px-3 py-1.5 text-xs text-blue-700 transition-colors hover:bg-blue-200"
                >
                  삽입
                </button>
              </div>
            </div>
          )}
        </div>

        <ToolbarButton title="표 삽입 (3×3)" onClick={addTable}>
          <TableIcon size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="실행 취소" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={15} />
        </ToolbarButton>
        <ToolbarButton title="다시 실행" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={15} />
        </ToolbarButton>
      </div>
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  userId,
  placeholder = "내용을 입력하세요...",
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "rounded-lg bg-neutral-100 p-4 font-mono text-sm" } } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, HTMLAttributes: { class: "max-w-full rounded-lg" } }),
      Youtube.configure({ width: 640, height: 360, HTMLAttributes: { class: "w-full overflow-hidden rounded-xl" } }),
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
        class: "prose-report min-h-[240px] px-4 py-3 focus:outline-none text-sm text-neutral-800 leading-relaxed",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={`overflow-hidden rounded-xl border border-neutral-300 bg-white ${className}`}>
      <Toolbar editor={editor} userId={userId} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
