"use client";
import { api } from "@/components/ui/api";
import { allBgs } from "@/components/ui/useMedia";
import { normalizeBackdrop, sceneVoices, type Bg, type ShortsScript, type Voice } from "@/lib/script";
import { normalizeAudio } from "@/lib/voice";

// 화면 없이(훅 없이) 쓰는 제작 단계 — 발행 계획의 일괄 제작에서 대본 다음 단계(배경·음성·MP4)를 순서대로 처리한다.
// 각 단계는 화면에서 하는 것과 같은 서버 API를 같은 순서로 부른다(DesignView 모두 채우기·RenderView 음성 만들기와 같은 규칙).

type StockItem = { id: string; type: "image" | "video"; src: string; thumb: string; credit: string; pageUrl: string; tags?: string; width?: number; height?: number };

/** 검색어 낱말이 결과의 태그·주소 이름에 몇 개 들어 있는지(내용 맞춤 점수). 세로 결과에 약간 가산 */
const STOP = new Set(["a", "an", "the", "of", "in", "on", "and", "with", "for", "to", "at", "by", "from", "person", "people", "close", "up", "view"]);
export function stockScore(item: StockItem, query: string): number {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const hay = ` ${(item.tags ?? "").toLowerCase()} `;
  const hit = words.filter((w) => hay.includes(w) || hay.includes(w.replace(/(ing|s)$/, ""))).length;
  const vertical = item.width && item.height ? (item.height >= item.width ? 0.3 : 0) : 0;
  const korean = /\b(korean|asian|korea)\b/.test(hay) ? 0.5 : 0; // 인물은 한국인 기본(원칙 3)
  return hit + vertical + korean;
}
/** 점수가 가장 높은 결과(이미 쓴 것 제외). 결과가 없으면 null */
export function pickStock(items: StockItem[], query: string, used: Set<string>): StockItem | null {
  const pool = items.filter((x) => !used.has(x.id)); const list = pool.length ? pool : items;
  return list.reduce<StockItem | null>((best, x) => (!best || stockScore(x, query) > stockScore(best, query) ? x : best), null);
}
const sceneText = (s: ShortsScript) => [s.intro.narration || s.intro.title, ...s.cards.map((c) => `${c.title}. ${c.narration}`), s.outro.narration || s.outro.title];
function withSceneBg(s: ShortsScript, i: number, bg: Bg): ShortsScript {
  const c = structuredClone(s); const n = c.cards.length;
  if (i === 0) c.intro.bg = bg; else if (i === n + 1) c.outro.bg = bg; else c.cards[i - 1].bg = bg;
  return c;
}
function withVoice(s: ShortsScript, i: number, v: Voice): ShortsScript {
  const c = structuredClone(s); const n = c.cards.length;
  if (i === 0) c.intro.voice = v; else if (i === n + 1) c.outro.voice = v; else c.cards[i - 1].voice = v;
  return c;
}

/** 오디오 파일 재생 길이(초) — 브라우저가 파일을 읽어 잰다 */
export function measureAudio(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio(); a.preload = "metadata"; a.crossOrigin = "anonymous";
    a.onloadedmetadata = () => (Number.isFinite(a.duration) && a.duration > 0 ? resolve(Math.round(a.duration * 100) / 100) : reject(new Error("길이")));
    a.onerror = () => reject(new Error("재생")); a.src = src;
  });
}

/** 배경: AI 장면 설명(텍스트 1회) → 장면마다 스톡 검색(무료, 본인 Pixabay/Pexels 키)으로 채운다. 이미 배경이 있는 장면은 그대로 */
export async function fillBackgrounds(s: ShortsScript): Promise<ShortsScript> {
  const bd = normalizeBackdrop(s.backdrop);
  let hints = bd.hints ?? [];
  if (hints.length < s.cards.length + 2) hints = (await api<{ scenes: { query: string; prompt: string }[] }>("/api/ai/visuals", { body: { topic: s.topic, scenes: sceneText(s), style: bd.style, character: bd.character } })).scenes;
  let next: ShortsScript = { ...structuredClone(s), backdrop: { ...bd, mode: bd.mode === "theme" ? "scene" : bd.mode, hints } };
  const used = new Set<string>();
  for (let i = 0; i < s.cards.length + 2; i++) {
    const cur = i === 0 ? next.intro.bg : i === s.cards.length + 1 ? next.outro.bg : next.cards[i - 1].bg;
    if (cur || (hints[i]?.query ?? "").trim().length < 2) continue;
    const q = hints[i].query;
    const search = (type: "image" | "video") => api<{ items: StockItem[] }>("/api/stock/search", { body: { provider: bd.provider, type, query: q } }).then((r) => r.items);
    let r = pickStock(await search(bd.media ?? "video"), q, used);
    // 영상 결과가 검색어와 하나도 안 맞으면 사진으로 한 번 더 찾아 더 맞는 쪽을 쓴다(스톡 검색은 무료)
    if (bd.media !== "image" && (!r || stockScore(r, q) < 1)) {
      const img = pickStock(await search("image"), q, used);
      if (img && (!r || stockScore(img, q) > stockScore(r, q))) r = img;
    }
    if (r) { used.add(r.id); next = withSceneBg(next, i, { type: r.type, source: bd.provider ?? "pixabay", src: r.src, thumb: r.thumb, credit: r.credit, pageUrl: r.pageUrl, stockId: r.id.replace(/^[a-z]+-/, "") }); }
  }
  return next;
}

/** 음성: 음성이 없거나 내레이션이 바뀐 장면만 본인 키 TTS로 만든다(장면마다 1회) */
export async function makeVoices(s: ShortsScript, onScene?: (k: number, total: number) => void): Promise<ShortsScript> {
  let next = s; const vs = sceneVoices(s); const todo = vs.map((v, i) => (v.voice || !v.text.trim() ? -1 : i)).filter((i) => i >= 0);
  for (let k = 0; k < todo.length; k++) {
    onScene?.(k + 1, todo.length);
    const text = vs[todo[k]].text;
    const r = await api<{ path: string; src: string }>("/api/ai/tts", { body: { text, settings: normalizeAudio(next.audio) } });
    next = withVoice(next, todo[k], { path: r.path, dur: await measureAudio(r.src), text });
  }
  return next;
}

/** MP4용: 배경 요소를 모두 불러와 그리기 함수에 넘길 수 있게 하고, 소리 파일 주소를 받는다 */
export async function prepareMedia(s: ShortsScript): Promise<{ media: (bg: Bg) => CanvasImageSource | null; audioUrls: Record<string, string> }> {
  const bgs = allBgs(s);
  const voicePaths = sceneVoices(s).map((v) => v.voice?.path).filter((p): p is string => !!p);
  const bgm = normalizeAudio(s.audio).bgm?.path;
  const paths = [...bgs.map((b) => b.path).filter((p): p is string => !!p), ...voicePaths, ...(bgm ? [bgm] : [])];
  const signed = paths.length ? (await api<{ urls: Record<string, string> }>("/api/media/sign", { body: { paths } })).urls : {};
  const pb = bgs.filter((b) => b.source === "pixabay" && b.stockId).map((b) => ({ id: b.stockId!, type: b.type }));
  const fresh = pb.length ? (await api<{ urls: Record<string, { src: string }> }>("/api/stock/resolve", { body: { items: pb } })).urls : {};
  const map = new Map<Bg, CanvasImageSource>();
  await Promise.all(bgs.map((b) => new Promise<void>((done) => {
    const src = b.path ? signed[b.path] : b.source === "pixabay" && b.stockId && fresh[b.stockId] ? fresh[b.stockId].src : b.src;
    if (!src) return done();
    const to = setTimeout(done, 20000);
    if (b.type === "video") {
      const v = document.createElement("video"); v.crossOrigin = "anonymous"; v.muted = true; v.playsInline = true; v.preload = "auto";
      v.onloadeddata = () => { clearTimeout(to); map.set(b, v); done(); }; v.onerror = () => { clearTimeout(to); done(); }; v.src = src;
    } else {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => { clearTimeout(to); map.set(b, img); done(); }; img.onerror = () => { clearTimeout(to); done(); }; img.src = src;
    }
  })));
  return { media: (bg) => map.get(bg) ?? null, audioUrls: signed };
}
