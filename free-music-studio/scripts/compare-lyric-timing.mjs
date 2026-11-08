// B-4 검수 전용. 저장된 자동 원본과 같은 음원의 수동 확정본만 비교한다.
// 네트워크·회원 DB·원본 파일 변경·임계값 자동 조정 없음.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function checkSnapshot(s) {
  if (!s || typeof s.sourceId !== "string" || !s.sourceId.trim() ||
      !/^[0-9a-f]{64}$/.test(s.lyricsHash ?? "") ||
      !Number.isFinite(s.duration) || s.duration <= 0 || !Array.isArray(s.cues) || !s.cues.length)
    throw new Error("음원 번호·가사 해시·재생 길이·가사 줄이 있는 자료가 필요합니다.");
  const ids = new Set();
  for (const c of s.cues) {
    if (!c || typeof c.lineId !== "string" || !c.lineId || ids.has(c.lineId) ||
        typeof c.text !== "string" || !c.text.trim() ||
        !(c.start === null || Number.isFinite(c.start) && c.start >= 0 && c.start < s.duration) ||
        !["automatic", "manual", "review"].includes(c.status) || c.status === "manual" && c.start === null)
      throw new Error("가사 줄 번호·문장·시작 시간·확정 상태가 올바르지 않습니다.");
    ids.add(c.lineId);
  }
}

export function compareLyricTiming(automatic, reference) {
  checkSnapshot(automatic); checkSnapshot(reference);
  if (automatic.cues.some(c => c.status === "manual"))
    throw new Error("자동 원본에 수동 수정한 줄이 있습니다. 수정 전 자동 결과를 사용해 주세요.");
  if (automatic.sourceId !== reference.sourceId || automatic.lyricsHash !== reference.lyricsHash ||
      Math.abs(automatic.duration - reference.duration) > 0.1 + Number.EPSILON * 100)
    throw new Error("같은 음원·가사·재생 길이의 자료만 비교할 수 있습니다.");
  const predicted = new Map(automatic.cues.map(c => [c.lineId, c]));
  if (predicted.size !== reference.cues.length || reference.cues.some(c => predicted.get(c.lineId)?.text !== c.text))
    throw new Error("자동 원본과 수동 확정본의 가사 줄 번호·문장이 일치해야 합니다.");
  const confirmed = reference.cues.filter(c => c.status === "manual");
  if (!confirmed.length) throw new Error("수동으로 확정한 정답 시간이 없습니다.");
  const rows = confirmed.map(c => {
    const a = predicted.get(c.lineId);
    const error = a.start === null ? null : Math.abs(a.start - c.start);
    return { lineId: c.lineId, predictedStart: a.start, referenceStart: c.start, absoluteErrorSeconds: error,
      withinHalfSecond: error === null ? null : error <= 0.5 + Number.EPSILON * 100 };
  });
  const scored = rows.filter(c => c.absoluteErrorSeconds !== null);
  return {
    sourceId: automatic.sourceId, totalLines: reference.cues.length,
    manualReferenceLines: confirmed.length, comparedLines: scored.length,
    missingPredictionLines: rows.length - scored.length,
    fullSongComparison: confirmed.length === reference.cues.length && scored.length === confirmed.length,
    meanAbsoluteErrorSeconds: scored.length ? scored.reduce((sum, c) => sum + c.absoluteErrorSeconds, 0) / scored.length : null,
    maxAbsoluteErrorSeconds: scored.length ? Math.max(...scored.map(c => c.absoluteErrorSeconds)) : null,
    // 추정이 없는 줄도 분모에 포함해 일부 줄만으로 정확도가 부풀지 않게 한다.
    withinHalfSecondPercent: 100 * scored.filter(c => c.withinHalfSecond).length / confirmed.length,
    rows,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) throw new Error("사용법: node scripts/compare-lyric-timing.mjs <자동원본.json> <수동확정본.json>");
    const inputs = await Promise.all(process.argv.slice(2).map(async file => JSON.parse(await readFile(file, "utf8"))));
    const result = compareLyricTiming(...inputs);
    console.log(JSON.stringify({ 안내: result.fullSongComparison ? "전체 가사 수동 확정본과 비교했습니다." : "일부 줄 비교입니다. 전체 곡의 정확도로 해석하지 마세요.", 결과: result }, null, 2));
  } catch (error) { console.error(`비교하지 못했습니다: ${error.message}`); process.exitCode = 1; }
}
