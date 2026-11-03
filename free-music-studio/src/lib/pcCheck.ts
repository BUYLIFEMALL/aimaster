// 설치 전 간단 검사 — 엔진이 없어도 브라우저가 아는 것으로 「이 PC에 설치할 수 있는지」 미리 본다.
// 그래픽 메모리·저장 공간은 브라우저가 알 수 없어, 엔진을 켠 뒤 정밀 검사(GET /system)로 확인한다.
// 판정(judgeBrowserPc)은 순수 함수 — 시험 tests/pcCheck.test.mjs.

export type BrowserPc = {
  os: "windows" | "mac" | "linux" | "android" | "ios" | "other";
  arch: "x86" | "arm" | ""; // 모르면 ""
  mobile: boolean;
  gpu: string; // 그래픽카드 이름(WebGL), 모르면 ""
  cores: number | null;
  memoryGb: number | null; // 브라우저는 8 이상을 8로 알려 준다
};

export type PreItem = { label: string; value: string; status: "ok" | "warn" | "fail"; note: string };
export type PreCheck = { verdict: "ok" | "warn" | "fail"; headline: string; expected: string; items: PreItem[] };

const OS_LABEL: Record<BrowserPc["os"], string> = { windows: "윈도우", mac: "맥", linux: "리눅스", android: "안드로이드", ios: "아이폰·아이패드", other: "확인 불가" };

export function judgeBrowserPc(pc: BrowserPc): PreCheck {
  const items: PreItem[] = [];
  const nvidia = /nvidia|geforce|rtx|quadro/i.test(pc.gpu);
  const apple = /apple/i.test(pc.gpu) || (pc.os === "mac" && pc.arch === "arm");
  let expected = "";
  let osStatus: PreItem["status"] = "ok";
  let osNote = "";

  if (pc.mobile || pc.os === "android" || pc.os === "ios") {
    osStatus = "fail";
    osNote = "휴대폰·태블릿에는 엔진을 설치할 수 없습니다. 윈도우 PC나 Apple Silicon 맥에서 열어 주세요. 만든 곡 듣기·내려받기는 휴대폰에서도 됩니다.";
  } else if (pc.os === "mac") {
    if (pc.arch === "x86" && !apple) {
      osStatus = "fail";
      osNote = "Intel 맥은 지원하지 않습니다. 음악 모델이 Intel 맥용으로 나오지 않습니다.";
    } else if (apple) expected = "Apple Silicon 맥 — 「표준」 구성";
    else {
      osStatus = "warn";
      osNote = "Apple Silicon(M1 이상)인지 확인하지 못했습니다. 엔진을 켜면 정확히 검사합니다.";
    }
  } else if (pc.os === "windows") {
    if (pc.arch === "arm") {
      osStatus = "fail";
      osNote = "ARM 윈도우(예: Snapdragon 노트북)는 지원하지 않습니다. 64비트 인텔·AMD PC가 필요합니다.";
    } else expected = nvidia ? "NVIDIA 그래픽카드 — 고품질 모드(구성은 그래픽 메모리에 따라)" : "CPU 모드 — 「기본」 구성, 30초 곡 약 1분 30초";
  } else if (pc.os === "linux") {
    osStatus = "warn";
    osNote = "리눅스는 시험 지원입니다.";
    expected = nvidia ? "NVIDIA 그래픽카드 — 고품질 모드" : "CPU 모드";
  } else {
    osStatus = "fail";
    osNote = "운영체제를 확인하지 못했습니다. 윈도우 PC나 Apple Silicon 맥에서 열어 주세요.";
  }
  items.push({ label: "운영체제", value: OS_LABEL[pc.os], status: osStatus, note: osNote });
  items.push({ label: "프로세서 종류", value: pc.arch === "x86" ? "64비트 인텔·AMD" : pc.arch === "arm" ? "ARM" : "확인 불가", status: pc.arch ? "ok" : "warn", note: "" });
  if (osStatus !== "fail") {
    items.push({
      label: "그래픽",
      value: pc.gpu || "확인 불가",
      status: nvidia || apple ? "ok" : "warn",
      note: nvidia ? "고품질 모드로 만들 수 있습니다." : apple ? "" : "NVIDIA 그래픽카드가 없으면 CPU로 만들어 느립니다.",
    });
    if (pc.cores != null) items.push({ label: "CPU 코어", value: `${pc.cores}개`, status: pc.cores >= 4 ? "ok" : "warn", note: pc.cores >= 4 ? "" : "4개 이상을 권장합니다." });
    if (pc.memoryGb != null)
      items.push({
        label: "메모리",
        value: pc.memoryGb >= 8 ? "8GB 이상" : `${pc.memoryGb}GB`,
        status: pc.memoryGb >= 8 ? "ok" : "fail",
        note: pc.memoryGb >= 8 ? "정확한 크기는 엔진이 검사합니다." : "8GB 이상이 필요합니다.",
      });
  }
  const verdict = items.some((i) => i.status === "fail") ? "fail" : items.some((i) => i.status === "warn") ? "warn" : "ok";
  const headline = verdict === "fail" ? "이 기기에는 설치할 수 없습니다" : verdict === "warn" ? "설치할 수 있을 것 같습니다(엔진을 켜면 정확히 검사)" : "설치할 수 있습니다";
  return { verdict, headline, expected, items };
}

/** 그래픽카드 이름 — WebGL의 실제 이름(예: "ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 …)")에서 이름만 */
export function cleanGpuName(renderer: string): string {
  const parts = renderer.startsWith("ANGLE (") ? renderer.slice(7).split(/,\s*/) : [];
  const name = parts.length >= 2 ? parts[1] : renderer;
  return name.replace(/\s+\(0x[0-9a-f]+\).*$/i, "").replace(/\s+(Direct3D|OpenGL|Metal|Vulkan).*$/i, "").trim();
}

/** 브라우저에서 정보 모으기(화면에서만 부른다) */
export async function collectBrowserPc(): Promise<BrowserPc> {
  const nav = navigator as Navigator & {
    userAgentData?: { mobile: boolean; platform: string; getHighEntropyValues(h: string[]): Promise<{ architecture?: string }> };
    deviceMemory?: number;
  };
  const ua = nav.userAgent;
  let os: BrowserPc["os"] = /android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) ? "ios" : /windows/i.test(ua) ? "windows" : /mac os x|macintosh/i.test(ua) ? "mac" : /linux/i.test(ua) ? "linux" : "other";
  let arch: BrowserPc["arch"] = /arm64|aarch64/i.test(ua) ? "arm" : /win64|x64|x86_64|amd64|wow64/i.test(ua) ? "x86" : "";
  let mobile = /mobi/i.test(ua);
  if (nav.userAgentData) {
    mobile = nav.userAgentData.mobile;
    try {
      const h = await nav.userAgentData.getHighEntropyValues(["architecture"]);
      if (h.architecture === "arm") arch = "arm";
      else if (h.architecture === "x86") arch = "x86";
    } catch {}
  }
  // 아이패드는 맥처럼 보이므로 터치로 가린다
  if (os === "mac" && nav.maxTouchPoints > 1) os = "ios";
  let gpu = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    if (gl && ext) gpu = cleanGpuName(String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)));
  } catch {}
  if (os === "mac" && !arch && /apple/i.test(gpu)) arch = "arm";
  return { os, arch, mobile, gpu, cores: nav.hardwareConcurrency || null, memoryGb: nav.deviceMemory ?? null };
}
