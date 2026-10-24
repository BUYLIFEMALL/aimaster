// Narrow Naver adapter. Final-button and published-URL checks follow the
// naver-blog-agent editor's verified pattern; this is not a shared-module copy.
async function seoAutoPublishPage(command, args = {}) {
  // 2026-10-24 예약 포스팅: 네이버 발행 설정 창에서 예약을 켜고 날짜·시·분을 넣은 뒤 반영을 확인한다.
  // naver-blog-agent/extension/editor.js의 예약 입력(실사용 중)과 같은 방법. 실패하면 오류를 던져 최종 버튼을 누르지 않는다.
  const seoSetNaverReservation = async (scheduledAt, exact, visible) => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const find = selector => [...document.querySelectorAll(selector)].find(visible);
    const setField = (el, value, name, numeric = false) => {
      if (!el) throw new Error(`${name} 입력란을 찾지 못했습니다. 요청 값: ${value}`);
      if (el.matches("select")) {
        const option = [...el.options].find(o => o.value === value || o.textContent.trim() === value || (numeric && /^\d+$/.test(o.value) && Number(o.value) === Number(value)));
        if (!option) throw new Error(`${name} 선택 값을 찾지 못했습니다. 요청: ${value}`);
        el.value = option.value;
      } else {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value);
      }
      el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const reserve = exact("예약"); if (!reserve) throw new Error("예약 설정을 찾지 못했습니다."); reserve.click(); await wait(100);
    const requested = new Date(scheduledAt).getTime();
    if (!Number.isFinite(requested)) throw new Error("예약 시각이 올바르지 않습니다.");
    const date = new Date(Math.ceil(requested / 600000) * 600000); const pad = n => String(n).padStart(2, "0");
    const field = find('input[class*="input_date"], input[type="date"]');
    const dateValue = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(field?.type === "date" ? "-" : ".");
    const sameDate = value => {
      const parts = String(value || "").match(/^\s*(\d{4})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*\.?\s*$/);
      return parts && Number(parts[1]) === date.getFullYear() && Number(parts[2]) === date.getMonth() + 1 && Number(parts[3]) === date.getDate();
    };
    if (field?.readOnly && !sameDate(field.value)) {
      field.click(); await wait(100);
      const targetMonth = date.getFullYear() * 12 + date.getMonth(); let matched = false;
      for (let n = 0; n < 25; n++) {
        const calendar = find(".ui-datepicker");
        const year = Number(calendar?.querySelector(".ui-datepicker-year")?.textContent);
        const month = parseInt(calendar?.querySelector(".ui-datepicker-month")?.textContent, 10);
        if (!calendar || !year || !month) throw new Error("예약 달력의 연월을 읽지 못했습니다.");
        const current = year * 12 + month - 1;
        if (current === targetMonth) {
          const day = [...calendar.querySelectorAll("td button")].find(button => button.textContent.trim() === String(date.getDate()) && !button.disabled && !button.closest(".ui-state-disabled"));
          if (!day) throw new Error(`예약 달력에서 선택 가능한 날짜가 아닙니다: ${dateValue}`);
          day.click(); matched = true; break;
        }
        const move = calendar.querySelector(current < targetMonth ? ".ui-datepicker-next" : ".ui-datepicker-prev");
        if (!move || move.disabled || move.classList.contains("ui-state-disabled")) throw new Error(`예약 달력에서 이동할 수 없는 날짜입니다: ${dateValue}`);
        move.click(); await wait(100);
      }
      if (!matched) throw new Error("예약 달력의 날짜 이동 범위를 초과했습니다.");
    } else if (!field?.readOnly) setField(field, dateValue, "예약 날짜");
    await wait(100);
    setField(find('select[class*="hour"], input[class*="hour"]'), pad(date.getHours()), "예약 시", true); await wait(100);
    setField(find('select[class*="minute"], input[class*="minute"]'), pad(date.getMinutes()), "예약 분", true); await wait(100);
    const actualDate = find('input[class*="input_date"], input[type="date"]')?.value || "";
    if (!sameDate(actualDate) || Number(find('select[class*="hour"], input[class*="hour"]')?.value) !== date.getHours() || Number(find('select[class*="minute"], input[class*="minute"]')?.value) !== date.getMinutes()) {
      throw new Error(`예약 시각 반영을 확인하지 못했습니다. 요청: ${dateValue} ${pad(date.getHours())}:${pad(date.getMinutes())}`);
    }
  };
  const visible = el => Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
  const text = value => String(value || "").replace(/[\u200b\u200c\u200d\ufeff]/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
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
  const editing = Boolean(document.querySelector(".se-documentTitle [contenteditable='true'],.se-title-text[contenteditable='true']")
    || (title && document.querySelector(".se-container") && document.querySelector(".se-toolbar") && /\/postwrite$/.test(here.pathname)));
  // 2026-10-24 예약 포스팅: 예약 목록에서 제목·시각이 같은 글 1건을 확인한다(naver-blog-agent editor.js `reserved`와 같은 방법).
  if (command === "reserved") {
    const url = new URL(location.href);
    if (url.hostname !== "blog.naver.com" || !(url.pathname === `/${args.blogId}/postwrite` || url.searchParams.get("blogId") === args.blogId)) return { complete: false, reason: "예약 확인 대상 블로그가 아닙니다." };
    const target = new Date(Math.ceil(new Date(args.scheduledAt).getTime() / 600000) * 600000);
    if (!Number.isFinite(target.getTime()) || !text(args.title)) return { complete: false, reason: "예약 확인 제목 또는 시각이 없습니다." };
    const rows = [...document.querySelectorAll('button[data-click-area="tpb*t.schedulelist"]')].filter(visible);
    if (!rows.length) {
      const open = [...document.querySelectorAll('button[data-click-area="tpb*t.schedule"]')].find(visible);
      if (open && ![...document.querySelectorAll("strong")].some(el => visible(el) && el.textContent.trim() === "예약 발행 글")) open.click();
      return { complete: false, reason: "예약 목록을 불러오는 중입니다." };
    }
    const matches = rows.filter(row => {
      if (text(row.querySelector("strong")?.textContent) !== text(args.title)) return false;
      const parts = (row.querySelector('span[class*="date"]')?.textContent || "").match(/^\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s+(\d{1,2}):(\d{2})\s*$/);
      return parts && [target.getFullYear(), target.getMonth() + 1, target.getDate(), target.getHours(), target.getMinutes()].every((value, index) => value === Number(parts[index + 1]));
    });
    return matches.length === 1
      ? { complete: true, scheduledAt: target.toISOString() }
      : { complete: false, reason: matches.length > 1 ? "같은 제목과 시각의 예약글이 여러 개입니다." : "제목과 예약 시각이 일치하는 글을 찾지 못했습니다." };
  }
  if (command === "published") {
    const direct = targetBlog && /^\d{6,20}$/.test(here.pathname.split("/")[2] || "");
    const legacy = here.hostname === "blog.naver.com" && here.pathname === "/PostView.naver" && here.searchParams.get("blogId") === args.blogId && /^\d{6,20}$/.test(here.searchParams.get("logNo") || "");
    const displayedTitle = title || document.querySelector(".se-title-text,.pcol1 .htitle,.htitle");
    return { complete: !editing && (direct || legacy) && read(displayedTitle) === text(args.title), url: location.href };
  }
  if (!targetBlog || !editing) return { ok: false, reason: "대상 블로그의 새 글쓰기 편집기가 아닙니다." };
  const body = text(paragraphs.map(read).join(" "));
  const titleText = read(title);
  if (command === "empty") {
    const restore = [...document.querySelectorAll(".se-popup,.se-popup-container,[role='dialog']")]
      .some(el => visible(el) && /이어서 작성|작성 중인 글/.test(el.textContent || ""));
    return { ok: !restore && !titleText && !body && images.length === 0, reason: restore ? "네이버의 이어서 작성 창을 확인해 주세요. 기존 원고를 복원한 상태에서는 자동 발행하지 않습니다." : "새 빈 편집기인지 확인해 주세요." };
  }
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
  const reserving = typeof args.scheduledAt === "string" && args.scheduledAt !== "";
  if (command === "settings") {
    const label = exact(visibilityName);
    if (!label) return { ok: false, reason: "공개 범위 설정을 찾지 못했습니다." };
    label.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    if (reserving) {
      try { await seoSetNaverReservation(args.scheduledAt, exact, visible); }
      catch (error) { return { ok: false, reason: String(error?.message || error) }; }
      const reserve = exact("예약");
      if (!selected(label) || !reserve || !selected(reserve)) return { ok: false, reason: "공개 범위와 예약 설정을 확인하지 못했습니다." };
      return { ok: true };
    }
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
    const reserveOk = reserving ? Boolean(reserve && selected(reserve)) : !(reserve && selected(reserve));
    if (!label || !selected(label) || !reserveOk || buttons.length !== 1 || buttons[0].disabled) return { ok: false, reason: reserving ? "예약 설정·최종 버튼을 하나로 확인하지 못했습니다." : "최종 발행 설정/버튼을 하나로 확인하지 못했습니다." };
    if (!args.runId || globalThis.__seoFinalPublishRun) return { ok: false, reason: "이미 발행을 시도한 편집기입니다. 결과를 먼저 확인하세요." };
    globalThis.__seoFinalPublishRun = args.runId;
    buttons[0].click();
    return { ok: true, clicked: true };
  }
  return { ok: false };
}
