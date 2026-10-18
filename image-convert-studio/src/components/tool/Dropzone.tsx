"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { MANY_FILES_WARN, MAX_FILES } from "@/lib/imageTools/formats";
import { fmt } from "@/lib/i18n";
import { useLang } from "./LangProvider";

interface DropzoneProps {
  /** 지금 이미 올라와 있는 장수(최대 개수 계산용) */
  currentCount: number;
  label: string;
  onFiles: (files: File[]) => void;
}

export function Dropzone({ currentCount, label, onFiles }: DropzoneProps) {
  const { t } = useLang();
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (incoming: File[]) => {
    const images = incoming.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    const room = Math.max(0, MAX_FILES - currentCount);
    const taken = images.slice(0, room);
    const messages: string[] = [];
    if (taken.length < images.length) messages.push(fmt(t.dropzone.tooMany, { max: MAX_FILES, n: taken.length }));
    if (currentCount + taken.length > MANY_FILES_WARN) messages.push(fmt(t.dropzone.many, { n: MANY_FILES_WARN }));
    setNotice(messages.join(" "));
    if (taken.length) onFiles(taken);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(Array.from(event.dataTransfer.files));
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-all ${
          dragging
            ? "border-violet-500 bg-violet-950/30 shadow-lg shadow-violet-500/10 scale-[1.01]"
            : "border-[#1e293b] bg-[#111726]/60 hover:border-violet-500/50 hover:bg-[#162032]/80"
        }`}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
          <UploadCloud className="h-6 w-6" aria-hidden />
        </div>
        <p className="text-base font-bold text-white">{label}</p>
        <p className="mt-1.5 text-xs text-slate-400">{t.dropzone.sub}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            accept(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {notice && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-xs text-amber-300 font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
