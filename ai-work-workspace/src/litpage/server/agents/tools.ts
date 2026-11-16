// Tools available only to Custom Agents, in addition to the standard AI tools:
//   call_agent            hand work to another agent  and use what it returns
//   send_notification     Inbox notification to workspace members ("{agent} sent you a message")
//   request_url_access    ask before opening a web page that wasn't in the request 
//   update_agent_settings change the agent's own settings as a draft (setup chat, instruction iteration — )
//   mcp_*                 the agent's MCP connections, called client-side so "Always ask" can stop a write 
//   read_agent_history    the agent's earlier chats and runs — everyone's with Advanced › "Share chat history across
//                         users" on, else only those of the person it is working for 
// Executors get a RunToolContext with the run (agent, who is chatting, interactive or not) next to the AgentEnv.
import { newId } from '#shared/ids.ts';
import type { NotificationRecord, SpaceRecord, UserRecord } from '#shared/records.ts';
import {
  cleanConfig, cleanTrigger, GRANT_ROLES, triggerRowTitle, type AgentConfig, type AgentRecord, type AgentTrigger, type GrantRole, type McpToolMode, type RunKind,
} from '#shared/agents.ts';
import { db, getRecord } from '../db.ts';
import { pushNotification } from '../notify.ts';
import { hit } from '../ratelimit.ts';
import { AiError } from '../ai/client.ts';
import { canRead, searchPages } from '../ai/context.ts';
import { normalizeId, resolvePeople } from '../ai/edit.ts';
import { callMcpTool, connectionTools, type McpTool } from '../ai/mcp.ts';
import { registerDynamicTools, registerToolDefs, type ToolDef } from '../ai/tools/defs.ts';
import { runTool } from '../ai/tools/registry.ts';
import type { AgentEnv, ToolOutput } from '../ai/tools/types.ts';
import { blockLabel, grantProblem } from './access.ts';
import { agentRole, getAgent, patchAgent, workingConfig } from './model.ts';
import { sendExternalNotify } from '../automations/engine.ts';

const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });

export const AGENT_TOOL_DEFS: ToolDef[] = [
  {
    name: 'call_agent',
    access: 'write',
    description: 'Hand a task to another custom agent you can reach (listed in your instructions context) and receive its answer. Include everything it needs in `task`; it works with its own access and instructions.',
    input_schema: { type: 'object', properties: { agent_id: str('The agent id.'), task: str('What the agent should do and what to return.') }, required: ['agent_id', 'task'], additionalProperties: false },
  },
  {
    // 2026-11-17 PLAN-20261117-01 E1: 주간 요약 등 결과를 에이전트 주인 본인 메일·카카오톡으로(회원 본인 메일 계정·카카오 연결, 채널별 하루 100건)
    name: 'notify_me',
    access: 'write',
    description: 'Send a short summary to the agent owner by email and/or KakaoTalk (only the owner, using the owner\x27s own connected mail account / KakaoTalk). Link the page you wrote. Use it at most once per run.',
    input_schema: {
      type: 'object',
      properties: {
        channels: { type: 'array', items: { type: 'string', enum: ['email', 'kakao'] }, minItems: 1, maxItems: 2, description: 'email, kakao or both.' },
        message: str('The message (plain text, up to 1000 characters).'),
        page_id: str('The page to link (you must be able to open it).'),
      },
      required: ['channels', 'message', 'page_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'send_notification',
    access: 'write',
    description: 'Send an Inbox notification to people in the workspace ("<your name> sent you a message"). Use it to report results or ask someone to act. People can be user ids, names or emails.',
    input_schema: {
      type: 'object',
      properties: {
        people: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20, description: 'User ids, names or emails.' },
        message: str('The message (plain text, up to 2000 characters).'),
        page_id: str('A page the notification links to (you must be able to open it).'),
      },
      required: ['people', 'message'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_agent_history',
    access: 'read',
    description: 'Read your earlier conversations and runs, newest first: what people asked you (or what triggered you) and what you answered. Use it to recall earlier work. Unless your chat history is shared across users, you only see conversations with the person you are working for now.',
    input_schema: { type: 'object', properties: { query: str('Only entries containing these words.'), limit: { type: 'integer', minimum: 1, maximum: 20 } }, additionalProperties: false },
  },
  {
    name: 'request_url_access',
    access: 'write',
    description: 'Ask for permission to open a web page whose address was not in the request or your instructions. Call it before opening such a URL; continue only when it is allowed.',
    input_schema: { type: 'object', properties: { url: str('The URL to open.'), reason: str('Why you need it.') }, required: ['url'], additionalProperties: false },
  },
  {
    name: 'update_agent_settings',
    access: 'write',
    description: 'Change your own settings as a draft the person chatting with you reviews and saves: name, description, icon, instructions (Markdown — replaces your instructions page), triggers, model, web access, and access to Workspace pages / databases.',
    input_schema: {
      type: 'object',
      properties: {
        name: str('Your new name.'),
        description: str('One sentence: what you do.'),
        icon: str('An emoji icon.'),
        instructions: str('Your full instructions as Markdown (replaces the current ones).'),
        add_triggers: {
          type: 'array',
          maxItems: 10,
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['schedule', 'page_added', 'property_updated', 'page_removed', 'comment_added', 'mentioned'] },
              frequency: { type: 'string', enum: ['hour', 'day', 'week', 'month', 'year'], description: 'schedule: how often.' },
              interval: { type: 'integer', minimum: 1, maximum: 100 },
              weekdays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 }, description: 'schedule (week): 0 = Sunday … 6 = Saturday.' },
              time: str('schedule: HH:MM (24h).'),
              database_id: str('Database to watch (page_added / property_updated / page_removed).'),
              page_id: str('Page to watch (comment_added).'),
              instructions: str('Extra instructions for runs of this trigger.'),
            },
            required: ['type'],
            additionalProperties: false,
          },
        },
        remove_triggers: { type: 'array', items: { type: 'string' }, maxItems: 20, description: 'Trigger ids to remove.' },
        model: str('"auto" or a model id.'),
        web_access: { type: 'boolean' },
        grant_access: {
          type: 'array',
          maxItems: 20,
          items: {
            type: 'object',
            properties: { page: str('A page / database id, or its title to search for.'), role: { type: 'string', enum: ['reader', 'comment_only', 'read_and_write', 'editor'] } },
            required: ['page'],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
];
registerToolDefs(AGENT_TOOL_DEFS);
registerDynamicTools((name) => /^mcp_[0-9a-f]{8}_/.test(name));

// ---------------------------------------------------------------- run context

export interface PendingReview {
  kind: 'url' | 'tool';
  url?: string;
  host?: string;
  connectionId?: string;
  tool?: string;
  input?: Record<string, unknown>;
  reason?: string;
  label: string;
}

export interface RunToolContext {
  agent: AgentRecord;
  runId: string;
  kind: RunKind;
  /** a person is watching (chat): approvals are asked in the chat */
  interactive: boolean;
  /** who chats with / started the agent */
  actorId: string | null;
  /** the person may change the agent's settings (Can edit / Full access) */
  canConfigure: boolean;
  /** agents up the call chain (loop guard) */
  chain: string[];
  /** web hosts the run may open (mutated when a URL is approved in chat) */
  allowedHosts: Set<string>;
  allowAllUrls: boolean;
  /** generated MCP tool name → connection + tool */
  mcp: Map<string, { connectionId: string; connectionName: string; tool: McpTool; mode: McpToolMode }>;
  /** calls already approved for this run (re-runs after "Allow") */
  approvedCalls: Set<string>;
  /** AIMaster 2026-11-16: 저장된 승인을 실행 기록에서 한 번만 소진(성공 시 true). 없으면 메모리 승인만 씀(시험용). */
  consumeApproval?: (keys: string[]) => boolean;
  /** a triggered run hit something that needs a person: the run ends as "Needs review" */
  review: PendingReview | null;
  notificationsSent: number;
  /** 2026-11-17 E1: notify_me는 한 실행에 한 번만 */
  notifyMeSent?: boolean;
  /** run a sub-agent and return its final text */
  callSubAgent: (agentId: string, task: string) => Promise<string>;
  /** web fetch allowlist changed (rebuild the server tool) */
  onHostsChanged?: () => void;
}

// 2026-11-16(WS-20261116-08): 같은 인자를 모델이 다른 키 순서로 만들어도 같은 승인으로 보도록 객체 키를 깊이까지 정렬해 직렬화.
// 배열 순서·값·타입은 그대로(배열 순서가 다르면 다른 호출). Object.fromEntries는 「__proto__」 키도 일반 속성으로 만든다.
function canonicalJson(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalJson);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonicalJson((v as Record<string, unknown>)[k])]));
  return v;
}

export function callKey(connectionId: string, tool: string, input: unknown): string {
  return `${connectionId}:${tool}:${JSON.stringify(canonicalJson(input ?? {}))}`;
}

/** 배포 전(정렬 없음) 형식 — 이미 실행 기록에 저장된 승인을 같은 입력 순서일 때만 한 번 인정하기 위한 호환용 */
export function legacyCallKey(connectionId: string, tool: string, input: unknown): string {
  return `${connectionId}:${tool}:${JSON.stringify(input ?? {})}`;
}

/**
 * 2026-11-16(WS-20261116-09): 저장된 승인 키가 이 호출과 같은 논리 호출인지(새 형식·옛 형식 모두).
 * 경계는 알려진 연결·도구 접두(`connectionId:tool:`)로만 자르고 나머지 전체를 JSON으로 읽어 정렬 비교 —
 * 값 속 「:」나 「__proto__」 키를 접두로 잘못 읽지 않음. 읽을 수 없는 키는 같지 않음.
 */
export function approvalMatches(stored: string, connectionId: string, tool: string, input: unknown): boolean {
  const prefix = `${connectionId}:${tool}:`;
  if (!stored.startsWith(prefix)) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored.slice(prefix.length));
  } catch {
    return false;
  }
  return JSON.stringify(canonicalJson(parsed)) === JSON.stringify(canonicalJson(input ?? {}));
}

// ---------------------------------------------------------------- MCP tools of an agent

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** The agent's MCP tools as client tool definitions (enabled connections, enabled tools). */
export function agentMcpTools(agent: AgentRecord, cfg: AgentConfig): { defs: { name: string; description: string; input_schema: Record<string, unknown> }[]; map: RunToolContext['mcp'] } {
  const map: RunToolContext['mcp'] = new Map();
  const defs: { name: string; description: string; input_schema: Record<string, unknown> }[] = [];
  for (const c of connectionTools(agent.bot_id, agent.space_id)) {
    if (!c.enabled) continue;
    const modes = cfg.mcp_tool_modes?.[c.id] ?? {};
    for (const t of c.tools) {
      if (c.disabledTools.includes(t.name)) continue;
      const name = `mcp_${c.id.replace(/-/g, '').slice(0, 8)}_${slug(t.name)}`.slice(0, 64);
      if (map.has(name)) continue;
      const mode: McpToolMode = modes[t.name] ?? (t.readOnly ? 'auto' : 'ask');
      map.set(name, { connectionId: c.id, connectionName: c.name, tool: t, mode });
      const schema = t.inputSchema && (t.inputSchema as { type?: string }).type === 'object' ? t.inputSchema : { type: 'object', properties: {} };
      defs.push({ name, description: `${c.name} › ${t.name}${t.description ? `: ${t.description}` : ''}`.slice(0, 1000), input_schema: schema });
    }
  }
  return { defs, map };
}

// ---------------------------------------------------------------- executors

function trim(s: unknown, n: number): string {
  return typeof s === 'string' ? s.trim().slice(0, n) : '';
}

async function callAgent(ctx: RunToolContext, env: AgentEnv, input: Record<string, any>, stepId: string): Promise<ToolOutput> {
  const id = normalizeId(input.agent_id);
  const cfg = ctx.agent.data;
  const sub = getAgent(id);
  if (!sub || sub.alive === false || !cfg.sub_agents.includes(id) || sub.space_id !== ctx.agent.space_id) return { content: 'That agent isn’t connected to you. Use one of the agents listed in your instructions.', isError: true };
  if (ctx.chain.includes(id) || id === ctx.agent.id) return { content: 'That agent is already working on this task (it called you), so it can’t be called again.', isError: true };
  if (ctx.chain.length >= 3) return { content: 'Too many agents are already involved in this task; finish it yourself.', isError: true };
  env.step({ id: stepId, tool: 'call_agent', status: 'running', label: 'Asking agent', detail: sub.data.name });
  const text = await ctx.callSubAgent(id, String(input.task).slice(0, 20_000));
  env.step({ id: stepId, tool: 'call_agent', status: 'done', label: 'Asked agent', detail: sub.data.name });
  return { content: `${sub.data.name} answered:\n\n${text || '(no answer)'}` };
}

/** 2026-11-17 E1: 에이전트 주인 본인에게만 메일·카카오톡(자동화 「내 메일·카카오톡으로도 받기」와 같은 발송·한도) */
async function notifyMe(ctx: RunToolContext, env: AgentEnv, input: Record<string, any>, stepId: string): Promise<ToolOutput> {
  const message = trim(input.message, 1000);
  if (!message) return { content: 'The message is empty.', isError: true };
  const channels = [...new Set((Array.isArray(input.channels) ? input.channels : []).map(String))].filter((c): c is 'email' | 'kakao' => c === 'email' || c === 'kakao');
  if (!channels.length) return { content: 'Choose email and/or kakao.', isError: true };
  if (ctx.notifyMeSent || !hit(`agent-notify-me:${ctx.agent.id}`, 10, 3600_000)) return { content: 'Already sent to the owner in this run (or too many recently).', isError: true };
  const pageId = normalizeId(input.page_id);
  if (!pageId || !canRead(pageId, env.userId)) return { content: 'You can’t open that page, so it can’t be linked.', isError: true };
  const owner = ctx.agent.owner_id ?? ctx.agent.created_by_id;
  env.step({ id: stepId, tool: 'notify_me', status: 'running', label: 'Sending to the owner', detail: channels.join(', ') });
  const sending = sendExternalNotify({ userId: owner, channels, automationName: ctx.agent.data.name, text: message, pageId, spaceId: ctx.agent.space_id });
  if (!sending) return { content: 'Email/KakaoTalk sending is not available here.', isError: true };
  ctx.notifyMeSent = true;
  const fails = (await sending) ?? [];
  env.step({ id: stepId, tool: 'notify_me', status: fails.length ? 'error' : 'done', label: 'Sent to the owner', detail: channels.join(', '), ...(fails.length ? { error: fails.join(' / ').slice(0, 300) } : {}) });
  return fails.length ? { content: `Some channels failed: ${fails.join(' / ')}`, isError: true } : { content: `Sent to the owner by ${channels.join(' and ')}.` };
}

async function sendNotification(ctx: RunToolContext, env: AgentEnv, input: Record<string, any>, stepId: string): Promise<ToolOutput> {
  const message = trim(input.message, 2000);
  if (!message) return { content: 'The message is empty.', isError: true };
  if (ctx.notificationsSent >= 20 || !hit(`agent-notify:${ctx.agent.id}`, 200, 3600_000)) return { content: 'Too many notifications sent. Try again later.', isError: true };
  const pageId = input.page_id ? normalizeId(input.page_id) : '';
  if (pageId && !canRead(pageId, env.userId)) return { content: 'You can’t open that page, so it can’t be linked.', isError: true };
  const space = getRecord<SpaceRecord>('space', ctx.agent.space_id);
  const raw = (input.people as string[]).map(String);
  const { ids, unknown } = resolvePeople(ctx.agent.space_id, raw);
  const members = new Set((space?.permissions ?? []).filter((p) => p.user_id && p.role !== 'none').map((p) => p.user_id!));
  const targets = [...new Set(ids)].filter((u) => members.has(u));
  if (!targets.length) return { content: `No workspace members matched ${unknown.join(', ') || 'those people'}.`, isError: true };
  env.step({ id: stepId, tool: 'send_notification', status: 'running', label: 'Sending an update', detail: `${targets.length} ${targets.length === 1 ? 'person' : 'people'}` });
  let sent = 0;
  for (const uid of targets) {
    // a linked page only for people who can open it
    const link = pageId && canRead(pageId, uid) ? pageId : undefined;
    pushNotification({
      user_id: uid, space_id: ctx.agent.space_id, type: 'automation' as NotificationRecord['type'], actor_id: ctx.agent.bot_id, ...(link ? { navigable_block_id: link } : {}),
      activity: { kind: 'message', agent_id: ctx.agent.id, automation_name: ctx.agent.data.name, message, ...(link ? { page_id: link } : {}) },
    });
    sent++;
  }
  ctx.notificationsSent += sent;
  env.step({ id: stepId, tool: 'send_notification', status: 'done', label: 'Update sent', detail: `${sent} ${sent === 1 ? 'person' : 'people'}` });
  return { content: `Notified ${sent} ${sent === 1 ? 'person' : 'people'}.${unknown.length ? ` Not found: ${unknown.join(', ')}.` : ''}` };
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function requestUrlAccess(ctx: RunToolContext, env: AgentEnv, input: Record<string, any>, stepId: string): Promise<ToolOutput> {
  const url = trim(input.url, 2000);
  const host = hostOf(url);
  if (!host) return { content: 'That isn’t a web address.', isError: true };
  if (ctx.allowAllUrls || ctx.allowedHosts.has(host)) return { content: `You may open ${host}.` };
  const reason = trim(input.reason, 500);
  if (!ctx.interactive) {
    ctx.review = { kind: 'url', url, host, reason, label: `Open ${host}` };
    env.step({ id: stepId, tool: 'request_url_access', status: 'waiting', label: 'Awaiting your approval', detail: host });
    return { content: `Opening ${host} needs approval, and nobody is here to give it now. Stop working on anything that needs this page, finish what you can, and end your reply by saying you are waiting for approval to open ${url}.` };
  }
  const decision = await env.approve({ tool: 'request_url_access', stepId, risk: 'share', payload: { title: `Allow ${ctx.agent.data.name} to open ${host}?`, description: reason || url, confirmLabel: 'Allow', danger: false } });
  if (decision !== 'accept') {
    env.step({ id: stepId, tool: 'request_url_access', status: 'declined', label: 'Open web page', detail: host });
    return { content: `Opening ${host} was not allowed. Don't open it.` };
  }
  ctx.allowedHosts.add(host);
  ctx.onHostsChanged?.();
  env.step({ id: stepId, tool: 'request_url_access', status: 'done', label: 'Allowed', detail: host });
  return { content: `You may open ${url} now.` };
}

async function mcpTool(ctx: RunToolContext, env: AgentEnv, name: string, input: Record<string, any>, stepId: string): Promise<ToolOutput> {
  const m = ctx.mcp.get(name);
  if (!m) return { content: `The tool ${name} isn’t available.`, isError: true };
  const label = `${m.connectionName}: ${m.tool.name}`;
  const inputText = JSON.stringify(input ?? {}, null, 2).slice(0, 4000);
  env.step({ id: stepId, tool: 'mcp', status: 'running', label: 'Running tool', detail: label, mcp: { server: m.connectionName, tool: m.tool.name, input: inputText } });
  const key = callKey(m.connectionId, m.tool.name, input);
  // AIMaster 2026-11-16(플랜 PLAN_20261116_AGENT_MCP.md): 회원이 없는 실행(정시·이벤트)에서는 쓰기·삭제 도구를
  // 「항상 허용」으로 해 두었어도 검토 필요로 멈춤 — 혼자 실행되는 것은 읽기 도구뿐. 채팅 중에는 회원 설정을 따름.
  // 2026-11-16(WS-20261116-05): 서버가 읽기 표시와 삭제 가능 표시를 함께 보낸 모순 도구도 혼자 실행에서는 검토로(삭제 가능 표시 우선)
  const needsApproval = m.mode === 'ask' || (!ctx.interactive && (!m.tool.readOnly || !!m.tool.destructive));
  // 「허용」 승인은 한 번만: 메모리에서 지우고, 실행 기록에서도 조건부로 소진해 성공한 쪽만 실행(다른 서버·다시 실행과 겨뤄도 1번).
  // 소진에 실패하면(이미 쓰임) 승인이 없는 것으로 보고 다시 검토 필요로 멈춤. 호출이 실패해도 승인은 돌려놓지 않음(자동 재호출 없음).
  let preApproved = false;
  // WS-20261116-08: 새 형식 키를 먼저, 없으면 배포 전 형식 키(같은 입력 순서일 때만 같음)를 찾아 그 하나만 소진
  const legacy = legacyCallKey(m.connectionId, m.tool.name, input);
  const hit = ctx.approvedCalls.has(key) ? key : legacy !== key && ctx.approvedCalls.has(legacy) ? legacy : null;
  if (needsApproval && hit) {
    // WS-20261116-09: 쓸 수 있는지는 위 그대로(새 키 또는 같은 순서 옛 키), 쓸 때는 이 실행의 동치 승인(새·옛 형식)을 모두 함께 소진 —
    // 같은 논리 호출을 회원이 다시 허용해 키가 둘 남아도 실제 호출은 1번. 실행 기록 소진(CAS)에 성공한 쪽만 실행.
    const same = [...ctx.approvedCalls].filter((k) => k === hit || approvalMatches(k, m.connectionId, m.tool.name, input));
    for (const k of same) ctx.approvedCalls.delete(k);
    preApproved = ctx.consumeApproval ? ctx.consumeApproval(same) : true;
  }
  if (needsApproval && !preApproved) {
    if (!ctx.interactive) {
      ctx.review = { kind: 'tool', connectionId: m.connectionId, tool: m.tool.name, input, label: `Run ${m.tool.name} (${m.connectionName})` };
      env.step({ id: stepId, tool: 'mcp', status: 'waiting', label: 'Awaiting your approval', detail: label, mcp: { server: m.connectionName, tool: m.tool.name, input: inputText } });
      return { content: `${m.tool.name} needs approval before it runs, and nobody is here to give it now. Don't retry; finish what you can and say you are waiting for approval to run ${m.tool.name}.` };
    }
    const decision = await env.approve({ tool: 'mcp', stepId, risk: 'edit', payload: { title: `Run ${m.tool.name}?`, description: `${m.connectionName}${m.tool.destructive ? ' (can delete or replace data)' : ''}`, markdown: '```json\n' + inputText + '\n```', confirmLabel: 'Run', danger: !!m.tool.destructive } });
    if (decision !== 'accept') {
      env.step({ id: stepId, tool: 'mcp', status: 'declined', label: 'Run tool', detail: label, mcp: { server: m.connectionName, tool: m.tool.name, input: inputText } });
      return { content: 'The person declined running this tool. Don’t retry it.' };
    }
  }
  // 한도를 셀 회원: 채팅 중이면 대화하는 회원(다른 회원의 에이전트로 남의 한도를 쓰지 못하게), 혼자 실행이면 에이전트 주인 회원
  const meter = (ctx.interactive && ctx.actorId) || ctx.agent.created_by_id || ctx.agent.bot_id;
  const r = await callMcpTool(ctx.agent.bot_id, m.connectionId, m.tool.name, input, meter);
  const mcp = { server: m.connectionName, tool: m.tool.name, input: inputText, output: r.text.slice(0, 4000) };
  if (r.isError) env.step({ id: stepId, tool: 'mcp', status: 'error', label: 'Running tool', detail: label, error: r.text.slice(0, 300) || 'The MCP tool failed.', mcp });
  else env.step({ id: stepId, tool: 'mcp', status: 'done', label: `Ran MCP tool: ${m.tool.name}`, detail: m.connectionName, mcp });
  return { content: r.text, isError: r.isError };
}

// ---------------------------------------------------------------- update_agent_settings (setup chat)

const TRIGGER_KIND: Record<string, AgentTrigger['type']> = {
  schedule: 'recurrence', page_added: 'lit.page_created', property_updated: 'lit.page_updated', page_removed: 'lit.page_deleted',
  comment_added: 'lit.comment_added', mentioned: 'lit.agent_mentioned',
};

function ymdIn(tz: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

async function updateAgentSettings(ctx: RunToolContext, env: AgentEnv, input: Record<string, any>, stepId: string): Promise<ToolOutput> {
  const actor = ctx.actorId;
  const agent = getAgent(ctx.agent.id);
  if (!agent || !actor || !ctx.canConfigure || !['editor', 'read_and_write'].includes(agentRole(agent, actor))) {
    return { content: 'The person chatting with you can’t edit your settings, so nothing was changed.', isError: true };
  }
  env.step({ id: stepId, tool: 'update_agent_settings', status: 'running', label: 'Updating settings', detail: agent.data.name });
  const cur = workingConfig(agent);
  const next: AgentConfig = JSON.parse(JSON.stringify(cur));
  const notes: string[] = [];
  if (typeof input.name === 'string' && input.name.trim()) { next.name = input.name.trim().slice(0, 100); notes.push(`name “${next.name}”`); }
  if (typeof input.description === 'string') { next.description = input.description.trim().slice(0, 500) || undefined; notes.push('description'); }
  if (typeof input.icon === 'string' && input.icon.trim()) { next.icon = input.icon.trim().slice(0, 16); notes.push('icon'); }
  if (typeof input.model === 'string' && input.model.trim()) { next.model = input.model.trim().slice(0, 64); notes.push('model'); }
  if (typeof input.web_access === 'boolean') { next.web_access = input.web_access; notes.push(input.web_access ? 'web access on' : 'web access off'); }
  const tz = (() => {
    const s = (getRecord<{ id: string; version: number; settings?: Record<string, unknown> }>('user_settings', actor)?.settings ?? {}) as Record<string, unknown>;
    return typeof s.time_zone === 'string' && s.time_zone ? s.time_zone : 'UTC';
  })();
  for (const raw of (Array.isArray(input.add_triggers) ? input.add_triggers : []) as Record<string, any>[]) {
    const type = TRIGGER_KIND[raw.type];
    if (!type) continue;
    const t: Record<string, unknown> = { id: `trg_${newId().slice(0, 8)}`, type, enabled: true, ...(typeof raw.instructions === 'string' ? { instructions: raw.instructions } : {}) };
    if (type === 'recurrence') {
      t.recurrence = { frequency: raw.frequency ?? 'day', interval: raw.interval ?? 1, weekdays: raw.weekdays, time: typeof raw.time === 'string' ? raw.time : '09:00', start: ymdIn(tz), time_zone: tz };
    } else if (type === 'lit.comment_added') {
      if (raw.page_id) t.page_id = normalizeId(raw.page_id);
    } else if (type !== 'lit.agent_mentioned') {
      const dbId = raw.database_id ? normalizeId(raw.database_id) : '';
      const block = dbId ? getRecord<any>('block', dbId) : undefined;
      const collectionId = block?.collection_id ?? (getRecord<any>('collection', dbId) ? dbId : '');
      if (!collectionId) { notes.push(`skipped a ${raw.type} trigger (no database)`); continue; }
      t.collection_id = collectionId;
    }
    const clean = cleanTrigger(t);
    if (clean) { next.triggers.push(clean); notes.push(`trigger “${triggerRowTitle(clean)}”`); }
  }
  if (Array.isArray(input.remove_triggers)) {
    const drop = new Set(input.remove_triggers.map(String));
    const before = next.triggers.length;
    next.triggers = next.triggers.filter((t) => !drop.has(t.id));
    if (next.triggers.length !== before) notes.push(`removed ${before - next.triggers.length} trigger(s)`);
  }
  const denied: string[] = [];
  for (const g of (Array.isArray(input.grant_access) ? input.grant_access : []) as { page: string; role?: GrantRole }[]) {
    const role: GrantRole = GRANT_ROLES.includes(g.role as GrantRole) ? (g.role as GrantRole) : 'reader';
    let id = normalizeId(g.page);
    if (!getRecord('block', id)) id = searchPages(agent.space_id, actor, String(g.page), 1)[0]?.pageId ?? '';
    if (!id) { denied.push(`“${g.page}” (not found)`); continue; }
    const problem = grantProblem(actor, agent.space_id, id, role);
    if (problem) { denied.push(`${blockLabel(id)} (${problem})`); continue; }
    next.grants = [...next.grants.filter((x) => x.block_id !== id), { block_id: id, role, added_by: actor, added_time: Date.now() }];
    notes.push(`access to ${blockLabel(id)}`);
  }
  let instructionsNote = '';
  if (typeof input.instructions === 'string' && cur.instructions_page_id) {
    // the instructions page is the agent's own: written as the agent (Undo-able from the chat)
    const r = await runTool(env, 'update_page', { page_id: cur.instructions_page_id, command: 'replace_content', new_str: input.instructions.slice(0, 50_000) }, `${stepId}-instr`);
    instructionsNote = r.isError ? ` Instructions not changed: ${r.content}` : ' Instructions updated.';
  }
  const cleaned = cleanConfig(next);
  patchAgent(agent.id, { draft: cleaned, draft_edited_by_id: actor, draft_edited_time: Date.now() });
  env.step({ id: stepId, tool: 'update_agent_settings', status: 'done', label: 'Updated settings', detail: notes.length ? notes.slice(0, 4).join(', ') : agent.data.name });
  return {
    content: `${notes.length ? `Draft updated: ${notes.join('; ')}.` : 'No settings changed.'}${instructionsNote}${denied.length ? ` Couldn’t add access to: ${denied.join('; ')} — the person needs that access themselves (more than view needs Full access).` : ''} The person reviews the draft and clicks Save to apply it.`,
  };
}

// ---------------------------------------------------------------- read_agent_history (Advanced › Share chat history)

async function readAgentHistory(ctx: RunToolContext, env: AgentEnv, input: Record<string, any>, stepId: string): Promise<ToolOutput> {
  const shared = !!ctx.agent.data.share_chat_history;
  env.step({ id: stepId, tool: 'read_agent_history', status: 'running', label: 'Viewing', detail: 'Earlier conversations' });
  // off: each person's conversations stay separate — only the current person's (none for runs nobody started)
  if (!shared && !ctx.actorId) {
    env.step({ id: stepId, tool: 'read_agent_history', status: 'done', label: 'Viewed', detail: 'Earlier conversations' });
    return { content: 'Your chat history isn’t shared across users, and nobody started this run, so there are no earlier conversations you can read.' };
  }
  const q = trim(input.query, 200).toLowerCase();
  const limit = Math.min(20, Math.max(1, Number(input.limit) || 10));
  const rows = db.prepare(`SELECT created_time, kind, trigger_label, actor_id, payload, result FROM agent_runs WHERE agent_id = ? AND id != ? AND status IN ('success', 'skipped', 'needs_review') AND result IS NOT NULL${shared ? '' : ' AND actor_id = ?'} ORDER BY created_time DESC LIMIT 300`)
    .all(...[ctx.agent.id, ctx.runId, ...(shared ? [] : [ctx.actorId!])]) as { created_time: number; kind: string; trigger_label: string | null; actor_id: string | null; payload: string | null; result: string | null }[];
  const out: string[] = [];
  for (const r of rows) {
    let asked = '';
    try {
      asked = String((JSON.parse(r.payload ?? '{}') as { text?: unknown }).text ?? '');
    } catch {
      /* no payload */
    }
    const answer = String(r.result ?? '');
    if (q && !`${asked}\n${answer}`.toLowerCase().includes(q)) continue;
    const who = r.actor_id ? getRecord<UserRecord>('lit_user', r.actor_id)?.name || 'Someone' : '';
    const what = r.kind === 'chat' ? `Chat with ${who || 'someone'}` : `${r.trigger_label || 'Run'}${who ? ` (started by ${who})` : ''}`;
    out.push(`- ${new Date(r.created_time).toISOString().slice(0, 16).replace('T', ' ')} · ${what}\n  Asked: ${asked.replace(/\s+/g, ' ').slice(0, 300) || '(trigger)'}\n  Answered: ${answer.replace(/\s+/g, ' ').slice(0, 600)}`);
    if (out.length >= limit) break;
  }
  env.step({ id: stepId, tool: 'read_agent_history', status: 'done', label: 'Viewed', detail: `${out.length} earlier ${out.length === 1 ? 'conversation' : 'conversations'}` });
  return { content: out.length ? out.join('\n') : 'No earlier conversations matched.' };
}

/** Run an agent-only tool; null when `name` is a regular AI tool (the caller runs it through ai/tools). */
export async function runAgentTool(ctx: RunToolContext, env: AgentEnv, name: string, input: Record<string, any>, stepId: string): Promise<ToolOutput | null> {
  try {
    if (name === 'call_agent') return await callAgent(ctx, env, input, stepId);
    if (name === 'send_notification') return await sendNotification(ctx, env, input, stepId);
    if (name === 'notify_me') return await notifyMe(ctx, env, input, stepId);
    if (name === 'request_url_access') return await requestUrlAccess(ctx, env, input, stepId);
    if (name === 'update_agent_settings') return await updateAgentSettings(ctx, env, input, stepId);
    if (name === 'read_agent_history') return await readAgentHistory(ctx, env, input, stepId);
    if (ctx.mcp.has(name)) return await mcpTool(ctx, env, name, input, stepId);
    return null;
  } catch (e) {
    const message = e instanceof AiError ? e.message : `Tool failed: ${String((e as Error)?.message ?? e).slice(0, 300)}`;
    env.step({ id: stepId, tool: name.startsWith('mcp_') ? 'mcp' : name, status: 'error', label: 'Error', error: message });
    return { content: message, isError: true };
  }
}

/** Tools an agent run offers, including agent-only tools enabled by its configuration. */
export function agentToolNames(cfg: AgentConfig, opts: { canConfigure: boolean; web: boolean }): string[] {
  const names = ['search_workspace', 'read_page', 'query_database', 'read_comments', 'view_version_history', 'create_pages', 'update_page', 'delete_pages', 'move_pages', 'create_database', 'update_database', 'add_comment', 'send_notification', 'notify_me', 'read_agent_history'];
  if (cfg.people_directory) names.push('list_people');
  if (cfg.sub_agents.length) names.push('call_agent');
  if (opts.web) names.push('request_url_access');
  if (opts.canConfigure) names.push('update_agent_settings');
  return names;
}
