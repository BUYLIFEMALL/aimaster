// 한글→영문 변환의 화면 쪽 로직(순수 — 저장소와 fetch는 주입받는다).
// 변환과 그림 맡기기는 **서로 다른 동작**이다: 변환은 설명 칸의 글만 바꾸고, 엔진에는 아무것도 보내지 않는다.
// 자동 호출·자동 재시도가 없다 — 사용자가 「변환」을 누를 때 한 번만 요청한다.
import { parseEntries, parseLines } from "../studio/batch.ts";
import type { KeyValueStore } from "../engine.ts";
import { ITEM_ID, CONVERT_MAX_ITEMS, KO_LIMIT, endsLikeCopiesMark, type ConvertItem, type ConvertedItem } from "./protocol.ts";
import { findConvertModel } from "./models.ts";

const HAS_NON_ASCII = /[^\x20-\x7e]/;

export type PendingLine = ConvertItem & { /** 빈 줄을 뺀 줄 번호(0부터) */ lineIndex: number };

const defaultId = () => {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * 설명 칸에서 변환이 필요한 줄(영문이 아닌 글자가 섞인 줄)을 고른다. 줄마다 항목 ID를 새로 붙인다(접수 번호와 별개).
 * 장수 표시(x2)는 보내지 않는다 — 설명만 보낸다.
 */
export function linesToConvert(text: string, makeId: () => string = defaultId): { items: PendingLine[]; problem: string | null } {
  const items: PendingLine[] = [];
  const used = new Set<string>();
  parseEntries(text).forEach((entry, lineIndex) => {
    if (!entry.source || !HAS_NON_ASCII.test(entry.source)) return;
    let id = makeId();
    for (let i = 0; i < 5 && (used.has(id) || !ITEM_ID.test(id)); i++) id = makeId();
    used.add(id);
    items.push({ id, ko: entry.source.replace(/\s+/g, " ").trim(), lineIndex });
  });
  let problem: string | null = null;
  if (items.length > CONVERT_MAX_ITEMS) problem = `한 번에 ${CONVERT_MAX_ITEMS}줄까지 변환할 수 있습니다(지금 ${items.length}줄).`;
  else if (items.some((i) => i.ko.length > KO_LIMIT)) problem = `한 줄은 ${KO_LIMIT}자까지 변환할 수 있습니다.`;
  else if (new Set(items.map((i) => i.id)).size !== items.length || items.some((i) => !ITEM_ID.test(i.id))) problem = "줄 번호를 만들지 못했습니다. 다시 시도해 주세요.";
  return { items, problem };
}

export type ApplyResult = {
  text: string;
  /** 바꾼 줄: 원문과 영문을 나란히 보여 주는 데 쓴다 */
  applied: { lineIndex: number; ko: string; en: string }[];
  /** 요청 뒤에 사용자가 그 줄을 고쳐서 바꾸지 않은 줄 수 */
  skipped: number;
};

/**
 * 변환 결과를 설명 칸의 글에 반영한다. 짝은 **항목 ID**로 맺는다.
 * 결과의 ID 집합이 보낸 것과 정확히 같지 않으면 한 줄도 바꾸지 않고 예외를 던진다(서버 검사에 더한 화면 쪽 방어).
 * 요청을 보낸 뒤 사용자가 고친 줄(지금 내용이 보낸 원문과 다름)은 건드리지 않는다.
 * **장수는 변환 전과 같아야 한다**: 바꾼 줄을 실제 묶음 파서로 다시 읽어 설명이 변환된 영문 그대로이고 장수(1장·2장·잘못된 장수 표시)가
 * 변환 전과 같은지 확인한다. 한 줄이라도 다르면 한 줄도 바꾸지 않고 예외를 던진다.
 */
export function applyConverted(text: string, sent: PendingLine[], results: ConvertedItem[]): ApplyResult {
  if (!Array.isArray(results) || results.length !== sent.length) throw new Error("변환 결과가 보낸 줄과 맞지 않아 쓰지 않았습니다.");
  const byId = new Map<string, string>();
  for (const r of results) {
    if (!r || typeof r.id !== "string" || typeof r.en !== "string" || byId.has(r.id)) throw new Error("변환 결과가 보낸 줄과 맞지 않아 쓰지 않았습니다.");
    const en = r.en.replace(/\s+/g, " ").trim();
    if (!en || HAS_NON_ASCII.test(en)) throw new Error("변환 결과에 영문이 아닌 글자가 있어 쓰지 않았습니다.");
    if (endsLikeCopiesMark(en)) throw new Error("변환 결과가 장수 표시(x2)처럼 끝나 쓰지 않았습니다. 그 줄은 영문으로 직접 적어 주세요.");
    byId.set(r.id, en);
  }
  if (sent.some((s) => !byId.has(s.id))) throw new Error("변환 결과가 보낸 줄과 맞지 않아 쓰지 않았습니다.");
  const byLine = new Map(sent.map((s) => [s.lineIndex, s]));
  const applied: ApplyResult["applied"] = [];
  let seen = -1;
  const out = String(text ?? "")
    .split(/\r?\n/)
    .map((raw) => {
      if (!raw.trim()) return raw;
      seen += 1;
      const target = byLine.get(seen);
      if (!target) return raw;
      const entry = parseEntries(raw)[0];
      if (!entry || entry.source.replace(/\s+/g, " ").trim() !== target.ko) return raw; // 그사이 사용자가 고친 줄
      const en = byId.get(target.id)!;
      const line = parseLines(raw)[0] ?? "";
      const mark = line.length > entry.source.length ? ` x${entry.badCopies ?? entry.copies}` : "";
      const next = `${en}${mark}`;
      // 바꾼 줄을 실제 파서로 다시 읽어, 설명과 장수가 의도한 그대로인지 확인한다.
      const after = parseEntries(next)[0];
      if (!after || after.source !== en || after.copies !== entry.copies || after.badCopies !== entry.badCopies) throw new Error("변환 결과를 넣으면 그 줄의 장수가 달라져 쓰지 않았습니다. 그 줄은 영문으로 직접 적어 주세요.");
      applied.push({ lineIndex: seen, ko: target.ko, en });
      return next;
    })
    .join("\n");
  // 바꾸지 않은 줄 = 그사이 고쳤거나 지워진 줄
  return { text: out, applied, skipped: sent.length - applied.length };
}

/**
 * 설명 칸의 글을 「지금 이 순간의 값」으로 들고 있는 칸. 화면의 상태(그릴 때의 값)와 달리, 고치는 즉시 바뀐다.
 * 사용자가 글을 고치는 모든 길(직접 입력·장수 버튼·비우기)이 이 칸을 거치게 해 두면, 변환 응답이 늦게 도착해도
 * **도착한 그 순간의 글**에 반영할 수 있다 — 기다리는 동안 고친 줄·지운 줄·바꾼 장수를 옛 글로 덮지 않는다.
 */
export function createTextCell(initial: string) {
  let value = String(initial ?? "");
  return {
    get: (): string => value,
    /** 새 글을 넣거나, 지금 글에서 새 글을 만드는 함수를 넣는다. 넣은 뒤의 글을 돌려준다 */
    set(next: string | ((current: string) => string)): string {
      value = String(typeof next === "function" ? next(value) : next);
      return value;
    },
  };
}
export type TextCell = ReturnType<typeof createTextCell>;

export class ConvertRequestError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ConvertRequestError";
    this.code = code;
    this.status = status;
  }
}

/** 변환 API를 **한 번** 부른다. 실패하면 예외 — 다시 부르지 않는다 */
export async function requestConversion(fetcher: typeof fetch, model: string, items: PendingLine[], signal?: AbortSignal): Promise<ConvertedItem[]> {
  let res: Response;
  try {
    res = await fetcher("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // consent: 화면이 비용 안내 동의를 받은 뒤에만 이 함수를 부른다(서버도 이 표시가 없으면 거절한다).
      body: JSON.stringify({ consent: true, model, items: items.map(({ id, ko }) => ({ id, ko })) }),
      cache: "no-store",
      signal,
    });
  } catch {
    throw new ConvertRequestError("변환 요청을 보내지 못했습니다. 설명은 그대로 두었습니다.", "network", 0);
  }
  let data: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new ConvertRequestError(typeof data?.error === "string" && data.error ? data.error : "변환하지 못했습니다. 설명은 그대로 두었습니다.", typeof data?.code === "string" ? data.code : "error", res.status);
  if (!data || !Array.isArray(data.items)) throw new ConvertRequestError("변환 결과를 읽지 못했습니다. 설명은 그대로 두었습니다.", "mismatch", res.status);
  return data.items as ConvertedItem[];
}

/**
 * 한 번에 하나만 실행하게 하는 문. 실행 중에 다시 부르면 실행하지 않고 null을 돌려준다(기다렸다가 다시 실행하지도 않는다).
 * 변환 버튼을 빠르게 두 번 눌러도 요청이 한 번만 나가게 하는 데 쓴다 — 화면의 버튼 비활성(다음 그리기에 반영)보다 먼저 막는다.
 * 범위: **이 문을 쓰는 화면 하나(탭 하나)** 안에서만. 탭을 두 개 열어 각각 누르면 두 번 나간다(서버는 중복을 걸러 내지 않는다).
 */
export function singleFlight() {
  let running = false;
  return {
    get running() {
      return running;
    },
    async run<T>(fn: () => Promise<T>): Promise<T | null> {
      if (running) return null;
      running = true;
      try {
        return await fn();
      } finally {
        running = false;
      }
    },
  };
}

export type ConvertStatus = { keys: Record<string, boolean>; defaultModel: string | null; models: { id: string; provider: string; tier: string; label: string }[] };

/** 등록된 키와 고를 수 있는 모델(키 값은 오지 않는다). AI 호출이 아니다 */
export async function fetchConvertStatus(fetcher: typeof fetch, signal?: AbortSignal): Promise<ConvertStatus> {
  let res: Response;
  try {
    res = await fetcher("/api/convert", { method: "GET", cache: "no-store", signal });
  } catch {
    throw new ConvertRequestError("등록된 키를 확인하지 못했습니다.", "network", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || typeof data !== "object" || !Array.isArray(data.models)) throw new ConvertRequestError(typeof data?.error === "string" && data.error ? data.error : "등록된 키를 확인하지 못했습니다.", "error", res.status);
  return { keys: data.keys ?? {}, defaultModel: typeof data.defaultModel === "string" ? data.defaultModel : null, models: data.models };
}

// ── 회원별 설정(브라우저 보관): 변환을 켰는지, 비용 안내에 동의했는지, 고른 모델 ──
export type ConvertSettings = { enabled: boolean; consent: boolean; model: string | null };
const settingsKey = (memberId: string) => `fis.convert.v1:${memberId}`;
const OFF: ConvertSettings = { enabled: false, consent: false, model: null };

/** 꺼져 있는 것이 기본이다. 읽지 못하거나 모양이 다르면 꺼짐으로 본다. 동의 없이는 켜진 것으로 읽지 않는다 */
export function loadConvertSettings(storage: KeyValueStore, memberId: string): ConvertSettings {
  try {
    const d = JSON.parse(storage.getItem(settingsKey(memberId)) ?? "null");
    if (!d || typeof d !== "object" || d.v !== 1) return { ...OFF };
    const consent = d.consent === true;
    return { enabled: consent && d.enabled === true, consent, model: findConvertModel(d.model)?.id ?? null };
  } catch {
    return { ...OFF };
  }
}

export function saveConvertSettings(storage: KeyValueStore, memberId: string, s: ConvertSettings): boolean {
  try {
    storage.setItem(settingsKey(memberId), JSON.stringify({ v: 1, enabled: s.consent && s.enabled, consent: s.consent, model: findConvertModel(s.model)?.id ?? null }));
    return true;
  } catch {
    return false;
  }
}

/** 변환 버튼을 누를 수 있는가 — 켜져 있고, 동의했고, 고른 모델의 키가 등록돼 있고, 바꿀 줄이 있다 */
export function canConvert(settings: ConvertSettings, status: ConvertStatus | null, pending: number): boolean {
  if (!settings.enabled || !settings.consent || pending <= 0 || !status) return false;
  const model = findConvertModel(settings.model);
  return !!model && status.keys[model.provider] === true;
}
