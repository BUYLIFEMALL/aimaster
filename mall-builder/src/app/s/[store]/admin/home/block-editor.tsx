"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BLOCK_DEFS, BLOCK_TYPES, MAX_BLOCKS, MAX_HTML, SHOWCASE_SOURCE_LABEL, isLive, moveBlock, newBlock, validateDoc, videoEmbed,
  type BannerSettings, type Block, type BlocksDoc, type BlockType, type CategoryIconsSettings, type GallerySettings, type HtmlSettings,
  type NoticeSettings, type ProductSource, type ReviewsSettings, type ShowcaseSettings, type ShowcaseSource, type SliderSettings,
  type TabsSettings, type TimesaleSettings, type TopbarSettings, type VideoSettings,
} from "@/lib/blocks";
import AiHome from "./ai-home";
import { publishHomeAction, saveHomeDraftAction } from "@/lib/page-actions";
import { HomeBlocks } from "../../home-blocks";

// 첫 화면 편집기 — 왼쪽(위) 블록 목록·설정, 아래 미리보기. 저장은 초안, 게시해야 손님에게 보인다.
// 새 블록 종류 = src/lib/blocks.ts 등록표 + home-blocks.tsx 그리기 + 여기 SettingsForm에 칸 추가

const BUCKET = "mall-builder-public";
const MAX_BYTES = 5 * 1024 * 1024;
const input = "mt-0.5 w-full rounded border px-2 py-1.5 text-sm";
const docJson = (blocks: Block[]) => JSON.stringify(blocks);

function ImagePicker({ storeId, value, onChange, clearable }: { storeId: string; value: string; onChange: (url: string) => void; clearable?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return setError("5MB 이하 그림만 올릴 수 있습니다.");
    setBusy(true);
    setError("");
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${storeId}/banners/${crypto.randomUUID()}.${ext}`;
    const { error: upError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (upError) return setError(`올리기 실패: ${upError.message}`);
    onChange(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return (
    <div className="flex items-center gap-2">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-14 w-24 rounded border object-cover" />
      ) : (
        <span className="flex h-14 w-24 items-center justify-center rounded border border-dashed text-xs text-gray-400">그림 없음</span>
      )}
      <label className="cursor-pointer rounded border px-2 py-1 text-xs">
        {busy ? "올리는 중…" : value ? "그림 바꾸기" : "그림 올리기"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
      </label>
      {clearable && value && <button type="button" onClick={() => onChange("")} className="text-xs text-red-700">지우기</button>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

/** 휴대폰(폭 767px 이하)에서 대신 보일 그림 — 비우면 위 그림을 그대로 쓴다 */
function MobileImagePicker({ storeId, value, onChange }: { storeId: string; value: string; onChange: (url: string) => void }) {
  return (
    <div data-mobile-image>
      <span className="text-xs text-gray-500">휴대폰용 그림(선택 — 세로로 긴 그림을 따로 넣으면 휴대폰에서 이 그림이 보입니다)</span>
      <div className="mt-0.5"><ImagePicker storeId={storeId} value={value} onChange={onChange} clearable /></div>
    </div>
  );
}

function LinkInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">누르면 갈 주소(비워도 됨, /로 시작하는 이 몰 주소나 https 주소)</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="예: /s/몰주소/c/카테고리" className={input} />
    </label>
  );
}

function NumberInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input type="number" value={value} min={min} max={max} onChange={(e) => onChange(Number(e.target.value))} className={input} />
    </label>
  );
}

export type Option = { id: string; name: string };

/** D28 한국 시간 입력칸 ↔ ISO */
const KST = 9 * 3600_000;
export const toLocalKst = (iso: string | undefined) => (iso ? new Date(Date.parse(iso) + KST).toISOString().slice(0, 16) : "");
export const fromLocalKst = (v: string) => (v ? new Date(Date.parse(`${v}:00+09:00`)).toISOString() : "");

/** 상품 고르는 방법(쇼윈도·탭·타임세일 공통) */
function SourcePicker({ name, value, categories, products, onChange }: { name: string; value: ProductSource; categories: Option[]; products: Option[]; onChange: (v: ProductSource) => void }) {
  const picked = new Set(value.product_ids);
  const toggle = (id: string) => onChange({ ...value, product_ids: picked.has(id) ? value.product_ids.filter((x) => x !== id) : [...value.product_ids, id] });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-sm" role="radiogroup" aria-label="상품 고르는 방법">
        {(Object.keys(SHOWCASE_SOURCE_LABEL) as ShowcaseSource[]).map((k) => (
          <label key={k} className="flex items-center gap-1">
            <input type="radio" name={name} checked={value.source === k} onChange={() => onChange({ ...value, source: k })} /> {SHOWCASE_SOURCE_LABEL[k]}
          </label>
        ))}
      </div>
      {value.source === "category" && (
        <select value={value.category_id} onChange={(e) => onChange({ ...value, category_id: e.target.value })} className={input}>
          <option value="">— 카테고리 고르기 —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      {value.source === "manual" && (
        <ul className="max-h-40 overflow-y-auto rounded border text-sm">
          {products.map((p) => (
            <li key={p.id}>
              <label className="flex items-center gap-2 px-2 py-1">
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="flex-1 truncate">{p.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TitleInput({ value, onChange, hint = "제목(비우면 제목 없이)" }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{hint}</span>
      <input value={value} maxLength={40} onChange={(e) => onChange(e.target.value)} className={input} />
    </label>
  );
}

export function SettingsForm({ storeId, block, categories, products, onChange }: {
  storeId: string; block: Block; categories: Option[]; products: Option[]; onChange: (s: Block["settings"]) => void;
}) {
  if (block.type === "video") {
    const s = block.settings as VideoSettings;
    return (
      <div className="space-y-3">
        <TitleInput value={s.title} onChange={(title) => onChange({ ...s, title })} />
        <label className="block">
          <span className="text-xs text-gray-500">유튜브 또는 비메오 영상 주소</span>
          <input value={s.url} onChange={(e) => onChange({ ...s, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" className={input} />
        </label>
        {s.url && !videoEmbed(s.url) && <p className="text-xs text-red-600">유튜브·비메오 주소가 아닙니다.</p>}
      </div>
    );
  }
  if (block.type === "tabs") {
    const s = block.settings as TabsSettings;
    const setTab = (i: number, patch: Partial<TabsSettings["tabs"][number]>) => onChange({ ...s, tabs: s.tabs.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
    return (
      <div className="space-y-3">
        <TitleInput value={s.title} onChange={(title) => onChange({ ...s, title })} />
        {s.tabs.map((t, i) => (
          <div key={i} className="rounded border p-2">
            <div className="flex items-center gap-2">
              <input value={t.label} maxLength={20} onChange={(e) => setTab(i, { label: e.target.value })} placeholder={`${i + 1}번째 탭 이름`} className={input} />
              {s.tabs.length > 2 && <button type="button" onClick={() => onChange({ ...s, tabs: s.tabs.filter((_, j) => j !== i) })} className="text-xs text-red-700">빼기</button>}
            </div>
            <div className="mt-2"><SourcePicker name={`tab-${block.id}-${i}`} value={t} categories={categories} products={products} onChange={(v) => setTab(i, v)} /></div>
          </div>
        ))}
        {s.tabs.length < 5 && <button type="button" onClick={() => onChange({ ...s, tabs: [...s.tabs, { label: "", source: "new", category_id: "", product_ids: [] }] })} className="rounded border px-2 py-1 text-xs">+ 탭 추가</button>}
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="큰 화면 열 수(2~5)" value={s.columns} min={2} max={5} onChange={(columns) => onChange({ ...s, columns })} />
          <NumberInput label="탭마다 최대 상품 수(2~24)" value={s.limit} min={2} max={24} onChange={(limit) => onChange({ ...s, limit })} />
        </div>
      </div>
    );
  }
  if (block.type === "timesale") {
    const s = block.settings as TimesaleSettings;
    return (
      <div className="space-y-3">
        <TitleInput value={s.title} onChange={(title) => onChange({ ...s, title })} hint="제목" />
        <label className="block">
          <span className="text-xs text-gray-500">한 줄 설명(선택)</span>
          <input value={s.subtitle} maxLength={60} onChange={(e) => onChange({ ...s, subtitle: e.target.value })} className={input} />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">끝나는 시각(한국 시간) — 지나면 손님 화면에서 자동으로 사라짐. 가격은 그대로입니다</span>
          <input type="datetime-local" value={toLocalKst(s.ends_at)} onChange={(e) => onChange({ ...s, ends_at: fromLocalKst(e.target.value) })} className={input} />
        </label>
        <SourcePicker name={`ts-${block.id}`} value={s} categories={categories} products={products} onChange={(v) => onChange({ ...s, ...v })} />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="큰 화면 열 수(2~5)" value={s.columns} min={2} max={5} onChange={(columns) => onChange({ ...s, columns })} />
          <NumberInput label="최대 상품 수(2~24)" value={s.limit} min={2} max={24} onChange={(limit) => onChange({ ...s, limit })} />
        </div>
      </div>
    );
  }
  if (block.type === "reviews") {
    const s = block.settings as ReviewsSettings;
    return (
      <div className="space-y-3">
        <TitleInput value={s.title} onChange={(title) => onChange({ ...s, title })} hint="제목" />
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="보여 줄 후기 수(3~12)" value={s.count} min={3} max={12} onChange={(count) => onChange({ ...s, count })} />
          <NumberInput label="별점 이상만(1~5)" value={s.min_rating} min={1} max={5} onChange={(min_rating) => onChange({ ...s, min_rating })} />
        </div>
        <p className="text-xs text-gray-500">손님 이름은 가려지고, 「후기」 메뉴에서 숨긴 후기는 나오지 않습니다.</p>
      </div>
    );
  }
  if (block.type === "category_icons") {
    const s = block.settings as CategoryIconsSettings;
    const setItem = (i: number, patch: Partial<CategoryIconsSettings["items"][number]>) => onChange({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
    return (
      <div className="space-y-3">
        <TitleInput value={s.title} onChange={(title) => onChange({ ...s, title })} />
        {s.items.map((it, i) => (
          <div key={i} className="rounded border p-2">
            <div className="flex items-center gap-2">
              <select value={it.category_id} onChange={(e) => setItem(i, { category_id: e.target.value })} className={input}>
                <option value="">— 카테고리 —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={it.emoji} maxLength={4} onChange={(e) => setItem(i, { emoji: e.target.value })} placeholder="🍎" title="그림 대신 이모지" className="mt-0.5 w-14 rounded border px-2 py-1.5 text-center" />
              <button type="button" onClick={() => onChange({ ...s, items: s.items.filter((_, j) => j !== i) })} className="text-xs text-red-700">빼기</button>
            </div>
            <div className="mt-1"><ImagePicker storeId={storeId} value={it.image} onChange={(image) => setItem(i, { image })} clearable /></div>
          </div>
        ))}
        {s.items.length < 12 && <button type="button" onClick={() => onChange({ ...s, items: [...s.items, { category_id: "", image: "", emoji: "" }] })} className="rounded border px-2 py-1 text-xs">+ 카테고리 추가</button>}
        <p className="text-xs text-gray-500">그림을 올리면 그림, 없으면 이모지가 둥근 아이콘으로 보입니다. 2~12개.</p>
      </div>
    );
  }
  if (block.type === "gallery") {
    const s = block.settings as GallerySettings;
    const setItem = (i: number, patch: Partial<GallerySettings["items"][number]>) => onChange({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
    return (
      <div className="space-y-3">
        <TitleInput value={s.title} onChange={(title) => onChange({ ...s, title })} />
        {s.items.map((it, i) => (
          <div key={i} className="rounded border p-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{i + 1}번째 사진</span>
              <button type="button" onClick={() => onChange({ ...s, items: s.items.filter((_, j) => j !== i) })} className="text-red-700">빼기</button>
            </div>
            <div className="mt-1"><ImagePicker storeId={storeId} value={it.image} onChange={(image) => setItem(i, { image })} /></div>
            <div className="mt-1"><LinkInput value={it.link} onChange={(link) => setItem(i, { link })} /></div>
          </div>
        ))}
        {s.items.length < 24 && <button type="button" onClick={() => onChange({ ...s, items: [...s.items, { image: "", link: "" }] })} className="rounded border px-2 py-1 text-xs">+ 사진 추가</button>}
        <NumberInput label="큰 화면 열 수(2~6, 휴대폰은 3열)" value={s.columns} min={2} max={6} onChange={(columns) => onChange({ ...s, columns })} />
      </div>
    );
  }
  if (block.type === "topbar") {
    const s = block.settings as TopbarSettings;
    const setItem = (i: number, patch: Partial<TopbarSettings["items"][number]>) => onChange({ ...s, items: s.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
    return (
      <div className="space-y-3">
        {s.items.map((it, i) => (
          <div key={i} className="rounded border p-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{i + 1}번째 문구</span>
              {s.items.length > 1 && <button type="button" onClick={() => onChange({ ...s, items: s.items.filter((_, j) => j !== i) })} className="text-red-700">빼기</button>}
            </div>
            <div className="mt-1 flex gap-2">
              <input value={it.text} maxLength={60} onChange={(e) => setItem(i, { text: e.target.value })} placeholder="한 줄 알림 문구" className={input} />
              <input type="color" value={it.bg} onChange={(e) => setItem(i, { bg: e.target.value })} title="배경색" className="mt-0.5 h-9 w-12 rounded border" />
            </div>
            <div className="mt-1"><LinkInput value={it.link} onChange={(link) => setItem(i, { link })} /></div>
          </div>
        ))}
        {s.items.length < 5 && <button type="button" onClick={() => onChange({ ...s, items: [...s.items, { text: "", link: "", bg: "#111827" }] })} className="rounded border px-2 py-1 text-xs">+ 문구 추가</button>}
        <NumberInput label="여러 줄일 때 바뀌는 간격(초, 2~10)" value={s.rotate_sec} min={2} max={10} onChange={(rotate_sec) => onChange({ ...s, rotate_sec })} />
      </div>
    );
  }
  if (block.type === "slider") {
    const s = block.settings as SliderSettings;
    const setSlide = (i: number, patch: Partial<SliderSettings["slides"][number]>) => onChange({ ...s, slides: s.slides.map((sl, j) => (j === i ? { ...sl, ...patch } : sl)) });
    return (
      <div className="space-y-3">
        {s.slides.map((sl, i) => (
          <div key={i} className="rounded border p-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{i + 1}번째 그림</span>
              <button type="button" onClick={() => onChange({ ...s, slides: s.slides.filter((_, j) => j !== i) })} className="text-red-700">빼기</button>
            </div>
            <div className="mt-1"><ImagePicker storeId={storeId} value={sl.image} onChange={(image) => setSlide(i, { image })} /></div>
            <div className="mt-1"><MobileImagePicker storeId={storeId} value={sl.mobile_image ?? ""} onChange={(mobile_image) => setSlide(i, { mobile_image })} /></div>
            <div className="mt-1"><LinkInput value={sl.link} onChange={(link) => setSlide(i, { link })} /></div>
          </div>
        ))}
        {s.slides.length < 8 && <button type="button" onClick={() => onChange({ ...s, slides: [...s.slides, { image: "", mobile_image: "", link: "" }] })} className="rounded border px-2 py-1 text-xs">+ 그림 추가</button>}
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="높이(px, 200~800)" value={s.height} min={200} max={800} onChange={(height) => onChange({ ...s, height })} />
          <NumberInput label="자동 넘김(초, 0이면 멈춤)" value={s.autoplay_sec} min={0} max={10} onChange={(autoplay_sec) => onChange({ ...s, autoplay_sec })} />
        </div>
      </div>
    );
  }
  if (block.type === "showcase") {
    const s = block.settings as ShowcaseSettings;
    const picked = new Set(s.product_ids);
    const toggle = (id: string) => onChange({ ...s, product_ids: picked.has(id) ? s.product_ids.filter((x) => x !== id) : [...s.product_ids, id] });
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-gray-500">제목(비우면 제목 없이)</span>
          <input value={s.title} maxLength={40} onChange={(e) => onChange({ ...s, title: e.target.value })} className={input} />
        </label>
        <div className="flex flex-wrap gap-3 text-sm" role="radiogroup" aria-label="상품 고르는 방법">
          {(Object.keys(SHOWCASE_SOURCE_LABEL) as ShowcaseSource[]).map((k) => (
            <label key={k} className="flex items-center gap-1">
              <input type="radio" name={`src-${block.id}`} checked={s.source === k} onChange={() => onChange({ ...s, source: k })} /> {SHOWCASE_SOURCE_LABEL[k]}
            </label>
          ))}
        </div>
        {s.source === "category" && (
          <label className="block">
            <span className="text-xs text-gray-500">카테고리(하위 카테고리 상품도 함께)</span>
            <select value={s.category_id} onChange={(e) => onChange({ ...s, category_id: e.target.value })} className={input}>
              <option value="">— 고르세요 —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        {s.source === "manual" && (
          <div>
            <span className="text-xs text-gray-500">보여 줄 상품({s.product_ids.length}개 고름 — 고른 순서대로 보임)</span>
            <ul className="mt-1 max-h-48 overflow-y-auto rounded border text-sm" data-product-picker>
              {products.length === 0 && <li className="px-2 py-1 text-gray-500">판매 중인 상품이 없습니다.</li>}
              {products.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 px-2 py-1">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                    <span className="flex-1 truncate">{p.name}</span>
                    {picked.has(p.id) && <span className="text-xs text-gray-500">{s.product_ids.indexOf(p.id) + 1}번째</span>}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="큰 화면 열 수(2~5, 휴대폰은 2열)" value={s.columns} min={2} max={5} onChange={(columns) => onChange({ ...s, columns })} />
          <NumberInput label="최대 상품 수(2~24)" value={s.limit} min={2} max={24} onChange={(limit) => onChange({ ...s, limit })} />
        </div>
      </div>
    );
  }
  if (block.type === "html") {
    const s = block.settings as HtmlSettings;
    return (
      <label className="block">
        <span className="text-xs text-gray-500">HTML(제목 h2~h4·문단·굵게·목록·표·그림·링크). 스크립트·iframe·style 등은 저장할 때 지워집니다.</span>
        <textarea value={s.html} maxLength={MAX_HTML} rows={8} onChange={(e) => onChange({ html: e.target.value })} className={`${input} font-mono`} />
      </label>
    );
  }
  if (block.type === "notice") {
    const s = block.settings as NoticeSettings;
    return (
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-gray-500">제목</span>
          <input value={s.title} maxLength={40} onChange={(e) => onChange({ ...s, title: e.target.value })} className={input} />
        </label>
        <NumberInput label="보여 줄 공지 수(3~10)" value={s.count} min={3} max={10} onChange={(count) => onChange({ ...s, count })} />
        <p className="text-xs text-gray-500">공지 글은 관리 메뉴 「공지」에서 씁니다.</p>
      </div>
    );
  }
  const s = block.settings as BannerSettings;
  return (
    <div className="space-y-3">
      <ImagePicker storeId={storeId} value={s.image} onChange={(image) => onChange({ ...s, image })} />
      <MobileImagePicker storeId={storeId} value={s.mobile_image ?? ""} onChange={(mobile_image) => onChange({ ...s, mobile_image })} />
      <LinkInput value={s.link} onChange={(link) => onChange({ ...s, link })} />
      <NumberInput label="최대 너비(px, 320~1600)" value={s.max_width} min={320} max={1600} onChange={(max_width) => onChange({ ...s, max_width })} />
    </div>
  );
}

export default function BlockEditor({ slug, storeId, categories, products, initial, published, draftAt, publishedAt }: {
  slug: string; storeId: string; categories: Option[]; products: Option[]; initial: BlocksDoc; published: BlocksDoc | null; draftAt: string | null; publishedAt: string | null;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [selected, setSelected] = useState<string | null>(initial.blocks[0]?.id ?? null);
  const [saved, setSaved] = useState(docJson(initial.blocks));
  const [live, setLive] = useState(published ? docJson(published.blocks) : null);
  const [times, setTimes] = useState({ draftAt, publishedAt });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const now = docJson(blocks);
  const dirty = now !== saved;
  const unpublished = live === null ? blocks.length > 0 : now !== live;
  const check = useMemo(() => validateDoc({ blocks }), [blocks]);
  const current = blocks.find((b) => b.id === selected) ?? null;

  const update = (id: string, patch: Partial<Block>) => setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  function add(type: BlockType) {
    const b = newBlock(type);
    setBlocks((bs) => [...bs, b]);
    setSelected(b.id);
  }
  function remove(id: string) {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
  }
  function run(kind: "save" | "publish") {
    setMsg(null);
    start(async () => {
      const r = kind === "save" ? await saveHomeDraftAction(slug, storeId, { blocks }) : await publishHomeAction(slug, storeId, { blocks });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setSaved(now);
      if (kind === "publish") {
        setLive(now);
        setTimes({ draftAt: r.at, publishedAt: r.at });
        setMsg({ ok: true, text: "게시했습니다. 손님 첫 화면에 바로 보입니다." });
      } else {
        setTimes((t) => ({ ...t, draftAt: r.at }));
        setMsg({ ok: true, text: "초안을 저장했습니다. 게시하기 전까지 손님에게는 보이지 않습니다." });
      }
    });
  }
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR") : "없음");

  function applyAi(list: Block[], mode: "replace" | "append") {
    setBlocks((bs) => (mode === "replace" ? list : [...bs, ...list].slice(0, MAX_BLOCKS)));
    setSelected(list[0]?.id ?? null);
  }

  return (
    <div className="space-y-6">
      <AiHome slug={slug} count={blocks.length} onApply={applyAi} />
      <div className="flex flex-wrap items-center gap-2 rounded bg-gray-50 px-3 py-2 text-sm">
        <span>초안 저장: {when(times.draftAt)}</span>
        <span className="text-gray-300">|</span>
        <span>게시: {when(times.publishedAt)}</span>
        {dirty && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">저장 안 한 변경</span>}
        {unpublished && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">게시 안 된 변경</span>}
      </div>

      <section>
        <h2 className="text-sm font-semibold">블록 ({blocks.length}/{MAX_BLOCKS})</h2>
        {blocks.length === 0 && <p className="mt-2 text-sm text-gray-500">아직 블록이 없습니다. 아래에서 블록을 추가해 첫 화면을 꾸며 보세요. 블록이 없으면 손님 첫 화면에는 신상품 목록만 보입니다.</p>}
        <ul className="mt-2 divide-y rounded border">
          {blocks.map((b, i) => (
            <li key={b.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${selected === b.id ? "bg-blue-50" : ""}`}>
              <button type="button" onClick={() => setSelected(b.id)} className="flex-1 text-left">
                <b>{BLOCK_DEFS[b.type].label}</b>
                {!b.visible && <span className="ml-2 text-xs text-gray-500">(숨김)</span>}
                {b.visible && (b.show_from || b.show_until || b.type === "timesale") && !isLive(b) && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800" data-schedule-badge>
                    {b.show_from && Date.now() < Date.parse(b.show_from) ? `예약 ${toLocalKst(b.show_from).replace("T", " ")}` : "끝남"}
                  </span>
                )}
              </button>
              <button type="button" aria-label="위로" disabled={i === 0} onClick={() => setBlocks((bs) => moveBlock(bs, i, -1))} className="px-1 disabled:opacity-30">↑</button>
              <button type="button" aria-label="아래로" disabled={i === blocks.length - 1} onClick={() => setBlocks((bs) => moveBlock(bs, i, 1))} className="px-1 disabled:opacity-30">↓</button>
              <button type="button" onClick={() => update(b.id, { visible: !b.visible })} className="px-1 text-xs text-gray-600">{b.visible ? "숨기기" : "보이기"}</button>
              <button type="button" onClick={() => remove(b.id)} className="px-1 text-xs text-red-700">빼기</button>
            </li>
          ))}
        </ul>
        {blocks.length < MAX_BLOCKS && (
          <div className="mt-2 flex flex-wrap gap-2">
            {BLOCK_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => add(t)} title={BLOCK_DEFS[t].description} className="rounded border px-2 py-1 text-xs">
                + {BLOCK_DEFS[t].label}
              </button>
            ))}
          </div>
        )}
      </section>

      {current && (
        <section className="rounded border p-3">
          <h2 className="mb-2 text-sm font-semibold">{BLOCK_DEFS[current.type].label} 설정</h2>
          <SettingsForm storeId={storeId} block={current} categories={categories} products={products} onChange={(settings) => update(current.id, { settings })} />
          <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2" data-schedule>
            <label className="block">
              <span className="text-xs text-gray-500">보이기 시작(한국 시간, 비우면 바로)</span>
              <input type="datetime-local" value={toLocalKst(current.show_from)} onChange={(e) => update(current.id, { show_from: fromLocalKst(e.target.value) })} className={input} />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">보이기 끝(한국 시간, 비우면 계속)</span>
              <input type="datetime-local" value={toLocalKst(current.show_until)} onChange={(e) => update(current.id, { show_until: fromLocalKst(e.target.value) })} className={input} />
            </label>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || !dirty} onClick={() => run("save")} className="rounded border px-3 py-1.5 text-sm disabled:opacity-40">초안 저장</button>
        <button type="button" disabled={pending || !check.ok || (!dirty && !unpublished)} onClick={() => run("publish")} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">손님 화면에 게시</button>
        {live !== null && now !== live && (
          <button type="button" disabled={pending} onClick={() => { const p = JSON.parse(live) as Block[]; setBlocks(p); setSelected(p[0]?.id ?? null); }} className="text-xs text-gray-600 underline">게시본으로 되돌리기</button>
        )}
        {pending && <span className="text-xs text-gray-500">처리 중…</span>}
      </div>
      {!check.ok && <p className="text-sm text-red-600">게시 전에 고칠 곳: {check.error}</p>}
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}

      <section>
        <h2 className="text-sm font-semibold">미리보기 (손님 첫 화면 위쪽에 보일 모습)</h2>
        <div className="mt-2 overflow-hidden rounded border py-4">
          {blocks.some((b) => b.visible) ? <HomeBlocks blocks={blocks.filter((b) => validateDoc({ blocks: [b] }).ok)} /> : <p className="px-4 text-sm text-gray-500">보이는 블록이 없습니다.</p>}
        </div>
        <p className="mt-1 text-xs text-gray-500">그림을 아직 안 올린 블록은 미리보기에 나오지 않습니다. 글·HTML은 위험 태그를 지운 결과로 보입니다.</p>
      </section>
    </div>
  );
}
