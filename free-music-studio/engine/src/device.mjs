// 이 PC에서 음악 엔진을 어떤 장치로 돌릴지 정한다(순수 함수 — 시험 tests/device.test.mjs).
// 근거: 2026-11-03 사전 검증(플랜 §8) — Intel 내장 그래픽은 메모리 부족으로 실패해 CPU 모드,
// Intel 맥은 음악 모델·PyTorch가 나오지 않아 미지원, NVIDIA는 고품질 모드.

/**
 * @param {{ platform: string, arch: string, nvidia: boolean }} pc
 * @returns {{ supported: boolean, device: string, initLlm: boolean, mode: string, reason: string }}
 */
export function chooseDevice({ platform, arch, nvidia }) {
  if (platform === "darwin") {
    if (arch !== "arm64") {
      return { supported: false, device: "", initLlm: false, mode: "미지원", reason: "Intel 맥은 지원하지 않습니다. 음악 모델이 Intel 맥용으로 나오지 않습니다." };
    }
    return { supported: true, device: "mps", initLlm: true, mode: "고품질 모드", reason: "Apple Silicon 맥 — 아직 실제 측정 전입니다." };
  }
  if (platform === "win32" || platform === "linux") {
    if (arch !== "x64") {
      return { supported: false, device: "", initLlm: false, mode: "미지원", reason: "64비트(x64) PC에서만 동작합니다." };
    }
    if (nvidia) return { supported: true, device: "cuda", initLlm: true, mode: "고품질 모드", reason: "NVIDIA 그래픽카드로 생성합니다." };
    return { supported: true, device: "cpu", initLlm: false, mode: "CPU 모드", reason: "그래픽카드 없이 CPU로 생성합니다. 30초 곡에 약 1분 30초가 걸립니다." };
  }
  return { supported: false, device: "", initLlm: false, mode: "미지원", reason: "윈도우·맥(Apple Silicon)에서만 동작합니다." };
}

/**
 * 음질 설정 — 주인님 지시(2026-11-03) 「음악 퀄리티는 최고 수준으로」. 그래픽 메모리에 맞는 가장 좋은 조합을 고른다.
 * 근거: ACE-Step 1.5 README 「Which Model Should I Choose?」·Model Zoo(XL·4B는 MIT, 상업 이용 가능 — HF 모델 카드 확인).
 * dit: 음악 모델, lm: 언어 모델(곡 구성·멜로디 계획, null이면 안 띄움), steps: 생성 단계(turbo 8 · sft 50),
 * offload: 그래픽 메모리가 모자라 일부를 CPU로 넘김.
 * @param {{ device: string, vramGb: number | null }} pc
 */
export function qualityProfile({ device, vramGb }) {
  const t = (id) => QUALITY_TIERS.find((x) => x.id === id);
  if (device === "cuda") {
    const v = vramGb ?? 0;
    const fit = QUALITY_TIERS.find((x) => v >= x.minVramGb) ?? t("basic");
    // 그래픽 메모리 6GB 미만이면 기본 구성도 일부를 CPU로 넘긴다
    return fit.id === "basic" ? { ...fit, offload: true } : fit;
  }
  if (device === "mps") return { ...t("standard"), label: "표준 · 표준 음악 모델 + 0.6B 언어 모델(Apple 맥)" };
  return { ...t("basic"), label: "기본 · CPU 모드(언어 모델 없음)" };
}

/**
 * 음악 모델 구성 표 — 좋은 것부터. minVramGb: NVIDIA 그래픽 메모리 기준(qualityProfile과 같은 경계),
 * diskGb: 처음 받을 때 필요한 여유(실행 환경·공통 6GB + 음악 모델 + 언어 모델, 넉넉히 올림).
 * 근거: 미니PC 실측(2026-11-03) 표준 음악 모델 4.5GB·1.7B 3.5GB·공통 1.4GB·실행 환경 4.3GB,
 * XL 음악 모델 약 10GB·4B 약 8GB·0.6B 약 1.3GB는 공식 모델 크기 기준 추정(마스터PC 실측 뒤 고침).
 * 2026-11-04 미니PC 처음 설치 실측: 실행 환경(.venv) 6.1GB + uv 보관 폴더 약 4.3GB → 처음 계산(4.3GB)보다 6GB 더 들어 모두 +6.
 */
export const QUALITY_TIERS = [
  { id: "max4b", tier: "max", name: "최고 품질 4B", label: "최고 품질 · XL 음악 모델 + 4B 언어 모델", dit: "acestep-v15-xl-sft", lm: "acestep-5Hz-lm-4B", steps: 50, offload: false, minVramGb: 24, diskGb: 31 },
  { id: "max", tier: "max", name: "최고 품질", label: "최고 품질 · XL 음악 모델 + 1.7B 언어 모델", dit: "acestep-v15-xl-sft", lm: "acestep-5Hz-lm-1.7B", steps: 50, offload: false, minVramGb: 20, diskGb: 27 },
  { id: "xlturbo", tier: "high", name: "XL 고품질", label: "고품질 · XL 음악 모델(일부 CPU 사용) + 1.7B 언어 모델", dit: "acestep-v15-xl-turbo", lm: "acestep-5Hz-lm-1.7B", steps: 8, offload: true, minVramGb: 15, diskGb: 27 },
  { id: "high", tier: "high", name: "고품질", label: "고품질 · 표준 음악 모델 + 1.7B 언어 모델", dit: "acestep-v15-turbo", lm: "acestep-5Hz-lm-1.7B", steps: 8, offload: false, minVramGb: 12, diskGb: 21 },
  { id: "standard", tier: "standard", name: "표준", label: "표준 · 표준 음악 모델 + 0.6B 언어 모델", dit: "acestep-v15-turbo", lm: "acestep-5Hz-lm-0.6B", steps: 8, offload: false, minVramGb: 6, diskGb: 19 },
  { id: "basic", tier: "basic", name: "기본", label: "기본 · 표준 음악 모델(언어 모델 없음)", dit: "acestep-v15-turbo", lm: null, steps: 8, offload: false, minVramGb: 0, diskGb: 17 },
];

/**
 * 이 PC에서 고를 수 있는 구성 — 모두 보여 주되 안 되는 것은 이유를 붙여 막는다.
 * @param {{ device: string, vramGb: number|null, freeGb: number|null, installedModels?: string[] }} pc
 */
export function qualityOptions({ device, vramGb, freeGb, installedModels = [] }) {
  const recommended = device ? qualityProfile({ device, vramGb }).id : "";
  const has = (m) => !m || installedModels.includes(m);
  return QUALITY_TIERS.map((tier) => {
    const installed = has(tier.dit) && has(tier.lm);
    let reason = "";
    if (!device) reason = "이 PC는 지원하지 않습니다.";
    else if (device === "cpu" && tier.id !== "basic") reason = "NVIDIA 그래픽카드가 없어 CPU 모드에서는 「기본」만 쓸 수 있습니다.";
    else if (device === "mps" && !["standard", "basic"].includes(tier.id)) reason = "Apple 맥에서는 「표준」까지만 지원합니다.";
    else if (device === "cuda" && vramGb == null && tier.id !== "basic") reason = "그래픽 메모리를 확인하지 못했습니다. 「다시 검사」를 눌러 주세요.";
    else if (device === "cuda" && vramGb != null && vramGb < tier.minVramGb) reason = `그래픽 메모리 ${vramGb}GB — 이 구성은 ${tier.minVramGb}GB 이상이 필요합니다.`;
    else if (!installed && freeGb != null && freeGb < tier.diskGb) reason = `저장 공간 여유 ${freeGb}GB — 처음 받을 때 약 ${tier.diskGb}GB가 필요합니다.`;
    return { ...tier, supported: !reason, recommended: tier.id === recommended, installed, reason };
  });
}

/** 검사 항목 하나: status ok(통과)·warn(주의)·fail(안 됨) */
const item = (label, value, status, note = "") => ({ label, value, status, note });

/**
 * PC 검사 결과를 화면용 항목으로(순수 함수). sys는 system.mjs inspectSystem() 결과.
 * @returns {{ verdict: "ok"|"warn"|"fail", headline: string, items: ReturnType<typeof item>[] }}
 */
export function checkItems(sys, device, recommendedTier) {
  const items = [];
  const osOk = device.supported;
  items.push(item("운영체제", sys.os, osOk ? "ok" : "fail", osOk ? "" : device.reason));
  items.push(item("CPU", `${sys.cpu}${sys.cores ? ` · ${sys.cores}코어` : ""}`, "ok"));
  if (sys.ramGb == null) items.push(item("메모리", "확인 불가", "warn"));
  else if (sys.ramGb < 8) items.push(item("메모리", `${sys.ramGb}GB`, "fail", "8GB 이상이 필요합니다."));
  else if (sys.ramGb < 16) items.push(item("메모리", `${sys.ramGb}GB`, "warn", "16GB 이상을 권장합니다(긴 곡·영상 만들기)."));
  else items.push(item("메모리", `${sys.ramGb}GB`, "ok"));
  if (device.device === "cuda") {
    items.push(item("그래픽카드", sys.gpu, "ok", "고품질 모드로 만듭니다."));
    items.push(item("그래픽 메모리", sys.vramGb != null ? `${sys.vramGb}GB` : "확인 불가", sys.vramGb != null && sys.vramGb >= 6 ? "ok" : "warn", sys.vramGb != null && sys.vramGb < 6 ? "6GB 미만이라 일부를 CPU로 넘겨 느릴 수 있습니다." : ""));
    if (sys.driver) items.push(item("그래픽 드라이버", sys.driver, "ok"));
  } else if (device.device === "mps") {
    items.push(item("그래픽", sys.gpu || "Apple Silicon", "ok", "통합 메모리를 함께 씁니다."));
  } else if (device.supported) {
    items.push(item("그래픽카드", sys.gpu || "확인 불가", "warn", "NVIDIA 그래픽카드가 없어 CPU 모드입니다. 30초 곡에 약 1분 30초 걸립니다."));
  }
  const need = recommendedTier?.installed ? 0 : (recommendedTier?.diskGb ?? 11);
  if (sys.freeGb == null) items.push(item("저장 공간", "확인 불가", "warn", sys.freePath ? `확인 위치: ${sys.freePath}` : ""));
  else if (sys.freeGb < need) items.push(item("저장 공간", `여유 ${sys.freeGb}GB`, "fail", `추천 구성을 처음 받을 때 약 ${need}GB가 필요합니다.`));
  else if (sys.freeGb < need + 10) items.push(item("저장 공간", `여유 ${sys.freeGb}GB`, "warn", "곡·영상을 저장하려면 10GB 이상 더 여유를 두세요."));
  else items.push(item("저장 공간", `여유 ${sys.freeGb}GB`, "ok", need ? `처음 받을 모델 약 ${need}GB` : "추천 구성 모델을 이미 받아 두었습니다."));
  items.push(item("MP3 변환 도구", sys.ffmpeg ? "있음" : "없음", sys.ffmpeg ? "ok" : "warn", sys.ffmpeg ? "" : "없으면 무손실 FLAC 원음만 받을 수 있습니다."));
  const verdict = items.some((i) => i.status === "fail") ? "fail" : items.some((i) => i.status === "warn") ? "warn" : "ok";
  const headline = verdict === "fail" ? "이 PC에는 설치할 수 없습니다" : verdict === "warn" ? "설치할 수 있습니다(확인할 점이 있습니다)" : "설치할 수 있습니다";
  return { verdict, headline, items };
}
