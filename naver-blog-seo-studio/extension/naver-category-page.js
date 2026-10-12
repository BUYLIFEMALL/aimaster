"use strict";

// 네이버 스마트에디터 ONE 화면 "안"에서만 실행되는 카테고리 명령(SEO 스튜디오 v1.62).
// chrome.scripting.executeScript({ func })로 프레임에 주입되므로 바깥 함수를 쓸 수 없다 — 필요한 도우미는 모두 함수 안에 있다.
// 셀렉터는 ai-auto-blog 확장이 실제 네이버 화면에서 확인한 것(`categoryItemText_<번호>`, 카테고리 목록 버튼)을 그대로 쓴다.
// 이 함수는 마지막 "발행" 버튼(설정창 안의 최종 발행)을 찾지도 누르지도 않는다.
async function aioCategoryCommand(command, args = {}) {
  try {
    const visible = (el) => Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const find = (selector) => [...document.querySelectorAll(selector)].find(visible);
    const waitFor = async (predicate, tries = 100) => {
      let stable = 0;
      for (let n = 0; n < tries; n += 1) {
        stable = predicate() ? stable + 1 : 0;
        if (stable >= 2) return true;
        await wait(50);
      }
      return false;
    };

    // 글쓰기 화면이 준비됐는지(제목 칸과 본문 칸이 보이는 프레임)
    if (command === "inspect") {
      if (location.hostname === "nid.naver.com") return { status: "login" };
      const title = find(".se-title-text, .se-documentTitle .se-text-paragraph");
      const body = find(".se-section-text .se-text-paragraph, button.se-canvas-bottom-button");
      return { status: title && body ? "ready" : "loading" };
    }

    // "작성 중인 글이 있습니다" 창은 '취소'만 누른다(저장된 임시글은 지워지지 않는다).
    if (command === "dismissResume") {
      for (const dialog of [...document.querySelectorAll(".se-popup-container")].filter(visible)) {
        const heading = dialog.querySelector(".se-popup-title")?.textContent.trim();
        const message = dialog.querySelector(".se-popup-alert-text")?.textContent || "";
        if (heading !== "작성 중인 글이 있습니다." || !message.includes("이어서 작성하시겠습니까?")) continue;
        const cancel = dialog.querySelector("button.se-popup-button-cancel");
        if (!visible(cancel) || cancel.textContent.trim() !== "취소") return { ok: false, error: "임시글 이어쓰기 창의 취소 버튼을 확인하지 못했습니다." };
        cancel.click();
        return { ok: true, dismissed: true };
      }
      return { ok: true, dismissed: false };
    }

    // 첫 '발행' 버튼으로 발행 설정창만 연다(설정창 안의 최종 발행 버튼은 건드리지 않는다).
    if (command === "openPublishSettings") {
      const categoryButton = () => find("button[data-click-area='tpb*i.category'], button[aria-label='카테고리 목록 버튼']");
      if (categoryButton()) return { ok: true, alreadyOpen: true };
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
      await wait(250);
      buttons[0].click();
      return { ok: true };
    }

    if (command === "categories" || command === "categorySelect") {
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
      // 발행 설정창이 없는 프레임이면 다른 프레임에서 시도하도록 알린다.
      if (!(await waitFor(() => Boolean(button()), 60))) return { ok: false, notHere: true, reason: "발행 설정의 카테고리 선택을 찾지 못했습니다." };
      const trigger = button();
      if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
      if (!(await waitFor(() => options().length > 0))) return { ok: false, reason: "네이버 카테고리 목록을 읽지 못했습니다." };
      const labels = options();
      // 목록만 읽고 닫는다. 아무것도 선택하지 않는다.
      if (command === "categories") {
        const seen = new Set();
        const categories = labels.map(info).filter((item) => !seen.has(item.id) && seen.add(item.id));
        trigger.click();
        return { ok: true, categories };
      }
      // 번호(id)로 정확히 하나를 찾고, 이름이 같을 때만 선택한다(이름이 바뀌었거나 번호가 없으면 선택하지 않는다).
      const wantedId = String(args.id || "");
      const wantedName = categoryKey(args.name);
      const candidates = labels.filter((label) => info(label).id === wantedId);
      if (candidates.length !== 1) {
        const names = labels.map((label) => info(label).name).slice(0, 20);
        trigger.click();
        return { ok: false, reason: `선택한 카테고리를 네이버에서 찾지 못했습니다: ${args.name}. 웹에서 [카테고리 불러오기]를 다시 눌러 고른 뒤 보내 주세요.`, available: names };
      }
      const expected = info(candidates[0]);
      if (categoryKey(expected.name) !== wantedName) {
        trigger.click();
        return { ok: false, reason: `카테고리 이름이 바뀌었습니다(웹: ${args.name} → 네이버: ${expected.name}). 웹에서 [카테고리 불러오기]를 다시 눌러 고른 뒤 보내 주세요.` };
      }
      candidates[0].scrollIntoView({ block: "nearest" });
      candidates[0].click();
      const done = await waitFor(() => {
        const now = info(button());
        return button()?.getAttribute("aria-expanded") === "false" && now?.id === expected.id && categoryKey(now.name) === categoryKey(expected.name);
      });
      return done ? { ok: true, id: expected.id, name: expected.name } : { ok: false, reason: "카테고리 선택 결과를 확인하지 못했습니다." };
    }

    return { ok: false, error: `지원하지 않는 동작입니다: ${command}` };
  } catch (error) {
    return { ok: false, error: `${command}: ${String(error?.message || error)}` };
  }
}
if (typeof module !== "undefined" && module.exports) module.exports = { aioCategoryCommand };
