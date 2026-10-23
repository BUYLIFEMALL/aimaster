const SEO_PUBLISH_OUTBOX = "seo_publish_outbox_v1";
async function persistPublication() {
  // Resume identifiers only: generated titles, body, images and private URLs
  // are always re-read through the member/30-day server gate.
  // aliveAt: the panel running this run refreshes it every 15s, so another
  // panel can tell a live run from one cut off by closing/reloading the panel.
  const { draftId, runId, tabId } = seoPublication;
  await chrome.storage.local.set({ [SEO_PUBLISH_OUTBOX]: { draftId, runId, tabId, aliveAt: Date.now() } });
}
const SEO_ALIVE_TIMEOUT_MS = 60 * 1000;
// 2026-10-23: the run lives in this side panel, so closing or reloading it stops
// the code without any report. On open, close out such a run right away instead
// of waiting for the server's 20-minute cleanup. Only "writing" is touched:
// publishing/uncertain still go through the result check, never a new click.
async function recoverInterruptedPublication() {
  const saved = (await chrome.storage.local.get(SEO_PUBLISH_OUTBOX))[SEO_PUBLISH_OUTBOX];
  if (!saved?.runId || seoAutoBusy || Date.now() - Number(saved.aliveAt || 0) < SEO_ALIVE_TIMEOUT_MS) return;
  const recovering = { ...saved };
  seoPublication = recovering;
  try {
    const state = await publicationApi("status");
    if (state.state !== "writing" || seoAutoBusy) return;
    await publicationApi("failed", { error: "사이드패널이 닫히거나 확장이 새로고침되어 입력이 중간에 멈췄습니다. 최종 발행 버튼은 누르지 않았습니다." });
    $("generateStatus").textContent = "이전 자동 포스팅이 사이드패널이 닫혀 중간에 멈춰 정리했습니다. 네이버 탭의 입력 중이던 글은 확인 후 지우고 다시 시작하세요.";
  } finally {
    if (!seoAutoBusy && seoPublication?.runId === recovering.runId) seoPublication = null;
  }
}

async function publicationApi(action, details = {}) {
  const run = seoPublication;
  if (!run?.draftId) throw new Error("자동 발행할 원고가 없습니다.");
  const response = await fetch(`${BASE}/api/extension/drafts/library/${encodeURIComponent(run.draftId)}/auto-publish`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
    body: JSON.stringify({ action, runId: run.runId, ...details }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.publication) throw new Error(result.error || "발행 결과를 기록하지 못했습니다. 다시 발행하지 말고 결과 확인을 실행하세요.");
  seoPublication = { ...run, ...result.publication, title: plainText(result.title || run.title || "") };
  await persistPublication();
  return result.publication;
}
async function publicationPage(command, details = {}) {
  const run = seoPublication;
  const tab = await chrome.tabs.get(run.tabId);
  if (!/^https:\/\/blog\.naver\.com\//.test(tab.url || "")) throw new Error("자동 발행 전용 탭이 다른 사이트로 이동했습니다.");
  const results = await chrome.scripting.executeScript({ target: { tabId: run.tabId, allFrames: true }, func: seoAutoPublishPage,
    args: [command, { blogId: run.blogId, visibility: run.visibility, title: run.title, runId: run.runId, ...details }] });
  return results.map(item => item.result).find(item => item?.ok || item?.complete) || { ok: false };
}
function autoExpectedContent() {
  const blocks = activeWebDraftBlocks;
  const body = blocks.length ? blocks.filter(block => block.type === "text").map(block => block.text.trim()).filter(Boolean).join("\n\n") : activeWebDraftBody;
  const slots = blocks.length ? blocks.filter(block => block.type === "image").map(block => block.slot)
    : [...(activeWebDraftCoverDataUrl ? ["cover"] : []), ...activeWebDraftContentImages.map(image => image.slot)];
  for (const slot of slots) if (slot === "cover" ? !activeWebDraftCoverDataUrl : !activeWebDraftContentImages.some(image => image.slot === slot && image.dataUrl)) throw new Error("필요한 원고 이미지를 불러오지 못했습니다. 이미지 없이 발행하지 않습니다.");
  const draft = webDrafts.find(item => item.id === activeWebDraftId);
  if (!blocks.length && ((draft?.image_summary?.cover && !activeWebDraftCoverDataUrl) || Number(draft?.image_summary?.contentCount || 0) !== activeWebDraftContentImages.length)) throw new Error("원고에 저장된 이미지가 모두 준비되지 않았습니다.");
  return { body: plainText(body), imageCount: slots.length };
}
async function finishAutoPublication() {
  const expected = autoExpectedContent();
  if (!(await publicationPage("verify", expected)).ok) throw new Error("제목·전체 본문·사진 수가 원고와 다릅니다. 자동 발행을 중지했습니다.");
  await openNaverPublishSettings(seoPublication.tabId);
  if ($("publishCategory").value.trim() || activeDraftNaverCategory() || $("publishTags").value.trim()) await fillPublishInfoIntoNaver();
  if (!(await publicationPage("settings")).ok) throw new Error("공개 범위와 즉시 발행 설정을 확인하지 못했습니다.");
  // A successful ACK is required before the only final click. A lost response
  // deliberately leaves the server lock intact instead of retrying arm/click.
  await publicationApi("arm");
  seoPublication.state = "publishing";
  await persistPublication();
  if (!(await publicationPage("final", expected)).clicked) throw new Error("최종 발행 직전 원고/버튼 확인을 통과하지 못했습니다. 다시 클릭하지 않고 결과를 확인합니다.");
  await reconcileAutoPublication();
}
async function reconcileAutoPublication() {
  if (!seoPublication) seoPublication = (await chrome.storage.local.get(SEO_PUBLISH_OUTBOX))[SEO_PUBLISH_OUTBOX];
  if (!seoPublication) throw new Error("확인할 자동 발행 실행이 없습니다.");
  const state = await publicationApi("status");
  if (state.state === "published") {
    $("generateStatus").textContent = `발행 완료 · ${state.url}`;
    $("publishResultLink").href = state.url; $("publishResultLink").hidden = false;
    return;
  }
  if (!["publishing", "uncertain"].includes(state.state)) throw new Error("최종 발행을 시작한 실행이 아닙니다. 원고를 확인하세요.");
  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(1000);
    const result = await publicationPage("published").catch(() => null);
    if (result?.complete) {
      await publicationApi("published", { url: result.url });
      $("generateStatus").textContent = `발행 완료 · ${seoPublication.url}`;
      $("publishStatus").textContent = "실제 게시 URL과 서버 발행 기록을 확인했습니다.";
      $("publishResultLink").href = seoPublication.url; $("publishResultLink").hidden = false;
      return;
    }
  }
  await publicationApi("uncertain", { error: "게시 URL/제목 확인이 지연됐습니다. 자동 재발행하지 않습니다." });
  throw new Error("발행 결과가 불확실합니다. 네이버 게시글을 확인한 뒤 결과 확인만 다시 실행하세요.");
}
async function startAutoPublication() {
  if (seoAutoBusy) return;
  seoAutoBusy = true;
  for (const id of ["autoPublish", "fill", "previewFill", "webDraftList", "refreshWebDrafts", "publishBlogId", "publishVisibility", "publishCategory", "publishTags"]) $(id).disabled = true;
  const alive = setInterval(() => { if (seoPublication?.runId) persistPublication().catch(() => {}); }, 15 * 1000);
  try {
    if (!activeWebDraftId || !activeWebDraftTitle || !activeWebDraftBody) throw new Error("웹 원고를 먼저 선택하고 미리보기를 확인해 주세요.");
    const blogId = $("publishBlogId").value.trim(), visibility = $("publishVisibility").value;
    if (!/^[A-Za-z0-9_-]{2,40}$/.test(blogId)) throw new Error("실제 블로그 주소의 ID를 입력해 주세요.");
    autoExpectedContent();
    seoPublication = { draftId: activeWebDraftId, title: plainText(activeWebDraftTitle), blogId, visibility };
    await publicationApi("claim", { blogId, visibility, fingerprint: webDrafts.find(item => item.id === activeWebDraftId)?.publication_fingerprint });
    const tab = await chrome.tabs.create({ url: `https://blog.naver.com/${encodeURIComponent(blogId)}/postwrite`, active: true });
    seoPublication.tabId = tab.id;
    await persistPublication();
    let empty = false;
    $("generateStatus").textContent = "새 전용 탭에서 빈 편집기를 확인 중입니다. 네이버의 이어서 작성 창이 있으면 새 글로 진행할지 확인해 주세요.";
    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(1000);
      if ((await publicationPage("empty").catch(() => null))?.ok) { empty = true; break; }
    }
    if (!empty) throw new Error("대상 블로그의 빈 새 편집기를 확인하지 못했습니다. 기존 준비 원고는 건드리지 않았습니다.");
    await fillDraftIntoNaver({ auto: true });
  } catch (error) {
    if (seoPublication?.runId) await publicationApi(seoPublication.state === "writing" ? "failed" : "uncertain", { error: error.message }).catch(() => {});
    $("generateStatus").textContent = error.message;
  } finally {
    clearInterval(alive);
    seoAutoBusy = false;
    for (const id of ["autoPublish", "fill", "previewFill", "webDraftList", "refreshWebDrafts", "publishBlogId", "publishVisibility", "publishCategory", "publishTags"]) $(id).disabled = false;
  }
}
// 2026-10-23: 자동 포스팅·결과 확인은 background가 실행한다(startBackgroundRun, sidepanel.js). 사이드패널을 닫아도 이어진다.
$("autoPublish").addEventListener("click", () => startBackgroundRun("auto"));
$("reconcilePublish").addEventListener("click", () => startBackgroundRun("reconcile"));
// 끊긴 실행 정리는 사이드패널을 열 때만 한다(background 안에서는 실행 중인 자기 작업을 건드리지 않도록 건너뜀).
if (typeof importScripts !== "function") recoverInterruptedPublication().catch(() => {});
