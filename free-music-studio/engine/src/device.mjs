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
  const p = (tier, label, dit, lm, steps, offload = false) => ({ tier, label, dit, lm, steps, offload });
  if (device === "cuda") {
    const v = vramGb ?? 0;
    if (v >= 24) return p("max", "최고 품질 · XL 음악 모델 + 4B 언어 모델", "acestep-v15-xl-sft", "acestep-5Hz-lm-4B", 50);
    if (v >= 20) return p("max", "최고 품질 · XL 음악 모델 + 1.7B 언어 모델", "acestep-v15-xl-sft", "acestep-5Hz-lm-1.7B", 50);
    if (v >= 15) return p("high", "고품질 · XL 음악 모델(일부 CPU 사용) + 1.7B 언어 모델", "acestep-v15-xl-turbo", "acestep-5Hz-lm-1.7B", 8, true);
    if (v >= 12) return p("high", "고품질 · 표준 음악 모델 + 1.7B 언어 모델", "acestep-v15-turbo", "acestep-5Hz-lm-1.7B", 8);
    if (v >= 6) return p("standard", "표준 · 표준 음악 모델 + 0.6B 언어 모델", "acestep-v15-turbo", "acestep-5Hz-lm-0.6B", 8);
    return p("basic", "기본 · 표준 음악 모델(언어 모델 없음)", "acestep-v15-turbo", null, 8, true);
  }
  if (device === "mps") return p("standard", "표준 · 표준 음악 모델 + 0.6B 언어 모델(Apple 맥)", "acestep-v15-turbo", "acestep-5Hz-lm-0.6B", 8);
  return p("basic", "기본 · CPU 모드(언어 모델 없음)", "acestep-v15-turbo", null, 8);
}
