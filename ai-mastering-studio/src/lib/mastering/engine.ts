// 브라우저 전용: Web Audio(OfflineAudioContext)로 EQ·새추레이션·컴프레서를 렌더링한 뒤 순수 코드로 너비·리미터를 적용한다.
import { applyLimiter, applyStereoWidth, normalizeGain, saturationCurve, measure } from "./dsp";
import type { MasteringParams } from "./params";

export interface RenderedAudio { channels: Float32Array[]; sampleRate: number }

export function bufferChannels(buf: AudioBuffer): Float32Array[] {
  return Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
}

export async function masterAudio(input: AudioBuffer, params: MasteringParams): Promise<RenderedAudio> {
  const { eq, saturation, compressor, stereo, limiter } = params;
  const gainIn = normalizeGain(measure(bufferChannels(input)).peak);

  const ctx = new OfflineAudioContext(input.numberOfChannels, input.length, input.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = input;
  const pre = ctx.createGain();
  pre.gain.value = gainIn;
  src.connect(pre);

  // 3밴드 EQ: 저역 쉘프 100Hz · 중역 피킹 1.5kHz(Q) · 고역 쉘프 8kHz
  const low = ctx.createBiquadFilter();
  low.type = "lowshelf"; low.frequency.value = 100; low.gain.value = eq.low;
  const mid = ctx.createBiquadFilter();
  mid.type = "peaking"; mid.frequency.value = 1500; mid.Q.value = eq.q || 1; mid.gain.value = eq.mid;
  const high = ctx.createBiquadFilter();
  high.type = "highshelf"; high.frequency.value = 8000; high.gain.value = eq.high;
  pre.connect(low).connect(mid).connect(high);
  let node: AudioNode = high;

  // 아날로그 새추레이션: 원음(dry)과 웨이브셰이퍼(wet)를 harmonics 비율로 섞는다
  if (saturation.drive > 0) {
    const driveGain = ctx.createGain();
    driveGain.gain.value = 1 + saturation.drive * 0.1;
    const shaper = ctx.createWaveShaper();
    shaper.curve = saturationCurve(saturation.drive) as Float32Array<ArrayBuffer>;
    shaper.oversample = "4x";
    const makeup = ctx.createGain();
    makeup.gain.value = 1 / (1 + saturation.drive * 0.05);
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const mix = saturation.harmonics / 100;
    dry.gain.value = 1 - mix * 0.4;
    wet.gain.value = mix;
    const sum = ctx.createGain();
    node.connect(dry);
    node.connect(driveGain);
    driveGain.connect(shaper).connect(makeup).connect(wet);
    dry.connect(sum);
    wet.connect(sum);
    node = sum;
  }

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = compressor.threshold;
  comp.ratio.value = compressor.ratio;
  comp.attack.value = Math.max(0.001, compressor.attack / 1000);
  comp.release.value = Math.max(0.01, compressor.release / 1000);
  comp.knee.value = 12;
  node.connect(comp);
  comp.connect(ctx.destination);
  src.start(0);

  const rendered = await ctx.startRendering();
  const widened = applyStereoWidth(bufferChannels(rendered), stereo.width);
  const channels = applyLimiter(widened, rendered.sampleRate, limiter);
  return { channels, sampleRate: rendered.sampleRate };
}

/** 렌더 결과를 재생·파형용 AudioBuffer로 만든다 */
export function toAudioBuffer(r: RenderedAudio): AudioBuffer {
  const buf = new AudioBuffer({ length: r.channels[0].length, numberOfChannels: r.channels.length, sampleRate: r.sampleRate });
  r.channels.forEach((ch, c) => buf.copyToChannel(ch as Float32Array<ArrayBuffer>, c));
  return buf;
}
