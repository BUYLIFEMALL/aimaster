// BLC-07: body text = any line that is not a [SECTION - …] or [IMAGE INSERT - n] marker.
// Pure helper (no imports) so the extension task route and its tests share one rule.
export function hasBodyText(content: unknown): boolean {
  return String(content || "").split(/\r?\n/).map((line) => line.trim())
    .some((line) => Boolean(line) && !/^\[SECTION\s*-\s*.+\]$/i.test(line) && !/^\[IMAGE INSERT\s*-\s*\d+\]$/i.test(line));
}
