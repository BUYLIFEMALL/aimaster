// BLOG 크롬 확장 아이콘(초록 바탕 + 흰 "B") PNG 16/32/48/128을 만든다 — 2026-10-01.
// 아이콘이 없으면 크롬이 이름 첫 글자로 회색 아이콘을 만드는데, SEO 스튜디오 확장과 이름이 둘 다 "AIMaster…"로 시작해서
// 똑같은 "A" 아이콘이 돼 두 확장이 구분되지 않았다(주인님 신고). 외부 라이브러리 없이 PNG를 직접 만든다. 한 번 실행해 결과를 커밋하면 된다.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'extension', 'icons')
fs.mkdirSync(outDir, { recursive: true })

// 7x9 비트맵 "B"
const GLYPH = [
  '111110.',
  '11...11',
  '11...11',
  '11...11',
  '111111.',
  '11...11',
  '11...11',
  '11...11',
  '111110.',
]
const BG = [5, 150, 105] // emerald-600
const FG = [255, 255, 255]

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makeIcon(size) {
  const radius = size * 0.2
  const glyphW = GLYPH[0].length
  const glyphH = GLYPH.length
  const cell = Math.max(1, Math.floor((size * 0.62) / glyphH))
  const offX = Math.floor((size - glyphW * cell) / 2)
  const offY = Math.floor((size - glyphH * cell) / 2)
  const rows = []
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4)
    for (let x = 0; x < size; x += 1) {
      // 둥근 모서리 사각형 안쪽인지
      const cx = Math.min(Math.max(x + 0.5, radius), size - radius)
      const cy = Math.min(Math.max(y + 0.5, radius), size - radius)
      const inside = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius
      const gx = Math.floor((x - offX) / cell)
      const gy = Math.floor((y - offY) / cell)
      const onGlyph = gx >= 0 && gy >= 0 && gx < glyphW && gy < glyphH && GLYPH[gy][gx] === '1'
      const [r, g, b] = onGlyph ? FG : BG
      row.set([r, g, b, inside ? 255 : 0], 1 + x * 4)
    }
    rows.push(row)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 6, 0, 0, 0], 8) // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), makeIcon(size))
}
console.log(`icons written to ${outDir}`)
