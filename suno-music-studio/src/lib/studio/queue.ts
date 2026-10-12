import type { Track } from "./config";
/** Only missing lyrics, sequential requests. No retry or implicit billing. */
export async function runLyricQueue(
  tracks: Track[],
  signal: AbortSignal,
  generate: (
    track: Track,
    index: number,
    total: number,
  ) => Promise<string | null>,
  apply: (track: Track, lyrics: string) => void,
) {
  const pending = tracks.filter((t) => !t.lyrics.trim());
  for (let i = 0; i < pending.length; i++) {
    if (signal.aborted) return;
    const lyrics = await generate(pending[i], i, pending.length);
    if (signal.aborted || lyrics === null) return;
    apply(pending[i], lyrics);
  }
}
