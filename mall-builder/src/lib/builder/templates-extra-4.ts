// 디자인 빌더 D5+ 4차 — 프론트(Claude(B2BFront)) 템플릿 6종 139~144(2026-11-16, 주인님 채팅 지시 「진행해」 — 남은 작업 1순위)
// 3차 뒤 업종별 레이아웃이 패션 8·뷰티 7·도매 9·키즈 9라 목표 「업종별 10종 이상」까지 채운다(작업표 D5+).
// templates.ts의 LAYOUTS가 이 배열을 이어 붙인다. 규칙은 templates.ts·templates-extra-2.ts·templates-extra-3.ts 머리 주석과 같다:
//   그림(배너·로고)·몰마다 다른 카테고리 번호 없이 완성돼 보일 것 / 문구에 몰마다 다른 사실(인증·보증·쿠폰·배송 약속·효과 등) 금지(시험이 막음)
//   블록 번호 `t-…` / 어둡게(mode: "dark") 레이아웃은 블록 배경색도 어두운 색(시험이 밝기 짝 검사)
//   어두운 테마의 타임세일은 기본(빨간 테두리) 스킨 — 「어두운 띠」는 바탕이 밝게 뒤집혀 제목이 안 보임(3차 134·136과 같은 이유)
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

export const EXTRA_LAYOUTS_4: LayoutTemplate[] = [
  // ── 패션 2종(139·140) ──
  {
    // 139 — 데일리 코디 잡지처럼: 코랄 포인트, 오늘의 코디 하나를 크게(spotlight), 상황별 알약 탭, 3:4 세로 사진, 넘기는 후기
    id: "daily-look",
    name: "139. 데일리 룩 코디 스타일",
    description: "코랄 포인트에 오늘의 코디 하나를 크게 보여 주고 출근·주말·데이트 상황별 탭으로 나눈 3:4 세로 사진 구성. 여성 의류·잡화를 매일 새로 올리는 데일리 패션 몰에 맞음",
    industries: ["fashion", "general"],
    moods: ["데일리", "코디", "산뜻함"],
    defaultColor: "coral",
    shape: { radius: "md", button: "flat", image_ratio: "3:4" },
    build: () => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "오늘 입을 옷을 코디로 골라 보세요", link: "", bg: "#9f1239" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("dl-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "DAILY LOOK",
            title: "고민 없이 입는",
            accent: "오늘의 코디",
            text: "상의와 하의, 가방까지 한 벌로 맞춰 두었습니다. 상황에 맞게 골라 보세요.",
            button: { label: "오늘의 코디 보기", link: `#blk-${id("dl-pick")}` },
            button2: { label: "상황별로 보기", link: `#blk-${id("dl-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#fff1f2", pad_top: 56, pad_bottom: 56 },
        },
        { id: id("dl-pick"), type: "showcase", visible: true, settings: { title: "오늘의 코디", ...NEW, columns: 4, limit: 9, skin: "spotlight" }, style: { pad_top: 40 } },
        {
          id: id("dl-tabs"), type: "tabs", visible: true,
          settings: {
            title: "상황별로 보기",
            tabs: [
              { label: "출근룩", ...NEW },
              { label: "주말 나들이", ...NEW },
              { label: "데이트", ...NEW },
              { label: "가방·소품", ...NEW },
            ],
            columns: 4, limit: 8,
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 },
        },
        { id: id("dl-reviews"), type: "reviews", visible: true, settings: { title: "입어 보신 후기", count: 6, min_rating: 4, skin: "slide" } },
        { id: id("dl-notice"), type: "notice", visible: true, settings: { title: "공지사항", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 140 — 단체복 납품 카탈로그처럼: 네이비 포인트, 소개 글 → 주문 안내를 위로 → 품목 탭(밑줄) → 많이 맞추는 품목, 각진 모서리 1:1
    id: "uniform-order",
    name: "140. 단체복 & 유니폼 납품 스타일",
    description: "네이비 포인트에 주문 안내를 위로 올리고 작업복·단체 티셔츠·모자 품목 탭을 앞세운 카탈로그형. 회사·학교·동호회에 단체복과 유니폼을 수량으로 납품하는 도매·B2B 의류 몰에 맞음",
    industries: ["fashion", "b2b", "general"],
    moods: ["실용", "카탈로그", "단체"],
    defaultColor: "navy",
    shape: { radius: "sm", button: "flat", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "단체로 맞추는 옷, 품목별로 골라 주문하세요", link: "", bg: "#1e3a8a" } },
      list: { ...DEFAULT_LIST, columns: 4, card: { style: "plain" } },
      home: doc([
        {
          id: id("uf-intro"), type: "html", visible: true,
          settings: { html: `<h2>${esc(storeName)} 단체복 카탈로그</h2><p>작업복과 단체 티셔츠, 모자까지 품목별로 나눠 두었습니다. 수량 주문 전에 주문 안내를 먼저 확인해 주세요.</p>` },
          style: { width: "full", bg_color: "#eef2ff", pad_top: 40, pad_bottom: 32 },
        },
        { id: id("uf-notice"), type: "notice", visible: true, settings: { title: "주문 안내", count: 3, skin: "line" }, style: { pad_top: 32 } },
        {
          id: id("uf-tabs"), type: "tabs", visible: true,
          settings: {
            title: "품목별로 보기",
            tabs: [
              { label: "작업복", ...NEW },
              { label: "단체 티셔츠", ...NEW },
              { label: "조끼·점퍼", ...NEW },
              { label: "모자·소품", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line", card: { style: "plain" },
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 40, pad_bottom: 40 },
        },
        { id: id("uf-best"), type: "showcase", visible: true, settings: { title: "많이 맞추는 품목", ...NEW, columns: 4, limit: 8, card: { style: "plain" } } },
        { id: id("uf-reviews"), type: "reviews", visible: true, settings: { title: "맞춰 보신 후기", count: 3, min_rating: 4 } },
      ]),
    }),
  },
  // ── 뷰티 3종(141~143) ──
  {
    // 141 — 화장대 순서처럼: 에메랄드 포인트, 둥근 고딕 제목, 세안→토너→세럼→크림 단계 탭, 4:5 사진, 넘기는 신상품 줄
    id: "skincare-routine",
    name: "141. 스킨케어 루틴 스타일",
    description: "에메랄드 포인트에 둥근 제목, 세안부터 크림까지 바르는 순서대로 나눈 단계별 탭과 가로로 넘기는 신상품 줄. 기초 화장품·스킨케어 소품 몰에 맞음",
    industries: ["beauty", "general"],
    moods: ["산뜻함", "루틴", "차분함"],
    defaultColor: "emerald",
    shape: { radius: "xl", button: "flat", image_ratio: "4:5" },
    build: () => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "바르는 순서대로 골라 보는 스킨케어", link: "", bg: "#065f46" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("sr-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "SKINCARE ROUTINE",
            title: "아침저녁 내 피부에",
            accent: "순서대로 한 단계씩",
            text: "세안부터 토너, 세럼, 크림까지 바르는 순서대로 나눠 두었습니다.",
            button: { label: "단계별로 보기", link: `#blk-${id("sr-steps")}` },
            button2: { label: "새로 나온 상품", link: `#blk-${id("sr-new")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#ecfdf5", pad_top: 56, pad_bottom: 56, title_align: "center", title_font: "round" },
        },
        {
          id: id("sr-steps"), type: "tabs", visible: true,
          settings: {
            title: "단계별로 보기",
            tabs: [
              { label: "1단계 세안", ...NEW },
              { label: "2단계 토너", ...NEW },
              { label: "3단계 세럼", ...NEW },
              { label: "4단계 크림", ...NEW },
            ],
            columns: 4, limit: 8,
          },
          style: { pad_top: 40, title_align: "center", title_font: "round" },
        },
        { id: id("sr-new"), type: "showcase", visible: true, settings: { title: "새로 나온 상품", ...NEW, columns: 4, limit: 10, layout: "row" }, style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_font: "round" } },
        { id: id("sr-reviews"), type: "reviews", visible: true, settings: { title: "발라 보신 후기", count: 6, min_rating: 4 }, style: { title_font: "round" } },
        { id: id("sr-notice"), type: "notice", visible: true, settings: { title: "공지사항", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 142 — 살롱 진열장처럼: 브라운 포인트, 명조 제목, 살롱 이야기 글, 첫 상품을 크게, 헤어·바디 탭(밑줄), 각진 모서리 4:5
    id: "hair-body-salon",
    name: "142. 헤어 & 바디 살롱 스타일",
    description: "브라운 포인트에 명조 제목과 살롱 이야기 글, 많이 찾는 상품 하나를 크게 보여 주고 헤어·바디·향기 소품 탭으로 나눈 구성. 샴푸·바디케어·홈 살롱 소품 몰과 생활 몰에 맞음",
    industries: ["beauty", "living"],
    moods: ["따뜻함", "살롱", "여유"],
    defaultColor: "brown",
    shape: { radius: "sm", button: "flat", image_ratio: "4:5" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "집에서 즐기는 살롱 시간", link: "", bg: "#5c3a21" } },
      list: { ...DEFAULT_LIST, columns: 4, card: { style: "plain" } },
      home: doc([
        {
          id: id("hs-story"), type: "html", visible: true,
          settings: { html: `<h2>${esc(storeName)} 홈 살롱</h2><p>머리와 몸을 돌보는 시간을 위한 상품을 모았습니다. 쓰는 곳에 맞춰 천천히 골라 보세요.</p>` },
          style: { width: "full", bg_color: "#faf5ef", pad_top: 56, pad_bottom: 48, title_align: "center", text_align: "center", title_font: "serif" },
        },
        { id: id("hs-best"), type: "showcase", visible: true, settings: { title: "많이 찾는 상품", ...NEW, columns: 4, limit: 9, skin: "spotlight", card: { style: "plain" } }, style: { pad_top: 40, title_font: "serif" } },
        {
          id: id("hs-tabs"), type: "tabs", visible: true,
          settings: {
            title: "쓰는 곳별로 보기",
            tabs: [
              { label: "헤어", ...NEW },
              { label: "바디", ...NEW },
              { label: "핸드·풋", ...NEW },
              { label: "향기 소품", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line", card: { style: "plain" },
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_font: "serif" },
        },
        { id: id("hs-reviews"), type: "reviews", visible: true, settings: { title: "써 보신 분들의 이야기", count: 6, min_rating: 4, skin: "slide" }, style: { title_font: "serif" } },
        { id: id("hs-notice"), type: "notice", visible: true, settings: { title: "살롱 소식", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 143 — 향수 부티크처럼: 어두운 테마 + 퍼플 포인트, 명조 제목, 향 계열 탭(밑줄), 기간 한정(기본 테두리), 4:5 사진
    id: "perfume-noir",
    name: "143. 향수 & 향기 누아르 다크 스타일",
    description: "어두운 바탕에 퍼플 포인트와 명조 제목, 플로럴·우디·시트러스 향 계열 탭과 기간 한정 상품을 둔 구성. 향수·디퓨저·향초처럼 분위기로 고르는 향기 몰과 뷰티 편집숍에 맞음",
    industries: ["beauty", "general"],
    moods: ["고급", "다크", "분위기"],
    defaultColor: "purple",
    shape: { radius: "none", button: "flat", image_ratio: "4:5", mode: "dark" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "오늘의 기분에 어울리는 향을 찾아보세요", link: "", bg: "#2e1065" } },
      list: { ...DEFAULT_LIST, columns: 4, card: { style: "plain" } },
      home: doc([
        {
          id: id("pn-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "SCENT NOIR",
            title: "기억에 남는",
            accent: "나만의 향",
            text: "꽃향기부터 나무 향, 상큼한 향까지 계열별로 나눠 두었습니다.",
            button: { label: "향 계열별로 보기 →", link: `#blk-${id("pn-tabs")}` },
            button2: { label: "기간 한정 상품", link: `#blk-${id("pn-sale")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#140f1f", pad_top: 64, pad_bottom: 64, title_font: "serif" },
        },
        {
          id: id("pn-tabs"), type: "tabs", visible: true,
          settings: {
            title: "향 계열별로 보기",
            tabs: [
              { label: "플로럴", ...NEW },
              { label: "우디", ...NEW },
              { label: "시트러스", ...NEW },
              { label: "디퓨저·향초", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line", card: { style: "plain" },
          },
          style: { width: "full", bg_color: "#171717", pad_top: 48, pad_bottom: 48, title_font: "serif" },
        },
        {
          id: id("pn-sale"), type: "timesale", visible: true,
          settings: { title: "기간 한정 향", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 7 * DAY).toISOString(), ...NEW, columns: 4, limit: 4 },
          style: { title_font: "serif" },
        },
        { id: id("pn-new"), type: "showcase", visible: true, settings: { title: "새로 들어온 향", ...NEW, columns: 4, limit: 10, layout: "row", card: { style: "plain" } }, style: { title_font: "serif" } },
        { id: id("pn-reviews"), type: "reviews", visible: true, settings: { title: "향을 맡아 보신 후기", count: 6, min_rating: 4, skin: "slide" } },
      ]),
    }),
  },
  // ── 키즈 1종(144) ──
  {
    // 144 — 아이 옷장처럼: 핑크 포인트, 둥근 고딕 제목, 나이별 알약 탭, 계절 특가(타임세일), 둥근 입체 단추 3:4
    id: "kids-closet",
    name: "144. 키즈 데일리 옷장 스타일",
    description: "핑크 포인트에 둥근 제목, 아기·유아·초등 나이별 탭과 계절 옷 특가를 앞세운 3:4 세로 사진 구성. 아동복·아기옷·신발과 가방 같은 키즈 패션 몰에 맞음",
    industries: ["kids", "fashion", "general"],
    moods: ["사랑스러움", "데일리", "발랄함"],
    defaultColor: "pink",
    shape: { radius: "xl", button: "3d", image_ratio: "3:4" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "쑥쑥 크는 아이에게 맞는 옷을 골라 보세요", link: "", bg: "#9d174d" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("kw-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "KIDS CLOSET",
            title: "매일 입히기 좋은",
            accent: "우리 아이 옷장",
            text: "아기부터 초등학생까지 나이에 맞춰 옷과 신발, 가방을 나눠 두었습니다.",
            button: { label: "나이별로 보기", link: `#blk-${id("kw-tabs")}` },
            button2: { label: "계절 특가 보기", link: `#blk-${id("kw-sale")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#fdf2f8", pad_top: 56, pad_bottom: 56, title_align: "center", title_font: "round" },
        },
        {
          id: id("kw-tabs"), type: "tabs", visible: true,
          settings: {
            title: "나이별로 보기",
            tabs: [
              { label: "아기(0~2세)", ...NEW },
              { label: "유아(3~6세)", ...NEW },
              { label: "초등", ...NEW },
              { label: "신발·가방", ...NEW },
            ],
            columns: 4, limit: 8,
          },
          style: { pad_top: 40, title_align: "center", title_font: "round" },
        },
        {
          id: id("kw-sale"), type: "timesale", visible: true,
          settings: { title: "계절 옷 특가", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 7 * DAY).toISOString(), ...NEW, columns: 4, limit: 4 },
          style: { title_align: "center", title_font: "round" },
        },
        { id: id("kw-new"), type: "showcase", visible: true, settings: { title: "새로 들어온 옷", ...NEW, columns: 4, limit: 8 }, style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_align: "center", title_font: "round" } },
        { id: id("kw-reviews"), type: "reviews", visible: true, settings: { title: "입혀 보신 후기", count: 6, min_rating: 4, skin: "slide" } },
      ]),
    }),
  },
];
