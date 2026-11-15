// v1.57 메이커 후속 M3-② 5단계: 효과음(장면 넘김·카드 태그·마무리) + 배경음악 박자 맞춤. 화면·시험 공용 순수 함수.
// 효과음은 외부 음원 파일을 쓰지 않고 이 파일의 수식으로 직접 합성한다(제3자 저작권·라이선스 없음 — NOTICE 「효과음」 참고).
// 박자 추정은 배경음악 소리 세기 변화(onset)의 자기상관으로 템포·시작점을 찾고, 못 찾으면 장면 경계 그대로 둔다.


export const SFX = { whoosh: "휙(장면 넘김)", pop: "뽁", tick: "똑", ding: "띵" } as const;
export type SfxName = keyof typeof SFX;
export type Cue = { at: number; name: SfxName };

/** 같은 결과가 나오는 난수(휙 소리의 잡음용) */
function rng(seed: number) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** 효과음 하나를 합성(모노, -1~1) */
export function synth(name: SfxName, rate: number): Float32Array {
  const len = (sec: number) => new Float32Array(Math.round(sec * rate));
  if (name === "whoosh") {
    const out = len(0.38); const r = rng(7); let lp = 0;
    for (let i = 0; i < out.length; i++) {
      const t = i / out.length; const a = 0.02 + 0.5 * t; // 낮은 소리에서 높은 소리로 쓸고 지나감
      lp += a * ((r() * 2 - 1) - lp);
      out[i] = lp * Math.sin(Math.PI * t) * 0.9;
    }
    return out;
  }
  if (name === "pop") {
    const out = len(0.12); let ph = 0;
    for (let i = 0; i < out.length; i++) { const t = i / rate; ph += (2 * Math.PI * (300 + 600 * Math.exp(-t * 40))) / rate; out[i] = Math.sin(ph) * Math.exp(-t * 32) * 0.8; }
    return out;
  }
  if (name === "tick") {
    const out = len(0.05);
    for (let i = 0; i < out.length; i++) { const t = i / rate; out[i] = Math.sin(2 * Math.PI * 1900 * t) * Math.exp(-t * 110) * 0.7; }
    return out;
  }
  const out = len(0.9);
  for (let i = 0; i < out.length; i++) { const t = i / rate; out[i] = (Math.sin(2 * Math.PI * 1320 * t) * 0.6 + Math.sin(2 * Math.PI * 1980 * t) * 0.25) * Math.exp(-t * 5) * Math.min(1, t * 400) * 0.6; }
  return out;
}

const TAG_SFX: Record<"stamp" | "count" | "check" | "shine", SfxName> = { stamp: "pop", count: "tick", check: "tick", shine: "ding" };

/** 장면 시각표(timeline().segs)로 효과음 자리를 정한다: 장면이 바뀌기 직전 휙, 템플릿 카드 태그가 나올 때 태그 소리, 마무리에 띵 */
export function sfxCues(segs: { kind: string; start: number }[], motion?: keyof typeof TAG_SFX): Cue[] {
  const out: Cue[] = [];
  segs.forEach((g, i) => {
    if (i > 0) out.push({ at: Math.max(0, g.start - 0.12), name: "whoosh" });
    if (g.kind === "card" && motion) out.push({ at: g.start + 0.05, name: TAG_SFX[motion] });
    if (g.kind === "outro") out.push({ at: g.start + 0.3, name: "ding" });
  });
  return out;
}

/** 배경음악 박자(초 단위 간격·첫 박 위치). 70~180BPM 범위에서 뚜렷한 박이 없으면 null */
export function estimateBeats(samples: Float32Array, rate: number): { period: number; offset: number } | null {
  const hop = 512; const n = Math.min(Math.floor(samples.length / hop), Math.floor((60 * rate) / hop));
  if (n < 64) return null;
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) { let e = 0; for (let j = 0; j < hop; j++) { const v = samples[i * hop + j]; e += v * v; } env[i] = Math.sqrt(e / hop); }
  const on = new Float32Array(n); for (let i = 1; i < n; i++) on[i] = Math.max(0, env[i] - env[i - 1]);
  const fps = rate / hop; const minLag = Math.floor((fps * 60) / 180), maxLag = Math.ceil((fps * 60) / 70);
  let best = 0, bestLag = 0, mean = 0;
  for (let lag = minLag; lag <= Math.min(maxLag, n - 1); lag++) {
    let sum = 0; for (let i = lag; i < n; i++) sum += on[i] * on[i - lag];
    mean += sum; if (sum > best) { best = sum; bestLag = lag; }
  }
  const lags = Math.min(maxLag, n - 1) - minLag + 1; mean /= Math.max(1, lags);
  if (!bestLag || best < mean * 1.3) return null; // 박자가 뚜렷하지 않음
  let bestPh = 0, phSum = -1;
  for (let ph = 0; ph < bestLag; ph++) { let sum = 0; for (let i = ph; i < n; i += bestLag) sum += on[i]; if (sum > phSum) { phSum = sum; bestPh = ph; } }
  return { period: bestLag / fps, offset: bestPh / fps };
}

/** 가까운 박(±maxShift초 안)으로 옮긴다. 박이 없거나 멀면 그대로 */
export function snapToBeat(t: number, beats: { period: number; offset: number } | null, maxShift = 0.15): number {
  if (!beats || beats.period <= 0) return t;
  const k = Math.round((t - beats.offset) / beats.period); const b = beats.offset + k * beats.period;
  return Math.abs(b - t) <= maxShift && b >= 0 ? Math.round(b * 1000) / 1000 : t;
}

/** 이미 섞인 소리(채널별 Float32Array)에 효과음을 더한다. 넘치지 않게 -1~1로 자른다 */
export function addCues(channels: Float32Array[], rate: number, cues: Cue[], volume: number): void {
  const cache = new Map<SfxName, Float32Array>();
  for (const c of cues) {
    const snd = cache.get(c.name) ?? synth(c.name, rate); cache.set(c.name, snd);
    const at = Math.round(c.at * rate);
    for (const ch of channels) for (let i = 0; i < snd.length && at + i < ch.length; i++) { if (at + i < 0) continue; ch[at + i] = Math.max(-1, Math.min(1, ch[at + i] + snd[i] * volume)); }
  }
}
