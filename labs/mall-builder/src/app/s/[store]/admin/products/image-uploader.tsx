"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_IMAGES, type ProductImage } from "@/lib/products";

const BUCKET = "mall-builder-public";
const MAX_BYTES = 5 * 1024 * 1024;

// 사진은 브라우저에서 바로 몰 폴더(<몰 id>/products/)로 올린다. 저장소 보안 규칙이 그 몰 운영자만 허용한다.
export default function ImageUploader({ storeId, initial }: { storeId: string; initial: ProductImage[] }) {
  const [images, setImages] = useState<ProductImage[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_IMAGES - images.length;
    const picked = [...files].slice(0, room);
    if (files.length > room) setError(`사진은 ${MAX_IMAGES}장까지입니다. 앞의 ${room}장만 올립니다.`);
    setBusy(true);
    const supabase = createClient();
    const added: ProductImage[] = [];
    for (const file of picked) {
      if (file.size > MAX_BYTES) {
        setError(`「${file.name}」은(는) 5MB가 넘어 올리지 못했습니다.`);
        continue;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${storeId}/products/${crypto.randomUUID()}.${ext}`;
      const { error: upError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upError) {
        setError(`「${file.name}」 올리기 실패: ${upError.message}`);
        continue;
      }
      added.push({ path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
    }
    setImages((prev) => [...prev, ...added]);
    setBusy(false);
  }

  function remove(i: number) {
    // 목록에서만 뺀다. 저장소 파일 정리는 저장 후 별도(1차는 남겨 둠)
    setImages((prev) => prev.filter((_, j) => j !== i));
  }

  function makeMain(i: number) {
    setImages((prev) => [prev[i], ...prev.filter((_, j) => j !== i)]);
  }

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={img.path} className="relative h-24 w-24 overflow-hidden rounded border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-gray-900 px-1 text-[10px] text-white">대표</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 text-[11px]">
              {i > 0 ? <button type="button" onClick={() => makeMain(i)} className="px-1">대표로</button> : <span />}
              <button type="button" onClick={() => remove(i)} className="px-1 text-red-700">빼기</button>
            </div>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded border border-dashed text-center text-xs text-gray-500">
            {busy ? "올리는 중…" : "사진 추가"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" disabled={busy} onChange={(e) => upload(e.target.files)} />
          </label>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">최대 {MAX_IMAGES}장, 한 장 5MB 이하(JPG·PNG·WEBP·GIF). 첫 사진이 대표 사진입니다.</p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
