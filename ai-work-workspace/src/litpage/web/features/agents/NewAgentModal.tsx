import { HELP_URL } from '#shared/brand.ts';



import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon.tsx';
import { Modal } from '../../components/Modal.tsx';
import { useSession } from '../../lib/store/session.ts';
import { useUI } from '../../lib/store/ui.ts';
import { navigate } from '../../lib/router.ts';
import { t, tx } from '../shell/i18n.ts';
import { agentApi, agentUrl, applyAnswer, toastError, useAgents } from './agentsApi.ts';
import { AgentIcon } from './AgentsSection.tsx';
import './icons.tsx';
import './agents.css';

type Template = Awaited<ReturnType<typeof agentApi.templates>>['templates'][number];
const useNewAgent = { open: null as null | (() => void), pending: false };

/** AIMaster U12: 업무 비서 비용 안내 동의(이 브라우저에 한 번) */
const COST_OK_KEY = 'aww:agent-cost-ok';
function readCostOk(): boolean {
  try {
    return localStorage.getItem(COST_OK_KEY) === '1';
  } catch {
    return false;
  }
}

function Launch({ close }: { close: () => void }) {
  const admin = useAgents((s) => s.isAdmin);
  return (
    <div className="nc-agent-launch" data-testid="agent-launch-modal">
      <div className="nc-agent-launch-art" aria-hidden><Icon name="agentFace" size={56} /></div>
      <div className="nc-agent-launch-title">{t('lp.agents.meet_custom_agents', 'Meet{br}custom agents', { br: ' ' })}</div>
      <div className="nc-agent-launch-sub">{t('lp.agents.your_whole_team_can_hand_off', 'Your whole team can hand off repeat work to custom agents.')}</div>
      <div className="nc-agent-launch-cards">
        {[
          ['customAgentsLaunchModal.variant1.slackQa', 'Slack Q&A assistant', 'Answers recurring questions in a team channel.', '💬'],
          ['customAgentsLaunchModal.variant1.taskTriager', 'Task triager', 'Collects and routes work in Workspace.', '🗂️'],
          ['customAgentsLaunchModal.variant1.weeklyReporter', 'Weekly update writer', 'Drafts and sends a weekly progress update.', '📈'],
        ].map(([id, title, desc, emoji]) => (
          <div key={id} className="nc-agent-launch-card">
            <span className="emoji" aria-hidden>{emoji}</span>
            <div className="ttl">{t(`${id}.title`, title)}</div>
            <div className="desc">{t(`${id}.description`, desc)}</div>
          </div>
        ))}
      </div>
      <div className="nc-agent-launch-actions">
        {HELP_URL && <button type="button" className="nc-btn outline" onClick={() => { close(); window.open(HELP_URL!, '_blank', 'noopener'); }}>{t('lp.agents.learn_more', 'Learn more')}</button>}
        <button type="button" className="nc-btn primary" onClick={() => { close(); useUI.getState().openSettings(admin ? 'plans' : 'plans'); }}>
          {admin ? t('lp.agents.upgrade_to_try_it', 'Upgrade to try it') : t('lp.agents.ask_to_try_it', 'Ask to try it')}
        </button>
      </div>
    </div>
  );
}

function NewAgent({ close }: { close: () => void }) {
  const spaceId = useSession((s) => s.spaceId);
  const [data, setData] = useState<{ categories: { id: string; label: string }[]; templates: Template[] } | null>(null);
  const [tab, setTab] = useState('everyone');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    void agentApi.templates().then(setData).catch(() => setData({ categories: [], templates: [] }));
    inputRef.current?.focus();
  }, []);
  // AIMaster U12(주인님 결정 — 처음 켤 때 비용 안내 1번): 동의 전에는 만들 수 없음, 동의는 이 브라우저에 기억
  const [costOk, setCostOk] = useState<boolean>(() => readCostOk());
  const agreeCost = (v: boolean) => {
    setCostOk(v);
    try {
      if (v) localStorage.setItem(COST_OK_KEY, '1');
      else localStorage.removeItem(COST_OK_KEY);
    } catch {
      /* 저장소를 못 쓰면 이번 창에서만 기억 */
    }
  };
  const create = async (opts: { templateId?: string; prompt?: string }, key: string) => {
    if (!spaceId || busy || !costOk) return;
    setBusy(key);
    try {
      const r = await agentApi.create(spaceId, { templateId: opts.templateId });
      applyAnswer(r);
      close();
      const q = opts.prompt?.trim();
      navigate(`${agentUrl(r.agentId)}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    } catch (e) {
      toastError(e, t('lp.agents.something_went_wrong_creating_the_agent', 'Something went wrong while loading creating the agent. Try again.'));
      setBusy(null);
    }
  };
  const list = (data?.templates ?? []).filter((x) => x.categories.includes(tab));
  return (
    <div className="nc-new-agent" role="dialog" aria-label={t('lp.agents.new_agent_setup', 'New agent setup')} data-testid="new-agent-modal">
      <div className="nc-new-agent-head">
        <div className="nc-new-agent-title">{t('lp.agents.create_an_agent', 'Create an agent')}</div>
        <div className="nc-new-agent-sub">{t('lp.agents.you_hand_out_the_jobs_and', 'You hand out the jobs, and your agents get them done.')}</div>
        <div role="button" aria-label={t('lp.agents.close', 'Close')} className="nc-agent-icon-btn nc-new-agent-close" onClick={close}><Icon name="close" size={16} /></div>
      </div>
      <div className="nc-new-agent-cost" data-testid="agent-cost-notice" style={{ margin: '0 20px 12px', padding: '10px 12px', borderRadius: 8, background: 'var(--c-bg-secondary, #f7f7f5)', fontSize: 13, lineHeight: 1.55 }}>
        <div>💳 업무 비서는 <b>회원님 본인 AI 키</b>(API키등록·플랫폼연동에 등록한 Claude·OpenAI·Gemini 키)로 실행되며, 쓴 만큼 해당 AI 회사 요금이 회원님 계정에 청구됩니다.</div>
        <div>새 비서는 <b>월 사용 상한 700 크레딧</b>(중간 모델 기준 약 $2)으로 시작하고, 넘으면 자동으로 멈춥니다. 상한은 비서 설정에서 바꿀 수 있습니다. 웹 검색은 꺼져 있습니다.</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={costOk} onChange={(e) => agreeCost(e.target.checked)} data-testid="agent-cost-ok" />
          <span>비용 안내를 확인했습니다</span>
        </label>
      </div>
      <form
        className="nc-new-agent-ask"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void create({ prompt: text }, 'ask');
        }}
      >
        <textarea
          ref={inputRef}
          rows={2}
          value={text}
          placeholder={t('lp.agents.or_explain_the_agent_s_job', 'Or explain the agent’s job in your own words')}
          aria-label={t('lp.agents.or_explain_the_agent_s_job', 'Or explain the agent’s job in your own words')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (text.trim()) void create({ prompt: text }, 'ask');
            }
          }}
        />
        <button type="submit" className={`nc-new-agent-send ${text.trim() ? 'ready' : ''}`} aria-label={tx('Build with AI chat')} disabled={!text.trim() || !!busy || !costOk}>
          <Icon name="arrowUp" size={16} strokeWidth={2.2} />
        </button>
      </form>
      <div className="nc-new-agent-tabs" role="tablist" aria-label={t('lp.agents.template_categories', 'Template categories')}>
        {(data?.categories ?? []).map((c) => (
          <div key={c.id} role="tab" aria-selected={tab === c.id} className={`nc-new-agent-tab ${tab === c.id ? 'on' : ''}`} onClick={() => setTab(c.id)}>{c.label}</div>
        ))}
      </div>
      <div className="nc-new-agent-grid" data-testid="agent-templates">
        {data === null && <div className="nc-new-agent-loading">{t('lp.agents.setting_up', 'Setting up…')}</div>}
        {data && !list.length && <div className="nc-new-agent-loading">{t('lp.agents.no_templates_found', 'No starter templates available')}</div>}
        {list.map((tp) => (
          <div key={tp.id} role="button" tabIndex={0} className={`nc-new-agent-card ${busy === tp.id ? 'busy' : ''}`} aria-disabled={!costOk} style={costOk ? undefined : { opacity: 0.55, cursor: 'not-allowed' }} data-template-id={tp.id} onClick={() => void create({ templateId: tp.id }, tp.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') void create({ templateId: tp.id }, tp.id); }}
          >
            <div className="nc-new-agent-card-icon"><AgentIcon icon={tp.icon} size={22} /></div>
            <div className="nc-new-agent-card-main">
              <div className="ttl">{tp.title}{tp.badge && <span className="nc-agent-badge">{t('lp.agents.new', 'New')}</span>}</div>
              <div className="desc">{tp.description}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="nc-new-agent-foot">
        <button type="button" className="nc-btn outline" data-testid="create-blank-agent" disabled={!!busy || !costOk} onClick={() => void create({}, 'blank')}>
          <Icon name="plus" size={14} />
          <span>{t('lp.agents.create_blank', 'Create blank')}</span>
        </button>
      </div>
    </div>
  );
}

function NewAgentHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    useNewAgent.open = () => setOpen(true);
    // the first "+ New agent" click mounts this host; it opens as soon as the host is ready
    if (useNewAgent.pending) {
      useNewAgent.pending = false;
      setOpen(true);
    }
    return () => {
      useNewAgent.open = null;
    };
  }, []);
  const { available, canCreate, createProblem, loaded } = useAgents();
  return (
    <Modal open={open} onClose={() => setOpen(false)} width={!available && loaded ? 520 : 760} className="nc-new-agent-modal">
      {!available && loaded ? <Launch close={() => setOpen(false)} />
        : !canCreate && loaded ? (
          <div className="nc-agent-launch">
            <div className="nc-agent-launch-art" aria-hidden><Icon name="agentFace" size={48} /></div>
            <div className="nc-agent-launch-sub">{createProblem || t('lp.agents.agent_creation_is_disabled_right_now', 'Agent creation is disabled right now. Choose another option to turn it on.')}</div>
            <div className="nc-agent-launch-actions"><button type="button" className="nc-btn outline" onClick={() => setOpen(false)}>{t('lp.agents.close', 'Close')}</button></div>
          </div>
        ) : <NewAgent close={() => setOpen(false)} />}
    </Modal>
  );
}

let mounted = false;

export async function openNewAgentModal() {
  const spaceId = useSession.getState().spaceId;
  if (spaceId) await useAgents.getState().load(spaceId);
  if (!mounted) {
    mounted = true;
    useNewAgent.pending = true;
    const { createRoot } = await import('react-dom/client');
    const host = document.createElement('div');
    host.dataset.ncNewAgent = '1';
    document.body.appendChild(host);
    createRoot(host).render(<NewAgentHost />);
    return;
  }
  if (useNewAgent.open) useNewAgent.open();
  else useNewAgent.pending = true;
}
