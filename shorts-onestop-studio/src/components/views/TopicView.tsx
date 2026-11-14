"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { TRANSCRIBE_MODELS, defaultTranscribeModel, isTranscribeModel, transcribeModelOf, type TranscribeModelId } from "@/lib/transcribeModels";

// v1.48 레퍼런스 받아쓰기 모델 — 고른 값은 이 브라우저에만 기억
const TM_KEY = "sos-transcribe-model-v1";
const tmSubscribe = (cb: () => void) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); };
const tmRead = () => { try { return localStorage.getItem(TM_KEY) ?? ""; } catch { return ""; } };
import { FileText, Plus, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { Busy, Message } from "@/components/ui/Message";
import { ApiError, api, toMsg, type Item, type Msg } from "@/components/ui/api";
import { modelName } from "@/lib/models";
import { CATEGORIES, FORMATS, MAX_CARDS, MIN_CARDS, TONES, guessFromTopic, scriptFromLines, type Format, type ShortsScript, type Tone } from "@/lib/script";
import { extractReel } from "@/lib/reelsMedia";
import { guardText, hasCopy } from "@/lib/reference";
import { takeProductHandoff, takeRefHandoff } from "@/lib/refHandoff";
import { EXTRA_LIMITS, MAX_PRODUCT_PHOTOS, PRODUCT_CARDS, PRODUCT_LIMITS, RIGHTS_LABEL, applyProduct, normalizeProductExtra, productPhotoList, type ProductExtra, type ProductRights } from "@/lib/productShorts";
import { createClient } from "@/lib/supabase/client";
import { refBlockHeader, refBlocks, removeRefBlock, shortSource } from "@/lib/refBlocks";
import { REWRITE_LEVELS, type RewriteLevel } from "@/lib/rewrite";

// v1.31 참고 자료와 그대로 겹치는 장면 표시(브라우저 안에서 다시 검사 — 고치면 바로 사라짐)
const COPY_STYLE = { outline: "2px solid #f5c542", outlineOffset: 2, borderRadius: 12 } as const;
const CopyBadge = () => <span className="badge" style={{ background: "rgba(245,197,66,.18)", color: "#f5c542" }} title="참고 자료와 6어절 이상 그대로 겹칩니다. 다른 표현으로 고쳐 주세요.">⚠ 겹침</span>;

type Topic = { title: string; hook: string; format: Format | null };
type Guide = Item<{ text: string }>;
const CAT_EMOJI: Record<string, string> = { "건강·운동": "💪", "자기계발·생산성": "📈", "돈·재테크": "💰", "요리·레시피": "🍳", "여행": "✈️", "심리·인간관계": "🧠", "IT·AI": "🤖", "뷰티·패션": "💄", "생활 꿀팁": "🏠", "동기부여": "🔥", "상식·잡학": "📚", "운세·꿈풀이": "🔮", "미스터리": "🕵️", "반전 상식": "😲" };

/** 목표 길이별 기본 카드 수(주제에 숫자가 있거나 직접 고르면 그 값 유지) */
const LENGTH_CARDS: Record<number, number> = { 15: PRODUCT_CARDS, 30: 3, 45: 4, 60: 5 };

export function TopicView() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [category, setCategory] = useState<string>("");
  const [seed, setSeed] = useState(""), [reference, setReference] = useState("");
  const refBox = useRef<HTMLTextAreaElement>(null);
  // v1.36 띠 이름을 누르면 참고 자료 칸 안 그 레퍼런스 머리말로 커서·화면 이동
  function jumpToRef(start: number) {
    const el = refBox.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, start);
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    el.scrollTop = Math.max(0, (el.value.slice(0, start).split("\n").length - 1) * lineHeight - 4);
  }
  const [topics, setTopics] = useState<Topic[]>([]), [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("friendly"), [format, setFormat] = useState<Format>("list"), [cards, setCards] = useState(5);
  const [touched, setTouched] = useState({ tone: false, format: false, cards: false });
  const [seconds, setSeconds] = useState(0); // 목표 길이(0 = 제한 없음)
  const [guides, setGuides] = useState<Guide[]>([]), [useGuide, setUseGuide] = useState(false), [guideText, setGuideText] = useState(""), [guideOpen, setGuideOpen] = useState(false);
  const [manual, setManual] = useState(""), [firstIntro, setFirstIntro] = useState(true), [lastOutro, setLastOutro] = useState(true);
  // v1.45(V2) 각색 강도: 내 대본을 본인 키로 다듬기 — 강도 3단, 직접 쓴 대본 확인, 다듬기 전 원문(되돌리기)
  const [rewriteLevel, setRewriteLevel] = useState<RewriteLevel>("medium"), [ownScript, setOwnScript] = useState(false), [manualBefore, setManualBefore] = useState<string | null>(null);
  const [script, setScript] = useState<ShortsScript | null>(null), [itemId, setItemId] = useState<string | null>(null);
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState<Msg>(null);
  const tmSaved = useSyncExternalStore(tmSubscribe, tmRead, () => "");
  const [tmKeys, setTmKeys] = useState<string[] | null>(null);
  const [tmPicked, setTmPicked] = useState<TranscribeModelId | null>(null);
  const tModel = tmPicked ?? defaultTranscribeModel(tmKeys ?? [], tmSaved);
  useEffect(() => {
    let alive = true;
    api<{ keys: Record<string, { hasKey: boolean }> }>("/api/keys")
      .then((k) => { if (alive) setTmKeys(Object.entries(k.keys ?? {}).filter(([, v]) => v?.hasKey).map(([p]) => p)); })
      .catch(() => { if (alive) setTmKeys([]); });
    return () => { alive = false; };
  }, []);
  const pickTModel = (v: string) => {
    if (!isTranscribeModel(v)) return;
    setTmPicked(v);
    try { localStorage.setItem(TM_KEY, v); } catch { /* 이번 화면에서만 */ }
  };
  // v1.31 참고 자료 전체 베끼기 검사(선택) · 대본을 만들 때 쓴 검사 대상 글(장면 노란 테두리용)
  const [guardAll, setGuardAll] = useState(false), [guardRef, setGuardRef] = useState("");
  // v1.44(V3) 상품 홍보: 판매자가 적은 상품명·장점 3개·혜택(다른 프로그램이 주소 # 뒤로 넘기면 채워짐)
  const [product, setProduct] = useState({ name: "", points: ["", "", ""], offer: "" });
  // v1.52 메이커 후속 1단계: 상품ID·옵션·주소·확정 설명·사진 권리·판번호 + 회원이 올린 상품 사진(최대 6)
  const [extra, setExtra] = useState<ProductExtra>(() => normalizeProductExtra({}));
  const [productFrom, setProductFrom] = useState("");
  const [photos, setPhotos] = useState<{ path?: string; ref?: string; preview: string; name: string }[]>([]);
  const [library, setLibrary] = useState<{ ref: string; title: string; source: string; url: string }[] | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const isProduct = format === "product";
  function chooseProductFormat() {
    setFormat("product"); setCards(PRODUCT_CARDS); setSeconds(15);
    setTouched((t) => ({ ...t, format: true, cards: true }));
  }

  const guide = useMemo(() => guides.find((g) => g.title === category), [guides, category]);
  useEffect(() => { setGuideText(guide?.data.text ?? ""); }, [guide]);

  // v1.54 저장한 상품 대본을 열면 상품 정보·사진을 다시 채운다 — 같은 상품으로 다시 만들 수 있게
  async function restoreProduct(d: ShortsScript) {
    const pr = d.product; if (!pr?.name) return;
    setProduct({ name: pr.name, points: [...pr.points, "", "", ""].slice(0, 3), offer: pr.offer });
    setExtra(normalizeProductExtra(pr)); setProductFrom(pr.from ?? "");
    setMode("ai"); chooseProductFormat();
    const list = productPhotoList(d); if (!list.length) return;
    try {
      const { urls } = await api<{ urls: Record<string, string> }>("/api/media/sign", { body: { paths: list.flatMap((p) => (p.path ? [p.path] : [])), refs: list.flatMap((p) => (p.ref ? [p.ref] : [])) } });
      const urlOf = (p: { path?: string; ref?: string }) => (p.ref ? urls[`ref:${p.ref}`] : p.path ? urls[p.path] : undefined);
      setPhotos(list.filter((p) => urlOf(p)).map((p, k) => ({ ...p, preview: urlOf(p)!, name: `사진 ${k + 1}` })));
    } catch { /* 사진을 못 불러와도 상품 정보는 채워 둔다 */ }
  }
  // v1.55 「내 자료함」 이미지를 상품 사진으로(복사하지 않고 원본 번호만 저장)
  async function openLibrary() {
    if (!extra.rights) { setMsg({ text: "사진을 고르기 전에 사진 권리(내 사진 또는 공급사 허락)를 먼저 골라 주세요." }); return; }
    try { setLibrary((await api<{ images: { ref: string; title: string; source: string; url: string }[] }>("/api/library/images")).images); }
    catch (e) { setMsg(toMsg(e)); }
  }
  function pickLibrary(img: { ref: string; title: string; url: string }) {
    setPhotos((p) => (p.some((x) => x.ref === img.ref) || p.length >= MAX_PRODUCT_PHOTOS ? p : [...p, { ref: img.ref, preview: img.url, name: img.title }]));
  }
  // v1.54 사진 순서 바꾸기(앞으로·뒤로) — 순서대로 상품 장면에 들어간다
  const movePhoto = (k: number, d: -1 | 1) => setPhotos((p) => { const t = k + d; if (t < 0 || t >= p.length) return p; const n = [...p]; [n[k], n[t]] = [n[t], n[k]]; return n; });
  // v1.54 사진 빼기: 지금 대본이 쓰지 않으면 서버 파일도 바로 지운다(저장된 대본이 쓰는 파일은 서버가 남김)
  function removePhoto(key: string) {
    setPhotos((p) => p.filter((x) => (x.path ?? x.ref) !== key));
    if (!key.includes("/product/")) return; // 자료함 사진은 원본이라 지우지 않는다
    const path = key;
    if (script && JSON.stringify(script).includes(path)) return;
    void api("/api/media/product-delete", { body: { path } }).catch(() => undefined);
  }

  const loadGuides = useCallback(async () => { try { setGuides((await api<{ items: Guide[] }>("/api/items?kind=guideline")).items); } catch { /* 지침은 선택 기능 */ } }, []);
  useEffect(() => {
    void loadGuides();
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) api<{ item: Item<ShortsScript> }>(`/api/items?id=${id}`).then(({ item }) => { setScript(item.data); setGuardRef(""); setItemId(item.id); setTopic(item.data.topic); if (item.data.category) setCategory(item.data.category); void restoreProduct(item.data); }).catch((e) => setMsg(toMsg(e)));
    // v1.32 다른 프로그램(INSTA 떡상 리메이크·쇼츠 바이럴 분석)이 넘긴 대사 → 참고 자료의 레퍼런스 쇼츠 블록(v1.30 베끼기 방지 그대로 적용), 주소의 # 부분은 바로 지움
    // v1.33 로그인 화면을 거쳐 온 경우는 그때 보관한 대사를 꺼냄
    // v1.34 보낸 프로그램 이름이 있으면 머리말·안내에 표시(회원이 여러 프로그램을 오갈 때 출처 구분)
    const { text: handoff, from } = takeRefHandoff(window.location.hash);
    if (handoff) {
      const block = `${refBlockHeader(from || "다른 프로그램")}\n${handoff}`;
      setReference((cur) => (cur.trim() ? `${cur.trim()}\n\n${block}` : block).slice(0, 12000));
      setMode("ai");
      setMsg({ text: `${from ? `「${from}」` : "다른 프로그램"}에서 넘긴 쇼츠 대사를 참고 자료에 넣었습니다. 주제를 고르고 대본을 만들면 흐름만 참고하고 문장은 새로 씁니다.`, ok: true });
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    // v1.44(V3) 다른 프로그램(상세페이지 등)이 넘긴 상품 정보 → 상품 홍보 구성으로 채움(형식: src/lib/productShorts.ts 맨 위)
    const got = takeProductHandoff(window.location.hash);
    if (got) {
      setProduct({ name: got.product.name, points: [...got.product.points, "", "", ""].slice(0, 3), offer: got.product.offer });
      setExtra(got.extra); setProductFrom(got.from);
      setTopic(`${got.product.name} 15초 홍보 쇼츠`.slice(0, 120));
      setMode("ai"); chooseProductFormat();
      setMsg({ text: `${got.from ? `「${got.from}」` : "다른 프로그램"}에서 넘긴 상품 정보를 채웠습니다. 장점·혜택을 확인한 뒤 「대본 만들기」를 누르세요.`, ok: true });
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [loadGuides]);

  function pickTopic(t: string, f?: Format | null) {
    setTopic(t);
    const g = guessFromTopic(t);
    if (!touched.format && (f || g.format)) setFormat((f ?? g.format)!);
    if (!touched.cards && g.cards) setCards(g.cards);
    if (!touched.tone && g.tone) setTone(g.tone);
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 300_000 || !/\.(txt|md|markdown|csv|json)$/i.test(file.name)) { setMsg({ text: "txt·md·csv·json 파일(300KB 이하)만 불러올 수 있습니다." }); return; }
    setReference((await file.text()).slice(0, 12000)); setMsg({ text: `「${file.name}」 내용을 참고 자료로 불러왔습니다.`, ok: true });
  }

  // v1.29 레퍼런스 쇼츠에서 대본 따기 — 영상은 이 브라우저 안에서 소리만 뽑고(공용 browser-video-extract), 고른 받아쓰기 모델(v1.48)의 본인 키로 받아써 참고 자료에 넣는다
  async function readVideo(file: File | undefined) {
    if (!file) return;
    setBusy("영상에서 소리를 뽑는 중…"); setMsg(null);
    try {
      const reel = await extractReel(file);
      if (!reel.audio) { setMsg({ text: "이 영상에서 소리를 읽지 못했습니다. mp4(H.264·AAC) 영상으로 다시 시도해 주세요." }); return; }
      setBusy(`말소리를 받아쓰는 중… (${reel.audio.seconds}초 분량, 보통 10~30초)`);
      const r = await api<{ transcript: string }>("/api/ai/transcribe", { body: { audio: { mimeType: reel.audio.mimeType, data: reel.audio.data }, model: tModel } });
      const block = `${refBlockHeader(file.name)}\n${r.transcript}`;
      setReference((cur) => (cur.trim() ? `${cur.trim()}\n\n${block}` : block).slice(0, 12000));
      setMsg({ text: `「${file.name}」의 말소리를 받아써 참고 자료에 넣었습니다. 주제를 고르고 대본을 만들면 이 흐름을 참고합니다.`, ok: true });
    } catch (e) {
      // 서버 오류는 toMsg(키 안내 포함), 브라우저 추출 오류(파일 형식·크기)는 그 문구 그대로
      setMsg(e instanceof ApiError || !(e instanceof Error) ? toMsg(e) : { text: e.message });
    } finally { setBusy(""); }
  }

  async function suggest() {
    setBusy("주제를 고르는 중…"); setMsg(null);
    try {
      const r = await api<{ topics: Topic[] }>("/api/ai/topics", { body: { category, seed, reference, guideline: useGuide ? guideText : "" } });
      setTopics(r.topics);
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  // v1.52 대본에 상품 기록·상품 사진·고정 문구(상품명·옵션 원문)를 넣는다(src/lib/productShorts.ts applyProduct)
  function withProduct(s: ShortsScript): ShortsScript {
    const points = product.points.map((p) => p.trim()).filter(Boolean);
    return applyProduct(s, { name: product.name.trim(), points, offer: product.offer.trim(), ...normalizeProductExtra(extra), from: productFrom, photos: photos.length }, photos);
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    if (!extra.rights) { setMsg({ text: "사진을 올리기 전에 사진 권리(내 사진 또는 공급사 허락)를 먼저 골라 주세요." }); return; }
    const room = MAX_PRODUCT_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (!list.length) { setMsg({ text: `상품 사진은 ${MAX_PRODUCT_PHOTOS}장까지 넣을 수 있습니다.` }); return; }
    setBusy("상품 사진을 올리는 중…"); setMsg(null);
    const added: { path: string; preview: string; name: string }[] = []; const skipped: string[] = [];
    try {
      for (const f of list) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 10 * 1024 * 1024) { skipped.push(f.name); continue; }
        const r = await api<{ path: string; token: string }>("/api/media/product-upload", { body: { size: f.size, type: f.type, rights: extra.rights } });
        const { error } = await createClient().storage.from("shorts-onestop-studio").uploadToSignedUrl(r.path, r.token, f, { contentType: f.type });
        if (error) { skipped.push(f.name); continue; }
        added.push({ path: r.path, preview: URL.createObjectURL(f), name: f.name });
      }
      setPhotos((p) => [...p, ...added].slice(0, MAX_PRODUCT_PHOTOS));
      setMsg(skipped.length ? { text: `${added.length}장을 올렸습니다. 올리지 못한 사진: ${skipped.join(", ")} (JPG·PNG·WEBP, 한 장 10MB 이하)` } : { text: `상품 사진 ${added.length}장을 올렸습니다. 대본을 만들면 상품이 나오는 장면에 원본 그대로 들어갑니다.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); if (photoInput.current) photoInput.current.value = ""; }
  }

  async function makeScript() {
    setBusy("대본을 쓰는 중… (보통 10~40초)"); setMsg(null);
    try {
      const productBody = isProduct ? { name: product.name, points: product.points, offer: product.offer, option: extra.option, desc: extra.desc } : undefined;
      const sendTopic = isProduct && topic.trim().length < 4 ? `${product.name.trim()} 홍보 쇼츠` : topic;
      const r = await api<{ script: ShortsScript; copied?: string[] }>("/api/ai/script", { body: { topic: sendTopic, category, tone, format, cards, reference, guideline: useGuide ? guideText : "", seconds: seconds || undefined, guardAll, product: productBody } });
      setScript(isProduct ? withProduct(r.script) : r.script); setItemId(null); setGuardRef(guardText(reference, guardAll));
      // v1.30 레퍼런스 쇼츠와 그대로 겹치는 구절이 남았으면 다듬기에서 고치도록 알린다
      setMsg(r.copied?.length
        ? { text: `대본이 완성됐지만 참고 자료와 그대로 겹치는 구절이 ${r.copied.length}개 남았습니다. 아래 「③ 대본 다듬기」의 노란 테두리 장면을 다른 표현으로 고쳐 주세요: 「${r.copied.slice(0, 3).join("」, 「")}」` }
        : { text: "대본이 완성됐습니다. 아래에서 고친 뒤 보관함에 저장하세요.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  // v1.45(V2) 각색 강도: 줄 수는 그대로, 고른 강도만큼만 다듬는다(본인 키 1회)
  async function rewriteManual() {
    const lines = manual.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < MIN_CARDS) { setMsg({ text: `대본이 ${MIN_CARDS}줄 이상 필요합니다.` }); return; }
    setBusy(`대본을 다듬는 중… (${REWRITE_LEVELS[rewriteLevel].label})`); setMsg(null);
    try {
      const r = await api<{ lines: string[]; model: string }>("/api/ai/rewrite", { body: { lines, level: rewriteLevel, topic, own: ownScript } });
      if (manualBefore === null) setManualBefore(manual);
      setManual(r.lines.join("\n"));
      setMsg({ text: `${REWRITE_LEVELS[rewriteLevel].via} 다듬었습니다(${modelName(r.model)}). 내용을 확인한 뒤 「장면 만들기」를 누르세요. 마음에 안 들면 「다듬기 전으로」.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  function makeManual() {
    const s = scriptFromLines(manual, { topic, firstAsIntro: firstIntro, lastAsOutro: lastOutro });
    if (!s) { setMsg({ text: `장면이 ${MIN_CARDS}줄 이상 필요합니다(인트로·아웃트로 줄 제외). 한 줄에 한 장면씩 적어 주세요.` }); return; }
    setScript(s); setItemId(null); setGuardRef(""); setMsg({ text: "장면을 만들었습니다. 화면에 보일 제목을 다듬은 뒤 저장하세요.", ok: true });
  }

  async function save() {
    if (!script) return;
    setBusy("저장하는 중…"); setMsg(null);
    try {
      const title = script.intro.title || script.topic;
      if (itemId) await api("/api/items", { method: "PATCH", body: { id: itemId, title, data: script } });
      else setItemId((await api<{ item: Item<ShortsScript> }>("/api/items", { body: { kind: "project", title, data: script } })).item.id);
      setMsg({ text: "보관함에 저장했습니다. 다음 단계(디자인·배경)가 열리면 이 대본으로 이어서 작업합니다.", ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  async function saveGuide() {
    if (!category) return;
    setBusy("지침을 저장하는 중…");
    try {
      if (guide) await api("/api/items", { method: "PATCH", body: { id: guide.id, data: { text: guideText } } });
      else await api("/api/items", { body: { kind: "guideline", title: category, data: { text: guideText } } });
      await loadGuides(); setMsg({ text: `「${category}」 지침을 저장했습니다.`, ok: true });
    } catch (e) { setMsg(toMsg(e)); } finally { setBusy(""); }
  }

  const upd = (fn: (s: ShortsScript) => ShortsScript) => setScript((s) => (s ? fn(structuredClone(s)) : s));
  const step = script ? 3 : topic ? 2 : 1;

  return (
    <>
      <Hero eyebrow="STEP 1 · 주제·대본" title="💡 주제를 고르면 AI가 대본을 씁니다" desc="분야를 고르고 주제 8개를 추천받거나, 직접 주제·대본을 넣으세요. 화면에는 짧은 글자만, 자세한 내용은 내레이션으로 전달하는 쇼츠 표준 구성으로 만들어 드립니다." emoji="💡" meta={["⏱ 약 30초", "📄 참고 자료 반영", "✍️ 내 지침 적용"]} />
      <div className="wizard-steps"><span className={step === 1 ? "on" : "done"}>① 주제 고르기</span><span className={step === 2 ? "on" : step > 2 ? "done" : ""}>② 대본 옵션</span><span className={step === 3 ? "on" : ""}>③ 대본 다듬기·저장</span></div>
      <div className="chips" style={{ marginBottom: 14 }}>
        <button type="button" className={`chip ${mode === "ai" ? "on" : ""}`} onClick={() => setMode("ai")}><Sparkles size={13} />AI로 만들기</button>
        <button type="button" className={`chip ${mode === "manual" ? "on" : ""}`} onClick={() => setMode("manual")}><FileText size={13} />내 대본으로 만들기</button>
      </div>
      <div className="stack">
        <Message msg={msg} />
        {mode === "ai" ? (
          <>
            <section className="card stack">
              <h2>① 분야와 주제</h2>
              <div className="chips">{CATEGORIES.map((c) => <button key={c} type="button" className={`chip ${category === c ? "on" : ""}`} onClick={() => { setCategory(c); setTopics([]); }}>{CAT_EMOJI[c]} {c}</button>)}</div>
              <div className="grid2">
                <label>내 키워드·아이디어 (선택)<input value={seed} maxLength={200} onChange={(e) => setSeed(e.target.value)} placeholder="예: 직장인 아침 루틴, 40대 다이어트" /></label>
                <label>참고 자료 (선택 — 기사·메모를 붙여넣거나 파일로)
                  {/* v1.35 레퍼런스 쇼츠 블록마다 출처·글자 수·빼기(회원 메모는 그대로) · v1.36 긴 이름 줄임·줄바꿈 허용, 이름 누르면 그 위치로 */}
                  {refBlocks(reference).length > 0 && (
                    <span className="row" style={{ gap: 6, flexWrap: "wrap", fontWeight: 500 }}>
                      {refBlocks(reference).map((b, i) => (
                        <span key={i} className="badge brand" style={{ maxWidth: "100%", whiteSpace: "normal", display: "inline-flex", alignItems: "flex-start", gap: 6, borderRadius: 10 }}>
                          <button type="button" className="link-button" title={`${b.source || "알 수 없음"} — 누르면 칸 안 이 레퍼런스로 이동`} style={{ whiteSpace: "normal", textAlign: "left" }} onClick={(e) => { e.preventDefault(); jumpToRef(b.start); }}>
                            🎬 출처 {shortSource(b.source || "알 수 없음")} · 대사 {b.chars.toLocaleString()}자
                          </button>
                          <button type="button" className="link-button" style={{ whiteSpace: "nowrap", marginLeft: "auto" }} onClick={(e) => { e.preventDefault(); setReference((cur) => removeRefBlock(cur, i)); }}>✕ 빼기</button>
                        </span>
                      ))}
                    </span>
                  )}
                  <textarea ref={refBox} rows={2} value={reference} maxLength={12000} onChange={(e) => setReference(e.target.value)} placeholder="이 내용을 근거로 주제·대본을 씁니다." /></label>
              </div>
              <div className="row">
                <label className="button" style={{ fontWeight: 600 }}>📄 파일 불러오기<input type="file" accept=".txt,.md,.markdown,.csv,.json" hidden onChange={(e) => void readFile(e.target.files?.[0])} /></label>
                <label className="button" style={{ fontWeight: 600 }} title="저장해 둔 쇼츠 영상의 말소리를 고른 받아쓰기 모델의 본인 키로 받아써 참고 자료에 넣습니다(최대 3분, 영상은 어디에도 올리지 않음)">🎬 레퍼런스 쇼츠에서 대본 따기<input type="file" accept="video/mp4,video/quicktime,video/webm" hidden disabled={!!busy} onChange={(e) => { void readVideo(e.target.files?.[0]); e.target.value = ""; }} /></label>
                <label className="row" style={{ gap: 6, fontWeight: 500 }} title="레퍼런스 쇼츠 받아쓰기에 쓸 모델(본인 키). Claude는 음성을 받지 못해 없습니다.">받아쓰기<select value={tModel} disabled={!!busy} onChange={(e) => pickTModel(e.target.value)}>{TRANSCRIBE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.note}{tmKeys && !tmKeys.includes(m.provider) ? " (키 없음)" : ""}</option>)}</select></label>
                {tmKeys && !tmKeys.includes(transcribeModelOf(tModel).provider) && <small className="muted">이 모델은 본인 {transcribeModelOf(tModel).provider === "gemini" ? "Gemini" : "OpenAI"} 키가 필요합니다(설정에서 등록).</small>}
                {reference && <button type="button" className="link-button" onClick={() => setReference("")}>참고 자료 지우기</button>}
                {reference && <label className="row" style={{ gap: 6, fontWeight: 500 }} title="켜면 붙여 넣은 기사·블로그 글도 6어절 이상 그대로 옮기지 않게 검사합니다(레퍼런스 쇼츠는 항상 검사)"><input type="checkbox" checked={guardAll} onChange={(e) => setGuardAll(e.target.checked)} />📋 참고 자료 전체도 베끼기 검사</label>}
                <label className="row" style={{ gap: 6, fontWeight: 500 }}><input type="checkbox" checked={useGuide} disabled={!category} onChange={(e) => setUseGuide(e.target.checked)} />내 지침 사용{category && (guide ? <span className="badge brand">저장됨</span> : <span className="badge">없음</span>)}</label>
                <button type="button" className="link-button" disabled={!category} onClick={() => setGuideOpen((v) => !v)}>✍️ {category || "분야"} 지침 {guideOpen ? "닫기" : "쓰기"}</button>
              </div>
              {guideOpen && category && (
                <div className="stack" style={{ gap: 8 }}>
                  <textarea rows={4} value={guideText} maxLength={3000} onChange={(e) => setGuideText(e.target.value)} placeholder="예: 반말 금지, 첫 문장은 질문으로, 의학적 단정 금지, 마지막에 '저장해 두세요' 넣기" />
                  <div className="actions"><button className="primary" disabled={!!busy || !guideText.trim()} onClick={() => void saveGuide()}><Save size={13} />지침 저장</button><small>「내 지침 사용」을 켜면 이 분야의 주제·대본에 우선 적용됩니다.</small></div>
                </div>
              )}
              <div className="actions"><button className="primary" disabled={!category || !!busy} onClick={() => void suggest()}><Wand2 size={14} />주제 8개 추천받기</button><Busy on={busy.startsWith("주제")} label={busy} /></div>
              {topics.length > 0 && <div className="topic-grid">{topics.map((t) => (
                <button key={t.title} type="button" className={`topic-card ${topic === t.title ? "on" : ""}`} onClick={() => pickTopic(t.title, t.format)}>
                  <strong>{t.title}</strong>{t.hook && <small>🎣 {t.hook}</small>}{t.format && <span className="badge">{FORMATS[t.format].label}</span>}
                </button>))}</div>}
              <label>또는 주제를 직접 입력<input value={topic} maxLength={120} onChange={(e) => pickTopic(e.target.value)} placeholder="예: 아침에 하면 좋은 습관 5가지" /></label>
            </section>
            <section className="card stack">
              <h2>② 대본 옵션 <small>— 주제 문구에 맞춰 자동으로 골라 두었어요. 바꾸면 그대로 유지됩니다.</small></h2>
              <div className="field-grid">
                <label>말투<select value={tone} onChange={(e) => { setTone(e.target.value as Tone); setTouched((t) => ({ ...t, tone: true })); }}>{Object.entries(TONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
                <label>구성<select value={format} onChange={(e) => { const f = e.target.value as Format; if (f === "product") { chooseProductFormat(); return; } setFormat(f); setTouched((t) => ({ ...t, format: true })); if (seconds === 15) setSeconds(0); }}>{Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
                <label>목표 길이<select value={seconds} onChange={(e) => { const v = Number(e.target.value); setSeconds(v); if (v && !touched.cards) setCards(LENGTH_CARDS[v]); }}><option value={0}>제한 없음</option>{(isProduct ? [15, 30] : [30, 45, 60]).map((v) => <option key={v} value={v}>약 {v}초</option>)}</select></label>
                <label>카드 수<select value={cards} disabled={isProduct} title={isProduct ? "상품 홍보는 6비트(인트로·카드 4장·아웃트로)로 고정입니다" : undefined} onChange={(e) => { setCards(Number(e.target.value)); setTouched((t) => ({ ...t, cards: true })); }}>{Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => MIN_CARDS + i).map((n) => <option key={n} value={n}>{n}장</option>)}</select></label>
              </div>
              {isProduct && (
                <div className="stack" style={{ gap: 8 }}>
                  <h3 style={{ margin: 0 }}>🛍 상품 정보 <small className="muted">— 적은 내용만 사실로 씁니다. 없는 효능·가격·판매량은 지어내지 않습니다.</small></h3>
                  <label>상품명<input value={product.name} maxLength={PRODUCT_LIMITS.name} onChange={(e) => setProduct((p) => ({ ...p, name: e.target.value }))} placeholder="예: 접이식 휴대용 선풍기" /></label>
                  <div className="grid2">{product.points.map((pt, i) => (
                    <label key={i}>장점 {i + 1}{i === 0 ? "" : " (선택)"}<input value={pt} maxLength={PRODUCT_LIMITS.point} onChange={(e) => setProduct((p) => ({ ...p, points: p.points.map((v, j) => (j === i ? e.target.value : v)) }))} placeholder={["예: 무게 300g, 가방에 쏙", "예: USB-C로 어디서나 충전", "예: 밤에도 조용한 3단 바람"][i]} /></label>
                  ))}</div>
                  <label>혜택·구매 안내 (선택 — 아웃트로에 그대로 씀)<input value={product.offer} maxLength={PRODUCT_LIMITS.offer} onChange={(e) => setProduct((p) => ({ ...p, offer: e.target.value }))} placeholder="예: 프로필 링크에서 오늘 출발 상품 확인" /></label>
                  <div className="grid2">
                    <label>옵션 (선택)<input value={extra.option} maxLength={EXTRA_LIMITS.option} onChange={(e) => setExtra((x) => ({ ...x, option: e.target.value }))} placeholder="예: 화이트 · 3단" /></label>
                    <label>판매 상품 주소 (선택 — 유튜브 설명란에 넣음)<input value={extra.url} maxLength={EXTRA_LIMITS.url} onChange={(e) => setExtra((x) => ({ ...x, url: e.target.value }))} placeholder="https://…" /></label>
                  </div>
                  <label>확정한 상품 설명 (선택 — 적은 내용만 사실로 씀)<textarea rows={2} value={extra.desc} maxLength={EXTRA_LIMITS.desc} onChange={(e) => setExtra((x) => ({ ...x, desc: e.target.value }))} placeholder="예: 접으면 18cm, 1회 충전 8시간 사용" /></label>
                  {(extra.id || productFrom) && <small className="muted">📦 넘겨받은 상품{extra.id ? ` · 상품ID ${extra.id}` : ""}{productFrom ? ` · 보낸 곳 「${productFrom}」` : ""}{extra.rev ? ` · 판 ${extra.rev}` : ""}</small>}
                  <div className="stack" style={{ gap: 6 }}>
                    <strong style={{ fontSize: 14 }}>📷 상품 사진 (선택, 최대 {MAX_PRODUCT_PHOTOS}장) — 잘라내거나 AI로 다시 그리지 않고 원본 그대로 장면에 넣습니다</strong>
                    <div className="chips">{(Object.keys(RIGHTS_LABEL) as ProductRights[]).map((k) => <button key={k} type="button" className={`chip ${extra.rights === k ? "on" : ""}`} onClick={() => setExtra((x) => ({ ...x, rights: k }))}>{extra.rights === k ? "✔ " : ""}{RIGHTS_LABEL[k]}</button>)}</div>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void addPhotos(e.target.files)} />
                      <button type="button" disabled={!extra.rights || photos.length >= MAX_PRODUCT_PHOTOS || !!busy} title={extra.rights ? undefined : "사진 권리를 먼저 골라 주세요"} onClick={() => photoInput.current?.click()}><Plus size={14} />사진 올리기</button>
                      <button type="button" disabled={!extra.rights || photos.length >= MAX_PRODUCT_PHOTOS || !!busy} title={extra.rights ? "바나나·AI 이미지 등 내 자료함 사진 — 복사하지 않고 원본을 그대로 씁니다" : "사진 권리를 먼저 골라 주세요"} onClick={() => void openLibrary()}>🗂️ 내 자료함에서 고르기</button>
                      {photos.map((ph, k) => <span key={ph.path ?? ph.ref} className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><button type="button" aria-label="앞으로" title="앞으로" disabled={k === 0} onClick={() => movePhoto(k, -1)}>◀</button><img src={ph.preview} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, background: "#0002" }} />{k + 1}<button type="button" aria-label="뒤로" title="뒤로" disabled={k === photos.length - 1} onClick={() => movePhoto(k, 1)}>▶</button><button type="button" aria-label="이 사진 빼기" title="빼기" onClick={() => removePhoto((ph.path ?? ph.ref)!)}><Trash2 size={12} /></button></span>)}
                    </div>
                    {library && (
                      <div className="stack" style={{ gap: 6 }}>
                        <div className="row" style={{ justifyContent: "space-between" }}><strong style={{ fontSize: 13 }}>🗂️ 내 자료함 이미지 ({library.length}) — 눌러서 넣기</strong><button type="button" onClick={() => setLibrary(null)}>닫기</button></div>
                        {library.length === 0 ? <small className="muted">자료함에 서버에 저장된 이미지가 없습니다. <a href="https://www.buylife.xyz/library" target="_blank" rel="noreferrer">내 자료함 보기</a></small> : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                            {library.map((img) => { const on = photos.some((x) => x.ref === img.ref); return (
                              <button key={img.ref} type="button" title={`${img.title} · ${img.source}`} onClick={() => pickLibrary(img)} disabled={on || photos.length >= MAX_PRODUCT_PHOTOS} style={{ padding: 2, borderRadius: 8, outline: on ? "2px solid var(--brand)" : undefined }}>
                                <img src={img.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain", background: "#0002", borderRadius: 6 }} />
                              </button>); })}
                          </div>)}
                        <small className="muted">자료함 사진은 복사하지 않고 원본을 그대로 씁니다. 원본이 보관 기간이 지나 지워지면 영상에서도 빠지니 그때는 다시 골라 주세요.</small>
                      </div>
                    )}
                    <small className="muted">1번부터 순서대로 상품 등장 → 쓰는 모습 → 달라진 결과 → 인트로 → 마무리 장면에 들어가고(◀ ▶로 순서 바꾸기), 사진이 적으면 돌아가며 씁니다. 올린 사진은 다른 회원에게 보이지 않고 30일 뒤 자동으로 지워집니다.</small>
                    {script && <div className="actions"><button type="button" disabled={!!busy} onClick={() => { setScript((s) => (s ? withProduct(s) : s)); setMsg({ text: "지금 대본에 상품 정보·사진을 다시 넣었습니다. 저장해 주세요.", ok: true }); }}>🛍 지금 대본에 상품 사진·정보 넣기</button></div>}
                  </div>
                  <small className="muted">구성: 결과 먼저 → 쓰기 전 → 상품 등장 → 쓰는 모습 → 달라진 결과 → 처음 장면으로 이어지는 마무리</small>
                </div>
              )}
              <div className="actions"><button className="primary" disabled={(isProduct ? !product.name.trim() : topic.trim().length < 4) || !!busy} onClick={() => void makeScript()}><Sparkles size={14} />대본 만들기</button><Busy on={busy.startsWith("대본")} label={busy} /></div>
            </section>
          </>
        ) : (
          <section className="card stack">
            <h2>📜 내 대본으로 장면 만들기 <small>— AI를 쓰지 않습니다</small></h2>
            <label>주제(제목)<input value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} placeholder="예: 내가 회사를 그만둔 진짜 이유" /></label>
            <label>대본 — 한 줄 = 한 장면(빈 줄은 무시, 카드 {MIN_CARDS}~{MAX_CARDS}장)<textarea rows={9} value={manual} onChange={(e) => setManual(e.target.value)} placeholder={"첫 줄은 인트로 내레이션\n두 번째 줄부터 장면마다 한 줄씩\n…\n마지막 줄은 아웃트로 내레이션"} /></label>
            <div className="row"><label className="row" style={{ gap: 6, fontWeight: 500 }}><input type="checkbox" checked={firstIntro} onChange={(e) => setFirstIntro(e.target.checked)} />첫 줄을 인트로로</label><label className="row" style={{ gap: 6, fontWeight: 500 }}><input type="checkbox" checked={lastOutro} onChange={(e) => setLastOutro(e.target.checked)} />마지막 줄을 아웃트로로</label></div>
            <div className="stack" style={{ gap: 8, padding: 12, borderRadius: 12, border: "1px solid var(--line, #2a2a33)" }}>
              <strong>✨ AI로 다듬기 <small className="muted">(선택 · 본인 키 · 줄 수는 그대로)</small></strong>
              <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
                {(Object.keys(REWRITE_LEVELS) as RewriteLevel[]).map((l) => (
                  <button key={l} type="button" className={`chip ${rewriteLevel === l ? "on" : ""}`} title={REWRITE_LEVELS[l].desc} disabled={!!busy} onClick={() => setRewriteLevel(l)}>{REWRITE_LEVELS[l].label}</button>
                ))}
              </div>
              <small className="muted">{REWRITE_LEVELS[rewriteLevel].desc}</small>
              <label className="row" style={{ gap: 6, fontWeight: 500 }}><input type="checkbox" checked={ownScript} disabled={!!busy} onChange={(e) => setOwnScript(e.target.checked)} />제가 직접 쓴 대본입니다(다른 사람의 대사·자막을 바꾸는 데 쓰지 않습니다).</label>
              <div className="actions">
                <button type="button" disabled={!manual.trim() || !ownScript || !!busy} onClick={() => void rewriteManual()}><Wand2 size={14} />{REWRITE_LEVELS[rewriteLevel].via} 다듬기</button>
                {manualBefore !== null && <button type="button" disabled={!!busy} onClick={() => { setManual(manualBefore); setManualBefore(null); setMsg({ text: "다듬기 전 원문으로 되돌렸습니다.", ok: true }); }}>다듬기 전으로</button>}
                <Busy on={busy.startsWith("대본을 다듬")} label={busy} />
              </div>
            </div>
            <div className="actions"><button className="primary" disabled={!manual.trim() || !!busy} onClick={makeManual}><FileText size={14} />장면 만들기</button></div>
          </section>
        )}

        {script && (
          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between" }}><h2>③ 대본 다듬기 <small>{script.source === "ai" ? `AI 대본 · ${script.model ? modelName(script.model) : ""}` : "내 대본"}</small></h2>
              <div className="actions"><button className="primary" disabled={!!busy} onClick={() => void save()}><Save size={14} />{itemId ? "보관함에 다시 저장" : "보관함에 저장"}</button><Busy on={busy.startsWith("저장")} label={busy} /></div></div>
            <div className="scene" style={hasCopy(`${script.intro.title} ${script.intro.narration}`, guardRef) ? COPY_STYLE : undefined}><div className="scene-tag">🎬<span>인트로</span>{hasCopy(`${script.intro.title} ${script.intro.narration}`, guardRef) && <CopyBadge />}</div><div className="stack" style={{ gap: 8 }}>
              <div className="row"><label>꼬리표<input value={script.intro.eyebrow} maxLength={30} onChange={(e) => upd((s) => { s.intro.eyebrow = e.target.value; return s; })} /></label><label style={{ flex: 3 }}>화면 제목<input value={script.intro.title} maxLength={50} onChange={(e) => upd((s) => { s.intro.title = e.target.value; return s; })} /></label></div>
              <label>내레이션<textarea rows={2} value={script.intro.narration} maxLength={400} onChange={(e) => upd((s) => { s.intro.narration = e.target.value; return s; })} /></label></div></div>
            {script.cards.map((c, i) => (
              <div key={i} className="scene" style={hasCopy(`${c.title} ${c.narration}`, guardRef) ? COPY_STYLE : undefined}><div className="scene-tag">{i + 1}<span>{c.tag || "카드"}</span>{hasCopy(`${c.title} ${c.narration}`, guardRef) && <CopyBadge />}
                <button type="button" className="link-button" aria-label={`${i + 1}번 카드 삭제`} disabled={script.cards.length <= MIN_CARDS} onClick={() => upd((s) => { s.cards.splice(i, 1); return s; })}><Trash2 size={13} /></button></div>
                <div className="stack" style={{ gap: 8 }}>
                  <div className="row"><label>태그<input value={c.tag ?? ""} maxLength={20} onChange={(e) => upd((s) => { s.cards[i].tag = e.target.value; return s; })} /></label><label style={{ flex: 2 }}>화면 제목<input value={c.title} maxLength={40} onChange={(e) => upd((s) => { s.cards[i].title = e.target.value; return s; })} /></label><label style={{ flex: 2 }}>한 줄 설명<input value={c.desc} maxLength={60} onChange={(e) => upd((s) => { s.cards[i].desc = e.target.value; return s; })} /></label></div>
                  <label>내레이션<textarea rows={2} value={c.narration} maxLength={400} onChange={(e) => upd((s) => { s.cards[i].narration = e.target.value; return s; })} /></label>
                </div></div>
            ))}
            {script.cards.length < MAX_CARDS && <div><button type="button" onClick={() => upd((s) => { s.cards.push({ tag: "", title: "새 카드", desc: "", narration: "" }); return s; })}><Plus size={13} />카드 추가</button></div>}
            <div className="scene" style={hasCopy(script.outro.narration, guardRef) ? COPY_STYLE : undefined}><div className="scene-tag">🏁<span>아웃트로</span>{hasCopy(script.outro.narration, guardRef) && <CopyBadge />}</div><div className="stack" style={{ gap: 8 }}>
              <div className="row"><label style={{ flex: 2 }}>화면 제목<input value={script.outro.title} maxLength={50} onChange={(e) => upd((s) => { s.outro.title = e.target.value; return s; })} /></label><label style={{ flex: 2 }}>부제<input value={script.outro.subtitle} maxLength={80} onChange={(e) => upd((s) => { s.outro.subtitle = e.target.value; return s; })} /></label></div>
              <label>행동 유도 문구(쉼표로 구분)<input value={script.outro.cta.join(", ")} onChange={(e) => upd((s) => { s.outro.cta = e.target.value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 3); return s; })} /></label>
              <label>내레이션<textarea rows={2} value={script.outro.narration} maxLength={400} onChange={(e) => upd((s) => { s.outro.narration = e.target.value; return s; })} /></label></div></div>
            <label>해시태그(공백으로 구분)<input value={script.hashtags.join(" ")} onChange={(e) => upd((s) => { s.hashtags = e.target.value.split(/\s+/).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 10); return s; })} /></label>
          </section>
        )}
      </div>
    </>
  );
}
