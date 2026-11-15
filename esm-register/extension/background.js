// AIMaster · AI G마켓·옥션 상품 자동등록기 확장 (v1.01)
// 흐름: 웹에서 연결(토큰은 이 확장에만) → 30초마다 작업 받기 → ESM+ 「상품등록 2.0」(https://item.esmplus.com/goods/new) 탭을 열어
//       단계 목록을 위에서부터 채움 → 결과 보고. 화면 분석: docs/ESM_FORM_ANALYSIS_20261115.md
// ESM+는 React 앱이라 입력칸 id가 매번 바뀐다 → 「구역 제목(h2/h3) → 칸 이름 글자 → 그 줄의 입력칸·버튼」으로 찾는다.
// 안전: 칸 하나라도 실패하면 「임시저장/등록하기」는 누르지 않는다. 결과가 불확실하면 다시 등록하지 않는다(작업은 서버가 한 번만 넘김).
// 회원 비밀번호·로그인은 다루지 않는다 — 로그인이 풀려 있으면 멈추고 알린다.

const API = 'https://esm-register.buylife.xyz';
const CREATE_URL = 'https://item.esmplus.com/goods/new';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const human = () => wait(350 + Math.floor(Math.random() * 550)); // 사람처럼 칸 사이 간격(봇 탐지 회피 지침 §20)
let busy = false;

async function getToken() { return (await chrome.storage.local.get('token')).token || null; }

async function api(path, body, method = 'POST') {
  const token = await getToken();
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Ext-Version': chrome.runtime.getManifest().version_name, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) await chrome.storage.local.remove(['token', 'accountEmail']);
  if (!res.ok) throw new Error(json.error || `서버 오류 ${res.status}`);
  return json;
}

async function setStatus(text) { await chrome.storage.local.set({ lastStatus: { text, at: Date.now() } }); }

// ── ESM+ 화면 안에서 실행되는 명령(이 함수 전체가 탭에 들어간다 — 바깥 변수 사용 금지) ──
async function esmCommand(cmd, a) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const visible = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const headTitle = (h) => norm(h.textContent).replace(/필수|도움말|Open/g, '').replace(/\s+/g, '');
  /** 구역: 제목 h2/h3의 글자(필수·도움말 제외)가 같은 구역 상자 */
  const sectionOf = (title) => {
    const want = String(title).replace(/\s+/g, '');
    const h = [...document.querySelectorAll('h2,h3')].find((x) => headTitle(x) === want);
    return h ? { h, box: h.parentElement?.parentElement || h.parentElement } : null;
  };
  /** 접힌 구역이면 펼친다(입력칸·버튼이 제목줄 밖에 하나도 안 보이면 「Open」) */
  const expand = async (s) => {
    const controls = [...s.box.querySelectorAll('input,textarea,button')].filter((e) => visible(e) && !s.h.parentElement.contains(e));
    if (controls.length) return;
    const open = [...s.h.parentElement.querySelectorAll('button')].find((b) => norm(b.textContent) === 'Open');
    if (open) { open.click(); await sleep(700); }
  };
  const isHelp = (b) => /도움말/.test(norm(b.textContent)) && norm(b.textContent).length <= 4;
  /** 구역 안에서 칸 이름 글자 요소(제목줄 밖) */
  const labelOf = (s, label) => {
    const want = norm(label);
    const all = [...s.box.querySelectorAll('*')].filter((e) => !s.h.parentElement.contains(e) && visible(e));
    return all.find((e) => e.children.length === 0 && norm(e.textContent) === want)
      || all.find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && norm(n.textContent) === want));
  };
  /** 칸 이름에서 위로 올라가며 입력칸·버튼이 든 가장 작은 줄 */
  const rowOf = (s, label, need = 'input,textarea,button') => {
    const l = labelOf(s, label);
    if (!l) return null;
    for (let e = l; e && e !== s.box.parentElement; e = e.parentElement) {
      const c = [...e.querySelectorAll(need)].filter((x) => visible(x) && x !== l && !l.contains(x) && !(x.tagName === 'BUTTON' && isHelp(x)));
      if (c.length) return e;
    }
    return null;
  };
  const setValue = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };
  const clickText = (scope, text, sel = 'button,label,[role=radio],[role=option]') => {
    const want = norm(text);
    const t = [...scope.querySelectorAll(sel)].find((e) => visible(e) && norm(e.textContent) === want);
    if (!t) return false;
    t.click();
    return true;
  };
  const fileFrom = (f) => {
    const bin = atob(f.data); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new File([u], f.name, { type: f.mime || 'image/jpeg' });
  };
  const putFiles = (input, files) => {
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(fileFrom(f)));
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const need = (s, what) => { if (!s) throw new Error(`「${what}」 구역을 찾지 못했습니다.`); return s; };

  try {
    if (cmd === 'ready') {
      if (/signin|login/i.test(location.href)) return { ok: false, login: true };
      return { ok: !!sectionOf('상품명') && !!sectionOf('카테고리') };
    }

    if (cmd === 'sites') {
      const s = need(sectionOf('판매사이트'), '판매사이트');
      for (const [label, on] of [['Gmarket', a.value !== 'auction'], ['Auction', a.value !== 'gmarket']]) {
        const l = labelOf(s, label);
        const box = l && (l.closest('label,div')?.querySelector('input[type=checkbox]') || l.parentElement?.querySelector('input[type=checkbox]'));
        if (!box) return { ok: false, error: `판매사이트 「${label}」 체크 상자를 찾지 못했습니다.` };
        if (box.checked !== on) { box.click(); await sleep(300); }
        if (box.checked !== on) return { ok: false, error: `판매사이트 「${label}」 체크가 바뀌지 않았습니다.` };
      }
      return { ok: true };
    }

    if (cmd === 'type') {
      const s = need(sectionOf(a.section), a.section); await expand(s);
      const row = rowOf(s, a.target, 'input,textarea');
      const el = row && [...row.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea')].find((x) => visible(x) && !x.readOnly && !x.disabled);
      if (!el) return { ok: false, error: `「${a.target}」 입력칸을 찾지 못했습니다.` };
      el.focus(); setValue(el, a.value); await sleep(250);
      if (norm(el.value).replace(/,/g, '') !== norm(a.value).replace(/,/g, '')) return { ok: false, error: `「${a.target}」에 값이 들어가지 않았습니다(지금: ${el.value}).` };
      return { ok: true };
    }

    if (cmd === 'choose') {
      const s = sectionOf(a.section);
      if (!s) return a.optional ? { ok: true, skipped: true } : { ok: false, error: `「${a.section}」 구역을 찾지 못했습니다.` };
      await expand(s);
      const row = rowOf(s, a.target);
      if (!row) return a.optional ? { ok: true, skipped: true } : { ok: false, error: `「${a.target}」 줄을 찾지 못했습니다.` };
      if (!clickText(row, a.value)) return { ok: false, error: `「${a.target}」에서 「${a.value}」 버튼을 찾지 못했습니다.` };
      await sleep(400);
      return { ok: true };
    }

    if (cmd === 'list_pick') {
      const s = need(sectionOf(a.section), a.section); await expand(s);
      const row = rowOf(s, a.target, 'button');
      if (!row) return { ok: false, error: `「${a.target}」 줄을 찾지 못했습니다.` };
      if (norm(row.textContent).includes(norm(a.value))) return { ok: true, already: true };
      const btns = [...row.querySelectorAll('button')].filter((b) => visible(b) && !isHelp(b));
      const trigger = btns.find((b) => norm(b.textContent) === norm(a.target)) || btns.find((b) => !/신규|템플릿/.test(norm(b.textContent))) || btns[0];
      if (!trigger) return { ok: false, error: `「${a.target}」 고르기 버튼을 찾지 못했습니다.` };
      trigger.click();
      let opt = null;
      for (let i = 0; i < 20 && !opt; i++) {
        await sleep(250);
        opt = [...document.querySelectorAll('[role=option],[role=listbox] li,[role=dialog] li,[role=dialog] button')].find((o) => visible(o) && norm(o.textContent).includes(norm(a.value)));
      }
      if (!opt) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return { ok: false, error: `「${a.target}」 목록에 「${a.value}」가 없습니다(ESM+에 있는 이름 그대로인지 확인해 주세요).` }; }
      opt.click(); await sleep(600);
      return { ok: true };
    }

    if (cmd === 'category') {
      const s = need(sectionOf('카테고리'), '카테고리'); await expand(s);
      const input = s.box.querySelector('input[placeholder="카테고리명 입력"]');
      if (!input) return { ok: false, error: '카테고리 검색칸을 찾지 못했습니다.' };
      const tryWord = async (word) => {
        input.focus(); setValue(input, word); await sleep(200);
        clickText(input.closest('div')?.parentElement || s.box, '검색', 'button');
        for (let i = 0; i < 20; i++) {
          await sleep(300);
          const opts = [...s.box.querySelectorAll('[role=option]')].filter(visible);
          if (opts.length) return opts;
        }
        return [];
      };
      const parts = String(a.path || '').split('>').map(norm).filter(Boolean);
      const words = [...new Set([a.value, norm(a.value).split(' ').pop(), ...parts.slice().reverse()].map(norm).filter(Boolean))].slice(0, 5);
      for (const w of words) {
        const opts = await tryWord(w);
        if (!opts.length) continue;
        const score = (o) => parts.filter((p) => norm(o.textContent).includes(p)).length;
        const best = opts.slice().sort((x, y) => score(y) - score(x))[0];
        best.click(); await sleep(1500);
        const text = norm(s.box.innerText);
        if (!/선택한 카테고리/.test(text)) return { ok: false, error: '카테고리를 골랐지만 화면에 「선택한 카테고리」가 보이지 않습니다.' };
        const fee = [...text.matchAll(/(G마켓|A옥션) 노출[^%]*?기본이용료 ?([\d.]+%)/g)].map((m) => `${m[1] === 'A옥션' ? '옥션' : 'G마켓'} ${m[2]}`).join(', ');
        const picked = (text.match(/선택한 카테고리 ?:?([^재]*?)재선택/) || [])[1];
        return { ok: true, fee: fee || null, picked: picked ? norm(picked) : norm(best.textContent) };
      }
      return { ok: false, error: `카테고리 검색 결과가 없습니다(검색어: ${words.join(', ')}).` };
    }

    if (cmd === 'images') {
      const s = need(sectionOf('상품이미지'), '상품이미지'); await expand(s);
      const input = s.box.querySelector('input[type=file]');
      if (!input) return { ok: false, error: '상품이미지 파일 칸을 찾지 못했습니다.' };
      const before = (norm(s.box.innerText).match(/\((\d+)\s*\/\s*15\)/) || [])[1];
      if (input.multiple) putFiles(input, a.files);
      else for (const f of a.files) { putFiles(input, [f]); await sleep(1500); }
      for (let i = 0; i < 40; i++) {
        await sleep(500);
        const n = Number((norm(s.box.innerText).match(/\((\d+)\s*\/\s*15\)/) || [])[1] || 0);
        if (n >= a.files.length) return { ok: true, count: n };
      }
      return { ok: false, error: `상품이미지가 다 올라가지 않았습니다(처음 ${before ?? '?'}장, 보낸 ${a.files.length}장).` };
    }

    if (cmd === 'detail_image') {
      const s = need(sectionOf('상품 상세설명'), '상품 상세설명'); await expand(s);
      if (!clickText(s.box, '이미지 업로드', 'button')) return { ok: false, error: '상세설명 「이미지 업로드」 탭을 찾지 못했습니다.' };
      await sleep(700);
      const input = s.box.querySelector('input[type=file]');
      if (!input) return { ok: false, error: '상세설명 이미지 파일 칸을 찾지 못했습니다.' };
      putFiles(input, [a.file]);
      for (let i = 0; i < 60; i++) {
        await sleep(500);
        if (!/등록된 이미지가 없습니다/.test(s.box.innerText) && s.box.querySelector('img')) return { ok: true };
      }
      return { ok: false, error: '상세설명 이미지가 올라가지 않았습니다(60초).' };
    }

    if (cmd === 'option_simple') {
      const s = need(sectionOf('옵션'), '옵션'); await expand(s);
      const sel = rowOf(s, '선택형');
      if (!sel || !clickText(sel, '설정함')) return { ok: false, error: '옵션 「선택형 설정함」을 찾지 못했습니다(카테고리가 옵션을 막을 수 있음).' };
      await sleep(800);
      for (const [label, val] of [['옵션 입력방식', '직접 입력하기'], ['옵션 유형', '단독형'], ['옵션명 개수', '1개']]) {
        const r = rowOf(s, label);
        if (!r || !clickText(r, val)) return { ok: false, error: `옵션 「${label} → ${val}」을 찾지 못했습니다.` };
        await sleep(400);
      }
      const inRow = rowOf(s, '옵션 입력', 'input');
      const boxes = inRow ? [...inRow.querySelectorAll('input[type=text],input:not([type])')].filter(visible) : [];
      if (boxes.length < 2) return { ok: false, error: '옵션명·옵션값 입력칸을 찾지 못했습니다.' };
      setValue(boxes[0], a.option.name); await sleep(200);
      setValue(boxes[1], a.option.values.join(',')); await sleep(200);
      if (!clickText(s.box, '옵션 목록으로 적용', 'button')) return { ok: false, error: '「옵션 목록으로 적용」 버튼을 찾지 못했습니다.' };
      for (let i = 0; i < 12; i++) {
        await sleep(400);
        const n = Number((norm(s.box.innerText).match(/옵션 목록 (\d+)개/) || [])[1] || 0);
        if (n >= a.option.values.length) return { ok: true, count: n };
      }
      return { ok: false, error: '옵션 목록 개수가 맞지 않습니다.' };
    }

    if (cmd === 'notice_fill') {
      const s = need(sectionOf('상품정보 제공고시'), '상품정보 제공고시'); await expand(s);
      const b = [...s.box.querySelectorAll('button')].find((x) => visible(x) && /상품 상세설명 참조/.test(norm(x.textContent)));
      if (!b) return { ok: false, error: '고시 「상품 상세설명 참조로 전체 입력」 버튼을 찾지 못했습니다(상품군을 먼저 골라야 나타남).' };
      b.click(); await sleep(800);
      return { ok: true };
    }

    if (cmd === 'temp_count') {
      const b = [...document.querySelectorAll('button')].find((x) => visible(x) && /^\d+\s*개$/.test(norm(x.textContent)));
      return { ok: true, count: b ? Number(norm(b.textContent).replace(/\D/g, '')) : null };
    }

    if (cmd === 'submit') {
      const before = location.href;
      if (!clickText(document, a.target, 'button')) return { ok: false, error: `「${a.target}」 버튼을 찾지 못했습니다.` };
      for (let i = 0; i < 30; i++) {
        await sleep(500);
        const dlg = [...document.querySelectorAll('[role=dialog],[role=alertdialog],.modal,[class*=layer]')].filter(visible).map((d) => norm(d.innerText)).join(' | ');
        const nos = [...dlg.matchAll(/\b(\d{9,11})\b/g)].map((m) => m[1]);
        if (location.href !== before || /완료|등록되었|저장되었/.test(dlg)) return { ok: true, moved: location.href !== before, text: dlg.slice(0, 300), nos };
        if (/실패|오류|입력해|선택해|필수/.test(dlg)) return { ok: false, error: `ESM+ 안내: ${dlg.slice(0, 200)}` };
      }
      return { ok: true, uncertain: true };
    }

    if (cmd === 'health') {
      const missing = [], conditional = [];
      for (const t of a.targets.concat(a.conditional)) {
        const [sec, label] = t.split('|');
        let found;
        if (!sec) found = [...document.querySelectorAll('button')].some((b) => norm(b.textContent) === label);
        else { const s = sectionOf(sec); if (s) await expand(s); found = !!(s && (labelOf(s, label) || [...s.box.querySelectorAll('button')].some((b) => norm(b.textContent) === label))); }
        if (!found) (a.conditional.includes(t) ? conditional : missing).push(t);
      }
      return { ok: true, missing, conditional };
    }

    return { ok: false, error: `모르는 명령: ${cmd}` };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e).slice(0, 200) };
  }
}

async function run(tabId, cmd, args = {}) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: esmCommand, args: [cmd, args] });
  return res?.result || { ok: false, error: '화면에서 실행하지 못했습니다.' };
}

async function fetchAsset(a) {
  const res = await fetch(a.url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!res.ok) throw new Error('이미지를 받지 못했습니다.');
  const buf = new Uint8Array(await res.arrayBuffer());
  return { data: b64(buf), name: a.name, mime: res.headers.get('content-type') || 'image/jpeg' };
}
function b64(buf) {
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** 섹션 이미지를 가로 860px로 맞춰 세로로 이어 붙인 JPG 한 장(ESM+ 상세설명 「이미지 업로드」는 한 장만, 세로 최대 90,000px) */
async function mergeDetail(images) {
  const W = 860;
  const bms = [];
  for (const im of images) {
    const res = await fetch(im.url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
    if (!res.ok) throw new Error('상세 이미지를 받지 못했습니다.');
    bms.push(await createImageBitmap(await res.blob()));
  }
  const hs = bms.map((b) => Math.round(b.height * (W / b.width)));
  const H = hs.reduce((n, h) => n + h, 0);
  if (H > 32000) throw new Error(`상세 이미지를 이으면 세로 ${H}px라 브라우저가 한 장으로 만들 수 없습니다. 섹션 수를 줄여 주세요.`);
  const c = new OffscreenCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  let y = 0;
  bms.forEach((b, i) => { g.drawImage(b, 0, y, W, hs[i]); y += hs[i]; b.close(); });
  const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  return { data: b64(new Uint8Array(await blob.arrayBuffer())), name: 'detail.jpg', mime: 'image/jpeg', height: H };
}

/** 같은 ESM+ 등록 탭이 있으면 다시 쓰고, 없으면 지금 창에 새 탭(새 창 금지) */
async function openCreateTab() {
  const [existing] = await chrome.tabs.query({ url: 'https://item.esmplus.com/goods/*' });
  let tab;
  if (existing) tab = await chrome.tabs.update(existing.id, { url: CREATE_URL, active: true });
  else {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
    tab = await chrome.tabs.create({ url: CREATE_URL, active: true, ...(win ? { windowId: win.id } : {}) });
  }
  if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
  for (let s = 0; s < 45; s++) {
    await wait(1000);
    const now = await chrome.tabs.get(tab.id).catch(() => null);
    if (!now) throw new Error('ESM+ 탭이 닫혔습니다.');
    if (/signin|login/i.test(now.url || '') || /^https:\/\/(www\.)?esmplus\.com\/?($|\?|Member)/i.test(now.url || '')) throw new Error('ESM+ 로그인이 필요합니다. 크롬에서 ESM+에 로그인한 뒤 다시 보내 주세요.');
    const r = await run(tab.id, 'ready').catch(() => ({ ok: false }));
    if (r.login) throw new Error('ESM+ 로그인이 필요합니다. 크롬에서 ESM+에 로그인한 뒤 다시 보내 주세요.');
    if (r.ok) return tab.id;
  }
  throw new Error('ESM+ 「상품등록」 화면이 45초 안에 열리지 않았습니다.');
}

const CMD = { sites: 'sites', type: 'type', choose: 'choose', list_pick: 'list_pick', category: 'category', option_simple: 'option_simple', notice_fill: 'notice_fill' };

async function runJob(job) {
  await chrome.storage.local.set({ activeJob: job.id });
  const done = [], failed = [];
  let feeNote = null, tabId = null;
  const finish = (body) => api('/api/extension/finish', { jobId: job.id, ...body }).finally(() => chrome.storage.local.remove('activeJob'));
  try {
    await setStatus(`ESM+ 「상품등록」 여는 중…`);
    tabId = await openCreateTab();
    const steps = (job.steps || []).filter((s) => s.action !== 'submit');
    for (const s of steps) {
      await setStatus(`입력 중: ${s.label}`);
      let r;
      if (s.action === 'images') {
        const list = [job.mainImage, ...(job.extraImages || [])].filter(Boolean).slice(0, 15);
        if (!list.length) r = { ok: false, error: '대표 이미지를 받지 못했습니다.' };
        else r = await run(tabId, 'images', { files: await Promise.all(list.map(fetchAsset)) });
      } else if (s.action === 'detail_images') {
        if (!(job.detailImages || []).length) r = { ok: false, error: '상세 섹션 이미지가 없습니다.' };
        else r = await run(tabId, 'detail_image', { file: await mergeDetail(job.detailImages) });
      } else if (s.action === 'option_simple') {
        r = await run(tabId, 'option_simple', { option: JSON.parse(s.value) });
      } else if (CMD[s.action]) {
        // 영업허가증 칸은 카테고리에 따라 없다 → 없으면 건너뜀
        r = await run(tabId, CMD[s.action], { section: s.section, target: s.target, value: s.value, path: s.path, optional: s.key === 'license' });
      } else r = { ok: false, error: `이 확장이 모르는 동작(${s.action}) — 확장을 새 버전으로 바꿔 주세요.` };
      if (s.key === 'category' && r.ok) feeNote = [r.picked, r.fee].filter(Boolean).join(' · ').slice(0, 80) || null;
      if (r.ok) done.push(s.label);
      else { failed.push(`${s.label}: ${r.error}`); break; } // 순서가 중요해 첫 실패에서 멈춘다(뒤 칸은 앞 칸에 따라 생김)
      await human();
    }

    const submit = (job.steps || []).find((s) => s.action === 'submit');
    if (failed.length) {
      await finish({ status: 'failed', failedStep: failed[0].split(':')[0], error: `${failed.join(' / ')} · 채운 칸 ${done.length}개, 「임시저장/등록하기」는 누르지 않았습니다. ESM+ 탭에서 이어서 직접 채워 주세요.`, feeNote });
      await setStatus(`멈춤: ${failed[0]}`);
      return;
    }
    if (!submit) {
      await finish({ status: 'filled', error: `입력 완료(${done.length}칸). ESM+ 탭에서 확인한 뒤 「임시저장」 또는 「등록하기」를 직접 눌러 주세요.`, feeNote });
      await setStatus(`입력 완료 ${done.length}칸 — ESM+에서 확인 후 저장해 주세요.`);
      return;
    }
    if (submit.value === 'temp_save') {
      const before = (await run(tabId, 'temp_count')).count;
      const r = await run(tabId, 'submit', { target: '임시저장' });
      await wait(1500);
      const after = (await run(tabId, 'temp_count')).count;
      const okSaved = r.ok && before != null && after != null && after > before;
      await finish(okSaved
        ? { status: 'temp_saved', error: `임시저장 ${before}→${after}건`, feeNote }
        : { status: 'failed', failedStep: '임시저장', error: r.ok ? `임시저장을 눌렀지만 저장 건수가 늘지 않았습니다(${before}→${after}). ESM+ 화면을 확인해 주세요. 자동으로 다시 저장하지 않습니다.` : r.error, feeNote });
      await setStatus(okSaved ? '임시저장 완료' : '임시저장 결과 확인 필요');
      return;
    }
    const r = await run(tabId, 'submit', { target: '등록하기' });
    if (r.ok && !r.uncertain) {
      const nos = (r.nos || []).slice(0, 2);
      await finish({ status: 'registered', marketProductNo: nos.length ? nos.map((n, i) => `${i === 0 ? 'G' : 'A'}:${n}`).join(',') : null, error: nos.length ? null : `등록 완료로 보이지만 상품번호를 읽지 못했습니다. 안내: ${(r.text || '').slice(0, 200)}`, feeNote });
      await setStatus('등록 완료');
    } else {
      await finish({ status: 'failed', failedStep: '등록하기', error: r.ok ? '「등록하기」를 눌렀지만 결과를 확인하지 못했습니다. ESM+ 「상품 조회/수정」에서 등록됐는지 확인해 주세요. 자동으로 다시 등록하지 않습니다.' : r.error, feeNote });
      await setStatus('등록 결과 확인 필요');
    }
  } catch (e) {
    await finish({ status: 'failed', failedStep: done.length ? '중단' : '시작', error: String(e.message || e).slice(0, 500), feeNote }).catch(() => {});
    await setStatus(`실패: ${e.message || e}`);
  }
}

async function runHealth(check) {
  await setStatus('ESM+ 화면 점검 중…');
  let tabId = null;
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
    const tab = await chrome.tabs.create({ url: CREATE_URL, active: false, ...(win ? { windowId: win.id } : {}) });
    tabId = tab.id;
    let ready = false;
    for (let s = 0; s < 45 && !ready; s++) {
      await wait(1000);
      const r = await run(tabId, 'ready').catch(() => ({ ok: false }));
      if (r.login) throw new Error('ESM+ 로그인이 풀려 있습니다. ESM+에 로그인한 뒤 「지금 점검」을 눌러 주세요.');
      ready = !!r.ok;
    }
    if (!ready) throw new Error('「상품등록」 화면이 45초 안에 열리지 않았습니다.');
    const r = await run(tabId, 'health', { targets: check.targets, conditional: check.conditional });
    await api('/api/extension/health-result', r.ok ? { id: check.id, ok: true, missing: r.missing, conditional: r.conditional, storeName: null } : { id: check.id, ok: false, error: r.error });
    await setStatus(r.ok ? (r.missing.length ? `화면 점검: 바뀐 칸 ${r.missing.length}개(${r.missing.slice(0, 3).join(', ')})` : '화면 점검: 정상') : `화면 점검 실패: ${r.error}`);
  } catch (e) {
    await api('/api/extension/health-result', { id: check.id, ok: false, error: String(e.message || e).slice(0, 300) }).catch(() => {});
    await setStatus(`화면 점검 실패: ${e.message || e}`);
  } finally {
    if (tabId) await chrome.tabs.remove(tabId).catch(() => {});
  }
}

async function pump() {
  if (busy || !(await getToken())) return;
  busy = true;
  try {
    // 확장이 작업 중에 꺼졌다 켜졌으면 그 작업은 결과가 불확실 — 다시 실행하지 않고 실패로 남긴다.
    const { activeJob } = await chrome.storage.local.get('activeJob');
    if (activeJob) {
      await api('/api/extension/finish', { jobId: activeJob, status: 'failed', failedStep: '중단', error: '확장이 작업 중에 멈췄습니다. ESM+ 화면을 확인하고 필요하면 다시 보내 주세요.' }).catch(() => {});
      await chrome.storage.local.remove('activeJob');
    }
    const { job, updateRequired } = await api('/api/extension/task', {});
    if (job) await runJob(job);
    else if (updateRequired) await setStatus(`새 버전(${updateRequired})이 있어야 하는 작업이 기다립니다 — 확장 ZIP을 다시 받아 덮어쓰고 새로고침해 주세요.`);
    else {
      const { check } = await api('/api/extension/health-task', { auto: true }).catch(() => ({ check: null }));
      if (check) await runHealth(check);
    }
  } catch (e) {
    await setStatus(`연결 확인 필요: ${e.message || e}`);
  } finally {
    busy = false;
  }
}

chrome.alarms.create('poll', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'poll') pump(); });

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    if (msg.type === 'status') {
      const { token, lastStatus } = await chrome.storage.local.get(['token', 'lastStatus']);
      let { accountEmail } = await chrome.storage.local.get('accountEmail');
      let latest = null;
      try { latest = (await fetch(API + '/api/extension/version', { cache: 'no-store' }).then((r) => r.json())).latest; } catch {}
      if (token && !accountEmail) { try { accountEmail = (await api('/api/extension/me', null, 'GET')).email || null; if (accountEmail) await chrome.storage.local.set({ accountEmail }); } catch {} }
      const stillToken = (await chrome.storage.local.get('token')).token;
      return { ok: true, version: chrome.runtime.getManifest().version_name, connected: !!stillToken, accountEmail: stillToken ? accountEmail || null : null, lastStatus, latest };
    }
    if (msg.type === 'pair') {
      const code = String(msg.code || '').trim().toUpperCase();
      const res = await fetch(API + '/api/extension/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, deviceName: 'Chrome' }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.token) return { ok: false, error: json.error || '연결하지 못했습니다.' };
      await chrome.storage.local.set({ token: json.token, accountEmail: json.email || null });
      await setStatus('연결되었습니다. 작업을 기다리는 중…');
      pump();
      return { ok: true };
    }
    if (msg.type === 'disconnect') {
      await api('/api/extension/auth', {}, 'DELETE').catch(() => {});
      await chrome.storage.local.remove(['token', 'accountEmail']);
      await setStatus('연결을 끊었습니다.');
      return { ok: true };
    }
    if (msg.type === 'runNow') { pump(); return { ok: true }; }
    return { ok: false, error: 'unknown' };
  })().then(reply, (e) => reply({ ok: false, error: String(e.message || e) }));
  return true;
});
