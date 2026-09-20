const STATUS_LABEL = {
  login_required: "네이버 로그인이 필요합니다 — 열린 브라우저 창에서 직접 로그인해주세요.",
  security_check: "네이버 보안 확인(캡챠 등)이 필요합니다 — 브라우저 창에서 직접 완료해주세요.",
  waiting_for_manual_login: "로그인 완료를 기다리는 중입니다...",
  logged_in: "로그인 상태 확인됨."
};

const button = document.getElementById("check-btn");
const statusBox = document.getElementById("status");

window.blogAuto.onNaverSessionStatus((status) => {
  statusBox.textContent = STATUS_LABEL[status] || status;
});

button.addEventListener("click", async () => {
  button.disabled = true;
  statusBox.textContent = "브라우저를 여는 중입니다...";
  const result = await window.blogAuto.checkNaverSession();
  button.disabled = false;

  if (result.ok) {
    statusBox.textContent = `세션 확인 완료. 프로필 저장 위치:\n${result.profileDir}`;
  } else {
    statusBox.textContent = `오류: ${result.error}`;
  }
});

const inspectButton = document.getElementById("inspect-btn");
const inspectStatusBox = document.getElementById("inspect-status");

inspectButton.addEventListener("click", async () => {
  inspectButton.disabled = true;
  inspectStatusBox.textContent = "현재 화면 구조를 분석하는 중입니다...";
  const result = await window.blogAuto.inspectEditor();
  inspectButton.disabled = false;

  if (result.ok) {
    inspectStatusBox.textContent = `분석 완료. 저장 위치:\n${result.outPath}`;
  } else {
    inspectStatusBox.textContent = `오류: ${result.error}`;
  }
});

const fillButton = document.getElementById("fill-btn");
const fillStatusBox = document.getElementById("fill-status");
const fillTitleInput = document.getElementById("fill-title");
const fillBodyInput = document.getElementById("fill-body");

fillButton.addEventListener("click", async () => {
  fillButton.disabled = true;
  fillStatusBox.textContent = "사람처럼 천천히 입력 중입니다... (시간이 좀 걸립니다)";
  const result = await window.blogAuto.autoFillPost({
    title: fillTitleInput.value,
    body: fillBodyInput.value
  });
  fillButton.disabled = false;

  if (result.ok) {
    fillStatusBox.textContent = "입력 완료. 브라우저 창에서 결과를 확인해주세요.";
  } else {
    fillStatusBox.textContent = `오류: ${result.error}`;
  }
});
