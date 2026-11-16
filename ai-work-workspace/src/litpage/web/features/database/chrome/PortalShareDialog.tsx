// PLAN-20261117-01 E2 7-3(2026-11-17) 손님 포털 설정 창 — 행 메뉴 「손님에게 진행 상황 공유」.
// 보일 속성 고르기(서버가 허용한 종류만 목록에 옴)·기간·주소 복사·새 주소·끄기. 권한·정책 판정은 모두 서버(src/server/portal.ts).
// 화면 스위치 PORTAL_UI: 서버 PORTAL_ENABLED와 함께 켜는 배포에서만 true(꺼져 있으면 메뉴 항목이 보이지 않음).
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.ts';
import { openOverlay, type Anchor } from '../../../components/overlay.tsx';
import { useUI } from '../../../lib/store/ui.ts';
import { tx } from '../../shell/i18n.ts';

export const PORTAL_UI = false;

type Info = { exists: boolean; enabled: boolean; expiresTime: number | null; props: string[]; choices: { id: string; name: string; type: string }[]; token?: string | null };

export function openPortalShareDialog(rowId: string, anchor: Anchor) {
  openOverlay((close) => <PortalShare rowId={rowId} close={close} />, { anchor, placement: 'bottom-start' });
}

function PortalShare({ rowId, close }: { rowId: string; close: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [days, setDays] = useState(90);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('portalGet', { rowId })
      .then((r: Info) => {
        setInfo(r);
        setPicked(r.props);
      })
      .catch((e: Error) => setError(e?.message || tx('Could not open sharing settings.')));
  }, [rowId]);

  const save = async (rotate: boolean) => {
    setBusy(true);
    setError('');
    try {
      const r: Info = await api('portalSave', { rowId, props: picked, days, rotate });
      setInfo(r);
      if (r.token) setLink(`${location.origin}/portal/${r.token}`);
    } catch (e) {
      setError((e as Error)?.message || tx('Could not save.'));
    } finally {
      setBusy(false);
    }
  };
  const off = async () => {
    setBusy(true);
    try {
      setInfo(await api('portalOff', { rowId }));
      setLink('');
    } catch (e) {
      setError((e as Error)?.message || tx('Could not save.'));
    } finally {
      setBusy(false);
    }
  };
  const copy = () => {
    void navigator.clipboard?.writeText(link);
    useUI.getState().toast(tx('Link copied'));
  };

  return (
    <div className="nc-menu" style={{ width: 340, padding: 14, display: 'grid', gap: 10 }} role="dialog" aria-label={tx('Share progress with a customer')}>
      <div style={{ fontWeight: 600 }}>📋 {tx('Share progress with a customer')}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--nc-text-secondary, #787774)' }}>
        {tx('Anyone who has this link can see the properties you choose, without signing in. Send it only to the customer.')}
      </div>
      {error && <div style={{ fontSize: 12, color: '#d44c47' }}>{error}</div>}
      {info && (
        <>
          <div style={{ display: 'grid', gap: 4, maxHeight: 200, overflow: 'auto' }}>
            {info.choices.map((c) => (
              <label key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" checked={picked.includes(c.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))} />
                {c.name || tx('Untitled')}
              </label>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--nc-text-secondary, #787774)' }}>{tx('Relations, people, files, formulas, email and phone cannot be shared here.')}</div>
          <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
            {tx('Open for')}
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 30, 90, 180, 365].map((d) => <option key={d} value={d}>{d}{tx(' days')}</option>)}
            </select>
          </label>
          {link && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input readOnly value={link} style={{ flex: 1, fontSize: 12 }} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={copy}>{tx('Copy')}</button>
            </div>
          )}
          {info.enabled && !link && <div style={{ fontSize: 12 }}>{tx('Sharing is on. For security the link is shown only once — make a new link if you lost it.')}</div>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy || !picked.length} onClick={() => void save(false)}>{info.enabled ? tx('Save') : tx('Turn on and make link')}</button>
            {info.enabled && <button type="button" disabled={busy} onClick={() => void save(true)}>{tx('Make a new link')}</button>}
            {info.enabled && <button type="button" disabled={busy} onClick={() => void off()}>{tx('Turn off')}</button>}
            <button type="button" onClick={close}>{tx('Close')}</button>
          </div>
        </>
      )}
    </div>
  );
}
