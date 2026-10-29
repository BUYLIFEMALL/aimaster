"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, MessageSquareWarning, StickyNote, Search, ChevronDown, ChevronRight, XCircle, CheckCircle2, ExternalLink, Copy, Check, Terminal } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import DocDialogs, { type Dialog } from "./DocDialogs";
import AiSummaryButton from "./AiSummaryButton";
import { OWNER_ACTION_CATEGORIES, type DevRequest } from "./types";
import type { ActiveWorkRow, CategoryMapData, RegistryData, RoleStatus, TableRow } from "@/lib/devDocs/parse";
import type { DevDocsManifest, ManifestEntry } from "@/lib/devDocs/github";

export type DevDocsTab = "overview" | "in-progress" | "completed" | "waiting" | "planned" | "analyzed" | "admin-action" | "guidelines" | "programs" | "requests";

type ProgramMeta = { slug: string; name: string; version: string | null; app_url: string | null };

const TAB_LABEL: Record<DevDocsTab, string> = { overview: "한눈에 보기", "in-progress": "진행 중", completed: "개발완료", waiting: "승인 대기", planned: "예정", analyzed: "분석 완료", "admin-action": "관리자 실행요청", guidelines: "지침", programs: "프로그램", requests: "요청함" };
const REGISTRY = "docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md";
const STALE_MS = 3 * 86400000;
const KIND_LABEL: Record<string, string> = { doc_edit: "수정안", doc_comment: "관리자 지시", role_note: "역할 메모", work_result: "작업 결과", owner_action: "해 줄 일" };
/** 관리자 → 세션 방향(수정안·지시·메모). 0044의 작업 결과·해 줄 일(세션 → 관리자)과 구분 */
const isAdminKind = (r: DevRequest) => r.kind === "doc_edit" || r.kind === "doc_comment" || r.kind === "role_note";
const STATUS_LABEL: Record<string, string> = { open: "반영 대기", applied: "반영됨", rejected: "반려·취소" };
const DECISION_LABEL: Record<string, string> = { independent: "🆕 독립", merge: "🔗 병합", hold: "⏸ 보류", exclude: "❌ 제외", unknown: "?" };

const KEY_DOCS: { path: string; title: string }[] = [
  { path: "docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md", title: "외부 프로그램 개발분석표" },
  { path: "docs/CATEGORY_GUIDE_MAP.md", title: "카테고리 지침 지도" },
  { path: "docs/roles/README.md", title: "역할별 현황 — 역할 목록·규칙" },
  { path: "docs/PROGRAM_CAPABILITY_MAP.md", title: "프로그램 비교표" },
  { path: "docs/BLOG_FEATURE_MATRIX.md", title: "블로그 기능 상세 비교표" },
  { path: "docs/PROGRAM_ANALYSIS_PLANNING_GUIDE.md", title: "신규·외부 프로그램 분석·개발 플랜 지침" },
  { path: "docs/PROGRAM_COMPARISON_ANALYSIS_GUIDE.md", title: "프로그램 비교 분석 매뉴얼" },
  { path: "docs/PROGRAM_IDEA_BACKLOG.md", title: "공통 아이디어 표" },
  { path: "docs/ACTIVE_WORK.md", title: "작업 중 표" },
];
const ROOT_TITLES: Record<string, string> = { "CLAUDE.md": "메인 지침 — Claude Code", "AGENTS.md": "메인 지침 — Codex", "GEMINI.md": "메인 지침 — Gemini/agy", "DESIGN.md": "디자인 메인 지침" };

function plain(s: string) {
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*]/g, "").trim();
}
function fmtSize(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`;
}

export default function DevDocsBoard(props: {
  tab: DevDocsTab;
  roles: RoleStatus[];
  activeWork: ActiveWorkRow[];
  registry: RegistryData | null;
  categoryMap: CategoryMapData | null;
  manifest: DevDocsManifest | null;
  programs: ProgramMeta[];
  initialRequests: DevRequest[];
  loadErrors: string[];
}) {
  const { tab, roles, activeWork, registry, manifest, programs } = props;
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [requests, setRequests] = useState<DevRequest[]>(props.initialRequests);
  const onSaved = (r: DevRequest) => setRequests((rs) => [r, ...rs.filter((x) => x.id !== r.id)]);
  const openCount = (path: string) => requests.filter((r) => r.target_path === path && r.status === "open").length;
  const roleNoteCount = (role: string) => requests.filter((r) => r.target_role === role && r.status === "open").length;
  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);

  const docActions = (path: string, editable = true) => (
    <div className="flex shrink-0 items-center gap-1">
      {openCount(path) > 0 && <span className="mr-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">대기 {openCount(path)}</span>}
      <IconBtn title="보기" onClick={() => setDialog({ type: "view", path })}><Eye size={15} /></IconBtn>
      {editable && <IconBtn title="직접 수정" onClick={() => setDialog({ type: "edit", path })}><Pencil size={15} /></IconBtn>}
      <IconBtn title="관리자 지시 달기" onClick={() => setDialog({ type: "comment", path })}><MessageSquareWarning size={15} /></IconBtn>
    </div>
  );

  return (
    <div>
      {props.loadErrors.length > 0 && (
        <GlassCard className="mb-6 border border-rose-400/30 p-4 text-sm text-rose-200">
          일부 문서를 읽지 못했습니다: {props.loadErrors.join(" · ")}. 문서가 아직 GitHub에 푸시되지 않았거나 잠시 연결이 안 된 경우입니다.
        </GlassCard>
      )}

      <AiSummaryButton tab={tab} label={TAB_LABEL[tab]} />
      <div id="devdocs-tab-content">
      {tab === "overview" && <Overview roles={roles} activeWork={activeWork} registry={registry} requests={requests} setDialog={setDialog} roleNoteCount={roleNoteCount} />}

      {tab === "in-progress" && (
        <Sections>
          <Section title="🔧 작업 중 표 (지금 손대고 있는 폴더)" count={activeWork.length} action={docActions("docs/ACTIVE_WORK.md")}>
            {activeWork.length === 0 ? <Empty>작업 중인 세션이 없습니다.</Empty> : activeWork.map((w, i) => (
              <Row key={i} no={`진${i + 1}`} title={plain(w.work).slice(0, 160)} sub={`${plain(w.agent)} · ${w.start}`} badge={w.role ? `역할 ${w.role}` : "역할 표시 없음"}
                right={w.role && roleById[w.role] ? docActions(roleById[w.role].path) : null}>
                <p className="mt-1 text-xs text-subtext">{plain(w.folders).slice(0, 200)}</p>
              </Row>
            ))}
          </Section>
          <RoleTableSection prefix="진" title="📋 역할별 「지금 하는 일」" roles={roles} pick={(r) => r.now} cols={["프로그램", "작업", "시작", "상태"]} docActions={docActions} />
        </Sections>
      )}

      {tab === "completed" && (
        <Sections>
          <GlassCard className="p-4 text-xs text-white/80">
            <b className="text-white">개발완료</b>는 완료된 작업을 <b className="text-white">카테고리(담당 분야)별 · 프로그램별</b>로 모은 것입니다. 각 역할의 「최근 완료」 표와, 세션이 남긴 작업 결과(커밋·링크)를 함께 보여 줍니다.
          </GlassCard>
          <RoleTableSection prefix="완" title="✅ 카테고리(담당 분야)별 · 프로그램별 최근 완료" roles={roles} pick={(r) => r.done} cols={["날짜", "프로그램·버전", "한 일", "배포"]} docActions={docActions} />
          {(() => {
            const wr = requests.filter((r) => r.kind === "work_result");
            return (
              <Section title="📬 세션 작업 결과 (커밋·링크)" count={wr.length}>
                {wr.length === 0 ? <Empty>아직 올라온 작업 결과가 없습니다.</Empty> : wr.map((r) => (
                  <Row key={r.id} no={`#${r.id.slice(0, 4)}`} title={r.title ?? "(제목 없음)"}
                    sub={`${r.from_session ?? "세션 미상"}${r.handled_at ? ` · ${new Date(r.handled_at).toLocaleDateString("ko-KR")}` : ""}${r.commit_sha ? ` · 커밋 ${r.commit_sha}` : ""}${r.cost ? ` · ${r.cost}` : ""}`}
                    right={r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer" title="링크 열기" className="rounded-lg p-2 text-subtext transition-colors hover:bg-white/10 hover:text-white"><ExternalLink size={15} /></a> : null}>
                    {r.note && <p className="mt-1 whitespace-pre-wrap text-xs text-white/80">{r.note}</p>}
                  </Row>
                ))}
              </Section>
            );
          })()}
        </Sections>
      )}

      {tab === "waiting" && (
        <Sections>
          <RoleTableSection prefix="대" title="⏳ 역할별 「대기 중」 (승인·결정 대기 포함)" roles={roles} pick={(r) => r.waiting} cols={["프로그램", "작업", "기다리는 것", "근거 문서"]} docActions={docActions} />
          <RegistrySection title="📝 승인·결정을 기다리는 외부 분석 (⏳·📝·⏸)" rows={(registry?.rows ?? []).filter((r) => /⏳|📝|⏸/.test(r.status))} registry={registry} setDialog={setDialog} docActions={docActions} />
          {registry && registry.pending.length > 0 && (
            <Section title="❓ 주인님 결정 대기 모음 (개발분석표 §5)" count={registry.pending.length} action={docActions(REGISTRY)}>
              {registry.pending.map((p, i) => <Row key={i} no={`결${i + 1}`} title={plain(p[1] ?? "")} sub={`${plain(p[0] ?? "")} · 담당 ${plain(p[2] ?? "")}`} />)}
            </Section>
          )}
        </Sections>
      )}

      {tab === "planned" && (
        <Sections>
          <Section title="🗓 역할별 「다음 첫 단계」" count={roles.reduce((n, r) => n + r.next.length, 0)}>
            {roles.filter((r) => r.next.length).map((r, i) => (
              <Row key={r.id} no={`예${i + 1}`} title={r.title} sub={`${plain(r.owner)} · 마지막 갱신 ${r.updated.slice(0, 16)}`} right={docActions(r.path)}>
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-white/80">{r.next.map((n, i) => <li key={i}>{plain(n)}</li>)}</ol>
              </Row>
            ))}
          </Section>
          <RegistrySection title="🔶 남은 묶음이 있는 외부 분석 (일부 반영)" rows={(registry?.rows ?? []).filter((r) => /🔶/.test(r.status))} registry={registry} setDialog={setDialog} docActions={docActions} />
        </Sections>
      )}

      {tab === "analyzed" && <Analyzed registry={registry} setDialog={setDialog} docActions={docActions} />}

      {tab === "guidelines" && <Guidelines manifest={manifest} roles={roles} categoryMap={props.categoryMap} docActions={docActions} />}

      {tab === "programs" && <Programs manifest={manifest} programs={programs} docActions={docActions} />}

      {tab === "admin-action" && <Requests requests={requests} setRequests={setRequests} setDialog={setDialog} focus="owner" />}
      {tab === "requests" && <Requests requests={requests} setRequests={setRequests} setDialog={setDialog} />}
      </div>

      <DocDialogs dialog={dialog} setDialog={setDialog} requests={requests} onSaved={onSaved} />
    </div>
  );
}

/* ---------- 공통 조각 ---------- */

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className="rounded-lg p-2 text-subtext transition-colors hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}
function Sections({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8">{children}</div>;
}
function Section({ title, count, action, children }: { title: string; count?: number; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-gold">{title}{count != null && <span className="ml-2 text-subtext font-normal">{count}</span>}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
/** CLI 터미널에 바로 붙여넣을 수 있게 한 줄로 복사(2026-10-29 주인님 「메뉴별로 필요한 곳은 다 붙이라니까」) */
function CopyLine({ text, icon, tone, title }: { text: string; icon?: React.ReactNode; tone?: string; title?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title={title ?? "이 항목을 한 줄로 복사 (CLI 터미널에 바로 붙여넣기)"} aria-label="한 줄 복사"
      onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(text.replace(/\s*\n\s*/g, " ")).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }}
      className={`shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10 ${tone ?? "text-subtext hover:text-white"}`}>
      {done ? <Check size={14} className="text-emerald-300" /> : (icon ?? <Copy size={14} />)}
    </button>
  );
}

function Row({ no, title, sub, badge, right, children, onClick }: { no?: string; title: string; sub?: string; badge?: string; right?: React.ReactNode; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className={`min-w-0 flex-1 ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
          <p className="text-sm font-semibold text-white">
            {no && <span className="mr-2 rounded bg-amber-400/20 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-300" title="채팅에서 이 번호로 말씀하시면 됩니다">{no}</span>}
            {badge && <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-subtext">{badge}</span>}
            {title}
          </p>
          {sub && <p className="mt-0.5 text-xs text-subtext">{sub}</p>}
          {children}
        </div>
        {no && <CopyLine text={`[${no}] ${title}${sub ? ` — ${sub}` : ""}`} />}
        {right}
      </div>
    </GlassCard>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-white/10 p-4 text-sm text-subtext">{children}</p>;
}

function RoleTableSection({ prefix, title, roles, pick, cols, docActions }: { prefix: string; title: string; roles: RoleStatus[]; pick: (r: RoleStatus) => TableRow[]; cols: string[]; docActions: (p: string) => React.ReactNode }) {
  const withRows = roles.filter((r) => pick(r).length);
  let seq = 0;
  return (
    <Section title={title} count={withRows.reduce((n, r) => n + pick(r).length, 0)}>
      {withRows.length === 0 ? <Empty>해당 항목이 없습니다.</Empty> : withRows.map((r) => (
        <Row key={r.id} title={r.title} sub={`${plain(r.owner)} · 마지막 갱신 ${r.updated.slice(0, 16)}${r.isDraft ? " · 초안(담당 확인 전)" : ""}`} right={docActions(r.path)}>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="border-b border-white/10 px-2 py-1 text-left font-medium text-subtext">번호</th>{cols.map((c) => <th key={c} className="border-b border-white/10 px-2 py-1 text-left font-medium text-subtext">{c}</th>)}</tr></thead>
              <tbody>{pick(r).map((row, i) => <tr key={i}><td className="border-b border-white/5 px-2 py-1 align-top font-mono text-[11px] font-bold text-amber-300">{(() => { const code = `${prefix}${++seq}`; return <span className="inline-flex items-center gap-1">{code}<CopyLine text={`[${code}] ${r.title} · ${cols.map((c, j) => `${c}: ${plain(row[j] ?? "")}`).join(" · ")}`} /></span>; })()}</td>{cols.map((_, j) => <td key={j} className="border-b border-white/5 px-2 py-1 align-top text-white/85">{plain(row[j] ?? "")}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Row>
      ))}
    </Section>
  );
}

function RegistrySection({ title, rows, registry, setDialog, docActions }: { title: string; rows: RegistryData["rows"]; registry: RegistryData | null; setDialog: (d: Dialog) => void; docActions: (p: string) => React.ReactNode }) {
  return (
    <Section title={title} count={rows.length} action={docActions(REGISTRY)}>
      {rows.length === 0 ? <Empty>해당 항목이 없습니다.</Empty> : rows.map((r) => (
        <Row key={r.id} no={r.id} badge={r.category} title={plain(r.origin)} sub={`${DECISION_LABEL[r.decisionType]} — ${plain(r.decision).replace(/^[🆕🔗⏸❌]\s*/u, "")}`}
          onClick={() => registry?.cards[r.id] && setDialog({ type: "markdown", title: `${r.id} ${plain(r.origin)}`, markdown: registry.cards[r.id], path: REGISTRY })}
          right={<span className="shrink-0 text-lg" title="상태">{r.status}</span>}>
          <p className="mt-1 text-sm text-white/80">{plain(r.feature)}</p>
          <p className="mt-1 text-xs text-subtext">우리 대상: {plain(r.target)}</p>
        </Row>
      ))}
    </Section>
  );
}

/* ---------- 탭별 ---------- */

function Overview({ roles, activeWork, registry, requests, setDialog, roleNoteCount }: { roles: RoleStatus[]; activeWork: ActiveWorkRow[]; registry: RegistryData | null; requests: DevRequest[]; setDialog: (d: Dialog) => void; roleNoteCount: (r: string) => number }) {
  const now = Date.now();
  const inProgress = [
    ...activeWork.map((w) => ({ who: w.role || "역할 표시 없음", text: plain(w.work), src: "작업 중 표" })),
    ...roles.flatMap((r) => r.now.map((row) => ({ who: r.title, text: `${plain(row[0] ?? "")} — ${plain(row[1] ?? "")}`, src: r.path }))),
  ];
  const waiting = [
    ...roles.flatMap((r) => r.waiting.map((row) => ({ who: r.title, text: `${plain(row[0] ?? "")} — ${plain(row[1] ?? "")} (${plain(row[2] ?? "")})`, src: r.path }))),
    ...(registry?.rows ?? []).filter((x) => /⏳|📝|⏸/.test(x.status)).map((x) => ({ who: `외부 분석 ${x.id}`, text: `${plain(x.origin)} — ${plain(x.decision)}`, src: REGISTRY })),
  ];
  const planned = [
    ...roles.flatMap((r) => r.next.map((n) => ({ who: r.title, text: plain(n), src: r.path }))),
    ...(registry?.rows ?? []).filter((x) => /🔶/.test(x.status)).map((x) => ({ who: `외부 분석 ${x.id}`, text: `${plain(x.origin)} — 남은 묶음`, src: REGISTRY })),
  ];
  const openReq = requests.filter((r) => isAdminKind(r) && r.status === "open").length;
  const ownerTodo = requests.filter((r) => r.kind === "owner_action" && r.status === "open").length;
  const cols: { title: string; tone: string; items: typeof inProgress }[] = [
    { title: "🔧 개발 진행 중", tone: "border-sky-400/30", items: inProgress },
    { title: "⏳ 개발 대기 중", tone: "border-amber-400/30", items: waiting },
    { title: "🗓 개발 예정", tone: "border-emerald-400/30", items: planned },
  ];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[["진행 중", inProgress.length], ["대기 중", waiting.length], ["예정", planned.length], ["분석 완료", registry?.rows.length ?? 0], ["반영 대기 요청", openReq]].map(([k, v]) => (
          <GlassCard key={k as string} className="p-4 text-center"><p className="text-2xl font-bold text-gold">{v}</p><p className="text-xs text-subtext">{k}</p></GlassCard>
        ))}
        <a href="/admin/dev-docs/admin-action" className="block">
          <GlassCard className={`h-full p-4 text-center ${ownerTodo ? "border border-rose-400/40" : ""}`}><p className={`text-2xl font-bold ${ownerTodo ? "text-rose-300" : "text-gold"}`}>{ownerTodo}</p><p className="text-xs text-subtext">🙋 내가 해 줄 일</p></GlassCard>
        </a>
      </div>

      {/* 각 세션이 역할 파일 「주인님께 여쭐 것」에 남긴 요청·건의를 한곳에 모은다(2026-10-24 주인님 지시) */}
      <GlassCard className="border border-rose-400/30 p-4">
        <h3 className="mb-3 text-sm font-bold text-white">📮 관리자에게 온 요청·건의 <span className="font-normal text-subtext">{roles.reduce((n, r) => n + r.asks.length, 0)}</span></h3>
        {roles.every((r) => r.asks.length === 0) ? (
          <p className="text-sm text-subtext">지금 남겨진 요청·건의가 없습니다.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {roles.filter((r) => r.asks.length).map((r) => (
              <div key={r.id} className="cursor-pointer rounded-lg bg-white/5 p-3 hover:bg-white/10" onClick={() => setDialog({ type: "view", path: r.path })}>
                <p className="text-sm font-semibold text-rose-200">{r.title}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-white/85">{r.asks.map((a, i) => <li key={i}>{plain(a)}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-subtext">답이나 지시는 역할 카드의 📝 「이 역할에 메모」로 남기면 그 세션이 다음 작업 때 따릅니다.</p>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => (
          <GlassCard key={c.title} className={`border p-4 ${c.tone}`}>
            <h3 className="mb-3 text-sm font-bold text-white">{c.title} <span className="font-normal text-subtext">{c.items.length}</span></h3>
            <ul className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {c.items.length === 0 && <li className="text-xs text-subtext">없음</li>}
              {c.items.map((it, i) => (
                <li key={i} className="cursor-pointer rounded-lg bg-white/5 p-2.5 text-sm hover:bg-white/10" onClick={() => it.src.endsWith(".md") && setDialog({ type: "view", path: it.src })}>
                  <p className="font-semibold text-gold/90">{it.who}</p>
                  <p className="mt-0.5 text-white/85">{it.text}</p>
                </li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-gold">🧭 역할별 현황 <span className="font-normal text-subtext">{roles.length}</span></h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => {
            const stale = r.updatedAt != null && now - r.updatedAt > STALE_MS;
            return (
              <GlassCard key={r.id} className={`p-4 ${stale ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{r.title}</p>
                    <p className="mt-0.5 truncate text-xs text-subtext" title={plain(r.owner)}>{plain(r.owner)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconBtn title="역할 파일 보기" onClick={() => setDialog({ type: "view", path: r.path })}><Eye size={15} /></IconBtn>
                    <IconBtn title="이 역할에 메모(관리자 지시)" onClick={() => setDialog({ type: "role_note", role: r.id, title: r.title })}><StickyNote size={15} /></IconBtn>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-sky-200">진행 {r.now.length}</span>
                  <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-200">대기 {r.waiting.length}</span>
                  <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-emerald-200">예정 {r.next.length}</span>
                  {r.asks.length > 0 && <span className="rounded bg-rose-400/15 px-1.5 py-0.5 text-rose-200">요청·건의 {r.asks.length}</span>}
                  {roleNoteCount(r.id) > 0 && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-gold">메모 대기 {roleNoteCount(r.id)}</span>}
                  {r.isDraft && <span className="rounded bg-white/10 px-1.5 py-0.5 text-subtext">초안</span>}
                  {stale && <span className="rounded bg-white/10 px-1.5 py-0.5 text-subtext">갱신 필요</span>}
                </div>
                <p className="mt-2 text-[11px] text-subtext">마지막 갱신 {r.updated.slice(0, 16) || "—"}</p>
                {r.asks.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-rose-100/80">{r.asks.map((a, i) => <li key={i}>{plain(a)}</li>)}</ul>}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Analyzed({ registry, setDialog, docActions }: { registry: RegistryData | null; setDialog: (d: Dialog) => void; docActions: (p: string) => React.ReactNode }) {
  const [cat, setCat] = useState("전체");
  const [dec, setDec] = useState("전체");
  const rows = registry?.rows ?? [];
  const cats = ["전체", ...Array.from(new Set(rows.map((r) => r.category)))];
  const shown = rows.filter((r) => (cat === "전체" || r.category === cat) && (dec === "전체" || r.decisionType === dec));
  const chip = (active: boolean) => `rounded-full px-3 py-1 text-xs transition-colors ${active ? "bg-gold text-black font-bold" : "bg-white/5 text-subtext hover:text-white"}`;
  return (
    <Sections>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">{cats.map((c) => <button key={c} className={chip(cat === c)} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="flex flex-wrap gap-1.5">
          {[["전체", "판단 전체"], ["independent", "🆕 독립"], ["merge", "🔗 병합"], ["hold", "⏸ 보류"]].map(([k, l]) => <button key={k} className={chip(dec === k)} onClick={() => setDec(k)}>{l}</button>)}
        </div>
      </div>
      <RegistrySection title="📊 분석 완료 외부 프로그램 — 핵심 기능 · 병합/독립 판단 (줄을 누르면 상세 카드)" rows={shown} registry={registry} setDialog={setDialog} docActions={docActions} />
      {registry?.clusters && (
        <Section title="🧩 기능 묶음 지도 — 여러 원본의 비슷한 기능(병합·공용화 기획용)">
          <GlassCard className="p-4">
            <button className="text-sm text-sky-300 underline" onClick={() => setDialog({ type: "markdown", title: "기능 묶음 지도", markdown: registry.clusters, path: REGISTRY })}>표 열기</button>
          </GlassCard>
        </Section>
      )}
    </Sections>
  );
}

/** 한 줄짜리 문서 목록 항목 — 한국어 제목 + 작은 회색 경로 + 오른쪽 버튼 */
function DocRow({ title, path, size, editable = true, docActions }: { title: string; path: string; size?: number; editable?: boolean; docActions: (p: string, editable?: boolean) => React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 hover:border-gold/20 hover:bg-white/[0.06]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white" title={title}>{title}</p>
        <p className="truncate text-[11px] text-subtext/70">{path}{size ? ` · ${fmtSize(size)}` : ""}{editable ? "" : " · 보기 전용"}</p>
      </div>
      {docActions(path, editable)}
    </div>
  );
}

/** 접고 펴는 묶음 */
function Fold({ title, count, badge, defaultOpen = false, tone = "text-gold", children }: { title: string; count?: number; badge?: string; defaultOpen?: boolean; tone?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button className="flex w-full items-center gap-2 px-4 py-3 text-left" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={16} className="text-subtext" /> : <ChevronRight size={16} className="text-subtext" />}
        <span className={`text-sm font-bold ${tone}`}>{title}</span>
        {count != null && <span className="text-xs text-subtext">{count}</span>}
        {badge && <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-[11px] text-subtext">{badge}</span>}
      </button>
      {open && <div className="space-y-1.5 px-4 pb-4">{children}</div>}
    </div>
  );
}

const DOC_GROUPS: { title: string; test: (p: string) => boolean }[] = [
  { title: "인수인계 기록(HANDOFF)", test: (p) => /\/HANDOFF/i.test(p) },
  { title: "개발 플랜(PLAN)", test: (p) => /\/PLAN_/i.test(p) },
  { title: "분석·검토 문서", test: (p) => /\/(ANALYSIS|.*REVIEW|.*AUDIT|.*REFERENCE)/i.test(p) },
  { title: "정책·지침·표준", test: (p) => /(POLICY|GUIDE|RULES|STANDARD|PATTERNS|LESSONS|WORKFLOW|MAP|MATRIX|BACKLOG|REGISTRY|TOOLKIT|MANUAL)/i.test(p) },
];

function Guidelines({ manifest, roles, categoryMap, docActions }: { manifest: DevDocsManifest | null; roles: RoleStatus[]; categoryMap: CategoryMapData | null; docActions: (p: string, editable?: boolean) => React.ReactNode }) {
  const [q, setQ] = useState("");
  if (!manifest) return <Empty>문서 목록(docs/dev-docs/manifest.json)을 읽지 못했습니다.</Empty>;
  const allEntries = [...manifest.root, ...manifest.guidelines, ...manifest.roles, ...manifest.docs, ...manifest.analyses];
  const byPath = Object.fromEntries(allEntries.map((e) => [e.path, e]));
  const row = (path: string, fallbackTitle?: string) => {
    const e = byPath[path];
    return <DocRow key={path} title={e?.title || fallbackTitle || path.split("/").pop()!} path={path} size={e?.size} editable={e ? e.editable : true} docActions={docActions} />;
  };

  // ① 최상위 지침 = 루트 메인 지침 + 개발 현황 기준 문서 + 카테고리 공통 지침(중복 제거)
  const topPaths: string[] = [];
  const pushTop = (p: string) => { if (!topPaths.includes(p)) topPaths.push(p); };
  manifest.root.forEach((e) => pushTop(e.path));
  pushTop("docs/guidelines/README.md");
  KEY_DOCS.forEach((k) => pushTop(k.path));
  categoryMap?.common.forEach((c) => c.docs.forEach((d) => pushTop(d.path)));
  const topTitle = (p: string) => ROOT_TITLES[p] ?? KEY_DOCS.find((k) => k.path === p)?.title;

  // ④ 그 밖의 문서 = 위에 나오지 않은 docs/*.md
  const shown = new Set<string>([...topPaths, ...manifest.guidelines.map((e) => e.path), "docs/roles/README.md", ...manifest.roles.map((e) => e.path), ...(categoryMap?.categories.flatMap((c) => c.docs.map((d) => d.path)) ?? [])]);
  const term = q.trim().toLowerCase();
  const rest = manifest.docs.filter((d) => !shown.has(d.path)).filter((d) => !term || d.path.toLowerCase().includes(term) || (d.title ?? "").toLowerCase().includes(term));
  const grouped = DOC_GROUPS.map((g) => ({ title: g.title, items: rest.filter((d) => g.test(d.path)) }));
  const used = new Set(grouped.flatMap((g) => g.items.map((d) => d.path)));
  grouped.push({ title: "기타", items: rest.filter((d) => !used.has(d.path)) });

  return (
    <div className="space-y-4">
      <GlassCard className="border border-gold/30 p-4 text-sm text-white/85">
        문서마다 <b className="text-white">👁 보기 · ✏️ 직접 수정 · ⚠ 관리자 지시</b>를 쓸 수 있습니다. 수정·지시는 「반영 대기」로 저장되고 담당 세션이 다음 작업 때 반영합니다. <b className="text-gold">관리자 지시는 문서 맨 위에 옮겨 적혀 모든 CLI가 먼저 따르는 절대 지시입니다.</b>
      </GlassCard>

      <Fold title="① 최상위 지침 — 모든 CLI·모든 세션 공통" count={topPaths.length} defaultOpen>
        {topPaths.map((p) => row(p, topTitle(p)))}
      </Fold>

      <Fold title="② 역할별 지침 — 담당 세션의 현황·규칙" count={manifest.roles.length + 1} defaultOpen>
        {row("docs/roles/README.md", "역할 목록·규칙(작업 전·후, 역할 ID, 관리자 요청 처리)")}
        {manifest.roles.map((e) => {
          const r = roles.find((x) => x.path === e.path);
          return <DocRow key={e.path} title={`${r?.title ?? e.title}${r ? ` — ${plain(r.owner).slice(0, 60)}` : ""}`} path={e.path} size={e.size} editable={e.editable} docActions={docActions} />;
        })}
      </Fold>

      <div>
        <h3 className="mb-2 mt-6 text-sm font-bold text-gold">③ 카테고리별 지침 <span className="font-normal text-subtext">— 누르면 그 카테고리의 메인 지침·비교표·분석 보고서가 펼쳐집니다</span></h3>
        {!categoryMap ? <Empty>카테고리 지침 지도를 읽지 못했습니다.</Empty> : (
          <div className="grid gap-2 lg:grid-cols-2">
            {categoryMap.categories.map((c) => (
              <Fold key={c.name} title={c.name} count={c.docs.length} badge={c.status} tone={c.status.startsWith("✅") ? "text-emerald-300" : c.status.startsWith("△") ? "text-amber-200" : "text-white"}>
                {c.docs.length === 0 ? (
                  <p className="text-sm text-rose-200/80">⚠ 이 카테고리 전용 지침이 아직 없습니다 — 보강 필요{c.extra ? `: ${c.extra}` : ""}</p>
                ) : (
                  <>
                    {c.docs.map((d) => row(d.path, d.title))}
                    {c.extra && c.extra !== "—" && <p className="pt-1 text-xs text-subtext">보강할 것: {c.extra}</p>}
                  </>
                )}
              </Fold>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 mt-6 text-sm font-bold text-gold">④ 분야별 요약 지침 (docs/guidelines)</h3>
        <Fold title="분야별 요약 지침" count={manifest.guidelines.length}>
          {manifest.guidelines.map((e) => row(e.path))}
        </Fold>
      </div>

      <div>
        <h3 className="mb-2 mt-6 text-sm font-bold text-gold">⑤ 그 밖의 문서</h3>
        <div className="mb-2 flex items-center gap-2">
          <Search size={15} className="text-subtext" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목·파일 이름 검색 (예: 예약, SCHEDULER, 에러)" className="w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-subtext focus:border-gold/50 focus:outline-none" />
        </div>
        <div className="space-y-2">
          {grouped.filter((g) => g.items.length).map((g) => (
            <Fold key={g.title + term} title={g.title} count={g.items.length} defaultOpen={!!term}>
              {g.items.map((d) => row(d.path))}
            </Fold>
          ))}
          <Fold title="분석 보고서 (docs/analysis-*)" count={manifest.analyses.length}>
            {manifest.analyses.map((e) => row(e.path))}
          </Fold>
        </div>
      </div>
    </div>
  );
}

function Programs({ manifest, programs, docActions }: { manifest: DevDocsManifest | null; programs: ProgramMeta[]; docActions: (p: string, editable?: boolean) => React.ReactNode }) {
  const [q, setQ] = useState("");
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  if (!manifest) return <Empty>문서 목록(docs/dev-docs/manifest.json)을 읽지 못했습니다.</Empty>;
  const meta = (folder: string) => programs.find((p) => p.slug === folder || p.slug === folder.replace(/_/g, "-"));
  const term = q.trim().toLowerCase();
  const list = manifest.programs.filter((p) => !term || p.folder.toLowerCase().includes(term) || (meta(p.folder)?.name ?? "").toLowerCase().includes(term));
  return (
    <Sections>
      <div className="flex items-center gap-2">
        <Search size={15} className="text-subtext" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로그램 이름·폴더 검색" className="w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-subtext focus:border-gold/50 focus:outline-none" />
        <span className="text-xs text-subtext">{list.length}개</span>
      </div>
      <div className="space-y-2">
        {list.map((p) => {
          const m = meta(p.folder);
          const isOpen = openFolder === p.folder;
          return (
            <div key={p.folder}>
              <Row title={m?.name ?? p.folder} sub={`${p.folder}/ · 문서 ${p.files.length}개${m?.version ? ` · ${m.version}` : ""}`} onClick={() => setOpenFolder(isOpen ? null : p.folder)}
                right={<button className="rounded-lg p-2 text-subtext hover:bg-white/10 hover:text-white" onClick={() => setOpenFolder(isOpen ? null : p.folder)} aria-label="문서 목록 열기">{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>} />
              {isOpen && (
                <div className="ml-4 mt-2 space-y-2 border-l border-white/10 pl-3">
                  {p.files.map((f) => <DocRow key={f.path} title={f.title || f.path.slice(p.folder.length + 1)} path={f.path} size={f.size} editable={f.editable} docActions={docActions} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sections>
  );
}

function Requests({ requests, setRequests, setDialog, focus }: { requests: DevRequest[]; setRequests: (f: (r: DevRequest[]) => DevRequest[]) => void; setDialog: (d: Dialog) => void; focus?: "owner" }) {
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (id: string, action: "cancel" | "done" | "dismiss") => {
    if (busy) return;
    setBusy(id);
    const r = await fetch("/api/admin/dev-docs/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) setRequests((rs) => rs.map((x) => (x.id === id ? { ...x, ...j.request } : x)));
  };
  const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  // 🙋 각 세션이 주인님께 드린 요청(owner_action) — 분류별
  const todo = requests.filter((r) => r.kind === "owner_action" && r.status === "open");
  const todoDone = requests.filter((r) => r.kind === "owner_action" && r.status !== "open").slice(0, 100);
  const catOf = (r: DevRequest) => OWNER_ACTION_CATEGORIES.find((c) => c.id === r.category) ?? OWNER_ACTION_CATEGORIES[OWNER_ACTION_CATEGORIES.length - 1];
  // 📬 주인님이 맡긴 일의 결과(work_result) — 최신순, 화면에서 남긴 요청에 연결됐으면 그 요청도 표시
  const results = requests.filter((r) => r.kind === "work_result");
  const byId = Object.fromEntries(requests.map((r) => [r.id, r]));
  // 🗂 기존 수정안·지시·메모
  const admin = requests.filter(isAdminKind);
  const groups: [string, DevRequest[]][] = [
    ["⏳ 반영 대기", admin.filter((r) => r.status === "open")],
    ["✅ 반영됨", admin.filter((r) => r.status === "applied")],
    ["↩ 반려·취소", admin.filter((r) => r.status === "rejected")],
  ];
  const linkBtn = (r: DevRequest) => r.link && (
    <a href={r.link} target="_blank" rel="noopener noreferrer" title="링크 열기" aria-label="링크 열기" className="rounded-lg p-2 text-subtext transition-colors hover:bg-white/10 hover:text-white"><ExternalLink size={15} /></a>
  );

  return (
    <Sections>
      <GlassCard className="p-4 text-sm text-white/80">
        {focus === "owner" ? (
          <><b className="text-white">🙋 관리자 실행요청</b>은 각 세션이 「주인님이 직접 해 주셔야 다음 작업이 진행됩니다」라며 올린 일(승인·결정·화면 확인·로그인·DB 실행·설치 등)을 분류별로 모은 것입니다. 처리하셨으면 ✔ 「완료」, 필요 없으면 ✖를 누르세요 — 막혀 있던 작업이 바로 풀립니다.</>
        ) : (
          <><b className="text-white">🙋 내가 해 줄 일</b>은 각 세션이 주인님께 드린 요청(승인·비용·로그인·DB 실행 등)을 분류별로 모은 것입니다. 처리하셨으면 ✔ 「완료」, 필요 없으면 ✖를 누르세요.{" "}
          <b className="text-white">📬 작업 결과</b>는 주인님이 맡기신 일을 각 세션이 끝낸 뒤 남긴 결과(커밋·비용·링크)입니다. 세션은 <code className="rounded bg-white/10 px-1">node scripts/dev-requests.mjs ask</code>·<code className="rounded bg-white/10 px-1">report</code>로 올립니다.</>
        )}
      </GlassCard>

      <Section title="🙋 내가 해 줄 일" count={todo.length}>
        {todo.length === 0 ? <Empty>지금 처리하실 일이 없습니다.</Empty> : OWNER_ACTION_CATEGORIES.filter((c) => todo.some((r) => catOf(r).id === c.id)).map((c) => {
          const items = todo.filter((r) => catOf(r).id === c.id);
          return (
            <Fold key={c.id} title={`${c.icon} ${c.label}`} count={items.length} defaultOpen tone="text-rose-200">
              {items.map((r) => (
                <Row key={r.id} no={`#${r.id.slice(0, 4)}`} title={r.title ?? "(제목 없음)"} sub={`${r.from_session ?? "세션 미상"} · ${when(r.created_at)}`}
                  right={
                    <div className="flex shrink-0 gap-1">
                      <CopyLine icon={<Terminal size={15} />} tone="text-sky-300 hover:text-sky-200" title="CLI 터미널에 붙여넣을 전체 요청문 복사 (분류·내용·담당·요청id·확인 명령 포함)" text={`[관리자 실행요청] [${catOf(r).label}] ${r.title ?? ""} — ${(r.note ?? "").replace(/\s*\n\s*/g, " ")} (담당 ${r.from_session ?? "미상"} · 요청id ${r.id} · 원본 확인: node scripts/dev-requests.mjs show ${r.id})`} />
                      {linkBtn(r)}
                      <IconBtn title="완료" onClick={() => act(r.id, "done")}><CheckCircle2 size={15} className="text-emerald-300" /></IconBtn>
                      <IconBtn title="필요 없음" onClick={() => act(r.id, "dismiss")}><XCircle size={15} /></IconBtn>
                    </div>
                  }>
                  {r.note && <p className="mt-1 whitespace-pre-wrap text-xs text-white/80">{r.note}</p>}
                </Row>
              ))}
            </Fold>
          );
        })}
      </Section>

      {todoDone.length > 0 && (
        <Section title="✅ 승인완료" count={todoDone.length}>
          {OWNER_ACTION_CATEGORIES.filter((c) => todoDone.some((r) => catOf(r).id === c.id)).map((c) => {
            const items = todoDone.filter((r) => catOf(r).id === c.id);
            return (
              <Fold key={c.id} title={`${c.icon} ${c.label}`} count={items.length} tone="text-emerald-200">
                {items.map((r) => (
                  <Row key={r.id} no={`#${r.id.slice(0, 4)}`} title={r.title ?? "(제목 없음)"}
                    sub={`${r.status === "applied" ? "✅ 완료" : "✖ 필요 없음"} · ${r.from_session ?? "세션 미상"}${r.handled_at ? ` · ${when(r.handled_at)}` : ""}`}
                    right={linkBtn(r)}>
                    {r.note && <p className="mt-1 whitespace-pre-wrap text-xs text-white/70">{r.note}</p>}
                  </Row>
                ))}
              </Fold>
            );
          })}
        </Section>
      )}

      {focus !== "owner" && (<>
      <Section title="📬 작업 결과" count={results.length}>
        {results.length === 0 ? <Empty>아직 올라온 작업 결과가 없습니다.</Empty> : results.map((r) => {
          const parent = r.parent_id ? byId[r.parent_id] : undefined;
          return (
            <Row key={r.id} no={`#${r.id.slice(0, 4)}`} badge="결과" title={r.title ?? "(제목 없음)"}
              sub={[r.from_session ?? "세션 미상", when(r.created_at), r.commit_sha && `커밋 ${r.commit_sha}`, r.cost && `비용 ${r.cost}`].filter(Boolean).join(" · ")}
              right={<div className="flex shrink-0 gap-1">{linkBtn(r)}<IconBtn title="자세히" onClick={() => setDialog({ type: "request", id: r.id })}><Eye size={15} /></IconBtn></div>}>
              {parent && <p className="mt-1 text-xs text-sky-300">요청: [{KIND_LABEL[parent.kind]}] {parent.title ?? parent.target_path ?? `역할 ${parent.target_role}`}</p>}
              {r.note && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-white/80">{r.note}</p>}
            </Row>
          );
        })}
      </Section>
      </>)}

      <Section title="🗂 화면에서 남긴 수정안·지시·메모">
        {groups.map(([title, items]) => (
          <Fold key={title} title={title} count={items.length} defaultOpen={title.startsWith("⏳") && items.length > 0}>
            {items.length === 0 ? <Empty>없음</Empty> : items.map((r) => {
              const res = results.filter((x) => x.parent_id === r.id);
              return (
                <Row key={r.id} no={`#${r.id.slice(0, 4)}`} badge={KIND_LABEL[r.kind]} title={r.target_path ?? `역할 ${r.target_role}`} sub={`${new Date(r.created_at).toLocaleString("ko-KR")}${r.handled_by ? ` · 처리 ${r.handled_by}` : ""}${r.commit_sha ? ` · 커밋 ${r.commit_sha}` : ""}${r.reject_reason ? ` · ${r.reject_reason}` : ""} · ${STATUS_LABEL[r.status]}${res.length ? ` · 결과 ${res.length}건` : ""}`}
                  right={
                    <div className="flex shrink-0 gap-1">
                      <IconBtn title="자세히" onClick={() => setDialog({ type: "request", id: r.id })}><Eye size={15} /></IconBtn>
                      {r.status === "open" && <IconBtn title="취소" onClick={() => act(r.id, "cancel")}><XCircle size={15} /></IconBtn>}
                    </div>
                  }>
                  {r.note && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-white/75">{r.note}</p>}
                </Row>
              );
            })}
          </Fold>
        ))}
      </Section>
    </Sections>
  );
}
