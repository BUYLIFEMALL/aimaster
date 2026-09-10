import * as XLSX from "xlsx";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * BroadcastRecipientsSection의 "가져오기"가 실제로 읽는 컬럼
 * (lib/broadcastRecipients.ts의 parseBroadcastRecipientsWorkbook)과 이름/순서를 맞춘
 * 샘플 엑셀 양식을 내려준다 — stepmail의 app/api/leads/template/route.ts와 동일한 패턴.
 */
const HEADERS = ["이름", "전화번호", "이메일"];
const SAMPLE_ROW = ["친구1", "01012345678", "friend1@example.com"];

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, SAMPLE_ROW]);
  sheet["!cols"] = HEADERS.map((h) => ({ wch: Math.max(12, h.length + 4) }));

  // 전화번호 열을 텍스트 서식("@")으로 지정한다 — 안 하면 엑셀이 "01012345678"을 숫자로
  // 인식해서 맨 앞 0을 지워버린다(예: 1012345678). 서버 파싱 쪽(normalizePhone)에서도
  // 한 번 더 복구하지만, 애초에 이 문제가 덜 생기도록 템플릿 단계에서도 막아둔다.
  const phoneCol = XLSX.utils.encode_col(HEADERS.indexOf("전화번호"));
  const templateRows = 200;
  for (let r = 0; r < templateRows; r++) {
    const addr = `${phoneCol}${r + 1}`;
    if (sheet[addr]) sheet[addr].z = "@";
    else sheet[addr] = { t: "s", v: "", z: "@" };
  }
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:B2");
  range.e.r = Math.max(range.e.r, templateRows - 1);
  sheet["!ref"] = XLSX.utils.encode_range(range);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "수신자");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="kakao_broadcast_recipients_template.xlsx"',
    },
  });
}
