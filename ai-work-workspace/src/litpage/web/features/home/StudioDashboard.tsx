// 2026-11-17 WS-20261117-13 146 Professional Studio(S2) — 관제 대시보드 /<domain>/studio
// 숫자는 모두 이미 있는 회원 세션 RPC 값만 쓴다(받은 업무 workInboxList · 내 할 일 getMyTasks · 비서 getAgents/getAgentRuns).
// 시안의 가동률·마감 준수율·일괄 실행·저장공간 값은 근거/공유 경로가 없어 만들지 않는다. 출처마다 따로 실패할 수 있어 칸별로 「불러오지 못함」.
// 계획: ai-work-workspace/docs/PLAN_20261117_146_STUDIO_RENEWAL.md S2
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { records } from '../../lib/store/records.ts';
import { useSession } from '../../lib/store/session.ts';
import { navigate, openPage, spaceDomain } from '../../lib/router.ts';
import { toPlainText } from '#shared/richtext.ts';
import type { BlockRecord } from '#shared/records.ts';
import { tx } from '../shell/i18n.ts';
import './studio.css';

/** 비서 실행 기록은 비서마다 최근 RUNS_PER_AGENT건, 비서는 MAX_AGENTS개까지만 본다(화면에 한계 표시) */
export const RUNS_PER_AGENT = 50;
export const MAX_AGENTS = 10;
const WEEK = 7 * 86_400_000;

type Api = (name: string, body: unknown) => Promise<any>;
export interface StudioData {
  inbox: { unread: number; recent: { id: string; title: string; source: string; createdAt: string }[] } | null;
  tasks: { count: number; ids: string[] } | null;
  runs: { success: number; failed: number; review: number; agents: number; capped: boolean } | null;
}

/** 대시보드 숫자 모으기(출처별로 실패하면 그 칸만 null). now 기준 최근 7일 실행만 센다. */
export async function loadStudioData(call: Api, spaceId: string, now = Date.now()): Promise<StudioData & { recordMaps: unknown[] }> {
  const recordMaps: unknown[] = [];
  const inbox = call('workInboxList', {}).then((r) => ({
    unread: Number(r?.unread) || 0,
    recent: (Array.isArray(r?.items) ? r.items : []).filter((i: any) => !i.imported_at).slice(0, 5)
      .map((i: any) => ({ id: String(i.id), title: String(i.title ?? ''), source: String(i.source_slug ?? ''), createdAt: String(i.created_at ?? '') })),
  })).catch(() => null);
  const tasks = call('getMyTasks', { spaceId }).then((r) => {
    if (r?.recordMap) recordMaps.push(r.recordMap);
    const ids = Array.isArray(r?.taskIds) ? r.taskIds.map(String) : [];
    return { count: ids.length, ids };
  }).catch(() => null);
  const runs = call('getAgents', { spaceId }).then(async (r) => {
    const agents = (Array.isArray(r?.agents) ? r.agents : []).filter((a: any) => a?.alive !== false);
    const picked = agents.slice(0, MAX_AGENTS);
    let success = 0, failed = 0, review = 0, capped = agents.length > MAX_AGENTS;
    for (const a of picked) {
      const res = await call('getAgentRuns', { agentId: a.id, limit: RUNS_PER_AGENT });
      const list = Array.isArray(res?.runs) ? res.runs : [];
      if (list.length >= RUNS_PER_AGENT) capped = true;
      for (const run of list) {
        if (!(Number(run?.createdTime) >= now - WEEK)) continue;
        if (run.status === 'success') success++;
        else if (run.status === 'failed') failed++;
        else if (run.status === 'needs_review') review++;
      }
    }
    return { success, failed, review, agents: picked.length, capped };
  }).catch(() => null);
  const [a, b, c] = await Promise.all([inbox, tasks, runs]);
  return { inbox: a, tasks: b, runs: c, recordMaps };
}

export function StudioDashboard() {
  const spaceId = useSession((s) => s.spaceId);
  const [data, setData] = useState<StudioData | null>(null);
  useEffect(() => {
    if (!spaceId) return;
    let alive = true;
    void loadStudioData(api as Api, spaceId).then((d) => {
      if (!alive) return;
      for (const rm of d.recordMaps) records.mergeRecordMap(rm as never);
      setData(d);
    });
    return () => {
      alive = false;
    };
  }, [spaceId]);
  const domain = spaceId ? spaceDomain(spaceId) : '';
  const loading = !data;
  const failed = tx('Couldn’t load');

  return (
    <div className="aww-studio-dash" aria-busy={loading}>
      <header className="aww-studio-head">
        <h1>📊 {tx('Control dashboard')}</h1>
        <p>{tx('Your inbox, tasks and assistant runs at a glance. Numbers come from your workspace only.')}</p>
      </header>

      <section className="aww-studio-kpis" aria-label={tx('Summary')}>
        <Kpi label={tx('Inbox waiting')} value={loading ? null : data!.inbox ? `${data!.inbox.unread}` : failed} sub={tx('Not yet taken into the workspace')} onClick={() => goInbox()} />
        <Kpi label={tx('My tasks')} value={loading ? null : data!.tasks ? `${data!.tasks.count}` : failed} sub={tx('Tasks assigned to me')} onClick={() => domain && navigate(`/${domain}/tasks`)} />
        <Kpi
          label={tx('Assistant runs (7 days)')}
          value={loading ? null : data!.runs ? (data!.runs.agents ? `${data!.runs.success} / ${data!.runs.failed}` : '—') : failed}
          sub={loading || !data!.runs ? '' : data!.runs.agents ? `${tx('Succeeded / failed')}${data!.runs.capped ? ` · ${tx('recent records only')}` : ''}` : tx('No assistants yet')}
          onClick={() => domain && navigate(`/${domain}/library/agents`)}
        />
        <Kpi label={tx('Needs your review')} value={loading ? null : data!.runs ? `${data!.runs.review}` : failed} sub={tx('Assistant runs waiting for Allow')} />
      </section>

      <div className="aww-studio-grid">
        <section className="aww-studio-card" aria-label={tx('My tasks')}>
          <div className="aww-studio-card-head">
            <h2>✅ {tx('My tasks')}</h2>
            {domain && <button type="button" className="aww-studio-link" onClick={() => navigate(`/${domain}/tasks`)}>{tx('See all')} →</button>}
          </div>
          {loading ? <Skeleton /> : !data!.tasks ? <p className="aww-studio-empty">{failed}</p> : data!.tasks.ids.length === 0 ? (
            <p className="aww-studio-empty">{tx('No tasks assigned to you. Tasks in databases with an Assignee you are set on show up here.')}</p>
          ) : (
            <ul className="aww-studio-list">
              {data!.tasks.ids.slice(0, 8).map((id) => {
                const b = records.get<BlockRecord>('block', id);
                if (!b || b.alive === false) return null;
                return (
                  <li key={id}>
                    <button type="button" onClick={() => openPage(id)}>{toPlainText((b.properties as any)?.title) || tx('Untitled')}</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="aww-studio-card" aria-label={tx('Inbox')}>
          <div className="aww-studio-card-head">
            <h2>📥 {tx('Inbox')}</h2>
            <button type="button" className="aww-studio-link" onClick={() => goInbox()}>{tx('Open inbox')} →</button>
          </div>
          {loading ? <Skeleton /> : !data!.inbox ? <p className="aww-studio-empty">{failed}</p> : data!.inbox.recent.length === 0 ? (
            <p className="aww-studio-empty">{tx('Nothing is waiting in your inbox. New work from your other automation programs will appear here.')}</p>
          ) : (
            <ul className="aww-studio-list">
              {data!.inbox.recent.map((i) => (
                <li key={i.id}>
                  <button type="button" onClick={() => goInbox()}>
                    <span className="aww-studio-item-title">{i.title || tx('Untitled')}</span>
                    {i.source && <span className="aww-studio-chip">{i.source}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** 받은 업무는 워크스페이스 밖 Next 화면(/inbox, 사이드바와 같은 일반 링크) */
function goInbox() {
  window.location.href = '/inbox';
}

function Kpi({ label, value, sub, onClick }: { label: string; value: string | null; sub: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="aww-studio-kpi-label">{label}</span>
      <span className="aww-studio-kpi-value">{value ?? <span className="aww-studio-skel" style={{ width: 48 }} />}</span>
      {sub && <span className="aww-studio-kpi-sub">{sub}</span>}
    </>
  );
  return onClick ? <button type="button" className="aww-studio-kpi" onClick={onClick}>{body}</button> : <div className="aww-studio-kpi">{body}</div>;
}

function Skeleton() {
  return (
    <div aria-hidden>
      {[0, 1, 2].map((i) => <div key={i} className="aww-studio-skel" style={{ width: `${80 - i * 15}%`, height: 14, margin: '10px 0' }} />)}
    </div>
  );
}
