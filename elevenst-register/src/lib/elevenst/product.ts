import { buildXml, encodeEucKr, findNonEucKr, type XmlNode } from "./xml.ts";
import { notiType } from "./notification.ts";
import { DEFAULT_AS, DEFAULT_RETURN, NO_BRAND } from "./draftDefaults.ts";

export { DEFAULT_AS, DEFAULT_RETURN, NO_BRAND };

// 11번가 상품 등록 초안 → 검사 → 등록 본문(XML). 명세 정리: elevenst-register/docs/API_SPEC_NOTES.md §4
// 3단계(v1.04)는 검사와 본문 미리 만들기까지만 한다 — 11번가에 보내는 일은 4단계(보내기)에서 이 본문을 그대로 쓴다.
// 순수 함수만 둔다(시험: tests/product.test.mjs).

export type FeeType = "01" | "02" | "03"; // 무료 · 고정 배송비 · 조건부 무료
export type KcChoice = "none" | "exempt-buy" | "exempt-parallel";

export interface OptionRow {
  value: string;
  addPrice: number;
  qty: number;
}

export interface ElevenstDraft {
  name: string;
  brand: string;
  categoryNo: string;
  price: number;
  stock: number;
  tax: "01" | "02" | "03"; // 과세 · 면세 · 영세
  minorOk: boolean;
  originText: string; // 원산지(기타 → 원산지명). 기본 「상세설명 참조」
  kc: KcChoice;
  option: { title: string; rows: OptionRow[] } | null;
  delivery: {
    feeType: FeeType;
    fee: number; // 고정·조건부 무료일 때 배송비
    freeOver: number; // 조건부 무료 기준 금액
    jeju: number;
    island: number;
    returnFee: number; // 반품 배송비(편도)
    exchangeFee: number; // 교환 배송비(왕복)
    outSeq: string; // 출고지 주소 순번
    inSeq: string; // 반품/교환지 주소 순번
    sendCloseNo: string; // 발송마감 템플릿 번호(없으면 빈 칸)
    bundle: boolean;
  };
  asDetail: string;
  returnDetail: string;
  noti: { type: string; values: Record<string, string> };
}

export interface DraftImages {
  main: string;
  extras: string[]; // 최대 3장(prdImage02~04)
  details: string[]; // 상세설명 HTML에 차례로 넣는 섹션 이미지
}

export interface DraftCheck {
  errors: string[];
  warnings: string[];
}

// 옵션명·옵션값에 쓸 수 없는 글자(명세 colTitle·colValue0)
const OPTION_BAD = /[[\]&#;"%<>†]/;
const NOTI_MAX = 50; // 셀러오피스 고시 창: 텍스트는 띄어쓰기 포함 50자까지

const eucBytes = (s: string) => encodeEucKr(s).length;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const isTens = (n: number) => Number.isInteger(n) && n % 10 === 0;

export function checkDraft(d: ElevenstDraft, ctx: { categoryIsLeaf: boolean | null; hasMainImage: boolean }): DraftCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = d.name.trim();

  if (!name) errors.push("상품명을 넣어 주세요.");
  else if ([...name].length > 100) errors.push(`상품명은 100자까지입니다(지금 ${[...name].length}자).`);
  if (!d.brand.trim()) warnings.push(`브랜드가 비어 있어 「${NO_BRAND}」으로 보냅니다.`);

  if (!d.categoryNo) errors.push("11번가 카테고리를 골라 주세요.");
  else if (ctx.categoryIsLeaf === false) errors.push("맨 아래 카테고리만 등록할 수 있습니다. 하위 카테고리까지 골라 주세요.");
  else if (ctx.categoryIsLeaf === null) warnings.push("카테고리 목록을 지금 확인하지 못했습니다. 번호가 맞는지 다시 확인해 주세요.");

  if (!Number.isFinite(d.price) || d.price < 10) errors.push("판매가를 10원 이상으로 넣어 주세요.");
  else if (!isTens(d.price)) errors.push(`판매가는 10원 단위여야 합니다(지금 ${won(d.price)}).`);
  else if (d.price >= 1_000_000_000) errors.push("판매가는 10억 원 미만이어야 합니다.");

  if (!ctx.hasMainImage) errors.push("대표 이미지가 없습니다. 상세페이지 자동화에서 대표 이미지를 먼저 만들어 주세요.");

  if (d.option) {
    const title = d.option.title.trim();
    const rows = d.option.rows.filter((r) => r.value.trim());
    if (!title) errors.push("옵션명을 넣어 주세요(예: 색상).");
    else if ([...title].length > 25) errors.push("옵션명은 25자까지입니다.");
    else if (OPTION_BAD.test(title)) errors.push("옵션명에 [ ] & # ; \" % < > 는 쓸 수 없습니다.");
    if (!rows.length) errors.push("옵션값을 하나 이상 넣어 주세요.");
    const seen = new Set<string>();
    for (const r of rows) {
      const v = r.value.trim();
      if (seen.has(v)) errors.push(`옵션값 「${v}」가 두 번 있습니다.`);
      seen.add(v);
      if ([...v].length > 25) errors.push(`옵션값 「${v}」는 25자까지입니다.`);
      if (OPTION_BAD.test(v)) errors.push(`옵션값 「${v}」에 [ ] & # ; " % < > 는 쓸 수 없습니다.`);
      if (!Number.isInteger(r.qty) || r.qty < 1) errors.push(`옵션 「${v}」 재고를 1 이상으로 넣어 주세요.`);
      if (!Number.isInteger(r.addPrice)) errors.push(`옵션 「${v}」 추가금액은 원 단위 숫자여야 합니다.`);
      else if (d.price >= 10 && (r.addPrice > d.price || r.addPrice < -d.price / 2)) errors.push(`옵션 「${v}」 추가금액은 판매가의 -50%~+100% 안이어야 합니다.`);
    }
    if (rows.length && !rows.some((r) => r.addPrice === 0)) errors.push("추가금액이 0원인 옵션이 하나 이상 있어야 합니다.");
  } else if (!Number.isInteger(d.stock) || d.stock < 1) errors.push("재고는 1개 이상이어야 합니다(0은 넣을 수 없음).");

  const dl = d.delivery;
  if (dl.feeType !== "01" && (!isTens(dl.fee) || dl.fee <= 0)) errors.push("배송비를 10원 단위로 넣어 주세요.");
  if (dl.feeType === "03" && (!isTens(dl.freeOver) || dl.freeOver <= 0)) errors.push("무료 배송 기준 금액을 10원 단위로 넣어 주세요.");
  for (const [label, v] of [["반품 배송비", dl.returnFee], ["교환 배송비", dl.exchangeFee], ["제주 추가 배송비", dl.jeju], ["도서산간 추가 배송비", dl.island]] as const) {
    if (!isTens(v) || v < 0) errors.push(`${label}는 10원 단위 숫자여야 합니다.`);
  }
  if (!dl.outSeq) errors.push("출고지를 골라 주세요(연결 시험에서 보이는 주소).");
  if (!dl.inSeq) errors.push("반품/교환지를 골라 주세요.");
  if (!dl.sendCloseNo) warnings.push("발송마감 템플릿이 없어 비워 둡니다. 11번가 셀러오피스에서 만들어 두면 「오늘발송」 표시를 받을 수 있습니다.");

  for (const [label, v] of [["A/S 안내", d.asDetail], ["반품/교환 안내", d.returnDetail]] as const) {
    if (!v.trim()) errors.push(`${label}를 넣어 주세요(명세상 필수).`);
    else if (eucBytes(v) > 4000) errors.push(`${label}가 너무 깁니다(4,000바이트까지).`);
  }
  if (!d.originText.trim()) errors.push("원산지를 넣어 주세요(모르면 「상세설명 참조」).");

  const t = notiType(d.noti.type);
  if (!t) errors.push("상품정보제공고시 유형을 골라 주세요.");
  else
    for (const [code, label] of t.items) {
      const v = (d.noti.values[code] ?? "").trim();
      if (!v) errors.push(`고시 항목 「${label}」이 비어 있습니다.`);
      else if ([...v].length > NOTI_MAX) errors.push(`고시 항목 「${label}」은 ${NOTI_MAX}자까지입니다.`);
    }

  // EUC-KR에 없는 글자(이모지 등)는 11번가에서 ?로 깨지므로 미리 막는다
  const texts = [d.name, d.brand, d.originText, d.asDetail, d.returnDetail, d.option?.title ?? "", ...(d.option?.rows.map((r) => r.value) ?? []), ...Object.values(d.noti.values)];
  const bad = findNonEucKr(texts.join("\n"));
  if (bad.length) errors.push(`11번가가 받을 수 없는 글자가 있습니다: ${bad.slice(0, 10).join(" ")} — 지우거나 다른 글자로 바꿔 주세요.`);

  return { errors: [...new Set(errors)], warnings };
}

/** 상세설명 HTML — 상세페이지 섹션 이미지를 위에서부터 차례로 */
export function detailHtml(urls: string[]): string {
  return `<div style="text-align:center">${urls.map((u) => `<img src="${u.replace(/"/g, "%22")}" style="max-width:100%;display:block;margin:0 auto" alt="" />`).join("")}</div>`;
}

/** KC 인증정보 그룹 4개(카테고리에 따라 넷 다 요구될 수 있어 모두 넣음). 기본은 「대상 아님」 */
export function certGroups(kc: KcChoice): XmlNode[] {
  const first: XmlNode =
    kc === "none" ? { crtfGrpTypCd: "01", crtfGrpObjClfCd: "03" } : { crtfGrpTypCd: "01", crtfGrpObjClfCd: "02", crtfGrpExptTypCd: kc === "exempt-buy" ? "02" : "03" };
  return [first, { crtfGrpTypCd: "02", crtfGrpObjClfCd: "03" }, { crtfGrpTypCd: "03", crtfGrpObjClfCd: "03" }, { crtfGrpTypCd: "04", crtfGrpObjClfCd: "05" }];
}

/** 11번가 등록 본문(EUC-KR 선언 XML 문자열). checkDraft에 오류가 없을 때만 부른다 */
export function buildProductXml(d: ElevenstDraft, img: DraftImages): string {
  const dl = d.delivery;
  const t = notiType(d.noti.type);
  const optionRows = d.option?.rows.filter((r) => r.value.trim()) ?? [];
  const node: XmlNode = {
    selMthdCd: "01", // 고정가판매
    dispCtgrNo: d.categoryNo,
    prdTypCd: "01", // 일반배송상품
    prdNm: { cdata: d.name.trim() },
    brand: { cdata: d.brand.trim() || NO_BRAND },
    orgnTypCd: "03", // 기타 → 원산지명
    orgnNmVal: { cdata: d.originText.trim() },
    suplDtyfrPrdClfCd: d.tax,
    prdStatCd: "01", // 새상품
    minorSelCnYn: d.minorOk ? "Y" : "N",
    prdImage01: img.main,
    prdImage02: img.extras[0],
    prdImage03: img.extras[1],
    prdImage04: img.extras[2],
    htmlDetail: { cdata: detailHtml(img.details) },
    ProductCertGroup: certGroups(d.kc),
    selTermUseYn: "N", // 판매기간 설정 안 함(즉시 판매)
    selPrc: d.price,
    ...(optionRows.length
      ? {
          optSelectYn: "Y",
          txtColCnt: "1",
          prdExposeClfCd: "00", // 등록순
          colTitle: { cdata: d.option!.title.trim() },
          ProductOption: optionRows.map((r) => ({ useYn: "Y", colOptPrice: r.addPrice, colValue0: { cdata: r.value.trim() }, colCount: r.qty })),
        }
      : { prdSelQty: d.stock }),
    dlvCnAreaCd: "01", // 전국
    dlvWyCd: "01", // 택배
    dlvSendCloseTmpltNo: dl.sendCloseNo || undefined,
    dlvCstInstBasiCd: dl.feeType,
    dlvCst1: dl.feeType === "01" ? undefined : dl.fee,
    PrdFrDlvBasiAmt: dl.feeType === "03" ? dl.freeOver : undefined,
    bndlDlvCnYn: dl.bundle ? "Y" : "N",
    dlvCstPayTypCd: "03", // 선결제
    jejuDlvCst: dl.jeju,
    islandDlvCst: dl.island,
    addrSeqOut: dl.outSeq,
    addrSeqIn: dl.inSeq,
    rtngdDlvCst: dl.returnFee,
    exchDlvCst: dl.exchangeFee,
    asDetail: { cdata: d.asDetail.trim() },
    rtngExchDetail: { cdata: d.returnDetail.trim() },
    dlvClf: "02", // 업체배송
    ProductNotification: t
      ? { type: t.type, item: t.items.map(([code]) => ({ code, name: { cdata: (d.noti.values[code] ?? "").trim() } })) }
      : undefined,
  };
  return buildXml("Product", node);
}
