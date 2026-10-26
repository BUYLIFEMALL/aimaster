'use client';
import { useRef, useState } from 'react';
import { APP_VERSION } from '@/lib/version';
type Device = { id: string; blog_id: string; device_name: string; revoked_at: string | null; expires_at: string };
type Material = { id: string; title: string; body?: string; blog_id: string; post_id: string; expires_at: string };
async function member(operation: string, payload: Record<string, unknown> = {}) {
  const r = await fetch('/api/reader/member', { method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operation, payload }) });
  const json = await r.json(); if (!r.ok) throw new Error(json.error || '연결 결과를 확인해 주세요.'); return json;
}
function bridge(type: 'status' | 'connect', code?: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const done = (error?: Error, data?: Record<string, unknown>) => {
      window.removeEventListener('message', listener); clearTimeout(timer);
      if (error) reject(error); else resolve(data ?? {});
    };
    const listener = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'bnc-reader-extension' || event.data.requestId !== requestId) return;
      const result = event.data.result;
      if (!result?.ok) done(new Error(result?.error || '확장 연결을 확인해 주세요.')); else done(undefined, result.data);
    };
    const timer = setTimeout(() => done(new Error('확장 응답을 확인하지 못했습니다. 설치·새로고침 후 확장 창의 연결 상태를 확인해 주세요.')), 10000);
    window.addEventListener('message', listener);
    window.postMessage({ source: 'bnc-reader-app', type, requestId, ...(code ? { code } : {}) }, location.origin);
  });
}
export default function ReaderConnection() {
  const actionLock = useRef(false);
  const [blogId, setBlogId] = useState(''), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [code, setCode] = useState('');
  const [devices, setDevices] = useState<Device[]>([]), [materials, setMaterials] = useState<Material[]>([]), [selected, setSelected] = useState<Material | null>(null);
  async function run(work: () => Promise<void>) {
    if (actionLock.current) return; actionLock.current = true; setBusy(true); setMessage('확인 중…');
    try { await work(); } catch (e) { setMessage(e instanceof Error ? e.message : '결과를 확인하지 못했습니다.'); }
    finally { actionLock.current = false; setBusy(false); }
  }
  async function load() {
    const results = await Promise.all([member('devices'), member('materials')]);
    setDevices(results[0].data); setMaterials(results[1].data);
  }
  return <main className="reader"><header><small>AI 블로그 이웃 소통 · {APP_VERSION}</small><h1>본인 글 1개부터 연결하기</h1>
    <p>로그인한 회원 계정으로 확장을 연결하고, 네이버에서 직접 선택한 글을 받아 확인합니다.</p></header>
    <section><h2>1. 확장 설치</h2><a className="primary" href="/downloads/blog-neighbor-care-extension-latest.zip">확장 ZIP 받기</a>
      <p>ZIP을 풀고 Edge 확장 관리에서 개발자 모드를 켠 뒤 ‘압축 풀린 확장 로드’로 폴더를 선택하세요. 설치 후 이 화면을 새로고침하세요.</p></section>
    <section><h2>2. 내 회원 계정과 블로그 연결</h2><label htmlFor="blog-id">본인 블로그 아이디</label>
      <input id="blog-id" value={blogId} onChange={e => setBlogId(e.target.value)} placeholder="예: buylifemall" maxLength={50} autoComplete="off" spellCheck={false} />
      <label className="check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />본인 블로그이며, 직접 선택한 글의 제목·본문을 프로그램에 전달하는 데 동의합니다.</label>
      <button className="primary" disabled={busy || !confirmed || !/^[a-z0-9_-]{1,50}$/i.test(blogId)} onClick={() => run(async () => {
        setCode(''); await bridge('status'); const result = await member('pair', { blog_id: blogId.toLowerCase(), owner_confirmed: true });
        setCode(result.code); const connected = await bridge('connect', result.code); setCode(''); await load();
        setMessage(`블로그 ${String(connected.blogId)}와 연결했습니다. 이제 네이버에서 본인 글 1개를 열어 주세요.`);
      })}>이 회원 계정으로 확장 연결</button>
      {code && <p>연결 결과가 불확실하면 확장 창에서 확인하세요. 필요하면 10분 안에 이 번호로 연결할 수 있습니다: <code>{code}</code></p>}
      <p>이 연결은 직접 읽기 전용입니다. 네이버 로그인·소유권이나 자동 게시 권한을 인증하는 절차는 아닙니다.</p></section>
    <section><h2>3. 글 읽고 전달하기</h2><p>네이버에서 본인 글 1개를 열고 확장 아이콘을 누르세요. ‘현재 글 1개 읽기’ → 본문 확인 → ‘프로그램으로 보내기’ 순서입니다. 목록·편집기에서는 읽지 않습니다.</p>
      <button disabled={busy} onClick={() => run(async () => { await load(); setMessage('현재 연결과 받은 글 목록을 확인했습니다.'); })}>연결·받은 글 새로고침</button>
      <p>본문은 최초 읽기 요청부터 30일 보관합니다. 이미지·첨부파일·댓글은 가져오지 않습니다.</p>
      <h3>연결된 기기</h3>{devices.length === 0 && <p>목록을 새로고침하면 확인할 수 있습니다.</p>}
      <ul>{devices.map(d => <li key={d.id}>{d.device_name} · {d.blog_id} · {d.revoked_at ? '해제됨' : `만료 ${new Date(d.expires_at).toLocaleString('ko-KR')}`}
        {!d.revoked_at && <button disabled={busy} onClick={() => run(async () => { await member('revoke', { device_id: d.id }); await load(); setMessage('해당 기기의 읽기 연결을 해제했습니다. 받은 글은 기존 만료일까지 유지됩니다.'); })}>이 기기 해제</button>}</li>)}</ul>
      <h3>받은 글</h3>{materials.length === 0 && <p>받은 글이 없습니다. 확장에서 전달 후 새로고침하세요.</p>}
      <ul>{materials.map(m => <li key={m.id}><button disabled={busy} onClick={() => run(async () => { const r = await member('material', { id: m.id }); setSelected(r.data); setMessage('받은 본문을 열었습니다.'); })}>{m.title}</button></li>)}</ul>
      {selected && <article><h3>{selected.title}</h3><a href={`https://blog.naver.com/${selected.blog_id}/${selected.post_id}`} target="_blank" rel="noreferrer">원문 열기</a>
        <p>보관 만료: {new Date(selected.expires_at).toLocaleString('ko-KR')}</p><pre>{selected.body}</pre></article>}</section>
    <p role="status" aria-live="polite">{message}</p>
    <style>{`.reader{max-width:900px;margin:40px auto;padding:0 20px 60px;line-height:1.7}.reader header{background:#203447;color:white;padding:28px;border-radius:18px}.reader h1{font-size:28px}.reader section{margin:22px 0;padding:26px;background:white;border:1px solid #d6e0e8;border-radius:14px}.reader h2{font-size:21px}.reader input:not([type=checkbox]){display:block;width:100%;max-width:400px;padding:12px;border:1px solid #acbecb;border-radius:8px;font:inherit}.reader button,.reader a.primary{display:inline-block;padding:11px 18px;margin:10px 10px 10px 0;border:1px solid #aebfca;border-radius:9px;background:white;color:#203447;cursor:pointer;font:inherit;text-decoration:none}.reader .primary{background:linear-gradient(#21b276,#138554);color:white;border:0;box-shadow:0 5px 0 #0b5c39;transition:transform .15s}.reader .primary:hover{transform:translateY(-1.5px)}.reader .primary:active{transform:translateY(4px);box-shadow:0 1px 0 #0b5c39}.reader button:disabled{opacity:.5;cursor:default}.reader :focus-visible{outline:3px solid #f4a238;outline-offset:3px}.reader .check{display:flex;gap:9px;align-items:start;margin:16px 0}.reader .check input{margin-top:8px}.reader pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:20px;background:#f4f7fa}.reader code{overflow-wrap:anywhere}.reader li{margin:10px 0}@media(max-width:600px){.reader{margin:18px auto;padding:0 12px 40px}.reader section{padding:18px}.reader h1{font-size:24px}}`}</style>
  </main>;
}
