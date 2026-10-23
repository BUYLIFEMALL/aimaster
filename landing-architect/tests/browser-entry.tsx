// 시험 전용 진입점: 실제 Workspace 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
import { createRoot } from "react-dom/client";
import { Workspace } from "../src/components/studio/Workspace";
import { EMPTY_DOC } from "../src/lib/lpa/types";

createRoot(document.getElementById("root")!).render(
  <Workspace projectId="00000000-0000-4000-8000-000000000001" initialName="제목 없는 기획" initialDoc={EMPTY_DOC} initialUpdatedAt="2026-10-13T00:00:00Z" />,
);
