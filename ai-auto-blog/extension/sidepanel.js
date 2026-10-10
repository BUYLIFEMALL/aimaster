"use strict";

// BLOG(원문)생성 자동화 → 네이버 블로그 입력 확장 사이드패널(v1.41 개편, 2026-10-10).
// 실제 입력은 작업기(background.js)가 한다 — 이 패널은 연결·블로그 ID 설정, 보낸 글 목록과 미리보기, 직접 시작·중지, 진행 상태 표시,
// 카테고리·태그 설정, 구조 분석만 맡는다. 패널을 닫아도 작업은 계속된다.
// 웹에서 "네이버 입력기로 보내기"를 누르면 작업기가 30분 안에 자동으로 가져가 발행 직전까지 입력한다(마지막 발행은 회원이 직접).

const BASE = "https://ai-auto-blog-one.vercel.app";
const KEY = "aiAutoBlogToken";
const BLOG_ID_KEY = "aiAutoBlogBlogId";
const NOTIFY_KEY = "aiAutoBlogNotify";
const IMAGE_AI_KEY = "aiAutoBlogImageAi";
const PUBLISH_SETTINGS_KEY = "aiAutoBlogPublishSettings";
const TASK_STATE_KEY = "blogTaskState";
const AUTO_WINDOW_MS = 30 * 60 * 1000;
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const Core = self.BlogCore;

let posts = [];
let active = null; // 미리보기용: { id, title, blocks: [{type, text|url, dataUrl}], tags }

function renderExtensionVersion() {
  const manifest = chrome.runtime?.getManifest?.();
  const version = manifest?.version_name || (manifest?.version ? `v${manifest.version}` : "");
  if (version) $("extensionVersion").textContent = version;
}

async function getToken() { return (await chrome.storage.local.get(KEY))[KEY] || ""; }

async function api(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("먼저 BLOG 연동 토큰으로 연결해주세요.");
  const response = await fetch(`${BASE}${path}`, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` }, cache: "no-store" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `요청 실패 (${response.status})`);
  return result;
}

async function verify(token) {
  if (!token) return { ok: false, error: "토큰을 입력하세요." };
  try {
    const response = await fetch(`${BASE}/api/extension/whoami`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    return response.ok ? { ok: true, email: body.email, isAdmin: body.isAdmin === true, latestVersion: body.latestVersion, downloadUrl: body.downloadUrl } : { ok: false, error: body.error || `연결 실패 (${response.status})` };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}

// 프로그램을 업데이트할 때마다 확장도 같은 버전으로 올라간다(빌드 때 자동 동기화). 설치된 확장이 예전 버전이면 안내한다.
function renderUpdateBanner(latestVersion, downloadUrl) {
  const current = chrome.runtime?.getManifest?.()?.version_name || "";
  const outdated = Boolean(latestVersion && current && latestVersion !== current);
  $("updateBanner").hidden = !outdated;
  if (!outdated) return;
  $("updateBannerText").textContent = `설치된 확장 ${current} → 최신 ${latestVersion}. 최신 ZIP을 내려받아 같은 폴더에 덮어쓴 뒤 chrome://extensions에서 이 확장의 새로고침 버튼을 눌러 주세요.`;
  if (downloadUrl) $("updateBannerLink").href = `${BASE}${downloadUrl}`;
  $("updateBannerLink").textContent = `최신 버전(${latestVersion}) ZIP 바로 받기`;
}

async function renderStatus() {
  const token = await getToken();
  const result = await verify(token);
  $("status").textContent = result.ok ? `연결됨: ${result.email}` : token ? `오류: ${result.error}` : "연결되지 않음";
  if (result.ok) renderUpdateBanner(result.latestVersion, result.downloadUrl);
  // 관리자 계정으로 연결된 경우에만 구조 분석 도구를 보여 준다(연결이 안 되었거나 일반 회원이면 숨김).
  $("inspectCard").hidden = !(result.ok && result.isAdmin);
}

// ---- 진행 상태 카드 ----
const STAGE_LABEL = { preparing: "준비 중", typing: "입력 중", image: "이미지 올리는 중", verifying: "확인 중", settings: "발행 설정 중", completed: "입력 완료", publish_ready: "발행 직전 준비 완료", failed: "실패" };
async function renderTask() {
  const stored = await chrome.storage.local.get(["blogTaskState", "blogActiveTask", "blogPendingResult"]);
  const state = stored.blogTaskState;
  const running = Boolean(stored.blogActiveTask);
  $("taskCard").hidden = !state && !running;
  if (!state && !running) return;
  const final = Boolean(state?.final);
  const stage = state?.stage || "";
  $("taskTitle").textContent = state?.title ? `${state.title}` : "작업";
  $("taskStage").textContent = running && !final ? `${STAGE_LABEL[stage] || "진행 중"} · ${state?.mode === "manual" ? "직접 시작" : "자동 시작"}` : STAGE_LABEL[stage] || (state?.outcome === "cancelled" ? "중지됨" : "");
  $("taskMessage").textContent = state?.message || "";
  const total = Number(state?.totalChars) || 0;
  const typed = Math.min(Number(state?.typedChars) || 0, total);
  $("taskProgress").hidden = !(running && !final && total > 0);
  $("taskProgress").max = Math.max(total, 1);
  $("taskProgress").value = typed;
  $("cancelTask").hidden = !(running && !final);
  $("taskCard").dataset.outcome = final ? state.outcome || "" : "running";
  const notes = [...(state?.warnings || []), ...(state?.reportNote ? [state.reportNote] : []), ...(stored.blogPendingResult ? ["서버에 보고할 결과가 보관 중입니다. 연결되면 자동으로 다시 보고합니다."] : [])];
  $("taskNotes").textContent = notes.join("\n");
  $("fill").disabled = running && !final;
  $("previewFill").disabled = running && !final;
  if (final && state?.outcome) chrome.runtime.sendMessage({ type: "ackBadge" }).catch(() => {});
}

// ---- 블로그 ID ----
async function loadBlogId() {
  const value = (await chrome.storage.local.get(BLOG_ID_KEY))[BLOG_ID_KEY] || "";
  $("blogId").value = value;
  $("blogIdStatus").textContent = value ? `저장됨: ${value} — 이 블로그의 글쓰기 화면에만 입력합니다.` : "내 네이버 블로그 주소의 아이디를 입력하세요. (예: blog.naver.com/내아이디)";
}
$("saveBlogId").addEventListener("click", async () => {
  const value = $("blogId").value.trim().replace(/^https?:\/\/blog\.naver\.com\//i, "").split(/[/?#]/)[0];
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(value)) { $("blogIdStatus").textContent = "블로그 ID는 영문·숫자·_·- 2~40자로 입력하세요."; return; }
  await chrome.storage.local.set({ [BLOG_ID_KEY]: value });
  $("blogId").value = value;
  $("blogIdStatus").textContent = `저장됨: ${value} — 이 블로그의 글쓰기 화면에만 입력합니다.`;
  chrome.runtime.sendMessage({ type: "pump" }).catch(() => {});
});

// ---- 완료 알림 설정(기본 켜짐) ----
chrome.storage.local.get(NOTIFY_KEY).then((stored) => { $("notifyToggle").checked = stored[NOTIFY_KEY] !== false; }).catch(() => {});
$("notifyToggle").addEventListener("change", () => chrome.storage.local.set({ [NOTIFY_KEY]: $("notifyToggle").checked }).catch(() => {}));
// 이미지에 "AI 활용" 표시 자동 켜기: 기본 꺼짐(true로 저장한 회원만 켠다)
chrome.storage.local.get(IMAGE_AI_KEY).then((stored) => { $("imageAiToggle").checked = stored[IMAGE_AI_KEY] === true; }).catch(() => {});
$("imageAiToggle").addEventListener("change", () => chrome.storage.local.set({ [IMAGE_AI_KEY]: $("imageAiToggle").checked }).catch(() => {}));

// ---- 보낸 글 목록 ----
function formatPostLabel(post) {
  const sentAt = post.extension_handoff_at ? new Date(post.extension_handoff_at) : null;
  const date = sentAt ? sentAt.toLocaleDateString("ko-KR") : "";
  const waiting = !post.naver_input_status && sentAt && Date.now() - sentAt.getTime() < AUTO_WINDOW_MS;
  const status = waiting ? " · 자동 입력 대기" : { in_progress: " · 입력 중", completed: " · 입력 완료", publish_ready: " · 발행 준비 완료", failed: " · 입력 실패" }[post.naver_input_status] || "";
  return `${post.title || "제목 없는 글"}${date ? ` · ${date}` : ""} · 이미지 ${post.image_count}장${status}`;
}

function resetActive() {
  active = null;
  $("postPreview").close();
  $("postPreviewContent").textContent = "";
}

async function refreshPosts() {
  resetActive();
  $("postStatus").textContent = "보낸 글을 불러오는 중...";
  const result = await api("/api/extension/posts");
  posts = Array.isArray(result.posts) ? result.posts : [];
  const select = $("postList");
  select.textContent = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = posts.length ? "직접 입력할 글을 선택하세요." : "보낸 글이 없습니다.";
  select.append(placeholder);
  for (const post of posts) {
    const option = document.createElement("option");
    option.value = String(post.id);
    option.textContent = formatPostLabel(post);
    select.append(option);
  }
  $("postStatus").textContent = posts.length
    ? `보낸 글 ${posts.length}개. 방금 보낸 글은 확장이 자동으로 입력합니다. 오래된 글이나 실패한 글은 선택해 직접 시작하세요.`
    : "보낸 글이 없습니다. BLOG 글 보기 화면에서 \"네이버 입력기로 보내기\"를 눌러주세요.";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("이미지 데이터를 읽지 못했습니다."));
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("이미지 형식이 올바르지 않습니다."));
    reader.readAsDataURL(blob);
  });
}

// 미리보기 전용 — 실제 입력 데이터는 작업기가 서버에서 다시 받는다.
async function loadSelectedPost() {
  const post = posts.find((item) => String(item.id) === $("postList").value);
  if (!post) throw new Error("글을 먼저 선택해주세요.");
  resetActive();
  const blocks = [];
  let failedImages = 0;
  for (const block of Array.isArray(post.blocks) ? post.blocks : []) {
    if (block.type === "text" && block.text) blocks.push({ type: "text", text: block.text });
    if (block.type === "link" && block.text && /^https?:\/\//.test(block.url || "")) blocks.push({ type: "link", text: block.text, url: block.url });
    if (block.type === "image" && block.url) {
      try {
        const response = await fetch(block.url);
        if (!response.ok) throw new Error(String(response.status));
        blocks.push({ type: "image", url: block.url, alt: block.alt || "", dataUrl: await blobToDataUrl(await response.blob()) });
      } catch { failedImages += 1; }
    }
  }
  active = { id: post.id, title: post.title || "", blocks, tags: Array.isArray(post.tags) ? post.tags : [] };
  renderPreview();
  const textLength = blocks.reduce((sum, block) => sum + (block.type === "text" ? block.text.length : 0), 0) + active.title.length;
  const images = blocks.filter((block) => block.type === "image").length;
  const minutes = Math.max(1, Math.round((textLength * 130) / 60000));
  $("postStatus").textContent = `이미지 ${images}장${failedImages ? ` (불러오지 못한 ${failedImages}장은 입력에서 건너뜁니다)` : ""} · 약 ${textLength.toLocaleString()}자 · 예상 입력 시간 약 ${minutes}분.`;
}

function renderPreview() {
  const container = $("postPreviewContent");
  container.textContent = "";
  const title = document.createElement("h4");
  title.textContent = active.title || "제목 없는 글";
  container.append(title);
  for (const block of active.blocks) {
    if (block.type === "text") {
      for (const paragraph of block.text.split(/\n{2,}/).map((value) => value.trim()).filter(Boolean)) {
        const element = document.createElement("p");
        element.textContent = paragraph;
        element.style.whiteSpace = "pre-line";
        container.append(element);
      }
      continue;
    }
    if (block.type === "link") {
      const paragraph = document.createElement("p");
      const anchor = document.createElement("a");
      anchor.href = block.url; anchor.target = "_blank"; anchor.rel = "noreferrer"; anchor.textContent = block.text;
      paragraph.append(anchor);
      container.append(paragraph);
      continue;
    }
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    const caption = document.createElement("figcaption");
    image.src = block.dataUrl; image.alt = block.alt; caption.textContent = block.alt || "본문 이미지";
    figure.append(image, caption);
    container.append(figure);
  }
}

function openPreview() {
  if (!active) return ($("postStatus").textContent = "먼저 목록에서 글을 선택해주세요.");
  if (!$("postPreview").open) $("postPreview").showModal();
}

// ---- 직접 시작 / 중지 ----
async function startSelected() {
  const postId = $("postList").value;
  if (!postId) { $("inputStatus").textContent = "목록에서 글을 먼저 선택해주세요."; return; }
  $("inputStatus").textContent = "작업기에 시작을 요청하는 중...";
  const response = await chrome.runtime.sendMessage({ type: "start", postId });
  $("inputStatus").textContent = response?.error ? `시작하지 못했습니다: ${response.error}` : "시작했습니다. 위의 '진행 상태'에서 확인하세요. 이 패널을 닫아도 작업은 계속됩니다.";
}
$("fill").addEventListener("click", () => startSelected().catch((error) => ($("inputStatus").textContent = `시작하지 못했습니다: ${error.message}`)));
$("previewFill").addEventListener("click", () => { $("postPreview").close(); startSelected().catch(() => {}); });
$("cancelTask").addEventListener("click", async () => {
  $("cancelTask").disabled = true;
  await chrome.runtime.sendMessage({ type: "cancel" }).catch(() => {});
  setTimeout(() => { $("cancelTask").disabled = false; }, 2000);
});

$("link").addEventListener("click", async () => {
  const token = $("token").value.trim();
  $("link").disabled = true;
  const result = await verify(token);
  if (result.ok) { await chrome.storage.local.set({ [KEY]: token }); $("token").value = ""; }
  $("link").disabled = false;
  $("status").textContent = result.ok ? `연결됨: ${result.email}` : `오류: ${result.error}`;
  if (result.ok) renderUpdateBanner(result.latestVersion, result.downloadUrl);
  $("inspectCard").hidden = !(result.ok && result.isAdmin);
  if (result.ok) { chrome.runtime.sendMessage({ type: "pump" }).catch(() => {}); refreshPosts().catch((error) => ($("postStatus").textContent = `보낸 글 조회 실패: ${error.message}`)); }
});

$("refreshPosts").addEventListener("click", () => {
  refreshPosts().catch((error) => ($("postStatus").textContent = `보낸 글 조회 실패: ${error instanceof Error ? error.message : String(error)}`));
});

$("postList").addEventListener("change", () => {
  if (!$("postList").value) { resetActive(); return; }
  $("postStatus").textContent = "선택한 글을 불러오는 중...";
  loadSelectedPost().catch((error) => {
    resetActive();
    $("postStatus").textContent = `글 불러오기 실패: ${error instanceof Error ? error.message : String(error)}`;
  });
});

$("openPreview").addEventListener("click", openPreview);
$("closePreview").addEventListener("click", () => $("postPreview").close());
$("closePreviewFooter").addEventListener("click", () => $("postPreview").close());

// ---- 카테고리·태그 ----
$("extractRecommendedTags").addEventListener("click", () => {
  if (!active) { $("publishStatus").textContent = "먼저 보낸 글을 선택해 본문을 불러오세요."; return; }
  const tags = Core.buildRecommendedTags({ topic: "", keywords: active.tags, title: active.title, body: active.blocks.filter((block) => block.type === "text").map((block) => block.text).join("\n") });
  if (!tags.length) { $("publishStatus").textContent = "본문에서 추천테그를 충분히 찾지 못했습니다. 직접 입력해주세요."; return; }
  $("publishTags").value = tags.join(", ");
  $("publishStatus").textContent = `본문의 핵심 주제·키워드로 추천테그 ${tags.length}개를 입력했습니다: ${tags.map((tag) => `#${tag}`).join(" ")}`;
});

$("savePublishSettings").addEventListener("click", async () => {
  await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: $("publishTags").value.trim() } });
  $("publishStatus").textContent = "카테고리·태그를 저장했습니다. 다음 자동 입력부터 적용됩니다.";
});

$("fillPublishInfo").addEventListener("click", async () => {
  $("fillPublishInfo").disabled = true;
  $("publishStatus").textContent = "네이버 설정창에 카테고리·태그를 입력하는 중...";
  try {
    await chrome.storage.local.set({ [PUBLISH_SETTINGS_KEY]: { category: $("publishCategory").value.trim(), tags: $("publishTags").value.trim() } });
    const response = await chrome.runtime.sendMessage({ type: "reapplySettings" });
    $("publishStatus").textContent = response?.error ? Core.formatBrowserError(new Error(response.error), "카테고리·태그 입력") : "카테고리·태그 입력 완료. 내용을 확인한 뒤 네이버의 마지막 발행 버튼을 직접 누르세요.";
  } catch (error) {
    $("publishStatus").textContent = Core.formatBrowserError(error, "카테고리·태그 입력");
  } finally { $("fillPublishInfo").disabled = false; }
});

// ---- 구조 분석(오류 보고용) ----
async function findNaverTab() {
  const tabs = await chrome.tabs.query({ url: ["https://blog.naver.com/*", "https://m.blog.naver.com/*"] });
  return tabs.find((candidate) => candidate.active) || tabs[0] || null;
}
$("inspect").addEventListener("click", async () => {
  $("inspect").disabled = true;
  $("inspectStatus").textContent = "분석 중...";
  try {
    const tab = await findNaverTab();
    if (!tab?.id) throw new Error("네이버 블로그 탭을 찾지 못했습니다.");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => {
        const describe = (element) => ({
          tag: element.tagName, id: element.id || null,
          classes: typeof element.className === "string" ? element.className.trim().split(/\s+/).slice(0, 8) : null,
          contentEditable: element.isContentEditable || null, text: (element.textContent || "").trim().slice(0, 80),
        });
        return {
          url: location.href,
          titleCandidates: [...document.querySelectorAll('[class*="se-title"], .se-documentTitle')].slice(0, 20).map(describe),
          paragraphCandidates: [...document.querySelectorAll(".se-text-paragraph, .se-component-content")].slice(0, 30).map(describe),
          contentEditableEls: [...document.querySelectorAll('[contenteditable="true"]')].slice(0, 20).map(describe),
          publishButtons: [...document.querySelectorAll("button, a, [role='button']")].filter((element) => /발행|저장|카테고리|태그/.test(element.textContent || "")).slice(0, 40).map(describe),
          imageButtons: [...document.querySelectorAll("button, [role='button']")].filter((element) => /사진|이미지|image|photo/i.test(`${element.getAttribute("aria-label") || ""} ${element.className || ""} ${element.textContent || ""}`)).slice(0, 20).map(describe),
          fileInputs: [...document.querySelectorAll('input[type="file"]')].slice(0, 10).map(describe),
        };
      },
    });
    $("inspectResult").value = JSON.stringify(results.map((entry) => ({ frameId: entry.frameId, result: entry.result })), null, 2);
    $("inspectStatus").textContent = `분석 완료 (${results.length}개 프레임). 결과를 복사해 전달해주세요.`;
  } catch (error) {
    $("inspectStatus").textContent = Core.formatBrowserError(error, "구조 분석");
  } finally { $("inspect").disabled = false; }
});

chrome.storage.local.get(PUBLISH_SETTINGS_KEY).then((stored) => {
  const settings = stored[PUBLISH_SETTINGS_KEY] || {};
  $("publishCategory").value = settings.category || "";
  $("publishTags").value = settings.tags || "";
}).catch(() => {});

// 작업 상태가 바뀌면 카드를 갱신하고, 끝나면 목록의 입력 상태도 새로 불러온다.
let lastFinalAt = 0;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[TASK_STATE_KEY] || changes.blogActiveTask || changes.blogPendingResult) {
    renderTask().catch(() => {});
    const state = changes[TASK_STATE_KEY]?.newValue;
    if (state?.final && state.updatedAt !== lastFinalAt) { lastFinalAt = state.updatedAt; refreshPosts().catch(() => {}); }
  }
});

renderExtensionVersion();
loadBlogId().catch(() => {});
renderTask().catch(() => {});
renderStatus().then(async () => {
  if (await getToken()) refreshPosts().catch(() => {});
});
chrome.runtime.sendMessage({ type: "status" }).catch(() => {});
