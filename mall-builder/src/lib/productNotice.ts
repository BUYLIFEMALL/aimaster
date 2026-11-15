// M2-4(2026-11-15) 상품정보제공고시·KC 인증 — 서식(품목군별 자주 쓰는 항목)과 저장 전 검사(순수 함수, 단위 시험)
// 항목 이름은 공정위 「전자상거래 등에서의 상품 등의 정보제공에 관한 고시」를 바탕으로 한 자주 쓰는 칸이다.
// 운영사가 칸을 더하거나 이름을 고칠 수 있다(정확한 항목은 고시 원문 확인 — 화면 안내).
// DB 0096: mall_builder_products.info_notice jsonb {type, items:[{label,value}]}, kc_certs jsonb [{kind,no}]

export type NoticeItem = { label: string; value: string };
export type ProductNotice = { type: string; items: NoticeItem[] };
export type KcCert = { kind: string; no: string };

export const NOTICE_MAX_ITEMS = 30;
export const NOTICE_LABEL_MAX = 60;
export const NOTICE_VALUE_MAX = 500;
export const KC_MAX = 10;

const AS = "A/S 책임자와 전화번호";
const MAKER = "제조자(수입품이면 수입자를 함께)";

/** 품목군 → 자주 쓰는 항목 이름 */
export const NOTICE_TEMPLATES: Record<string, string[]> = {
  "기타 재화": ["품명 및 모델명", "법에 의한 인증·허가 등을 받았음을 확인할 수 있는 경우 그에 대한 사항", "제조국(원산지)", MAKER, AS],
  의류: ["제품 소재", "색상", "치수", MAKER, "제조국", "세탁방법 및 취급 시 주의사항", "제조연월", "품질보증기준", AS],
  주방용품: ["품명 및 모델명", "재질", "구성품", "크기", "동일모델의 출시년월", MAKER, "제조국", "수입식품안전관리 특별법에 따른 수입 기구·용기의 경우 문구", "품질보증기준", AS],
  "소형전자·가전": ["품명 및 모델명", "KC 인증정보", "정격전압·소비전력", "동일모델의 출시년월", MAKER, "제조국", "크기·무게", "주요 사양", "품질보증기준", AS],
  가공식품: ["제품명", "식품의 유형", "생산자 및 소재지", "제조연월일·소비기한", "포장단위별 내용물의 용량(중량)·수량", "원재료명 및 함량", "영양성분", "유전자변형식품 여부", "소비자안전을 위한 주의사항", "수입식품의 경우 문구", "소비자상담 관련 전화번호"],
  화장품: ["내용물의 용량 또는 중량", "제품 주요 사양", "사용기한 또는 개봉 후 사용기간", "사용방법", "화장품제조업자·책임판매업자", "제조국", "모든 성분", "기능성 화장품 심사 여부", "사용할 때의 주의사항", "품질보증기준", "소비자상담 전화번호"],
};
export const NOTICE_TYPES = Object.keys(NOTICE_TEMPLATES);

/** KC 인증 구분 */
export const KC_KINDS = ["안전인증", "안전확인", "공급자적합성확인", "어린이제품 안전인증", "어린이제품 안전확인", "어린이제품 공급자적합성확인", "전기용품 안전인증", "방송통신기자재 적합성평가(전파)", "생활화학제품 안전확인"];
export const KC_NONE = "해당 없음";

export function templateItems(type: string): NoticeItem[] {
  return (NOTICE_TEMPLATES[type] ?? []).map((label) => ({ label, value: "" }));
}

const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };

/** 폼 JSON → 저장 값. 빈 값은 {}(고시 없음). 품목군만 고르고 값이 하나도 없으면 오류 */
export function parseNotice(json: unknown): Ok<ProductNotice | Record<string, never>> | Err {
  if (json === undefined || json === null || String(json).trim() === "") return { ok: true, value: {} };
  let raw: unknown;
  try {
    raw = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return { ok: false, error: "상품정보제공고시 값을 읽지 못했습니다. 화면을 새로고침해 주세요." };
  }
  const r = (raw ?? {}) as { type?: unknown; items?: unknown };
  const type = clean(r.type, 30);
  if (!type) return { ok: true, value: {} };
  if (!NOTICE_TYPES.includes(type)) return { ok: false, error: "상품정보제공고시 품목군을 목록에서 골라 주세요." };
  const list = Array.isArray(r.items) ? r.items : [];
  if (list.length > NOTICE_MAX_ITEMS) return { ok: false, error: `고시 항목은 ${NOTICE_MAX_ITEMS}개까지입니다.` };
  const items: NoticeItem[] = [];
  for (const it of list as { label?: unknown; value?: unknown }[]) {
    const label = clean(it?.label, NOTICE_LABEL_MAX);
    const value = clean(it?.value, NOTICE_VALUE_MAX);
    if (!label && !value) continue;
    if (!label) return { ok: false, error: "고시 항목 이름이 빈 줄이 있습니다." };
    items.push({ label, value });
  }
  if (!items.some((i) => i.value)) return { ok: false, error: "상품정보제공고시 내용을 1개 이상 채워 주세요(모르면 「상세페이지 참조」)." };
  return { ok: true, value: { type, items } };
}

/** 폼 JSON → KC 인증 목록. 「해당 없음」은 [{kind:"해당 없음",no:""}] 한 줄로 저장 */
export function parseKc(json: unknown): Ok<KcCert[]> | Err {
  if (json === undefined || json === null || String(json).trim() === "") return { ok: true, value: [] };
  let raw: unknown;
  try {
    raw = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return { ok: false, error: "KC 인증 값을 읽지 못했습니다. 화면을 새로고침해 주세요." };
  }
  const list = (Array.isArray(raw) ? raw : []) as { kind?: unknown; no?: unknown }[];
  if (list.some((c) => clean(c?.kind, 40) === KC_NONE)) return { ok: true, value: [{ kind: KC_NONE, no: "" }] };
  const out: KcCert[] = [];
  for (const c of list) {
    const kind = clean(c?.kind, 40);
    const no = clean(c?.no, 40).replace(/\s+/g, "");
    if (!kind && !no) continue;
    if (!KC_KINDS.includes(kind)) return { ok: false, error: "KC 인증 구분을 목록에서 골라 주세요." };
    if (!/^[A-Za-z0-9-]{4,40}$/.test(no)) return { ok: false, error: `KC 인증번호 「${no || "빈 칸"}」은 영문·숫자·- 4~40자로 넣어 주세요.` };
    out.push({ kind, no });
  }
  if (out.length > KC_MAX) return { ok: false, error: `KC 인증은 ${KC_MAX}개까지입니다.` };
  return { ok: true, value: out };
}

/** DB 값 → 화면용(모양이 틀리면 없는 것으로) */
export function readNotice(v: unknown): ProductNotice | null {
  const r = v as Partial<ProductNotice> | null;
  if (!r || typeof r !== "object" || typeof r.type !== "string" || !Array.isArray(r.items)) return null;
  const items = r.items.filter((i): i is NoticeItem => !!i && typeof i.label === "string" && typeof i.value === "string" && !!i.label);
  return items.length ? { type: r.type, items } : null;
}
export function readKc(v: unknown): KcCert[] {
  return Array.isArray(v) ? v.filter((c): c is KcCert => !!c && typeof c.kind === "string" && typeof c.no === "string" && !!c.kind) : [];
}
