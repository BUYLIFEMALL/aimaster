// 미리보기 재생 시작 — play()가 거절되면 조용히 버리지 않고 화면 안내로 알린다(L5, MUSIC-20261119-LYRIC-L5-U3)
// 정상 중단(재생 중 일시정지·음악 파일 교체로 끊긴 AbortError)은 오류가 아니므로 알리지 않는다.

/** 재생 실패 안내를 플레이어 요소에 실어 보내는 사건 이름 — 재생 버튼 줄(Transport)이 듣고 안내를 띄운다 */
export const PLAY_FAIL_EVENT = "lvs-play-fail";

/** play() 거절 이유를 회원 안내 문장으로. 정상 중단이면 null(안내 없음) */
export function playFailText(e: unknown): string | null {
  const name = e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
  if (name === "AbortError") return null;
  if (name === "NotAllowedError") return "브라우저가 소리 자동 재생을 막았습니다. ▶ 재생 버튼을 한 번 더 눌러 주세요.";
  if (name === "NotSupportedError") return "이 브라우저가 이 음악 파일을 재생하지 못합니다. mp3나 m4a 파일로 다시 넣어 보세요.";
  return "음악 재생을 시작하지 못했습니다. ▶ 재생 버튼을 다시 눌러 주세요.";
}

type Playable = Pick<HTMLMediaElement, "play" | "dispatchEvent">;

/** 재생을 시작하고, 실패하면 PLAY_FAIL_EVENT(detail = 안내 문장)를 플레이어에 보낸다. 예외는 밖으로 던지지 않는다 */
export function tryPlay(player: Playable): Promise<void> {
  let started: Promise<void>;
  try { started = Promise.resolve(player.play()); } catch (e) { started = Promise.reject(e); }
  return started.catch((e: unknown) => {
    const text = playFailText(e);
    if (text) player.dispatchEvent(new CustomEvent<string>(PLAY_FAIL_EVENT, { detail: text }));
  });
}
