// 디자인 빌더 D3 — 손님 화면 틀(헤더·바닥글·첫 화면 팝업) 디자인 값 검사·읽기(node --test 대상, DB 없음)
// 저장: DB 0080 mall_builder_design (kind header / footer / popup). 비어 있으면 지금(106 스타일) 틀 그대로
// 프로셀 공통 틀 6구역(띠·메뉴·로고·상점 정보·입금 계좌·하단 아이콘) 참고 — 사업자(판매자) 정보는 법정 표시라 끌 수 없다(잠금)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { optionalImage, safeLink } from "../blocks.ts";

export type MenuLink = { label: string; link: string };
export type MenuItem = MenuLink & { children: MenuLink[] };
export type HeaderDesign = {
  band: { text: string; link: string; bg: string }; // 사이트 전체 맨 위 띠(text 비우면 없음)
  logo: string; // 상단 로고 그림(비우면 몰 이름 글자)
  logo_footer: string; // 바닥글 로고(비우면 몰 이름 글자)
  logo_page: string; // 단독 화면(로그인·빈 화면) 로고 — 비우면 상단 로고
  menu: MenuItem[]; // 카테고리 줄 뒤에 붙는 메뉴(2단까지)
  show_categories: boolean; // 카테고리 줄 보이기
  search: "box" | "icon" | "none"; // 검색 칸 / 돋보기만 / 숨김
};
export type FooterDesign = {
  columns: { title: string; links: MenuLink[] }[]; // 링크 묶음(3개까지)
  note: string; // 안내 문구(여러 줄)
  show_bank: boolean; // 무통장 입금 계좌 보이기
};
export type PopupDesign = { items: { image: string; link: string }[]; hide_days: number }; // 첫 화면 팝업(3장까지), 「n일 보지 않기」

export const DEFAULT_HEADER: HeaderDesign = { band: { text: "", link: "", bg: "#111827" }, logo: "", logo_footer: "", logo_page: "", menu: [], show_categories: true, search: "box" };
export const DEFAULT_FOOTER: FooterDesign = { columns: [], note: "", show_bank: true };
export const DEFAULT_POPUP: PopupDesign = { items: [], hide_days: 1 };

export const MAX_MENU = 8;
export const MAX_SUBMENU = 8;
export const MAX_FOOTER_COLUMNS = 3;
export const MAX_FOOTER_LINKS = 8;
export const MAX_POPUP = 3;

const HEX = /^#[0-9a-f]{6}$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
type Out<T> = { ok: true; value: T } | { ok: false; error: string };

function link(raw: unknown, where: string): Out<MenuLink> {
  const o = obj(raw);
  const label = str(o.label).slice(0, 20);
  const l = safeLink(o.link);
  if (!label) return { ok: false, error: `${where}: 메뉴 이름을 넣어 주세요.` };
  if (l === null) return { ok: false, error: `${where}: 링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다.` };
  return { ok: true, value: { label, link: l } };
}

function image(v: unknown, what: string): Out<string> {
  const i = optionalImage(v);
  return i === null ? { ok: false, error: `${what} 그림 주소가 올바르지 않습니다(https 주소).` } : { ok: true, value: i };
}

export function validateHeader(raw: unknown): Out<HeaderDesign> {
  const o = obj(raw);
  const b = obj(o.band);
  const bandLink = safeLink(b.link);
  if (bandLink === null) return { ok: false, error: "띠 링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다." };
  const bandText = str(b.text);
  if (bandText.length > 60) return { ok: false, error: "띠 문구는 60자까지입니다." };
  const logos: string[] = [];
  for (const [k, what] of [["logo", "상단 로고"], ["logo_footer", "바닥글 로고"], ["logo_page", "단독 화면 로고"]] as const) {
    const r = image(o[k], what);
    if (!r.ok) return r;
    logos.push(r.value);
  }
  const items = arr(o.menu);
  if (items.length > MAX_MENU) return { ok: false, error: `메뉴는 ${MAX_MENU}개까지 넣을 수 있습니다.` };
  const menu: MenuItem[] = [];
  for (const [i, it] of items.entries()) {
    const top = link(it, `${i + 1}번째 메뉴`);
    if (!top.ok) return top;
    const subs = arr(obj(it).children);
    if (subs.length > MAX_SUBMENU) return { ok: false, error: `${i + 1}번째 메뉴: 아래 메뉴는 ${MAX_SUBMENU}개까지입니다.` };
    const children: MenuLink[] = [];
    for (const [j, c] of subs.entries()) {
      const r = link(c, `${i + 1}번째 메뉴의 ${j + 1}번째 아래 메뉴`);
      if (!r.ok) return r;
      children.push(r.value);
    }
    menu.push({ ...top.value, children });
  }
  const search = o.search === "icon" || o.search === "none" ? o.search : "box";
  return {
    ok: true,
    value: {
      band: { text: bandText, link: bandLink, bg: HEX.test(str(b.bg).toLowerCase()) ? str(b.bg).toLowerCase() : DEFAULT_HEADER.band.bg },
      logo: logos[0],
      logo_footer: logos[1],
      logo_page: logos[2],
      menu,
      show_categories: o.show_categories !== false,
      search,
    },
  };
}

export function validateFooter(raw: unknown): Out<FooterDesign> {
  const o = obj(raw);
  const cols = arr(o.columns);
  if (cols.length > MAX_FOOTER_COLUMNS) return { ok: false, error: `바닥글 링크 묶음은 ${MAX_FOOTER_COLUMNS}개까지입니다.` };
  const columns: FooterDesign["columns"] = [];
  for (const [i, c] of cols.entries()) {
    const title = str(obj(c).title).slice(0, 20);
    const ls = arr(obj(c).links);
    if (ls.length > MAX_FOOTER_LINKS) return { ok: false, error: `바닥글 ${i + 1}번째 묶음: 링크는 ${MAX_FOOTER_LINKS}개까지입니다.` };
    const links: MenuLink[] = [];
    for (const [j, l] of ls.entries()) {
      const r = link(l, `바닥글 ${i + 1}번째 묶음의 ${j + 1}번째 링크`);
      if (!r.ok) return r;
      links.push(r.value);
    }
    columns.push({ title, links });
  }
  const note = str(o.note);
  if (note.length > 500) return { ok: false, error: "바닥글 안내 문구는 500자까지입니다." };
  return { ok: true, value: { columns, note, show_bank: o.show_bank !== false } };
}

export function validatePopup(raw: unknown): Out<PopupDesign> {
  const o = obj(raw);
  const its = arr(o.items);
  if (its.length > MAX_POPUP) return { ok: false, error: `팝업은 ${MAX_POPUP}장까지입니다.` };
  const items: PopupDesign["items"] = [];
  for (const [i, it] of its.entries()) {
    const img = image(obj(it).image, `${i + 1}번째 팝업`);
    if (!img.ok) return img;
    if (!img.value) return { ok: false, error: `${i + 1}번째 팝업 그림을 올려 주세요.` };
    const l = safeLink(obj(it).link);
    if (l === null) return { ok: false, error: `${i + 1}번째 팝업 링크는 /로 시작하는 이 몰 주소나 https 주소만 쓸 수 있습니다.` };
    items.push({ image: img.value, link: l });
  }
  const d = Number(o.hide_days);
  return { ok: true, value: { items, hide_days: Number.isInteger(d) && d >= 1 && d <= 30 ? d : 1 } };
}

// ── 읽기(그리기용): 틀린 항목 하나 때문에 전체가 기본값이 되지 않게, 틀린 항목·칸만 건너뛴다 ──
// 저장은 위 validate*가 엄격하게 막는다. 읽기는 편집 중 미리보기(빈 메뉴를 막 추가한 상태)와 옛 저장본을 위해 너그럽게.
const okLink = (it: unknown) => !!str(obj(it).label) && safeLink(obj(it).link) !== null;
const okImage = (v: unknown) => (optionalImage(v) === null ? "" : v);

export function readHeader(raw: unknown): HeaderDesign {
  const o = obj(raw);
  const b = obj(o.band);
  const clean = {
    ...o,
    band: { ...b, text: str(b.text).slice(0, 60), link: safeLink(b.link) === null ? "" : b.link },
    logo: okImage(o.logo),
    logo_footer: okImage(o.logo_footer),
    logo_page: okImage(o.logo_page),
    menu: arr(o.menu).filter(okLink).slice(0, MAX_MENU).map((m) => ({ ...obj(m), children: arr(obj(m).children).filter(okLink).slice(0, MAX_SUBMENU) })),
  };
  const v = validateHeader(clean);
  return v.ok ? v.value : DEFAULT_HEADER;
}

export function readFooter(raw: unknown): FooterDesign {
  const o = obj(raw);
  const clean = {
    ...o,
    note: str(o.note).slice(0, 500),
    columns: arr(o.columns).slice(0, MAX_FOOTER_COLUMNS).map((c) => ({ ...obj(c), links: arr(obj(c).links).filter(okLink).slice(0, MAX_FOOTER_LINKS) })),
  };
  const v = validateFooter(clean);
  return v.ok ? v.value : DEFAULT_FOOTER;
}

export function readPopup(raw: unknown): PopupDesign {
  const o = obj(raw);
  const clean = { ...o, items: arr(o.items).filter((it) => !!str(obj(it).image) && optionalImage(obj(it).image) !== null && safeLink(obj(it).link) !== null).slice(0, MAX_POPUP) };
  const v = validatePopup(clean);
  return v.ok ? v.value : DEFAULT_POPUP;
}
