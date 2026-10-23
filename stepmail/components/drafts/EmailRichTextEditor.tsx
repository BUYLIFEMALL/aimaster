"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Highlighter,
  Minus,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Quote,
  Baseline,
} from "lucide-react";

// TipTap의 Link/Image 기본 attrs 스키마에는 style이 없어서, AI가 만든 CTA 버튼(<a style="...">)이나
// 초안 이미지(<img style="...">)를 실제로 편집(타이핑)하는 순간 커스텀 인라인 style이 통째로
// 사라지는 회귀가 있었다(파싱 시 스키마 밖 속성은 보존되지 않음) — style을 attrs에 추가해서
// 파싱/직렬화 양쪽에서 그대로 살아남게 한다.
const StyledLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("style"),
        renderHTML: (attributes: { style?: string | null }) => (attributes.style ? { style: attributes.style } : {}),
      },
    };
  },
});

const StyledImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("style"),
        renderHTML: (attributes: { style?: string | null }) => (attributes.style ? { style: attributes.style } : {}),
      },
    };
  },
});

// 루트 앱의 components/ui/RichTextEditor.tsx(TipTap)를 참고하되, 블로그 글이 아니라 "실제
// 발송되는 이메일 본문"이라는 특성에 맞춰 범위를 줄였다 — 유튜브 삽입/표는 대부분의 이메일
// 클라이언트(Outlook 등)에서 iframe이 제거되거나 깨지므로 제외했다.

interface EmailRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
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
        active ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

const TEXT_COLORS = [
  { label: "기본", value: "" },
  { label: "검정", value: "#111827" },
  { label: "회색", value: "#6b7280" },
  { label: "빨강", value: "#ef4444" },
  { label: "주황", value: "#f97316" },
  { label: "초록", value: "#22c55e" },
  { label: "파랑", value: "#3b82f6" },
  { label: "보라", value: "#a855f7" },
];

function Toolbar({ editor }: { editor: Editor }) {
  const supabase = createClient();
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) throw new Error("로그인이 필요합니다.");
        const ext = file.name.split(".").pop() ?? "png";
        const path = `${userId}/editor/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("stepmail-images").upload(path, file, { upsert: false });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("stepmail-images").getPublicUrl(path);
        editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
      } catch (err) {
        alert("이미지 업로드 실패: " + (err instanceof Error ? err.message : "오류"));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor, supabase],
  );

  return (
    <div className="border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100">
        <ToolbarButton title="제목 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton title="제목 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton title="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton title="밑줄" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton title="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolbarButton>
        <ToolbarButton title="하이라이트" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
          <Highlighter size={15} />
        </ToolbarButton>

        <div className="relative">
          <button
            type="button"
            title="글자 색상"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1.5 rounded transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100 flex flex-col items-center gap-0.5"
          >
            <Baseline size={15} />
            <span className="w-3.5 h-1 rounded-sm" style={{ background: editor.getAttributes("textStyle").color || "#111827" }} />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl p-3 shadow-xl w-[168px]">
              <p className="text-xs text-gray-500 mb-2">글자 색상</p>
              <div className="grid grid-cols-4 gap-1.5">
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
                    className="w-6 h-6 rounded-md border border-gray-200 transition-transform hover:scale-110"
                    style={{ background: c.value || "#ffffff" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider />

        <ToolbarButton title="왼쪽 정렬" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton title="가운데 정렬" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton title="오른쪽 정렬" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="글머리 기호" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton title="번호 목록" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton title="인용" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={15} />
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2">
        <div className="relative">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <ToolbarButton title="이미지 첨부" disabled={uploading} onClick={() => { setShowLinkInput(false); fileInputRef.current?.click(); }}>
            {uploading ? <span className="text-[10px] text-blue-600 animate-pulse">...</span> : <ImageIcon size={15} />}
          </ToolbarButton>
        </div>

        <div className="relative">
          <ToolbarButton
            title="링크 삽입"
            active={editor.isActive("link") || showLinkInput}
            onClick={() => {
              if (editor.isActive("link")) editor.chain().focus().unsetLink().run();
              else setShowLinkInput(!showLinkInput);
            }}
          >
            <LinkIcon size={15} />
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-full left-0 z-10 mt-1 bg-white border border-gray-200 rounded-lg p-3 shadow-xl min-w-[280px]">
              <p className="text-xs text-gray-500 mb-2">링크 URL</p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 input text-xs py-1.5"
                  onKeyDown={(e) => e.key === "Enter" && setLink()}
                  autoFocus
                />
                <button type="button" onClick={setLink} className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                  삽입
                </button>
              </div>
            </div>
          )}
        </div>

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

export default function EmailRichTextEditor({ value, onChange, className = "" }: EmailRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "bg-gray-100 rounded-lg p-4 text-sm font-mono" } } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      StyledLink.configure({ openOnClick: false, autolink: true }),
      StyledImage.configure({ inline: false, HTMLAttributes: { class: "max-w-full rounded-lg" } }),
    ],
    content: value,
    // 빈 문단(Enter 두 번으로 만든 문단 사이 빈 줄)은 TipTap이 <p></p>(내용 없음)로 만드는데,
    // 브라우저와 대부분의 메일 클라이언트가 내용이 아예 없는 <p>는 높이 0으로 접어버려서
    // 빈 줄이 반영 안 된 것처럼 보인다. <br>을 강제로 넣어서(<p><br></p>) 실제로 한 줄 높이를
    // 차지하게 만든다 — 우리 미리보기뿐 아니라 실제 발송되는 메일에서도 그대로 살아남는다.
    onUpdate: ({ editor }) => onChange(editor.getHTML().replace(/<p([^>]*)><\/p>/g, "<p$1><br></p>")),
    editorProps: {
      attributes: { class: "prose-email min-h-[280px] px-5 py-4 focus:outline-none text-sm" },
    },
  });

  if (!editor) return null;

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white ${className}`}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
