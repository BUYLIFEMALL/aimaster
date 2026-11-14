// 디자인 빌더 D5 — 템플릿 등록표(node --test 대상, DB 없음)
// 템플릿 = 레이아웃(틀·첫 화면 블록 구성·목록 표시) × 색 조합(포인트색·바탕색). 새 템플릿은 이 등록표에 데이터 한 줄 — 화면 코드 수정 0
// 고르면 편집기에 「저장 없이」 열리고(내 상품으로 미리보기), 운영사가 초안 저장·게시해야 유저에게 보인다
// 그림(배너·로고)은 몰마다 다르므로 넣지 않는다 — 그림 없이도 완성된 모양이 나오는 블록만 쓴다
// 문구에 몰마다 다른 사실(인증·보증·쿠폰·배송 약속 등)을 쓰지 않는다 — 고른 몰이 그대로 게시하면 허위·과장 광고가 된다(시험이 막음)
// esc()는 html 블록 안에만 쓴다(제목·띠는 일반 글자라 화면이 알아서 처리)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { SCHEMA_VERSION, type Block, type BlocksDoc } from "../blocks.ts";
import { DEFAULT_THEME, type ShopTheme } from "../theme.ts";
import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_POPUP, type FooterDesign, type HeaderDesign, type PopupDesign } from "./frame.ts";
import { DEFAULT_DETAIL, DEFAULT_LIST, type DetailDesign, type ListDesign } from "./pages.ts";
import { EXTRA_LAYOUTS } from "./templates-extra.ts"; // 프론트(Claude) 스타일 116·117·118

export const INDUSTRIES = ["b2b", "general", "fashion", "beauty", "food", "living", "digital", "kids"] as const;
export type Industry = (typeof INDUSTRIES)[number];
export const INDUSTRY_LABEL: Record<Industry, string> = {
  b2b: "도매·B2B", general: "종합", fashion: "패션", beauty: "뷰티", food: "식품", living: "생활·리빙", digital: "디지털", kids: "키즈",
};

export type DesignSet = { theme: ShopTheme; header: HeaderDesign; footer: FooterDesign; popup: PopupDesign; list: ListDesign; detail: DetailDesign; home: BlocksDoc };

export type ColorPreset = { id: string; name: string; primary: string; bg: string };
export type LayoutTemplate = {
  id: string;
  name: string; // DESIGN.md 「○○ 스타일」 이름
  description: string;
  industries: Industry[];
  moods: string[];
  defaultColor: string; // ColorPreset id
  /** 테마에서 색을 뺀 나머지(모서리·단추·사진 비율) + 밝기(I23, 비우면 밝게) */
  shape: Pick<ShopTheme, "radius" | "button" | "image_ratio"> & { mode?: ShopTheme["mode"] };
  /** now: 타임세일 끝 시각 같은 날짜 계산용 */
  build: (ctx: { now: number; storeName: string }) => Omit<DesignSet, "theme">;
};

// ── 색 조합 12개(포인트색이 팔레트 600 단계가 된다, theme.ts) ──
export const COLOR_PRESETS: ColorPreset[] = [
  { id: "blue", name: "기본 파랑", primary: DEFAULT_THEME.primary, bg: DEFAULT_THEME.bg },
  { id: "navy", name: "네이비", primary: "#1e3a8a", bg: "#f8fafc" },
  { id: "emerald", name: "에메랄드", primary: "#059669", bg: "#f6fbf9" },
  { id: "forest", name: "포레스트", primary: "#166534", bg: "#f7f7f2" },
  { id: "red", name: "레드", primary: "#dc2626", bg: "#fafafa" },
  { id: "coral", name: "코랄", primary: "#e5534b", bg: "#fff7f5" },
  { id: "orange", name: "오렌지", primary: "#ea580c", bg: "#fffaf5" },
  { id: "mustard", name: "머스터드", primary: "#b45309", bg: "#fffbeb" },
  { id: "purple", name: "퍼플", primary: "#7c3aed", bg: "#faf8ff" },
  { id: "pink", name: "핑크", primary: "#db2777", bg: "#fff7fb" },
  { id: "charcoal", name: "차콜", primary: "#334155", bg: "#f5f5f4" },
  { id: "brown", name: "브라운", primary: "#7c4a2d", bg: "#faf7f2" },
];

const id = (s: string) => `t-${s}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const blk = <T extends Block>(b: T) => b;
const doc = (blocks: Block[]): BlocksDoc => ({ schema_version: SCHEMA_VERSION, blocks });
const base = { header: DEFAULT_HEADER, footer: DEFAULT_FOOTER, popup: DEFAULT_POPUP, list: DEFAULT_LIST, detail: DEFAULT_DETAIL };
const DAY = 86400_000;
/** 어둡게 레이아웃의 바탕(I23) */
export const DARK_BG = "#0c0a09";

// ── 레이아웃 템플릿(10종: agy 6종 시안 + 기존 4종) ──
// 3안(115. 클린 웰니스) 채택 및 1안(113. 럭셔리 부티크), 2안(114. 트렌디 팝), 키즈·완구, 디지털·가전, 도매 카탈로그형 (2026-11-15 D5+ 템플릿 확장)
export const LAYOUTS: LayoutTemplate[] = [
  {
    id: "clean-wellness",
    name: "클린 웰니스 & 테크 그린 스타일",
    description: "청량한 에메랄드 테마와 신뢰감을 주는 구조. 건강기능식품·비건·뷰티·바이오 등 성분과 인증이 중요한 몰에 최적 (115번 시안 채택)",
    industries: ["beauty", "food", "living", "b2b"],
    moods: ["웰니스", "신뢰", "클린"],
    defaultColor: "emerald",
    shape: { radius: "lg", button: "3d", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: {
        ...DEFAULT_HEADER,
        band: { text: "건강한 일상을 위한 클린 셀렉션", link: "", bg: "#047857" },
      },
      list: { ...DEFAULT_LIST, columns: 4 },
      detail: { ...DEFAULT_DETAIL },
      home: doc([
        // agy 115 시안 맨 위: 왼쪽 큰 제목 두 줄(둘째 줄 포인트색)·단추 2개, 오른쪽 대표 상품 카드 — 단추는 아래 블록으로 이동
        blk({
          id: id("cw-hero"),
          type: "hero",
          visible: true,
          settings: {
            eyebrow: "SEASON CURATION",
            title: "자연과 과학이 선사하는",
            accent: "순수한 데일리 웰니스 라이프",
            text: `매일 챙기는 건강 습관, ${storeName}에서 깔끔하게 골라 보세요.`,
            button: { label: "컬렉션 둘러보기 →", link: `#blk-${id("cw-best")}` },
            button2: { label: "테마별로 고르기", link: `#blk-${id("cw-tabs")}` },
            feature: true,
            source: "new",
            category_id: "",
            product_ids: [],
          },
          style: { width: "full", bg_color: "#fdf8f3", pad_top: 56, pad_bottom: 56 },
        }),
        blk({
          id: id("cw-best"),
          type: "showcase",
          visible: true,
          settings: {
            title: "베스트 웰니스 솔루션",
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 4,
            limit: 8,
          },
        }),
        blk({
          id: id("cw-tabs"),
          type: "tabs",
          visible: true,
          settings: {
            title: "맞춤 영양 테마관",
            tabs: [
              { label: "활력 & 면역", source: "new", category_id: "", product_ids: [] },
              { label: "이너뷰티 & 장건강", source: "new", category_id: "", product_ids: [] },
              { label: "항산화 & 기초영양", source: "new", category_id: "", product_ids: [] },
            ],
            columns: 4,
            limit: 8,
          },
        }),
        blk({
          id: id("cw-reviews"),
          type: "reviews",
          visible: true,
          settings: { title: "고객 리얼 체험 후기", count: 6, min_rating: 5 },
          style: { title_align: "center", width: "full", bg_color: "#ffffff", pad_top: 40, pad_bottom: 40 },
        }),
        blk({
          id: id("cw-notice"),
          type: "notice",
          visible: true,
          settings: { title: "원료·품질 안내", count: 3 },
        }),
      ]),
    }),
  },
  {
    id: "luxury-boutique",
    name: "럭셔리 부티크 & 누아르 블랙 스타일",
    description: "품격 있는 딥 블랙과 샴페인 골드 액센트. 명품·패션·귀금속·프라이빗 VIP B2B 폐쇄몰에 최적 (113번 시안)",
    industries: ["fashion", "beauty", "b2b", "digital"],
    moods: ["럭셔리", "하이엔드", "VIP"],
    defaultColor: "mustard",
    shape: { radius: "sm", button: "3d", image_ratio: "3:4", mode: "dark" }, // agy 113 누아르 블랙 — 검은 바탕 + 밝은 글자(I23)
    build: ({ storeName }) => ({
      ...base,
      header: {
        ...DEFAULT_HEADER,
        band: { text: `${storeName} 프라이빗 컬렉션`.slice(0, 60), link: "", bg: "#1c1917" },
      },
      list: { ...DEFAULT_LIST, columns: 3, card: { style: "plain" } },
      detail: { ...DEFAULT_DETAIL },
      home: doc([
        blk({
          id: id("lb-hero"),
          type: "hero",
          visible: true,
          settings: {
            eyebrow: "HAUTE HORLOGERIE & LUXE",
            title: "시대를 초월한 우아함과",
            accent: "오직 당신만을 위한 프라이빗 셀렉션",
            text: `시간이 흘러도 변치 않는 품격, ${storeName} 시그니처 마스터피스를 만나보세요.`,
            button: { label: "컬렉션 살펴보기 →", link: `#blk-${id("lb-master")}` },
            button2: { label: "신작 라인업", link: `#blk-${id("lb-new")}` },
            feature: true,
            source: "new",
            category_id: "",
            product_ids: [],
          },
          style: { width: "full", bg_color: "#1c1917", pad_top: 56, pad_bottom: 56 },
        }),
        blk({
          id: id("lb-master"),
          type: "showcase",
          visible: true,
          settings: {
            title: "시그니처 마스터피스 컬렉션",
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 3,
            limit: 6,
            card: { style: "plain" },
          },
          style: { title_align: "center" },
        }),
        blk({
          id: id("lb-new"),
          type: "showcase",
          visible: true,
          settings: {
            title: "프라이빗 신작 라인업",
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 4,
            limit: 4,
            card: { style: "plain" },
          },
          style: { title_align: "center" },
        }),
        blk({
          id: id("lb-reviews"),
          type: "reviews",
          visible: true,
          settings: { title: "VIP 클라이언트 프리미엄 리뷰", count: 4, min_rating: 5 },
          style: { title_align: "center" },
        }),
      ]),
    }),
  },
  {
    id: "trendy-pop",
    name: "트렌디 셀렉트샵 & 네오 팝 스타일",
    description: "생동감 넘치는 탠저린 팝 포인트와 쾌활한 레이아웃. 2030 라이프스타일·디자인 소품·위탁 분양몰에 최적 (114번 시안)",
    industries: ["living", "fashion", "kids", "general"],
    moods: ["트렌디", "위트", "인기"],
    defaultColor: "orange",
    shape: { radius: "xl", button: "3d", image_ratio: "1:1" },
    build: ({ now, storeName }) => ({
      ...base,
      header: {
        ...DEFAULT_HEADER,
        band: { text: "오늘의 새로운 발견을 만나 보세요", link: "", bg: "#c2410c" },
      },
      list: { ...DEFAULT_LIST, columns: 4 },
      detail: { ...DEFAULT_DETAIL },
      home: doc([
        blk({
          id: id("tp-hero"),
          type: "hero",
          visible: true,
          settings: {
            eyebrow: "TRENDY SELECT & DROP",
            title: "일상에 감각을 더하는",
            accent: "생동감 넘치는 라이프스타일 큐레이션",
            text: `새로운 취향과 위트 있는 디자인을 ${storeName}에서 즐겁게 발견해 보세요.`,
            button: { label: "타임 특가 보기 →", link: `#blk-${id("tp-sale")}` },
            button2: { label: "인기 아이템 탐색", link: `#blk-${id("tp-pick")}` },
            feature: true,
            source: "new",
            category_id: "",
            product_ids: [],
          },
          style: { width: "full", bg_color: "#fffaf5", pad_top: 56, pad_bottom: 56 },
        }),
        blk({
          id: id("tp-sale"),
          type: "timesale",
          visible: true,
          settings: {
            title: "게릴라 타임 드롭",
            subtitle: "오늘 한정 수량, 깜짝 특가 찬스!",
            ends_at: new Date(now + 7 * DAY).toISOString(),
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 4,
            limit: 4,
          },
        }),
        blk({
          id: id("tp-pick"),
          type: "showcase",
          visible: true,
          settings: {
            title: `지금 뜨는 ${storeName} 핫템`.slice(0, 40), // 제목은 일반 글자(HTML 아님) — 이스케이프하지 않음
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 4,
            limit: 8,
          },
        }),
        blk({
          id: id("tp-tabs"),
          type: "tabs",
          visible: true,
          settings: {
            title: "라이프스타일 큐레이션",
            tabs: [
              { label: "데스크테리어", source: "new", category_id: "", product_ids: [] },
              { label: "홈카페 & 리빙", source: "new", category_id: "", product_ids: [] },
              { label: "선물 추천", source: "new", category_id: "", product_ids: [] },
            ],
            columns: 4,
            limit: 8,
          },
        }),
        blk({
          id: id("tp-reviews"),
          type: "reviews",
          visible: true,
          settings: { title: "생생한 구매 후기", count: 6, min_rating: 4 },
        }),
      ]),
    }),
  },
  {
    id: "neo-modern",
    name: "네오 모던 B2B 커머스 스타일",
    description: "지금 기본 화면(106). 상자형 카드 4열, 공지·후기로 믿음을 주는 도매·B2B 기본형",
    industries: ["b2b", "general", "digital", "living"],
    moods: ["단정함", "신뢰"],
    defaultColor: "blue",
    shape: { radius: "xl", button: "3d", image_ratio: "1:1" },
    build: () => ({
      ...base,
      home: doc([
        blk({ id: id("nm-show"), type: "showcase", visible: true, settings: { title: "추천 상품", source: "new", category_id: "", product_ids: [], columns: 4, limit: 8 } }),
        blk({ id: id("nm-notice"), type: "notice", visible: true, settings: { title: "공지사항", count: 5 } }),
        blk({ id: id("nm-reviews"), type: "reviews", visible: true, settings: { title: "생생한 구매 후기", count: 6, min_rating: 4 } }),
      ]),
    }),
  },
  {
    id: "clean-select",
    name: "클린 셀렉트 스타일",
    description: "테두리 없는 깔끔한 카드, 세로형 사진, 가운데 제목. 패션·뷰티 편집숍 느낌",
    industries: ["fashion", "beauty", "general"],
    moods: ["미니멀", "감성"],
    defaultColor: "charcoal",
    shape: { radius: "sm", button: "flat", image_ratio: "4:5" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, search: "icon", band: { text: `${storeName} — 오늘의 셀렉트를 만나 보세요`.slice(0, 60), link: "", bg: "#111827" } },
      list: { ...DEFAULT_LIST, columns: 3, card: { style: "plain", hide_list_price: true } },
      home: doc([
        blk({ id: id("cs-intro"), type: "html", visible: true, settings: { html: `<h2>${esc(storeName)}</h2><p>매일 고르고 다듬은 상품만 소개합니다.</p>` }, style: { pad_top: 32, pad_bottom: 8, title_align: "center" } }),
        blk({ id: id("cs-new"), type: "showcase", visible: true, settings: { title: "새로 들어온 상품", source: "new", category_id: "", product_ids: [], columns: 4, limit: 8, card: { style: "plain", hide_list_price: true }, layout: "row" }, style: { title_align: "center" } }),
        blk({ id: id("cs-best"), type: "showcase", visible: true, settings: { title: "에디터 추천", source: "new", category_id: "", product_ids: [], columns: 3, limit: 6, card: { style: "plain" } }, style: { title_align: "center", width: "full", bg_color: "#ffffff", pad_top: 40, pad_bottom: 40 } }),
        blk({ id: id("cs-reviews"), type: "reviews", visible: true, settings: { title: "고객 후기", count: 6, min_rating: 4 }, style: { title_align: "center" } }),
      ]),
    }),
  },
  {
    id: "market-daily",
    name: "마켓 데일리 스타일",
    description: "타임세일·탭 상품으로 매일 바뀌는 특가를 앞세운 장터형. 식품·생활용품에 잘 맞음",
    industries: ["food", "living", "general", "kids"],
    moods: ["활기", "특가"],
    defaultColor: "orange",
    shape: { radius: "lg", button: "3d", image_ratio: "1:1" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "매일 새로운 특가를 만나 보세요", link: "", bg: "#9a3412" } },
      list: { ...DEFAULT_LIST, sort: "price_asc" },
      home: doc([
        blk({ id: id("md-sale"), type: "timesale", visible: true, settings: { title: "오늘의 특가", subtitle: "한정 수량, 끝나면 사라져요", ends_at: new Date(now + 7 * DAY).toISOString(), source: "new", category_id: "", product_ids: [], columns: 4, limit: 4 } }),
        blk({ id: id("md-tabs"), type: "tabs", visible: true, settings: { title: "지금 많이 보는 상품", tabs: [{ label: "신상품", source: "new", category_id: "", product_ids: [] }, { label: "추천", source: "new", category_id: "", product_ids: [] }], columns: 4, limit: 8 } }),
        blk({ id: id("md-notice"), type: "notice", visible: true, settings: { title: "장보기 안내", count: 3 } }),
      ]),
    }),
  },
  {
    id: "brand-story",
    name: "브랜드 스토리 스타일",
    description: "몰 소개 글을 크게, 상품은 여유 있게 3열. 자체 브랜드·공방·디지털 기기 소개에 맞음",
    industries: ["digital", "beauty", "living", "fashion"],
    moods: ["여유", "고급"],
    defaultColor: "navy",
    shape: { radius: "md", button: "flat", image_ratio: "4:3" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, show_categories: true },
      footer: { ...DEFAULT_FOOTER, note: `${storeName}은(는) 직접 만들고 고른 상품만 판매합니다.` },
      list: { ...DEFAULT_LIST, columns: 3 },
      detail: { ...DEFAULT_DETAIL },
      home: doc([
        blk({ id: id("bs-story"), type: "html", visible: true, settings: { html: `<h2>${esc(storeName)} 이야기</h2><p>좋은 재료와 꼼꼼한 손길로 오래 쓰는 물건을 만듭니다. 아래 상품을 둘러보세요.</p>` }, style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_align: "center" } }),
        blk({ id: id("bs-show"), type: "showcase", visible: true, settings: { title: "대표 상품", source: "new", category_id: "", product_ids: [], columns: 3, limit: 6 }, style: { pad_top: 16 } }),
        blk({ id: id("bs-reviews"), type: "reviews", visible: true, settings: { title: "사용 후기", count: 3, min_rating: 5 } }),
      ]),
    }),
  },
  {
    id: "kids-toy",
    name: "키즈 & 토이 플레이월드 스타일",
    description: "밝고 경쾌한 옐로우 팝 컬러와 부드러운 라운드. 장난감·유아동용품·교구·키즈 라이프스타일 몰에 최적",
    industries: ["kids", "living", "general"],
    moods: ["발랄함", "친근함", "플레이"],
    defaultColor: "mustard",
    shape: { radius: "xl", button: "3d", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: {
        ...DEFAULT_HEADER,
        band: { text: "아이들의 꿈과 상상력이 자라나는 공간", link: "", bg: "#d97706" },
      },
      list: { ...DEFAULT_LIST, columns: 4 },
      detail: { ...DEFAULT_DETAIL },
      home: doc([
        blk({
          id: id("kt-hero"),
          type: "hero",
          visible: true,
          settings: {
            eyebrow: "KIDS PLAY WORLD",
            title: "매일매일 즐거운 놀이",
            accent: "우리아이 행복한 플레이타임",
            text: `상상력과 창의력을 키워주는 특별한 선물을 ${storeName}에서 골라보세요.`,
            button: { label: "인기 장난감 보기 →", link: `#blk-${id("kt-best")}` },
            button2: { label: "연령별 테마관", link: `#blk-${id("kt-tabs")}` },
            feature: true,
            source: "new",
            category_id: "",
            product_ids: [],
          },
          style: { width: "full", bg_color: "#fffbeb", pad_top: 52, pad_bottom: 52 },
        }),
        blk({
          id: id("kt-best"),
          type: "showcase",
          visible: true,
          settings: {
            title: "베스트 플레이 랭킹",
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 4,
            limit: 8,
          },
        }),
        blk({
          id: id("kt-tabs"),
          type: "tabs",
          visible: true,
          settings: {
            title: "연령별 & 발달 테마관",
            tabs: [
              { label: "베이비 & 토들러", source: "new", category_id: "", product_ids: [] },
              { label: "창의력 블록", source: "new", category_id: "", product_ids: [] },
              { label: "실내외 놀이완구", source: "new", category_id: "", product_ids: [] },
            ],
            columns: 4,
            limit: 8,
          },
        }),
        blk({
          id: id("kt-reviews"),
          type: "reviews",
          visible: true,
          settings: { title: "부모님들의 생생 사용 후기", count: 6, min_rating: 4 },
          style: { title_align: "center", width: "full", bg_color: "#ffffff", pad_top: 36, pad_bottom: 36 },
        }),
        blk({
          id: id("kt-notice"),
          type: "notice",
          visible: true,
          settings: { title: "안전 놀이 가이드", count: 3 },
        }),
      ]),
    }),
  },
  {
    id: "digital-tech",
    name: "디지털 테크 & 스마트 디바이스 스타일",
    description: "고밀도 5열 그리드와 메탈릭 하이테크 레이아웃. 스마트기기·음향·컴퓨터 부품·테크 기어 전문몰에 최적",
    industries: ["digital", "b2b", "living"],
    moods: ["하이테크", "스마트", "정보형"],
    defaultColor: "charcoal",
    shape: { radius: "sm", button: "flat", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: {
        ...DEFAULT_HEADER,
        search: "box",
        band: { text: "스마트한 일상을 위한 최신 테크 솔루션", link: "", bg: "#1e293b" },
      },
      list: { ...DEFAULT_LIST, columns: 5 },
      detail: { ...DEFAULT_DETAIL },
      home: doc([
        blk({
          id: id("dt-hero"),
          type: "hero",
          visible: true,
          settings: {
            eyebrow: "SMART TECH GEAR",
            title: "일상을 바꾸는 스마트한 연결",
            accent: "고성능 디지털 테크 셀렉션",
            text: `정밀한 규격과 뛰어난 기술력의 기어를 ${storeName}에서 직접 비교해 보세요.`,
            button: { label: "스마트 기어 둘러보기 →", link: `#blk-${id("dt-show")}` },
            button2: { label: "카테고리별 탐색", link: `#blk-${id("dt-tabs")}` },
            feature: true,
            source: "new",
            category_id: "",
            product_ids: [],
          },
          style: { width: "full", bg_color: "#f8fafc", pad_top: 48, pad_bottom: 48 },
        }),
        blk({
          id: id("dt-show"),
          type: "showcase",
          visible: true,
          settings: {
            title: "주목할 만한 스마트 기기",
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 5,
            limit: 10,
          },
        }),
        blk({
          id: id("dt-tabs"),
          type: "tabs",
          visible: true,
          settings: {
            title: "카테고리별 테크 기어",
            tabs: [
              { label: "스마트 모빌리티 & 웨어러블", source: "new", category_id: "", product_ids: [] },
              { label: "음향 & 홈엔터테인먼트", source: "new", category_id: "", product_ids: [] },
              { label: "컴퓨팅 & 오피스", source: "new", category_id: "", product_ids: [] },
            ],
            columns: 5,
            limit: 10,
          },
        }),
        blk({
          id: id("dt-reviews"),
          type: "reviews",
          visible: true,
          settings: { title: "얼리어답터 실사용 리뷰", count: 6, min_rating: 4 },
          style: { title_align: "center", width: "full", bg_color: "#ffffff", pad_top: 36, pad_bottom: 36 },
        }),
        blk({
          id: id("dt-notice"),
          type: "notice",
          visible: true,
          settings: { title: "규격 & 호환성 가이드", count: 3 },
        }),
      ]),
    }),
  },
  {
    id: "wholesale-catalog",
    name: "도매 카탈로그 & 대량납품 B2B 스타일",
    description: "압축된 5열 데이터 카탈로그형 그리드와 단정한 폼. 식자재·판촉물·소모품 등 대량발주와 납품 위주 B2B 도매몰에 최적",
    industries: ["b2b", "general", "living", "food"],
    moods: ["카탈로그", "대량구매", "도매"],
    defaultColor: "blue",
    shape: { radius: "none", button: "3d", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: {
        ...DEFAULT_HEADER,
        show_categories: true,
        band: { text: "기업 및 사업자 회원을 위한 도매 카탈로그 센터", link: "", bg: "#1e40af" },
      },
      list: { ...DEFAULT_LIST, columns: 5, card: { style: "plain" } },
      detail: { ...DEFAULT_DETAIL },
      home: doc([
        blk({
          id: id("wc-hero"),
          type: "hero",
          visible: true,
          settings: {
            eyebrow: "B2B WHOLESALE CATALOG",
            title: "합리적인 사업자 파트너십",
            accent: "안정적인 도매 공급망 솔루션",
            text: `사업장 운영에 필요한 핵심 품목을 ${storeName} 대량 카탈로그에서 한 번에 확인하세요.`,
            button: { label: "도매 카탈로그 바로가기 →", link: `#blk-${id("wc-catalog")}` },
            button2: { label: "업종별 품목 보기", link: `#blk-${id("wc-tabs")}` },
            feature: true,
            source: "new",
            category_id: "",
            product_ids: [],
          },
          style: { width: "full", bg_color: "#f8fafc", pad_top: 44, pad_bottom: 44 },
        }),
        blk({
          id: id("wc-catalog"),
          type: "showcase",
          visible: true,
          settings: {
            title: "대량 발주 추천 품목",
            source: "new",
            category_id: "",
            product_ids: [],
            columns: 5,
            limit: 10,
            card: { style: "plain" },
          },
        }),
        blk({
          id: id("wc-tabs"),
          type: "tabs",
          visible: true,
          settings: {
            title: "업종별 소모품 카탈로그",
            tabs: [
              { label: "사무 & 매장 소모품", source: "new", category_id: "", product_ids: [] },
              { label: "포장 & 위생 자재", source: "new", category_id: "", product_ids: [] },
              { label: "정기 납품 품목", source: "new", category_id: "", product_ids: [] },
            ],
            columns: 5,
            limit: 10,
            card: { style: "plain" },
          },
        }),
        blk({
          id: id("wc-notice"),
          type: "notice",
          visible: true,
          settings: { title: "대량 발주 및 납품 거래처 안내", count: 4 },
        }),
        blk({
          id: id("wc-reviews"),
          type: "reviews",
          visible: true,
          settings: { title: "거래처 바이어 평가", count: 6, min_rating: 4 },
          style: { title_align: "center", width: "full", bg_color: "#ffffff", pad_top: 36, pad_bottom: 36 },
        }),
      ]),
    }),
  },
];
LAYOUTS.push(...EXTRA_LAYOUTS);

export const findLayout = (layoutId: string) => LAYOUTS.find((l) => l.id === layoutId) ?? null;
export const findColor = (colorId: string) => COLOR_PRESETS.find((c) => c.id === colorId) ?? null;

/** 템플릿 하나 → 디자인 일곱 조각. 모르는 레이아웃이면 null, 모르는 색이면 레이아웃 기본 색 */
export function applyTemplate(layoutId: string, colorId: string | null | undefined, ctx: { now: number; storeName: string }): DesignSet | null {
  const layout = findLayout(layoutId);
  if (!layout) return null;
  const color = (colorId && findColor(colorId)) || findColor(layout.defaultColor) || COLOR_PRESETS[0];
  // 어둡게 레이아웃은 색 조합의 밝은 바탕 대신 검은 바탕(포인트색만 조합에서)
  const mode = layout.shape.mode ?? "light";
  return { theme: { ...layout.shape, mode, primary: color.primary, bg: mode === "dark" ? DARK_BG : color.bg }, ...layout.build(ctx) };
}

/** 갤러리 거르기 — 업종(비우면 전부) */
export function layoutsFor(industry: Industry | "" | null | undefined): LayoutTemplate[] {
  return industry ? LAYOUTS.filter((l) => l.industries.includes(industry)) : LAYOUTS;
}
