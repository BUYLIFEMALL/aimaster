async function copyImageAsPng(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("이미지를 불러오지 못했습니다.");
  const source = await response.blob();
  if (!source.type.startsWith("image/")) throw new Error("이미지 형식이 올바르지 않습니다.");
  const objectUrl = URL.createObjectURL(source);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      element.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
    const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("이미지를 PNG 클립보드 형식으로 바꾸지 못했습니다.");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "offscreen-copy-tistory-image") return;
  copyImageAsPng(message.url)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  return true;
});
