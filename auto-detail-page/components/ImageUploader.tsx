"use client";

import { useRef, useState } from "react";
import { UploadedImage } from "@/types/product";
import { fileToBase64, validateImageFile } from "@/lib/image-utils";

interface Props {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
}

export default function ImageUploader({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_IMAGES = 5;

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const fileArray = Array.from(files);
    const remaining = MAX_IMAGES - images.length;

    if (remaining <= 0) {
      setError(`최대 ${MAX_IMAGES}개까지 업로드 가능합니다.`);
      return;
    }

    const toAdd = fileArray.slice(0, remaining);
    const results: UploadedImage[] = [];

    for (const file of toAdd) {
      const err = validateImageFile(file);
      if (err) {
        setError(err);
        return;
      }
      const uploaded = await fileToBase64(file);
      results.push(uploaded);
    }

    onChange([...images, ...results]);
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="text-4xl mb-2">📸</div>
        <p className="text-gray-600 font-medium">
          이미지를 드래그하거나 클릭해서 업로드
        </p>
        <p className="text-sm text-gray-400 mt-1">
          JPEG, PNG, WebP · 최대 5MB · 최대 {MAX_IMAGES}개
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={`data:${img.mediaType};base64,${img.base64}`}
                alt={img.name}
                className="w-full h-24 object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <p className="text-xs text-gray-500 p-1 truncate">{img.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
