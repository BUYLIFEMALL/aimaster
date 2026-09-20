const STATUS_LABEL = {
  login_required: "네이버 로그인이 필요합니다 — 열린 브라우저 창에서 직접 로그인해주세요.",
  security_check: "네이버 보안 확인(캡챠 등)이 필요합니다 — 브라우저 창에서 직접 완료해주세요.",
  waiting_for_manual_login: "로그인 완료를 기다리는 중입니다...",
  logged_in: "로그인 상태 확인됨."
};

const aimasterTokenInput = document.getElementById("aimaster-token");
const aimasterLinkButton = document.getElementById("aimaster-link-btn");
const aimasterStatusBox = document.getElementById("aimaster-status");

function renderAimasterStatus(result) {
  if (result.linked) {
    aimasterStatusBox.textContent = `연동됨: ${result.name ? `${result.name} · ` : ""}${result.email}`;
  } else {
    aimasterStatusBox.textContent = result.error ? `오류: ${result.error}` : "연동되지 않음";
  }
}

(async () => {
  const status = await window.blogAuto.getAimasterStatus();
  renderAimasterStatus(status);
})();

aimasterLinkButton.addEventListener("click", async () => {
  aimasterLinkButton.disabled = true;
  aimasterStatusBox.textContent = "확인 중...";
  const result = await window.blogAuto.setAimasterToken(aimasterTokenInput.value);
  aimasterLinkButton.disabled = false;
  renderAimasterStatus(result);
  if (result.linked) aimasterTokenInput.value = "";
});

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

const draftButton = document.getElementById("draft-btn");
const draftStatusBox = document.getElementById("draft-status");
const draftTitleInput = document.getElementById("draft-title");
const draftBodyInput = document.getElementById("draft-body");
const draftIncludeImageCheckbox = document.getElementById("draft-include-image");

draftButton.addEventListener("click", async () => {
  draftButton.disabled = true;
  draftStatusBox.textContent = "사람처럼 천천히 입력 중입니다... (시간이 좀 걸립니다)";
  const result = await window.blogAuto.runDraftStep({
    title: draftTitleInput.value,
    body: draftBodyInput.value,
    includeImage: draftIncludeImageCheckbox.checked
  });
  draftButton.disabled = false;

  if (result.ok) {
    draftStatusBox.textContent = "1단계 완료. 브라우저 창에서 결과를 확인해주세요.";
  } else {
    draftStatusBox.textContent = `오류: ${result.error}`;
  }
});

const publishButton = document.getElementById("publish-btn");
const publishStatusBox = document.getElementById("publish-status");
const publishTagsInput = document.getElementById("publish-tags");
const publishCategoryInput = document.getElementById("publish-category");

publishButton.addEventListener("click", async () => {
  const tags = publishTagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  publishButton.disabled = true;
  publishStatusBox.textContent = "태그/카테고리를 입력하는 중입니다...";
  const result = await window.blogAuto.runPublishSettingsStep({
    tags,
    categoryName: publishCategoryInput.value.trim()
  });
  publishButton.disabled = false;

  if (result.ok) {
    publishStatusBox.textContent = "2단계 완료. 브라우저 창에서 결과를 확인해주세요.";
  } else {
    publishStatusBox.textContent = `오류: ${result.error}`;
  }
});
