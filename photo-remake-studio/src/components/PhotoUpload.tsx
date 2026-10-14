"use client";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import type { PhotoInput } from "@/lib/remake/clientImages";
export function PhotoUpload({ photo, title, disabled, onFile }: { photo: PhotoInput | null; title: string; disabled: boolean; onFile: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null); const [drag, setDrag] = useState(false);
  return <div className={`photo-upload ${drag ? "drag" : ""}`} onDragOver={e => { e.preventDefault(); if (!disabled) setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); if (!disabled && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}>
    <button className="upload-surface" type="button" disabled={disabled} onClick={() => input.current?.click()} aria-label={title}>
      {photo ? <img src={photo.preview} alt={`${title} 미리보기`} /> : <><span className="upload-icon"><UploadCloud size={27}/></span><strong>{title}</strong><span>사진을 놓거나 눌러서 선택하세요</span><small>JPEG · PNG · WebP / 최대 25MB</small></>}
    </button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label={`${title} 파일`} hidden disabled={disabled} onChange={e => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }}/>
    {photo && <div className="photo-caption"><strong>{photo.name}</strong><span>처리 입력 {photo.width} × {photo.height}px{photo.width !== photo.originalWidth || photo.height !== photo.originalHeight ? ` · 원본 ${photo.originalWidth} × ${photo.originalHeight}px` : ""}</span><button type="button" disabled={disabled} onClick={() => input.current?.click()}>사진 바꾸기</button></div>}
  </div>;
}
