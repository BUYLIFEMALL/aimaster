import * as XLSX from "xlsx";
import { checkProgramAccessApi } from "@/lib/access";
import { IMPORT_HEADERS } from "@/lib/reservationImport";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 예약 엑셀 일괄 등록 양식(v1.28) — lib/reservationImport.ts가 실제로 읽는 열 이름과 같다. */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return Response.json({ error: access.error }, { status: access.status });

  const sample = ["홍길동", "010-1234-5678", "hong@example.com", "2026-12-24 14:00", "첫 방문"];
  const sheet = XLSX.utils.aoa_to_sheet([[...IMPORT_HEADERS], sample]);
  sheet["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 20 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "예약");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("예약_일괄등록_양식.xlsx")}`,
    },
  });
}
