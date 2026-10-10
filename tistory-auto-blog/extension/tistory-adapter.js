"use strict";

// 티스토리 입력기 — 크롬 API 연결부(2026-10-10, v1.59).
// 티스토리 글쓰기 탭을 열고(로그인·본인 블로그·빈 새 글 확인), 제목·본문(TinyMCE)·이미지·카테고리·태그·발행 설정을 실제로 수행한다.
// 무엇을 어떤 순서로 할지는 tistory-engine.js가 정하고, 이 파일은 engine이 요구하는 동작(adapter 인터페이스)만 제공한다.
// 아래 입력 함수들은 사이드패널(sidepanel.js v1.56)에서 그대로 옮겨 온 것이다 — 실제 티스토리 화면에서 확인된 방식(TinyMCE MAIN world 삽입,
// 이미지 붙여넣기, 신뢰된 포인터 클릭, 태그 칩 확인 등)이라 바꾸지 않았다(docs/OPERATIONS_HANDOFF.md). 바뀐 것은 화면 갱신 코드를 상태 알림(say)으로 바꾼 것뿐이다.
//  - 글자 입력: chrome.debugger CDP(Input.insertText)로 한 글자씩 70~170ms, 가끔 250~700ms 쉼(§20 봇 탐지 회피 규칙 1).
//  - 읽기 조사만 모든 프레임, 바꾸는 명령은 확인된 한 프레임(본문 iframe 또는 최상위)에서만 실행한다.
//  - 최종 저장·발행 버튼(#publish-btn)은 찾지도 누르지도 않는다(§20 규칙 4).
(function (root) {
  const Core = root.TistoryCore || (typeof require !== "undefined" ? require("./tistory-core.js") : null);
  const TYPE_MIN_MS = 70;
  const TYPE_MAX_MS = 170;
  const THINK_CHANCE = 0.04;
  const LOGIN_WAIT_MS = 5 * 60 * 1000;

  function createTistoryAdapter({ chrome, TaskError, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), random = Math.random, now = Date.now, loginWaitMs = LOGIN_WAIT_MS, probeTimeoutMs = 8000 }) {
    const state = { tabId: null, blogName: "", bodyFrame: null, say: () => {}, shouldStop: () => false };
    const say = (message) => { try { state.say(message); } catch { /* 상태 표시 실패는 입력에 영향이 없다 */ } };
    const between = (min, max) => Math.floor(random() * (max - min + 1)) + min;
    const isMissingTab = (error) => /No tab with id|Invalid tab ID|tab was closed/i.test(String(error?.message || error));
    const closed = () => new TaskError("TAB_CLOSED", "티스토리 글쓰기 탭이 닫혔거나 이동했습니다. 입력된 내용은 티스토리 임시저장에 남아 있을 수 있습니다. 글쓰기 화면을 다시 연 뒤 BLOG에서 다시 보내주세요.");

    async function getTab() {
      if (state.tabId == null) throw closed();
      try { return await chrome.tabs.get(state.tabId); } catch (error) { if (isMissingTab(error)) throw closed(); throw error; }
    }

    async function focusWindow(tab) {
      try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (error) { if (/No window with id/i.test(error?.message || "")) throw closed(); throw error; }
      await chrome.tabs.update(tab.id, { active: true });
    }

    const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("응답 없음")), ms);
      promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
    });

    // 편집기 상태 조사(읽기 전용, 모든 프레임): 본문 iframe·제목칸·태그 칩·발행 설정창 여부
    async function probeEditor(tabId) {
      const results = await withTimeout(chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => {
          const visible = (node) => Boolean(node?.getClientRects().length);
          const body = document.querySelector("body#tinymce[contenteditable='true']");
          const title = document.querySelector("#post-title-inp");
          return {
            hasBody: Boolean(body), bodyText: body ? body.innerText || "" : "", bodyImages: body ? body.querySelectorAll(":scope > figure > img").length : 0,
            hasTitle: Boolean(title && visible(title)), titleValue: title ? title.value : "", tagChips: document.querySelectorAll(".editor_tag > .txt_tag").length,
            layerOpen: [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")].some(visible),
          };
        },
      }), probeTimeoutMs);
      const frames = results.filter((entry) => entry.result).map((entry) => ({ frameId: entry.frameId, ...entry.result }));
      const bodies = frames.filter((frame) => frame.hasBody);
      const top = frames.find((frame) => frame.hasTitle) || null;
      return { frames, bodies, top };
    }

    // ---- CDP ----
    async function withDebugger(tabId, task) {
      try { await chrome.debugger.attach({ tabId }, "1.3"); }
      catch (error) {
        if (!/already attached/i.test(error?.message || "")) throw error;
        // 이 확장이 이전에 붙인 디버거가 남아 있으면 떼고 다시 붙인다. 다른 도구(DevTools)가 붙인 경우는 같은 오류가 다시 나서 그대로 안내한다.
        try { await chrome.debugger.detach({ tabId }); } catch { /* ignore */ }
        await chrome.debugger.attach({ tabId }, "1.3");
      }
      try { return await task(); }
      finally { try { await chrome.debugger.detach({ tabId }); } catch { /* page may navigate */ } }
    }

    async function humanType(tabId, text, { onProgress, shouldStop } = {}) {
      const value = String(text || "").replace(/\r\n/g, "\n");
      let pending = 0;
      for (let index = 0; index < value.length; index += 1) {
        if (shouldStop && shouldStop()) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다. 티스토리 편집기에 입력된 내용은 그대로 남아 있습니다.");
        const character = value[index];
        if (character === "\n") {
          await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
          await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        } else await chrome.debugger.sendCommand({ tabId }, "Input.insertText", { text: character });
        pending += 1;
        if (pending >= 20) { onProgress?.(pending); pending = 0; }
        await sleep(between(TYPE_MIN_MS, TYPE_MAX_MS));
        if (random() < THINK_CHANCE) await sleep(between(250, 700));
      }
      if (pending) onProgress?.(pending);
    }

    // ===== 사이드패널에서 옮겨 온 티스토리 전용 입력 함수들(내용 변경 없음, 화면 갱신만 say로 교체) =====
    async function editorFrameId(tabId) {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: () => Boolean(document.querySelector("body#tinymce[contenteditable='true']")),
      });
      const matches = results.filter((entry) => entry.result === true);
      if (matches.length !== 1) throw new Error("본문 TinyMCE 프레임을 하나로 확인하지 못했습니다. 구조 분석을 다시 실행해 주세요.");
      return matches[0].frameId;
    }

    async function focusKnownTarget(tabId, frameId, selector) {
      const results = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [frameId] }, args: [selector],
        func: async (targetSelector) => {
          const target = document.querySelector(targetSelector);
          if (!target || !target.getClientRects().length) return false;
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const delay = 80 + Math.floor(Math.random() * 341);
          target.scrollIntoView({ block: "center", inline: "nearest" });
          const rect = target.getBoundingClientRect();
          const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + Math.min(18, Math.max(4, rect.width / 2)), clientY: rect.top + Math.max(4, rect.height / 2) };
          target.dispatchEvent(new MouseEvent("mouseover", event));
          target.dispatchEvent(new MouseEvent("mousemove", event));
          await wait(delay);
          target.dispatchEvent(new MouseEvent("mousedown", event));
          target.dispatchEvent(new MouseEvent("mouseup", event));
          target.dispatchEvent(new MouseEvent("click", event));
          target.focus();
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
            target.setSelectionRange(target.value.length, target.value.length);
          } else {
            const range = document.createRange(); range.selectNodeContents(target); range.collapse(false);
            const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range);
          }
          return document.activeElement === target || target.isContentEditable;
        },
      });
      if (results[0]?.result !== true) throw new Error(`입력 위치(${selector})를 찾지 못했습니다.`);
    }

    async function insertTistoryHtml(tabId, bodyFrame, html, statusPrefix) {
      say(statusPrefix);
      const inserted = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [bodyFrame] },
        // 확장 기본 격리 세계에서는 window.parent.tinymce가 페이지의 TinyMCE 인스턴스와
        // 다른 전역 객체라 API를 찾지 못한다. 그러면 아래 native insertHTML 대체 경로만
        // 실행되고, 화면에는 보여도 티스토리 저장 모델에서 블록 구조가 평문화될 수 있다.
        // 실제 편집기 세계에서 insertContent()를 실행해야 TinyMCE의 undo/저장 모델에도
        // 제목·목록·인용·표 같은 의미 태그가 함께 기록된다.
        world: "MAIN",
        args: [html],
        func: (safeHtml) => {
          const editor = document.querySelector("body#tinymce[contenteditable='true']");
          if (!editor) return false;
          editor.focus();
          // iframe DOM을 execCommand로만 바꾸면 화면에는 보여도 TinyMCE 모델에 기록되지 않는다.
          // 같은 편집기를 소유한 TinyMCE API의 insertContent()를 우선 사용하면 제목/목록/인용/표의
          // 의미 태그를 유지하면서 undo·발행 직렬화 경로에도 정상 등록된다.
          try {
            const api = window.parent?.tinymce;
            const candidates = [api?.activeEditor, ...(Array.isArray(api?.editors) ? api.editors : [])]
              .filter((candidate, index, all) => candidate && all.indexOf(candidate) === index);
            const mce = candidates.find((candidate) => candidate?.getBody?.() === editor || candidate?.getBody?.()?.id === "tinymce");
            if (mce?.insertContent) {
              mce.focus?.();
              mce.selection?.select?.(editor, true);
              mce.selection?.collapse?.(false);
              mce.insertContent(safeHtml, { format: "raw" });
              mce.setDirty?.(true);
              mce.fire?.("change");
              return true;
            }
          } catch {
            // TinyMCE API가 노출되지 않는 편집기 버전에서는 아래 native 입력 경로를 사용한다.
          }
          const selection = window.getSelection();
          // TinyMCE가 직전 삽입 뒤 DOM을 비동기로 다시 구성하면 Selection 객체는 남아 있어도
          // 이전 위치를 가리킬 수 있다. 매 블록을 끝에 명시적으로 붙여야 다음 서식이 앞 문단을
          // 덮어쓰지 않는다.
          const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
          selection?.removeAllRanges(); selection?.addRange(range);
          // TinyMCE가 감지하는 native editing 경로로 넣어 제목·목록·인용·표·링크의 의미 HTML을 보존한다.
          return document.execCommand("insertHTML", false, safeHtml);
        },
      });
      if (inserted[0]?.result !== true) throw new Error("본문 서식을 티스토리 편집기에 넣지 못했습니다.");
      await sleep(between(180, 420));
    }

    // insertHTML()의 반환값은 TinyMCE가 삽입 명령을 받았다는 뜻일 뿐, 티스토리가 뒤이어
    // DOM을 정리한 뒤에도 문단이 남아 있다는 보장은 아니다. 특히 여러 서식 블록과 이미지가
    // 섞인 글에서는 다음 블록을 넣기 전에 실제 본문 잔존 여부를 확인해야 한다.
    async function tistoryEditorContainsText(tabId, bodyFrame, value, attempts = 12) {
      const samples = Core.verificationSamples(value);
      if (!samples.length) return true;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const result = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [bodyFrame] }, args: [samples],
          func: (expectedSamples) => {
            const editor = document.querySelector("body#tinymce[contenteditable='true']");
            const body = String(editor?.innerText || "")
              .normalize("NFKC").toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
            return expectedSamples.some((sample) => body.includes(sample));
          },
        });
        if (result[0]?.result === true) return true;
        await sleep(250);
      }
      return false;
    }

    async function tistoryEditorKeepsStructure(tabId, bodyFrame, html) {
      const expected = Core.expectedStructure(html);
      if (!expected.length) return true;
      const result = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [bodyFrame] }, args: [expected],
        func: (tags) => {
          const markup = String(document.querySelector("body#tinymce[contenteditable='true']")?.innerHTML || "").toLowerCase();
          return tags.every((tag) => new RegExp(`<${tag}(?:\\s|>)`).test(markup));
        },
      });
      return result[0]?.result === true;
    }

    // 티스토리 편집기의 태그 칩 DOM은 버전에 따라 `.txt_tag` 직접 자식이거나,
    // "태그 수정"/"태그 삭제" 링크를 가진 `.tag_link` 구조로 바뀐다. 어느 구조든
    // 실제로 표시된 태그명만 모아야 첫 태그 입력 뒤 오탐으로 중단하지 않는다.
    async function readTistoryTagChips(tabId) {
      const result = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        func: () => {
          const root = document.querySelector(".editor_tag");
          if (!root) return [];
          const clean = (value) => String(value || "")
            .replace(/^#+/, "")
            .replace(/\s*태그\s*(?:수정|삭제)\s*$/u, "")
            .trim();
          const values = new Set();
          const selectors = [
            ".txt_tag",
            ".tag_link",
            "a[title*='태그']",
            "[class*='tag'] a",
          ];
          for (const node of root.querySelectorAll(selectors.join(","))) {
            const value = clean(node.textContent || node.getAttribute("title") || node.getAttribute("aria-label"));
            if (value) values.add(value);
          }
          return [...values];
        },
      });
      return result[0]?.result || [];
    }

    async function waitForTistoryTagChip(tabId, tag) {
      const expected = String(tag).toLocaleLowerCase();
      for (let attempt = 0; attempt < 18; attempt += 1) {
        const chips = await readTistoryTagChips(tabId);
        if (chips.some((chip) => String(chip).toLocaleLowerCase() === expected)) return true;
        await sleep(250);
      }
      return false;
    }

    async function addTistoryTags(tabId, bodyFrame, tags) {
      const existingTags = new Set((await readTistoryTagChips(tabId)).map((tag) => tag.toLocaleLowerCase()));
      const requestedTags = Core.normalizeTags(tags);
      // 본문에 #태그 문구가 있다는 것은 티스토리 태그 칩 등록이 아니다. 본문 해시태그를
      // 이미 등록된 태그처럼 취급하면 실제 태그가 한 건도 생성되지 않은 채 성공 처리된다.
      const missingTags = requestedTags.filter((tag) => !existingTags.has(tag.toLocaleLowerCase()));
      if (!missingTags.length) return { skipped: [], registered: requestedTags.length };
      // 실제 태그 입력 UI만 사용한다. 입력칸을 찾지 못한 경우 본문 끝 해시태그로 대체하면
      // 게시글에는 보이지만 티스토리 태그로는 등록되지 않아 사용자를 오도한다.
      const target = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        func: () => {
          const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
          const candidates = ["#tagText", ".editor_tag input", "input[placeholder*='태그']", "input[aria-label*='태그']", "input[name*='tag' i]"];
          for (const selector of candidates) {
            const input = [...document.querySelectorAll(selector)].find((node) => visible(node) && !node.disabled && !node.readOnly);
            if (input) return selector;
          }
          return "";
        },
      });
      const selector = target[0]?.result;
      if (!selector) {
        throw new Error("티스토리 태그 입력칸을 찾지 못했습니다. 본문 해시태그로 대체하지 않았으니 태그 UI를 연 뒤 다시 시도해 주세요.");
      }
      for (const tag of missingTags) {
        await focusKnownTarget(tabId, 0, selector);
        await withDebugger(tabId, () => humanType(tabId, tag, { shouldStop: () => state.shouldStop() }));
        await withDebugger(tabId, async () => {
          await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
          await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
        });
        if (!await waitForTistoryTagChip(tabId, tag)) throw new Error(`티스토리 태그 ‘${tag}’ 등록 결과를 확인하지 못했습니다.`);
      }
      return { skipped: [], registered: requestedTags.length };
    }

    async function openTistoryCategory(tabId) {
      const opened = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        func: async () => {
          const button = document.querySelector("#category-btn");
          // 티스토리는 목록을 버튼 클릭 뒤에 React로 생성할 수 있습니다.
          // 클릭 전 #category-list가 없다는 이유로 중단하면 버튼을 한 번도 누르지 못합니다.
          if (!button || !button.getClientRects().length) return false;
          const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
          const isOpen = () => {
            const list = document.querySelector("#category-list");
            return button.getAttribute("aria-expanded") === "true" || visible(list);
          };
          if (isOpen()) return true;
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          button.scrollIntoView({ block: "center", inline: "nearest" });
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const rect = button.getBoundingClientRect();
            const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
            button.focus();
            button.dispatchEvent(new MouseEvent("mouseover", event)); button.dispatchEvent(new MouseEvent("mousemove", event));
            await wait(100 + Math.floor(Math.random() * 321));
            // click()은 React의 일반 클릭 처리 경로를 타고, 합성 포인터 이벤트는 기존 티스토리 동작도 지원합니다.
            button.click();
            for (let waitAttempt = 0; waitAttempt < 10; waitAttempt += 1) {
              await wait(100);
              if (isOpen()) return true;
            }
          }
          return false;
        },
      });
      if (opened[0]?.result !== true) throw new Error("카테고리 목록을 열지 못했습니다.");
    }

    async function chooseTistoryCategory(tabId, category) {
      if (!category) return;
      await openTistoryCategory(tabId);
      const picked = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] }, args: [category],
        func: async (name) => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const option = [...document.querySelectorAll("#category-list [role='option']")].filter((item) => item.getAttribute("aria-label") === name);
          if (option.length !== 1) return false;
          const node = option[0]; const rect = node.getBoundingClientRect();
          const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + 12, clientY: rect.top + Math.max(4, rect.height / 2) };
          node.dispatchEvent(new MouseEvent("mouseover", event)); node.dispatchEvent(new MouseEvent("mousemove", event)); await wait(100 + Math.floor(Math.random() * 321));
          node.dispatchEvent(new MouseEvent("mousedown", event)); node.dispatchEvent(new MouseEvent("mouseup", event)); node.dispatchEvent(new MouseEvent("click", event));
          await wait(250);
          return node.getAttribute("aria-selected") === "true";
        },
      });
      if (picked[0]?.result !== true) throw new Error(`카테고리 ‘${category}’를 선택하지 못했습니다.`);
    }

    async function isPublishSettingsOpen(tabId) {
      const state = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        func: () => [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")]
          .some((node) => Boolean(node.getClientRects().length) && getComputedStyle(node).visibility !== "hidden"),
      });
      return state[0]?.result === true;
    }

    async function openPublishSettings(tabId) {
      if (await isPublishSettingsOpen(tabId)) return;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const target = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [0] },
          func: () => {
            const button = document.querySelector("#publish-layer-btn");
            if (!button || !button.getClientRects().length) return null;
            button.scrollIntoView({ block: "center", inline: "nearest" }); button.focus();
            const rect = button.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          },
        });
        const point = target[0]?.result;
        if (!point) throw new Error("발행 설정 버튼을 찾지 못했습니다.");
        // DOM click은 isTrusted=false라 티스토리 React가 무시할 수 있다. CDP 포인터 입력으로 실제 클릭 경로를 사용한다.
        await withDebugger(tabId, async () => {
          await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
          await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
          await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
        });
        for (let waitAttempt = 0; waitAttempt < 20; waitAttempt += 1) {
          await sleep(100);
          if (await isPublishSettingsOpen(tabId)) return;
        }
      }
      throw new Error("발행 설정창을 열지 못했습니다.");
    }

    async function closePublishSettings(tabId) {
      if (!await isPublishSettingsOpen(tabId)) return;
      const target = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        func: () => {
          const button = document.querySelector("#unpublish-btn");
          if (!button || !button.getClientRects().length) return null;
          const rect = button.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        },
      });
      const point = target[0]?.result;
      if (!point) throw new Error("열려 있는 발행 설정창의 취소 버튼을 찾지 못했습니다.");
      await clickTistoryPoint(tabId, point);
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await sleep(100);
        if (!await isPublishSettingsOpen(tabId)) return;
      }
      throw new Error("열려 있는 발행 설정창을 닫지 못했습니다.");
    }

    async function clickTistoryPoint(tabId, point) {
      await withDebugger(tabId, async () => {
        await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
        await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
        await chrome.debugger.sendCommand({ tabId }, "Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
      });
    }

    async function ensureTistoryPublicWithTrustedClick(tabId) {
      const target = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] },
        func: () => {
          const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
          const text = (node) => String(node?.textContent || "").replace(/\s+/g, " ").trim();
          const root = [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")].find(visible);
          const radio = root?.querySelector("#open20")
            || [...(root?.querySelectorAll("input[name='basicSet'][type='radio']") || [])].find((input) => {
              const label = root.querySelector(`label[for='${input.id}']`) || input.closest("label");
              const labelText = text(label || input.parentElement);
              return labelText.includes("공개") && !labelText.includes("비공개") && !labelText.includes("보호");
            });
          if (!radio) return null;
          if (radio.checked) return { selected: true };
          const clickTarget = [
            root.querySelector(`label[for='${radio.id}']`), radio.closest("label"), radio.nextElementSibling,
            radio.previousElementSibling, radio.parentElement,
          ].find(visible);
          if (!clickTarget) return null;
          clickTarget.scrollIntoView({ block: "center", inline: "nearest" });
          const rect = clickTarget.getBoundingClientRect();
          // 공개 범위 라디오는 티스토리의 일반 클릭 경로가 반영되는지 먼저 확인한다.
          // 반영되지 않는 React 상태에서만 아래의 실제 포인터 클릭으로 재시도한다.
          clickTarget.click();
          if (!radio.checked) radio.click();
          return { selected: radio.checked, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        },
      });
      const selection = target[0]?.result;
      if (selection?.selected) return;
      const point = selection;
      if (!point?.x) throw new Error("발행 설정창의 공개 선택 항목을 찾지 못했습니다.");
      if (!selection.selected) await clickTistoryPoint(tabId, point);
      for (let attempt = 0; attempt < 45; attempt += 1) {
        await sleep(100);
        const verified = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [0] },
          func: () => [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")]
            .some((root) => {
              const publicRadio = root.querySelector("#open20");
              if (publicRadio?.checked) return true;
              return [...root.querySelectorAll("input[name='basicSet'][type='radio']")].some((input) => {
                const labelText = String((root.querySelector(`label[for='${input.id}']`) || input.closest("label") || input.parentElement)?.textContent || "").replace(/\s+/g, " ").trim();
                return input.checked && labelText.includes("공개") && !labelText.includes("비공개") && !labelText.includes("보호");
              });
            }),
        });
        if (verified[0]?.result === true) return;
      }
      throw new Error("공개 범위 적용을 화면에서 확인하지 못했습니다.");
    }

    // 홈주제는 티스토리 React가 관리하는 드롭다운이다. 발행창을 연 뒤 DOM 합성 click으로
    // 고르면 isTrusted=false를 무시할 수 있으므로, 두 번의 실제 포인터 클릭과 화면 문구 확인을 쓴다.
    async function applyTistoryTopicWithTrustedClicks(tabId, topic) {
      const button = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] }, args: [topic],
        func: (name) => {
          const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
          const root = [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")].find(visible);
          const buttons = [...(root?.querySelectorAll("button.mce-btn-type1.select_btn") || [])].filter(visible);
          const target = buttons[1];
          if (!target) return null;
          if (String(target.textContent || "").replace(/\s+/g, " ").includes(name)) return { selected: true };
          target.scrollIntoView({ block: "center", inline: "nearest" });
          const rect = target.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        },
      });
      if (button[0]?.result?.selected) return;
      const buttonPoint = button[0]?.result;
      if (!buttonPoint?.x) throw new Error("홈주제 선택 메뉴를 찾지 못했습니다.");
      await clickTistoryPoint(tabId, buttonPoint);

      let optionPoint = null;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await sleep(100);
        const option = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [0] }, args: [topic],
          func: (name) => {
            const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
            const list = [...document.querySelectorAll("[role='listbox']")].find(visible);
            const matches = [...(list?.querySelectorAll("button, [role='option'], a, li, div") || [])]
              .filter((node) => visible(node) && String(node.textContent || "").replace(/\s+/g, " ").trim() === name)
              .filter((node) => ![...node.children].some((child) => String(child.textContent || "").replace(/\s+/g, " ").trim() === name));
            if (matches.length !== 1) return null;
            const rect = matches[0].getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          },
        });
        if (option[0]?.result?.x) { optionPoint = option[0].result; break; }
      }
      if (!optionPoint) throw new Error(`‘${topic}’ 홈주제 항목을 현재 티스토리 목록에서 찾지 못했습니다.`);
      await clickTistoryPoint(tabId, optionPoint);

      for (let attempt = 0; attempt < 20; attempt += 1) {
        await sleep(100);
        const verified = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [0] }, args: [topic],
          func: (name) => {
            const visible = (node) => Boolean(node?.getClientRects().length) && getComputedStyle(node).visibility !== "hidden";
            const root = [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")].find(visible);
            const buttons = [...(root?.querySelectorAll("button.mce-btn-type1.select_btn") || [])].filter(visible);
            return Boolean(buttons[1] && String(buttons[1].textContent || "").replace(/\s+/g, " ").includes(name));
          },
        });
        if (verified[0]?.result === true) return;
      }
      throw new Error(`‘${topic}’ 홈주제 적용을 화면에서 확인하지 못했습니다.`);
    }

    async function applyTistoryPublishSettings(tabId, settings) {
      const applied = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] }, args: [settings],
        func: async (requested) => {
          const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          const dialog = () => [...document.querySelectorAll(".editor_layer[role='dialog'], .editor_layer.ReactModal__Content--after-open")].find((node) => Boolean(node.getClientRects().length));
          const visible = (node) => Boolean(node?.getClientRects().length);
          const nodeText = (node) => String(node?.textContent || "").replace(/\s+/g, " ").trim();
          const click = async (node) => {
            if (!node || !visible(node)) return false;
            const rect = node.getBoundingClientRect();
            const event = { bubbles: true, cancelable: true, view: window, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
            node.dispatchEvent(new MouseEvent("mouseover", event)); node.dispatchEvent(new MouseEvent("mousemove", event));
            await wait(90 + Math.floor(Math.random() * 160));
            node.dispatchEvent(new MouseEvent("mousedown", event)); node.dispatchEvent(new MouseEvent("mouseup", event)); node.dispatchEvent(new MouseEvent("click", event));
            await wait(180);
            return true;
          };
          const setValue = (input, value) => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true }));
          };
          const root = dialog();
          if (!root) throw new Error("발행 설정창을 확인하지 못했습니다.");
          const visibilityLabel = { public: "공개", protected: "보호", private: "비공개" }[requested.visibility];
          const radio = [...root.querySelectorAll("input[name='basicSet'][type='radio']")].find((input) => {
            const label = root.querySelector(`label[for='${input.id}']`);
            return nodeText(label || input.parentElement).includes(visibilityLabel);
          });
          if (!radio) throw new Error(`${visibilityLabel} 공개 범위 선택 항목을 찾지 못했습니다.`);
          await click(radio);
          if (!radio.checked) throw new Error(`${visibilityLabel} 공개 범위 적용을 확인하지 못했습니다.`);
          if (requested.visibility === "protected") {
            const password = root.querySelector("#postPassword");
            if (!password) throw new Error("보호글 비밀번호 입력칸을 찾지 못했습니다.");
            setValue(password, requested.password);
            if (password.value !== requested.password) throw new Error("보호글 비밀번호 입력을 확인하지 못했습니다.");
          }

          const selectButtons = [...root.querySelectorAll("button.mce-btn-type1.select_btn")].filter(visible);
          const chooseListOption = async (button, label, required = true) => {
            if (!button) { if (!required) return; throw new Error("발행 설정 선택 메뉴를 찾지 못했습니다."); }
            await click(button);
            const list = [...document.querySelectorAll("[role='listbox']")].find(visible);
            const matches = [...(list?.querySelectorAll("button, [role='option'], a, li, div") || [])]
              .filter((node) => visible(node) && nodeText(node) === label);
            if (matches.length !== 1) throw new Error(`‘${label}’ 항목이 현재 티스토리 목록에 없습니다. 제목·본문 입력 뒤 홈주제 목록 갱신을 누르고 다시 선택해 주세요.`);
            await click(matches[0]);
            if (!nodeText(button).includes(label)) throw new Error(`‘${label}’ 선택 적용을 확인하지 못했습니다.`);
          };
          await chooseListOption(selectButtons[0], requested.comment === "allow" ? "댓글 허용" : "댓글 비허용");
          if (requested.topic) await chooseListOption(selectButtons[1], requested.topic);

          const timingLabel = requested.timing === "now" ? "현재" : "예약";
          const timingButton = [...root.querySelectorAll("button.btn_date")].find((button) => nodeText(button) === timingLabel);
          if (!timingButton) throw new Error(`${timingLabel} 발행 선택 항목을 찾지 못했습니다.`);
          await click(timingButton);
          if (!timingButton.classList.contains("on")) throw new Error(`${timingLabel} 발행 적용을 확인하지 못했습니다.`);

          if (requested.timing === "reserve") {
            const targetDate = new Date(`${requested.reserveDate}T00:00:00`);
            if (Number.isNaN(targetDate.getTime())) throw new Error("예약 날짜 형식이 올바르지 않습니다.");
            const dateButton = root.querySelector("button.btn_reserve");
            if (!dateButton) throw new Error("예약 날짜 선택 버튼을 찾지 못했습니다.");
            await click(dateButton);
            for (let step = 0; step < 37; step += 1) {
              const calendar = [...document.querySelectorAll(".layer_info, .inner_layer")].find(visible);
              const matched = nodeText(calendar).match(/(\d{4})년\s*(\d{1,2})월/);
              if (!matched) throw new Error("예약 달력의 연월 정보를 읽지 못했습니다.");
              const year = Number(matched[1]); const month = Number(matched[2]);
              if (year === targetDate.getFullYear() && month === targetDate.getMonth() + 1) break;
              const direction = year > targetDate.getFullYear() || (year === targetDate.getFullYear() && month > targetDate.getMonth() + 1) ? ".btn_prev" : ".btn_next";
              const navigation = calendar.querySelector(direction);
              if (!navigation) throw new Error("예약 달력 이동 버튼을 찾지 못했습니다.");
              await click(navigation);
              if (step === 36) throw new Error("예약 날짜가 달력 탐색 범위를 벗어났습니다.");
            }
            const calendar = [...document.querySelectorAll(".layer_info, .inner_layer")].find(visible);
            const days = [...(calendar?.querySelectorAll("button.btn_day") || [])].filter((button) => nodeText(button) === String(targetDate.getDate()));
            if (days.length !== 1) throw new Error("예약 날짜를 안전하게 하나로 식별하지 못했습니다.");
            await click(days[0]);
            if (!nodeText(dateButton).includes(requested.reserveDate)) throw new Error("예약 날짜 적용을 확인하지 못했습니다.");
            const [hour, minute] = requested.reserveTime.split(":");
            const hourInput = root.querySelector("#dateHour"); const minuteInput = root.querySelector("#dateMinute");
            if (!hourInput || !minuteInput) throw new Error("예약 시간 입력칸을 찾지 못했습니다.");
            setValue(hourInput, String(Number(hour))); setValue(minuteInput, String(Number(minute)));
            if (Number(hourInput.value) !== Number(hour) || Number(minuteInput.value) !== Number(minute)) throw new Error("예약 시간 적용을 확인하지 못했습니다.");
          }
          return { visibility: visibilityLabel, timing: timingLabel };
        },
      });
      if (!applied[0]?.result) throw new Error("발행 설정 적용 결과를 확인하지 못했습니다.");
      return applied[0].result;
    }

    async function readTistoryDraftState(tabId, bodyFrame) {
      const [top, body] = await Promise.all([
        chrome.scripting.executeScript({
          target: { tabId, frameIds: [0] },
          func: () => ({
            title: document.querySelector("#post-title-inp")?.value || "",
            tagCount: document.querySelectorAll(".editor_tag > .txt_tag").length,
          }),
        }),
        chrome.scripting.executeScript({
          target: { tabId, frameIds: [bodyFrame] },
          func: () => {
            const editor = document.querySelector("body#tinymce[contenteditable='true']");
            return { body: editor?.innerText || "", imageCount: editor?.querySelectorAll(":scope > figure > img").length || 0 };
          },
        }),
      ]);
      return { title: top[0]?.result?.title || "", tagCount: top[0]?.result?.tagCount || 0, body: body[0]?.result?.body || "", imageCount: body[0]?.result?.imageCount || 0 };
    }

    // iframe body에 보이는 내용과 TinyMCE가 발행 때 읽는 숨김 textarea는 별개다. execCommand로
    // 서식을 넣으면 화면에는 보이지만 TinyMCE의 save 단계가 실행되지 않아 발행본에서 텍스트가
    // 빠질 수 있다. 발행 설정 전 실제 TinyMCE 저장 경로를 강제로 실행하고 원본에도 내용이 남았는지 확인한다.
    async function synchronizeTistoryEditorForPublish(tabId, bodyFrame, expectedGroups) {
      say("본문 저장 원본 동기화 중…");
      const visible = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [bodyFrame] },
        func: () => {
          const editor = document.querySelector("body#tinymce[contenteditable='true']");
          return { html: editor?.innerHTML || "", text: editor?.innerText || "" };
        },
      });
      const source = visible[0]?.result;
      if (!source?.html) throw new Error("발행 전 본문 저장 원본을 만들 내용을 찾지 못했습니다.");

      const saved = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [0] }, args: [source.html, expectedGroups],
        // TinyMCE 인스턴스는 페이지 메인 세계에만 존재한다. 격리 세계에서 save() 호출이
        // 생략되는 경우를 막아, 발행용 textarea까지 같은 편집기 모델로 직렬화한다.
        world: "MAIN",
        func: (html, groups) => {
          const compact = (value) => String(value || "").normalize("NFKC").toLowerCase()
            .replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");
          // textarea.value는 HTML 원문이라 &nbsp;·&amp; 같은 엔티티와 태그 이름까지 포함한다.
          // 원문 문자열을 바로 비교하면 화면에 실제로 있는 문단도 누락으로 오판할 수 있으므로,
          // 브라우저가 해석한 텍스트로 바꾼 뒤에만 본문 검증을 한다.
          const renderedText = (value) => {
            const container = document.createElement("div");
            container.innerHTML = String(value || "");
            return container.textContent || "";
          };
          const textarea = document.querySelector("textarea#editor-tistory");
          const api = window.tinymce;
          const editors = [api?.activeEditor, ...(Array.isArray(api?.editors) ? api.editors : [])]
            .filter((editor, index, all) => editor && all.indexOf(editor) === index);
          const editor = editors.find((candidate) => candidate?.getBody?.()?.id === "tinymce" || candidate?.getElement?.()?.id === "editor-tistory");
          let mode = "textarea";
          try {
            if (editor) {
              // 서식은 입력 시 insertContent()로 이미 모델에 기록한다. 여기서 setContent()로 전체
              // 본문을 재해석하면 티스토리 고유 서식이 평문처럼 정리될 수 있어 저장만 수행한다.
              editor.setDirty?.(true);
              editor.fire?.("input");
              editor.fire?.("change");
              editor.save?.();
              mode = "tinymce-save";
            }
          } catch {
            // textarea 동기화 경로로 계속 진행하고, 아래 실제 저장값 검증으로 실패 여부를 판단한다.
          }
          if (textarea instanceof HTMLTextAreaElement) {
            // TinyMCE API가 없거나 늦게 반영된 경우에도 발행 직전 원본에는 iframe HTML을 보존한다.
            if (!textarea.value || compact(renderedText(textarea.value)) !== compact(renderedText(html))) textarea.value = html;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const persisted = textarea instanceof HTMLTextAreaElement ? textarea.value : editor?.getContent?.({ format: "raw" }) || "";
          const body = compact(renderedText(persisted));
          const matched = groups.filter((samples) => samples.length === 0 || samples.some((sample) => body.includes(sample))).length;
          return { mode, matched, total: groups.length };
        },
      });
      const result = saved[0]?.result;
      if (!result || result.matched < result.total) {
        throw new Error(`발행용 본문 저장 원본을 확인하지 못했습니다. (확인 ${result?.matched || 0}/${result?.total || expectedGroups.length}개 문단)`);
      }
      return result;
    }

    async function pasteTistoryImage(tabId, bodyFrame, url, order, total) {
      const before = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [bodyFrame] },
        func: () => document.querySelectorAll("body#tinymce[contenteditable='true'] > figure > img").length,
      });
      say(`이미지 ${order}/${total} 티스토리에 전달 중…`);
      const dispatched = await chrome.scripting.executeScript({
        target: { tabId, frameIds: [bodyFrame] },
        args: [url, `tistory-image-${order}.png`],
        func: async (imageUrl, fileName) => {
          const editor = document.querySelector("body#tinymce[contenteditable='true']");
          if (!editor) throw new Error("티스토리 본문 입력 영역을 찾지 못했습니다.");
          const response = await fetch(imageUrl);
          if (!response.ok) throw new Error(`이미지를 가져오지 못했습니다. (${response.status})`);
          const source = await response.blob();
          if (!source.type.startsWith("image/")) throw new Error("전달할 파일이 이미지 형식이 아닙니다.");
          const sourceUrl = URL.createObjectURL(source);
          try {
            const image = await new Promise((resolve, reject) => {
              const element = new Image();
              element.onload = () => resolve(element);
              element.onerror = () => reject(new Error("이미지를 PNG로 변환하지 못했습니다."));
              element.src = sourceUrl;
            });
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvas.getContext("2d")?.drawImage(image, 0, 0);
            const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
            if (!png) throw new Error("이미지를 PNG로 변환하지 못했습니다.");
            const transfer = new DataTransfer();
            transfer.items.add(new File([png], fileName, { type: "image/png" }));
            editor.focus();
            const event = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer });
            return { dispatched: editor.dispatchEvent(event), defaultPrevented: event.defaultPrevented };
          } finally {
            URL.revokeObjectURL(sourceUrl);
          }
        },
      });
      // cancelable 이벤트는 편집기가 정상 처리하면서 preventDefault()를 호출하면
      // dispatchEvent()가 false를 반환합니다. 이는 전달 실패가 아니라 티스토리가
      // 붙여넣기를 인계받았다는 뜻이므로, 실제 figure > img 생성 여부로 판정합니다.
      if (!dispatched[0]?.result) throw new Error(`이미지 ${order}의 티스토리 전달 결과를 확인하지 못했습니다.`);
      const expected = (before[0]?.result || 0) + 1;
      // 티스토리는 붙여넣은 이미지를 서버로 올린 뒤 figure > img를 추가합니다.
      // 고해상도 PNG나 응답이 느린 경우 20초 안에 완료되지 않아 실제 업로드 중에도
      // 실패로 처리됐으므로, 최대 90초 동안 DOM 완료 상태를 확인합니다.
      for (let attempt = 0; attempt < 180; attempt += 1) {
        await sleep(500);
        if (attempt > 0 && attempt % 10 === 0) {
          say(`이미지 ${order}/${total} 업로드 확인 중… ${Math.floor(attempt / 2)}초`);
        }
        const after = await chrome.scripting.executeScript({
          target: { tabId, frameIds: [bodyFrame] },
          func: () => document.querySelectorAll("body#tinymce[contenteditable='true'] > figure > img").length,
        });
        if ((after[0]?.result || 0) >= expected) return;
      }
      throw new Error(`이미지 ${order}의 티스토리 업로드 완료를 90초 동안 확인하지 못했습니다.`);
    }
    // ===== 옮겨 온 함수들 끝 =====

    // ---- adapter 인터페이스 ----
    return {
      state,
      ownEditorUrl: (url) => Core.isOwnEditorUrl(url, state.blogName),
      setStatus(handler) { state.say = typeof handler === "function" ? handler : () => {}; },

      async ensureAlive() {
        const tab = await getTab();
        if (!Core.isOwnEditorUrl(tab.url, state.blogName)) throw new TaskError("TAB_NAVIGATED", "티스토리 글쓰기 탭이 다른 화면으로 이동했습니다. 입력된 내용은 티스토리 임시저장에 남아 있을 수 있습니다.");
      },

      // 본인 블로그의 비어 있는 새 글쓰기 화면을 새 탭으로 연다(회원이 쓰던 탭은 건드리지 않는다).
      async prepareEditor({ blogName, progress = () => {}, isCancelled = () => false }) {
        state.blogName = blogName;
        state.bodyFrame = null;
        const url = Core.editorUrl(blogName);
        const tab = await chrome.tabs.create({ url, active: true });
        state.tabId = tab.id;
        await focusWindow(tab);

        const deadline = now() + loginWaitMs;
        let stableSince = 0;
        let lastMessage = "";
        let redirects = 0;
        let silent = 0;
        const note = (message) => { if (message !== lastMessage) { lastMessage = message; progress(message); } };
        while (now() < deadline) {
          if (isCancelled()) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다.");
          const current = await getTab();
          if (current.status === "loading") { stableSince = 0; await sleep(500); continue; }
          if (Core.isLoginUrl(current.url)) { stableSince = 0; note("티스토리 로그인이 필요합니다. 열린 Chrome 창에서 로그인해 주세요. 완료되면 자동으로 이어서 입력합니다."); await sleep(1000); continue; }
          let host = "";
          try { host = new URL(current.url || "about:blank").hostname.toLowerCase(); } catch { await sleep(500); continue; }
          if (!Core.isOwnEditorUrl(current.url, blogName)) {
            // 로그인 뒤 티스토리 첫 화면이나 블로그 관리 화면으로 돌아온 경우 글쓰기 화면으로 다시 보낸다. 반복되면 이 계정의 블로그가 아니다.
            if (/(^|\.)tistory\.com$/.test(host)) {
              redirects += 1;
              if (redirects > 4) throw new TaskError("ACCOUNT_MISMATCH", `이 계정으로는 ${blogName}.tistory.com 블로그의 글쓰기 화면을 열 수 없습니다. 블로그 주소와 로그인한 티스토리 계정을 확인하세요.`);
              await chrome.tabs.update(state.tabId, { url });
              stableSince = 0; await sleep(900); continue;
            }
            throw new TaskError("ACCOUNT_MISMATCH", `티스토리 글쓰기 화면이 아닌 다른 주소(${host})로 이동했습니다. 블로그 주소를 확인하세요.`);
          }
          let probe;
          try { probe = await probeEditor(state.tabId); silent = 0; } catch (error) {
            if (isMissingTab(error)) throw closed();
            // 확인 대화상자(예: 저장된 글 이어쓰기)가 떠 있으면 화면 조사가 응답하지 않는다 — 회원이 확인할 때까지 기다린다.
            silent += 1; stableSince = 0;
            note("티스토리 창에 확인 대화상자가 열려 있을 수 있습니다. 확인한 뒤 계속 진행합니다(이어쓰기를 묻는 경우 '취소'를 눌러 빈 새 글로 시작하세요).");
            await sleep(1000); continue;
          }
          if (probe.bodies.length === 1 && probe.top) {
            const dirty = probe.top.titleValue.trim() || probe.bodies[0].bodyText.trim() || probe.bodies[0].bodyImages || probe.top.tagChips;
            if (dirty) throw new TaskError("EDITOR_NOT_EMPTY", "새 글쓰기 화면에 이전 내용이 남아 있어 입력하지 않았습니다. 기존 내용은 그대로 보존했습니다. 빈 글쓰기 화면에서 다시 보내주세요.");
            if (probe.frames.some((frame) => frame.layerOpen)) { stableSince = 0; await sleep(500); continue; }
            // 임시저장 복원 창이 첫 확인 뒤에 나타날 수 있어, 빈 편집기가 2초 이상 안정적으로 보일 때만 받아들인다.
            if (!stableSince) stableSince = now();
            if (now() - stableSince >= 2000) { state.bodyFrame = probe.bodies[0].frameId; return; }
          } else stableSince = 0;
          await sleep(500);
        }
        throw new TaskError("EDITOR_PREPARATION_FAILED", "5분 안에 글쓰기 화면을 준비하지 못했습니다. 티스토리 로그인·알림 창을 확인한 뒤 BLOG에서 다시 보내주세요.");
      },

      async readDraft() { return readTistoryDraftState(state.tabId, state.bodyFrame); },
      async focusTitle() { await focusWindow(await getTab()); await sleep(between(350, 600)); await focusKnownTarget(state.tabId, 0, "#post-title-inp"); },
      async focusBody() { await focusKnownTarget(state.tabId, state.bodyFrame, "body#tinymce[contenteditable='true']"); },
      async typeText(value, { onProgress, shouldStop } = {}) { await withDebugger(state.tabId, () => humanType(state.tabId, value, { onProgress, shouldStop })); },
      async containsText(value, attempts = 12) { return tistoryEditorContainsText(state.tabId, state.bodyFrame, value, attempts); },
      async insertHtml(html) { await insertTistoryHtml(state.tabId, state.bodyFrame, html, "본문 서식 입력 중…"); },
      async keepsStructure(html) { return tistoryEditorKeepsStructure(state.tabId, state.bodyFrame, html); },
      async pasteImage(url, order, total) { await pasteTistoryImage(state.tabId, state.bodyFrame, url, order, total); },
      async syncForPublish(expectedGroups) { return synchronizeTistoryEditorForPublish(state.tabId, state.bodyFrame, expectedGroups); },
      async closePublishSettings() { await closePublishSettings(state.tabId); },
      async chooseCategory(name) { await chooseTistoryCategory(state.tabId, name); },
      async addTags(tags) { return addTistoryTags(state.tabId, state.bodyFrame, tags); },

      // 발행 설정(공개 범위·댓글·홈주제·발행 시점). 기본값이면 발행 설정창을 열지 않는다. 최종 발행 버튼은 누르지 않는다.
      async applyPublish(publish) {
        const settings = { visibility: publish.visibility, password: "", comment: publish.comment, topic: publish.topic || "", timing: publish.timing, reserveDate: publish.reserveDate || "", reserveTime: publish.reserveTime || "" };
        if (!Core.needsPublishDialog(settings)) return { skipped: true, visibility: "공개", timing: "현재" };
        await openPublishSettings(state.tabId);
        if (settings.topic && settings.visibility === "public" && settings.comment === "allow" && settings.timing === "now") {
          // 티스토리는 직전 글의 비공개 선택을 발행창에 유지할 수 있으므로, 홈주제만 고르지 않고 공개 범위도 실제 포인터 클릭으로 확정한다.
          await ensureTistoryPublicWithTrustedClick(state.tabId);
          await applyTistoryTopicWithTrustedClicks(state.tabId, settings.topic);
          return { visibility: "공개", timing: "현재", topic: settings.topic };
        }
        return applyTistoryPublishSettings(state.tabId, settings);
      },

      // 내 블로그의 카테고리 이름 목록(웹에서 카테고리를 고르기 위함). 열린 목록은 읽은 뒤 닫는다. 아무것도 선택하지 않는다.
      async readCategories() {
        await openTistoryCategory(state.tabId);
        const result = await chrome.scripting.executeScript({
          target: { tabId: state.tabId, frameIds: [0] },
          func: () => {
            const names = [...document.querySelectorAll("#category-list [role='option']")].map((item) => String(item.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()).filter(Boolean);
            const button = document.querySelector("#category-btn");
            if (button && button.getAttribute("aria-expanded") === "true") button.click();
            return [...new Set(names)];
          },
        });
        const names = result[0]?.result;
        if (!Array.isArray(names) || !names.length) throw new TaskError("CATEGORY_LIST_FAILED", "티스토리 카테고리 목록을 읽지 못했습니다.");
        return names;
      },

      // 카테고리 목록을 읽으려고 우리가 연 탭을 닫는다.
      async closeTab() {
        if (state.tabId == null) return;
        try { await chrome.tabs.remove(state.tabId); } catch { /* 이미 닫힘 */ }
        state.tabId = null;
      },

      async cleanup() { if (state.tabId != null) { try { await chrome.debugger.detach({ tabId: state.tabId }); } catch { /* 붙어 있지 않음 */ } } },
    };
  }

  const api = { createTistoryAdapter, TYPE_MIN_MS, TYPE_MAX_MS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TistoryAdapter = api;
})(typeof self !== "undefined" ? self : globalThis);
