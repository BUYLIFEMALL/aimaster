// 디자인 빌더 D5+ 3차 — 프론트(Claude(B2BFront)) 템플릿 8종 131~138(2026-11-16, Codex Master 배정 FRONT-20261116-05)
// 업종별 레이아웃이 식품 6·디지털 6이라 목표 「업종별 10종 이상」까지 각 4종씩 보강한다(작업표 D5+).
// templates.ts의 LAYOUTS가 이 배열을 이어 붙인다. 규칙은 templates.ts·templates-extra-2.ts 머리 주석과 같다:
//   그림(배너·로고)·몰마다 다른 카테고리 번호 없이 완성돼 보일 것 / 문구에 몰마다 다른 사실(인증·보증·쿠폰·배송 약속·효과 등) 금지(시험이 막음)
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

export const EXTRA_LAYOUTS_3: LayoutTemplate[] = [
  // ── 식품 4종(131~134) ──
  {
    // 131 — 집밥 식탁처럼: 오렌지 포인트, 이번 주 식단 하나를 크게(spotlight), 국·반찬·밀키트 탭, 4:3 가로 사진
    id: "meal-kit-kitchen",
    name: "131. 밀키트 & 반찬 키친 스타일",
    description: "오렌지 포인트에 이번 주 식단 하나를 크게 보여 주고 국·반찬·밀키트 탭으로 나눈 4:3 가로 사진 구성. 반찬·밀키트·간편 조리식 몰과 생활 장보기 몰에 맞음",
    industries: ["food", "living", "general"],
    moods: ["집밥", "든든함", "생활"],
    defaultColor: "orange",
    shape: { radius: "lg", button: "3d", image_ratio: "4:3" },
    build: () => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "이번 주 식탁 메뉴를 골라 보세요", link: "", bg: "#9a3412" } },
      list: { ...DEFAULT_LIST, columns: 3 },
      home: doc([
        {
          id: id("mk-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "WEEKLY KITCHEN",
            title: "오늘 저녁은",
            accent: "데우기만 하면 한 상",
            text: "국과 반찬, 밀키트까지 이번 주 식탁에 올릴 메뉴를 모았습니다.",
            button: { label: "이번 주 식단 보기", link: `#blk-${id("mk-week")}` },
            button2: { label: "메뉴별로 보기", link: `#blk-${id("mk-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#fff7ed", pad_top: 56, pad_bottom: 56 },
        },
        { id: id("mk-week"), type: "showcase", visible: true, settings: { title: "이번 주 식단", ...NEW, columns: 3, limit: 7, skin: "spotlight" }, style: { pad_top: 40 } },
        {
          id: id("mk-tabs"), type: "tabs", visible: true,
          settings: {
            title: "메뉴별로 보기",
            tabs: [
              { label: "국·찌개", ...NEW },
              { label: "반찬", ...NEW },
              { label: "밀키트", ...NEW },
            ],
            columns: 3, limit: 6,
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 },
        },
        { id: id("mk-reviews"), type: "reviews", visible: true, settings: { title: "드셔 보신 후기", count: 6, min_rating: 4 } },
        { id: id("mk-notice"), type: "notice", visible: true, settings: { title: "주문 안내", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 132 — 찻집 진열장처럼: 에메랄드 포인트, 명조 제목, 가게 이야기 글, 가로로 넘기는 블렌드 줄, 각진 모서리 1:1
    id: "tea-house",
    name: "132. 차 & 커피 티하우스 스타일",
    description: "에메랄드 포인트에 명조 제목과 가게 이야기 글, 가로로 넘기는 이번 달 블렌드 줄. 차·커피 원두·다구와 도구 같은 기호식품 몰과 선물용 생활 몰에 맞음",
    industries: ["food", "living", "general"],
    moods: ["차분함", "취향", "여유"],
    defaultColor: "emerald",
    shape: { radius: "sm", button: "flat", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "한 잔의 여유를 고르는 시간", link: "", bg: "#065f46" } },
      list: { ...DEFAULT_LIST, columns: 4, card: { style: "plain" } },
      home: doc([
        {
          id: id("th-story"), type: "html", visible: true,
          settings: { html: `<h2>${esc(storeName)} 티하우스</h2><p>차와 커피, 그리고 한 잔을 준비하는 도구를 소개합니다. 취향에 맞는 한 잔을 천천히 골라 보세요.</p>` },
          style: { width: "full", bg_color: "#f0fdf8", pad_top: 56, pad_bottom: 48, title_align: "center", text_align: "center", title_font: "serif" },
        },
        { id: id("th-blend"), type: "showcase", visible: true, settings: { title: "이번 달 블렌드", ...NEW, columns: 4, limit: 10, layout: "row", card: { style: "plain" } }, style: { pad_top: 40, title_font: "serif" } },
        {
          id: id("th-tabs"), type: "tabs", visible: true,
          settings: {
            title: "찻장 둘러보기",
            tabs: [
              { label: "잎차·티백", ...NEW },
              { label: "커피 원두", ...NEW },
              { label: "다구·도구", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line", card: { style: "plain" },
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_font: "serif" },
        },
        { id: id("th-reviews"), type: "reviews", visible: true, settings: { title: "마셔 보신 분들의 이야기", count: 6, min_rating: 4, skin: "slide" }, style: { title_font: "serif" } },
        { id: id("th-notice"), type: "notice", visible: true, settings: { title: "티하우스 소식", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 133 — 편의점 간식 코너처럼: 빨강 포인트, 굵은 제목, 간식 특가(타임세일), 맛별 알약 탭, 둥근 입체 단추
    id: "snack-pop",
    name: "133. 간식 & 음료 팝 스타일",
    description: "빨강 포인트에 굵은 제목, 간식 특가와 맛별 탭을 앞세운 발랄한 구성. 과자·젤리·음료·아이 간식처럼 여러 개를 골라 담는 간식 몰에 맞음",
    industries: ["food", "kids", "general"],
    moods: ["발랄함", "간식", "고르는 재미"],
    defaultColor: "red",
    shape: { radius: "xl", button: "3d", image_ratio: "1:1" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "오늘 먹고 싶은 간식을 골라 담아 보세요", link: "", bg: "#991b1b" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("sp-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "SNACK TIME",
            title: "출출할 때",
            accent: "골라 먹는 간식",
            text: "달콤한 것부터 짭짤한 것, 시원한 음료까지 기분 따라 골라 담아 보세요.",
            button: { label: "간식 특가 보기", link: `#blk-${id("sp-sale")}` },
            button2: { label: "맛별로 보기", link: `#blk-${id("sp-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#fef2f2", pad_top: 56, pad_bottom: 56, title_align: "center", title_font: "bold" },
        },
        {
          id: id("sp-sale"), type: "timesale", visible: true,
          settings: { title: "간식 특가", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 5 * DAY).toISOString(), ...NEW, columns: 4, limit: 4 },
          style: { pad_top: 40, title_font: "bold" },
        },
        {
          id: id("sp-tabs"), type: "tabs", visible: true,
          settings: {
            title: "맛별로 골라 보세요",
            tabs: [
              { label: "달콤한 간식", ...NEW },
              { label: "짭짤한 간식", ...NEW },
              { label: "음료", ...NEW },
              { label: "묶음 상품", ...NEW },
            ],
            columns: 4, limit: 8,
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48, title_align: "center", title_font: "bold" },
        },
        { id: id("sp-new"), type: "showcase", visible: true, settings: { title: "새로 나온 간식", ...NEW, columns: 4, limit: 8 }, style: { title_align: "center", title_font: "bold" } },
        { id: id("sp-reviews"), type: "reviews", visible: true, settings: { title: "먹어 본 후기", count: 6, min_rating: 4, skin: "slide" } },
      ]),
    }),
  },
  {
    // 134 — 정육점 진열대처럼: 어두운 테마 + 빨강 포인트, 부위별 탭, 특가(기본 테두리 — 어두운 테마에선 어두운 띠 스킨의 바탕이 밝게 뒤집혀 제목이 안 보임, 2026-11-16 실화면), 4:3 가로 사진
    id: "butcher-dark",
    name: "134. 정육 & 수산 다크 마켓 스타일",
    description: "어두운 바탕에 빨강 포인트, 부위별 탭과 이번 주 특가, 4:3 가로 사진. 정육·수산·캠핑 먹거리 몰과 식당 납품처럼 대량 주문을 받는 몰에 맞음",
    industries: ["food", "b2b", "general"],
    moods: ["강렬함", "다크", "푸짐함"],
    defaultColor: "red",
    shape: { radius: "sm", button: "flat", image_ratio: "4:3", mode: "dark" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "부위별로 골라 담는 고기와 해산물", link: "", bg: "#7f1d1d" } },
      list: { ...DEFAULT_LIST, columns: 3 },
      home: doc([
        {
          id: id("bd-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "BUTCHER & FISH",
            title: "오늘 식탁의 주인공",
            accent: "부위별로 골라 담기",
            text: "구이용부터 국거리, 해산물까지 쓰임새에 맞춰 나눠 두었습니다.",
            button: { label: "부위별로 보기 →", link: `#blk-${id("bd-tabs")}` },
            button2: { label: "이번 주 특가", link: `#blk-${id("bd-sale")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#1c1917", pad_top: 64, pad_bottom: 64, title_font: "bold" },
        },
        {
          id: id("bd-tabs"), type: "tabs", visible: true,
          settings: {
            title: "부위별로 보기",
            tabs: [
              { label: "소고기", ...NEW },
              { label: "돼지고기", ...NEW },
              { label: "닭·오리", ...NEW },
              { label: "수산", ...NEW },
            ],
            columns: 3, limit: 6, skin: "line",
          },
          style: { width: "full", bg_color: "#171717", pad_top: 48, pad_bottom: 48, title_font: "bold" },
        },
        {
          id: id("bd-sale"), type: "timesale", visible: true,
          settings: { title: "이번 주 특가", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 7 * DAY).toISOString(), ...NEW, columns: 3, limit: 3 },
        },
        { id: id("bd-best"), type: "showcase", visible: true, settings: { title: "많이 찾는 상품", ...NEW, columns: 3, limit: 6 }, style: { title_font: "bold" } },
        { id: id("bd-reviews"), type: "reviews", visible: true, settings: { title: "구워 보신 후기", count: 3, min_rating: 4 } },
        { id: id("bd-notice"), type: "notice", visible: true, settings: { title: "주문 안내", count: 3, skin: "line" } },
      ]),
    }),
  },
  // ── 디지털 4종(135~138) ──
  {
    // 135 — 기기 리뷰 잡지처럼: 파랑 포인트, 주목 기기 하나를 크게, 넘기는 후기, 4:3 가로 사진
    id: "gadget-lab",
    name: "135. 가젯 리뷰 랩 스타일",
    description: "파랑 포인트에 이번 주 주목 기기 하나를 크게 보여 주고, 넘기는 사용 후기와 쓰임새별 탭을 둔 4:3 가로 사진 구성. 휴대폰 액세서리·음향·충전 기기 같은 소형 전자 몰에 맞음",
    industries: ["digital", "general", "living"],
    moods: ["깔끔함", "리뷰", "테크"],
    defaultColor: "blue",
    shape: { radius: "md", button: "flat", image_ratio: "4:3" },
    build: () => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "써 본 사람들의 이야기로 고르는 기기", link: "", bg: "#1e3a8a" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("gl-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "GADGET LAB",
            title: "매일 손에 쥐는",
            accent: "작은 기기들",
            text: "휴대폰 곁에 두고 쓰는 액세서리와 기기를 쓰임새별로 정리했습니다.",
            button: { label: "주목 기기 보기", link: `#blk-${id("gl-pick")}` },
            button2: { label: "쓰임새별로 보기", link: `#blk-${id("gl-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#eff6ff", pad_top: 56, pad_bottom: 56 },
        },
        { id: id("gl-pick"), type: "showcase", visible: true, settings: { title: "이번 주 주목 기기", ...NEW, columns: 4, limit: 9, skin: "spotlight" }, style: { pad_top: 40 } },
        { id: id("gl-reviews"), type: "reviews", visible: true, settings: { title: "써 보신 분들의 후기", count: 6, min_rating: 4, skin: "slide" } },
        {
          id: id("gl-tabs"), type: "tabs", visible: true,
          settings: {
            title: "쓰임새별로 보기",
            tabs: [
              { label: "충전·케이블", ...NEW },
              { label: "음향", ...NEW },
              { label: "케이스·거치대", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line",
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 },
        },
        { id: id("gl-notice"), type: "notice", visible: true, settings: { title: "공지사항", count: 3 } },
      ]),
    }),
  },
  {
    // 136 — 게이밍 매장처럼: 어두운 테마 + 퍼플 포인트, 굵은 제목, 특가(기본 테두리 — 134와 같은 이유), 가로로 넘기는 신제품 줄
    id: "gaming-gear-dark",
    name: "136. 게이밍 기어 네온 다크 스타일",
    description: "어두운 바탕에 퍼플 포인트와 굵은 제목, 장비 특가와 가로로 넘기는 신제품 줄. 키보드·마우스·헤드셋 같은 게이밍 장비와 PC 주변기기 몰에 맞음",
    industries: ["digital", "general", "kids"],
    moods: ["강렬함", "다크", "게이밍"],
    defaultColor: "purple",
    shape: { radius: "sm", button: "flat", image_ratio: "1:1", mode: "dark" },
    build: ({ now }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "손에 맞는 장비로 플레이를 준비하세요", link: "", bg: "#4c1d95" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("gg-hero"), type: "hero", visible: true,
          settings: {
            eyebrow: "GAME ON",
            title: "내 손에 꼭 맞는",
            accent: "게이밍 장비",
            text: "키보드부터 마우스, 헤드셋까지 플레이 스타일에 맞춰 골라 보세요.",
            button: { label: "신제품 보기 →", link: `#blk-${id("gg-new")}` },
            button2: { label: "장비별로 보기", link: `#blk-${id("gg-tabs")}` },
            feature: true, ...NEW,
          },
          style: { width: "full", bg_color: "#120f1f", pad_top: 64, pad_bottom: 64, title_font: "bold" },
        },
        {
          id: id("gg-sale"), type: "timesale", visible: true,
          settings: { title: "이번 주 장비 특가", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 7 * DAY).toISOString(), ...NEW, columns: 4, limit: 4 },
          style: { pad_top: 40, title_font: "bold" },
        },
        { id: id("gg-new"), type: "showcase", visible: true, settings: { title: "새로 나온 장비", ...NEW, columns: 4, limit: 10, layout: "row" }, style: { title_font: "bold" } },
        {
          id: id("gg-tabs"), type: "tabs", visible: true,
          settings: {
            title: "장비별로 보기",
            tabs: [
              { label: "키보드", ...NEW },
              { label: "마우스", ...NEW },
              { label: "헤드셋", ...NEW },
              { label: "의자·책상 소품", ...NEW },
            ],
            columns: 4, limit: 8, skin: "line",
          },
          style: { width: "full", bg_color: "#171717", pad_top: 48, pad_bottom: 48, title_font: "bold" },
        },
        { id: id("gg-reviews"), type: "reviews", visible: true, settings: { title: "플레이어 후기", count: 6, min_rating: 4, skin: "slide" } },
      ]),
    }),
  },
  {
    // 137 — 집 안 공간별 진열처럼: 차콜 포인트, 집 소개 글, 공간별 탭, 첫 상품을 크게, 입체 단추 1:1
    id: "smart-home",
    name: "137. 스마트 홈 & 가전 스타일",
    description: "차콜 포인트에 거실·주방·침실 공간별 탭과 많이 찾는 가전 하나를 크게 보여 주는 구성. 소형 가전·조명·스마트 기기·생활 가전 몰에 맞음",
    industries: ["digital", "living", "general"],
    moods: ["모던", "생활", "편리함"],
    defaultColor: "charcoal",
    shape: { radius: "lg", button: "3d", image_ratio: "1:1" },
    build: ({ now, storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "공간에 맞는 가전을 찾아보세요", link: "", bg: "#1e293b" } },
      list: { ...DEFAULT_LIST, columns: 4 },
      home: doc([
        {
          id: id("sh-intro"), type: "html", visible: true,
          settings: { html: `<h2>${esc(storeName)} 스마트 홈</h2><p>거실과 주방, 침실까지 공간마다 어울리는 가전과 기기를 나눠 두었습니다.</p>` },
          style: { width: "full", bg_color: "#f1f5f9", pad_top: 48, pad_bottom: 40, title_align: "center", text_align: "center" },
        },
        {
          id: id("sh-tabs"), type: "tabs", visible: true,
          settings: {
            title: "공간별로 보기",
            tabs: [
              { label: "거실", ...NEW },
              { label: "주방", ...NEW },
              { label: "침실·서재", ...NEW },
            ],
            columns: 4, limit: 8,
          },
          style: { pad_top: 40, title_align: "center" },
        },
        { id: id("sh-best"), type: "showcase", visible: true, settings: { title: "많이 찾는 가전", ...NEW, columns: 4, limit: 9, skin: "spotlight" }, style: { width: "full", bg_color: "#ffffff", pad_top: 48, pad_bottom: 48 } },
        {
          id: id("sh-sale"), type: "timesale", visible: true,
          settings: { title: "기간 한정 가전", subtitle: "준비한 수량이 끝나면 마감돼요", ends_at: new Date(now + 10 * DAY).toISOString(), ...NEW, columns: 4, limit: 4 },
        },
        { id: id("sh-reviews"), type: "reviews", visible: true, settings: { title: "들여놓은 분들의 후기", count: 3, min_rating: 4 } },
        { id: id("sh-notice"), type: "notice", visible: true, settings: { title: "설치·이용 안내", count: 3, skin: "line" } },
      ]),
    }),
  },
  {
    // 138 — 사무용 IT 납품 카탈로그처럼: 네이비 포인트, 촘촘한 5열, 품목별 탭을 먼저, 공지를 위로, 각진 모서리
    id: "it-office-bulk",
    name: "138. IT 오피스 대량 구매 스타일",
    description: "네이비 포인트에 품목별 탭을 맨 앞에 두고 5열로 촘촘하게 보여 주는 카탈로그형. 사무실·학원·매장에 노트북 주변기기와 소모품을 묶어 납품하는 도매·B2B 몰에 맞음",
    industries: ["digital", "b2b", "general"],
    moods: ["실용", "카탈로그", "업무"],
    defaultColor: "navy",
    shape: { radius: "sm", button: "flat", image_ratio: "1:1" },
    build: ({ storeName }) => ({
      ...base,
      header: { ...DEFAULT_HEADER, band: { text: "사무실에 필요한 IT 품목을 한 번에 주문하세요", link: "", bg: "#1e3a8a" } },
      list: { ...DEFAULT_LIST, columns: 5, card: { style: "plain" } },
      home: doc([
        {
          id: id("io-intro"), type: "html", visible: true,
          settings: { html: `<h2>${esc(storeName)} 업무용 IT 카탈로그</h2><p>품목별로 나눠 두었습니다. 여러 개를 한 번에 주문하실 때는 공지사항의 주문 안내를 먼저 확인해 주세요.</p>` },
          style: { width: "full", bg_color: "#eef2ff", pad_top: 40, pad_bottom: 32 },
        },
        { id: id("io-notice"), type: "notice", visible: true, settings: { title: "주문 안내", count: 3, skin: "line" }, style: { pad_top: 32 } },
        {
          id: id("io-tabs"), type: "tabs", visible: true,
          settings: {
            title: "품목별로 보기",
            tabs: [
              { label: "노트북·모니터", ...NEW },
              { label: "주변기기", ...NEW },
              { label: "네트워크", ...NEW },
              { label: "소모품", ...NEW },
            ],
            columns: 5, limit: 10, skin: "line", card: { style: "plain" },
          },
          style: { width: "full", bg_color: "#ffffff", pad_top: 40, pad_bottom: 40 },
        },
        { id: id("io-best"), type: "showcase", visible: true, settings: { title: "많이 주문하는 품목", ...NEW, columns: 5, limit: 10, card: { style: "plain" } } },
        { id: id("io-reviews"), type: "reviews", visible: true, settings: { title: "구매 후기", count: 3, min_rating: 4 } },
      ]),
    }),
  },
];
