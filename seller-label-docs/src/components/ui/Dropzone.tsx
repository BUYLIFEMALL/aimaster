"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

/** 파일 끌어놓기·고르기 영역(여러 도구 공용). 파일은 브라우저 안에서만 읽는다. */
export function Dropzone({ accept, multiple = true, label, hint, onFiles }: { accept: string; multiple?: boolean; label: string; hint?: string; onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      className="slw-drop"
      data-over={over}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
    >
      <Upload className="mx-auto mb-2 text-teal-700" size={26} />
      <p className="text-sm font-bold text-slate-800">{label}</p>
      {hint && <p className="mt-1 text-[12px] text-slate-600">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}
