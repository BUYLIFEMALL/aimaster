"use client";

// 디자인 빌더 D2 — Puck(MIT, @puckeditor/core 0.24.0, THIRD_PARTY_NOTICES.md)으로 만든 첫 화면 편집기
// Puck은 배치(블록 끌어 놓기·순서·복제·삭제·실행 취소·휴대폰/PC 폭)를 맡고,
// 블록 내용 칸은 기존 첫 화면 편집기의 SettingsForm(12종, 그림 올리기·상품 고르기)을 그대로 쓴다.
// 저장 모양은 BlocksDoc(src/lib/blocks.ts) — 변환은 src/lib/builder/puck-adapter.ts, 검사는 validateDoc.

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import { BLOCK_DEFS, BLOCK_TYPES, MAX_PAD, validateDoc, type Block, type BlockType, type BlocksDoc } from "@/lib/blocks";
import { defaultPuckProps, fromPuck, fromPuckRaw, toPuck, type PuckBlockProps } from "@/lib/builder/puck-adapter";
import { previewSlotAction, saveDesignAction } from "@/lib/builder/design-actions";
import { DEFAULT_THEME, readTheme, themeStyle, validateTheme, type ShopTheme } from "@/lib/theme";
import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_POPUP, readFooter, readHeader, readPopup, type FooterDesign, type HeaderDesign, type PopupDesign } from "@/lib/builder/frame";
import type { BusinessInfo } from "@/lib/businessInfo";
import { DEFAULT_DETAIL, DEFAULT_LIST, LIST_SORT_LABEL, LIST_SORTS, readDetail, readList, type DetailDesign, type ListDesign } from "@/lib/builder/pages";
import type { CardOptions } from "@/lib/blocks";
import { ShopBand, ShopFooter, ShopHeader } from "../../(shop)/shop-frame";
import HomePopup from "../../(shop)/home-popup";
import { BlockView } from "../../home-blocks";
import { renderSlot, SLOT_BLOCK_TYPES, type SlotData } from "../../home-slots";
import { CardOptionsForm, ImagePicker, SettingsForm, fromLocalKst, toLocalKst, type Option } from "../home/block-editor";

const DICTIONARY: Record<string, string> = {
  "header-publish": "게시",
  "header-undo": "실행 취소",
  "header-redo": "다시 실행",
  "header-toggle-leftsidebar": "왼쪽 칸 열기·닫기",
  "header-toggle-rightsidebar": "오른쪽 칸 열기·닫기",
  "header-toggle-menubar": "메뉴 열기·닫기",
  "action-selectparent": "바깥 고르기",
  "action-drag": "끌어서 순서 바꾸기",
  "action-duplicate": "복제",
  "action-delete": "빼기",
  "label-page": "첫 화면",
  "label-component": "블록",
  "outline-empty": "블록이 없습니다",
  "outline-item-collapse": "접기",
  "outline-item-expand": "펼치기",
  "outline-header-title": "블록 순서",
  "outline-header-collapseall": "모두 접기",
  "outline-item-duplicate": "복제",
  "outline-item-delete": "빼기",
  "drawer-category-collapse": "{title} 접기",
  "drawer-category-expand": "{title} 펼치기",
  "drawer-category-other": "그 밖",
  "canvas-noconfig": "{type} 설정이 없습니다",
  "field-readonly": "읽기 전용",
  "field-arrayitem-summary": "{index}번째",
  "field-arrayitem-duplicate": "복제",
  "field-arrayitem-delete": "빼기",
  "viewport-zoom-in": "크게 보기",
  "viewport-zoom-out": "작게 보기",
  "viewport-zoom-auto": "{zoom}% (자동)",
  "viewport-toggle-menu": "화면 폭 메뉴",
  "viewport-switch": "{label} 폭으로 보기",
  "viewport-switch-default": "화면 폭 바꾸기",
  "plugin-blocks": "블록 추가",
  "plugin-outline": "블록 순서",
  "plugin-fields": "설정",
  "plugin-components": "블록 추가",
};

const VIEWPORTS = [
  { width: 390, label: "휴대폰", icon: "Smartphone" as const },
  { width: 768, label: "태블릿", icon: "Tablet" as const },
  { width: 1280, label: "PC", icon: "Monitor" as const },
];

const CATEGORIES = {
  banner: { title: "배너·알림", components: ["topbar", "slider", "banner"] },
  products: { title: "상품", components: ["showcase", "tabs", "timesale", "category_icons"] },
  content: { title: "글·사진·소식", components: ["html", "video", "gallery", "notice", "reviews"] },
};

const input = "mt-0.5 w-full rounded border px-2 py-1.5 text-sm";

function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): ReactElement {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input type="datetime-local" value={toLocalKst(value || undefined)} onChange={(e) => onChange(fromLocalKst(e.target.value))} className={input} />
    </label>
  );
}

/** 상품·공지·후기 블록의 실제 데이터 — 설정이 바뀌면 0.4초 뒤 다시 읽는다(운영자만, 읽기만) */
function useSlotData(storeId: string, block: Block | null): { data: SlotData | null; error: string } {
  const [state, setState] = useState<{ key: string; data: SlotData | null; error: string }>({ key: "", data: null, error: "" });
  const key = block ? JSON.stringify([block.type, block.settings]) : "";
  useEffect(() => {
    if (!block || key === state.key) return;
    const t = setTimeout(async () => {
      const r = await previewSlotAction(storeId, block);
      setState({ key, data: r.ok ? r.data : null, error: r.ok ? "" : r.error });
    }, 400);
    return () => clearTimeout(t);
    // block은 key로 대신 비교한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storeId]);
  return state.key === key ? state : { data: state.data, error: "" };
}

/** 가운데 화면의 블록 하나 — 손님 화면과 같은 BlockView, 상품 블록은 실제 상품, 고칠 곳이 있으면 안내 */
function CanvasBlock({ type, p, storeId, base }: { type: BlockType; p: PuckBlockProps; storeId: string; base: string }) {
  const checked = useMemo(() => validateDoc({ blocks: [{ id: p.id, type, visible: true, settings: p.settings, style: p.style }] }), [type, p.id, p.settings, p.style]);
  const block = checked.ok ? checked.value.blocks[0] : null;
  const isSlot = (SLOT_BLOCK_TYPES as readonly string[]).includes(type);
  const slot = useSlotData(storeId, isSlot ? block : null);
  if (!block) {
    return (
      <div className="mx-4 my-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-6 py-6 text-center text-sm text-amber-800 sm:mx-6">
        <p className="font-semibold">{BLOCK_DEFS[type].label}</p>
        <p className="mt-1 text-xs">{checked.ok ? "" : checked.error.replace(/^1번째 블록\([^)]*\): /, "")} — 오른쪽 설정에서 채워 주세요.</p>
      </div>
    );
  }
  const body = isSlot ? (slot.data ? renderSlot(block, base, slot.data) : <p className="px-6 py-8 text-center text-sm text-slate-400">{slot.error || "실제 상품·공지를 불러오는 중…"}</p>) : null;
  return (
    <div className={p.visible ? "" : "relative opacity-40"} data-design-block={type}>
      {!p.visible && <span className="absolute right-3 top-2 z-10 rounded bg-gray-900 px-2 py-0.5 text-[11px] text-white">숨김 — 손님에게 안 보임</span>}
      <BlockView b={block} slot={body} />
    </div>
  );
}

/** 색 고르기 + 코드 칸(브라우저 색상 창만으로는 코드를 붙여 넣을 수 없어서) */
function ColorCodeField({ value, onChange, label, emptyText }: { value: string | undefined; onChange: (v: string) => void; label: string; emptyText: string }): ReactElement {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 shrink-0 rounded border" aria-label={`${label} 고르기`} />
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value.trim())} placeholder={emptyText} maxLength={7} className="w-full rounded border px-2 py-1 text-sm" aria-label={`${label} 코드`} />
      {value && <button type="button" onClick={() => onChange("")} className="shrink-0 text-xs text-gray-600 underline">지우기</button>}
    </div>
  );
}

const THEME_FIELDS = {
  type: "object",
  label: "몰 테마 — 손님 화면 전체(헤더·상품·단추)에 적용",
  objectFields: {
    primary: { type: "custom", label: "포인트색(단추·링크·강조)", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ColorCodeField label="포인트색" value={value} onChange={onChange} emptyText={`기본 ${DEFAULT_THEME.primary}`} /> },
    bg: { type: "custom", label: "바탕색", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ColorCodeField label="바탕색" value={value} onChange={onChange} emptyText={`기본 ${DEFAULT_THEME.bg}`} /> },
    radius: { type: "select", label: "단추 모서리", options: [{ label: "각지게", value: "none" }, { label: "조금 둥글게", value: "sm" }, { label: "보통", value: "md" }, { label: "둥글게", value: "lg" }, { label: "더 둥글게(기본)", value: "xl" }] },
    button: { type: "radio", label: "단추 모양", options: [{ label: "입체(기본)", value: "3d" }, { label: "평면", value: "flat" }] },
    image_ratio: { type: "select", label: "상품 사진 비율(가로:세로)", options: [{ label: "1:1 정사각형(기본)", value: "1:1" }, { label: "4:5 세로형(패션)", value: "4:5" }, { label: "3:4 세로형", value: "3:4" }, { label: "4:3 가로형", value: "4:3" }] },
  },
};

const linkFields = { label: { type: "text", label: "이름" }, link: { type: "text", label: "링크(/로 시작하는 이 몰 주소 또는 https)" } };

/** 헤더 칸 — 띠·로고 3종·메뉴(2단까지)·카테고리 줄·검색 모양 */
function headerFields(storeId: string) {
  const img = (label: string) => ({
    type: "custom",
    label,
    render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ImagePicker storeId={storeId} value={value ?? ""} onChange={onChange} clearable />,
  });
  return {
    type: "object",
    label: "헤더(맨 위 띠·로고·메뉴·검색)",
    objectFields: {
      band: {
        type: "object",
        label: "맨 위 띠(모든 화면, 문구를 비우면 없음)",
        objectFields: {
          text: { type: "text", label: "문구(60자까지)" },
          link: { type: "text", label: "링크(선택)" },
          bg: { type: "custom", label: "띠 색", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ColorCodeField label="띠 색" value={value} onChange={onChange} emptyText="기본 #111827" /> },
        },
      },
      logo: img("상단 로고(비우면 몰 이름 글자, 권장 400×80 이하 투명 PNG)"),
      logo_footer: img("바닥글 로고(비우면 몰 이름 글자)"),
      logo_page: img("단독 화면 로고(로그인 등, 비우면 상단 로고)"),
      show_categories: { type: "radio", label: "카테고리 줄", options: [{ label: "보임", value: true }, { label: "숨김", value: false }] },
      menu: {
        type: "array",
        label: "메뉴(카테고리 뒤에, 8개까지 · 큰 화면에서 아래 메뉴 2단)",
        max: 8,
        getItemSummary: (it: { label?: string }) => it?.label || "새 메뉴",
        defaultItemProps: { label: "", link: "", children: [] },
        arrayFields: {
          ...linkFields,
          children: { type: "array", label: "아래 메뉴(선택)", max: 8, getItemSummary: (it: { label?: string }) => it?.label || "새 아래 메뉴", defaultItemProps: { label: "", link: "" }, arrayFields: linkFields },
        },
      },
      search: { type: "radio", label: "검색", options: [{ label: "검색 칸", value: "box" }, { label: "돋보기만", value: "icon" }, { label: "숨김", value: "none" }] },
    },
  };
}

/** 바닥글 칸 — 사업자(판매자) 정보는 「쇼핑몰 정보」 값이 늘 보인다(잠금, 여기서 못 지움). 분양몰은 입금 계좌도 잠금(D5-4) */
const footerFields = (bankLocked: boolean) => ({
  type: "object",
  label: "바닥글(사업자 정보는 늘 보임 — 「쇼핑몰 정보」에서 고침)",
  objectFields: {
    columns: {
      type: "array",
      label: "링크 묶음(3개까지)",
      max: 3,
      getItemSummary: (it: { title?: string }) => it?.title || "새 묶음",
      defaultItemProps: { title: "", links: [] },
      arrayFields: {
        title: { type: "text", label: "묶음 제목" },
        links: { type: "array", label: "링크(8개까지)", max: 8, getItemSummary: (it: { label?: string }) => it?.label || "새 링크", defaultItemProps: { label: "", link: "" }, arrayFields: linkFields },
      },
    },
    note: { type: "textarea", label: "안내 문구(500자까지, 예: 상담 시간·반품 주소)" },
    ...(bankLocked ? {} : { show_bank: { type: "radio", label: "무통장 입금 계좌", options: [{ label: "보임", value: true }, { label: "숨김", value: false }] } }),
  },
});

/** 첫 화면 팝업 칸 */
function popupFields(storeId: string) {
  return {
    type: "object",
    label: "첫 화면 팝업(그림 3장까지, 비우면 없음)",
    objectFields: {
      items: {
        type: "array",
        label: "팝업 그림",
        max: 3,
        getItemSummary: (_: unknown, i?: number) => `${(i ?? 0) + 1}번째 그림`,
        defaultItemProps: { image: "", link: "" },
        arrayFields: {
          image: { type: "custom", label: "그림(필수)", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ImagePicker storeId={storeId} value={value ?? ""} onChange={onChange} /> },
          link: { type: "text", label: "누르면 갈 곳(선택)" },
        },
      },
      hide_days: { type: "number", label: "「보지 않기」 기간(1~30일)", min: 1, max: 30 },
    },
  };
}

const bannerFields = (storeId: string, label: string) => ({
  type: "object",
  label,
  objectFields: {
    image: { type: "custom", label: "그림(비우면 없음)", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ImagePicker storeId={storeId} value={value ?? ""} onChange={onChange} clearable /> },
    link: { type: "text", label: "누르면 갈 곳(선택)" },
  },
});
const SORT_OPTIONS = LIST_SORTS.map((s) => ({ label: LIST_SORT_LABEL[s], value: s }));

/** 상품 목록(카테고리 화면) 칸 — 표시만 바뀐다. 카테고리별 덮어쓰기 */
function listFields(storeId: string, categories: Option[]) {
  return {
    type: "object",
    label: "상품 목록(카테고리 화면) — 게시 뒤 손님 화면에서 확인",
    objectFields: {
      columns: { type: "number", label: "큰 화면 열 수(2~5, 휴대폰은 2열)", min: 2, max: 5 },
      sort: { type: "select", label: "기본 정렬", options: SORT_OPTIONS },
      hide_soldout: { type: "radio", label: "품절 상품", options: [{ label: "보임", value: false }, { label: "숨김", value: true }] },
      card: { type: "custom", label: "상품 카드", render: ({ value, onChange }: { value: CardOptions | undefined; onChange: (v: CardOptions | undefined) => void }) => <CardOptionsForm value={value} onChange={onChange} /> },
      banner: bannerFields(storeId, "모든 목록 위 배너"),
      overrides: {
        type: "array",
        label: "카테고리별 따로 정하기(비운 칸은 위 기본값)",
        max: 50,
        getItemSummary: (it: { category_id?: string }) => categories.find((c) => c.id === it?.category_id)?.name.trim() || "카테고리 고르기",
        defaultItemProps: { category_id: "", sort: "default", banner: { image: "", link: "" } },
        arrayFields: {
          category_id: { type: "select", label: "카테고리", options: [{ label: "— 고르세요 —", value: "" }, ...categories.map((c) => ({ label: c.name, value: c.id }))] },
          columns: { type: "number", label: "열 수(2~5, 비우면 기본값)", min: 2, max: 5 },
          sort: { type: "select", label: "정렬", options: SORT_OPTIONS },
          banner: bannerFields(storeId, "이 카테고리 목록 위 배너(비우면 기본 배너)"),
        },
      },
    },
  };
}

/** 상품 상세 칸 — 배송·교환·반품 안내는 법정 안내라 늘 보임 */
function detailFields(storeId: string) {
  const imgs = (label: string) => ({
    type: "array",
    label,
    max: 3,
    getItemSummary: (_: unknown, i?: number) => `${(i ?? 0) + 1}번째 그림`,
    defaultItemProps: { image: "", link: "" },
    arrayFields: {
      image: { type: "custom", label: "그림(필수)", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ImagePicker storeId={storeId} value={value ?? ""} onChange={onChange} /> },
      link: { type: "text", label: "누르면 갈 곳(선택)" },
    },
  });
  return {
    type: "object",
    label: "상품 상세 — 배송·교환·반품 안내는 늘 보임",
    objectFields: {
      show_coupons: { type: "radio", label: "받을 수 있는 쿠폰 띠", options: [{ label: "보임", value: true }, { label: "숨김", value: false }] },
      show_boards: { type: "radio", label: "구매 후기·상품 문의", options: [{ label: "보임", value: true }, { label: "숨김", value: false }] },
      top_images: imgs("모든 상품 상세 위 공통 그림(3장까지)"),
      bottom_images: imgs("모든 상품 상세 아래 공통 그림(3장까지)"),
    },
  };
}

type RootProps = { theme?: unknown; header?: unknown; footer?: unknown; popup?: unknown; list?: unknown; detail?: unknown };
const rootOf = (data: Data): RootProps => ((data.root as { props?: RootProps })?.props ?? {});

/** 저장·게시 비교용 — 블록과 테마·헤더·바닥글·팝업을 한 줄 문자열로 */
function snapshot(data: Data): string {
  const v = fromPuck(data);
  const r = rootOf(data);
  return v.ok ? JSON.stringify({ blocks: v.value.blocks, theme: readTheme(r.theme), header: readHeader(r.header), footer: readFooter(r.footer), popup: readPopup(r.popup), list: readList(r.list), detail: readDetail(r.detail) }) : `invalid:${Date.now()}`;
}

export default function DesignEditor({ slug, storeId, categories, products, initial, initialTheme, initialFrame, storeName, topCategories, businessInfo, publishedState, draftAt, publishedAt, footerBankLocked = false, previewing = false }: {
  slug: string; storeId: string; categories: Option[]; products: Option[]; initial: BlocksDoc; initialTheme: ShopTheme;
  initialFrame: { header: HeaderDesign; footer: FooterDesign; popup: PopupDesign; list: ListDesign; detail: DetailDesign }; storeName: string; topCategories: { id: string; name: string }[]; businessInfo: BusinessInfo;
  /** D5-4 분양몰 — 바닥글 입금 계좌 칸 잠금 */
  footerBankLocked?: boolean;
  /** D5 템플릿 미리보기로 열렸는가 — 그렇다면 처음부터 「저장 안 한 변경」 */
  previewing?: boolean;
  /** 지금 손님에게 보이는 블록·테마(비교용 문자열, 게시 전이면 null) */
  publishedState: string | null;
  draftAt: string | null; publishedAt: string | null;
}) {
  const base = `/s/${slug}`;
  const start = useMemo(() => ({ ...toPuck(initial), root: { props: { theme: initialTheme, ...initialFrame } } }) as unknown as Data, [initial, initialTheme, initialFrame]);
  const [saved, setSaved] = useState(() => (previewing ? "template-preview" : snapshot(start)));
  const [live, setLive] = useState(publishedState);
  const [times, setTimes] = useState({ draftAt, publishedAt });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = useRef<Data>(start);
  const [nowState, setNowState] = useState(() => snapshot(start));

  const config = useMemo((): Config => {
    const components: Record<string, unknown> = {};
    for (const t of BLOCK_TYPES) {
      components[t] = {
        label: BLOCK_DEFS[t].label,
        defaultProps: defaultPuckProps(t),
        fields: {
          settings: {
            type: "custom",
            label: `${BLOCK_DEFS[t].label} 내용`,
            render: ({ id, value, onChange }: { id: string; value: Block["settings"]; onChange: (v: Block["settings"]) => void }) => (
              <div className="text-sm">
                <p className="mb-2 text-xs text-gray-500">{BLOCK_DEFS[t].description}</p>
                <SettingsForm storeId={storeId} block={{ id, type: t, visible: true, settings: value } as Block} categories={categories} products={products} onChange={onChange} />
              </div>
            ),
          },
          visible: { type: "radio", label: "손님에게", options: [{ label: "보임", value: true }, { label: "숨김", value: false }] },
          style: {
            type: "object",
            label: "겉모양(여백·배경·폭)",
            objectFields: {
              pad_top: { type: "number", label: "위 여백(px, 0~160)", min: 0, max: MAX_PAD, step: 8 },
              pad_bottom: { type: "number", label: "아래 여백(px, 0~160)", min: 0, max: MAX_PAD, step: 8 },
              width: { type: "radio", label: "배경 폭", options: [{ label: "본문 폭", value: "content" }, { label: "화면 가득", value: "full" }] },
              bg_color: { type: "custom", label: "배경색", render: ({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) => <ColorCodeField label="배경색" value={value} onChange={onChange} emptyText="없음(투명) · 예: #fef3c7" /> },
              title_align: { type: "radio", label: "제목 정렬", options: [{ label: "왼쪽", value: "left" }, { label: "가운데", value: "center" }] },
              hide_pc: { type: "radio", label: "PC(768px 이상)", options: [{ label: "보임", value: false }, { label: "숨김", value: true }] },
              hide_mobile: { type: "radio", label: "휴대폰(767px 이하)", options: [{ label: "보임", value: false }, { label: "숨김", value: true }] },
            },
          },
          show_from: { type: "custom", label: "예약 노출", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <DateTimeField label="보이기 시작(한국 시간, 비우면 바로)" value={value} onChange={onChange} /> },
          show_until: { type: "custom", label: " ", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <DateTimeField label="보이기 끝(한국 시간, 비우면 계속)" value={value} onChange={onChange} /> },
        },
        render: (props: PuckBlockProps) => <CanvasBlock type={t} p={props} storeId={storeId} base={base} />,
      };
    }
    return {
      categories: CATEGORIES,
      components,
      root: {
        fields: { theme: THEME_FIELDS, header: headerFields(storeId), footer: footerFields(footerBankLocked), popup: popupFields(storeId), list: listFields(storeId, categories), detail: detailFields(storeId) },
        render: ({ children, theme, header, footer, popup }: { children: ReactNode } & RootProps) => {
          const h = readHeader(header);
          return (
            <div className="relative flex min-h-screen flex-col bg-[var(--mall-bg,var(--color-slate-50))] font-sans text-slate-900 antialiased" style={themeStyle(readTheme(theme)) as CSSProperties}>
              <ShopBand band={h.band} />
              <ShopHeader base={base} storeName={storeName} header={h} categories={topCategories} showShop right={<span className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">가입</span>} />
              <div className="flex-1 py-6"><div className="mx-auto max-w-6xl space-y-8">{children}</div></div>
              <ShopFooter storeName={storeName} info={businessInfo} footer={readFooter(footer)} logo={h.logo_footer} />
              <HomePopup slug={slug} popup={readPopup(popup)} preview />
            </div>
          );
        },
      },
    } as unknown as Config;
  }, [storeId, base, slug, categories, products, storeName, topCategories, businessInfo, footerBankLocked]);

  function run(kind: "save" | "publish") {
    setMsg(null);
    const raw = fromPuckRaw(latest.current);
    const check = validateDoc(raw);
    if (!check.ok) return setMsg({ ok: false, text: `고칠 곳: ${check.error}` });
    const rp = rootOf(latest.current);
    const themeRaw = rp.theme ?? {};
    const themeErr = validateTheme(themeRaw);
    if (themeErr.length) return setMsg({ ok: false, text: `고칠 곳(몰 테마): ${themeErr[0]}` });
    const now = snapshot(latest.current);
    startTransition(async () => {
      const r = await saveDesignAction(slug, storeId, { home: raw, theme: themeRaw, header: rp.header, footer: rp.footer, popup: rp.popup, list: rp.list, detail: rp.detail }, kind === "publish");
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setSaved(now);
      if (kind === "publish") {
        setLive(now);
        setTimes({ draftAt: r.at, publishedAt: r.at });
        setMsg({ ok: true, text: "게시했습니다. 손님 화면에 바로 보입니다(테마는 모든 화면에)." });
      } else {
        setTimes((t) => ({ ...t, draftAt: r.at }));
        setMsg({ ok: true, text: "초안을 저장했습니다. 게시하기 전까지 손님에게는 보이지 않습니다." });
      }
    });
  }
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR") : "없음");
  const dirty = nowState !== saved;
  const empty = useMemo(() => snapshot({ root: { props: { theme: DEFAULT_THEME, header: DEFAULT_HEADER, footer: DEFAULT_FOOTER, popup: DEFAULT_POPUP, list: DEFAULT_LIST, detail: DEFAULT_DETAIL } }, content: [] } as unknown as Data), []);
  const unpublished = nowState !== (live ?? empty);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-design-editor>
      <div className="flex flex-wrap items-center gap-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">
        <span>초안 저장: {when(times.draftAt)}</span>
        <span className="text-gray-300">|</span>
        <span>게시: {when(times.publishedAt)}</span>
        {dirty && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">저장 안 한 변경</span>}
        {unpublished && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">게시 안 된 변경</span>}
        <span className="text-gray-500">몰 테마·헤더·바닥글·팝업·상품 목록·상품 상세: 위쪽 「첫 화면」을 누르거나 블록 고르기를 풀면 오른쪽에 나옵니다</span>
        {pending && <span className="text-gray-500">처리 중…</span>}
        {msg && <span className={msg.ok ? "text-green-700" : "text-red-600"} data-design-msg>{msg.text}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded border bg-white">
        <Puck
          config={config}
          data={start}
          dictionary={DICTIONARY}
          viewports={VIEWPORTS}
          iframe={{ enabled: true, waitForStyles: true }}
          headerTitle="첫 화면 디자인"
          height="100%"
          onChange={(d) => {
            latest.current = d;
            setNowState(snapshot(d));
          }}
          renderHeaderActions={() => (
            <div className="flex items-center gap-2">
              <button type="button" disabled={pending} onClick={() => run("save")} className="rounded border bg-white px-3 py-1.5 text-sm disabled:opacity-40" data-design-save>
                초안 저장
              </button>
              <button type="button" disabled={pending} onClick={() => run("publish")} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-40" data-design-publish>
                손님 화면에 게시
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
