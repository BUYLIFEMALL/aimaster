// 공용 기준 코드 `browser-free-tts`(2026-10-24) — 기준 위치 shorts-onestop-studio/src/lib/freeTts/. 사본은 직접 고치지 말 것(docs/SHARED_MODULES.md).
// Supertone 공식 예제 web/helper.js를 TypeScript로 옮김(동작 그대로, 문장별 길이를 돌려주도록만 바꿈).
// 원본: https://github.com/supertone-inc/supertonic (web/helper.js)
// MIT License — Copyright (c) 2025 Supertone Inc.
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
//   (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge,
//   publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
//   subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or
//   substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
// 모델 가중치(Supertone/supertonic-3)는 OpenRAIL-M — 사용 제한(사칭 금지·합성음 표기)은 화면 안내로 회원에게 알린다.
import type * as Ort from "onnxruntime-web";

// 계산 라이브러리는 묶지 않고 작업자가 같은 주소(/ort/)에서 불러와 넘겨준다 — 묶으면 여러 줄 계산용 하위 작업자가 뜨지 않는다(Turbopack)
let ort: typeof Ort;
export function useOrt(m: typeof Ort) { ort = m; }

export const AVAILABLE_LANGS = ["en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et", "fi", "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "vi", "na"];

type Mask = number[][][];

export class UnicodeProcessor {
  constructor(private indexer: number[]) {}

  call(textList: string[], langList: string[]): { textIds: number[][]; textMask: Mask } {
    const processed = textList.map((t, i) => this.preprocessText(t, langList[i]));
    const lengths = processed.map((t) => t.length);
    const maxLen = Math.max(...lengths);
    const textIds = processed.map((t) => {
      const row = new Array<number>(maxLen).fill(0);
      for (let j = 0; j < t.length; j++) {
        const cp = t.codePointAt(j)!;
        row[j] = cp < this.indexer.length ? this.indexer[cp] : -1;
      }
      return row;
    });
    return { textIds, textMask: lengthToMask(lengths, maxLen) };
  }

  preprocessText(input: string, lang: string): string {
    let text = input.normalize("NFKD");
    text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu, "");
    const replacements: Record<string, string> = { "–": "-", "‑": "-", "—": "-", "_": " ", "“": '"', "”": '"', "‘": "'", "’": "'", "´": "'", "`": "'", "[": " ", "]": " ", "|": " ", "/": " ", "#": " ", "→": " ", "←": " " };
    for (const [k, v] of Object.entries(replacements)) text = text.split(k).join(v);
    text = text.replace(/[♥☆♡©\\]/g, "");
    const expr: Record<string, string> = { "@": " at ", "e.g.,": "for example, ", "i.e.,": "that is, " };
    for (const [k, v] of Object.entries(expr)) text = text.split(k).join(v);
    text = text.replace(/ ,/g, ",").replace(/ \./g, ".").replace(/ !/g, "!").replace(/ \?/g, "?").replace(/ ;/g, ";").replace(/ :/g, ":").replace(/ '/g, "'");
    while (text.includes('""')) text = text.replace('""', '"');
    while (text.includes("''")) text = text.replace("''", "'");
    text = text.replace(/\s+/g, " ").trim();
    if (!/[.!?;:,'"')\]}…。」』】〉》›»]$/.test(text)) text += ".";
    if (!AVAILABLE_LANGS.includes(lang)) throw new Error(`Invalid language: ${lang}`);
    return `<${lang}>${text}</${lang}>`;
  }
}

function lengthToMask(lengths: number[], maxLen?: number): Mask {
  const m = maxLen || Math.max(...lengths);
  return lengths.map((len) => {
    const row = new Array<number>(m).fill(0);
    for (let j = 0; j < Math.min(len, m); j++) row[j] = 1;
    return [row];
  });
}

export interface Style { ttl: Ort.Tensor; dp: Ort.Tensor }
export interface TtsConfig { ae: { sample_rate: number; base_chunk_size: number }; ttl: { chunk_compress_factor: number; latent_dim: number } }

export class TextToSpeech {
  readonly sampleRate: number;
  constructor(private cfgs: TtsConfig, private textProcessor: UnicodeProcessor, private dpOrt: Ort.InferenceSession, private textEncOrt: Ort.InferenceSession, private vectorEstOrt: Ort.InferenceSession, private vocoderOrt: Ort.InferenceSession) {
    this.sampleRate = cfgs.ae.sample_rate;
  }

  /** 한 덩어리 → 음성(Float32)과 예측 길이(초) */
  async infer(text: string, lang: string, style: Style, totalStep: number, speed: number): Promise<{ wav: Float32Array; duration: number }> {
    const { textIds, textMask } = this.textProcessor.call([text], [lang]);
    const textIdsTensor = new ort.Tensor("int64", new BigInt64Array(textIds.flat().map((x) => BigInt(x))), [1, textIds[0].length]);
    const textMaskTensor = new ort.Tensor("float32", new Float32Array(textMask.flat(2)), [1, 1, textMask[0][0].length]);
    const dp = await this.dpOrt.run({ text_ids: textIdsTensor, style_dp: style.dp, text_mask: textMaskTensor });
    const duration = (Array.from(dp.duration.data as Float32Array) as number[]).map((d) => d / speed);
    const enc = await this.textEncOrt.run({ text_ids: textIdsTensor, style_ttl: style.ttl, text_mask: textMaskTensor });
    const textEmb = enc.text_emb;

    // 잡음 잠재값(Box-Muller) + 길이 가림
    const sr = this.sampleRate, chunk = this.cfgs.ae.base_chunk_size * this.cfgs.ttl.chunk_compress_factor;
    const latentDim = this.cfgs.ttl.latent_dim * this.cfgs.ttl.chunk_compress_factor;
    const wavLen = Math.floor(duration[0] * sr);
    const latentLen = Math.floor((wavLen + chunk - 1) / chunk);
    const mask = new Float32Array(latentLen).fill(1);
    let xt = new Float32Array(latentDim * latentLen);
    for (let i = 0; i < xt.length; i++) {
      const u1 = Math.max(0.0001, Math.random()), u2 = Math.random();
      xt[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * mask[i % latentLen];
    }
    const latentMaskTensor = new ort.Tensor("float32", mask, [1, 1, latentLen]);
    const totalStepTensor = new ort.Tensor("float32", new Float32Array([totalStep]), [1]);
    for (let step = 0; step < totalStep; step++) {
      const out = await this.vectorEstOrt.run({
        noisy_latent: new ort.Tensor("float32", xt, [1, latentDim, latentLen]),
        text_emb: textEmb, style_ttl: style.ttl, latent_mask: latentMaskTensor, text_mask: textMaskTensor,
        current_step: new ort.Tensor("float32", new Float32Array([step]), [1]), total_step: totalStepTensor,
      });
      xt = new Float32Array(out.denoised_latent.data as Float32Array);
    }
    const voc = await this.vocoderOrt.run({ latent: new ort.Tensor("float32", xt, [1, latentDim, latentLen]) });
    const full = voc.wav_tts.data as Float32Array;
    return { wav: full.slice(0, Math.min(full.length, wavLen)), duration: duration[0] };
  }
}

export async function loadVoiceStyle(url: string): Promise<Style> {
  const s = (await (await fetch(url)).json()) as { style_ttl: { dims: number[]; data: unknown[] }; style_dp: { dims: number[]; data: unknown[] } };
  const ttl = new Float32Array((s.style_ttl.data as unknown[]).flat(Infinity) as number[]);
  const dp = new Float32Array((s.style_dp.data as unknown[]).flat(Infinity) as number[]);
  return { ttl: new ort.Tensor("float32", ttl, [1, s.style_ttl.dims[1], s.style_ttl.dims[2]]), dp: new ort.Tensor("float32", dp, [1, s.style_dp.dims[1], s.style_dp.dims[2]]) };
}

/** 문장 나누기(원본 chunkText와 같은 규칙) — 한국어·일본어는 120자 */
export function chunkText(text: string, maxLen = 120): string[] {
  const chunks: string[] = [];
  for (const raw of text.trim().split(/\n\s*\n+/)) {
    const paragraph = raw.trim();
    if (!paragraph) continue;
    const sentences = paragraph.split(/(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Ph\.D\.|etc\.|e\.g\.|i\.e\.|vs\.|Inc\.|Ltd\.|Co\.|Corp\.|St\.|Ave\.|Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/);
    let cur = "";
    for (const s of sentences) {
      if (cur.length + s.length + 1 <= maxLen) cur += (cur ? " " : "") + s;
      else { if (cur) chunks.push(cur.trim()); cur = s; }
    }
    if (cur) chunks.push(cur.trim());
  }
  return chunks;
}
