import { TAROT_DECK, type Orientation } from "./cards";

export type SpreadPosition = "past" | "present" | "future";

export const SPREAD_POSITIONS: SpreadPosition[] = ["past", "present", "future"];

export const SPREAD_POSITION_LABELS: Record<SpreadPosition, string> = {
  past: "과거",
  present: "현재",
  future: "미래",
};

export interface DrawnCard {
  cardId: string;
  position: SpreadPosition;
  orientation: Orientation;
}

/**
 * 78장 중 서로 다른 3장을 뽑아 과거-현재-미래 3장 스프레드를 구성한다.
 * 결제/권한과 무관한 단순 랜덤 연출이라 암호학적 난수까지는 필요 없다 —
 * 클라이언트(브라우저)에서 그대로 실행해도 안전하다.
 */
export function drawThreeCardSpread(): DrawnCard[] {
  const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map((card, idx) => ({
    cardId: card.id,
    position: SPREAD_POSITIONS[idx],
    orientation: Math.random() < 0.5 ? "upright" : "reversed",
  }));
}

/** 결과 페이지 URL에 실을 짧은 문자열로 직렬화한다. 예: "major-00:U,minor-cups-03:R,major-21:U" */
export function serializeDraw(cards: DrawnCard[]): string {
  return cards.map((c) => `${c.cardId}:${c.orientation === "upright" ? "U" : "R"}`).join(",");
}

export function deserializeDraw(raw: string | undefined): DrawnCard[] | null {
  if (!raw) return null;
  const parts = raw.split(",").filter(Boolean);
  if (parts.length !== 3) return null;

  const result: DrawnCard[] = [];
  for (let i = 0; i < parts.length; i++) {
    const [cardId, flag] = parts[i].split(":");
    if (!cardId || (flag !== "U" && flag !== "R")) return null;
    result.push({
      cardId,
      position: SPREAD_POSITIONS[i],
      orientation: flag === "U" ? "upright" : "reversed",
    });
  }
  return result;
}
