// 경량 ID3v2 파서(제목·아티스트·앨범·내장 커버). 실패하면 빈 값을 돌려주고, 호출 측이 파일명 규칙으로 대체한다.
export interface Id3Info {
  title: string;
  artist: string;
  album: string;
  cover: { mime: string; data: Uint8Array } | null;
}

const EMPTY: Id3Info = { title: "", artist: "", album: "", cover: null };

function syncsafe(b: Uint8Array, o: number): number {
  return ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f);
}
function be32(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function decode(bytes: Uint8Array, enc: number): string {
  try {
    let label = "iso-8859-1";
    let data = bytes;
    if (enc === 1) {
      if (data[0] === 0xff && data[1] === 0xfe) { label = "utf-16le"; data = data.subarray(2); }
      else if (data[0] === 0xfe && data[1] === 0xff) { label = "utf-16be"; data = data.subarray(2); }
      else label = "utf-16le";
    } else if (enc === 2) label = "utf-16be";
    else if (enc === 3) label = "utf-8";
    return new TextDecoder(label).decode(data).replace(/\0+$/g, "").replace(/\0/g, " ").trim();
  } catch {
    return "";
  }
}

function textFrame(body: Uint8Array): string {
  if (body.length < 2) return "";
  return decode(body.subarray(1), body[0]);
}

function indexOfTerminator(b: Uint8Array, start: number, enc: number): number {
  if (enc === 1 || enc === 2) {
    for (let i = start; i + 1 < b.length; i += 2) if (b[i] === 0 && b[i + 1] === 0) return i;
    return -1;
  }
  for (let i = start; i < b.length; i += 1) if (b[i] === 0) return i;
  return -1;
}

function apic(body: Uint8Array, v22: boolean): Id3Info["cover"] {
  if (body.length < 8) return null;
  const enc = body[0];
  let p = 1;
  let mime: string;
  if (v22) {
    mime = `image/${new TextDecoder("iso-8859-1").decode(body.subarray(1, 4)).toLowerCase().replace("jpg", "jpeg")}`;
    p = 4;
  } else {
    const end = indexOfTerminator(body, 1, 0);
    if (end < 0) return null;
    mime = new TextDecoder("iso-8859-1").decode(body.subarray(1, end)).toLowerCase() || "image/jpeg";
    p = end + 1;
  }
  p += 1; // picture type
  const dEnd = indexOfTerminator(body, p, enc);
  if (dEnd < 0) return null;
  p = dEnd + (enc === 1 || enc === 2 ? 2 : 1);
  const data = body.subarray(p);
  if (data.length < 16) return null;
  if (!mime.startsWith("image/")) mime = data[0] === 0x89 ? "image/png" : "image/jpeg";
  return { mime, data };
}

export function parseId3(buffer: ArrayBuffer): Id3Info {
  try {
    const b = new Uint8Array(buffer);
    if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return { ...EMPTY };
    const major = b[3];
    if (major < 2 || major > 4) return { ...EMPTY };
    const flags = b[5];
    const tagSize = syncsafe(b, 6);
    const end = Math.min(b.length, 10 + tagSize);
    let p = 10;
    if (major >= 3 && (flags & 0x40)) {
      // 확장 헤더 건너뛰기
      const ext = major === 4 ? syncsafe(b, p) : be32(b, p) + 4;
      p += ext;
    }
    const info: Id3Info = { ...EMPTY };
    const v22 = major === 2;
    const headLen = v22 ? 6 : 10;
    while (p + headLen <= end) {
      const id = new TextDecoder("iso-8859-1").decode(b.subarray(p, p + (v22 ? 3 : 4)));
      if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
      let size: number;
      if (v22) size = (b[p + 3] << 16) | (b[p + 4] << 8) | b[p + 5];
      else size = major === 4 ? syncsafe(b, p + 4) : be32(b, p + 4);
      const bodyStart = p + headLen;
      if (size <= 0 || bodyStart + size > end) break;
      const body = b.subarray(bodyStart, bodyStart + size);
      if (id === "TIT2" || id === "TT2") info.title = info.title || textFrame(body);
      else if (id === "TPE1" || id === "TP1") info.artist = info.artist || textFrame(body);
      else if (id === "TALB" || id === "TAL") info.album = info.album || textFrame(body);
      else if ((id === "APIC" || id === "PIC") && !info.cover) info.cover = apic(body, v22);
      p = bodyStart + size;
    }
    return info;
  } catch {
    return { ...EMPTY };
  }
}
