const send = (m) => chrome.runtime.sendMessage(m);
const s = document.getElementById("s");
const show = async () => { const { log, attached } = await send({ type: "log" }); s.textContent = `${attached ? "기록 중" : "대기"} · 화면 ${log.pages.length}개 · 응답 ${log.responses.length}개`; };
document.querySelectorAll("[data-l]").forEach((b) => (b.onclick = async () => { const r = await send({ type: "start", label: b.dataset.l }); if (r.error) s.textContent = r.error; else { await show(); s.textContent += " — 이제 탭을 새로고침해 주세요"; } }));
document.getElementById("x").onclick = async () => { await send({ type: "stop" }); show(); };
document.getElementById("d").onclick = async () => {
  const { log } = await send({ type: "log" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(log, null, 1)], { type: "application/json" }));
  a.download = "naver-listing-prevalidation.json";
  a.click();
};
show();
