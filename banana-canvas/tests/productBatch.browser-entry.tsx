// 시험 전용 진입점(ECOM-20261116-07): 실제 ProductBatchBoard를 로그인·운영 DB 없이 격리 페이지에 올린다.
// 운영 코드에는 포함되지 않는다. 서버는 tests/productBatch.browser.mjs.
import { createRoot } from "react-dom/client";
import { ProductBatchBoard } from "../src/components/batch/ProductBatchBoard";

createRoot(document.getElementById("root")!).render(<ProductBatchBoard />);
