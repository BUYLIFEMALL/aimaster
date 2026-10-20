// Local fixture only: simulated member authentication, actual UI/API code and local Postgres RLS.
// No production credentials, real member sessions, external APIs or production DB connections.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { actors, clientFor, createDb, loadTs, root } from './customPromptDb.mjs';

export async function startCustomPromptPreview(port = 0) {
  const { db } = await createDb();
  const { createCustomPromptHandlers } = loadTs('lib/prompts/customPromptHandlers.ts');
  const cssDir = path.join(root, '.next/static/css');
  if (!fs.existsSync(cssDir)) throw Error('Run npm run build before the browser fixture');
  const css = fs.readdirSync(cssDir).filter(file => file.endsWith('.css')).map(file => fs.readFileSync(path.join(cssDir, file), 'utf8')).join('\n');
  const bundle = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import Prompts from './app/(dashboard)/prompts/page';
      import Dashboard from './app/(dashboard)/dashboard/page';
      import {Sidebar} from './components/layout/Sidebar';
      const name=document.cookie.includes('fixture_member=B')?'B':'A';
      createRoot(document.getElementById('root')).render(<><div style={{background:'#064e3b',color:'white',padding:8,fontSize:12}}>로컬 가상 회원 {name} 검수 — 운영 데이터·실제 로그인 아님</div><div className="flex min-h-screen flex-col md:flex-row bg-[#09090b]"><Sidebar userEmail={'가상 회원 '+name}/><main className="min-w-0 flex-1 p-4 md:p-8">{location.pathname==='/dashboard'?<Dashboard/>:<Prompts/>}</main></div></>);`,
      resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic',
    tsconfig: path.join(root, 'tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'silent',
    plugins: [{ name: 'local-next-fixture', setup(builder) {
      builder.onResolve({ filter: /^next\/(link|navigation)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onResolve({ filter: /^@\/lib\/actions\/auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'tsx', resolveDir: root, contents:
        args.path === 'auth' ? 'export async function signOutAction(){}' :
        args.path === 'next/navigation' ? `export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);` :
        `import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}`,
      }));
    }}],
  });
  let forbiddenCalls = 0;
  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url, 'http://127.0.0.1');
      let response;
      if (url.pathname === '/app.js') response = new Response(bundle.outputFiles[0].contents, { headers: { 'Content-Type': 'text/javascript' } });
      else if (url.pathname === '/app.css') response = new Response(css, { headers: { 'Content-Type': 'text/css' } });
      else if (url.pathname === '/api/prompts') {
        let rows = (await db.query('SELECT * FROM public.style_preset_prompts ORDER BY display_order,style_id')).rows;
        const style = url.searchParams.get('style_id'); if (style) rows = rows.filter(row => row.style_id === style);
        response = Response.json({ prompts: rows, canEdit: false });
      } else if (url.pathname === '/api/prompts/custom') {
        const userId = incoming.headers.cookie?.includes('fixture_member=B') ? actors.b : actors.a;
        const handlers = createCustomPromptHandlers({ authorize: async () => ({ user: { id: userId } }), client: async () => clientFor(db, userId) });
        const chunks = []; for await (const chunk of incoming) chunks.push(chunk);
        const method = incoming.method ?? 'GET';
        const body = Buffer.concat(chunks);
        const request = new Request(url, { method, headers: { 'Content-Type': 'application/json' }, ...(body.length ? { body } : {}) });
        response = handlers[method] ? await handlers[method](request) : new Response('', { status: 405 });
      } else if (url.pathname === '/api/user-keys') response = Response.json({ registeredProviders: [] });
      else if (url.pathname === '/api/generate' || url.pathname === '/api/enhance-prompt') {
        forbiddenCalls++; response = Response.json({ error: 'Paid calls are forbidden in this local fixture' }, { status: 418 });
      } else if (url.pathname === '/fixture-state') response = Response.json({
        defaults: (await db.query('SELECT count(*)::int AS count FROM public.style_preset_prompts')).rows[0].count,
        personal: (await db.query('SELECT count(*)::int AS count FROM public.ais_user_style_prompts')).rows[0].count, forbiddenCalls,
      });
      else if (url.pathname === '/prompts' || url.pathname === '/dashboard') response = new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>로컬 가상회원 검수</title><link rel="stylesheet" href="/app.css"></head><body class="bg-zinc-950 text-zinc-100"><div id="root"></div><script src="/app.js"></script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
      else response = new Response('', { status: 404 });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) { outgoing.writeHead(500); outgoing.end('Local fixture error: ' + error.message); }
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  return { url: 'http://127.0.0.1:' + server.address().port, db, close: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await db.close(); } };
}
