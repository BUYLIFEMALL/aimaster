// 디자인 빌더 D5+ — 프론트(Claude) 스타일 템플릿 3종(2026-11-15 주인님 「니가 AGY 디자인 템플릿 생성 지침 보고 너의 스타일로 3개」)
// agy가 같은 때 templates.ts에 키즈·디지털·도매 카탈로그를 만들고 있어 겹치지 않는 분위기로 만들고, 파일도 따로 둔다(충돌 방지).
// templates.ts의 LAYOUTS가 이 배열을 이어 붙인다. 규칙은 templates.ts 머리 주석과 같다:
//   그림(배너·로고) 없이 완성돼 보일 것 / 문구에 몰마다 다른 사실(인증·보증·쿠폰·배송 약속 등) 금지(시험이 막음) / 블록 번호 `t-…`
//   어둡게(mode: "dark") 레이아웃은 블록 배경색도 어두운 색(시험이 밝기 짝 검사)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { SCHEMA_VERSION, type Block, type BlocksDoc } from "../blocks.ts";
import { DEFAULT_DETAIL, DEFAULT_LIST } from "./pages.ts";
import { DEFAULT_FOOTER, DEFAULT_HEADER, DEFAULT_POPUP } from "./frame.ts";
import type { LayoutTemplate } from "./templates.ts";

const id = (s: string) => `t-${s}`;
const doc = (blocks: Block[]): BlocksDoc => ({ schema_version: SCHEMA_VERSION, blocks });
const base = { header: DEFAULT_HEADER, footer: DEFAULT_FOOTER, popup: DEFAULT_POPUP, list: DEFAULT_LIST, detail: DEFAULT_DETAIL };
const NEW = { source: "new" as const, category_id: "", product_ids: [] as string[] };

export const EXTRA_LAYOUTS: LayoutTemplate[] = [
  {
    // 116 — 잡지 표지처럼: 가운데 큰 제목·넓은 여백·각진 모서리·테두리 없는 세로 사진
    id: "editorial-magazine",
    name: "116. 에디토리얼 매거진 스타일",
    description: "잡지 표지처럼 가운데 큰 제목과 넓은 여백, 각진 모서리·테두리 없는 4:5 세로 사진. 패션·뷰티·리빙 셀렉트숍에 맞음",
    industries: ["fashion", "beauty", "living", "general"],
    moods: ["에디토리얼", "여백", "모던"],
    defaultColor: "charcoal",
    shape: { radius: "none", button: "flat", image_ratio: "4:5" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "이번 시즌의 이야기를 담았습니다", link: "", bg: "#1f2937" } },
      list: { ...DEFAULT_LIST, columns: 4, card: { style: "plain", hide_business: true } },
      home: doc([
        {
          id: id("em-cover"), type: "hero", visible: true,
          settings: {
            eyebrow: "THE EDIT",
            title: `${storeName}`.slice(0, 40),
            accent: "이번 시즌 셀렉션",
            text: "오래 곁에 두고 싶은 것들만 골라 한 권의 잡지처럼 엮었습니다.",
            button: { label: "셀렉션 보기", link: `#blk-${id("em-pick")}` },
            button2: { label: "주제별로 보기", link: `#blk-${id("em-tabs")}` },
            feature: false, ...NEW,
          },
          style: { width: "full", bg_color: "#f5f5f4", pad_top: 80, pad_bottom: 80, title_align: "center" },
        },
        {
          id: id("em-pick"), type: "showcase", visible: true,
          settings: { title: "에디터의 선택", ...NEW, columns: 4, limit: 8, card: { style: "plain", hide_business: true } },
          style: { pad_top: 48, title_align: "center" },
        },
        {
          id: id("em-tabs"), type: "tabs", visible: true,
          settings: {
            title: "주제별 셀렉션",
            tabs: [
              { label: "새로 들어온", ...NEW },
              { label: "데일리", ...NEW },
              { label: "선물하기 좋은", ...NEW },
            ],
            columns: 4, limit: 8, card: { style: "plain", hide_business: true },
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_align: "center" },
        },
        { id: id("em-reviews"), type: "reviews", visible: true, settings: { title: "읽어 볼 만한 후기", count: 3, min_rating: 5 }, style: { title_align: "center" } },
        { id: id("em-notice"), type: "notice", visible: true, settings: { title: "소식", count: 3 } },
      ]),
    }),
  },
  {
    // 117 — 쇼룸처럼: 차콜 모노톤, 흰 띠와 회색 바탕이 번갈아, 오른쪽 대표 상품, 4:3 가로 사진 3열
    id: "minimal-showroom",
    name: "117. 미니멀 리빙 쇼룸 스타일",
    description: "차콜 모노톤에 흰 띠와 회색 바탕이 번갈아 나오는 쇼룸 구성, 4:3 가로 사진 3열. 가구·리빙·디지털 기기처럼 모양을 보여 줘야 하는 몰에 맞음",
    industries: ["living", "digital", "general", "b2b"],
    moods: ["미니멀", "차분함", "쇼룸"],
    defaultColor: "charcoal",
    shape: { radius: "sm", button: "flat", image_ratio: "4:3" },
    build: () => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "공간에 어울리는 물건을 천천히 둘러보세요", link: "", bg: "#334155" }, search: "icon" },
      list: { ...DEFAULT_LIST, columns: 3 },
      home: doc([
        {
          id: id("ms-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "SHOWROOM",
            title: "덜어 낼수록",
            accent: "선명해지는 공간",
            text: "형태와 쓰임이 분명한 물건을 골랐습니다.\n쇼룸을 걷듯 천천히 둘러보세요.",
            button: { label: "쇼룸 둘러보기", link: `#blk-${id("ms-show")}` },
            button2: { label: "공간별로 보기", link: `#blk-${id("ms-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 64, pad_bottom: 64 },
        },
        { id: id("ms-show"), type: "showcase", visible: true, settings: { title: "이번 주 쇼룸", ...NEW, columns: 3, limit: 6 }, style: { pad_top: 40 } },
        {
          id: id("ms-tabs"), type: "tabs", visible: true,
          settings: {
            title: "공간별로 보기",
            tabs: [
              { label: "거실", ...NEW },
              { label: "주방", ...NEW },
              { label: "작업실", ...NEW },
            ],
            columns: 3, limit: 6,
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 },
        },
        { id: id("ms-reviews"), type: "reviews", visible: true, settings: { title: "써 보신 분들의 이야기", count: 3, min_rating: 4 } },
        { id: id("ms-notice"), type: "notice", visible: true, settings: { title: "공지사항", count: 3 } },
      ]),
    }),
  },
  {
    // 118 — 밤 거리처럼: 어두운 테마 + 오렌지 포인트, 3:4 세로 사진, 가로로 넘기는 신상품 줄, 굵은 입체 단추
    id: "street-night",
    name: "118. 스트리트 나이트 다크 스타일",
    description: "어두운 바탕에 오렌지 포인트, 가로로 넘기는 신상품 줄과 3:4 세로 사진. 스트리트 패션·스니커즈·캐릭터 굿즈처럼 강한 인상이 필요한 몰에 맞음",
    industries: ["fashion", "general", "kids", "digital"],
    moods: ["강렬함", "다크", "스트리트"],
    defaultColor: "orange",
    shape: { radius: "lg", button: "3d", image_ratio: "3:4", mode: "dark" },
    build: () => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "새로운 드롭을 가장 먼저 만나 보세요", link: "", bg: "#c2410c" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("sn-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "NEW DROP",
            title: "밤이 길어질수록",
            accent: "더 선명하게",
            text: "이번 주 새로 들어온 아이템을 한눈에 확인하세요.",
            button: { label: "신상품 보러 가기 →", link: `#blk-${id("sn-drop")}` },
            button2: { label: "스타일별로 보기", link: `#blk-${id("sn-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#1c1917", pad_top: 64, pad_bottom: 64 },
        },
        { id: id("sn-drop"), type: "showcase", visible: true, settings: { title: "이번 주 드롭", ...NEW, columns: 4, limit: 10, layout: "row" }, style: { pad_top: 40 } },
        {
          id: id("sn-tabs"), type: "tabs", visible: true,
          settings: {
            title: "스타일별로 보기",
            tabs: [
              { label: "신상품", ...NEW },
              { label: "많이 보는", ...NEW },
              { label: "다시 들어온", ...NEW },
            ],
            columns: 4, limit: 8,
          },
          style: { width: "full", bg_color: "#171717", pad_top: 48, pad_bottom: 48 },
        },
        { id: id("sn-reviews"), type: "reviews", visible: true, settings: { title: "생생한 착용 후기", count: 6, min_rating: 4 } },
        { id: id("sn-notice"), type: "notice", visible: true, settings: { title: "드롭 소식", count: 3 } },
      ]),
    }),
  },
];
