// 최근 수집 결과 — 확장 저장소(lastResult)의 표를 보여 주고 파일로 받는다. 매물은 이 PC에만 있다.
import { COLUMNS, toCsv, toXlsx } from "./lib/sheet.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const RESULT = { ok: "✅ 정상", blocked: "⛔ 확인 화면 때문에 멈춤", rule_mismatch: "⚠ 수집 규칙 확인 필요", error: "⚠ 오류" };

function save(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const { lastResult } = await chrome.storage.local.get("lastResult");
const table = lastResult?.table || [];
const stamp = (lastResult?.at || new Date().toISOString()).slice(0, 16).replace(/[-:T]/g, "");

if (lastResult) {
  $("sub").textContent = `${new Date(lastResult.at).toLocaleString("ko-KR", { hour12: false })} · ${RESULT[lastResult.result] || ""}${lastResult.error ? ` — ${lastResult.error}` : ""} · 이 PC에만 저장돼요.`;
  $("cards").innerHTML = (lastResult.perTarget || [])
    .map((p) => `<div class="card"><small>🏢 ${esc(p.name)}</small><b>매물 ${p.total}건 · 알림 ${p.events}건</b><small>${p.firstRun ? "첫 수집(기준 저장)" : ""}</small></div>`)
    .join("");
}

if (!table.length) {
  $("wrap").innerHTML = `<div class="empty">아직 결과가 없어요. 팝업의 「🔍 지금 수집」을 눌러 보세요.</div>`;
  $("xlsx").disabled = $("csv").disabled = true;
} else {
  const urlCol = COLUMNS.length - 1;
  $("wrap").innerHTML = `<table><thead><tr>${COLUMNS.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${table
    .map((r) => `<tr>${r.map((v, i) => (i === urlCol ? `<td><a href="${esc(v)}" target="_blank" rel="noopener">열기 ↗</a></td>` : `<td${i === 7 ? ' class="feat"' : ""}>${esc(v)}</td>`)).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

$("xlsx").onclick = () => save(toXlsx(table), `매물알림_${stamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
$("csv").onclick = () => save(new TextEncoder().encode(toCsv(table)), `매물알림_${stamp}.csv`, "text/csv");
