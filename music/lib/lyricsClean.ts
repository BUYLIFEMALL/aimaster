// 2026-11-13(v1.51 뒤 미배포): AI가 돌려준 가사에서 Suno에 들어가면 안 되는 마크다운 표시를 걷어 낸다.
// gpt-4o-mini가 「**[Verse 1]**  」처럼 굵은 글씨 기호와 줄 끝 공백을 붙여 보내는 일이 실제로 있었다(기획 상세 가사 생성 검수).
// 순수 함수(시험 tests/lyricsClean.test.mjs).
export function cleanLyrics(raw: string): string {
  const lines = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => !/^\s*```/.test(l)) // 코드 울타리
    .map((l) =>
      l
        .replace(/\*\*|__/g, "") // 굵은 글씨
        .replace(/^\s{0,3}#{1,6}\s+/, "") // 제목 기호
        .replace(/\s+$/, ""),
    );
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
