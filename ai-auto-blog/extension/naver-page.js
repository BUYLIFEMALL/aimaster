"use strict";

// 네이버 스마트에디터 ONE 화면 "안"에서만 실행되는 명령 함수(2026-10-10, v1.41).
// chrome.scripting.executeScript({ func })로 한 프레임에 주입되며, 페이지 안에서 따로 실행되므로 바깥 함수를 쓸 수 없다 —
// 필요한 도우미는 이 함수 안에 모두 들어 있다. 이 함수는 입력(typing)을 하지 않는다: 글자 입력은 adapter가 CDP로 한다.
// 읽기 명령(inspect·snapshot·…)은 모든 프레임에서 돌려 대상 프레임을 고르고, 바꾸는 명령(focus·이미지·붙여넣기·설정)은 고른 프레임 한 곳에서만 돌린다
// (모든 프레임에서 바꾸는 명령을 돌리면 같은 동작이 여러 번 실행된다 — v1.27 추천 링크 4번 입력 사고).
// 셀렉터는 naver-blog-agent(v1.60~)와 기존 BLOG 확장이 실제 네이버 화면에서 확인한 것만 쓴다.
async function blogEditorCommand(command, args = {}) {
  const build = "20261010.1";
  let step = "start";
  try {
    const visible = (el) => Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const normalize = (value) => String(value ?? "").replace(/[\s​﻿ ]/g, "");
    const readText = (el) => {
      if (!el) return "";
      if (el.matches("input,textarea")) return el.value;
      const clone = el.cloneNode(true);
      clone.querySelectorAll(".se-placeholder,.se-placeholder-text").forEach((node) => node.remove());
      return clone.textContent.replace(/[​﻿]/g, "");
    };
    const waitFor = async (predicate, tries = 100) => {
      let stable = 0;
      for (let n = 0; n < tries; n += 1) {
        stable = predicate() ? stable + 1 : 0;
        if (stable >= 2) return true;
        await wait(50);
      }
      return false;
    };
    const find = (selector) => [...document.querySelectorAll(selector)].find(visible);
    const titleElement = () => find(".se-title-text, .se-documentTitle .se-text-paragraph");
    const isTitleOwned = (el) => Boolean(el.closest(".se-title, .se-documentTitle, .se-title-text"));
    // 본문 편집 문단 — 이미지 설명(caption)·제목 칸은 제외
    const bodyParagraphs = () => [...document.querySelectorAll(".se-section-text .se-text-paragraph, .se-text-paragraph")]
      .filter((el, index, list) => list.indexOf(el) === index && !isTitleOwned(el) && !el.closest(".se-caption, .se-source, .se-image, .se-component-image, .se-section-image, .se-module-image, .se-quotation, .se-oglink") && visible(el));
    const components = () => [...document.querySelectorAll(".se-component")].filter((el) => !el.closest(".se-documentTitle") && !el.matches(".se-documentTitle"));
    // 입력을 막는 "진짜" 팝업만 찾는다: 제목(.se-popup-title)이나 안내 문구(.se-popup-alert-text)가 있는 알림 창.
    // 이미지를 올리면 네이버가 오른쪽에 여는 "라이브러리" 패널·접근성 대화상자(role=dialog)는 입력을 막지 않으므로 팝업으로 보지 않는다
    // (v1.44에서 이 패널을 팝업으로 오인해 이미지 뒤 본문 입력이 중단됨 — 주인님 실제 화면에서 확인).
    const blockingPopup = () => [...document.querySelectorAll(".se-popup-container")].find((el) => visible(el) && el.querySelector(".se-popup-title, .se-popup-alert-text"));
    const popupLabel = (el) => String(el.querySelector(".se-popup-title")?.textContent || el.querySelector(".se-popup-alert-text")?.textContent || el.className).replace(/\s+/g, " ").trim().slice(0, 60);
    const imageComponents = () => [...document.querySelectorAll(".se-component.se-image, .se-component[data-comp-type='image']")];

    // ---- 읽기 ----
    if (command === "snapshot") {
      const blocks = [];
      for (const el of components()) {
        if (el.matches(".se-text")) {
          const text = [...el.querySelectorAll(".se-text-paragraph")].map(readText).join("\n");
          // 링크가 실제로 걸렸는지 엔진이 편집기 문서에서 직접 확인할 수 있게 문단 안의 링크 주소를 함께 돌려준다.
          blocks.push({ type: "paragraph", text, links: [...el.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") || "") });
        } else if (el.matches(".se-image") || el.matches("[data-comp-type='image']")) {
          blocks.push({ type: "image", text: "" });
        } else if (el.matches(".se-oglink")) {
          blocks.push({ type: "linkPreview", text: readText(el) });
        } else {
          blocks.push({ type: "other", text: readText(el).slice(0, 80), className: String(el.className).slice(0, 80) });
        }
      }
      return { ok: true, title: readText(titleElement()).trim(), blocks };
    }

    if (command === "inspect") {
      const url = new URL(location.href);
      const identity = url.searchParams.get("blogId");
      if (args.blogId && identity && identity.toLowerCase() !== String(args.blogId).toLowerCase()) {
        return { status: "account_mismatch", reason: "다른 블로그의 편집기가 열려 있습니다. 해당 계정으로 로그인해 주세요." };
      }
      const title = titleElement();
      const bodyText = document.body?.innerText || "";
      const securityText = title ? [...document.querySelectorAll("[role='dialog'],.se-popup")].filter(visible).map((el) => el.innerText).join(" ") : bodyText;
      if (/보호조치|자동입력 방지|보안 확인|본인 확인/.test(securityText) || find("input[name*='captcha'], #captcha")) {
        return { status: "security_check", reason: "Chrome에서 네이버의 추가 인증을 완료해 주세요. 완료되면 자동으로 이어집니다." };
      }
      if (location.hostname === "nid.naver.com") return { status: "expired", reason: "열린 Chrome에서 네이버에 로그인하세요. 완료되면 자동으로 이어집니다." };
      if (!title && /권한이 없|접근이 제한|잘못된 접근|본인의 블로그/.test(bodyText)) return { status: "account_mismatch", reason: "이 블로그의 계정으로 로그인해 주세요." };
      const paragraphs = bodyParagraphs();
      const insertionReady = Boolean(find("button.se-canvas-bottom-button"));
      const comps = components().filter(visible);
      const hasText = comps.some((el) => el.matches(".se-text") && normalize(readText(el)));
      const hasOther = comps.some((el) => !el.matches(".se-text"));
      if (title && (paragraphs.length || insertionReady)) {
        return {
          status: "valid",
          build,
          hasContent: Boolean(normalize(readText(title)) || hasText || hasOther),
          dialogOpen: Boolean(blockingPopup()),
          reason: `글쓰기 화면 확인 · ${build}`,
        };
      }
      return { status: "unknown", reason: `편집기를 확인할 수 없습니다. (제목 ${title ? "있음" : "없음"}, 본문 ${paragraphs.length ? "있음" : "없음"})`, diagnostics: { url: location.origin + location.pathname, ready: document.readyState, components: document.querySelectorAll(".se-component").length } };
    }

    if (command === "dismissResume") {
      // "작성 중인 글이 있습니다" 창(임시 저장 복원) — 이 창의 '취소'만 누른다(저장된 임시글은 지워지지 않는다).
      for (const dialog of [...document.querySelectorAll(".se-popup-container")].filter(visible)) {
        const heading = dialog.querySelector(".se-popup-title")?.textContent.trim();
        const message = dialog.querySelector(".se-popup-alert-text")?.textContent || "";
        if (heading !== "작성 중인 글이 있습니다." || !message.includes("이어서 작성하시겠습니까?")) continue;
        const cancel = dialog.querySelector("button.se-popup-button-cancel");
        if (!visible(cancel) || cancel.textContent.trim() !== "취소") return { ok: false, error: "임시글 이어쓰기 창의 취소 버튼을 확인하지 못했습니다. Chrome에서 취소해 주세요." };
        cancel.click();
        return { ok: true, dismissed: true };
      }
      return { ok: true, dismissed: false };
    }

    // 지금 이 문서 자신에 커서가 있는 편집 프레임인지(붙여넣기 대상 프레임을 고르는 읽기 조사)
    if (command === "focusProbe") {
      const active = document.activeElement;
      return { editable: Boolean(active && active.isContentEditable && active.tagName !== "IFRAME"), focused: document.hasFocus() };
    }

    if (command === "imageUiProbe") {
      const exact = [...document.querySelectorAll("button.se-image-toolbar-button, button.se-insert-menu-button-image")];
      return { hasButton: exact.some(visible) || Boolean(find("button[data-name='image'], button[data-name='photo']")), hasInput: document.querySelectorAll("input[type='file']").length > 0 };
    }

    if (command === "settingsProbe") {
      const input = document.querySelector("#tag-input");
      return { ready: Boolean(input && visible(input)), hasPublishOpen: [...document.querySelectorAll("button, [role='button']")].filter((el) => visible(el) && (el.textContent || "").replace(/\s+/g, " ").trim() === "발행" && !el.closest("[role='dialog'], [aria-modal='true']") && el.getAttribute("data-testid") !== "seOnePublishBtn").length };
    }

    // ---- 바꾸기: 한 프레임에서만 실행 ----
    // 제목/본문 입력 위치로 이동. 마우스를 올리고 잠깐 기다린 뒤 클릭(봇 탐지 회피 §20 규칙 2).
    if (command === "focus") {
      const popup = blockingPopup();
      if (popup) return { ok: false, reason: `편집기 팝업이 열려 있습니다(${popupLabel(popup)}). 팝업을 닫은 뒤 다시 시도하세요.` };
      const isTitle = args.kind === "title";
      let container;
      if (isTitle) container = document.querySelector(".se-title-text");
      else {
        const bodyCandidates = [...document.querySelectorAll(".se-text-paragraph")].filter((el) => !isTitleOwned(el) && !el.closest(".se-image, .se-component-image, .se-section-image, .se-module-image, .se-component-content-fit, .se-caption"));
        // 마지막 이미지 뒤의 문단만 후보로 삼는다(이미지 설명칸에 입력되지 않게).
        const lastImage = [...document.querySelectorAll(".se-component.se-image, .se-section-image")].at(-1);
        const afterImage = lastImage ? bodyCandidates.filter((el) => Boolean(lastImage.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) : bodyCandidates;
        const pool = afterImage.length ? afterImage : bodyCandidates;
        // **항상 문서의 맨 끝 문단**에 커서를 둔다. 예전에는 "처음 만나는 빈 문단"을 골랐는데, 본문의 문단 사이 빈 줄(\n\n)도 빈 문단이라
        // 링크·다음 글이 이미 입력된 글 한가운데에 들어갔다(v1.45 실제 시험: 추천 링크가 본문 중간에 붙음). 이미지 뒤 새 빈 문단은 맨 끝이므로 그대로 선택된다.
        container = pool.at(-1);
        // 마지막 문단에 글이 이미 있으면 클릭으로 커서를 옮기지 않는다: 여러 줄 문단은 클릭한 줄·위치에 커서가 생겨 글 중간에 입력된다.
        // 입력 위치를 새로 잡는 때는 비어 있는 새 문단(제목 직후·이미지 직후)뿐이어야 한다.
        if (container && (container.innerText || container.textContent || "").replace(/[\s\u200b\ufeff]/g, "")) {
          return { ok: false, reason: "마지막 본문 문단에 글이 이미 있어 입력 위치를 새로 잡지 않았습니다(글 중간에 입력될 수 있습니다)." };
        }
      }
      if (!container) return { ok: false, reason: isTitle ? "제목 입력 위치를 찾지 못했습니다." : "본문 입력 위치를 찾지 못했습니다." };
      container.scrollIntoView({ block: "center", inline: "nearest" });
      await wait(between(120, 260));
      const rect = container.getBoundingClientRect();
      const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + Math.min(Math.max(rect.width - 4, 1), between(8, 40)), clientY: rect.top + rect.height / 2 };
      container.dispatchEvent(new MouseEvent("mouseover", point));
      container.dispatchEvent(new MouseEvent("mousemove", point));
      await wait(between(90, 240));
      container.dispatchEvent(new MouseEvent("mousedown", point));
      container.dispatchEvent(new MouseEvent("mouseup", point));
      container.dispatchEvent(new MouseEvent("click", point));
      container.focus();
      const findEditable = (el) => (el?.isContentEditable ? el : el?.querySelector('[contenteditable="true"]') || el?.closest('[contenteditable="true"]'));
      let activeElement = document.activeElement;
      for (let depth = 0; activeElement && activeElement.tagName === "IFRAME" && depth < 5; depth += 1) {
        try { activeElement = activeElement.contentDocument?.activeElement || activeElement.contentDocument?.body; } catch { break; }
      }
      const editable = findEditable(container) || (activeElement?.isContentEditable ? activeElement : null);
      if (!editable) return { ok: false, reason: "입력 가능한 편집 영역을 찾지 못했습니다." };
      editable.focus();
      const range = editable.ownerDocument.createRange();
      range.selectNodeContents(container.isContentEditable ? editable : container);
      range.collapse(false);
      const selection = editable.ownerDocument.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return { ok: true };
    }

    // 이미지 버튼 클릭(파일 선택 창은 adapter가 CDP로 가로챈다)
    if (command === "clickImageButton") {
      const exactButtons = [...document.querySelectorAll("button.se-image-toolbar-button, button.se-insert-menu-button-image")];
      const candidates = [...exactButtons, ...[...document.querySelectorAll("button, [role='button'], a, [class*='image'], [class*='photo']")].filter((el) => !exactButtons.includes(el))];
      const imageButton = candidates.find((el) => {
        if (el.matches("img, input, [aria-hidden='true']")) return false;
        const label = `${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""} ${el.className || ""} ${el.textContent || ""}`;
        return /사진|이미지|image|photo/i.test(label);
      });
      if (!imageButton) return { clicked: false };
      const rect = imageButton.getBoundingClientRect();
      const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      imageButton.dispatchEvent(new MouseEvent("mouseover", point));
      imageButton.dispatchEvent(new MouseEvent("mousemove", point));
      await wait(between(120, 320));
      imageButton.dispatchEvent(new MouseEvent("mousedown", point));
      imageButton.dispatchEvent(new MouseEvent("mouseup", point));
      imageButton.click();
      return { clicked: true };
    }

    if (command === "setImageFile") {
      const { header, encoded, name } = args;
      const mimeType = String(header).slice(5, String(header).indexOf(";")) || "image/png";
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      const inputs = [...document.querySelectorAll('input[type="file"]')];
      if (!inputs.length) return { ok: false, reason: "file input not found" };
      const input = inputs[inputs.length - 1];
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], name, { type: mimeType }));
      input.files = transfer.files;
      if (input.files.length !== 1) return { ok: false, reason: "file input assignment produced no file" };
      input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return { ok: true };
    }

    // 링크가 걸린 HTML을 사람이 붙여넣듯 붙여넣기 이벤트로 넣는다(커서가 있는 프레임 한 곳에서 한 번만 실행됨)
    if (command === "pasteLink") {
      const editable = document.activeElement;
      if (!editable || !editable.isContentEditable) return { linked: false, inserted: false, reason: "no active editable" };
      const href = String(args.url);
      const label = String(args.text);
      const linkCount = () => [...document.querySelectorAll("a[href]")].filter((a) => (a.getAttribute("href") || "").startsWith(href)).length;
      const flat = (value) => String(value || "").replace(/\s+/g, " ");
      const labelCount = () => flat(document.body?.innerText).split(flat(label)).length - 1;
      const linksBefore = linkCount();
      const labelsBefore = labelCount();
      const escape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const transfer = new DataTransfer();
      transfer.setData("text/html", `<a href="${escape(href)}">${escape(label)}</a>`);
      transfer.setData("text/plain", `${label} ${href}`);
      editable.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }));
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await wait(250);
        if (linkCount() > linksBefore) break;
      }
      return { linked: linkCount() > linksBefore, inserted: labelCount() > labelsBefore };
    }

    // 이미지 AI 활용 표시: 이미지를 눌러 나타나는 스위치를 켠다(네이버 블로그 에이전트 v1.60에서 실제 화면 확인).
    if (command === "imageAi") {
      const images = imageComponents();
      const failed = [];
      for (let i = 0; i < images.length; i += 1) {
        const image = images[i];
        const id = image.id;
        const current = () => (id ? document.getElementById(id) : image);
        image.scrollIntoView({ block: "center" });
        (image.querySelector("img") || image).click();
        if (!(await waitFor(() => current()?.querySelector(".se-set-ai-mark-button-toggle")))) { failed.push(i + 1); continue; }
        const toggle = current().querySelector(".se-set-ai-mark-button-toggle");
        if (!toggle.classList.contains("se-is-selected")) toggle.click();
        if (!(await waitFor(() => current()?.querySelector(".se-set-ai-mark-button-toggle")?.classList.contains("se-is-selected")))) failed.push(i + 1);
      }
      return failed.length ? { ok: false, error: `AI 활용 표시를 켜지 못한 이미지: ${failed.join(", ")}번` } : { ok: true, count: images.length };
    }

    // ---- 발행 설정(첫 '발행' 버튼으로 설정창을 연 뒤) ----
    if (command === "openPublishSettings") {
      // 설정창을 여는 첫 발행 버튼만 누른다. 설정창 안의 최종 발행 버튼(seOnePublishBtn)은 찾지도 누르지도 않는다.
      const buttons = [...document.querySelectorAll("button, [role='button']")].filter((el) => visible(el)
        && (el.textContent || "").replace(/\s+/g, " ").trim() === "발행"
        && !el.closest("[role='dialog'], [aria-modal='true']")
        && el.getAttribute("data-testid") !== "seOnePublishBtn"
        && el.getAttribute("data-click-area") !== "tpb*i.publish");
      if (buttons.length !== 1) return { ok: false, count: buttons.length };
      const rect = buttons[0].getBoundingClientRect();
      const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      buttons[0].dispatchEvent(new MouseEvent("mouseover", point));
      buttons[0].dispatchEvent(new MouseEvent("mousemove", point));
      await wait(between(180, 420));
      buttons[0].click();
      return { ok: true };
    }

    if (command === "tagFocus") {
      const input = find("#tag-input, input[placeholder*='태그'], input[class*='tag_input']");
      if (!input) return { ok: false, reason: "태그 입력란을 찾지 못했습니다." };
      if (input.value.trim()) return { ok: false, reason: "태그 입력란에 미완성 값이 있습니다. 확인 후 다시 실행해주세요." };
      const rect = input.getBoundingClientRect();
      const point = { bubbles: true, cancelable: true, view: window, clientX: rect.left + 12, clientY: rect.top + rect.height / 2 };
      input.dispatchEvent(new MouseEvent("mouseover", point));
      await wait(80 + Math.floor(Math.random() * 160));
      input.dispatchEvent(new MouseEvent("mousedown", point));
      input.dispatchEvent(new MouseEvent("mouseup", point));
      input.focus();
      return { ok: document.activeElement === input };
    }

    if (command === "tagState") {
      const tagKey = (value) => String(value || "").normalize("NFC").replace(/[#\s​﻿]/gu, "");
      const input = find("#tag-input, input[placeholder*='태그'], input[class*='tag_input']");
      const area = input?.closest("[class*='tag_textarea']");
      const registered = area
        ? [...area.children].filter((el) => !el.matches("input") && !el.contains(input)).map((el) => {
          const clone = el.cloneNode(true);
          clone.querySelectorAll("button,input,.blind,[aria-hidden='true']").forEach((node) => node.remove());
          return tagKey(clone.textContent);
        }).filter(Boolean)
        : null;
      return { ok: true, inputPresent: Boolean(input), inputValue: input?.value || "", registered };
    }

    if (command === "categorySelect") {
      const categoryKey = (value) => String(value || "").normalize("NFC").replace(/^[●◆★▶\s]+/u, "").replace(/[\s​﻿]+/gu, "");
      const button = () => find("button[data-click-area='tpb*i.category'], button[aria-label='카테고리 목록 버튼']");
      const info = (element) => {
        const item = element?.matches("[data-testid^='categoryItemText_']") ? element : element?.querySelector("[data-testid^='categoryItemText_']");
        const id = item?.getAttribute("data-testid")?.match(/^categoryItemText_(\d+)$/)?.[1];
        if (!id) return null;
        const clone = item.cloneNode(true);
        clone.querySelectorAll(".blind,[aria-hidden='true']").forEach((node) => node.remove());
        const name = clone.textContent.normalize("NFC").replace(/[​﻿]/g, "").trim();
        return name ? { id, name } : null;
      };
      const options = () => [...(button()?.parentElement?.querySelector("[role='menu']")?.querySelectorAll("label[for]") || [])].filter((label) => info(label) && !document.getElementById(label.htmlFor)?.disabled);
      const trigger = button();
      if (!trigger) return { ok: false, reason: "발행 설정의 카테고리 선택을 찾지 못했습니다." };
      if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
      if (!(await waitFor(() => options().length > 0))) return { ok: false, reason: "네이버 카테고리 목록을 읽지 못했습니다." };
      const wanted = categoryKey(args.name);
      const labels = options();
      const exact = labels.filter((label) => categoryKey(info(label).name) === wanted);
      const candidates = exact.length ? exact : labels.filter((label) => categoryKey(info(label).name).includes(wanted));
      if (candidates.length !== 1) {
        const names = labels.map((label) => info(label).name).slice(0, 20);
        trigger.click();
        return { ok: false, reason: candidates.length ? "같은 이름의 카테고리가 여러 개 있습니다. 전체 이름을 입력해주세요." : `등록한 카테고리를 찾지 못했습니다: ${args.name}`, available: names };
      }
      const expected = info(candidates[0]);
      candidates[0].scrollIntoView({ block: "nearest" });
      candidates[0].click();
      const done = await waitFor(() => {
        const now = info(button());
        return button()?.getAttribute("aria-expanded") === "false" && now?.id === expected.id;
      });
      return done ? { ok: true, id: expected.id, name: expected.name } : { ok: false, reason: "카테고리 선택 결과를 확인하지 못했습니다." };
    }

    return { ok: false, error: `지원하지 않는 편집 동작입니다: ${command}` };
  } catch (error) {
    // 주입 함수의 예외는 executeScript에서 undefined로 보일 수 있으므로 항상 직렬화해 돌려준다.
    return { ok: false, status: "unknown", error: `${command} [${build}/${step}]: ${String(error?.message || error)}`, reason: `편집기 스크립트 오류: ${String(error?.message || error)}` };
  }
}
if (typeof module !== "undefined" && module.exports) module.exports = { blogEditorCommand };
