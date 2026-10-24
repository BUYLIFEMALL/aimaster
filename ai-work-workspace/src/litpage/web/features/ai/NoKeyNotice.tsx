// 이식판(U3): 원본은 「서버 .env.local에 키를 넣으라」는 개발자용 안내였다. AIMaster는 회원 본인 키만 쓰므로
// 「API키등록·플랫폼연동」 화면(/settings/keys)으로 안내한다. 키는 공용 표 user_api_keys에 저장돼 다른 프로그램과 함께 쓴다.
import { Icon } from '../../components/Icon.tsx';
import { openOverlay, PopoverSurface } from '../../components/overlay.tsx';
import { useAiStatus } from './aiApi.ts';
import { t } from '../shell/i18n.ts';

export const KEY_SETTINGS_URL = '/settings/keys';

export function openKeyHelp(anchor: HTMLElement) {
  openOverlay((close) => <KeyHelp close={close} />, { anchor, placement: 'bottom-start', offset: 6 });
}

function KeyHelp({ close }: { close: () => void }) {
  const configured = useAiStatus((s) => s.configured);
  return (
    <PopoverSurface width={340}>
      <div className="nc-ai-keyhelp">
        <div className="nc-ai-keyhelp-title">{t('aww.ai.key_title', 'AI 비서를 쓰려면 본인 API 키가 필요합니다')}</div>
        <p>{t('aww.ai.key_desc', 'OpenAI 또는 Claude(Anthropic) API 키를 「API키등록·플랫폼연동」에 한 번 등록하면 AI 질문·글쓰기·AI 블록을 쓸 수 있습니다. 사용료는 본인 키로 청구됩니다.')}</p>
        <p className="nc-ai-keyhelp-sub">{t('aww.ai.key_shared', '다른 AIMaster 프로그램에서 이미 등록한 키가 있으면 그대로 쓰입니다.')}</p>
        <div className="nc-ai-keyhelp-actions">
          {configured && <span className="nc-ai-keyhelp-ok"><Icon name="check" size={14} /> {t('aww.ai.key_connected', '연결됨')}</span>}
          <button className="nc-btn outline" onClick={() => { void useAiStatus.getState().refresh(); }}>
            {t('aww.ai.key_recheck', '다시 확인')}
          </button>
          <button className="nc-btn primary" onClick={() => { close(); window.open(KEY_SETTINGS_URL, '_blank', 'noopener'); }}>
            {t('aww.ai.key_open', 'API키등록·플랫폼연동 열기')}
          </button>
        </div>
      </div>
    </PopoverSurface>
  );
}

export function NoKeyNotice({ compact }: { compact?: boolean }) {
  return (
    <div className={`nc-ai-nokey ${compact ? 'compact' : ''}`} role="status">
      <Icon name="info" size={14} style={{ color: 'var(--lp-blue-icon-accent)', flexShrink: 0 }} />
      <span>{t('aww.ai.no_key', '본인 OpenAI 또는 Claude API 키를 등록하면 AI 비서를 쓸 수 있습니다.')}</span>
      <span role="button" className="nc-ai-banner-link" onMouseDown={(e) => e.preventDefault()} onClick={(e) => openKeyHelp(e.currentTarget)}>{t('aww.ai.how_to_connect', '등록 방법')}</span>
    </div>
  );
}
