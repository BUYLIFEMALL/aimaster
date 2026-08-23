import * as XLSX from "xlsx";
import { checkProgramAccessApi } from "@/lib/access";

/**
 * LeadImportForm의 "가져오기"가 실제로 읽는 컬럼(lib/leads.ts의 parseLeadsWorkbook)과
 * 이름/순서를 맞춘 샘플 엑셀 양식을 내려준다. 리드 목록 화면에 실제로 쓰이는 항목만 담는다
 * — 입력일/최종수정일은 가져오기·발송 시 시스템이 자동으로 채우는 값이라 입력폼에서 뺀다.
 */
const HEADERS = ["이메일", "닉네임", "채널", "상태"];
const SAMPLE_ROW = ["example@email.com", "홍길동", "인스타그램", "미발송"];

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, SAMPLE_ROW]);
  sheet["!cols"] = HEADERS.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "잠재고객");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="stepmail_leads_template.xlsx"',
    },
  });
}
