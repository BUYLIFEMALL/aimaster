"use server";

// EC-W10 견적 비교 기록 — 회원 본인 것만(RLS + user_id 조건), 30일 안 것만 보여 준다(정리 크론이 지움).
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { retentionCutoff } from "@/lib/retention";
import { sanitizeReport, type QuoteReport } from "@/lib/factoryQuotes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (table: string) => any };

export type FactoryProject = {
  id: string;
  name: string;
  pasted_text: string;
  files: { name: string; size: number }[];
  updated_at: string;
  report: QuoteReport | null;
  report_at: string | null;
  model: string | null;
};

export async function listFactoryProjectsAction(): Promise<{ projects: FactoryProject[]; error?: string }> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as Loose;
  const { data, error } = await db
    .from("factory_quote_projects")
    .select("id, name, pasted_text, files, updated_at, factory_quote_reports(report, model, created_at)")
    .eq("user_id", user.id)
    .gte("updated_at", retentionCutoff())
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) return { projects: [], error: "견적 비교 기록을 불러오지 못했습니다." };
  const projects = ((data ?? []) as Record<string, unknown>[]).map((p) => {
    const reports = ((p.factory_quote_reports as { report: unknown; model: string; created_at: string }[]) ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = reports[0];
    return {
      id: String(p.id),
      name: String(p.name ?? ""),
      pasted_text: String(p.pasted_text ?? ""),
      files: Array.isArray(p.files) ? (p.files as { name: string; size: number }[]) : [],
      updated_at: String(p.updated_at ?? ""),
      report: latest ? sanitizeReport(latest.report) : null,
      report_at: latest?.created_at ?? null,
      model: latest?.model ?? null,
    };
  });
  return { projects };
}

export async function deleteFactoryProjectAction(id: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as Loose;
  const { error } = await db.from("factory_quote_projects").delete().eq("id", String(id)).eq("user_id", user.id);
  return error ? { error: "지우지 못했습니다." } : {};
}
