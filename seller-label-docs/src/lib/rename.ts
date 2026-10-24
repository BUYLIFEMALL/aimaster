// 파일명 일괄 변경 규칙(순수 함수). 브라우저는 내 PC 파일 이름을 직접 바꿀 수 없으므로 새 이름으로 ZIP을 만든다.

export interface RenameOptions {
  base: string;
  start: number;
  digits: number;
  separator: string;
  /** 순번 위치 */
  position: "after" | "before";
  /** 확장자 소문자로 */
  lowerExt: boolean;
}

export const DEFAULT_RENAME: RenameOptions = { base: "상품", start: 1, digits: 2, separator: "_", position: "after", lowerExt: true };

// 윈도우·맥에서 파일 이름에 쓸 수 없는 글자
const BAD_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;

export function sanitizeBase(base: string): string {
  return base.replace(BAD_CHARS, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function splitExt(name: string): { stem: string; ext: string } {
  const i = name.lastIndexOf(".");
  if (i <= 0 || i === name.length - 1) return { stem: name, ext: "" };
  return { stem: name.slice(0, i), ext: name.slice(i + 1) };
}

/** 원래 이름 목록(순서대로)에 새 이름을 붙인다. 같은 이름이 생기면 (2)·(3)을 덧붙인다. */
export function buildNames(originals: string[], opts: RenameOptions): string[] {
  const base = sanitizeBase(opts.base);
  const digits = Math.max(1, Math.min(6, Math.floor(opts.digits) || 1));
  const start = Number.isFinite(opts.start) ? Math.max(0, Math.floor(opts.start)) : 1;
  const sep = sanitizeBase(opts.separator).slice(0, 3);
  const used = new Map<string, number>();
  return originals.map((orig, i) => {
    const { ext } = splitExt(orig);
    const num = String(start + i).padStart(digits, "0");
    const stem = !base ? num : opts.position === "after" ? `${base}${sep}${num}` : `${num}${sep}${base}`;
    const e = ext ? `.${opts.lowerExt ? ext.toLowerCase() : ext}` : "";
    let name = `${stem}${e}`;
    const key = name.toLowerCase();
    const seen = used.get(key) ?? 0;
    if (seen > 0) name = `${stem} (${seen + 1})${e}`;
    used.set(key, seen + 1);
    return name;
  });
}

/** 배열에서 한 항목을 다른 위치로 옮긴다(순서 바꾸기). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list.slice();
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
