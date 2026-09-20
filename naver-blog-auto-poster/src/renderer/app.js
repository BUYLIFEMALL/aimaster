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

const imageButton = document.getElementById("image-btn");
const imageStatusBox = document.getElementById("image-status");

imageButton.addEventListener("click", async () => {
  imageButton.disabled = true;
  imageStatusBox.textContent = "이미지 선택 창을 여는 중입니다...";
  const result = await window.blogAuto.insertImage();
  imageButton.disabled = false;

  if (result.ok) {
    imageStatusBox.textContent = `삽입 요청 완료(${result.filePath}). 브라우저 창에서 결과를 확인해주세요.`;
  } else {
    imageStatusBox.textContent = `오류: ${result.error}`;
  }
});

const tagsButton = document.getElementById("tags-btn");
const tagsStatusBox = document.getElementById("tags-status");
const tagsInput = document.getElementById("tags-input");

tagsButton.addEventListener("click", async () => {
  const tags = tagsInput.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  tagsButton.disabled = true;
  tagsStatusBox.textContent = "태그를 입력하는 중입니다...";
  const result = await window.blogAuto.fillTags({ tags });
  tagsButton.disabled = false;

  if (result.ok) {
    tagsStatusBox.textContent = "태그 입력 완료. 브라우저 창에서 결과를 확인해주세요.";
  } else {
    tagsStatusBox.textContent = `오류: ${result.error}`;
  }
});

const categoryButton = document.getElementById("category-btn");
const categoryStatusBox = document.getElementById("category-status");
const categoryInput = document.getElementById("category-input");

categoryButton.addEventListener("click", async () => {
  categoryButton.disabled = true;
  categoryStatusBox.textContent = "카테고리를 선택하는 중입니다...";
  const result = await window.blogAuto.selectCategory({ categoryName: categoryInput.value.trim() });
  categoryButton.disabled = false;

  if (result.ok) {
    categoryStatusBox.textContent = "카테고리 선택 완료. 브라우저 창에서 결과를 확인해주세요.";
  } else {
    categoryStatusBox.textContent = `오류: ${result.error}`;
  }
});
