// EC-W10 해외 공장 견적 비교 — 결과 모양·검사·마진계산 연결(순수 함수, 서버·화면·시험 공용).
// 플랜: docs/PLAN_20261114_EC_W10_FACTORY_QUOTES.md (원본 파일은 저장하지 않음 — 안 A)

/** Vercel 함수 요청 본문 한도(4.5MB) 안에서 — 사진은 브라우저에서 줄여 보낸다. */
export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
export const MAX_PASTED = 30000;
export const MAX_NAME = 80;

export type QuoteFileKind = "pdf" | "image" | "sheet";

/** 엑셀 원본은 읽지 않는다(엑셀 라이브러리 설치가 이 PC 설정으로 막혀 있음) — CSV로 저장하거나 표를 복사해 붙여 넣게 안내. */
export const EXCEL_HELP = "엑셀(.xlsx) 파일은 바로 읽지 못합니다. 엑셀에서 「다른 이름으로 저장 → CSV」로 저장해 올리거나, 표를 복사해 대화 칸에 붙여 넣어 주세요.";
export function isExcel(name: string): boolean {
  return /\.(xlsx|xls)$/i.test(name);
}

export function fileKind(name: string, type: string): QuoteFileKind | null {
  const n = name.toLowerCase();
  if (type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (/^image\/(jpeg|png|webp|gif)$/.test(type) || /\.(jpe?g|png|webp|gif)$/.test(n)) return "image";
  if (/\.(csv|txt)$/.test(n) || type === "text/csv" || type === "text/plain") return "sheet";
  return null;
}

export type Tier = { min_qty: number; price: number };

export type Factory = {
  factory_name: string;
  contact_channel: string;
  currency: string;
  unit_price: number | null;
  price_basis: string;
  tiers: Tier[];
  moq: number | null;
  sample_fee: number | null;
  mould_fee: number | null;
  sample_lead_days: number | null;
  production_lead_days: number | null;
  payment_terms: string;
  notes: string;
};

export type Pending = { date: string; factory_name: string; question: string };
export type NextQuestion = { target_factory: string; ko: string; en: string; zh: string };

export type QuoteReport = {
  product_name: string;
  factories: Factory[];
  unconfirmed: string[];
  pending: Pending[];
  next_questions: NextQuestion[];
  summary: string;
};

const num = { type: ["number", "null"] } as const;
const str = { type: "string" } as const;

/** Claude 구조화 응답 형식(json_schema) — 모르는 값은 null/빈 글자로 두게 한다. */
export const REPORT_SCHEMA = {
  type: "object",
  properties: {
    product_name: str,
    factories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          factory_name: str,
          contact_channel: str,
          currency: str,
          unit_price: num,
          price_basis: str,
          tiers: { type: "array", items: { type: "object", properties: { min_qty: { type: "number" }, price: { type: "number" } }, required: ["min_qty", "price"], additionalProperties: false } },
          moq: num,
          sample_fee: num,
          mould_fee: num,
          sample_lead_days: num,
          production_lead_days: num,
          payment_terms: str,
          notes: str,
        },
        required: ["factory_name", "contact_channel", "currency", "unit_price", "price_basis", "tiers", "moq", "sample_fee", "mould_fee", "sample_lead_days", "production_lead_days", "payment_terms", "notes"],
        additionalProperties: false,
      },
    },
    unconfirmed: { type: "array", items: str },
    pending: { type: "array", items: { type: "object", properties: { date: str, factory_name: str, question: str }, required: ["date", "factory_name", "question"], additionalProperties: false } },
    next_questions: { type: "array", items: { type: "object", properties: { target_factory: str, ko: str, en: str, zh: str }, required: ["target_factory", "ko", "en", "zh"], additionalProperties: false } },
    summary: str,
  },
  required: ["product_name", "factories", "unconfirmed", "pending", "next_questions", "summary"],
  additionalProperties: false,
} as const;

const text = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const amount = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n * 10000) / 10000 : null;
};
const days = (v: unknown): number | null => {
  const n = amount(v);
  return n == null || n > 1000 ? null : Math.round(n);
};

/** 통화 표기를 마진 계산기 통화로 맞춘다(RMB·元·¥(위안 문맥) → CNY). 모르면 원래 글자 대문자. */
export function normalizeCurrency(raw: unknown): string {
  const c = text(raw, 10).toUpperCase();
  if (/^(RMB|CNY|元|人民币|위안)$/.test(c)) return "CNY";
  if (/^(USD|US\$|\$|달러)$/.test(c)) return "USD";
  if (/^(JPY|엔|円)$/.test(c)) return "JPY";
  if (/^(EUR|€|유로)$/.test(c)) return "EUR";
  if (/^(KRW|원|₩)$/.test(c)) return "KRW";
  return c;
}

/** AI 결과를 믿지 않고 다시 정리한다(길이·개수·숫자 범위). */
export function sanitizeReport(raw: unknown): QuoteReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    product_name: text(r.product_name, 120),
    factories: arr(r.factories).slice(0, 12).map((f: Record<string, unknown>) => ({
      factory_name: text(f?.factory_name, 80) || "이름 모름",
      contact_channel: text(f?.contact_channel, 30),
      currency: normalizeCurrency(f?.currency),
      unit_price: amount(f?.unit_price),
      price_basis: text(f?.price_basis, 30),
      tiers: arr(f?.tiers)
        .slice(0, 8)
        .map((t: Record<string, unknown>) => ({ min_qty: amount(t?.min_qty) ?? 0, price: amount(t?.price) ?? 0 }))
        .filter((t) => t.min_qty > 0 && t.price > 0),
      moq: amount(f?.moq),
      sample_fee: amount(f?.sample_fee),
      mould_fee: amount(f?.mould_fee),
      sample_lead_days: days(f?.sample_lead_days),
      production_lead_days: days(f?.production_lead_days),
      payment_terms: text(f?.payment_terms, 120),
      notes: text(f?.notes, 300),
    })),
    unconfirmed: arr(r.unconfirmed).map((v) => text(v, 200)).filter(Boolean).slice(0, 15),
    pending: arr(r.pending)
      .slice(0, 15)
      .map((p: Record<string, unknown>) => ({ date: text(p?.date, 20), factory_name: text(p?.factory_name, 80), question: text(p?.question, 300) }))
      .filter((p) => p.question),
    next_questions: arr(r.next_questions)
      .slice(0, 6)
      .map((q: Record<string, unknown>) => ({ target_factory: text(q?.target_factory, 80), ko: text(q?.ko, 400), en: text(q?.en, 600), zh: text(q?.zh, 400) }))
      .filter((q) => q.ko || q.en || q.zh),
    summary: text(r.summary, 600),
  };
}

/** 단가가 가장 낮은 공장(같은 통화끼리만 비교 — 통화가 섞이면 null). */
export function cheapestFactory(factories: Factory[]): string | null {
  const priced = factories.filter((f) => f.unit_price != null);
  if (priced.length < 2 || new Set(priced.map((f) => f.currency)).size !== 1) return null;
  return priced.reduce((a, b) => ((b.unit_price ?? Infinity) < (a.unit_price ?? Infinity) ? b : a)).factory_name;
}

const MARGIN_CURRENCIES = new Set(["USD", "CNY", "JPY", "EUR"]);

/** 기존 「5대 마켓 소싱 · 마진계산」의 외화 원가 칸을 채워 연다. 마진 계산기가 받는 통화가 아니면 null. */
export function marginCalcUrl(f: Pick<Factory, "currency" | "unit_price">, productName = ""): string | null {
  if (f.unit_price == null || !MARGIN_CURRENCIES.has(f.currency)) return null;
  const params = new URLSearchParams({ fxCurrency: f.currency, fxAmount: String(f.unit_price) });
  if (productName) params.set("keyword", productName.slice(0, 40));
  return `/sourcing?${params.toString()}#margin`;
}
