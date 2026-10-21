// Narrow Naver adapter. Final-button and published-URL checks follow the
// naver-blog-agent editor's verified pattern; this is not a shared-module copy.
async function seoAutoPublishPage(command, args = {}) {
  const visible = el => Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
  const text = value => String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const read = el => {
    if (!el) return "";
    const copy = el.cloneNode(true);
    copy.querySelectorAll(".se-placeholder,.se-placeholder-text").forEach(item => item.remove());
    return text(copy.textContent);
  };
  const title = document.querySelector(".se-documentTitle .se-title-text, .se-title-text");
  const paragraphs = [...document.querySelectorAll(".se-text-paragraph")].filter(el => !el.closest(".se-documentTitle,.se-image,.se-caption,.se-source"));
  const images = [...document.querySelectorAll(".se-component.se-image,.se-component-image")];
  const here = new URL(location.href);
  const targetBlog = here.hostname === "blog.naver.com" && here.pathname.split("/")[1] === args.blogId;
  const editing = Boolean(document.querySelector(".se-documentTitle [contenteditable='true'],.se-title-text[contenteditable='true']"));
  if (command === "published") {
    const direct = targetBlog && /^\d{6,20}$/.test(here.pathname.split("/")[2] || "");
    const legacy = here.hostname === "blog.naver.com" && here.pathname === "/PostView.naver" && here.searchParams.get("blogId") === args.blogId && /^\d{6,20}$/.test(here.searchParams.get("logNo") || "");
    const displayedTitle = title || document.querySelector(".se-title-text,.pcol1 .htitle,.htitle");
    return { complete: !editing && (direct || legacy) && read(displayedTitle) === text(args.title), url: location.href };
  }
  if (!targetBlog || !editing) return { ok: false, reason: "대상 블로그의 새 글쓰기 편집기가 아닙니다." };
  const body = text(paragraphs.map(read).join(" "));
  const titleText = read(title);
  if (command === "empty") return { ok: !titleText && !body && images.length === 0, reason: "새 빈 편집기인지 확인해 주세요." };
  if (command === "verify") return {
    ok: titleText === text(args.title) && body === text(args.body) && images.length === args.imageCount,
    titleMatched: titleText === text(args.title), bodyMatched: body === text(args.body), imageCount: images.length,
  };
  const exact = name => [...document.querySelectorAll("label,button,[role='radio']")].find(el => visible(el) && text(el.textContent) === name);
  const selected = label => {
    const input = label?.querySelector("input") || document.getElementById(label?.htmlFor || "");
    return Boolean(input?.checked || label?.getAttribute("aria-checked") === "true");
  };
  const visibilityName = args.visibility === "public" ? "전체공개" : args.visibility === "private" ? "비공개" : "";
  if (!visibilityName) return { ok: false, reason: "공개 범위를 지정해 주세요." };
  if (command === "settings") {
    const label = exact(visibilityName);
    if (!label) return { ok: false, reason: "공개 범위 설정을 찾지 못했습니다." };
    label.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    const immediate = exact("현재") || exact("즉시 발행");
    if (immediate) immediate.click();
    if (!selected(label)) return { ok: false, reason: "선택한 공개 범위를 확인하지 못했습니다." };
    const reserve = exact("예약");
    if (reserve && selected(reserve)) return { ok: false, reason: "예약 설정이 남아 있어 즉시 자동 발행하지 않습니다." };
    return { ok: true };
  }
  if (command === "final") {
    // Only a final action inside this editor's open publish settings is valid.
    if (typeof args.body !== "string" || !Number.isInteger(args.imageCount)
      || titleText !== text(args.title) || body !== text(args.body) || images.length !== args.imageCount) {
      return { ok: false, reason: "발행 설정 중 제목·본문·사진이 바뀌었습니다. 최종 발행하지 않습니다." };
    }
    const label = exact(visibilityName);
    const reserve = exact("예약");
    const buttons = [...document.querySelectorAll('button[data-testid="seOnePublishBtn"],button[data-click-area="tpb*i.publish"]')].filter(visible);
    if (!label || !selected(label) || (reserve && selected(reserve)) || buttons.length !== 1 || buttons[0].disabled) return { ok: false, reason: "최종 발행 설정/버튼을 하나로 확인하지 못했습니다." };
    if (!args.runId || globalThis.__seoFinalPublishRun) return { ok: false, reason: "이미 발행을 시도한 편집기입니다. 결과를 먼저 확인하세요." };
    globalThis.__seoFinalPublishRun = args.runId;
    buttons[0].click();
    return { ok: true, clicked: true };
  }
  return { ok: false };
}
