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

  return (
    <div className="fe-wrap">
      <div className="card fe-intro">
        <div className="fe-intro-row">
          <span className="fe-badge">🆓 무료 · 내 PC 처리</span>
          <span className="fe-badge soft">사진이 서버로 올라가지 않음</span>
          <span className="fe-badge leaf">✅ 촬영 정보·위치 정보 자동 제거</span>
        </div>
        <p className="bp-intro">사진을 넣고(끌어 놓기·고르기·<b>Ctrl+V 붙여넣기</b>) 오른쪽에서 높이·워터마크를 정한 뒤 「결과 받기」를 누르세요. 여러 장이면 ZIP으로 받습니다.</p>
        {notice && <p className="notice" role="status">{notice}</p>}
      </div>

      <div className="bp-grid">
        {/* 사진 목록 */}
        <aside className="card fe-list">
          <header>
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
              <ul className="bp-scroll" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void addFiles(e.dataTransfer.files); }}>
                {items.map((it) => {
                  const o = outputSize(it.w, it.h, s);
                  return (
                    <li key={it.id} className={it.id === sel ? "on" : undefined}>
                      <button type="button" onClick={() => setSel(it.id)} className="bp-thumbbtn" title={it.name}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.thumb} alt="" />
                        <span>
                          <span className="bp-name">{it.name}</span>
                          <span className={o.tooWide ? "bp-size bad" : "bp-size"}>{it.w}×{it.h} → {o.totalW}×{o.totalH}{o.tooWide ? " (너무 넓음)" : ""}</span>
                        </span>
                      </button>
                      <button type="button" aria-label={`${it.name} 빼기`} onClick={() => remove(it.id)} className="bp-x"><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="bp-link" onClick={clearAll}>모두 빼기</button>
            </>
          )}
        </aside>

        {/* 미리보기 */}
        <section className="card">
          <div className="bp-head">
            <b>👀 미리보기 {cur ? `— ${cur.name}` : ""}</b>
            {cur && <span className="bp-hint">결과 {outputSize(cur.w, cur.h, s).totalW}×{outputSize(cur.w, cur.h, s).totalH}px</span>}
          </div>
          <div ref={previewRef} className="bp-preview" />
          {!cur && <p className="bp-hint">왼쪽에서 사진을 고르면 결과 모습이 여기에 보입니다.</p>}
        </section>

        {/* 설정 */}
        <section className="card bp-set">
          <div>
            <span className="bp-label">📏 세로 높이 맞춤(비율 유지)</span>
            <label className="bp-row" style={{ marginBottom: 6 }}>
              <input type="checkbox" checked={s.height == null} onChange={(e) => update({ height: e.target.checked ? null : DEFAULT_HEIGHT })} />원본 크기 그대로
            </label>
            {s.height != null && (
              <div className="bp-row">
                <input type="number" min={100} max={4096} value={s.height} onChange={(e) => update({ height: Number(e.target.value) })} className="bp-input short" aria-label="세로 높이(px)" />
                <span>px</span>
              </div>
            )}
            <p className="bp-hint">기본 860px(상세페이지 폭과 같음){tooWideCount ? ` · ⚠ 가로 4096px을 넘는 사진 ${tooWideCount}장은 받을 때 빠집니다` : ""}</p>
          </div>

          <div>
            <span className="bp-label">🔖 워터마크</span>
            <div className="bp-seg c3">
              {(["none", "text", "logo"] as const).map((k) => (
                <button key={k} type="button" onClick={() => update({ wmKind: k })} className={s.wmKind === k ? "on" : undefined}>
                  {k === "none" ? "없음" : k === "text" ? "문자" : "로고"}
                </button>
              ))}
            </div>
            {s.wmKind === "text" && (
              <div className="bp-stack">
                <input value={s.wmText} maxLength={60} placeholder="예: @내스토어" onChange={(e) => update({ wmText: e.target.value })} className="bp-input" aria-label="워터마크 문자" />
                <div className="bp-row">
                  <label className="bp-row">색 <input type="color" value={s.wmColor} onChange={(e) => update({ wmColor: e.target.value })} /></label>
                  <label className="bp-row"><input type="checkbox" checked={s.wmBold} onChange={(e) => update({ wmBold: e.target.checked })} />굵게</label>
                </div>
              </div>
            )}
            {s.wmKind === "logo" && (
              <div className="bp-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoUrl && <img src={logoUrl} alt="로고" className="bp-logo" />}
                <label className="button"><ImagePlus size={14} />{logoUrl ? "로고 바꾸기" : "로고 넣기(투명 PNG)"}<input type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = ""; }} /></label>
                {logoUrl && <button type="button" className="bp-link" style={{ marginTop: 0 }} onClick={clearLogo}>로고 지우기</button>}
              </div>
            )}
            {s.wmKind !== "none" && (
              <div className="bp-stack" style={{ marginTop: 12 }}>
                <div>
                  <span className="bp-hint">위치</span>
                  <div className="bp-anchor" role="radiogroup" aria-label="워터마크 위치">
                    {ANCHORS.map((a) => (
                      <button key={a} type="button" role="radio" aria-checked={s.wmAnchor === a} aria-label={ANCHOR_LABELS[a]} title={ANCHOR_LABELS[a]} onClick={() => update({ wmAnchor: a })}
                        className={s.wmAnchor === a ? "on" : undefined} />
                    ))}
                  </div>
                </div>
                <label className="bp-range">크기 {s.wmSizePct}% <input type="range" min={1} max={40} value={s.wmSizePct} onChange={(e) => update({ wmSizePct: Number(e.target.value) })} /></label>
                <label className="bp-range">농도 {s.wmOpacity}% <input type="range" min={0} max={100} value={s.wmOpacity} onChange={(e) => update({ wmOpacity: Number(e.target.value) })} /></label>
                <label className="bp-range">가장자리 여백 {s.wmMargin}px <input type="range" min={0} max={200} value={s.wmMargin} onChange={(e) => update({ wmMargin: Number(e.target.value) })} /></label>
              </div>
            )}
          </div>

          <div>
            <span className="bp-label">🖼 테두리</span>
            <div className="bp-row">
              <input type="number" min={0} max={50} value={s.border} onChange={(e) => update({ border: Number(e.target.value) })} className="bp-input short" aria-label="테두리 두께(px)" />px
              <input type="color" value={s.borderColor} onChange={(e) => update({ borderColor: e.target.value })} aria-label="테두리 색" />
            </div>
          </div>

          <div>
            <span className="bp-label">💾 저장</span>
            <div className="bp-seg c2">
              {(["jpg", "png"] as const).map((f) => (
                <button key={f} type="button" onClick={() => update({ format: f })} className={s.format === f ? "on" : undefined}>{f.toUpperCase()}</button>
              ))}
            </div>
            {s.format === "jpg" && <label className="bp-range">화질 {s.quality} <input type="range" min={60} max={100} value={s.quality} onChange={(e) => update({ quality: Number(e.target.value) })} /></label>}
            <label className="bp-range" style={{ marginTop: 8 }}>파일 이름 앞붙임(비우면 원래 이름)
              <input value={s.prefix} maxLength={40} placeholder="예: 상품A → 상품A_001.jpg" onChange={(e) => update({ prefix: e.target.value })} className="bp-input" style={{ marginTop: 4 }} />
            </label>
          </div>

          <button type="button" className="primary bp-go" disabled={!items.length || !!busy} onClick={() => void download()}>
            <Download size={15} />{busy ?? (items.length > 1 ? `결과 받기 (ZIP, ${items.length}장)` : "결과 받기")}
          </button>
        </section>
      </div>
    </div>
  );
}
