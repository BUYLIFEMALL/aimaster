// Test-only entry. Never a Next.js route, never deployed as an authentication bypass.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Workspace } from "../src/components/Studio";
import type { Screen } from "../src/lib/navigation";
function Fixture() {
  const [screen, setScreen] = useState<Screen>("translator");
  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          zIndex: 100,
          fontSize: 10,
          background: "#fff3d2",
          padding: 4,
        }}
      >
        로컬 화면 검수 · AI·DB 응답은 시험 데이터입니다.
      </div>
      <Workspace email="검수용 화면" screen={screen} navigate={setScreen} />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
