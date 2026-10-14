// 텍스트 영역 안의 글자 위치(좌표)를 구하는 도우미. 원본 앱은 호출할 때마다 숨은 div를 새로 만들고 텍스트 전체를 넣어 측정했다.
// 여기서는 같은 스타일을 복사한 거울(mirror) 요소 하나에 앞부분만 넣고 끝 표식(span)의 위치를 읽는다.

const COPY_PROPS = [
  "boxSizing", "width", "overflowX", "overflowY",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderStyle",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize", "fontSizeAdjust", "lineHeight", "fontFamily",
  "textAlign", "textTransform", "textIndent", "letterSpacing", "wordSpacing", "tabSize",
] as const;

export interface CaretCoords { top: number; left: number; height: number }

/** textarea 내용 기준 index 위치의 (top,left,height) — textarea의 border-box 왼쪽 위를 (0,0)으로 한 값, 스크롤은 반영하지 않음 */
export function getCaretCoords(textarea: HTMLTextAreaElement, index: number): CaretCoords {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const ms = mirror.style;
  for (const p of COPY_PROPS) (ms as unknown as Record<string, string>)[p] = (style as unknown as Record<string, string>)[p];
  ms.position = "absolute";
  ms.visibility = "hidden";
  ms.top = "0";
  ms.left = "-9999px";
  ms.whiteSpace = "pre-wrap";
  ms.overflowWrap = "break-word";
  ms.overflow = "hidden";
  ms.height = "auto";
  mirror.textContent = textarea.value.substring(0, index);
  const marker = document.createElement("span");
  marker.textContent = textarea.value.substring(index, index + 1) || ".";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.6;
  const coords = { top: marker.offsetTop, left: marker.offsetLeft, height: lineHeight };
  document.body.removeChild(mirror);
  return coords;
}

/** 줄바꿈이 많은 글에서 해당 위치가 보이도록 textarea를 스크롤한다 */
export function scrollToIndex(textarea: HTMLTextAreaElement, index: number): void {
  const c = getCaretCoords(textarea, index);
  const view = textarea.clientHeight;
  if (c.top < textarea.scrollTop || c.top + c.height > textarea.scrollTop + view) {
    textarea.scrollTop = Math.max(0, c.top - view / 3);
  }
}
