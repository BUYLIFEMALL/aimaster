"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download, FlaskConical, ImagePlus, Link as LinkIcon, Loader2, RefreshCw, Redo2, Settings as SettingsIcon, SplitSquareHorizontal,
  Trash2, Undo2, Upload, Wand2, X,
} from "lucide-react";
import { api, ApiError, NeedKeyError } from "@/lib/look/api";
import { bestAspectRatio } from "@/lib/look/aspect";
import { convertForDownload, fromDataUrl, imageSize, prepareImage, shrinkImage, toDataUrl, ImageInputError } from "@/lib/look/clientImages";
import { canUndo, emptyHistory, pushResult, redo as redoH, undo as undoH, type History } from "@/lib/look/history";
import { strings } from "@/lib/look/i18n";
import {
  deleteLook, deleteWardrobeItem, loadLooks, loadSettings, loadWardrobe, MAX_WARDROBE, openStore, saveLook, saveSettings, saveWardrobeItem,
  type LookStore, type SavedLook,
} from "@/lib/look/storage";
import { acceptsPortraitImport } from "@/lib/look/importSource";
import {
  DEFAULT_SETTINGS, type AISuggestion, type BeautyAdvice, type BeautyType, type ClothingItem, type ImageState, type SuggestionKind, type UserSettings,
} from "@/lib/look/types";

interface Suggestion { id: string; name: string; pieces: ClothingItem[] }
interface Busy { styling: boolean; recommending: boolean; naming: boolean; beautyAnalyze: boolean; beautyApply: boolean }
const NOT_BUSY: Busy = { styling: false, recommending: false, naming: false, beautyAnalyze: false, beautyApply: false };

const uid = () => `i-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Studio({ userId }: { userId: string }) {
  const [db, setDb] = useState<LookStore | null>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [portrait, setPortrait] = useState<(ImageState & { width: number; height: number }) | null>(null);
  const [hist, setHist] = useState<History<ImageState>>(emptyHistory());
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [looks, setLooks] = useState<SavedLook[]>([]);
  const [outfits, setOutfits] = useState<Suggestion[]>([]);
  const [accessories, setAccessories] = useState<Suggestion[]>([]);
  const [tab, setTab] = useState<SuggestionKind>("outfit");
  const [situation, setSituation] = useState("");
  const [activeSituation, setActiveSituation] = useState("");
  const [busy, setBusy] = useState<Busy>(NOT_BUSY);
  const [error, setError] = useState<string | null>(null);
  // AI 인물사진에서 넘어온 사진(v1.12): 사진 사용 동의 전이면 기다렸다가 동의하는 순간 넣는다
  const [pendingImport, setPendingImport] = useState<Blob | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);
  const [beauty, setBeauty] = useState<BeautyAdvice | null>(null);
  const [beautyOpen, setBeautyOpen] = useState(false);
  const [beautyTab, setBeautyTab] = useState<"makeup" | "hair">("makeup");
  const [applied, setApplied] = useState<"makeup" | "hair" | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [compare, setCompare] = useState(false);
  const [slider, setSlider] = useState(50);
  const [urlInput, setUrlInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [ready, setReady] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const t = strings(settings.lang);
  const edited = hist.present;
  const shown: ImageState | null = edited ?? portrait;
  const live = useRef({ settings, portrait, edited, outfits, accessories, activeSituation });
  live.current = { settings, portrait, edited, outfits, accessories, activeSituation };

  // ---- 저장소 ----
  useEffect(() => {
    let cancelled = false;
    let opened: LookStore | null = null;
    (async () => {
      try {
        const store = await openStore(userId);
        opened = store;
        const [s, w, l] = await Promise.all([loadSettings(store), loadWardrobe(store), loadLooks(store)]);
        if (cancelled) { store.close(); return; }
        setDb(store); setSettings(s); setWardrobe(w); setLooks(l);
      } catch {
        if (!cancelled) setError("이 브라우저에서는 옷장과 설정을 저장할 수 없습니다. 이번 접속 동안만 유지됩니다.");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; opened?.close(); };
  }, [userId]);

  const patchSettings = useCallback((p: Partial<UserSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...p };
      if (db) void saveSettings(db, next).catch(() => undefined);
      return next;
    });
  }, [db]);

  // ---- 공통 오류 처리 ----
  const handleFail = useCallback((e: unknown) => {
    if (e instanceof NeedKeyError) { setNeedKey(true); return; }
    if (e instanceof DOMException && e.name === "AbortError") return;
    setError(e instanceof ApiError || e instanceof ImageInputError || e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
  }, []);

  const setBusyFlag = (p: Partial<Busy>) => setBusy((b) => ({ ...b, ...p }));

  // ---- 사진 입력 ----
  const loadPortrait = useCallback(async (blob: Blob) => {
    if (!live.current.settings.consent) { setError(strings(live.current.settings.lang).consentNeed); return; }
    setError(null);
    try {
      const img = await prepareImage(blob, 1600);
      abortRef.current?.abort();
      setPortrait(img);
      setHist(emptyHistory());
      setOutfits([]); setAccessories([]); setBeauty(null); setCompare(false); setApplied(null);
    } catch (e) { handleFail(e); }
  }, [handleFail]);

  // ---- AI 인물사진 「이 사진으로 코디」(?src=서명 주소) 받기 — v1.12 ----
  useEffect(() => {
    if (!ready) return;
    const src = new URLSearchParams(window.location.search).get("src");
    if (!src) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (!acceptsPortraitImport(src, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      setImportNote("가져올 수 없는 사진 주소입니다. AI 인물사진 서버 보관함의 「이 사진으로 코디」로 다시 열어 주세요.");
      return;
    }
    (async () => {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        if (!res.ok || !blob.type.startsWith("image/")) throw new Error();
        setPendingImport(blob);
      } catch {
        setImportNote("사진을 불러오지 못했습니다(주소는 1시간 뒤 만료됩니다). AI 인물사진에서 다시 보내 주세요.");
      }
    })();
  }, [ready]);

  useEffect(() => {
    if (!pendingImport) return;
    if (!settings.consent) {
      setImportNote("AI 인물사진에서 보낸 사진이 준비됐습니다. 아래 「사진 사용 동의」에 체크하면 바로 들어갑니다.");
      return;
    }
    const blob = pendingImport;
    setPendingImport(null);
    void loadPortrait(blob).then(() => setImportNote("AI 인물사진에서 보낸 사진을 넣었습니다. 상황을 고르고 코디를 추천받으세요."));
  }, [pendingImport, settings.consent, loadPortrait]);

  // ---- 옷장 ----
  const addToWardrobe = useCallback(async (images: { img: ImageState; fallbackName: string }[]) => {
    if (images.length === 0) return;
    setBusyFlag({ naming: true });
    try {
      for (const { img, fallbackName } of images) {
        let name = fallbackName;
        try { name = (await api.itemName(img)) || fallbackName; }
        catch (e) { if (e instanceof NeedKeyError) { setNeedKey(true); } }
        const item: ClothingItem = { id: uid(), name, src: toDataUrl(img), category: "mine", source: "user" };
        setWardrobe((w) => [...w, item].slice(-MAX_WARDROBE));
        if (db) await saveWardrobeItem(db, item).catch(() => undefined);
      }
    } finally { setBusyFlag({ naming: false }); }
  }, [db]);

  const addFiles = useCallback(async (files: File[]) => {
    const imgs: { img: ImageState; fallbackName: string }[] = [];
    for (const f of files.filter((x) => x.type.startsWith("image/"))) {
      try { const p = await prepareImage(f, 900, 0.88); imgs.push({ img: { data: p.data, mimeType: p.mimeType }, fallbackName: f.name.replace(/\.[^.]+$/, "") || "아이템" }); }
      catch (e) { handleFail(e); }
    }
    await addToWardrobe(imgs);
  }, [addToWardrobe, handleFail]);

  const addByUrl = useCallback(async (url: string) => {
    const u = url.trim();
    if (!u) return;
    setError(null);
    try {
      const fetched = await api.fetchImage(u);
      const blob = await (await fetch(toDataUrl(fetched))).blob();
      const p = await prepareImage(blob, 900, 0.88);
      await addToWardrobe([{ img: { data: p.data, mimeType: p.mimeType }, fallbackName: "웹 아이템" }]);
      setUrlInput("");
    } catch (e) { handleFail(e); }
  }, [addToWardrobe, handleFail]);

  const removeItem = useCallback(async (id: string) => {
    setWardrobe((w) => w.filter((x) => x.id !== id));
    if (db) await deleteWardrobeItem(db, id).catch(() => undefined);
  }, [db]);

  // ---- AI 추천 ----
  const generatePieceImages = useCallback(async (kind: SuggestionKind, list: Suggestion[], signal: AbortSignal) => {
    const set = kind === "outfit" ? setOutfits : setAccessories;
    const queue = list.flatMap((s) => s.pieces.map((p) => p));
    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length && !signal.aborted) {
        const piece = queue[cursor++];
        let attempt = 0;
        for (;;) {
          try {
            const img = await shrinkImage(await api.itemImage(piece.prompt ?? piece.name, signal), 900, 0.88);
            set((cur) => cur.map((s) => ({ ...s, pieces: s.pieces.map((p) => (p.id === piece.id ? { ...p, src: toDataUrl(img) } : p)) })));
            break;
          } catch (e) {
            if (signal.aborted) return;
            if (e instanceof NeedKeyError) { setNeedKey(true); return; }
            attempt += 1;
            const retryable = !(e instanceof ApiError) || e.status === 429 || e.status >= 500 || e.status === 0;
            if (attempt < 3 && retryable) { await sleep(1500 * attempt); continue; }
            set((cur) => cur.map((s) => ({ ...s, pieces: s.pieces.map((p) => (p.id === piece.id ? { ...p, src: "error" } : p)) })));
            break;
          }
        }
      }
    };
    await Promise.all([worker(), worker()]); // 동시 2개
  }, []);

  const recommend = useCallback(async (kind: SuggestionKind) => {
    const { portrait: p, settings: s } = live.current;
    const text = situation.trim();
    if (!p) { setError(strings(s.lang).needPhotoFirst); return; }
    if (!text) return;
    setError(null);
    setActiveSituation(text);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusyFlag({ recommending: true });
    (kind === "outfit" ? setOutfits : setAccessories)([]);
    try {
      const suggestions: AISuggestion[] = await api.recommend({ data: p.data, mimeType: p.mimeType }, text, kind, s.model, ctrl.signal);
      const list: Suggestion[] = suggestions.map((sg) => ({
        id: uid(),
        name: sg.name,
        pieces: sg.pieces.map((pc) => ({
          id: uid(), name: pc.name, src: "loading", category: kind, source: "ai", prompt: pc.imagePrompt, situation: text,
        })),
      }));
      (kind === "outfit" ? setOutfits : setAccessories)(list);
      await generatePieceImages(kind, list, ctrl.signal);
    } catch (e) { handleFail(e); }
    finally { setBusyFlag({ recommending: false }); }
  }, [situation, generatePieceImages, handleFail]);

  const regeneratePiece = useCallback(async (kind: SuggestionKind, item: ClothingItem) => {
    const set = kind === "outfit" ? setOutfits : setAccessories;
    set((cur) => cur.map((s) => ({ ...s, pieces: s.pieces.map((p) => (p.id === item.id ? { ...p, src: "loading" } : p)) })));
    try {
      const img = await shrinkImage(await api.itemImage(item.prompt ?? item.name), 900, 0.88);
      set((cur) => cur.map((s) => ({ ...s, pieces: s.pieces.map((p) => (p.id === item.id ? { ...p, src: toDataUrl(img) } : p)) })));
    } catch (e) {
      set((cur) => cur.map((s) => ({ ...s, pieces: s.pieces.map((p) => (p.id === item.id ? { ...p, src: "error" } : p)) })));
      handleFail(e);
    }
  }, [handleFail]);

  const cancelGeneration = () => { abortRef.current?.abort(); setBusyFlag({ recommending: false }); };

  // ---- 가상 피팅 ----
  const tryOn = useCallback(async (item: ClothingItem) => {
    const { portrait: p, edited: e, settings: s } = live.current;
    if (!p) { setError(strings(s.lang).needPhotoFirst); return; }
    const itemImg = fromDataUrl(item.src);
    if (!itemImg) return;
    const base: ImageState = s.editMode === "add" ? (e ?? p) : p;
    setError(null);
    setBusyFlag({ styling: true });
    try {
      const size = await imageSize(base);
      const raw = await api.tryOn({
        base: { data: base.data, mimeType: base.mimeType },
        item: itemImg,
        aspectRatio: bestAspectRatio(size.width, size.height),
        background: s.background,
        situation: item.situation || live.current.activeSituation || undefined,
        model: s.model,
      });
      const img = await shrinkImage(raw, 1600, 0.92);
      setHist((h) => pushResult(h, img));
      setCompare(false);
    } catch (err) { handleFail(err); }
    finally { setBusyFlag({ styling: false }); }
  }, [handleFail]);

  // ---- 뷰티 ----
  const openBeauty = useCallback(async () => {
    const { portrait: p, edited: e, settings: s } = live.current;
    const current = e ?? p;
    if (!current) { setError(strings(s.lang).needPhotoFirst); return; }
    setError(null);
    setBusyFlag({ beautyAnalyze: true });
    try {
      const advice = await api.beautyAdvice({ data: current.data, mimeType: current.mimeType }, s.model, s.lang);
      setBeauty(advice);
      setApplied(null);
      setBeautyOpen(true);
      for (const key of ["makeup", "hairstyle"] as const) {
        api.itemImage(advice[key].imagePrompt).then((raw) => shrinkImage(raw, 700, 0.85)).then((img) => {
          setBeauty((b) => (b ? { ...b, [key]: { ...b[key], generatedImage: toDataUrl(img) } } : b));
        }).catch(() => undefined);
      }
    } catch (err) { handleFail(err); }
    finally { setBusyFlag({ beautyAnalyze: false }); }
  }, [handleFail]);

  const applyBeauty = useCallback(async (type: BeautyType) => {
    const { portrait: p, edited: e, settings: s } = live.current;
    const base = e ?? p;
    if (!base || !beauty) return;
    const suggestion = type === "makeup" ? beauty.makeup : beauty.hairstyle;
    setBusyFlag({ beautyApply: true });
    try {
      const size = await imageSize(base);
      const raw = await api.beautyApply({
        image: { data: base.data, mimeType: base.mimeType },
        type, description: suggestion.description, aspectRatio: bestAspectRatio(size.width, size.height), model: s.model,
      });
      const img = await shrinkImage(raw, 1600, 0.92);
      setHist((h) => pushResult(h, img));
      setApplied(type);
    } catch (err) { handleFail(err); }
    finally { setBusyFlag({ beautyApply: false }); }
  }, [beauty, handleFail]);

  // ---- 저장·초기화 ----
  const download = useCallback(async () => {
    if (!shown) return;
    try {
      const blob = await convertForDownload(shown, format);
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `fashion-style-${Date.now()}.${format === "png" ? "png" : "jpg"}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (db && edited) {
        const small = await prepareImage(await (await fetch(toDataUrl(edited))).blob(), 1000, 0.85).catch(() => null);
        if (small) {
          const look: SavedLook = { id: uid(), createdAt: Date.now(), image: { data: small.data, mimeType: small.mimeType } };
          await saveLook(db, look).catch(() => undefined);
          setLooks(await loadLooks(db));
        }
      }
    } catch { setError("이미지를 저장하지 못했습니다. 다시 시도해 주세요."); }
  }, [shown, format, db, edited]);

  const reset = () => {
    abortRef.current?.abort();
    setPortrait(null); setHist(emptyHistory()); setOutfits([]); setAccessories([]); setBeauty(null);
    setError(null); setCompare(false); setActiveSituation(""); setApplied(null); setBusy(NOT_BUSY);
  };

  // ---- 붙여넣기 ----
  useEffect(() => {
    const onPaste = async (ev: ClipboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      const files = Array.from(ev.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      ev.preventDefault();
      if (!live.current.portrait) await loadPortrait(files[0]);
      else await addFiles(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [loadPortrait, addFiles]);

  // ---- 끌어다 놓기 ----
  const onCanvasDrop = async (ev: React.DragEvent) => {
    ev.preventDefault();
    setDragOver(false);
    const json = ev.dataTransfer.getData("application/x-look-item");
    if (json && portrait) {
      try { await tryOn(JSON.parse(json) as ClothingItem); } catch { /* 무시 */ }
      return;
    }
    const file = Array.from(ev.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) await loadPortrait(file);
  };

  const wardrobeTotal = wardrobe.length;
  const currentList = tab === "outfit" ? outfits : accessories;
  const stylingBusy = busy.styling || busy.beautyApply;
  const fileInput = useRef<HTMLInputElement>(null);
  const itemInput = useRef<HTMLInputElement>(null);

  const renderCard = (item: ClothingItem, kind?: SuggestionKind) => {
    if (item.src === "loading") {
      return <div key={item.id} className="ls-card skeleton" aria-busy="true"><div className="ls-thumb" /><span>{item.name}</span></div>;
    }
    if (item.src === "error") {
      return (
        <div key={item.id} className="ls-card errorcard">
          <span className="ls-fail">{t.failedShort}</span>
          <span>{item.name}</span>
          {kind && <button type="button" onClick={() => void regeneratePiece(kind, item)}><RefreshCw size={12} />{t.regenerate}</button>}
        </div>
      );
    }
    return (
      <div key={item.id} className="ls-card" draggable onDragStart={(e) => e.dataTransfer.setData("application/x-look-item", JSON.stringify(item))}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.src} alt={item.name} className="ls-thumb" />
        <span title={item.name}>{item.name}</span>
        <div className="ls-card-actions">
          <button type="button" disabled={!portrait || stylingBusy} onClick={() => void tryOn(item)}><Wand2 size={12} />{t.tryOn}</button>
          {kind && <button type="button" aria-label={t.regenerate} title={t.regenerate} onClick={() => void regeneratePiece(kind, item)}><RefreshCw size={12} /></button>}
          {!kind && <button type="button" aria-label={t.remove} title={t.remove} onClick={() => void removeItem(item.id)}><Trash2 size={12} /></button>}
        </div>
      </div>
    );
  };

  const helpers = useMemo(() => ({ hasEdited: !!edited }), [edited]);

  return (
    <div className="ls">
      <div className="ls-head">
        <div>
          <h2>{t.title}</h2>
          <p>{t.subtitle}</p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => setShowSettings((v) => !v)}><SettingsIcon size={14} />{t.settings}</button>
          <button type="button" aria-pressed={settings.lang === "ko"} onClick={() => patchSettings({ lang: "ko" })}>KO</button>
          <button type="button" aria-pressed={settings.lang === "en"} onClick={() => patchSettings({ lang: "en" })}>EN</button>
        </div>
      </div>

      {showSettings && (
        <div className="ls-settings">
          <label>{t.model}
            <select value={settings.model} onChange={(e) => patchSettings({ model: e.target.value === "pro" ? "pro" : "standard" })}>
              <option value="standard">{t.modelStandard}</option>
              <option value="pro">{t.modelPro}</option>
            </select>
          </label>
          <p className="muted">{t.costNote}</p>
        </div>
      )}

      {importNote && (
        <div className="ls-alert" role="status">
          <span>{importNote}</span>
          <button type="button" aria-label={t.close} onClick={() => setImportNote(null)}><X size={14} /></button>
        </div>
      )}

      {error && (
        <div className="ls-alert" role="alert">
          <strong>{t.errorTitle}</strong> <span>{error}</span>
          <button type="button" aria-label={t.close} onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      <div className="ls-grid">
        <aside className="ls-panel" aria-label={t.aiTitle}>
          <h3>{t.aiTitle}</h3>
          <p className="muted">{t.aiDesc}</p>
          {!portrait ? (
            <p className="muted ls-center">{t.aiNeedPhoto}</p>
          ) : (
            <>
              <label className="ls-label" htmlFor="situation">{t.situationLabel}</label>
              <div className="ls-row">
                <input
                  id="situation" type="text" value={situation} maxLength={80} placeholder={t.situationPlaceholder} disabled={busy.recommending}
                  onChange={(e) => setSituation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void recommend(tab); }}
                />
                {busy.recommending ? (
                  <button type="button" onClick={cancelGeneration}><X size={14} />{t.cancel}</button>
                ) : (
                  <button type="button" className="primary" disabled={!situation.trim()} onClick={() => void recommend(tab)}>{t.getIdeas}</button>
                )}
              </div>
              <div className="ls-tabs">
                <button type="button" aria-pressed={tab === "outfit"} onClick={() => setTab("outfit")}>{t.tabOutfit}</button>
                <button type="button" aria-pressed={tab === "accessory"} onClick={() => setTab("accessory")}>{t.tabAccessory}</button>
              </div>
              {busy.recommending && currentList.length === 0 && <p className="muted ls-center"><Loader2 size={14} className="ls-spin" /> {t.generatingItems}</p>}
              {currentList.map((s) => (
                <div key={s.id} className="ls-set">
                  <h4>{s.name}</h4>
                  <div className="ls-cards">{s.pieces.map((p) => renderCard(p, tab))}</div>
                </div>
              ))}
            </>
          )}
        </aside>

        <section className="ls-center-col">
          <div
            className={`ls-canvas ${dragOver ? "over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => void onCanvasDrop(e)}
            aria-label="사진 캔버스"
          >
            {(busy.styling || busy.beautyApply || busy.beautyAnalyze) && (
              <div className="ls-overlay" role="status">
                <Loader2 size={32} className="ls-spin" />
                <p>{busy.beautyAnalyze ? t.analyzingBeauty : busy.beautyApply ? t.applyingBeauty : t.styling}</p>
              </div>
            )}
            {shown ? (
              compare && edited && portrait ? (
                <div className="ls-compare">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={toDataUrl(edited)} alt={t.result} />
                  <div className="ls-compare-orig" style={{ clipPath: `inset(0 ${100 - slider}% 0 0)` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toDataUrl(portrait)} alt={t.original} />
                  </div>
                  <span className="ls-bar" style={{ left: `${slider}%` }} />
                  <input type="range" min={0} max={100} value={slider} aria-label={t.compare} onChange={(e) => setSlider(Number(e.target.value))} />
                  <span className="ls-tag left">{t.original}</span>
                  <span className="ls-tag right">{t.result}</span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={toDataUrl(shown)} alt="인물 사진" className="ls-photo" />
              )
            ) : (
              <div className="ls-upload">
                <label className="ls-consent">
                  <input type="checkbox" checked={settings.consent} onChange={(e) => patchSettings({ consent: e.target.checked })} />
                  <span>{t.consent}</span>
                </label>
                <button type="button" className="ls-drop" disabled={!settings.consent} onClick={() => fileInput.current?.click()}>
                  <Upload size={36} />
                  <strong>{t.uploadTitle}</strong>
                  <small>{t.uploadSubtitle}</small>
                  <small>{t.uploadHint}</small>
                </button>
                <input
                  ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden data-testid="portrait-input"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadPortrait(f); e.target.value = ""; }}
                />
              </div>
            )}
          </div>

          <div className="ls-controls">
            <div className="ls-seg" role="group" aria-label={t.fittingMode}>
              <span>{t.fittingMode}</span>
              <button type="button" aria-pressed={settings.editMode === "add"} onClick={() => patchSettings({ editMode: "add" })}>{t.layered}</button>
              <button type="button" aria-pressed={settings.editMode === "replace"} onClick={() => patchSettings({ editMode: "replace" })}>{t.swap}</button>
            </div>
            <div className="ls-seg" role="group" aria-label={t.background}>
              <span>{t.background}</span>
              <button type="button" aria-pressed={settings.background === "keep"} onClick={() => patchSettings({ background: "keep" })}>{t.bgKeep}</button>
              <button type="button" aria-pressed={settings.background === "match"} onClick={() => patchSettings({ background: "match" })}>{t.bgMatch}</button>
            </div>
            <div className="actions">
              <button type="button" disabled={!canUndo(hist) || stylingBusy} onClick={() => setHist((h) => undoH(h))}><Undo2 size={14} />{t.undo}</button>
              <button type="button" disabled={hist.future.length === 0 || stylingBusy} onClick={() => setHist((h) => redoH(h))}><Redo2 size={14} />{t.redo}</button>
              <button type="button" disabled={!helpers.hasEdited} aria-pressed={compare} onClick={() => setCompare((v) => !v)}><SplitSquareHorizontal size={14} />{compare ? t.compareOff : t.compare}</button>
            </div>
            <div className="actions">
              <button type="button" className="ls-beauty" disabled={!portrait || busy.beautyAnalyze || busy.beautyApply} onClick={() => void openBeauty()}><FlaskConical size={14} />{t.beautyButton}</button>
              <button type="button" onClick={reset}><RefreshCw size={14} />{t.newStart}</button>
              <select value={format} aria-label={t.saveAs} onChange={(e) => setFormat(e.target.value === "jpeg" ? "jpeg" : "png")}>
                <option value="png">PNG</option><option value="jpeg">JPEG</option>
              </select>
              <button type="button" className="primary" disabled={!shown} onClick={() => void download()}><Download size={14} />{t.save}</button>
            </div>
          </div>
          {portrait && !busy.styling && <p className="muted ls-center">{t.dragHint}</p>}

          <div className="ls-looks">
            <h4>{t.recent}</h4>
            {looks.length === 0 ? <p className="muted">{t.recentEmpty}</p> : (
              <div className="ls-look-list">
                {looks.map((l) => (
                  <div key={l.id} className="ls-look">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={toDataUrl(l.image)} alt="저장한 룩" />
                    <div className="actions">
                      <button type="button" onClick={() => { setHist((h) => pushResult(h, l.image)); setCompare(false); }}>{t.load}</button>
                      <button type="button" aria-label={t.remove} onClick={async () => { if (db) { await deleteLook(db, l.id); setLooks(await loadLooks(db)); } }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="ls-panel" id="user-wardrobe" aria-label={t.wardrobeTitle}>
          <h3>{t.wardrobeTitle}</h3>
          <p className="muted">{t.wardrobeDesc}</p>
          <div
            className="ls-wdrop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void addFiles(Array.from(e.dataTransfer.files)); }}
          >
            <button type="button" onClick={() => itemInput.current?.click()}><ImagePlus size={14} />{t.uploadTitle}</button>
            <input ref={itemInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-testid="item-input"
              onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </div>
          <div className="ls-row">
            <input type="url" value={urlInput} placeholder={t.addByUrl} aria-label={t.addByUrl} onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void addByUrl(urlInput); }} />
            <button type="button" onClick={() => void addByUrl(urlInput)} disabled={!urlInput.trim()}><LinkIcon size={14} />{t.addUrl}</button>
          </div>
          {busy.naming && <p className="muted ls-center"><Loader2 size={14} className="ls-spin" /> {t.addingItem}</p>}
          {ready && wardrobeTotal === 0 && <p className="muted ls-center">{t.wardrobeEmpty}</p>}
          <div className="ls-cards">{wardrobe.map((it) => renderCard(it))}</div>
        </aside>
      </div>

      {beautyOpen && beauty && (
        <div className="ls-modal-bg" onClick={() => setBeautyOpen(false)}>
          <div className="ls-modal" role="dialog" aria-modal="true" aria-label={t.beautyTitle} onClick={(e) => e.stopPropagation()}>
            <div className="ls-modal-head"><h3>{t.beautyTitle}</h3><button type="button" aria-label={t.close} onClick={() => setBeautyOpen(false)}><X size={16} /></button></div>
            <div className="ls-tabs">
              <button type="button" aria-pressed={beautyTab === "makeup"} onClick={() => setBeautyTab("makeup")}>{t.makeup}</button>
              <button type="button" aria-pressed={beautyTab === "hair"} onClick={() => setBeautyTab("hair")}>{t.hair}</button>
            </div>
            {(() => {
              const cur = beautyTab === "makeup" ? beauty.makeup : beauty.hairstyle;
              return (
                <div className="ls-beauty-body">
                  <div className="ls-beauty-img">
                    {cur.generatedImage
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={cur.generatedImage} alt={cur.title} />
                      : <div className="skeleton" aria-busy="true" />}
                  </div>
                  <div>
                    <h4>{cur.title}</h4>
                    <p>{cur.description}</p>
                    <button type="button" className="primary" disabled={busy.beautyApply} onClick={() => void applyBeauty(beautyTab)}>
                      {busy.beautyApply ? <Loader2 size={14} className="ls-spin" /> : null}{t.applyStyle}
                    </button>
                    {applied === beautyTab && !busy.beautyApply && <p className="ls-ok">{t.applied}</p>}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {needKey && (
        <div className="ls-modal-bg">
          <div className="ls-modal" role="dialog" aria-modal="true" aria-label={t.needKeyTitle}>
            <h3>{t.needKeyTitle}</h3>
            <p>{t.needKeyBody}</p>
            <div className="actions">
              <a className="button primary" href="/settings">{t.goKeys}</a>
              <button type="button" onClick={() => setNeedKey(false)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
