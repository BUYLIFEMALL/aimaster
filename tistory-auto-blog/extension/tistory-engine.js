"use strict";

// 티스토리 입력기 — 입력 순서·검증 엔진(2026-10-10, v1.59).
// 티스토리 화면을 직접 만지는 일은 adapter(tistory-adapter.js)가 하고, 이 엔진은 "무엇을 어떤 순서로 넣고, 매 단계 결과가 기대대로인지 확인하고, 아니면 멈출지"만 결정한다.
// 그래서 가짜 adapter로 기존 내용·입력 누락·서식 소실·탭 닫힘·중지 같은 상황을 모두 시험할 수 있다(tests/extension-engine.test.cjs).
//
// 안전 원칙(BLOG(ai-auto-blog) 엔진과 같은 뼈대 + 티스토리 운영 기준서 docs/OPERATIONS_HANDOFF.md):
//  - 시작 전 편집기는 비어 있어야 한다. 기존 내용은 절대 지우거나 덮어쓰지 않고 중지한다.
//  - 한 단계(제목 / 문단 / 서식 블록 / 이미지)를 넣을 때마다 결과를 확인한다. 티스토리는 TinyMCE가 HTML을 다시 구성하므로 문서 전체의 문자열 완전 일치가 아니라
//    "사람이 보는 텍스트의 앞·뒤 조각 + 의미 구조(제목·목록·인용·표·링크)"로 확인한다(원칙 3).
//  - 확인에 실패하면 같은 단계를 다시 입력하지 않고 즉시 중지한다(부분 입력 초안은 발행하지 않는다, 원칙 5). 예외: 서식 블록의 텍스트가 통째로 사라졌을 때만 그 블록의 글자를 한 번 복구 입력한다(기존 동작).
//  - 본문의 #태그는 티스토리 태그가 아니다. 태그 칩이 실제로 생성된 것을 확인해야 성공이다(원칙 4).
//  - 마지막 저장·발행 버튼은 누르지 않는다. 입력 완료 → 발행 설정(카테고리·태그·공개 범위 등)까지만 하고 준비 완료로 알린다.
(function (root) {
  const Core = root.TistoryCore || require("./tistory-core.js");
  const sleepDefault = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  class TaskError extends Error {
    constructor(code, message, extra = {}) {
      super(message);
      this.name = "TaskError";
      this.code = code;
      Object.assign(this, extra);
    }
  }

  const DEFAULT_PUBLISH = { category: "", visibility: "public", comment: "allow", topic: "", timing: "now", reserveDate: "", reserveTime: "" };

  async function runInputTask({ task, adapter, blogName, progress = () => {}, report, isCancelled = () => false, sleep = sleepDefault, settleTries = 12, settleDelayMs = 250 }) {
    const title = String(task.title || "").trim();
    const blocks = Array.isArray(task.blocks) ? task.blocks : [];
    if (!title) throw new TaskError("EMPTY_TITLE", "글 제목이 비어 있어 입력하지 않았습니다.");
    if (!blocks.length) throw new TaskError("EMPTY_BODY", "입력할 본문이 없습니다.");
    const publish = { ...DEFAULT_PUBLISH, ...(task.publish || {}) };
    const tags = Core.normalizeTags(task.tags);

    let stage = "preparing";
    const emit = (nextStage, message, extra) => { stage = nextStage; progress(nextStage, message, extra); };
    adapter.setStatus?.((message) => progress(stage, message));
    const checkpoint = async () => {
      if (isCancelled()) throw new TaskError("CANCELLED", "사용자가 입력을 중지했습니다. 티스토리 편집기에 입력된 내용은 그대로 남아 있습니다.");
      await adapter.ensureAlive();
    };
    const fail = (code, message) => { throw new TaskError(code, message); };

    // ---- 1. 편집기 준비: 본인 블로그 · 로그인 · 비어 있는 새 글 ----
    emit("preparing", "티스토리 글쓰기 화면을 준비하는 중...");
    await adapter.prepareEditor({ blogName, progress: (message) => emit("preparing", message), isCancelled });
    await checkpoint();
    const initial = await adapter.readDraft();
    if (Core.normalize(initial.title) || Core.normalize(initial.body) || initial.tagCount || initial.imageCount) {
      fail("EDITOR_NOT_EMPTY", "새 글쓰기 화면이 비어 있지 않아 입력하지 않았습니다. 기존 내용은 그대로 보존했습니다. 빈 글쓰기 화면에서 다시 보내주세요.");
    }

    const textOf = (block) => Core.expectedBlockText(block);
    const totalChars = title.length + blocks.reduce((sum, block) => sum + (block.type === "text" || block.type === "link" || block.type === "html" ? String(textOf(block) || "").length : 0), 0);
    let typedChars = 0;
    const onTyped = (count) => {
      typedChars += count;
      emit("typing", `티스토리 편집기에 입력 중... ${Math.min(typedChars, totalChars).toLocaleString()}/${totalChars.toLocaleString()}자`, { typedChars, totalChars });
    };
    const type = async (text) => adapter.typeText(text, { onProgress: onTyped, shouldStop: isCancelled });

    // ---- 2. 제목 ----
    emit("typing", "제목을 입력하는 중...", { typedChars, totalChars });
    await checkpoint();
    await adapter.focusTitle();
    await type(title);
    let titleOk = false;
    for (let attempt = 0; attempt < settleTries && !titleOk; attempt += 1) {
      const draft = await adapter.readDraft();
      titleOk = Core.normalize(draft.title) === Core.normalize(title);
      if (!titleOk) await sleep(settleDelayMs);
    }
    if (!titleOk) fail("TITLE_MISMATCH", "제목 입력 결과가 원고와 다릅니다. 티스토리 화면을 확인하세요. 같은 입력을 다시 하지 않고 중지했습니다.");

    // ---- 3. 본문 블록 순서대로 ----
    await adapter.focusBody();
    const warnings = [];
    const totalImages = blocks.filter((block) => block.type === "image" && !block.skip).length;
    let placedImages = 0;
    let skippedImages = 0;
    for (const block of blocks) {
      await checkpoint();
      if (block.type === "image") {
        if (block.skip || !block.url) { skippedImages += 1; continue; }
        placedImages += 1;
        emit("image", `이미지 ${placedImages}/${totalImages}장을 티스토리에 올리는 중...`, { typedChars, totalChars });
        await adapter.pasteImage(block.url, placedImages, totalImages);
        continue;
      }
      if (block.type === "html") {
        emit("typing", "본문 서식을 티스토리 편집기에 넣는 중...", { typedChars, totalChars });
        await adapter.insertHtml(`${block.html}<p><br></p>`);
        const hasText = await adapter.containsText(block.text);
        const keepsStructure = await adapter.keepsStructure(block.html);
        if (!(hasText && keepsStructure)) {
          // 텍스트만 남았다고 정상으로 보면 제목·목록 등 구조가 사라진 채 저장될 수 있다 — 평문으로 복구하지 않고 중단한다.
          if (hasText) fail("STRUCTURE_LOST", "본문 텍스트는 들어갔지만 제목·목록 등 서식 구조가 티스토리 편집기에 남지 않았습니다. 티스토리 화면을 확인하고 새 빈 글에서 다시 보내주세요.");
          // 티스토리가 서식을 비동기로 비워 버린 경우에만, 그 블록의 글자라도 누락되지 않게 실제 키보드 입력으로 한 번만 복구한다.
          await adapter.focusBody();
          await type(`${block.text}\n\n`);
          if (!await adapter.containsText(block.text, 16)) fail("TEXT_MISMATCH", "본문 서식 블록의 텍스트가 티스토리 편집기에 남지 않았습니다. 같은 부분을 다시 입력하지 않고 중지했습니다.");
        } else onTyped(String(block.text || "").length);
        continue;
      }
      // 문단·링크(링크는 글자와 주소를 함께 입력하면 티스토리가 자동 링크로 바꾼다)
      const value = textOf(block);
      emit("typing", "본문을 입력하는 중...", { typedChars, totalChars });
      await type(`${value}\n\n`);
      if (!await adapter.containsText(value, 16)) fail("TEXT_MISMATCH", "입력한 본문 텍스트가 티스토리 편집기에 남지 않았습니다. 같은 부분을 다시 입력하지 않고 중지했습니다.");
    }
    if (skippedImages) warnings.push(`이미지 ${skippedImages}장은 불러오지 못해(보관 기간이 지났을 수 있습니다) 건너뛰었습니다.`);

    // ---- 4. 발행 전 저장 동기화와 전체 확인 ----
    await checkpoint();
    emit("verifying", "입력한 전체 내용을 원고와 대조하는 중...", { typedChars, totalChars });
    const groups = blocks.filter((block) => block.type === "text" || block.type === "html" || block.type === "link").map((block) => Core.verificationSamples(textOf(block)));
    const verifyAll = async () => {
      const draft = await adapter.readDraft();
      if (Core.normalize(draft.title) !== Core.normalize(title)) fail("TITLE_MISMATCH", "입력된 제목을 다시 확인하지 못했습니다. 티스토리 화면을 확인하세요.");
      const match = Core.matchTextBlocks(blocks, draft.body);
      if (match.total > 0 && (match.bodyEmpty || match.matched < match.total)) fail("TEXT_MISMATCH", `입력된 본문을 다시 확인하지 못했습니다. (확인 ${match.matched}/${match.total}개 문단) 부분 입력된 글은 발행하지 말고 새 빈 글에서 다시 보내주세요.`);
      if (draft.imageCount !== placedImages) fail("IMAGE_MISMATCH", `입력된 이미지 수가 다릅니다. (티스토리 ${draft.imageCount}장 / 원고 ${placedImages}장) 같은 이미지를 다시 올리지 않고 중지했습니다.`);
      return match;
    };
    const syncAll = async () => {
      try { return await adapter.syncForPublish(groups); }
      catch (error) { if (error instanceof TaskError) throw error; throw new TaskError("SYNC_FAILED", error?.message || "발행용 본문 저장 원본을 확인하지 못했습니다."); }
    };
    await syncAll();
    await verifyAll();

    const summary = { imageCount: placedImages, imageSkipped: skippedImages, warnings, typedChars, totalChars };
    await report("completed", "");

    // ---- 5. 발행 설정(카테고리·태그·공개 범위·댓글·홈주제·발행 시점). 마지막 저장·발행 버튼은 누르지 않는다 ----
    try {
      await checkpoint();
      emit("settings", "카테고리·태그·발행 설정을 적용하는 중...", { typedChars, totalChars });
      // 이전 실패가 남긴 모달은 카테고리·태그 입력을 가릴 수 있으므로 먼저 닫는다.
      await adapter.closePublishSettings();
      if (publish.category) await adapter.chooseCategory(publish.category);
      let registeredTags = 0;
      if (tags.length) registeredTags = (await adapter.addTags(tags))?.registered || tags.length;
      // 태그 반영 뒤 한 번 더 저장 원본을 맞춘다.
      await syncAll();
      const applied = await adapter.applyPublish(publish);
      await report("publish_ready", "");
      const visibility = applied?.visibility || (publish.visibility === "private" ? "비공개" : "공개");
      const timing = applied?.timing || (publish.timing === "reserve" ? "예약" : "현재");
      return { ...summary, status: "publish_ready", settingsApplied: true, category: publish.category, tagCount: registeredTags, message: `발행 직전 준비가 끝났습니다(${visibility}·${timing} 발행${registeredTags ? `, 태그 ${registeredTags}개` : ""}). 내용을 확인한 뒤 티스토리의 마지막 저장·발행 버튼만 직접 누르세요.` };
    } catch (error) {
      if (error instanceof TaskError && error.code === "CANCELLED") throw error;
      warnings.push(`카테고리·태그·발행 설정 자동 적용에 실패했습니다: ${error?.message || error}`);
      return { ...summary, status: "completed", settingsApplied: false, settingsError: String(error?.message || error), message: "제목·본문·이미지 입력은 끝났지만 카테고리·태그·발행 설정 적용에 실패했습니다. 티스토리 화면에서 직접 확인·설정하거나 BLOG에서 다시 보내주세요." };
    }
  }

  const api = { runInputTask, TaskError };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.TistoryEngine = api;
})(typeof self !== "undefined" ? self : globalThis);
