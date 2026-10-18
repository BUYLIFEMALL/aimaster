// 시험 전용 진입점: 실제 Studio 컴포넌트를 로그인 없이 시험 서버에 올린다(운영 코드에는 포함되지 않음).
import { createRoot } from "react-dom/client";
import { Studio } from "../src/components/studio/Studio";

createRoot(document.getElementById("root")!).render(<Studio userId="browser-test-user" />);
