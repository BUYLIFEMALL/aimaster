"use strict";

// BLOG 네이버 입력기 — 입력 순서·검증 엔진(2026-10-10, v1.41).
// 네이버 화면을 직접 만지는 일은 adapter(naver-adapter.js)가 하고, 이 엔진은 "무엇을 어떤 순서로 넣고, 매 단계 문서가 정확히 기대대로인지 확인하고, 아니면 멈출지"만 결정한다.
// 그래서 가짜 adapter로 기존 내용 혼합·중복 입력·순서 뒤바뀜·탭 닫힘·중지 같은 상황을 모두 시험할 수 있다(tests/extension-engine.test.cjs).
//
// 안전 원칙(네이버 블로그 에이전트 writer.js와 같은 방식):
//  - 시작 전 편집기는 비어 있어야 한다. 기존 내용은 절대 지우거나 덮어쓰지 않고 중지한다.
//  - 한 단계(제목 / 글 덩어리 / 링크 / 이미지)를 넣을 때마다 문서를 다시 읽어 "지금까지 검증된 입력 + 방금 넣은 것"과 정확히 같은지 비교한다.
//  - 다르면(중복·섞임·누락) 같은 단계를 다시 입력하지 않고 즉시 중지한다 — 재시도가 중복 입력을 만들기 때문이다.
//  - 마지막 "발행" 버튼은 누르지 않는다. 입력 완료 → 발행 설정(카테고리·태그)까지만 하고 준비 완료로 알린다.
(function (root) {
  const Core = root.BlogCore || require("./blog-core.js");
  const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  class TaskError extends Error {
    constructor(code, message, extra = {}) {
      super(message);
      this.name = "TaskError";
      this.code = code;
      Object.assign(this, extra);
    }
  }

  function summarizeBlocks(blocks) {
    const list = Array.isArray(blocks) ? blocks : [];
    return {
      imageTotal: list.filter((block) => block.type === "image").length,
      textLength: list.reduce((sum, block) => sum + (block.type === "text" ? block.text.length : block.type === "link" ? block.text.length : 0), 0),
    };
  }

  async function runInputTask({ task, assets = {}, adapter, blogId, settings = {}, progress = () => {}, report, isCancelled = () => false, sleep = sleepDefault, settleTries = 12, settleDelayMs = 250 }) {
    const title = String(task.title || "").trim();
    const blocks = Array.isArray(task.blocks) ? task.blocks : [];
    if (!title) throw new TaskError("EMPTY_TITLE", "글 제목이 비어 있어 입력하지 않았습니다.");
    if (!blocks.length) throw new TaskError("EMPTY_BODY", "입력할 본문이 없습니다.");

    const checkpoint = async () => {
      if (isCancelled()) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다. 네이버 편집기에 입력된 내용은 그대로 남아 있습니다.");
      await adapter.ensureAlive();
    };
    const emit = (stage, message, extra) => progress(stage, message, extra);

    // 문서를 읽어 기대와 정확히 같아질 때까지 잠깐 기다린다(편집기가 입력을 반영하는 시간). 끝까지 다르면 마지막 차이를 돌려준다.
    const settle = async (expected, { expectTitle = null, allowEmptyTitle = false, tries = settleTries } = {}) => {
      let last = null;
      for (let attempt = 0; attempt < tries; attempt += 1) {
        const snapshot = await adapter.snapshot();
        const units = Core.unitsFromSnapshot(snapshot.blocks);
        const body = Core.compareUnits(expected.units, units);
        const titleOk = expectTitle === null ? (allowEmptyTitle || !Core.normalize(snapshot.title) ? true : false) : Core.titleMatches(expectTitle, snapshot.title);
        if (body.ok && titleOk) return { ok: true, snapshot };
        last = { ok: false, snapshot, body, titleOk };
        await sleep(settleDelayMs);
      }
      return last;
    };

    const fail = (code, message) => { throw new TaskError(code, message); };

    // ---- 1. 편집기 준비: 본인 블로그 · 로그인 · 비어 있는 새 글 ----
    emit("preparing", "네이버 글쓰기 화면을 준비하는 중...");
    await adapter.prepareEditor({ blogId, progress: (message) => emit("preparing", message), isCancelled });
    await checkpoint();

    const initial = await adapter.snapshot();
    if (Core.normalize(initial.title) || Core.unitsFromSnapshot(initial.blocks).length) {
      fail("EDITOR_NOT_EMPTY", "새 글쓰기 화면이 비어 있지 않아 입력하지 않았습니다. 기존 내용은 그대로 보존했습니다. 빈 글쓰기 화면에서 다시 보내주세요.");
    }

    const expected = Core.createExpected();
    const { imageTotal } = summarizeBlocks(blocks);
    const totalChars = title.length + blocks.reduce((sum, block) => sum + (block.type === "text" || block.type === "link" ? block.text.length : 0), 0);
    let typedChars = 0;
    const onTyped = (count) => {
      typedChars += count;
      emit("typing", `네이버 편집기에 입력 중... ${Math.min(typedChars, totalChars).toLocaleString()}/${totalChars.toLocaleString()}자`, { typedChars, totalChars });
    };
    const type = async (text) => adapter.typeText(text, { onProgress: onTyped, shouldStop: isCancelled });

    // ---- 2. 제목 ----
    emit("typing", "제목을 입력하는 중...", { typedChars, totalChars });
    await checkpoint();
    await adapter.focusTitle();
    await type(title);
    const titleCheck = await settle(expected, { expectTitle: title });
    if (!titleCheck.ok) {
      fail("TITLE_MISMATCH", !titleCheck.titleOk
        ? "제목 입력 결과가 원고와 다릅니다. 네이버 화면을 확인하세요. 같은 입력을 다시 하지 않고 중지했습니다."
        : `제목을 넣는 중 본문이 바뀌었습니다. ${titleCheck.body.reason} 중지했습니다.`);
    }

    // ---- 3. 본문 블록 순서대로 ----
    let previous = null; // text | link | image
    // 입력 위치를 새로 잡아야 하는 때: 본문의 첫 블록(제목 입력 직후) 또는 이미지 바로 뒤(네이버가 만든 새 빈 문단). 글·링크 뒤에는 커서가 이미 끝에 있다.
    const needsFocus = (last) => last === null || last === "image";
    let imageIndex = 0;
    let linkedCount = 0;
    const skippedImages = [];
    const warnings = [];
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      await checkpoint();
      // 직전 단계 이후 문서가 우리가 기대한 그대로인지 먼저 확인한다(외부에서 편집·붙여넣기·자동저장 복원이 있었는지).
      const before = await settle(expected, { expectTitle: title });
      if (!before.ok) fail("DOCUMENT_CHANGED", `다음 입력 전에 네이버 문서가 예상과 달라졌습니다. ${before.body?.reason || "제목이 바뀌었습니다."} 기존 내용은 보존하고 중지했습니다.`);

      if (block.type === "image") {
        const asset = assets[index];
        if (!asset?.dataUrl) { skippedImages.push(index); continue; }
        imageIndex += 1;
        emit("image", `이미지 ${imageIndex}/${imageTotal - skippedImages.length}장을 네이버에 올리는 중...`, { typedChars, totalChars });
        await adapter.uploadImage(asset);
        expected.addImage();
        const check = await settle(expected, { expectTitle: title });
        if (!check.ok) fail("IMAGE_MISMATCH", `이미지 ${imageIndex}번째 업로드 결과가 예상과 다릅니다. ${check.body?.reason || ""} 같은 이미지를 다시 올리지 않고 중지했습니다.`);
        previous = "image";
        await sleep(0);
        continue;
      }

      if (block.type === "link") {
        // 커서는 글을 입력한 직후 이미 문서 끝에 있다. 글·링크 다음에는 다시 클릭하지 않는다 — SmartEditor는 클릭한 "화면 위치"에 커서를 두므로
        // 여러 줄 문단을 다시 클릭하면 문단 중간에 들어간다(v1.46 실제 시험: 추천 링크가 마지막 문단 중간에 붙음). 본문 시작·이미지 뒤에만 입력 위치를 잡는다.
        if (needsFocus(previous)) await adapter.focusBody();
        if (previous === "text" || previous === "link") await type("\n\n");
        emit("typing", `링크를 넣는 중... (${block.text})`, { typedChars, totalChars });
        // 붙여넣기가 됐는지는 붙여넣은 프레임의 개수가 아니라 **편집기 문서의 실제 상태**로 판단한다.
        // (v1.44 실제 시험: 붙여넣기는 성공했는데 입력용 프레임에서는 변화가 안 보여 "무시됨"으로 오판하고 같은 링크를 글자로 한 번 더 넣었다.)
        const linksBefore = Core.countLinks((await adapter.snapshot()).blocks, block.url);
        await adapter.pasteLink(block.text, block.url);
        const withPaste = expected.clone();
        withPaste.addText(block.text);
        const outcome = await settle(withPaste, { expectTitle: title, tries: settleTries * 2 });
        if (outcome.ok) {
          if (Core.countLinks(outcome.snapshot.blocks, block.url) > linksBefore) linkedCount += 1;
          expected.addText(block.text);
        } else {
          // 문서가 붙여넣기 전 그대로일 때만 "무시됨"으로 보고 글자로 입력한다. 그 밖의 차이(중복·섞임)는 중지한다.
          const unchanged = await settle(expected, { expectTitle: title, tries: 2 });
          if (!unchanged.ok) fail("LINK_MISMATCH", `링크 붙여넣기 결과가 예상과 다릅니다. ${outcome.body?.reason || ""} 같은 링크를 다시 넣지 않고 중지했습니다.`);
          await type(`${block.text}: ${block.url} `);
          expected.addText(`${block.text}: ${block.url}`);
          const check = await settle(expected, { expectTitle: title });
          if (!check.ok) fail("LINK_MISMATCH", `링크 입력 결과가 예상과 다릅니다. ${check.body?.reason || ""} 같은 링크를 다시 넣지 않고 중지했습니다.`);
        }
        previous = "link";
        continue;
      }

      // 글 덩어리
      const prefix = previous === "link" ? "\n\n" : "";
      if (needsFocus(previous)) await adapter.focusBody();
      await type(prefix + block.text);
      expected.addText(block.text);
      const check = await settle(expected, { expectTitle: title });
      if (!check.ok) fail("TEXT_MISMATCH", `본문 입력 결과가 원고와 다릅니다. ${check.body?.reason || ""} 같은 부분을 다시 입력하지 않고 중지했습니다.`);
      previous = "text";
      await sleep(0);
    }

    // ---- 4. 이미지 AI 활용 표시: 회원이 사이드패널에서 켠 경우에만(기본 꺼짐, v1.49). 실패해도 입력은 유지하고 경고로만 알린다 ----
    const placedImages = expected.imageCount();
    if (placedImages > 0 && settings.imageAi === true) {
      await checkpoint();
      emit("verifying", "이미지 AI 활용 표시를 설정하는 중...", { typedChars, totalChars });
      try { await adapter.applyImageAi(); } catch (error) { warnings.push(`이미지 AI 활용 표시를 자동으로 켜지 못했습니다: ${error.message || error}`); }
    }

    // ---- 5. 전체 확인 ----
    emit("verifying", "입력한 전체 내용을 원고와 대조하는 중...", { typedChars, totalChars });
    const finalCheck = await settle(expected, { expectTitle: title });
    if (!finalCheck.ok) fail("FINAL_MISMATCH", `전체 대조에서 원고와 다릅니다. ${finalCheck.body?.reason || "제목이 다릅니다."} 네이버 화면을 확인하세요.`);

    const summary = {
      imageCount: placedImages,
      imageSkipped: skippedImages.length,
      linkCount: blocks.filter((block) => block.type === "link").length,
      linkedCount,
      warnings,
    };
    if (summary.imageSkipped) warnings.push(`이미지 ${summary.imageSkipped}장은 불러오지 못해(보관 기간이 지났을 수 있습니다) 건너뛰었습니다.`);
    await report("completed", "");

    // ---- 6. 발행 설정(카테고리·태그). 마지막 발행 버튼은 누르지 않는다 ----
    // 카테고리·태그는 BLOG에서 완성해 글과 함께 보낸 값만 쓴다(카테고리: 회원이 고른 실제 네이버 카테고리 번호+이름, 태그: 글의 해시태그).
    const rawCategory = task.category;
    const category = rawCategory && /^\d{1,12}$/.test(String(rawCategory.id)) && String(rawCategory.name || "").trim() ? { id: String(rawCategory.id), name: String(rawCategory.name).trim() } : null;
    const tags = (Array.isArray(task.tags) ? task.tags : []).slice(0, 30);
    if (!category && !tags.length) {
      return { ...summary, status: "completed", settingsApplied: false, message: "제목·본문·이미지 입력을 끝냈습니다. 보낸 글에 카테고리·태그가 없어 발행 설정창은 열지 않았습니다. 내용을 확인하고 네이버에서 직접 발행하세요." };
    }
    try {
      await checkpoint();
      emit("settings", "발행 설정창에서 카테고리·태그를 입력하는 중...", { typedChars, totalChars });
      await adapter.openPublishSettings();
      if (tags.length) await adapter.applyTags(tags, { shouldStop: isCancelled });
      if (category) await adapter.applyCategory(category);
      await report("publish_ready", "");
      return { ...summary, status: "publish_ready", settingsApplied: true, tagCount: tags.length, category: category ? category.name : "", message: "발행 직전 준비가 끝났습니다. 내용을 확인한 뒤 네이버의 마지막 발행 버튼만 직접 누르세요." };
    } catch (error) {
      if (error instanceof TaskError && error.code === "CANCELLED") throw error;
      warnings.push(`카테고리·태그 자동 입력에 실패했습니다: ${error.message || error}`);
      return { ...summary, status: "completed", settingsApplied: false, settingsError: String(error.message || error), message: "제목·본문·이미지 입력은 끝났지만 카테고리·태그 자동 입력에 실패했습니다. 네이버에서 직접 입력하거나 BLOG에서 카테고리를 확인해 다시 보내주세요." };
    }
  }

  const api = { runInputTask, TaskError, summarizeBlocks };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BlogEngine = api;
})(typeof self !== "undefined" ? self : globalThis);
