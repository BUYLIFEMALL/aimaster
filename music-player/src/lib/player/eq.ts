export const EQ_FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000] as const;
export const EQ_MIN = -15;
export const EQ_MAX = 15;

export const EQ_PRESETS: { name: string; label: string; gains: number[] }[] = [
  { name: "Flat", label: "기본(Flat)", gains: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Rock", label: "록", gains: [5, 4, 2, -3, -2, 1, 4, 6] },
  { name: "Pop", label: "팝", gains: [-2, -1, 0, 2, 4, 4, 2, -1] },
  { name: "Jazz", label: "재즈", gains: [4, 3, 1, 2, -2, -2, 0, 2] },
  { name: "Classical", label: "클래식", gains: [5, 4, 3, 0, -2, -3, -4, -5] },
  { name: "Bass", label: "저음 강조", gains: [8, 6, 3, 1, 0, 0, 0, 0] },
  { name: "Vocal", label: "보컬 강조", gains: [-3, -2, 0, 3, 5, 4, 1, -1] },
];

export function clampGain(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(EQ_MIN, Math.min(EQ_MAX, Math.round(v * 10) / 10));
}

export function normalizeGains(input: unknown): number[] {
  const arr = Array.isArray(input) ? input : [];
  return EQ_FREQUENCIES.map((_, i) => clampGain(Number(arr[i] ?? 0)));
}

export function hzLabel(f: number): string {
  return f >= 1000 ? `${f / 1000}k` : String(f);
}
