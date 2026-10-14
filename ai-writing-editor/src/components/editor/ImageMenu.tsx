"use client";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Trash2 } from "lucide-react";

const SIZES = [
  { label: "작게", width: 240 },
  { label: "보통", width: 480 },
  { label: "크게", width: 720 },
];

/** 이미지를 선택하면 뜨는 메뉴: 대체 텍스트(alt) 입력, 크기 3단계, 삭제. 모서리를 끌어 크기를 바꿀 수도 있다. */
export function ImageMenu({ editor }: { editor: Editor }) {
  const img = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: e.isActive("image"),
      alt: (e.getAttributes("image").alt as string | undefined) ?? "",
      width: (e.getAttributes("image").width as number | null | undefined) ?? null,
    }),
  });
  const keep = (e: React.MouseEvent) => { if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault(); };

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="imageBubble"
      options={{ placement: "top", offset: 8 }}
      // 문서를 열 때 맨 앞 이미지가 자동 선택돼 메뉴가 뜨지 않도록, 에디터(또는 이 메뉴 안 입력칸)에 포커스가 있을 때만 보인다
      shouldShow={({ editor: e, element }) => e.isActive("image") && (e.isFocused || element.contains(document.activeElement))}
    >
      <div className="we-toolbar we-image-menu" role="toolbar" aria-label="이미지 설정" onMouseDown={keep}>
        <label className="we-alt">
          <span>설명(alt)</span>
          <input
            aria-label="이미지 설명"
            value={img?.alt ?? ""}
            maxLength={120}
            placeholder="이미지를 설명하는 문장"
            onChange={(e) => editor.chain().updateAttributes("image", { alt: e.target.value }).run()}
          />
        </label>
        {SIZES.map((sz) => (
          <button key={sz.label} type="button" aria-pressed={img?.width === sz.width} onClick={() => editor.chain().focus().updateAttributes("image", { width: sz.width, height: null }).run()}>{sz.label}</button>
        ))}
        <button type="button" aria-label="이미지 삭제" onClick={() => editor.chain().focus().deleteSelection().run()}><Trash2 size={13} /></button>
      </div>
    </BubbleMenu>
  );
}
