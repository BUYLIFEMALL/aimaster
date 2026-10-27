// 스마트스토어 옵션 — 회원이 입력한 옵션을 검사하고, 판매자센터 「엑셀 일괄등록」 양식 모양의 표(행 배열)로 바꾼다.
// 양식 원본: D:\PDS\OptionSimpleTemplate.xls(단독) · OptionCombinationTemplate.xls(조합) — docs/IMPROVEMENT_HANDOFF_20261027.md §10-5

export type OptionType = "simple" | "combination";

export interface OptionGroup {
  name: string;
  values: string[];
}

export interface OptionCombo {
  values: string[];
  price: number;
  stock: number;
}

export interface OptionSpec {
  type: OptionType;
  groups: OptionGroup[];
  /** 조합형만 — groups 값의 모든 조합, 순서는 combineValues와 같다 */
  combos?: OptionCombo[];
}

export const OPTION_TEXT_MAX = 25;
export const OPTION_GROUPS_MAX = 3;
export const OPTION_COMBOS_MAX = 500;

/** 「빨강, 파랑,,노랑」 → ["빨강","파랑","노랑"] (같은 값은 한 번만) */
export function splitValues(text: string): string[] {
  return [...new Set(String(text ?? "").split(",").map((v) => v.trim()).filter(Boolean))];
}

/** 옵션값의 모든 조합(첫 옵션명이 바깥 순서) */
export function combineValues(groups: OptionGroup[]): string[][] {
  return groups.reduce<string[][]>((acc, g) => acc.flatMap((row) => g.values.map((v) => [...row, v])), [[]]);
}

/** 화면에서 넘어온 JSON을 정리하고 오류를 모은다. null이면 옵션을 쓰지 않음. */
export function normalizeOptions(raw: unknown, defaultStock: number): { spec: OptionSpec | null; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { spec: null, errors };
  const r = raw as { type?: unknown; groups?: unknown; combos?: unknown };
  if (r.type !== "simple" && r.type !== "combination") return { spec: null, errors };
  const type = r.type as OptionType;

  const groups: OptionGroup[] = (Array.isArray(r.groups) ? r.groups : [])
    .map((g) => ({ name: String((g as OptionGroup)?.name ?? "").trim(), values: (Array.isArray((g as OptionGroup)?.values) ? (g as OptionGroup).values : []).map((v) => String(v).trim()).filter(Boolean) }))
    .filter((g) => g.name || g.values.length)
    .slice(0, OPTION_GROUPS_MAX);
  if (!groups.length) errors.push("옵션명과 옵션값을 하나 이상 넣어 주세요.");
  for (const g of groups) {
    if (!g.name) errors.push("옵션명이 비어 있는 줄이 있습니다.");
    else if (g.name.length > OPTION_TEXT_MAX) errors.push(`옵션명 「${g.name}」이 ${OPTION_TEXT_MAX}자를 넘습니다.`);
    if (!g.values.length) errors.push(`옵션 「${g.name || "이름 없음"}」의 옵션값을 넣어 주세요(쉼표로 구분).`);
    const long = g.values.find((v) => v.length > OPTION_TEXT_MAX);
    if (long) errors.push(`옵션값 「${long}」이 ${OPTION_TEXT_MAX}자를 넘습니다.`);
  }
  if (new Set(groups.map((g) => g.name)).size !== groups.length) errors.push("같은 옵션명이 두 번 있습니다.");

  const spec: OptionSpec = { type, groups };
  if (type === "combination" && groups.length && !errors.length) {
    const all = combineValues(groups);
    if (all.length > OPTION_COMBOS_MAX) errors.push(`조합이 ${all.length}개입니다. ${OPTION_COMBOS_MAX}개 이하로 줄여 주세요.`);
    const given = new Map((Array.isArray(r.combos) ? (r.combos as OptionCombo[]) : []).map((c) => [JSON.stringify((c?.values ?? []).map(String)), c]));
    spec.combos = all.map((values) => {
      const c = given.get(JSON.stringify(values));
      const price = Number.isFinite(Number(c?.price)) ? Math.round(Number(c?.price)) : 0;
      const stock = Number.isFinite(Number(c?.stock)) ? Math.max(0, Math.floor(Number(c?.stock))) : defaultStock;
      return { values, price, stock };
    });
    if (spec.combos.some((c) => c.price % 10 !== 0)) errors.push("옵션가는 10원 단위로 넣어 주세요.");
    if (!spec.combos.some((c) => c.price === 0)) errors.push("옵션가가 0원인 조합이 하나 이상 있어야 합니다(스마트스토어 규칙).");
  }
  return { spec, errors };
}

/** 판매자센터 양식 모양의 표 — 1행 머리글, 2행부터 데이터(양식의 안내 줄은 넣지 않는다) */
export function optionSheetRows(spec: OptionSpec): (string | number)[][] {
  if (spec.type === "simple") {
    return [["옵션명", "옵션값", "사용여부"], ...spec.groups.flatMap((g) => g.values.map((v) => [g.name, v, "Y"]))];
  }
  return [
    [...spec.groups.map((g) => g.name), "옵션가", "재고수량", "관리코드", "사용여부"],
    ...(spec.combos ?? []).map((c) => [...c.values, c.price, c.stock, "", "Y"]),
  ];
}

/** 옵션목록에 생길 줄 수(확장이 확인용으로 씀) */
export function optionRowCount(spec: OptionSpec): number {
  return spec.type === "simple" ? spec.groups.reduce((n, g) => n + g.values.length, 0) : (spec.combos ?? []).length;
}
