// v1.42 배경음악 길이(초) 계산 — 파일 머리글만 읽는다(외부 도구·호출 없음). 읽지 못하면 null(화면에 길이를 표시하지 않음).
// Lyria는 음원만 돌려주고 길이를 알려 주지 않아 MP3/WAV 머리글로 계산한다(2026-10-23 실측: Lyria MP3 1.4MB ≈ 62초 = 192kbps 고정).

const MP3_BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MP3_BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const MP3_RATES_V1 = [44100, 48000, 32000];

function text(b: Uint8Array, at: number, len: number): string {
  return String.fromCharCode(...b.subarray(at, at + len));
}

/** WAV: fmt 청크의 초당 바이트 수와 data 청크 크기로 계산 */
function wavSeconds(b: Uint8Array): number | null {
  if (b.length < 44 || text(b, 0, 4) !== "RIFF" || text(b, 8, 4) !== "WAVE") return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let byteRate = 0;
  for (let at = 12; at + 8 <= b.length;) {
    const id = text(b, at, 4);
    const size = v.getUint32(at + 4, true);
    if (id === "fmt " && at + 16 <= b.length) byteRate = v.getUint32(at + 16, true);
    if (id === "data") return byteRate > 0 ? Math.min(size, b.length - at - 8) / byteRate : null;
    at += 8 + size + (size % 2);
  }
  return null;
}

/** MP3(MPEG Layer III): 첫 프레임 머리글 — Xing/Info 머리글이 있으면 프레임 수로, 없으면 고정 비트레이트로 계산 */
function mp3Seconds(b: Uint8Array): number | null {
  let start = 0;
  if (b.length > 10 && text(b, 0, 3) === "ID3") {
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    start = 10 + size + (b[5] & 0x10 ? 10 : 0);
  }
  for (let i = start; i + 4 <= b.length && i < start + 65536; i++) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) continue;
    const version = (b[i + 1] >> 3) & 3; // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
    const layer = (b[i + 1] >> 1) & 3; // 1=Layer III
    const bIdx = b[i + 2] >> 4;
    const rIdx = (b[i + 2] >> 2) & 3;
    if (version === 1 || layer !== 1 || bIdx === 0 || bIdx === 15 || rIdx === 3) continue;
    const v1 = version === 3;
    const rate = MP3_RATES_V1[rIdx] / (v1 ? 1 : version === 2 ? 2 : 4);
    const samples = v1 ? 1152 : 576;
    const head = text(b, i + 4, Math.min(64, b.length - i - 4));
    const tag = Math.max(head.indexOf("Xing"), head.indexOf("Info"));
    if (tag >= 0) {
      const at = i + 4 + tag;
      if (at + 12 <= b.length && b[at + 7] & 1) {
        const frames = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(at + 8);
        if (frames > 0) return (frames * samples) / rate;
      }
    }
    const kbps = (v1 ? MP3_BITRATES_V1 : MP3_BITRATES_V2)[bIdx];
    return ((b.length - i) * 8) / (kbps * 1000);
  }
  return null;
}

export function audioDurationSeconds(data: Uint8Array, contentType = ""): number | null {
  const s = contentType.includes("wav") ? wavSeconds(data) ?? mp3Seconds(data) : mp3Seconds(data) ?? wavSeconds(data);
  return s && Number.isFinite(s) && s > 0 && s < 3600 ? Math.round(s) : null;
}
