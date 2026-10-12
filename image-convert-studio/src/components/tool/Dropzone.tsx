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
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors ${
          dragging ? "border-blue-500 bg-blue-50" : "border-neutral-300 bg-neutral-50 hover:border-blue-400 hover:bg-blue-50/40"
        }`}
      >
        <UploadCloud className="mx-auto mb-3 h-8 w-8 text-blue-500" aria-hidden />
        <p className="text-base font-semibold text-neutral-800">{label}</p>
        <p className="mt-1.5 text-sm text-neutral-500">{t.dropzone.sub}</p>
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
      {notice && <p className="mt-2 text-xs text-amber-700">{notice}</p>}
    </div>
  );
}
