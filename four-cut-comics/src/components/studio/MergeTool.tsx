"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Download, Trash2, Upload } from "lucide-react";
import { downloadUrl, fileToDataUrl, stackImages } from "@/lib/comic/draw";
import { IMAGE_READ_FAIL_MESSAGE, splitReadableImages } from "@/lib/imageFileCheck";

export interface MergeItem { name: string; url: string }

const MAX_ITEMS = 12;

/** 만화 합치기: 이미지 여러 장을 순서대로 세로로 이어 한 장의 PNG로 저장한다(브라우저 안에서만 처리, 서버 전송 없음). */
export function MergeTool({ seed = [], title = "만화 합치기" }: { seed?: MergeItem[]; title?: string }) {
  const [items, setItems] = useState<MergeItem[]>(seed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_ITEMS - items.length;
    if (room <= 0) { setError(`최대 ${MAX_ITEMS}장까지 합칠 수 있습니다.`); return; }
    try {
      const typed = [...files].filter((f) => /^image\/(png|jpeg|webp)$/.test(f.type)).slice(0, room);
      if (typed.length < files.length) setError(`PNG·JPG·WEBP 이미지만, 최대 ${MAX_ITEMS}장까지 추가했습니다.`);
      // 깨진 사진은 목록에 넣지 않는다(공용 image-file-check — 브라우저 안에서 풀어 보기)
      const { readable: picked, failed } = await splitReadableImages(typed);
      if (failed.length) setError(`${IMAGE_READ_FAIL_MESSAGE} (${failed.map((f) => f.name).join(", ")})`);
      const next = await Promise.all(picked.map(async (f) => ({ name: f.name, url: await fileToDataUrl(f) })));
      setItems((cur) => [...cur, ...next]);
    } catch (e) { setError(e instanceof Error ? e.message : "이미지를 읽지 못했습니다."); }
  }
  function move(i: number, d: -1 | 1) {
    setItems((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  async function save() {
    setError(""); setBusy(true);
    try { downloadUrl(await stackImages(items.map((x) => x.url)), "4컷만화-합치기.png"); }
    catch (e) { setError(e instanceof Error ? e.message : "합치지 못했습니다."); }
    finally { setBusy(false); }
  }

  return (
    <section className="cc-merge" aria-label={title}>
      <b className="cc-label">{title}</b>
      <small className="muted">이미지를 위에서 아래 순서로 이어 한 장으로 저장합니다(최대 {MAX_ITEMS}장, 내 컴퓨터 안에서만 처리).</small>
      {items.length > 0 && (
        <ol className="cc-merge-list">
          {items.map((it, i) => (
            <li key={`${i}-${it.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" />
              <span>{i + 1}. {it.name}</span>
              <div className="actions">
                <button type="button" aria-label={`${it.name} 위로`} onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={14} /></button>
                <button type="button" aria-label={`${it.name} 아래로`} onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown size={14} /></button>
                <button type="button" aria-label={`${it.name} 빼기`} onClick={() => setItems((cur) => cur.filter((_, k) => k !== i))}><Trash2 size={14} /></button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {error && <small className="error" role="alert">{error}</small>}
      <div className="actions">
        <label className="cc-file"><Upload size={14} />이미지 추가
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        </label>
        <button type="button" className="primary" onClick={save} disabled={busy || items.length < 2}><Download size={14} />{busy ? "합치는 중..." : "세로로 합쳐 저장"}</button>
      </div>
    </section>
  );
}
