// 디자인 빌더 D5+ 2차 — 프론트(Claude(B2BFront)) 템플릿 6종 125~130(2026-11-16, Codex Master 배정 FRONT-20261116-02)
// 업종별 레이아웃이 식품 3·키즈 4·뷰티 5로 모자라 각 6종 이상으로 보강한다(목표 「업종별 10종 이상」, 작업표 D5+).
// templates.ts의 LAYOUTS가 이 배열을 이어 붙인다. 규칙은 templates.ts 머리 주석과 같다:
//   그림(배너·로고)·몰마다 다른 카테고리 번호 없이 완성돼 보일 것 / 문구에 몰마다 다른 사실(인증·보증·쿠폰·배송 약속 등) 금지(시험이 막음)
//   블록 번호 `t-…` / 어둡게(mode: "dark") 레이아웃은 블록 배경색도 어두운 색(시험이 밝기 짝 검사)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { SCHEMA_VERSION, type Block, type BlocksDoc } from "../blocks.ts";
import { DEFAULT_DETAIL, DEFAULT_LIST } from "./pages.ts";
import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_POPUP } from "./frame.ts";
import type { LayoutTemplate } from "./templates.ts";

const id = (s: string) => `t-${s}`;
const doc = (blocks: Block[]): BlocksDoc => ({ schema_version: SCHEMA_VERSION, blocks });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const base = { header: DEFAULT_HEADER, footer: DEFAULT_FOOTER, popup: DEFAULT_POPUP, list: DEFAULT_LIST, detail: DEFAULT_DETAIL };
const NEW = { source: "new" as const, category_id: "", product_ids: [] as string[] };
const DAY = 86400_000;

export const EXTRA_LAYOUTS_2: LayoutTemplate[] = [
  {
    // 125 — 장바구니 느낌: 연두 바탕 히어로, 장보기 특가(타임세일), 장보기 칸 탭, 넘기는 후기
    id: "fresh-market",
    name: "125. 프레시 그린 마켓 스타일",
    description: "연둣빛 바탕에 장보기 특가와 칸별 탭을 앞세운 장터형. 채소·과일·정육·간편식 같은 먹거리 몰과 생활 장보기 몰에 맞음",
    industries: ["food", "living", "general"],
    moods: ["싱그러움", "장보기", "활기"],
    defaultColor: "forest",
    shape: { radius: "lg", button: "3d", image_ratio: "1:1" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "제철 먹거리로 오늘 장바구니를 채워 보세요", link: "", bg: "#14532d" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("fm-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "TODAY'S MARKET",
            title: "오늘의 장바구니",
            accent: "제철 먹거리",
            text: "제철에 맞춰 고른 먹거리를 한곳에 모았습니다.",
            button: { label: "장보기 특가 보기", link: `#blk-${id("fm-sale")}` },
            button2: { label: "칸별로 보기", link: `#blk-${id("fm-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#f0fdf4", pad_top: 56, pad_bottom: 56 },
        },
        {
          id: id("fm-sale"), type: "timesale", visible: true,
          settings: { title: "장보기 특가", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 3 * DAY).toISOString(), ...NEW, columns: 4, limit: 4 },
          style: { pad_top: 40 },
        },
        {
          id: id("fm-tabs"), type: "tabs", visible: true,
          settings: {
            title: "장보기 칸",
            tabs: [
              { label: "채소·과일", ...NEW },
              { label: "정육·수산", ...NEW },
              { label: "간편식", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line",
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 },
        },
        { id: id("fm-reviews"), type: "reviews", visible: true, settings: { title: "장보기 후기", count: 6, min_rating: 4, skin: "slide" } },
        { id: id("fm-notice"), type: "notice", visible: true, settings: { title: "장보기 안내", count: 3 } },
      ]),
    }),
  },
  {
    // 126 — 동네 빵집처럼: 크림 바탕 이야기 글, 첫 상품을 크게(spotlight), 손글씨 제목, 4:5 세로 사진
    id: "bakery-cafe",
    name: "126. 베이커리 & 디저트 카페 스타일",
    description: "크림 바탕의 가게 이야기와 손글씨 제목, 대표 디저트 하나를 크게 보여 주는 4:5 세로 사진 구성. 빵집·디저트·수제 간식·아이 간식 몰에 맞음",
    industries: ["food", "kids", "general"],
    moods: ["따뜻함", "수제", "아늑함"],
    defaultColor: "brown",
    shape: { radius: "xl", button: "flat", image_ratio: "4:5" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "오늘 구운 빵과 디저트를 만나 보세요", link: "", bg: "#7c4a2d" } },
      list: { ...DEFAULT_LIST, columns: 3 },
      home: doc([
        {
          id: id("bc-story"), type: "html", visible: true,
          settings: { html: `<h2>${esc(storeName)}의 오븐</h2><p>매일 반죽하고 굽는 빵과 디저트를 소개합니다. 아래에서 이번 주 메뉴를 둘러보세요.</p>` },
          style: { width: "full", bg_color: "#fdf8f0", pad_top: 56, pad_bottom: 48, title_align: "center", text_align: "center", title_font: "hand" },
        },
        {
          id: id("bc-best"), type: "showcase", visible: true,
          settings: { title: "이번 주 인기 디저트", ...NEW, columns: 3, limit: 7, skin: "spotlight" },
          style: { pad_top: 40, title_align: "center", title_font: "hand" },
        },
        {
          id: id("bc-tabs"), type: "tabs", visible: true,
          settings: {
            title: "메뉴판",
            tabs: [
              { label: "빵", ...NEW },
              { label: "케이크", ...NEW },
              { label: "쿠키·구움과자", ...NEW },
            ],
            columns: 3, limit: 6,
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_align: "center", title_font: "hand" },
        },
        { id: id("bc-reviews"), type: "reviews", visible: true, settings: { title: "맛있게 드신 후기", count: 3, min_rating: 5 }, style: { title_align: "center" } },
        { id: id("bc-notice"), type: "notice", visible: true, settings: { title: "가게 소식", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 127 — 고급 식료품점처럼: 어두운 테마 + 머스터드 포인트, 가로로 넘기는 선물 세트 줄, 어두운 특가 띠, 4:3 가로 사진
    id: "premium-deli",
    name: "127. 프리미엄 델리 & 선물 세트 다크 스타일",
    description: "어두운 바탕에 머스터드 포인트, 가로로 넘기는 선물 세트 줄과 어두운 특가 띠. 명절·답례품 선물 세트, 수입 식료품, 대량 선물 납품 몰에 맞음",
    industries: ["food", "b2b", "living"],
    moods: ["고급", "다크", "선물"],
    defaultColor: "mustard",
    shape: { radius: "sm", button: "flat", image_ratio: "4:3", mode: "dark" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "마음을 전하는 선물 세트를 골라 보세요", link: "", bg: "#78350f" } },
      list: { ...DEFAULT_LIST, columns: 3 },
      home: doc([
        {
          id: id("pd-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "GIFT SELECTION",
            title: "고마운 마음을",
            accent: "한 상자에 담아",
            text: "격식 있는 자리부터 가벼운 인사까지, 상황에 맞는 선물 세트를 준비했습니다.",
            button: { label: "선물 세트 보기 →", link: `#blk-${id("pd-gift")}` },
            button2: { label: "가격대별로 보기", link: `#blk-${id("pd-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#1c1917", pad_top: 64, pad_bottom: 64, title_font: "serif" },
        },
        { id: id("pd-gift"), type: "showcase", visible: true, settings: { title: "선물하기 좋은 세트", ...NEW, columns: 3, limit: 9, layout: "row" }, style: { pad_top: 40, title_font: "serif" } },
        {
          id: id("pd-sale"), type: "timesale", visible: true,
          settings: { title: "기간 한정 세트", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 10 * DAY).toISOString(), ...NEW, columns: 3, limit: 3, skin: "dark" },
        },
        {
          id: id("pd-tabs"), type: "tabs", visible: true,
          settings: {
            title: "가격대별 선물",
            tabs: [
              { label: "가벼운 인사", ...NEW },
              { label: "정성 담은 세트", ...NEW },
              { label: "특별한 자리", ...NEW },
            ],
            columns: 3, limit: 6, skin: "line",
          },
          style: { width: "full", bg_color: "#171717", pad_top: 48, pad_bottom: 48, title_font: "serif" },
        },
        { id: id("pd-reviews"), type: "reviews", visible: true, settings: { title: "선물 받은 분들의 이야기", count: 3, min_rating: 5 } },
        { id: id("pd-notice"), type: "notice", visible: true, settings: { title: "선물 주문 안내", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 128 — 아이 옷장처럼: 분홍 파스텔 바탕, 둥근 고딕 제목, 나이별 탭, 3:4 세로 사진, 굵은 입체 단추
    id: "kids-pastel",
    name: "128. 키즈 파스텔 데일리 스타일",
    description: "분홍 파스텔 바탕에 둥근 고딕 제목과 나이별 탭, 3:4 세로 사진. 아동복·아기 옷·아이 잡화처럼 부드러운 인상이 어울리는 몰에 맞음",
    industries: ["kids", "fashion", "general"],
    moods: ["사랑스러움", "파스텔", "데일리"],
    defaultColor: "pink",
    shape: { radius: "xl", button: "3d", image_ratio: "3:4" },
    build: () => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "오늘 입히고 싶은 옷을 골라 보세요", link: "", bg: "#9d174d" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("kp-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "LITTLE DAILY",
            title: "매일 입어도 편한",
            accent: "우리 아이 옷장",
            text: "보들보들한 데일리룩부터 나들이 옷까지 한눈에 둘러보세요.",
            button: { label: "새로 들어온 옷 보기", link: `#blk-${id("kp-new")}` },
            button2: { label: "나이별로 보기", link: `#blk-${id("kp-tabs")}` },
            feature: false, ...NEW,
          },
          style: { width: "full", bg_color: "#fdf2f8", pad_top: 56, pad_bottom: 56, title_align: "center", title_font: "round" },
        },
        { id: id("kp-new"), type: "showcase", visible: true, settings: { title: "새로 들어온 옷", ...NEW, columns: 4, limit: 8 }, style: { pad_top: 40, title_align: "center", title_font: "round" } },
        {
          id: id("kp-tabs"), type: "tabs", visible: true,
          settings: {
            title: "나이별로 골라 보세요",
            tabs: [
              { label: "0~2세", ...NEW },
              { label: "3~6세", ...NEW },
              { label: "7세 이상", ...NEW },
            ],
            columns: 4, limit: 8,
          },
          style: { width: "full", bg_color: "#fff7fb", pad_top: 48, pad_bottom: 48, title_align: "center", title_font: "round" },
        },
        { id: id("kp-reviews"), type: "reviews", visible: true, settings: { title: "입혀 보신 후기", count: 6, min_rating: 4, skin: "slide" }, style: { title_align: "center", title_font: "round" } },
        { id: id("kp-notice"), type: "notice", visible: true, settings: { title: "소식", count: 3 } },
      ]),
    }),
  },
  {
    // 129 — 육아 생활 도우미처럼: 코랄 포인트, 안내 글, 첫 상품을 크게, 쓰임새별 탭, 1:1 사진
    id: "mom-baby-care",
    name: "129. 맘 & 베이비 케어 스타일",
    description: "코랄 포인트에 쓰임새별 탭(목욕·수유·외출)과 많이 찾는 상품 하나를 크게 보여 주는 구성. 육아용품·아기 스킨케어·생활 잡화 몰에 맞음",
    industries: ["kids", "beauty", "living"],
    moods: ["포근함", "육아", "생활"],
    defaultColor: "coral",
    shape: { radius: "lg", button: "flat", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "육아에 필요한 물건을 쓰임새별로 모았습니다", link: "", bg: "#b4413a" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("mb-intro"), type: "html", visible: true,
          settings: { html: `<h2>${esc(storeName)} 육아 생활</h2><p>목욕부터 수유, 외출까지 하루 흐름에 맞춰 필요한 물건을 찾기 쉽게 나눴습니다.</p>` },
          style: { width: "full", bg_color: "#fff7f5", pad_top: 48, pad_bottom: 40, title_align: "center", text_align: "center", title_font: "round" },
        },
        { id: id("mb-best"), type: "showcase", visible: true, settings: { title: "많이 찾는 상품", ...NEW, columns: 4, limit: 9, skin: "spotlight" }, style: { pad_top: 40 } },
        {
          id: id("mb-tabs"), type: "tabs", visible: true,
          settings: {
            title: "쓰임새별로 보기",
            tabs: [
              { label: "목욕·스킨케어", ...NEW },
              { label: "수유·이유식", ...NEW },
              { label: "외출용품", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line",
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 },
        },
        { id: id("mb-reviews"), type: "reviews", visible: true, settings: { title: "써 보신 분들의 이야기", count: 3, min_rating: 4 } },
        { id: id("mb-notice"), type: "notice", visible: true, settings: { title: "공지사항", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 130 — 화장품 매장 진열대처럼: 보라 포인트, 가로로 넘기는 시즌 컬러 줄, 부위별 탭, 4:5 세로 사진
    id: "color-cosmetic",
    name: "130. 컬러 코스메틱 팔레트 스타일",
    description: "보라 포인트에 가로로 넘기는 시즌 컬러 줄, 립·아이·베이스 부위별 탭, 4:5 세로 사진. 색조 화장품·네일·향수 같은 뷰티 몰과 패션 소품 몰에 맞음",
    industries: ["beauty", "fashion", "general"],
    moods: ["트렌디", "컬러", "화사함"],
    defaultColor: "purple",
    shape: { radius: "md", button: "flat", image_ratio: "4:5" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "이번 시즌 컬러를 먼저 만나 보세요", link: "", bg: "#5b21b6" } },
      list: { ...DEFAULT_LIST, columns: 4, card: { style: "plain", hide_business: true } },
      home: doc([
        {
          id: id("cc-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "COLOR EDIT",
            title: "오늘의 기분에",
            accent: "어울리는 컬러",
            text: "립부터 아이까지, 이번 시즌 새로 나온 색을 한자리에 모았습니다.",
            button: { label: "시즌 컬러 보기", link: `#blk-${id("cc-season")}` },
            button2: { label: "부위별로 보기", link: `#blk-${id("cc-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#faf5ff", pad_top: 56, pad_bottom: 56 },
        },
        { id: id("cc-season"), type: "showcase", visible: true, settings: { title: "이번 시즌 컬러", ...NEW, columns: 4, limit: 10, layout: "row", card: { style: "plain", hide_business: true } }, style: { pad_top: 40 } },
        {
          id: id("cc-tabs"), type: "tabs", visible: true,
          settings: {
            title: "부위별로 보기",
            tabs: [
              { label: "립", ...NEW },
              { label: "아이", ...NEW },
              { label: "베이스", ...NEW },
              { label: "네일", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line", card: { style: "plain", hide_business: true },
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 },
        },
        {
          id: id("cc-sale"), type: "timesale", visible: true,
          settings: { title: "이번 주 컬러 특가", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 7 * DAY).toISOString(), ...NEW, columns: 4, limit: 4 },
        },
        { id: id("cc-reviews"), type: "reviews", visible: true, settings: { title: "발색 후기", count: 6, min_rating: 4, skin: "slide" } },
      ]),
    }),
  },
];
