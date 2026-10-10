"use strict";

// BLOG 네이버 입력기 — 크롬 API 연결부(2026-10-10, v1.41).
// 네이버 글쓰기 탭을 열고/고르고, 편집기 프레임을 찾고, 입력(CDP)·이미지 올리기·발행 설정을 실제로 수행한다.
// 무엇을 어떤 순서로 할지는 blog-engine.js가 결정하고, 이 파일은 engine이 요구하는 동작(adapter 인터페이스)만 제공한다.
//  - 글자 입력: chrome.debugger CDP(Input.insertText)로 한 글자씩 70~170ms, 가끔 250~700ms 쉼(§20 봇 탐지 회피 규칙 1).
//  - 읽기 조사는 모든 프레임, 바꾸는 명령은 고른 한 프레임에서만 실행(같은 동작이 여러 프레임에서 중복 실행되는 사고 방지).
//  - 마지막 "발행" 버튼은 누르지 않는다(§20 규칙 4).
(function (root) {
  const TYPE_MIN_MS = 70;
  const TYPE_MAX_MS = 170;
  const THINK_CHANCE = 0.04;
  const THINK_MIN_MS = 250;
  const THINK_MAX_MS = 700;
  const LOGIN_WAIT_MS = 5 * 60 * 1000;
  const IMAGE_WAIT_MS = 20000;
  const tagKey = (value) => String(value || "").normalize("NFC").replace(/[#\s​﻿]/gu, "");

  function createNaverAdapter({ chrome, pageFn, TaskError, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), random = Math.random, now = Date.now, loginWaitMs = LOGIN_WAIT_MS }) {
    const between = (min, max) => Math.floor(random() * (max - min + 1)) + min;
    const state = { tabId: null, blogId: "", editorFrame: null, settingsFrame: null };

    const isMissingTab = (error) => /No tab with id|Invalid tab ID|tab was closed/i.test(String(error?.message || error));
    const closed = () => new TaskError("TAB_CLOSED", "네이버 글쓰기 탭이 닫혔거나 이동했습니다. 입력된 내용은 네이버 임시 저장에 남아 있을 수 있습니다. 글쓰기 화면을 다시 연 뒤 BLOG에서 다시 보내주세요.");

    function ownEditorUrl(rawUrl, blogId) {
      let url;
      try { url = new URL(rawUrl || ""); } catch { return false; }
      if (url.protocol !== "https:" || url.hostname !== "blog.naver.com") return false;
      const id = String(blogId).toLowerCase();
      if (url.pathname.toLowerCase() === `/${id}/postwrite`) return true;
      if (/\/PostWriteForm\.naver$/i.test(url.pathname) && (url.searchParams.get("blogId") || "").toLowerCase() === id) return true;
      return url.pathname.toLowerCase() === `/${id}` && (url.searchParams.get("Redirect") || "").toLowerCase() === "write";
    }

    async function getTab() {
      if (state.tabId == null) throw closed();
      try { return await chrome.tabs.get(state.tabId); } catch (error) { if (isMissingTab(error)) throw closed(); throw error; }
    }

    // 모든 프레임에서 읽기 명령 실행(바꾸는 명령에는 쓰지 않는다)
    async function readAllFrames(command, args = {}, tabId = state.tabId) {
      let results;
      try {
        results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: pageFn, args: [command, args] });
      } catch (error) { if (isMissingTab(error)) throw closed(); throw error; }
      return results.map((entry) => ({ frameId: entry.frameId, result: entry.result ?? { ok: false, status: "unknown", reason: "편집기 응답 없음" } }));
    }

    // 한 프레임에서만 실행(바꾸는 명령)
    async function runInFrame(frameId, command, args = {}, tabId = state.tabId) {
      let results;
      try {
        results = await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, func: pageFn, args: [command, args] });
      } catch (error) { if (isMissingTab(error)) throw closed(); throw error; }
      return results[0]?.result ?? { ok: false, error: `${command}: 편집기 프레임 응답 없음(frame ${frameId})` };
    }

    function pickInspection(entries) {
      const order = ["security_check", "expired", "account_mismatch"];
      for (const status of order) { const hit = entries.find((entry) => entry.result?.status === status); if (hit) return hit; }
      return entries.find((entry) => entry.result?.status === "valid") || entries.find((entry) => entry.result?.reason) || entries[0] || { frameId: 0, result: { status: "unknown", reason: "편집기 응답을 확인하지 못했습니다." } };
    }

    async function inspectTab(tabId = state.tabId) {
      const entries = await readAllFrames("inspect", { blogId: state.blogId }, tabId);
      const picked = pickInspection(entries);
      return { ...picked.result, frameId: picked.frameId };
    }

    async function resolveEditorFrame(force = false) {
      if (!force && state.editorFrame != null) return state.editorFrame;
      const inspection = await inspectTab();
      if (inspection.status !== "valid") throw new TaskError("EDITOR_NOT_READY", inspection.reason || "글쓰기 화면을 확인하지 못했습니다.");
      state.editorFrame = inspection.frameId;
      return state.editorFrame;
    }

    // 편집기 프레임 명령(프레임이 바뀌어 응답이 없으면 한 번만 다시 찾는다)
    async function editorCommand(command, args = {}) {
      let frameId = await resolveEditorFrame();
      let result = await runInFrame(frameId, command, args);
      if (result && result.ok === false && /프레임 응답 없음/.test(result.error || "")) {
        frameId = await resolveEditorFrame(true);
        result = await runInFrame(frameId, command, args);
      }
      return result;
    }

    async function focusWindow(tab) {
      try { await chrome.windows.update(tab.windowId, { focused: true }); } catch (error) { if (/No window with id/i.test(error?.message || "")) throw closed(); throw error; }
      await chrome.tabs.update(tab.id, { active: true });
    }

    // ---- CDP ----
    async function debuggerCommand(method, params = {}) {
      return chrome.debugger.sendCommand({ tabId: state.tabId }, method, params);
    }
    async function attachDebugger() {
      try { await chrome.debugger.attach({ tabId: state.tabId }, "1.3"); }
      catch (error) {
        if (!/already attached/i.test(error?.message || "")) throw error;
        // 이 확장이 이전에 붙인 디버거가 남아 있으면 떼고 다시 붙인다. 다른 도구(DevTools)가 붙인 경우는 같은 오류가 다시 나서 그대로 안내한다.
        try { await chrome.debugger.detach({ tabId: state.tabId }); } catch { /* ignore */ }
        await chrome.debugger.attach({ tabId: state.tabId }, "1.3");
      }
    }
    async function detachDebugger() { try { await chrome.debugger.detach({ tabId: state.tabId }); } catch { /* 탭이 이동했을 수 있다 */ } }
    async function withDebugger(task) {
      await attachDebugger();
      try {
        await debuggerCommand("Input.setIgnoreInputEvents", { ignore: false });
        return await task();
      } finally { await detachDebugger(); }
    }
    const enterKey = async (type) => debuggerCommand("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });

    // ---- adapter 인터페이스 ----
    return {
      state,
      ownEditorUrl,

      async ensureAlive() {
        const tab = await getTab();
        if (!ownEditorUrl(tab.url, state.blogId)) throw new TaskError("TAB_NAVIGATED", "네이버 글쓰기 탭이 다른 화면으로 이동했습니다. 입력된 내용은 네이버 임시 저장에 남아 있을 수 있습니다.");
      },

      // 본인 블로그의 비어 있는 새 글쓰기 화면을 준비한다. 기존 글이 들어 있는 탭은 건드리지 않고 새 탭을 연다.
      async prepareEditor({ blogId, progress = () => {}, isCancelled = () => false }) {
        state.blogId = blogId;
        state.editorFrame = null;
        state.settingsFrame = null;
        const url = `https://blog.naver.com/${encodeURIComponent(blogId)}/postwrite`;
        let tab = null;
        const existing = (await chrome.tabs.query({ url: "https://blog.naver.com/*" })).filter((candidate) => ownEditorUrl(candidate.url, blogId));
        for (const candidate of existing) {
          try {
            const inspection = await inspectTab(candidate.id);
            if (inspection.status === "valid" && !inspection.hasContent && !inspection.dialogOpen) { tab = candidate; break; }
          } catch { /* 이 탭은 쓰지 않는다 */ }
        }
        // 내용이 있는 기존 글쓰기 탭은 그대로 두고(회원이 쓰던 글 보호) 새 탭을 연다.
        if (!tab) tab = await chrome.tabs.create({ url, active: true });
        state.tabId = tab.id;
        await focusWindow(tab);

        const deadline = now() + loginWaitMs;
        let stableSince = 0;
        let lastMessage = "";
        const say = (message) => { if (message !== lastMessage) { lastMessage = message; progress(message); } };
        while (now() < deadline) {
          if (isCancelled()) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다.");
          const current = await getTab();
          if (current.status === "loading") { stableSince = 0; await sleep(500); continue; }
          let currentUrl;
          try { currentUrl = new URL(current.url || "about:blank"); } catch { await sleep(500); continue; }
          if (currentUrl.hostname === "www.naver.com") { // 로그인 뒤 네이버 첫 화면으로 돌아온 경우
            await chrome.tabs.update(state.tabId, { url });
            stableSince = 0; await sleep(700); continue;
          }
          if (currentUrl.hostname === "nid.naver.com") { stableSince = 0; say("네이버 로그인이 필요합니다. 열린 Chrome 창에서 로그인해 주세요. 완료되면 자동으로 이어서 입력합니다."); await sleep(1000); continue; }
          if (currentUrl.hostname === "blog.naver.com" && !ownEditorUrl(current.url, blogId)) {
            // 로그인 뒤 블로그 홈 등으로 이동한 경우 글쓰기 화면으로 다시 보낸다(내용이 있는 탭이 아님: 우리가 연 탭이거나 비어 있음을 확인한 탭)
            await chrome.tabs.update(state.tabId, { url });
            stableSince = 0; await sleep(700); continue;
          }
          let dismissed = false;
          try {
            const dialogs = await readAllFrames("dismissResume");
            const blocked = dialogs.find((entry) => entry.result?.ok === false && entry.result.error);
            if (blocked) throw new TaskError("RESUME_DIALOG", blocked.result.error);
            // 취소 버튼 클릭은 임시 저장 복원 창을 닫는 동작이라 단일 프레임이 보이는 한 곳에서만 일어난다(보이는 창만 처리됨).
            dismissed = dialogs.some((entry) => entry.result?.dismissed);
          } catch (error) { if (error instanceof TaskError) throw error; }
          if (dismissed) { stableSince = 0; await sleep(500); continue; }
          const inspection = await inspectTab();
          if (inspection.status === "security_check") { stableSince = 0; say(inspection.reason); await sleep(1000); continue; }
          if (inspection.status === "expired") { stableSince = 0; say(inspection.reason); await sleep(1000); continue; }
          if (inspection.status === "account_mismatch") throw new TaskError("ACCOUNT_MISMATCH", `${inspection.reason} (연결한 블로그 ID: ${blogId})`);
          if (inspection.status === "valid") {
            if (inspection.hasContent) throw new TaskError("EDITOR_NOT_EMPTY", "새 글쓰기 화면에 이전 내용이 남아 있어 입력하지 않았습니다. 임시글 이어쓰기를 취소하고 빈 화면에서 다시 보내주세요.");
            if (inspection.dialogOpen) { stableSince = 0; await sleep(500); continue; }
            // 임시글 복원 창이 첫 확인 뒤에 나타날 수 있어, 빈 편집기가 2초 이상 안정적으로 보일 때만 받아들인다.
            if (!stableSince) stableSince = now();
            if (now() - stableSince >= 2000) { state.editorFrame = inspection.frameId; return; }
          } else stableSince = 0;
          await sleep(500);
        }
        throw new TaskError("EDITOR_PREPARATION_FAILED", "5분 안에 글쓰기 화면을 준비하지 못했습니다. 네이버 로그인·알림 창을 확인한 뒤 BLOG에서 다시 보내주세요.");
      },

      async snapshot() {
        const result = await editorCommand("snapshot");
        if (!result?.ok) throw new Error(result?.error || result?.reason || "편집기 내용을 읽지 못했습니다.");
        return { title: result.title, blocks: result.blocks };
      },

      async focusTitle() {
        await focusWindow(await getTab());
        await sleep(between(350, 600));
        const result = await editorCommand("focus", { kind: "title" });
        if (!result?.ok) throw new TaskError("FOCUS_FAILED", result?.reason || result?.error || "제목 입력 위치를 찾지 못했습니다. 네이버 글쓰기 화면을 새로 연 뒤 다시 시도하세요.");
      },

      async focusBody() {
        const result = await editorCommand("focus", { kind: "body" });
        if (!result?.ok) throw new TaskError("FOCUS_FAILED", result?.reason || result?.error || "본문 입력 위치를 찾지 못했습니다.");
      },

      // 사람처럼 한 글자씩(70~170ms, 가끔 쉼). 줄바꿈은 Enter 키.
      async typeText(value, { onProgress = () => {}, shouldStop = () => false } = {}) {
        const text = String(value || "").replace(/\r\n/g, "\n");
        let pending = 0;
        await withDebugger(async () => {
          for (const character of text) {
            if (shouldStop()) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다. 네이버 편집기에 입력된 내용은 그대로 남아 있습니다.");
            if (character === "\n") { await enterKey("keyDown"); await enterKey("keyUp"); }
            else await debuggerCommand("Input.insertText", { text: character });
            pending += 1;
            if (pending >= 20) { onProgress(pending); pending = 0; }
            await sleep(between(TYPE_MIN_MS, TYPE_MAX_MS));
            if (random() < THINK_CHANCE) await sleep(between(THINK_MIN_MS, THINK_MAX_MS));
          }
        });
        if (pending) onProgress(pending);
      },

      // 링크가 걸린 HTML을 사람이 붙여넣듯 "붙여넣기" 이벤트로 넣는다. 커서가 실제로 있는 편집 프레임 한 곳에서만 한 번 실행한다.
      async pasteLink(label, url) {
        const probes = await readAllFrames("focusProbe");
        const candidates = probes.filter((entry) => entry.result?.editable);
        const best = candidates.find((entry) => entry.result.focused) || (candidates.length === 1 ? candidates[0] : null);
        if (!best) return { linked: false, inserted: false, reason: "focused editor frame not found" };
        return runInFrame(best.frameId, "pasteLink", { text: label, url });
      },

      async uploadImage(asset) {
        const [header, encoded] = String(asset.dataUrl || "").split(",", 2);
        if (!encoded || !header.startsWith("data:image/")) throw new TaskError("IMAGE_INVALID", "유효한 이미지 데이터가 없습니다.");
        const before = (await this.snapshot()).blocks.filter((block) => block.type === "image").length;
        const editorFrame = await resolveEditorFrame();
        await attachDebugger();
        try {
          await debuggerCommand("Page.setInterceptFileChooserDialog", { enabled: true });
          // 이미지 버튼이 윈도우 파일 선택 창을 띄우지 않게 막는다(SEO 스튜디오 v1.0.29에서 확인한 방식).
          const guard = (install) => chrome.scripting.executeScript({
            target: { tabId: state.tabId, allFrames: true }, world: "MAIN", args: [install],
            func: (enable) => {
              const key = Symbol.for("aimaster.blog.fileChooserGuard");
              window[key]?.();
              if (!enable) return;
              const onClick = (event) => { if (event.composedPath().some((node) => node instanceof HTMLInputElement && node.type === "file")) event.preventDefault(); };
              window.addEventListener("click", onClick, true);
              const original = HTMLInputElement.prototype.showPicker;
              const guarded = function (...args) { if (this.type !== "file") return original.apply(this, args); };
              if (original) HTMLInputElement.prototype.showPicker = guarded;
              const cleanup = () => {
                window.removeEventListener("click", onClick, true);
                if (original && HTMLInputElement.prototype.showPicker === guarded) HTMLInputElement.prototype.showPicker = original;
                clearTimeout(timer);
                delete window[key];
              };
              const timer = setTimeout(cleanup, 20000);
              window[key] = cleanup;
            },
          });
          await guard(true);
          try {
            const probes = await readAllFrames("imageUiProbe");
            const buttonFrame = (probes.find((entry) => entry.frameId === editorFrame && entry.result?.hasButton) || probes.find((entry) => entry.result?.hasButton))?.frameId;
            if (buttonFrame == null) throw new TaskError("IMAGE_BUTTON_MISSING", "네이버 이미지(사진) 버튼을 찾지 못했습니다. 사이드패널의 '구조 분석' 결과를 전달해주세요.");
            const clicked = await runInFrame(buttonFrame, "clickImageButton");
            if (!clicked?.clicked) throw new TaskError("IMAGE_BUTTON_MISSING", "네이버 이미지(사진) 버튼을 누르지 못했습니다.");
            await sleep(between(2300, 3000)); // 네이버가 파일 input을 만드는 시간
            const inputs = (await readAllFrames("imageUiProbe")).filter((entry) => entry.result?.hasInput);
            const inputFrame = (inputs.find((entry) => entry.frameId === buttonFrame) || inputs.find((entry) => entry.frameId === editorFrame) || inputs[inputs.length - 1])?.frameId;
            if (inputFrame == null) throw new TaskError("IMAGE_INPUT_MISSING", "네이버 이미지 업로드 입력을 찾지 못했습니다.");
            const set = await runInFrame(inputFrame, "setImageFile", { header, encoded, name: asset.name });
            if (!set?.ok) throw new TaskError("IMAGE_UPLOAD_FAILED", `네이버 이미지 업로드 처리 실패: ${set?.reason || set?.error || "알 수 없음"}`);
          } finally { try { await guard(false); } catch { /* ignore */ } }
        } finally {
          try { await debuggerCommand("Page.setInterceptFileChooserDialog", { enabled: false }); } catch { /* ignore */ }
          await detachDebugger();
        }
        // 편집기에 이미지가 정확히 한 장 늘 때까지 기다린다(두 장 이상 늘면 중복 업로드이므로 engine의 문서 비교가 잡는다).
        const deadline = now() + IMAGE_WAIT_MS;
        while (now() < deadline) {
          const count = (await this.snapshot()).blocks.filter((block) => block.type === "image").length;
          if (count > before) return;
          await sleep(500);
        }
        throw new TaskError("IMAGE_NOT_APPLIED", "이미지 파일은 선택됐지만 네이버 편집기에 반영된 것을 확인하지 못했습니다. 네이버 화면을 확인하세요. 같은 이미지를 다시 올리지 않고 중지합니다.");
      },

      async applyImageAi() {
        const result = await editorCommand("imageAi");
        if (!result?.ok) throw new Error(result?.error || "이미지 AI 활용 표시를 켜지 못했습니다.");
        return result;
      },

      async openPublishSettings() {
        await focusWindow(await getTab());
        const findSettings = async () => {
          const probes = await readAllFrames("settingsProbe");
          return probes.find((entry) => entry.result?.ready)?.frameId ?? null;
        };
        const already = await findSettings();
        if (already != null) { state.settingsFrame = already; return; }
        const probes = await readAllFrames("settingsProbe");
        const holders = probes.filter((entry) => entry.result?.hasPublishOpen > 0);
        if (holders.length !== 1 || holders[0].result.hasPublishOpen !== 1) throw new TaskError("PUBLISH_BUTTON_AMBIGUOUS", "발행 설정을 여는 발행 버튼을 하나로 확인하지 못했습니다. 사이드패널의 '구조 분석' 결과를 전달해주세요.");
        const clicked = await runInFrame(holders[0].frameId, "openPublishSettings");
        if (!clicked?.ok) throw new TaskError("PUBLISH_BUTTON_AMBIGUOUS", "발행 설정 버튼을 누르지 못했습니다.");
        for (let attempt = 0; attempt < 14; attempt += 1) {
          await sleep(300);
          const frameId = await findSettings();
          if (frameId != null) { state.settingsFrame = frameId; return; }
        }
        throw new TaskError("SETTINGS_NOT_OPEN", "발행 설정창이 열렸는지 확인하지 못했습니다. 마지막 발행 버튼은 자동으로 누르지 않았습니다.");
      },

      async applyTags(tags, { shouldStop = () => false } = {}) {
        const frameId = state.settingsFrame;
        if (frameId == null) throw new TaskError("SETTINGS_NOT_OPEN", "발행 설정창이 열려 있지 않습니다.");
        const requested = [...new Set(tags.map(tagKey).filter(Boolean))];
        const readState = async () => runInFrame(frameId, "tagState");
        const first = await readState();
        const hasRegistry = Array.isArray(first?.registered);
        const beforeTags = hasRegistry ? first.registered : [];
        if (new Set([...beforeTags, ...requested]).size > 30) throw new TaskError("TAG_LIMIT", "네이버 태그 한도 30개를 초과합니다. 기존 태그를 확인해 주세요.");
        for (const tag of requested) {
          if (shouldStop()) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다.");
          const current = await readState();
          if (Array.isArray(current?.registered) && current.registered.includes(tag)) continue;
          const focused = await runInFrame(frameId, "tagFocus");
          if (!focused?.ok) throw new TaskError("TAG_FAILED", focused?.reason || "태그 입력란을 선택하지 못했습니다.");
          await withDebugger(async () => {
            for (const character of tag) { await debuggerCommand("Input.insertText", { text: character }); await sleep(between(TYPE_MIN_MS, TYPE_MAX_MS)); }
            await enterKey("keyDown"); await enterKey("keyUp");
          });
          await sleep(between(300, 600));
          const after = await readState();
          const accepted = Array.isArray(after?.registered) ? after.registered.includes(tag) && !after.inputValue : after?.inputValue === "";
          if (!accepted) throw new TaskError("TAG_FAILED", `태그가 등록되지 않았습니다: ${tag}. 네이버 설정창의 안내를 확인해주세요.`);
        }
        const final = await readState();
        if (Array.isArray(final?.registered) && !requested.every((tag) => final.registered.includes(tag))) throw new TaskError("TAG_FAILED", "일부 태그가 누락됐습니다. 네이버 설정창을 확인해주세요.");
        return Array.isArray(final?.registered) ? final.registered : requested;
      },

      async applyCategory(name) {
        const frameId = state.settingsFrame;
        if (frameId == null) throw new TaskError("SETTINGS_NOT_OPEN", "발행 설정창이 열려 있지 않습니다.");
        const result = await runInFrame(frameId, "categorySelect", { name });
        if (!result?.ok) throw new TaskError("CATEGORY_FAILED", `${result?.reason || result?.error || "카테고리를 선택하지 못했습니다."}${result?.available?.length ? ` (네이버 카테고리: ${result.available.join(", ")})` : ""}`);
        return { name: result.name, id: result.id };
      },

      // 구조 분석(오류 보고용): 모든 프레임의 읽기 조사
      async inspectStructure(tabId) {
        const entries = await readAllFrames("inspect", { blogId: state.blogId }, tabId);
        return entries;
      },

      async cleanup() { await detachDebugger(); },
    };
  }

  const api = { createNaverAdapter, tagKey, TYPE_MIN_MS, TYPE_MAX_MS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BlogNaverAdapter = api;
})(typeof self !== "undefined" ? self : globalThis);
