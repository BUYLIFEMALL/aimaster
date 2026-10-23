"use client";

// 병합 B-4(작업실 → SEO 스튜디오): 이미지 비율·표현 방식·참고 사진. 대표·본문 이미지 생성 요청에 함께 보낸다.
// 참고 사진은 이 브라우저에서 긴 변 1,280px JPEG로 줄여 요청에만 실어 보내고 서버에 저장하지 않는다.
import { IMAGE_RATIOS, IMAGE_STYLES, MAX_IMAGE_REFS, type ImageRatio, type ImageStyle } from "@/lib/imageOptions";

export interface ImageRefInput { mimeType: string; data: string; url: string }

async function toRef(file: File): Promise<ImageRefInput | null> {
  if (!file.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { mimeType: "image/jpeg", data: url.split(",")[1] ?? "", url };
}

export function ImageOptionsPanel({ ratio, setRatio, style, setStyle, refs, setRefs, disabled }: {
  ratio: ImageRatio; setRatio: (v: ImageRatio) => void; style: ImageStyle; setStyle: (v: ImageStyle) => void;
  refs: ImageRefInput[]; setRefs: (v: ImageRefInput[]) => void; disabled?: boolean;
}) {
  const add = async (files: FileList | null) => {
    if (!files) return;
    const list = (await Promise.all([...files].slice(0, MAX_IMAGE_REFS - refs.length).map(toRef))).filter((x): x is ImageRefInput => Boolean(x?.data));
    setRefs([...refs, ...list].slice(0, MAX_IMAGE_REFS));
  };
  return (
    <div className="field">
      <label htmlFor="image-ratio">이미지 비율 · 표현 방식</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select id="image-ratio" aria-label="이미지 비율" value={ratio} disabled={disabled} onChange={(e) => setRatio(e.target.value as ImageRatio)}>
          {IMAGE_RATIOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select aria-label="이미지 표현 방식" value={style} disabled={disabled} onChange={(e) => setStyle(e.target.value as ImageStyle)}>
          {IMAGE_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <small>대표 이미지와 본문 이미지에 함께 적용됩니다. 기본값은 예전과 같은 16:9 사진 같은 편집 이미지입니다.</small>
      <div style={{ marginTop: 8 }}>
        <strong style={{ fontSize: 13 }}>참고 사진 (선택) · {refs.length}/{MAX_IMAGE_REFS}</strong>
        {refs.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{refs.map((r, i) => (
          <span key={i} style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.url} alt={`참고 사진 ${i + 1}`} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }} />
            <button type="button" className="secondary compact" disabled={disabled} aria-label={`참고 사진 ${i + 1} 빼기`} onClick={() => setRefs(refs.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, padding: "0 6px" }}>×</button>
          </span>
        ))}</div>}
        {refs.length < MAX_IMAGE_REFS && <label className="secondary compact" style={{ display: "inline-block", marginTop: 6, cursor: "pointer" }}>
          📷 참고 사진 첨부<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={disabled} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
        </label>}
        <small style={{ display: "block" }}>분위기·색감·구도만 참고하고 얼굴·글자·로고는 그대로 따라 그리지 않게 지시합니다. 사진은 저장하지 않고 이번 생성 요청에만 씁니다. 본인이 쓸 권리가 있는 사진만 올려 주세요(민감한 사진·개인정보 제외).</small>
      </div>
    </div>
  );
}
