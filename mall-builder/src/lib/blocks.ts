// 첫 화면 블록 — 블록 등록표(종류마다 이름·기본값·검사). 편집기와 손님 화면이 이 표 하나를 쓴다(docs/mall/ARCHITECTURE.md §6)
// 새 블록 = 여기에 종류 하나 추가 + 손님 화면 그리기(home-blocks.tsx) + 편집 칸(block-editor.tsx)
// 서버 데이터가 필요한 블록(쇼윈도·공지)은 손님 첫 화면(서버)이 내용을 만들어 slots로 넘긴다
// html은 validateDoc에서 위험 태그를 지운다 — 저장할 때와 readDoc(손님 화면 읽기) 두 번 거친다
// 저장 모양: { schema_version: 1, blocks: [{ id, type, visible, settings }] } — DB mall_builder_pages.draft_blocks / published_blocks

import { sanitizeHtml } from "./sanitize.ts";

export const SCHEMA_VERSION = 1;
export const MAX_BLOCKS = 30;

export type TopbarSettings = { items: { text: string; link: string; bg: string }[]; rotate_sec: number };
// mobile_image: 휴대폰(폭 767px 이하)에서 대신 보일 그림. 비우면 image를 그대로 쓴다(옛 저장본은 칸이 없어 "")
export type SliderSettings = { slides: { image: string; mobile_image: string; link: string }[]; height: number; autoplay_sec: number };
export type BannerSettings = { image: string; mobile_image: string; link: string; max_width: number };
export type ShowcaseSource = "new" | "category" | "manual";
export type ShowcaseSettings = { title: string; source: ShowcaseSource; category_id: string; product_ids: string[]; columns: number; limit: number };
export type HtmlSettings = { html: string };
export type NoticeSettings = { title: string; count: number };
// D28 새 블록 6종(2026-11-11, 주인님 「추천안 4가지 그대로」)
export type VideoSettings = { url: string; title: string }; // 유튜브·비메오 주소만(저장 비용 없음)
export type ProductSource = { source: ShowcaseSource; category_id: string; product_ids: string[] };
export type TabsSettings = { title: string; tabs: ({ label: string } & ProductSource)[]; columns: number; limit: number };
export type TimesaleSettings = { title: string; subtitle: string; ends_at: string; columns: number; limit: number } & ProductSource; // 표시만(가격은 그대로), 끝나면 자동 숨김
export type ReviewsSettings = { title: string; count: number; min_rating: number };
export type CategoryIconsSettings = { title: string; items: { category_id: string; image: string; emoji: string }[] };
export type GallerySettings = { title: string; columns: number; items: { image: string; link: string }[] }; // 인스타 대신 운영자가 직접 올리는 사진 격자

export type BlockSettingsMap = {
  topbar: TopbarSettings;
  slider: SliderSettings;
  banner: BannerSettings;
  showcase: ShowcaseSettings;
  html: HtmlSettings;
  notice: NoticeSettings;
  video: VideoSettings;
  tabs: TabsSettings;
  timesale: TimesaleSettings;
  reviews: ReviewsSettings;
  category_icons: CategoryIconsSettings;
  gallery: GallerySettings;
};

export const SHOWCASE_SOURCE_LABEL: Record<ShowcaseSource, string> = { new: "신상품", category: "카테고리", manual: "직접 선택" };
export const MAX_HTML = 20000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type BlockType = keyof BlockSettingsMap;
// show_from·show_until: 예약 노출(D28, ISO 시각). 둘 다 선택 — 옛 저장본은 칸이 없어 항상 보임
// style: 블록 공통 겉모양(디자인 빌더 D2-4, 프로셀 블록 공통 칸 참고). 선택 — 기본값은 저장하지 않으므로 옛 저장본·기본 블록은 칸이 없다
export type BlockStyle = {
  pad_top?: number; // 위 여백(px)
  pad_bottom?: number; // 아래 여백(px)
  width?: "full"; // 배경을 화면 끝까지(기본 = 본문 폭)
  bg_color?: string; // 배경색 #rrggbb
  title_align?: "center"; // 제목 가운데(기본 = 왼쪽)
  hide_pc?: true; // PC(768px 이상)에서 숨김
  hide_mobile?: true; // 휴대폰(767px 이하)에서 숨김
};
export type Block<T extends BlockType = BlockType> = { id: string; type: T; visible: boolean; settings: BlockSettingsMap[T]; show_from?: string; show_until?: string; style?: BlockStyle };
export type BlocksDoc = { schema_version: number; blocks: Block[] };

type Def<T extends BlockType> = { label: string; description: string; defaults: () => BlockSettingsMap[T]; validate: (s: unknown) => { ok: true; value: BlockSettingsMap[T] } | { ok: false; error: string } };

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

/** 링크: 비우거나, 이 사이트 안 경로(/로 시작), 또는 https 주소만 */
export function safeLink(v: unknown): string | null {
  const s = str(v);
  if (!s) return "";
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 300);
  if (/^https:\/\/[^\s"'<>]+$/.test(s) && s.length <= 500) return s;
  return null;
}

/** 이미지 주소: https만 */
export function safeImage(v: unknown): string | null {
  const s = str(v);
  return /^https:\/\/[^\s"'<>]+$/.test(s) && s.length <= 1000 ? s : null;
}

/** 선택 그림 주소: 비우면 "", 넣었으면 https만 */
export function optionalImage(v: unknown): string | null {
  return str(v) ? safeImage(v) : "";
}

const MOBILE_IMAGE_ERROR = "휴대폰용 그림 주소가 올바르지 않습니다(https 주소). 다시 올리거나 지워 주세요.";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** 동영상 주소 → 넣을 주소(유튜브는 쿠키 없는 주소). 유튜브·비메오가 아니면 null */
export function videoEmbed(url: unknown): string | null {
  const s = str(url);
  const yt = s.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = s.match(/^https:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?:[?#/].*)?$/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/** 상품 고르는 방법(쇼윈도·탭·타임세일 공통) */
function validateSource(raw: Partial<ProductSource>): { ok: true; value: ProductSource } | { ok: false; error: string } {
  const source: ShowcaseSource = raw.source === "category" || raw.source === "manual" ? raw.source : "new";
  const category_id = str(raw.category_id);
  const product_ids = [...new Set((Array.isArray(raw.product_ids) ? raw.product_ids : []).map(str).filter((x) => UUID.test(x)))].slice(0, 24);
  if (source === "category" && !UUID.test(category_id)) return { ok: false, error: "보여 줄 카테고리를 골라 주세요." };
  if (source === "manual" && !product_ids.length) return { ok: false, error: "보여 줄 상품을 1개 이상 골라 주세요." };
  return { ok: true, value: { source, category_id: source === "category" ? category_id : "", product_ids: source === "manual" ? product_ids : [] } };
}

/** 시각 칸: 비우면 "", 읽을 수 있는 시각이면 ISO, 아니면 null */
export function isoOrEmpty(v: unknown): string | null {
  const s = str(v);
  if (!s) return "";
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export const MAX_PAD = 160;

/** 블록 공통 겉모양 정리 — 모르는 칸·틀린 값·기본값은 버린다(값이 하나도 없으면 null = 저장 안 함) */
export function normalizeStyle(raw: unknown): BlockStyle | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: BlockStyle = {};
  const pad = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n <= MAX_PAD ? n : 0;
  };
  if (pad(r.pad_top)) out.pad_top = pad(r.pad_top);
  if (pad(r.pad_bottom)) out.pad_bottom = pad(r.pad_bottom);
  if (r.width === "full") out.width = "full";
  const bg = str(r.bg_color).toLowerCase();
  if (HEX.test(bg)) out.bg_color = bg;
  if (r.title_align === "center") out.title_align = "center";
  if (r.hide_pc === true) out.hide_pc = true;
  if (r.hide_mobile === true) out.hide_mobile = true;
  return Object.keys(out).length ? out : null;
}

/** 지금 손님에게 보일 블록인가 — 숨김·예약 노출 시각·타임세일 끝 시각 */
export function isLive(b: Block, now = Date.now()): boolean {
  if (!b.visible) return false;
  if (b.show_from && now < Date.parse(b.show_from)) return false;
  if (b.show_until && now >= Date.parse(b.show_until)) return false;
  if (b.type === "timesale" && now >= Date.parse((b.settings as TimesaleSettings).ends_at)) return false;
  return true;
}

export const BLOCK_DEFS: { [K in BlockType]: Def<K> } = {
  topbar: {
    label: "띠 배너",
    description: "맨 위 한 줄 알림(여러 줄이면 돌아가며 보임)",
    defaults: () => ({ items: [{ text: "회원가입하고 사업자 가격을 받아 보세요", link: "", bg: "#111827" }], rotate_sec: 4 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<TopbarSettings>;
      const items = Array.isArray(s.items) ? s.items : [];
      if (items.length < 1 || items.length > 5) return { ok: false, error: "띠 배너 문구는 1~5줄로 넣어 주세요." };
      const out: TopbarSettings["items"] = [];
      for (const it of items) {
        const text = str(it?.text);
        if (text.length < 1 || text.length > 60) return { ok: false, error: "띠 배너 문구는 한 줄에 1~60자입니다." };
        const link = safeLink(it?.link);
        if (link === null) return { ok: false, error: "링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다." };
        const bg = HEX.test(str(it?.bg)) ? str(it?.bg) : "#111827";
        out.push({ text, link, bg });
      }
      return { ok: true, value: { items: out, rotate_sec: int(s.rotate_sec, 2, 10, 4) } };
    },
  },
  slider: {
    label: "슬라이드 배너",
    description: "큰 그림 여러 장이 넘어가는 배너",
    defaults: () => ({ slides: [], height: 400, autoplay_sec: 5 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<SliderSettings>;
      const slides = Array.isArray(s.slides) ? s.slides : [];
      if (slides.length < 1 || slides.length > 8) return { ok: false, error: "슬라이드 그림은 1~8장으로 넣어 주세요." };
      const out: SliderSettings["slides"] = [];
      for (const sl of slides) {
        const image = safeImage(sl?.image);
        if (!image) return { ok: false, error: "슬라이드마다 그림을 올려 주세요(https 주소)." };
        const mobile_image = optionalImage(sl?.mobile_image);
        if (mobile_image === null) return { ok: false, error: MOBILE_IMAGE_ERROR };
        const link = safeLink(sl?.link);
        if (link === null) return { ok: false, error: "링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다." };
        out.push({ image, mobile_image, link });
      }
      return { ok: true, value: { slides: out, height: int(s.height, 200, 800, 400), autoplay_sec: int(s.autoplay_sec, 0, 10, 5) } };
    },
  },
  banner: {
    label: "단일 배너",
    description: "그림 한 장(누르면 링크로)",
    defaults: () => ({ image: "", mobile_image: "", link: "", max_width: 1100 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<BannerSettings>;
      const image = safeImage(s.image);
      if (!image) return { ok: false, error: "배너 그림을 올려 주세요(https 주소)." };
      const mobile_image = optionalImage(s.mobile_image);
      if (mobile_image === null) return { ok: false, error: MOBILE_IMAGE_ERROR };
      const link = safeLink(s.link);
      if (link === null) return { ok: false, error: "링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다." };
      return { ok: true, value: { image, mobile_image, link, max_width: int(s.max_width, 320, 1600, 1100) } };
    },
  },
  showcase: {
    label: "상품 쇼윈도",
    description: "상품 묶음(신상품·카테고리·직접 고른 상품)",
    defaults: () => ({ title: "추천 상품", source: "new", category_id: "", product_ids: [], columns: 4, limit: 8 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<ShowcaseSettings>;
      const src = validateSource(s);
      if (!src.ok) return src;
      return { ok: true, value: { title: str(s.title).slice(0, 40), ...src.value, columns: int(s.columns, 2, 5, 4), limit: int(s.limit, 2, 24, 8) } };
    },
  },
  html: {
    label: "글·HTML",
    description: "자유 글(굵게·목록·표·그림·링크). 스크립트 등 위험한 태그는 저장할 때 지워진다",
    defaults: () => ({ html: "<h3>제목</h3><p>내용을 입력하세요.</p>" }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<HtmlSettings>;
      if (typeof s.html !== "string" || s.html.length > MAX_HTML) return { ok: false, error: `글은 ${MAX_HTML.toLocaleString()}자까지 넣을 수 있습니다.` };
      const html = sanitizeHtml(s.html);
      if (!html) return { ok: false, error: "글 내용을 넣어 주세요." };
      return { ok: true, value: { html } };
    },
  },
  notice: {
    label: "공지",
    description: "최근 공지 제목 목록(공지 메뉴에서 쓴 글, 상단 고정 먼저)",
    defaults: () => ({ title: "공지사항", count: 5 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<NoticeSettings>;
      return { ok: true, value: { title: str(s.title).slice(0, 40) || "공지사항", count: int(s.count, 3, 10, 5) } };
    },
  },
  video: {
    label: "동영상",
    description: "유튜브·비메오 영상(주소만 넣으면 됨)",
    defaults: () => ({ url: "", title: "" }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<VideoSettings>;
      if (!videoEmbed(s.url)) return { ok: false, error: "유튜브(youtube.com·youtu.be) 또는 비메오(vimeo.com) 영상 주소를 넣어 주세요." };
      return { ok: true, value: { url: str(s.url).slice(0, 300), title: str(s.title).slice(0, 40) } };
    },
  },
  tabs: {
    label: "탭 상품",
    description: "탭(2~5개)을 눌러 상품 묶음을 바꿔 보기",
    defaults: () => ({
      title: "카테고리별 추천",
      tabs: [
        { label: "신상품", source: "new", category_id: "", product_ids: [] },
        { label: "추천", source: "new", category_id: "", product_ids: [] },
      ],
      columns: 4,
      limit: 8,
    }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<TabsSettings>;
      const tabs = Array.isArray(s.tabs) ? s.tabs : [];
      if (tabs.length < 2 || tabs.length > 5) return { ok: false, error: "탭은 2~5개로 만들어 주세요." };
      const out: TabsSettings["tabs"] = [];
      for (const [i, t] of tabs.entries()) {
        const label = str(t?.label).slice(0, 20);
        if (!label) return { ok: false, error: `${i + 1}번째 탭 이름을 넣어 주세요.` };
        const src = validateSource(t ?? {});
        if (!src.ok) return { ok: false, error: `${i + 1}번째 탭: ${src.error}` };
        out.push({ label, ...src.value });
      }
      return { ok: true, value: { title: str(s.title).slice(0, 40), tabs: out, columns: int(s.columns, 2, 5, 4), limit: int(s.limit, 2, 24, 8) } };
    },
  },
  timesale: {
    label: "타임세일",
    description: "끝나는 시각까지 남은 시간 + 상품 묶음(끝나면 자동으로 숨김, 가격은 그대로)",
    defaults: () => ({ title: "오늘의 특가", subtitle: "", ends_at: "", source: "new", category_id: "", product_ids: [], columns: 4, limit: 8 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<TimesaleSettings>;
      const ends_at = isoOrEmpty(s.ends_at);
      if (!ends_at) return { ok: false, error: "끝나는 시각을 넣어 주세요." };
      const src = validateSource(s);
      if (!src.ok) return src;
      return {
        ok: true,
        value: { title: str(s.title).slice(0, 40) || "타임세일", subtitle: str(s.subtitle).slice(0, 60), ends_at, ...src.value, columns: int(s.columns, 2, 5, 4), limit: int(s.limit, 2, 24, 8) },
      };
    },
  },
  reviews: {
    label: "구매 후기",
    description: "최근 구매 후기(이름 가림, 숨긴 후기 제외)",
    defaults: () => ({ title: "생생한 구매 후기", count: 6, min_rating: 4 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<ReviewsSettings>;
      return { ok: true, value: { title: str(s.title).slice(0, 40) || "구매 후기", count: int(s.count, 3, 12, 6), min_rating: int(s.min_rating, 1, 5, 4) } };
    },
  },
  category_icons: {
    label: "카테고리 바로가기",
    description: "둥근 아이콘 줄(그림 또는 이모지) — 누르면 그 카테고리로",
    defaults: () => ({ title: "", items: [] }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<CategoryIconsSettings>;
      const items = Array.isArray(s.items) ? s.items : [];
      if (items.length < 2 || items.length > 12) return { ok: false, error: "카테고리를 2~12개 골라 주세요." };
      const out: CategoryIconsSettings["items"] = [];
      for (const it of items) {
        const category_id = str(it?.category_id);
        if (!UUID.test(category_id)) return { ok: false, error: "카테고리를 골라 주세요." };
        const image = optionalImage(it?.image);
        if (image === null) return { ok: false, error: "아이콘 그림 주소가 올바르지 않습니다(https 주소)." };
        out.push({ category_id, image, emoji: [...str(it?.emoji)].slice(0, 2).join("") });
      }
      return { ok: true, value: { title: str(s.title).slice(0, 40), items: out } };
    },
  },
  gallery: {
    label: "사진 갤러리",
    description: "사진 격자(인스타 스타일) — 사진마다 링크",
    defaults: () => ({ title: "", columns: 4, items: [] }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<GallerySettings>;
      const items = Array.isArray(s.items) ? s.items : [];
      if (items.length < 1 || items.length > 24) return { ok: false, error: "사진을 1~24장 넣어 주세요." };
      const out: GallerySettings["items"] = [];
      for (const it of items) {
        const image = safeImage(it?.image);
        if (!image) return { ok: false, error: "사진마다 그림을 올려 주세요(https 주소)." };
        const link = safeLink(it?.link);
        if (link === null) return { ok: false, error: "링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다." };
        out.push({ image, link });
      }
      return { ok: true, value: { title: str(s.title).slice(0, 40), columns: int(s.columns, 2, 6, 4), items: out } };
    },
  },
};

export const BLOCK_TYPES = Object.keys(BLOCK_DEFS) as BlockType[];

export function newBlock(type: BlockType, id = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`): Block {
  return { id, type, visible: true, settings: BLOCK_DEFS[type].defaults() } as Block;
}

export function emptyDoc(): BlocksDoc {
  return { schema_version: SCHEMA_VERSION, blocks: [] };
}

/** 저장 전 전체 검사·정리 — 모르는 종류·잘못된 칸은 거절, 몇 번째 블록인지 알려 준다 */
export function validateDoc(raw: unknown): { ok: true; value: BlocksDoc } | { ok: false; error: string } {
  const doc = (raw ?? {}) as Partial<BlocksDoc>;
  const blocks = Array.isArray(doc.blocks) ? doc.blocks : [];
  if (blocks.length > MAX_BLOCKS) return { ok: false, error: `블록은 ${MAX_BLOCKS}개까지 넣을 수 있습니다.` };
  const ids = new Set<string>();
  const out: Block[] = [];
  for (const [i, b] of blocks.entries()) {
    const type = b?.type as BlockType;
    if (!BLOCK_DEFS[type]) return { ok: false, error: `${i + 1}번째 블록의 종류를 알 수 없습니다.` };
    const id = str(b?.id).slice(0, 40) || `b${i}`;
    if (ids.has(id)) return { ok: false, error: "블록 번호가 겹칩니다. 다시 불러와 주세요." };
    ids.add(id);
    const v = (BLOCK_DEFS[type] as Def<BlockType>).validate(b?.settings);
    if (!v.ok) return { ok: false, error: `${i + 1}번째 블록(${BLOCK_DEFS[type].label}): ${v.error}` };
    // 예약 노출(D28)
    const show_from = isoOrEmpty(b?.show_from);
    const show_until = isoOrEmpty(b?.show_until);
    if (show_from === null || show_until === null) return { ok: false, error: `${i + 1}번째 블록(${BLOCK_DEFS[type].label}): 예약 시각을 읽지 못했습니다.` };
    if (show_from && show_until && show_from >= show_until) return { ok: false, error: `${i + 1}번째 블록(${BLOCK_DEFS[type].label}): 보이기 끝 시각이 시작 시각보다 늦어야 합니다.` };
    if (b?.style?.hide_pc === true && b?.style?.hide_mobile === true) return { ok: false, error: `${i + 1}번째 블록(${BLOCK_DEFS[type].label}): PC와 휴대폰 모두 숨기면 보이지 않습니다. 「숨기기」를 쓰세요.` };
    const style = normalizeStyle(b?.style);
    out.push({ id, type, visible: b?.visible !== false, settings: v.value, ...(show_from ? { show_from } : {}), ...(show_until ? { show_until } : {}), ...(style ? { style } : {}) } as Block);
  }
  return { ok: true, value: { schema_version: SCHEMA_VERSION, blocks: out } };
}

/** 옛 모양 문서를 지금 모양으로(지금은 1판뿐 — 판이 바뀌면 여기서 변환) */
export function readDoc(raw: unknown): BlocksDoc {
  const v = validateDoc(raw);
  return v.ok ? v.value : emptyDoc();
}

/** 순서 바꾸기 */
export function moveBlock(blocks: Block[], index: number, dir: -1 | 1): Block[] {
  const j = index + dir;
  if (j < 0 || j >= blocks.length) return blocks;
  const next = [...blocks];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}
