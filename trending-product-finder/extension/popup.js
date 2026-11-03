import { DAILY_LIMIT, MAX_KEYWORDS, parseKeywords, todayRecord } from "./lib/auto.js";
import { addToLocalList, readTab, saveToAccount } from "./lib/page.js";
import { filterProducts, isExpired, toCsv } from "./lib/parse.js";

const READ_GAP_MS = 10_000;
const $ = (id) => document.getElementById(id);
let items = [];
let lastReadAt = 0;

function setStatus(message, bad = false) {
  $("status").textContent = message;
  $("status").className = bad ? "bad" : "";
}

function criteria() {
  const picked = document.querySelector('input[name="min"]:checked').value;
  const minReviews = picked === "custom" ? Math.max(0, Number($("custom").value) || 0) : Number(picked);
  return { minReviews, excludeAds: $("excludeAds").checked };
}

function render() {
  const shown = filterProducts(items, criteria());
  $("summary").textContent = `담은 상품 ${items.length}개 중 기준에 맞는 상품 ${shown.length}개`;
  const body = $("rows");
  body.replaceChildren(
    ...shown.map((item) => {
      const row = document.createElement("tr");
      const rank = document.createElement("td");
      rank.className = "num";
      rank.textContent = String(item.rank);
      const name = document.createElement("td");
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.isAd ? `[광고] ${item.name}` : item.name;
      name.append(link);
      const price = document.createElement("td");
      price.className = "num";
      price.textContent = item.price ? `${item.price.toLocaleString("ko-KR")}원` : "-";
      const reviews = document.createElement("td");
      reviews.className = "num";
      reviews.textContent = item.reviews.toLocaleString("ko-KR");
      row.append(rank, name, price, reviews);
      return row;
    }),
  );
}

async function readPage() {
  const wait = READ_GAP_MS - (Date.now() - lastReadAt);
  if (wait > 0) return setStatus(`${Math.ceil(wait / 1000)}초 뒤에 다시 눌러 주세요.`, true);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!/^https:\/\/www\.coupang\.com\/np\/search/.test(tab?.url ?? "")) {
    return setStatus("쿠팡에서 직접 검색한 결과 화면을 연 뒤 눌러 주세요.", true);
  }
  lastReadAt = Date.now();
  const read = await readTab(tab.id);
  if (!read) return setStatus("화면을 읽지 못했습니다. 쿠팡 탭을 새로고침한 뒤 다시 눌러 주세요.", true);
  if (read.state === "blocked" || read.state === "no-result") {
    // 직접 읽기에서도 거부 징후가 보이면 자동 검색·예약을 함께 일시정지한다.
    await chrome.runtime.sendMessage({ type: "safety-pause", reason: read.state, keyword: new URL(tab.url).searchParams.get("q") ?? "" });
    return setStatus(read.state === "blocked" ? "⛔ 쿠팡 확인 화면이 떠서 멈췄습니다. 오늘은 더 읽지 말고 쉬어 주세요." : "이 화면에 검색 결과가 없습니다. 상품이 있는 검색어인데 이렇게 나오면 쿠팡이 제한했을 수 있으니 쉬어 주세요.", true);
  }
  if (read.state === "unknown") return setStatus("상품을 찾지 못했습니다. 쿠팡 화면이 바뀌었을 수 있습니다.", true);

  const added = await addToLocalList(read.products);
  items = (await chrome.storage.local.get("items")).items ?? [];
  render();
  setStatus(`새 상품 ${added}개를 담았습니다. 저장 중…`);
  const keyword = new URL(tab.url).searchParams.get("q") ?? "";
  setStatus(`새 상품 ${added}개를 담았습니다. ${await saveToAccount(keyword, read.products)}`);
}

function renderAuto(job, daily) {
  const running = Boolean(job?.running);
  $("autoStart").disabled = running;
  $("autoStop").hidden = !running;
  $("keywords").disabled = running;
  const record = todayRecord(daily);
  const lines = [`오늘 자동 검색 ${record.count}/${DAILY_LIMIT}개${record.stopped ? " · 오늘은 중단됨" : ""}`];
  if (job?.message) lines.push(job.message);
  if (running && job.nextAt) {
    const left = Math.max(0, Math.round((job.nextAt - Date.now()) / 1000));
    lines.push(`다음 키워드 「${job.keywords[job.index]}」까지 약 ${Math.floor(left / 60)}분 ${left % 60}초`);
  }
  for (const r of job?.results ?? []) lines.push(`· ${r.keyword}: 상품 ${r.count}개(새로 ${r.added}개) — ${r.saved}`);
  $("autoStatus").textContent = lines.join("\n");
}

async function refreshAuto() {
  const { autoJob, autoDaily, autoSafety, autoSchedule } = await chrome.storage.local.get(["autoJob", "autoDaily", "autoSafety", "autoSchedule"]);
  renderAuto(autoJob, autoDaily);
  $("safety").hidden = !autoSafety;
  if (autoSafety) $("safetyText").textContent = `${autoSafety.message} (${new Date(autoSafety.at).toLocaleString("ko-KR")})`;
  const when = autoSchedule?.enabled && autoSchedule.nextAt ? new Date(autoSchedule.nextAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
  $("scheduleStatus").textContent = !autoSchedule?.enabled
    ? "예약 꺼짐"
    : autoSafety
      ? `⛔ 일시정지 중이라 예약이 돌지 않습니다 (키워드 ${autoSchedule.keywords.length}개)`
      : `다음 예약: ${when ?? "-"} · 키워드 ${autoSchedule.keywords.length}개 (${autoSchedule.keywords.join(", ")})`;
}

async function loadSchedule() {
  const { autoSchedule } = await chrome.storage.local.get("autoSchedule");
  if (!autoSchedule) return;
  $("scheduleOn").checked = Boolean(autoSchedule.enabled);
  if (autoSchedule.time) $("scheduleTime").value = autoSchedule.time;
  if (!$("keywords").value && autoSchedule.keywords?.length) $("keywords").value = autoSchedule.keywords.join("\n");
}

async function saveSchedule() {
  const enabled = $("scheduleOn").checked;
  if (enabled && !$("autoAgree").checked) return setStatus("자동 검색 주의 사항을 확인하고 체크해 주세요.", true);
  if (enabled) await chrome.storage.local.set({ autoAgreed: true });
  const reply = await chrome.runtime.sendMessage({ type: "schedule-save", enabled, time: $("scheduleTime").value, keywords: parseKeywords($("keywords").value) });
  if (!reply?.ok) return setStatus(reply?.error ?? "예약을 저장하지 못했습니다.", true);
  setStatus(enabled ? "매일 예약을 저장했습니다. 그 시각에 PC와 크롬을 켜 두세요." : "매일 예약을 껐습니다.");
  refreshAuto();
}

async function startAuto() {
  const keywords = parseKeywords($("keywords").value);
  const reply = await chrome.runtime.sendMessage({ type: "auto-start", keywords });
  if (!reply?.ok) return setStatus(reply?.error ?? "자동 검색을 시작하지 못했습니다.", true);
  setStatus(`키워드 ${keywords.length}개 자동 검색을 시작했습니다. 이 창을 닫아도 계속됩니다.`);
}

function downloadCsv() {
  const shown = filterProducts(items, criteria());
  if (!shown.length) return setStatus("저장할 상품이 없습니다.", true);
  const url = URL.createObjectURL(new Blob([toCsv(shown)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `쿠팡_리뷰거르기_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus(`CSV에 ${shown.length}개를 저장했습니다.`);
}

async function clearList() {
  items = [];
  await chrome.storage.local.remove(["items", "savedAt"]);
  setStatus("목록을 비웠습니다.");
  render();
}

async function init() {
  $("version").textContent = chrome.runtime.getManifest().version_name;
  const stored = await chrome.storage.local.get(["agreed", "items", "savedAt"]);
  if (isExpired(stored.savedAt)) await chrome.storage.local.remove(["items", "savedAt"]);
  else items = stored.items ?? [];

  const showMain = () => {
    $("consent").hidden = true;
    $("main").hidden = false;
    render();
  };
  if (stored.agreed) showMain();
  else $("consent").hidden = false;

  $("agree").addEventListener("change", async (event) => {
    if (!event.target.checked) return;
    await chrome.storage.local.set({ agreed: true });
    showMain();
  });
  $("read").addEventListener("click", readPage);
  $("keywords").placeholder = `한 줄에 하나씩, 최대 ${MAX_KEYWORDS}개\n예: 스텐 텀블러\n빨대 텀블러`;
  const { autoAgreed } = await chrome.storage.local.get("autoAgreed");
  $("autoAgree").checked = Boolean(autoAgreed);
  $("autoStart").addEventListener("click", async () => {
    if (!$("autoAgree").checked) return setStatus("자동 검색 주의 사항을 확인하고 체크해 주세요.", true);
    await chrome.storage.local.set({ autoAgreed: true });
    startAuto();
  });
  $("autoStop").addEventListener("click", () => chrome.runtime.sendMessage({ type: "auto-stop" }));
  $("scheduleSave").addEventListener("click", saveSchedule);
  $("safetyResume").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "safety-resume" });
    setStatus("일시정지를 풀었습니다. 같은 일이 또 생기면 며칠 쉬어 주세요.");
    refreshAuto();
  });
  await loadSchedule();
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.items) {
      items = changes.items.newValue ?? [];
      render();
    }
    if (changes.autoJob || changes.autoDaily || changes.autoSafety || changes.autoSchedule) refreshAuto();
  });
  setInterval(refreshAuto, 1000);
  refreshAuto();
  $("csv").addEventListener("click", downloadCsv);
  $("clear").addEventListener("click", clearList);
  document.querySelectorAll('input[name="min"], #excludeAds, #custom').forEach((el) => el.addEventListener("input", render));
}

init();
