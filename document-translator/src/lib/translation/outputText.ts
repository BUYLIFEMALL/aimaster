// Preserve genuine source escape sequences; repair accidental double escaping
// only for a source block that uses actual line breaks without literal escapes.
export function normalizeOutputBreaks(source: string, translated: string) {
  if (
    !source.includes("\n") ||
    source.includes("\\n") ||
    source.includes("\\r")
  )
    return translated;
  return translated.replaceAll("\\r\\n", "\n").replaceAll("\\n", "\n");
}
