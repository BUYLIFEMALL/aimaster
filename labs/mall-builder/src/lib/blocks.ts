// 첫 화면 블록 — 블록 등록표(종류마다 이름·기본값·검사). 편집기와 손님 화면이 이 표 하나를 쓴다(docs/mall/ARCHITECTURE.md §6)
// 새 블록 = 여기에 종류 하나 추가 + 손님 화면 그리기(home-blocks.tsx) + 편집 칸(block-editor.tsx)
// 저장 모양: { schema_version: 1, blocks: [{ id, type, visible, settings }] } — DB mall_builder_pages.draft_blocks / published_blocks

export const SCHEMA_VERSION = 1;
export const MAX_BLOCKS = 30;

export type TopbarSettings = { items: { text: string; link: string; bg: string }[]; rotate_sec: number };
export type SliderSettings = { slides: { image: string; link: string }[]; height: number; autoplay_sec: number };
export type BannerSettings = { image: string; link: string; max_width: number };

export type BlockSettingsMap = {
  topbar: TopbarSettings;
  slider: SliderSettings;
  banner: BannerSettings;
};
export type BlockType = keyof BlockSettingsMap;
export type Block<T extends BlockType = BlockType> = { id: string; type: T; visible: boolean; settings: BlockSettingsMap[T] };
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

const HEX = /^#[0-9a-fA-F]{6}$/;

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
        const link = safeLink(sl?.link);
        if (link === null) return { ok: false, error: "링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다." };
        out.push({ image, link });
      }
      return { ok: true, value: { slides: out, height: int(s.height, 200, 800, 400), autoplay_sec: int(s.autoplay_sec, 0, 10, 5) } };
    },
  },
  banner: {
    label: "단일 배너",
    description: "그림 한 장(누르면 링크로)",
    defaults: () => ({ image: "", link: "", max_width: 1100 }),
    validate: (raw) => {
      const s = (raw ?? {}) as Partial<BannerSettings>;
      const image = safeImage(s.image);
      if (!image) return { ok: false, error: "배너 그림을 올려 주세요(https 주소)." };
      const link = safeLink(s.link);
      if (link === null) return { ok: false, error: "링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다." };
      return { ok: true, value: { image, link, max_width: int(s.max_width, 320, 1600, 1100) } };
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
    out.push({ id, type, visible: b?.visible !== false, settings: v.value } as Block);
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
