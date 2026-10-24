// Library > Skills: "Enabled for my account" (your skills + built-ins, Use automatically, Uninstall, Show
// skill / Remove skill from this page / Download for local agent use / Send to trash) and "Discover" (skills others in the
// workspace created, with Enable for my account). "New skill" creates a private skill page.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { deleteBlocksIn, run } from '../../lib/blocks.ts';
import { openPage } from '../../lib/router.ts';
import { useSession } from '../../lib/store/session.ts';
import { useUI } from '../../lib/store/ui.ts';
import { Icon } from '../../components/Icon.tsx';
import { openMenu } from '../../components/Menu.tsx';
import { setSkillAutomatic, setSkillEnabled, unsetSkill, useSkills, type SkillInfo } from './aiStores.ts';
import { useAiStatus } from './aiApi.ts';
import { tx } from '../shell/i18n.ts';

/** "New skill": a private skill page (template body), opened for editing. */
export async function createNewSkill() {
  try {
    const r = await api<{ pageId: string }>('aiCreateSkill', { spaceId: useSession.getState().spaceId });
    void useSkills.getState().load(true);
    openPage(r.pageId);
  } catch (e) {
    useUI.getState().toast((e as Error)?.message || tx('Could not create skill'));
  }
}

/** "Edit skill" (selection menu / ⋮⋮ › Skills pencil): open the skill's page — built-ins become your editable copy. */
export async function editSkill(name?: string, skillId?: string) {
  const own = skillId ? useSkills.getState().enabled.find((x) => x.id === skillId && x.pageId) : undefined;
  if (own?.pageId) {
    openPage(own.pageId);
    return;
  }
  try {
    const r = await api<{ pageId: string; created: boolean }>('aiCustomizeBuiltinSkill', { spaceId: useSession.getState().spaceId, skill: name ?? skillId });
    void useSkills.getState().load(true);
    openPage(r.pageId);
  } catch (e) {
    useUI.getState().toast((e as Error)?.message || tx('Couldn’t open this skill'));
  }
}

async function downloadSkill(s: SkillInfo) {
  try {
    const r = await api<{ filename: string; markdown: string }>('aiSkillFile', { spaceId: useSession.getState().spaceId, skillId: s.id });
    const url = URL.createObjectURL(new Blob([r.markdown], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SKILL.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    useUI.getState().toast(`Downloaded ${r.filename}`);
  } catch (e) {
    useUI.getState().toast((e as Error)?.message || tx('Skill download failed'));
  }
}

function SkillRow({ s, tab }: { s: SkillInfo; tab: 'enabled' | 'discover' }) {
  const [busy, setBusy] = useState(false);
  const localSkills = useAiStatus((st) => st.policy.localSkills);
  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      await setSkillEnabled(s, on);
      if (on) useUI.getState().toast(tx('Skill enabled. Your Agent can now use this skill. Type / in chat to use it.'));
    } catch (e) {
      useUI.getState().toast((e as Error)?.message || tx('Loading failed unexpectedly'));
    } finally {
      setBusy(false);
    }
  };
  const more = (anchor: HTMLElement) => openMenu(anchor, {
    width: 260,
    sections: [{
      items: [
        ...(s.pageId ? [{ label: tx('Show skill'), icon: 'page', onSelect: () => openPage(s.pageId!) }] : []),
        ...(localSkills ? [{ label: tx('Download for local agent use'), icon: 'download', onSelect: () => { void downloadSkill(s); } }] : []),
        ...(s.pageId && s.mine ? [
          { label: tx('Remove skill from this page'), icon: 'close', onSelect: () => { void unsetSkill(s.pageId!).then(() => useUI.getState().toast(tx('This page is no longer a skill'))); } },
          { label: tx('Send to trash'), icon: 'trash', danger: true, onSelect: () => { run('ai.skill.trash', (tx) => deleteBlocksIn(tx, [s.pageId!])); setTimeout(() => void useSkills.getState().load(true), 300); } },
        ] : []),
      ],
    }],
  }, { placement: 'bottom-end' });
  return (
    <div className="nc-ai-skill-row" data-testid="ai-skill-row" data-skill={s.name}>
      <div className="nc-ai-skill-icon">{s.icon ? <span>{s.icon}</span> : <Icon name={s.builtin ? 'aiFace' : 'aiStepSkill'} size={18} />}</div>
      <div className="nc-ai-skill-main" role={s.pageId ? 'link' : undefined} onClick={() => s.pageId && openPage(s.pageId)}>
        <div className="nc-ai-skill-name">
          <span className="nc-ellipsis">{s.name || tx('Untitled')}</span>
          {s.builtin && <span className="nc-badge gray">{tx('Default')}</span>}
        </div>
        <div className="nc-ai-skill-desc nc-ellipsis" data-tooltip={s.description ? undefined : 'AI 비서 uses this description to choose when the skill applies. Edit the opening of the page to change it.'}>
          {s.description || tx('No description')}
        </div>
        <div className="nc-ai-skill-where">
          {s.inChat && <span>{tx('In chat')}</span>}
          {s.inPage && <span data-tooltip={tx('This skill can appear as you work across Workspace pages')}>{tx('In a page')}</span>}
          {!s.mine && !s.builtin && s.createdBy && <span>by {s.createdBy}</span>}
        </div>
      </div>
      <div className="nc-ai-skill-actions">
        {tab === 'enabled' && !s.builtin && (
          <div role="switch" aria-checked={s.automatic} tabIndex={0} className="nc-ai-skill-auto" data-tooltip="Let AI 비서 use this skill automatically when relevant" onClick={() => void setSkillAutomatic(s, !s.automatic)}>
            <span>{tx('Use automatically')}</span>
            <span className={`nc-ai-switch ${s.automatic ? 'on' : ''}`} aria-hidden><span /></span>
          </div>
        )}
        {tab === 'enabled' ? (
          <button type="button" className="nc-btn outline" disabled={busy} data-tooltip={tx('After uninstalling, this skill disappears from chat and automatic runs.')} onClick={() => void toggle(false)}>{tx('Uninstall')}</button>
        ) : (
          <button type="button" className="nc-btn primary" disabled={busy} onClick={() => void toggle(true)}>{tx('Enable for my account')}</button>
        )}
        {(s.pageId || localSkills) && (
          <div role="button" aria-label={tx('More actions')} className="nc-ai-icon-btn" onClick={(e) => more(e.currentTarget)}><Icon name="ellipsisSmall" size={16} /></div>
        )}
      </div>
    </div>
  );
}

export function SkillsTab({ seg, setSeg }: { seg: 'enabled' | 'discover'; setSeg: (v: 'enabled' | 'discover') => void }) {
  const { enabled, discover, loading, error } = useSkills();
  useEffect(() => {
    void useSkills.getState().load(true);
  }, []);
  const list = seg === 'enabled' ? enabled : discover;
  return (
    <div className="nc-lib-skills">
      <div className="nc-lib-seg" role="tablist" aria-label={tx('Skill library sections')}>
        <div role="tab" aria-selected={seg === 'enabled'} className={`nc-lib-seg-item ${seg === 'enabled' ? 'selected' : ''}`} data-tooltip={tx('Skills you or others have created that you can use now.')} onClick={() => setSeg('enabled')}>{tx('Enabled for my account')}</div>
        <div role="tab" aria-selected={seg === 'discover'} className={`nc-lib-seg-item ${seg === 'discover' ? 'selected' : ''}`} data-tooltip={tx('Browse skills created by others. Click Enable for my account to use.')} onClick={() => setSeg('discover')}>{tx('Discover')}</div>
      </div>
      {error && !list.length ? (
        <div className="nc-lib-empty skills">
          <div className="nc-lib-empty-text">{tx('Could not load skills.')}</div>
          <div role="button" className="nc-lib-linkbtn" onClick={() => void useSkills.getState().load(true)}>{tx('Retry')}</div>
        </div>
      ) : list.length ? (
        <div className="nc-ai-skill-list" role="list">
          {list.map((s) => <SkillRow key={s.id} s={s} tab={seg} />)}
        </div>
      ) : !loading ? (
        <div className="nc-lib-empty skills">
          <div className="nc-lib-empty-icon"><Icon name="libPaperSkill" size={32} /></div>
          <div className="nc-lib-empty-text">
            {seg === 'enabled'
              ? tx('Type ‘/’ in chat to use enabled skills, or let the agent choose them when useful. Create your first skill to begin, or find skills others have created in the Discover tab.')
              : 'Skills your teammates create will appear here.'}
          </div>
          {seg === 'enabled' && (
            <div role="button" className="nc-lib-linkbtn" onClick={() => void createNewSkill()}>
              <Icon name="plus" size={16} />
              <span>{tx('New skill')}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
