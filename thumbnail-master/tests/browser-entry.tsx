// 시험 전용 진입점: 실제 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
import { createRoot } from "react-dom/client";
import { Studio } from "../src/components/studio/Studio";
import { ProjectList } from "../src/components/workspace/ProjectList";
import { EMPTY_DOC, EMPTY_SET } from "../src/lib/tmb/types";

const q = new URLSearchParams(location.search);
const root = createRoot(document.getElementById("root")!);
if (q.get("view") === "list") root.render(<ProjectList />);
else {
  root.render(
    <Studio
      projectId="00000000-0000-4000-8000-000000000001"
      initialName="제목 없는 썸네일"
      initialDoc={EMPTY_DOC}
      initialImages={{ a: EMPTY_SET, b: EMPTY_SET }}
      initialUrls={{}}
    />,
  );
}
