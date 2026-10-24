// E-5(2026-10-24): 블로그 핵심 지침의 세 가지 포스팅 방식 ⓐ 발행 전까지 ⓑ 실제 포스팅 ⓒ 예약 포스팅.
// 저장 값은 그대로(executionMode × 예약 여부) — 서버·확장·DB는 바꾸지 않고 화면에서 하나로 고르게 한다. 외부 호출 없음.

export type PublishChoice = "prepare" | "publish" | "schedule";
type Mode = "prepare" | "publish";

export const PUBLISH_CHOICES: { value: PublishChoice; title: string; desc: string }[] = [
  { value: "prepare", title: "발행 전까지", desc: "확장이 본문·이미지·설정까지 입력하고 멈춥니다. 발행 버튼은 직접 누릅니다." },
  { value: "publish", title: "실제 포스팅", desc: "확장이 입력 후 발행 버튼까지 눌러 바로 올립니다." },
  { value: "schedule", title: "예약 포스팅", desc: "확장이 입력 후 정한 날짜·시각으로 예약 발행합니다." },
];

/** 저장 값 → 화면 선택. 예전 「준비까지 + 예약 시각」 조합은 ⓐ(예약 시각도 미리 넣기)로 본다. */
export function choiceOf(mode: Mode, reserved: boolean): PublishChoice {
  if (mode === "prepare") return "prepare";
  return reserved ? "schedule" : "publish";
}

/** 화면 선택 → 저장 값. ⓐ 안에서는 「예약 시각도 미리 넣기」를 그대로 두고, 다른 방식에서 ⓐ로 넘어오면 끈다. */
export function applyChoice(choice: PublishChoice, reserved: boolean, from: PublishChoice = choice): { executionMode: Mode; reserved: boolean } {
  if (choice === "prepare") return { executionMode: "prepare", reserved: from === "prepare" ? reserved : false };
  return { executionMode: "publish", reserved: choice === "schedule" };
}

function when(at: string | null | undefined): string {
  const d = at ? new Date(at) : null;
  if (!d || !Number.isFinite(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 전송 버튼 옆에 보여 줄 한 줄. reserveAt은 ISO 또는 datetime-local 값. */
export function choiceSummary(mode: Mode, reserved: boolean, reserveAt?: string | null): string {
  const t = reserved ? when(reserveAt) : "";
  if (mode === "prepare") return reserved && t ? `발행 전까지 입력하고 예약 시각(${t})도 넣어 둡니다. 발행 버튼은 직접 누릅니다.` : "발행 전까지 입력합니다. 발행 버튼은 직접 누릅니다.";
  if (reserved) return t ? `${t}에 예약 발행합니다.` : "예약 발행합니다(시각을 저장해 주세요).";
  return "입력 후 바로 발행합니다.";
}
