// F4(v1.35): 「📦 목적별 묶음 저장」 — 결과 한 장을 여러 규격(증명사진 규격 + 프로필 형식)으로 한 번에 ZIP 저장. AI 호출 없음. 순수 함수(시험 대상)
import { PROFILE_FORMATS, SIZE_PRESETS } from "./post";

/** 묶음 항목 키: "size:<규격 id>" 또는 "profile:<프로필 형식 id>" */
export type BundleKey = `size:${string}` | `profile:${string}`;
export interface Bundle { id: string; label: string; desc: string; items: BundleKey[] }

export const BUNDLES: Bundle[] = [
  { id: "job", label: "💼 취업·이력서", desc: "이력서 3×4 + 인화용 고해상도 + 프로필 정사각", items: ["size:resume", "size:print-hires", "profile:square"] },
  { id: "travel", label: "✈️ 여권·여행", desc: "여권 3.5×4.5 + 미국 비자 + K-ETA (크기 참고용)", items: ["size:passport", "size:us-visa", "size:kr-keta"] },
  { id: "sns", label: "📱 SNS 프로필", desc: "정사각 + 세로 4:5 + 원형", items: ["profile:square", "profile:portrait", "profile:circle"] },
];
export const MAX_BUNDLE_ITEMS = 12;

/** 목록에 있는 항목만, 중복 없이, 최대 12개 */
export function cleanBundle(keys: unknown): BundleKey[] {
  const out: BundleKey[] = [];
  for (const k of Array.isArray(keys) ? keys : []) {
    if (typeof k !== "string" || out.includes(k as BundleKey)) continue;
    const [kind, id] = k.split(":");
    const ok = kind === "size" ? SIZE_PRESETS.some((p) => p.id === id) : kind === "profile" ? PROFILE_FORMATS.some((f) => f.id === id) : false;
    if (ok) out.push(k as BundleKey);
    if (out.length >= MAX_BUNDLE_ITEMS) break;
  }
  return out;
}

/** 항목 이름(화면 표시) */
export function bundleItemLabel(k: BundleKey): string {
  const [kind, id] = k.split(":");
  if (kind === "size") return SIZE_PRESETS.find((p) => p.id === id)?.label ?? id;
  return `프로필 ${PROFILE_FORMATS.find((f) => f.id === id)?.label ?? id}`;
}

/** ZIP 안 파일 이름(같은 규격이 두 번 들어가지 않으므로 이름이 겹치지 않음) */
export function bundleFileName(base: string, k: BundleKey): string {
  const [kind, id] = k.split(":");
  if (kind === "size") {
    const p = SIZE_PRESETS.find((x) => x.id === id)!;
    return `${base}-${p.id}-${p.width}x${p.height}.jpg`;
  }
  const f = PROFILE_FORMATS.find((x) => x.id === id)!;
  return `${base}-프로필-${f.id}-${f.width}x${f.height}.${f.circle ? "png" : "jpg"}`;
}
