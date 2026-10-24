"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, MessageSquareWarning, StickyNote, Search, ChevronDown, ChevronRight, XCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import DocDialogs, { type Dialog } from "./DocDialogs";
import type { DevRequest } from "./types";
import type { ActiveWorkRow, RegistryData, RoleStatus, TableRow } from "@/lib/devDocs/parse";
import type { DevDocsManifest, ManifestEntry } from "@/lib/devDocs/github";

export type DevDocsTab = "overview" | "in-progress" | "waiting" | "planned" | "analyzed" | "guidelines" | "programs" | "requests";

type ProgramMeta = { slug: string; name: string; version: string | null; app_url: string | null };

const REGISTRY = "docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md";
const STALE_MS = 3 * 86400000;
const KIND_LABEL: Record<string, string> = { doc_edit: "수정안", doc_comment: "관리자 지시", role_note: "역할 메모" };
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

      {tab === "overview" && <Overview roles={roles} activeWork={activeWork} registry={registry} requests={requests} setDialog={setDialog} roleNoteCount={roleNoteCount} />}

      {tab === "in-progress" && (
        <Sections>
          <Section title="🔧 작업 중 표 (지금 손대고 있는 폴더)" count={activeWork.length} action={docActions("docs/ACTIVE_WORK.md")}>
            {activeWork.length === 0 ? <Empty>작업 중인 세션이 없습니다.</Empty> : activeWork.map((w, i) => (
              <Row key={i} title={plain(w.work).slice(0, 160)} sub={`${plain(w.agent)} · ${w.start}`} badge={w.role ? `역할 ${w.role}` : "역할 표시 없음"}
                right={w.role && roleById[w.role] ? docActions(roleById[w.role].path) : null}>
                <p className="mt-1 text-xs text-subtext">{plain(w.folders).slice(0, 200)}</p>
              </Row>
            ))}
          </Section>
          <RoleTableSection title="📋 역할별 「지금 하는 일」" roles={roles} pick={(r) => r.now} cols={["프로그램", "작업", "시작", "상태"]} docActions={docActions} />
        </Sections>
      )}

      {tab === "waiting" && (
        <Sections>
          <RoleTableSection title="⏳ 역할별 「대기 중」 (승인·결정 대기 포함)" roles={roles} pick={(r) => r.waiting} cols={["프로그램", "작업", "기다리는 것", "근거 문서"]} docActions={docActions} />
          <RegistrySection title="📝 승인·결정을 기다리는 외부 분석 (⏳·📝·⏸)" rows={(registry?.rows ?? []).filter((r) => /⏳|📝|⏸/.test(r.status))} registry={registry} setDialog={setDialog} docActions={docActions} />
          {registry && registry.pending.length > 0 && (
            <Section title="❓ 주인님 결정 대기 모음 (개발분석표 §5)" count={registry.pending.length} action={docActions(REGISTRY)}>
              {registry.pending.map((p, i) => <Row key={i} title={plain(p[1] ?? "")} sub={`${plain(p[0] ?? "")} · 담당 ${plain(p[2] ?? "")}`} />)}
            </Section>
          )}
        </Sections>
      )}

      {tab === "planned" && (
        <Sections>
          <Section title="🗓 역할별 「다음 첫 단계」" count={roles.reduce((n, r) => n + r.next.length, 0)}>
            {roles.filter((r) => r.next.length).map((r) => (
              <Row key={r.id} title={r.title} sub={`${plain(r.owner)} · 마지막 갱신 ${r.updated.slice(0, 16)}`} right={docActions(r.path)}>
                <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-white/80">{r.next.map((n, i) => <li key={i}>{plain(n)}</li>)}</ol>
              </Row>
            ))}
          </Section>
          <RegistrySection title="🔶 남은 묶음이 있는 외부 분석 (일부 반영)" rows={(registry?.rows ?? []).filter((r) => /🔶/.test(r.status))} registry={registry} setDialog={setDialog} docActions={docActions} />
        </Sections>
      )}

      {tab === "analyzed" && <Analyzed registry={registry} setDialog={setDialog} docActions={docActions} />}

      {tab === "guidelines" && <Guidelines manifest={manifest} roles={roles} docActions={docActions} />}

      {tab === "programs" && <Programs manifest={manifest} programs={programs} docActions={docActions} />}

      {tab === "requests" && <Requests requests={requests} setRequests={setRequests} setDialog={setDialog} />}

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
function Row({ title, sub, badge, right, children, onClick }: { title: string; sub?: string; badge?: string; right?: React.ReactNode; children?: React.ReactNode; onClick?: () => void }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className={`min-w-0 flex-1 ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
          <p className="text-sm font-semibold text-white">
            {badge && <span className="mr-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-subtext">{badge}</span>}
            {title}
          </p>
          {sub && <p className="mt-0.5 text-xs text-subtext">{sub}</p>}
          {children}
        </div>
        {right}
      </div>
    </GlassCard>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-white/10 p-4 text-sm text-subtext">{children}</p>;
}

function RoleTableSection({ title, roles, pick, cols, docActions }: { title: string; roles: RoleStatus[]; pick: (r: RoleStatus) => TableRow[]; cols: string[]; docActions: (p: string) => React.ReactNode }) {
  const withRows = roles.filter((r) => pick(r).length);
  return (
    <Section title={title} count={withRows.reduce((n, r) => n + pick(r).length, 0)}>
      {withRows.length === 0 ? <Empty>해당 항목이 없습니다.</Empty> : withRows.map((r) => (
        <Row key={r.id} title={r.title} sub={`${plain(r.owner)} · 마지막 갱신 ${r.updated.slice(0, 16)}${r.isDraft ? " · 초안(담당 확인 전)" : ""}`} right={docActions(r.path)}>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr>{cols.map((c) => <th key={c} className="border-b border-white/10 px-2 py-1 text-left font-medium text-subtext">{c}</th>)}</tr></thead>
              <tbody>{pick(r).map((row, i) => <tr key={i}>{cols.map((_, j) => <td key={j} className="border-b border-white/5 px-2 py-1 align-top text-white/85">{plain(row[j] ?? "")}</td>)}</tr>)}</tbody>
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
        <Row key={r.id} badge={`${r.id} · ${r.category}`} title={plain(r.origin)} sub={`${DECISION_LABEL[r.decisionType]} — ${plain(r.decision).replace(/^[🆕🔗⏸❌]\s*/u, "")}`}
          onClick={() => registry?.cards[r.id] && setDialog({ type: "markdown", title: `${r.id} ${plain(r.origin)}`, markdown: registry.cards[r.id], path: REGISTRY })}
          right={<span className="shrink-0 text-lg" title="상태">{r.status}</span>}>
          <p className="mt-1 text-xs text-white/75">{plain(r.feature)}</p>
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
  const openReq = requests.filter((r) => r.status === "open").length;
  const cols: { title: string; tone: string; items: typeof inProgress }[] = [
    { title: "🔧 개발 진행 중", tone: "border-sky-400/30", items: inProgress },
    { title: "⏳ 개발 대기 중", tone: "border-amber-400/30", items: waiting },
    { title: "🗓 개발 예정", tone: "border-emerald-400/30", items: planned },
  ];
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["진행 중", inProgress.length], ["대기 중", waiting.length], ["예정", planned.length], ["분석 완료", registry?.rows.length ?? 0], ["반영 대기 요청", openReq]].map(([k, v]) => (
          <GlassCard key={k as string} className="p-4 text-center"><p className="text-2xl font-bold text-gold">{v}</p><p className="text-xs text-subtext">{k}</p></GlassCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {cols.map((c) => (
          <GlassCard key={c.title} className={`border p-4 ${c.tone}`}>
            <h3 className="mb-3 text-sm font-bold text-white">{c.title} <span className="font-normal text-subtext">{c.items.length}</span></h3>
            <ul className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {c.items.length === 0 && <li className="text-xs text-subtext">없음</li>}
              {c.items.map((it, i) => (
                <li key={i} className="cursor-pointer rounded-lg bg-white/5 p-2 text-xs hover:bg-white/10" onClick={() => it.src.endsWith(".md") && setDialog({ type: "view", path: it.src })}>
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
                  {r.asks.length > 0 && <span className="rounded bg-rose-400/15 px-1.5 py-0.5 text-rose-200">여쭐 것 {r.asks.length}</span>}
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

function DocList({ title, entries, titles, docActions, initialOpen = true }: { title: string; entries: ManifestEntry[]; titles?: Record<string, string>; docActions: (p: string, editable?: boolean) => React.ReactNode; initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <button className="mb-3 flex items-center gap-1 text-sm font-bold text-gold" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}{title}<span className="ml-1 font-normal text-subtext">{entries.length}</span>
      </button>
      {open && (
        <div className="space-y-2">
          {entries.map((e) => (
            <Row key={e.path} title={titles?.[e.path] ?? e.path.split("/").pop()!} sub={`${e.path} · ${fmtSize(e.size)}${e.editable ? "" : " · 보기 전용"}`} right={docActions(e.path, e.editable)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Guidelines({ manifest, roles, docActions }: { manifest: DevDocsManifest | null; roles: RoleStatus[]; docActions: (p: string, editable?: boolean) => React.ReactNode }) {
  const [q, setQ] = useState("");
  if (!manifest) return <Empty>문서 목록(docs/dev-docs/manifest.json)을 읽지 못했습니다.</Empty>;
  const all = [...manifest.root, ...manifest.guidelines, ...manifest.docs];
  const byPath = Object.fromEntries([...all, ...manifest.roles].map((e) => [e.path, e]));
  const key = KEY_DOCS.map((k) => byPath[k.path] ?? { path: k.path, size: 0, editable: true });
  const keyTitles = Object.fromEntries(KEY_DOCS.map((k) => [k.path, k.title]));
  const roleTitles = Object.fromEntries(roles.map((r) => [r.path, `역할 — ${r.title}`]));
  const term = q.trim().toLowerCase();
  const filteredDocs = term ? manifest.docs.filter((d) => d.path.toLowerCase().includes(term)) : manifest.docs;
  return (
    <Sections>
      <GlassCard className="border border-gold/30 p-4 text-xs text-white/85">
        문서마다 <b className="text-white">👁 보기 · ✏️ 직접 수정 · ⚠ 관리자 지시</b>를 쓸 수 있습니다. 수정·지시는 「반영 대기」로 저장되고, 담당 세션이 다음 작업 때 문서에 반영합니다. <b className="text-gold">관리자 지시는 문서 맨 위에 옮겨 적히며 모든 CLI가 문서 내용보다 먼저 따르는 절대 지시입니다.</b>
      </GlassCard>
      <DocList title="📌 메인 지침 (루트)" entries={manifest.root} titles={ROOT_TITLES} docActions={docActions} />
      <DocList title="⭐ 개발 현황·비교 기준 문서" entries={key} titles={keyTitles} docActions={docActions} />
      <DocList title="📚 분야별 지침 (docs/guidelines)" entries={manifest.guidelines} docActions={docActions} />
      <DocList title="🧭 역할 파일 (docs/roles)" entries={manifest.roles} titles={roleTitles} docActions={docActions} />
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Search size={15} className="text-subtext" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="docs 문서 이름 검색 (예: SCHEDULER, ERROR)" className="w-full max-w-md rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-subtext focus:border-gold/50 focus:outline-none" />
        </div>
        <DocList title="🗂 docs 문서 전체" entries={filteredDocs} docActions={docActions} initialOpen={!!term} />
      </div>
      <DocList title="🔎 분석 보고서 (docs/analysis-*)" entries={manifest.analyses} docActions={docActions} initialOpen={false} />
    </Sections>
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
                  {p.files.map((f) => <Row key={f.path} title={f.path.slice(p.folder.length + 1)} sub={`${fmtSize(f.size)}${f.editable ? "" : " · 보기 전용"}`} right={docActions(f.path, f.editable)} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sections>
  );
}

function Requests({ requests, setRequests, setDialog }: { requests: DevRequest[]; setRequests: (f: (r: DevRequest[]) => DevRequest[]) => void; setDialog: (d: Dialog) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const cancel = async (id: string) => {
    setBusy(id);
    const r = await fetch("/api/admin/dev-docs/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) setRequests((rs) => rs.map((x) => (x.id === id ? j.request : x)));
  };
  const groups: [string, DevRequest[]][] = [
    ["⏳ 반영 대기", requests.filter((r) => r.status === "open")],
    ["✅ 반영됨", requests.filter((r) => r.status === "applied")],
    ["↩ 반려·취소", requests.filter((r) => r.status === "rejected")],
  ];
  return (
    <Sections>
      <GlassCard className="p-4 text-xs text-white/80">
        화면에서 저장한 수정안·관리자 지시·역할 메모입니다. 담당 세션은 작업을 시작할 때 <code className="rounded bg-white/10 px-1">node scripts/dev-requests.mjs list</code>로 확인하고 반영합니다. 반영되면 커밋 번호가 표시됩니다.
      </GlassCard>
      {groups.map(([title, items]) => (
        <Section key={title} title={title} count={items.length}>
          {items.length === 0 ? <Empty>없음</Empty> : items.map((r) => (
            <Row key={r.id} badge={KIND_LABEL[r.kind]} title={r.target_path ?? `역할 ${r.target_role}`} sub={`${new Date(r.created_at).toLocaleString("ko-KR")}${r.handled_by ? ` · 처리 ${r.handled_by}` : ""}${r.commit_sha ? ` · 커밋 ${r.commit_sha}` : ""}${r.reject_reason ? ` · ${r.reject_reason}` : ""} · ${STATUS_LABEL[r.status]}`}
              right={
                <div className="flex shrink-0 gap-1">
                  <IconBtn title="자세히" onClick={() => setDialog({ type: "request", id: r.id })}><Eye size={15} /></IconBtn>
                  {r.status === "open" && <IconBtn title="취소" onClick={() => busy !== r.id && cancel(r.id)}><XCircle size={15} /></IconBtn>}
                </div>
              }>
              {r.note && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-white/75">{r.note}</p>}
            </Row>
          ))}
        </Section>
      ))}
    </Sections>
  );
}
