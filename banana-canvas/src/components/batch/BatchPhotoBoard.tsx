"use client";
// E4(2026-10-26) 「🖼 사진 일괄 손질」 — 여러 장 높이 맞춤·워터마크·테두리·사진 정보 지우기 → 한 장 파일 또는 ZIP.
// 모두 회원 브라우저 안에서 처리(서버 업로드·저장·키·비용 없음). 계산은 lib/batch/layout.ts, 그리기는 lib/batch/render.ts.
import { useCallback, useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Download, ImagePlus, Trash2 } from "lucide-react";
import {
  ANCHORS, ANCHOR_LABELS, BATCH_MAX_BYTES, BATCH_MAX_ITEMS, DEFAULT_HEIGHT, DEFAULT_SETTINGS, normalizeSettings, outputNames, outputSize, type BatchSettings,
} from "@/lib/batch/layout";
import { canvasToBlob, readBitmap, renderToCanvas } from "@/lib/batch/render";

const STORE_KEY = "bnc-batch-settings-v1";
const LOGO_KEY = "bnc-batch-logo-v1";
const LOGO_MAX_BYTES = 1.5 * 1024 * 1024;

interface Item { id: string; file: File; name: string; w: number; h: number; thumb: string }
const uid = () => Math.random().toString(36).slice(2, 10);

function load<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 공간이 막혀도 작업은 계속 */ }
}
function saveFile(blob: Blob, name: string) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function BatchPhotoBoard() {
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [s, setS] = useState<BatchSettings>(DEFAULT_SETTINGS);
  const [logo, setLogo] = useState<ImageBitmap | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Item[]>([]); itemsRef.current = items;

  // 설정·로고는 이 브라우저에만 기억
  useEffect(() => {
    setS(normalizeSettings(load<Partial<BatchSettings>>(STORE_KEY)));
    const saved = load<string>(LOGO_KEY);
    if (saved) void fetch(saved).then((r) => r.blob()).then((b) => readBitmap(b)).then((bm) => { setLogo(bm); setLogoUrl(saved); }).catch(() => undefined);
  }, []);
  const update = (patch: Partial<BatchSettings>) => setS((prev) => { const next = normalizeSettings({ ...prev, ...patch }); save(STORE_KEY, next); return next; });

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const room = BATCH_MAX_ITEMS - itemsRef.current.length;
    const skipped: string[] = [];
    const added: Item[] = [];
    for (const f of files.slice(0, Math.max(0, room))) {
      if (f.size > BATCH_MAX_BYTES) { skipped.push(`${f.name}(25MB 초과)`); continue; }
      try {
        const bm = await readBitmap(f);
        added.push({ id: uid(), file: f, name: f.name || "붙여넣은사진.png", w: bm.width, h: bm.height, thumb: URL.createObjectURL(f) });
        bm.close();
      } catch { skipped.push(`${f.name}(열 수 없는 사진)`); }
    }
    if (files.length > room) skipped.push(`${files.length - Math.max(0, room)}장(최대 ${BATCH_MAX_ITEMS}장)`);
    if (added.length) { setItems((xs) => [...xs, ...added]); setSel((cur) => cur ?? added[0].id); }
    setNotice(skipped.length ? `넣지 못한 사진: ${skipped.join(", ")}` : null);
  }, []);

  // Ctrl+V 붙여넣기
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? []).filter((i) => i.type.startsWith("image/")).map((i) => i.getAsFile()).filter((f): f is File => !!f);
      if (files.length) { e.preventDefault(); void addFiles(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  useEffect(() => () => { itemsRef.current.forEach((it) => URL.revokeObjectURL(it.thumb)); }, []);

  // 미리보기(고른 사진을 결과 그대로)
  const cur = items.find((x) => x.id === sel) ?? null;
  useEffect(() => {
    const box = previewRef.current;
    if (!box) return;
    if (!cur) { box.replaceChildren(); return; }
    let alive = true;
    void readBitmap(cur.file).then((bm) => {
      if (!alive) { bm.close(); return; }
      try {
        const c = renderToCanvas({ bitmap: bm, settings: s, logo });
        c.style.width = "100%"; c.style.height = "auto"; c.style.display = "block";
        box.replaceChildren(c);
      } catch (e) { setNotice(e instanceof Error ? e.message : "미리보기를 그리지 못했습니다."); }
      bm.close();
    });
    return () => { alive = false; };
  }, [cur, s, logo]);

  async function pickLogo(f: File | undefined) {
    if (!f) return;
    if (f.size > LOGO_MAX_BYTES) { setNotice("로고는 1.5MB 이하 PNG로 넣어 주세요."); return; }
    const url = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(f); });
    setLogo(await readBitmap(f)); setLogoUrl(url); save(LOGO_KEY, url); update({ wmKind: "logo" });
  }
  function clearLogo() { setLogo(null); setLogoUrl(null); try { localStorage.removeItem(LOGO_KEY); } catch { /* 무시 */ } }

  function remove(id: string) {
    const it = items.find((x) => x.id === id); if (it) URL.revokeObjectURL(it.thumb);
    setItems((xs) => xs.filter((x) => x.id !== id));
    if (sel === id) setSel(null);
  }
  function clearAll() { items.forEach((it) => URL.revokeObjectURL(it.thumb)); setItems([]); setSel(null); }

  async function download() {
    const targets = items.filter((it) => !outputSize(it.w, it.h, s).tooWide);
    if (!targets.length) { setNotice("받을 수 있는 사진이 없습니다(가로 4096px을 넘는 사진은 높이를 줄여 주세요)."); return; }
    const names = outputNames(targets.map((t) => t.name), s.prefix, s.format);
    setNotice(null);
    try {
      if (targets.length === 1) {
        setBusy("만드는 중…");
        const bm = await readBitmap(targets[0].file);
        const blob = await canvasToBlob(renderToCanvas({ bitmap: bm, settings: s, logo }), s); bm.close();
        saveFile(blob, names[0]);
      } else {
        const zip = new JSZip();
        for (let i = 0; i < targets.length; i++) {
          setBusy(`만드는 중 ${i + 1}/${targets.length}`);
          const bm = await readBitmap(targets[i].file);
          zip.file(names[i], await canvasToBlob(renderToCanvas({ bitmap: bm, settings: s, logo }), s)); bm.close();
        }
        setBusy("ZIP으로 묶는 중…");
        saveFile(await zip.generateAsync({ type: "blob" }), `사진손질_${targets.length}장.zip`);
      }
      const skipped = items.length - targets.length;
      setNotice(`✅ ${targets.length}장을 받았습니다. 촬영 정보·위치 정보는 결과 파일에 들어가지 않았습니다.${skipped ? ` (너무 넓어 빠진 사진 ${skipped}장)` : ""}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "만들지 못했습니다. 사진 수를 줄여 다시 시도해 주세요.");
    } finally { setBusy(null); }
  }

  const tooWideCount = items.filter((it) => outputSize(it.w, it.h, s).tooWide).length;
  const lbl = "block text-[12px] font-bold text-stone-700 mb-1";
  const inp = "w-full rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-[13px]";

  return (
    <div className="fe-wrap">
      <div className="card fe-intro">
        <div className="fe-intro-row">
          <span className="fe-badge">🆓 무료 · 내 PC 처리</span>
          <span className="fe-badge soft">사진이 서버로 올라가지 않음</span>
          <span className="fe-badge leaf">✅ 촬영 정보·위치 정보 자동 제거</span>
        </div>
        <p className="text-[13px] text-stone-600">사진을 넣고(끌어 놓기·고르기·<b>Ctrl+V 붙여넣기</b>) 오른쪽에서 높이·워터마크를 정한 뒤 「결과 받기」를 누르세요. 여러 장이면 ZIP으로 받습니다.</p>
        {notice && <p className="notice mt-2" role="status">{notice}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* 사진 목록 */}
        <aside className="card fe-list min-w-0">
          <header className="flex items-center justify-between gap-2">
            <b>사진 {items.length}/{BATCH_MAX_ITEMS}</b>
            <label className="button"><ImagePlus size={14} />추가<input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} /></label>
          </header>
          {items.length === 0 ? (
            <label className="fe-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
              <ImagePlus size={28} />
              <b>사진을 끌어 놓거나 눌러서 고르세요</b>
              <small>Ctrl+V로 붙여넣기 · 최대 {BATCH_MAX_ITEMS}장 · 한 장 25MB</small>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          ) : (
            <>
              <ul className="mt-2 flex max-h-[520px] flex-col gap-1.5 overflow-y-auto" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
                {items.map((it) => {
                  const o = outputSize(it.w, it.h, s);
                  return (
                    <li key={it.id} className={`flex items-center gap-2 rounded-lg border p-1.5 ${it.id === sel ? "border-indigo-400 bg-indigo-50" : "border-stone-200"}`}>
                      <button type="button" onClick={() => setSel(it.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" title={it.name}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.thumb} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-semibold">{it.name}</span>
                          <span className={`block text-[11px] ${o.tooWide ? "font-bold text-rose-600" : "text-stone-500"}`}>{it.w}×{it.h} → {o.totalW}×{o.totalH}{o.tooWide ? " (너무 넓음)" : ""}</span>
                        </span>
                      </button>
                      <button type="button" aria-label={`${it.name} 빼기`} onClick={() => remove(it.id)} className="shrink-0 rounded p-1 text-stone-500 hover:bg-stone-100"><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="mt-2 text-[12px] text-stone-500 underline" onClick={clearAll}>모두 빼기</button>
            </>
          )}
        </aside>

        {/* 미리보기 */}
        <section className="card min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <b className="text-[14px]">👀 미리보기 {cur ? `— ${cur.name}` : ""}</b>
            {cur && <span className="text-[12px] text-stone-500">결과 {outputSize(cur.w, cur.h, s).totalW}×{outputSize(cur.w, cur.h, s).totalH}px</span>}
          </div>
          <div ref={previewRef} className="overflow-hidden rounded-lg border border-dashed border-stone-300 bg-stone-50" style={{ minHeight: 220 }} />
          {!cur && <p className="mt-2 text-[12px] text-stone-500">왼쪽에서 사진을 고르면 결과 모습이 여기에 보입니다.</p>}
        </section>

        {/* 설정 */}
        <section className="card min-w-0 space-y-4">
          <div>
            <span className={lbl}>📏 세로 높이 맞춤(비율 유지)</span>
            <label className="mb-1.5 flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={s.height == null} onChange={(e) => update({ height: e.target.checked ? null : DEFAULT_HEIGHT })} />원본 크기 그대로
            </label>
            {s.height != null && (
              <div className="flex items-center gap-2">
                <input type="number" min={100} max={4096} value={s.height} onChange={(e) => update({ height: Number(e.target.value) })} className={inp} aria-label="세로 높이(px)" />
                <span className="text-[12px] text-stone-500">px</span>
              </div>
            )}
            <p className="mt-1 text-[11px] text-stone-500">기본 860px(상세페이지 폭과 같음){tooWideCount ? ` · ⚠ 가로 4096px을 넘는 사진 ${tooWideCount}장은 받을 때 빠집니다` : ""}</p>
          </div>

          <div>
            <span className={lbl}>🔖 워터마크</span>
            <div className="mb-2 grid grid-cols-3 gap-1">
              {(["none", "text", "logo"] as const).map((k) => (
                <button key={k} type="button" onClick={() => update({ wmKind: k })} className={`rounded-lg border px-2 py-1.5 text-[12px] font-bold ${s.wmKind === k ? "border-indigo-500 bg-indigo-600 text-white" : "border-stone-300 bg-white"}`}>
                  {k === "none" ? "없음" : k === "text" ? "문자" : "로고"}
                </button>
              ))}
            </div>
            {s.wmKind === "text" && (
              <div className="space-y-2">
                <input value={s.wmText} maxLength={60} placeholder="예: @내스토어" onChange={(e) => update({ wmText: e.target.value })} className={inp} aria-label="워터마크 문자" />
                <div className="flex items-center gap-3 text-[12px]">
                  <label className="flex items-center gap-1">색 <input type="color" value={s.wmColor} onChange={(e) => update({ wmColor: e.target.value })} /></label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={s.wmBold} onChange={(e) => update({ wmBold: e.target.checked })} />굵게</label>
                </div>
              </div>
            )}
            {s.wmKind === "logo" && (
              <div className="flex flex-wrap items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoUrl && <img src={logoUrl} alt="로고" className="h-10 max-w-[120px] rounded border border-stone-200 bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:12px_12px] object-contain" />}
                <label className="button"><ImagePlus size={14} />{logoUrl ? "로고 바꾸기" : "로고 넣기(투명 PNG)"}<input type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = ""; }} /></label>
                {logoUrl && <button type="button" className="text-[12px] text-stone-500 underline" onClick={clearLogo}>로고 지우기</button>}
              </div>
            )}
            {s.wmKind !== "none" && (
              <div className="mt-3 space-y-2">
                <div>
                  <span className="text-[12px] text-stone-600">위치</span>
                  <div className="mt-1 grid w-[120px] grid-cols-3 gap-1" role="radiogroup" aria-label="워터마크 위치">
                    {ANCHORS.map((a) => (
                      <button key={a} type="button" role="radio" aria-checked={s.wmAnchor === a} aria-label={ANCHOR_LABELS[a]} title={ANCHOR_LABELS[a]} onClick={() => update({ wmAnchor: a })}
                        className={`h-8 rounded border ${s.wmAnchor === a ? "border-indigo-600 bg-indigo-500" : "border-stone-300 bg-white hover:bg-stone-100"}`} />
                    ))}
                  </div>
                </div>
                <label className="block text-[12px]">크기 {s.wmSizePct}% <input type="range" min={1} max={40} value={s.wmSizePct} onChange={(e) => update({ wmSizePct: Number(e.target.value) })} className="w-full" /></label>
                <label className="block text-[12px]">농도 {s.wmOpacity}% <input type="range" min={0} max={100} value={s.wmOpacity} onChange={(e) => update({ wmOpacity: Number(e.target.value) })} className="w-full" /></label>
                <label className="block text-[12px]">가장자리 여백 {s.wmMargin}px <input type="range" min={0} max={200} value={s.wmMargin} onChange={(e) => update({ wmMargin: Number(e.target.value) })} className="w-full" /></label>
              </div>
            )}
          </div>

          <div>
            <span className={lbl}>🖼 테두리</span>
            <div className="flex items-center gap-2 text-[12px]">
              <input type="number" min={0} max={50} value={s.border} onChange={(e) => update({ border: Number(e.target.value) })} className={`${inp} w-20`} aria-label="테두리 두께(px)" />px
              <input type="color" value={s.borderColor} onChange={(e) => update({ borderColor: e.target.value })} aria-label="테두리 색" />
            </div>
          </div>

          <div>
            <span className={lbl}>💾 저장</span>
            <div className="mb-2 grid grid-cols-2 gap-1">
              {(["jpg", "png"] as const).map((f) => (
                <button key={f} type="button" onClick={() => update({ format: f })} className={`rounded-lg border px-2 py-1.5 text-[12px] font-bold ${s.format === f ? "border-indigo-500 bg-indigo-600 text-white" : "border-stone-300 bg-white"}`}>{f.toUpperCase()}</button>
              ))}
            </div>
            {s.format === "jpg" && <label className="block text-[12px]">화질 {s.quality} <input type="range" min={60} max={100} value={s.quality} onChange={(e) => update({ quality: Number(e.target.value) })} className="w-full" /></label>}
            <label className="mt-2 block text-[12px]">파일 이름 앞붙임(비우면 원래 이름)
              <input value={s.prefix} maxLength={40} placeholder="예: 상품A → 상품A_001.jpg" onChange={(e) => update({ prefix: e.target.value })} className={`${inp} mt-1`} />
            </label>
          </div>

          <button type="button" className="primary w-full justify-center" disabled={!items.length || !!busy} onClick={() => void download()}>
            <Download size={15} />{busy ?? (items.length > 1 ? `결과 받기 (ZIP, ${items.length}장)` : "결과 받기")}
          </button>
        </section>
      </div>
    </div>
  );
}
