// 사전 검증 결과 화면: 확장 저장소(chrome.storage.local)의 결과를 보여 주고 파일로 받거나 복사한다.
(async () => {
  const { report } = await chrome.storage.local.get("report");
  const data = { ...(report || {}), savedAt: new Date().toISOString(), userAgent: navigator.userAgent, extVersion: chrome.runtime.getManifest().version_name };
  const text = JSON.stringify(data, null, 2);
  const out = document.getElementById("out");
  const msg = document.getElementById("msg");
  out.textContent = report ? text : "아직 기록된 결과가 없습니다. 팝업에서 ①부터 진행해 주세요.";
  document.getElementById("dl").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = `realty-prevalidation-report-${Date.now()}.json`;
    a.click();
    msg.textContent = " 크롬 다운로드 폴더에 저장했습니다.";
  };
  document.getElementById("copy").onclick = async () => {
    await navigator.clipboard.writeText(text);
    msg.textContent = " 복사했습니다. 대화창에 붙여 넣어 주세요.";
  };
})();
