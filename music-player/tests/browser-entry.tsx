// 시험 전용 진입점: 실제 Player 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
import { createRoot } from "react-dom/client";
import { AudioEngine } from "../src/lib/player/engine";
import { Player } from "../src/components/player/Player";

// 시험에서 소리 그래프를 직접 들여다볼 수 있게 인스턴스를 노출한다
const originalEnsure = AudioEngine.prototype.ensure;
AudioEngine.prototype.ensure = function patched(this: AudioEngine) {
  (window as unknown as { __engine: AudioEngine }).__engine = this;
  return originalEnsure.call(this);
};

const params = new URLSearchParams(location.search);
createRoot(document.getElementById("root")!).render(<Player userId={params.get("user") || "fixture-a"} />);
