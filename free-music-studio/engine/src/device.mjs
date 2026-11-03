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
