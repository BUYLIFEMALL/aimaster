'use client';
import { useEffect, useState } from 'react';
import { APP_VERSION } from '../lib/version';

// The label in this tab is whatever was loaded when the tab opened, and files in the extension folder change before Edge reloads them.
// So the server is asked for the latest version, and the running extension is asked for its own.
function askExtension() {
  return new Promise<string | null>(resolve => {
    const requestId = crypto.randomUUID();
    const done = (value: string | null) => { clearTimeout(timer); window.removeEventListener('message', listener); resolve(value); };
    const listener = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'bnc-reader-extension' || event.data.requestId !== requestId) return;
      const version = event.data.result?.data?.version;
      done(typeof version === 'string' ? version : null);
    };
    const timer = setTimeout(() => done(null), 1500);
    window.addEventListener('message', listener);
    window.postMessage({ source: 'bnc-reader-app', type: 'version', requestId }, location.origin);
  });
}

export function VersionStatus() {
  const [latest, setLatest] = useState<string | null>(null), [extension, setExtension] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let alive = true, last = 0;
    const check = async () => {
      if (Date.now() - last < 60000) return;
      last = Date.now();
      const [server, running] = await Promise.all([
        fetch('/api/extension/version', { cache: 'no-store' }).then(r => r.json()).then(v => typeof v.version === 'string' ? v.version : null).catch(() => null),
        askExtension(),
      ]);
      if (alive) { setLatest(server); setExtension(running); }
    };
    void check();
    window.addEventListener('focus', check);
    return () => { alive = false; window.removeEventListener('focus', check); };
  }, []);
  const target = latest ?? APP_VERSION;
  return <div className="bnc-versions">
    <p><span>메인프로그램</span><b>{APP_VERSION}</b></p>
    {latest && latest !== APP_VERSION && <button type="button" onClick={() => location.reload()}>새 버전 {latest} · 새로고침</button>}
    <p className={`ext${extension === null || (extension && extension !== target) ? ' warn' : ''}`}><span>확장프로그램</span><b>{extension === undefined ? '확인 중' : extension ?? '확인 안 됨'}</b></p>
    {extension === null && <small>설치 여부를 확인하고, 설치했다면 이 탭을 새로고침해 주세요.</small>}
    {extension && extension !== target && <small>최신은 {target}입니다. 새 ZIP을 덮어쓰고 edge://extensions에서 「다시 로드」를 눌러 주세요.</small>}
  </div>;
}
