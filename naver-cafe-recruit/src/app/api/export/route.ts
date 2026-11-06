import * as XLSX from "xlsx";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { rpcFor } from "@/lib/recruitApi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 초안(2026-11-05 맥미니, 뼈대 생기기 전): 회원 본인이 모은 대상·보낸 기록을 엑셀로 내려받는다.
// 보관은 30일이라(주인님 확정), 지워지기 전에 회원이 자기 PC에 보관할 수 있게 하는 기능.
// 엑셀 방식은 kakao_auto_poster/booking-reminder/stepmail 과 같은 xlsx(SheetJS 0.20.3).
// 자료는 ncr_dispatch(service_role)로 그 회원 것만 읽는다 — 다른 회원 자료는 섞이지 않음.

type Row = Record<string, unknown>;

const TARGET_COLUMNS: [string, string][] = [
  ["모은 방식", "source_mode"],
  ["네이버 아이디", "naver_id"],
  ["닉네임", "nickname"],
  ["등급", "member_grade"],
  ["카페", "cafe_id"],
  ["게시판", "board_name"],
  ["글 제목", "article_title"],
  ["상태", "state"],
  ["모은 시각", "created_at"],
];
const SENT_COLUMNS: [string, string][] = [
  ["초대한 카페", "cafe_id"],
  ["네이버 아이디", "naver_id"],
  ["결과", "result"],
  ["사유", "detail"],
  ["보낸 시각", "sent_at"],
];
const MEMBER_COLUMNS: [string, string][] = [
  ["카페", "cafe_name"],
  ["카페 번호", "cafe_id"],
  ["게시판", "board_name"],
  ["닉네임", "nickname"],
  ["등급", "member_grade"],
  ["처음 본 시각", "first_seen_at"],
  ["마지막 본 시각", "last_seen_at"],
];
const LABELS: Record<string, string> = {
  extract: "카페 활동 회원", known: "아는 사람",
  draft: "검토 전", reviewed: "승인", skipped: "제외",
  sent: "보냄", failed: "실패", limited: "제한으로 중지",
};

function kst(value: unknown) {
  if (typeof value !== "string") return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function sheetOf(rows: Row[], columns: [string, string][]) {
  const body = rows.map((r) =>
    columns.map(([, key]) => {
      const v = r[key];
      if (key.endsWith("_at")) return kst(v);
      if (typeof v === "string" && LABELS[v] && (key === "source_mode" || key === "state" || key === "result")) return LABELS[v];
      return v ?? "";
    }),
  );
  const sheet = XLSX.utils.aoa_to_sheet([columns.map(([h]) => h), ...body]);
  sheet["!cols"] = columns.map(([h]) => ({ wch: Math.max(12, h.length + 6) }));
  return sheet;
}

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return Response.json({ error: access.error }, { status: access.status });
  }
  const admin = createAdminClient();
  const call = async (operation: string) => {
    const { data, error } = await admin.rpc(rpcFor(operation), { p_user_id: access.user.id, p_operation: operation, p_payload: {} });
    if (error) throw new Error("자료를 불러오지 못했습니다.");
    return data as Row;
  };

  let targets: Row[] = [];
  let sent: Row[] = [];
  let members: Row[] = [];
  try {
    targets = ((await call("targets_list")).targets as Row[]) ?? [];
    sent = ((await call("sent_list")).sent as Row[]) ?? [];
    members = ((await call("members_list")).members as Row[]) ?? [];
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "자료를 불러오지 못했습니다." }, { status: 500 });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetOf(targets, TARGET_COLUMNS), "모은 대상");
  XLSX.utils.book_append_sheet(workbook, sheetOf(sent, SENT_COLUMNS), "보낸 기록");
  XLSX.utils.book_append_sheet(workbook, sheetOf(members, MEMBER_COLUMNS), "활동 회원 명단");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="naver-cafe-recruit_${day}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
