// Validate central-directory sizes before any decompression (ZIP64 is not accepted).
export function inspectDocxZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 22 || view.getUint32(0, true) !== 0x04034b50)
    throw new Error("올바른 DOCX 파일이 아닙니다.");
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65_557); p--)
    if (
      view.getUint32(p, true) === 0x06054b50 &&
      p + 22 + view.getUint16(p + 20, true) === bytes.length
    ) {
      end = p;
      break;
    }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true))
    throw new Error("DOCX 압축 구조를 읽지 못했습니다.");
  const count = view.getUint16(end + 10, true),
    offset = view.getUint32(end + 16, true),
    directoryBytes = view.getUint32(end + 12, true);
  if (
    !count ||
    count > 512 ||
    offset + directoryBytes > end ||
    count === 0xffff
  )
    throw new Error(
      "DOCX 내부 파일 수가 많거나 지원하지 않는 압축 형식입니다.",
    );
  let p = offset,
    total = 0;
  const names = new Set<string>(),
    entries: { name: string; size: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || view.getUint32(p, true) !== 0x02014b50)
      throw new Error("DOCX 내부 구조가 손상됐습니다.");
    const flags = view.getUint16(p + 8, true),
      size = view.getUint32(p + 24, true),
      nameLength = view.getUint16(p + 28, true),
      extra = view.getUint16(p + 30, true),
      comment = view.getUint16(p + 32, true);
    if (
      p + 46 + nameLength + extra + comment > end ||
      size === 0xffffffff ||
      flags & 1
    )
      throw new Error("암호화되거나 손상된 DOCX는 지원하지 않습니다.");
    const name = new TextDecoder().decode(
      bytes.subarray(p + 46, p + 46 + nameLength),
    );
    if (
      names.has(name) ||
      name.includes("\\") ||
      name.startsWith("/") ||
      name.split("/").some((s) => s === "..")
    )
      throw new Error("DOCX 내부 경로가 올바르지 않습니다.");
    names.add(name);
    total += size;
    entries.push({ name, size });
    p += 46 + nameLength + extra + comment;
    if (total > 20 * 1024 * 1024)
      throw new Error("압축을 푼 DOCX가 20MB를 넘습니다. 문서를 나누어주세요.");
  }
  if (!names.has("word/document.xml") || p !== offset + directoryBytes)
    throw new Error("Word 문서 내용을 찾지 못했습니다.");
  return entries;
}
