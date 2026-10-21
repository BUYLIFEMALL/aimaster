"use strict";
(function (root) {
  function postUrl(value, blogName) {
    try {
      const u = new URL(String(value));
      return u.protocol === "https:" && u.hostname === `${blogName}.tistory.com` && !u.username && !u.password && !u.port
        && /^\/(?:[1-9]\d*|entry\/[^/]+)\/?$/.test(u.pathname) ? `https://${u.hostname}${u.pathname.replace(/\/$/, "")}` : null;
    } catch { return null; }
  }
  function pageStep(command, args) {
    const norm = v => String(v || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
    const visible = e => Boolean(e?.getClientRects().length) && getComputedStyle(e).visibility !== "hidden";
    if (location.hostname !== `${args.blogName}.tistory.com`) return { ok: false };
    if (command === "published") {
      const managed = location.pathname.match(/^\/manage\/post\/([1-9]\d*)\/?$/);
      if (managed && managed[1] === String(args.postId || "") && norm(document.querySelector("#post-title-inp")?.value) === norm(args.title)) {
        // Read-only verification works even when the public viewer redirects to a custom domain.
        return { ok: true, url: `https://${args.blogName}.tistory.com/${managed[1]}` };
      }
      if (document.querySelector("#post-title-inp") || !/^\/(?:[1-9]\d*|entry\/[^/]+)\/?$/.test(location.pathname)) return { ok: false };
      const heading = [...document.querySelectorAll("h1,h2,h3,.title_view,.tit_post,.entry-title,.title-article")]
        .some(e => visible(e) && norm(e.textContent) === norm(args.title));
      return { ok: heading, url: location.href };
    }
    if (!/\/manage\/newpost\/?$/.test(location.pathname)) return { ok: false };
    const editor = (window.tinymce || window.tinyMCE)?.activeEditor;
    const body = editor?.getBody?.();
    const structure = body ? [...body.querySelectorAll("h1,h2,h3,h4,ul,ol,li,blockquote,table,a")].map(e => [e.tagName, e.tagName === "A" ? e.getAttribute("href") : null]) : [];
    if (command === "snapshot") return body ? { snapshot: { title: document.querySelector("#post-title-inp")?.value || "", body: body.innerText, imageCount: body.querySelectorAll(":scope > figure > img").length, structure } } : { ok: false };
    const snapshot = args.snapshot;
    if (!body || !snapshot || norm(document.querySelector("#post-title-inp")?.value) !== norm(snapshot.title)
      || norm(body.innerText) !== norm(snapshot.body) || body.querySelectorAll(":scope > figure > img").length !== snapshot.imageCount || JSON.stringify(structure) !== JSON.stringify(snapshot.structure)) return { ok: false };
    // Compare the already-rendered editor with its serialization, never rewrite it.
    const serialized = document.querySelector("textarea#editor-tistory")?.value || editor.getContent?.({ format: "raw" }) || "";
    const saved = document.createElement("div"); saved.innerHTML = serialized;
    const compact = value => norm(value).normalize("NFKC").replace(/\s/g, "");
    const savedStructure = [...saved.querySelectorAll("h1,h2,h3,h4,ul,ol,li,blockquote,table,a")].map(e => [e.tagName, e.tagName === "A" ? e.getAttribute("href") : null]);
    if (!serialized || compact(saved.textContent) !== compact(snapshot.body) || JSON.stringify(savedStructure) !== JSON.stringify(snapshot.structure)) return { ok: false };
    const dialogs = [...document.querySelectorAll(".editor_layer[role='dialog'],.editor_layer.ReactModal__Content--after-open")].filter(visible);
    if (dialogs.length !== 1) return { ok: false };
    const dialog = dialogs[0];
    const labels = { public: "공개", private: "비공개" };
    const radio = [...dialog.querySelectorAll("input[name='basicSet'][type='radio']")].find(input =>
      norm(dialog.querySelector(`label[for='${input.id}']`)?.textContent) === labels[args.publish.visibility]);
    const current = [...dialog.querySelectorAll("button.btn_date")].find(e => norm(e.textContent) === "현재");
    const selects = [...dialog.querySelectorAll("button.mce-btn-type1.select_btn")].filter(visible);
    const comment = args.publish.comment === "deny" ? "댓글 비허용" : "댓글 허용";
    const buttons = [...dialog.querySelectorAll("#publish-btn")].filter(visible);
    const privateNow = args.publish.visibility === "private" && dialog.querySelectorAll("button.btn_date").length === 0
      && buttons.length === 1 && norm(buttons[0].textContent) === "비공개 저장";
    if (!radio?.checked || args.publish.timing !== "now" || (!current?.classList.contains("on") && !privateNow) || !norm(selects[0]?.textContent).includes(comment)) return { ok: false };
    if (buttons.length !== 1 || buttons[0].disabled || !args.runId || globalThis.__tistoryFinalRun) return { ok: false };
    if (command === "check") return { ok: true };
    if (command !== "final") return { ok: false };
    globalThis.__tistoryFinalRun = args.runId;
    buttons[0].click();
    return { ok: true, clicked: true };
  }

  function createAdapter({ chrome, state, TaskError, sleep, attachDebugger }) {
    let watch = null;
    async function stopWatch() {
      if (!watch) return;
      chrome.debugger.onEvent.removeListener(watch.listener);
      try { await chrome.debugger.detach({ tabId: state.tabId }); } catch { /* navigated */ }
      watch = null;
    }
    const methods = {
      async publicationSnapshot() {
        const result = await chrome.scripting.executeScript({ target: { tabId: state.tabId, frameIds: [0] }, world: "MAIN", func: pageStep, args: ["snapshot", { blogName: state.blogName }] });
        if (!result[0]?.result?.snapshot) throw new TaskError("FINAL_CHECK_FAILED", "발행 직전 편집기 본문을 읽지 못했습니다.");
        return result[0].result.snapshot;
      },
      async watchPublication(onPostId) {
        await attachDebugger(state.tabId);
        const pending = new Set(), successful = new Set();
        watch = { url: null, armed: false, listener: null };
        const ownWatch = watch;
        ownWatch.listener = (source, method, params) => {
          if (source.tabId !== state.tabId || !ownWatch.armed) return;
          if (method === "Network.requestWillBeSent") {
            try {
              const u = new URL(params.request.url);
              if (u.hostname === `${state.blogName}.tistory.com` && params.request.method === "POST" && /^\/manage\/posts?(?:\.json|\/|$)/.test(u.pathname)) pending.add(params.requestId);
            } catch { /* unrelated request */ }
          }
          if (method === "Network.responseReceived" && pending.has(params.requestId) && params.response?.status >= 200 && params.response.status < 300) successful.add(params.requestId);
          if (method !== "Network.loadingFinished" || !pending.delete(params.requestId) || !successful.delete(params.requestId)) return;
          chrome.debugger.sendCommand({ tabId: state.tabId }, "Network.getResponseBody", { requestId: params.requestId }).then(result => {
            if (result.base64Encoded) return;
            const data = JSON.parse(result.body);
            if (data.success === false) return;
            for (const item of [data, data.data, data.result].filter(v => v && typeof v === "object")) {
              for (const key of ["entryUrl", "postUrl", "url", "redirectUrl"]) {
                if (!item[key]) continue;
                const value = new URL(item[key], `https://${state.blogName}.tistory.com`);
                const url = postUrl(value.href, state.blogName);
                if (url) ownWatch.url = url;
                // A numeric entry path from this own-blog save response maps to its Tistory alias.
                else if (["entryUrl", "postUrl"].includes(key) && /^\/[1-9]\d*\/?$/.test(value.pathname)) ownWatch.url = `https://${state.blogName}.tistory.com${value.pathname.replace(/\/$/, "")}`;
              }
              for (const key of ["postId", "entryId"]) if (/^[1-9]\d*$/.test(String(item[key] || ""))) ownWatch.url = `https://${state.blogName}.tistory.com/${item[key]}`;
            }
            const id = ownWatch.url?.match(/\/([1-9]\d*)$/)?.[1];
            if (id) Promise.resolve(onPostId?.(id)).catch(() => {});
          }).catch(() => {});
        };
        chrome.debugger.onEvent.addListener(ownWatch.listener);
        await chrome.debugger.sendCommand({ tabId: state.tabId }, "Network.enable");
      },
      async finalPublication(snapshot, publish, runId, final = false) {
        if (final && watch) watch.armed = true;
        const result = await chrome.scripting.executeScript({ target: { tabId: state.tabId, frameIds: [0] }, world: "MAIN", func: pageStep,
          args: [final ? "final" : "check", { blogName: state.blogName, snapshot, publish, runId }] });
        return result[0]?.result || { ok: false };
      },
      async publicationResult(title, savedPostId) {
        let navigated = false;
        for (let n = 0; n < 40; n++) {
          await sleep(1000);
          const tab = await chrome.tabs.get(state.tabId);
          const candidate = watch?.url || (/^[1-9]\d*$/.test(String(savedPostId || "")) ? `https://${state.blogName}.tistory.com/${savedPostId}` : null);
          const postId = candidate?.match(/\/([1-9]\d*)$/)?.[1];
          if (candidate && !navigated && !postUrl(tab.url, state.blogName)) {
            // Only follow the result of this editor's observed save request.
            await chrome.tabs.update(state.tabId, { url: postId ? `https://${state.blogName}.tistory.com/manage/post/${postId}` : candidate, active: true }); navigated = true;
          }
          const result = await chrome.scripting.executeScript({ target: { tabId: state.tabId, frameIds: [0] }, world: "MAIN", func: pageStep,
            args: ["published", { blogName: state.blogName, title, postId }] }).catch(() => []);
          const value = result[0]?.result;
          const url = value?.ok && postUrl(value.url, state.blogName);
          if (url && (!candidate || candidate === url)) return url;
        }
        throw new TaskError("PUBLICATION_UNCERTAIN", "실제 게시 URL/제목 확인이 지연됐습니다. 최종 발행을 다시 누르지 말고 결과만 확인하세요.");
      },
      stopPublicationWatch: stopWatch,
    };
    return methods;
  }
  const api = { pageStep, postUrl, createAdapter };
  root.TistoryPublication = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
