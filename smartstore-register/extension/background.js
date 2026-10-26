// AIMaster · 스마트스토어 상품등록 자동화 확장 (v1.02, EC-W8 2단계)
// 흐름: 웹에서 연결(토큰은 이 확장에만) → 30초마다 작업 받기 → 판매자센터 「상품 등록」 탭을 열어 칸을 하나씩 채움 → 결과 보고.
// 칸은 화면 위치가 아니라 이름(ng-model)으로 찾는다(분석: trending-product-finder/docs/EC_W8_SMARTSTORE_FORM_ANALYSIS_20261026.md).
// 안전: 칸 하나라도 실패하면 「임시저장/저장하기」는 누르지 않는다. 결과가 불확실하면 다시 등록하지 않는다(작업은 서버에서 한 번만 넘겨줌).

const API = 'https://smartstore-register.buylife.xyz';
const CREATE_URL = 'https://sell.smartstore.naver.com/#/products/create';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const human = () => wait(350 + Math.floor(Math.random() * 550)); // 사람처럼 칸 사이 간격(봇 탐지 회피 지침 §20)
let busy = false;

async function getToken() { return (await chrome.storage.local.get('token')).token || null; }

async function api(path, body, method = 'POST') {
  const token = await getToken();
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) await chrome.storage.local.remove('token');
  if (!res.ok) throw new Error(json.error || `서버 오류 ${res.status}`);
  return json;
}

async function setStatus(text) { await chrome.storage.local.set({ lastStatus: { text, at: Date.now() } }); }

// ── 판매자센터 화면 안에서 실행되는 명령(이 함수 전체가 탭에 들어간다 — 바깥 변수 사용 금지) ──
async function pageCommand(cmd, args) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const byModel = (model) => {
    const all = [...document.querySelectorAll('[ng-model]')];
    return all.filter((e) => e.getAttribute('ng-model') === model);
  };
  const labelOf = (el) => (el.closest('label')?.textContent || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.parentElement?.textContent || '').replace(/\s+/g, ' ').trim();
  const setValue = (el, value) => {
    el.scrollIntoView({ block: 'center' });
    el.focus();
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };
  const waitFor = async (fn, ms) => { for (let t = 0; t < ms; t += 200) { const v = fn(); if (v) return v; await sleep(200); } return null; };
  const putFile = async (input, a) => {
    const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], a.name, { type: a.mime }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  try {
    if (cmd === 'ready') {
      if (/nid\.naver\.com|accounts\./.test(location.href) || document.querySelector('form[action*="login"]')) return { ok: false, error: '스마트스토어센터 로그인이 필요합니다.' };
      return { ok: !!byModel('vm.product.name')[0] };
    }

    if (cmd === 'expand') {
      // 접힌 섹션은 칸이 아예 없다 — 머리(div.title-line, ncp-click="vm.openMenuToggle()")를 눌러 펼친다.
      const label = [...document.querySelectorAll('.title-line label')].find((l) => l.textContent.replace(/s+/g, ' ').trim().startsWith(args.title));
      if (!label) return { ok: true, skipped: true };
      const line = label.closest('.title-line');
      const toggle = line.querySelector('.set-option a.btn, a.btn.btn-default');
      if (toggle && toggle.classList.contains('active')) return { ok: true };
      line.scrollIntoView({ block: 'center' });
      (line.querySelector('.input-content') || label).click();
      await sleep(700);
      return { ok: true, opened: true };
    }

    if (cmd === 'type') {
      const el = byModel(args.target).find(visible) || byModel(args.target)[0];
      if (!el) return { ok: false, error: '칸을 찾지 못했습니다.' };
      setValue(el, args.value);
      return { ok: true };
    }

    if (cmd === 'radio') {
      const radios = byModel(args.target);
      const want = args.value === 'SUSPENSION' ? (l) => l.includes('전시중지') : args.value === 'ON' ? (l) => l.includes('전시중') && !l.includes('중지') : (l) => l.includes('설정함') && !l.includes('안함');
      const r = radios.find((x) => want(labelOf(x)));
      if (!r) return { ok: false, error: '선택지를 찾지 못했습니다.' };
      (r.closest('label') || r).click();
      return { ok: true };
    }

    if (cmd === 'discount') {
      // 즉시할인 금액 칸은 「설정함」을 누른 뒤에 나타난다 — 그 묶음 안에서 새로 보이는 숫자 칸을 찾는다(판매가 칸 제외).
      const radio = byModel('vm.viewData.isEnableImmediateDiscountPolicy')[0];
      if (!radio) return { ok: false, error: '즉시할인 칸을 찾지 못했습니다.' };
      const find = () => {
        let box = radio.parentElement;
        for (let up = 0; up < 8 && box; up++, box = box.parentElement) {
          const i = [...box.querySelectorAll('input[type=tel], input[type=number], input[type=text]')].find((x) => visible(x) && x.getAttribute('ng-model') !== 'vm.product.salePrice' && !x.readOnly);
          if (i) return i;
        }
        return null;
      };
      const input = await waitFor(find, 4000);
      if (!input) return { ok: false, error: '할인 금액 칸을 찾지 못했습니다.' };
      setValue(input, args.value);
      return { ok: true };
    }

    if (cmd === 'check') {
      const c = byModel(args.target)[0];
      if (!c) return { ok: false, error: '체크 칸을 찾지 못했습니다.' };
      if (!c.checked) (c.closest('label') || c).click();
      return { ok: true };
    }

    if (cmd === 'pick') {
      // selectize(검색형 선택 상자): 보이는 입력칸에 글자를 넣고 목록에서 고른다.
      const base = byModel(args.target)[0];
      if (!base) return { ok: false, error: '선택 상자를 찾지 못했습니다.' };
      const control = base.nextElementSibling?.classList?.contains('selectize-control') ? base.nextElementSibling : base.parentElement?.querySelector('.selectize-control');
      const input = control?.querySelector('.selectize-input input') || control?.querySelector('input');
      if (!input) return { ok: false, error: '검색 입력칸을 찾지 못했습니다.' };
      input.scrollIntoView({ block: 'center' });
      (control.querySelector('.selectize-input') || input).click();
      input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, args.value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: args.value.slice(-1) }));
      const options = await waitFor(() => {
        const list = [...document.querySelectorAll('.selectize-dropdown [data-selectable], .selectize-dropdown .option')].filter(visible);
        return list.length ? list : null;
      }, 10000);
      if (!options) return { ok: false, error: `「${args.value}」 검색 결과가 나오지 않았습니다.` };
      const text = (o) => o.textContent.replace(/\s+/g, ' ').trim();
      const pick = (args.leaf && options.find((o) => text(o).endsWith(args.value))) || options.find((o) => text(o).includes(args.value)) || options[0];
      pick.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      pick.click();
      await sleep(800);
      if (args.verifyText) {
        const ok = await waitFor(() => document.body.innerText.includes(args.verifyText), 5000);
        if (!ok) return { ok: false, error: '고른 값이 반영되지 않았습니다.' };
      }
      return { ok: true, picked: text(pick).slice(0, 80) };
    }

    if (cmd === 'mainImage') {
      const open = document.querySelector('a[ng-click="vm.openUploadModal()"]');
      if (!open) return { ok: false, error: '「이미지 등록」 버튼을 찾지 못했습니다.' };
      open.scrollIntoView({ block: 'center' });
      open.click();
      const input = await waitFor(() => document.querySelector('input[type=file][ngf-select*="uploadImagesFromDevice"]'), 8000);
      if (!input) return { ok: false, error: '사진 올리기 칸을 찾지 못했습니다.' };
      await putFile(input, args);
      const done = await waitFor(() => !document.querySelector('.modal.in input[type=file][ngf-select*="uploadImagesFromDevice"]'), 20000);
      return done ? { ok: true } : { ok: false, error: '대표 이미지 올리기가 끝나지 않았습니다.' };
    }

    if (cmd === 'openEditor') {
      const direct = document.querySelector('a[ng-click*="EDITOR_TYPE.SEONE"]');
      if (direct) { direct.scrollIntoView({ block: 'center' }); direct.click(); await sleep(600); }
      const btn = document.querySelector('button[ng-click*="openEditor($event, false)"]');
      if (!btn) return { ok: false, error: '「스마트 에디터 ONE 으로 작성」 버튼을 찾지 못했습니다.' };
      btn.click();
      // 「이전에 작성하던 내용이 존재합니다」 확인 창 → 새로 작성(취소)
      const prev = await waitFor(() => [...document.querySelectorAll('.modal.in, [role="dialog"]')].find((m) => visible(m) && m.textContent.includes('이전에 작성하던 내용')), 3000);
      if (prev) { const cancel = [...prev.querySelectorAll('button')].find((b) => b.textContent.trim() === '취소'); if (cancel) cancel.click(); }
      return { ok: true };
    }

    if (cmd === 'editorReady') {
      const prev = [...document.querySelectorAll('.modal.in, [role="dialog"]')].find((m) => visible(m) && m.textContent.includes('이전에 작성하던 내용'));
      if (prev) { const cancel = [...prev.querySelectorAll('button')].find((b) => b.textContent.trim() === '취소'); if (cancel) cancel.click(); await sleep(500); }
      return { ok: !!document.querySelector('.se-image-toolbar-button, button[data-name="image"]') };
    }

    if (cmd === 'editorImage') {
      // 블로그 확장(naver-blog-agent/extension/editor.js 'image')과 같은 순서
      const count = () => document.querySelectorAll('.se-component.se-image, .se-component[data-comp-type="image"]').length;
      const before = count();
      const findInput = () => [...document.querySelectorAll('input[type="file"]')].find((el) => !el.hasAttribute('ngf-select') && /image|\.png|\.jpg/i.test(el.accept || ''));
      // 1순위: 에디터 본문에 파일을 끌어다 놓기(드롭) — 파일 고르는 창이 뜨지 않는다.
      const bytes = Uint8Array.from(atob(args.data), (c) => c.charCodeAt(0));
      const target = [...document.querySelectorAll('.se-content, .se-canvas, .se-container, [contenteditable="true"]')].find(visible);
      if (target) {
        const dt = new DataTransfer();
        dt.items.add(new File([bytes], args.name, { type: args.mime }));
        for (const type of ['dragenter', 'dragover', 'drop']) {
          target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
          await sleep(120);
        }
        if (await waitFor(() => count() > before, 15000)) return { ok: true, via: 'drop' };
      }
      // 2순위: 숨은 파일 칸(블로그 확장 방식)
      let input = findInput();
      if (!input) {
        const b = document.querySelector('.se-image-toolbar-button, button[data-name="image"]');
        if (!b) return { ok: false, error: '에디터 사진 버튼을 찾지 못했습니다.' };
        b.click();
        input = await waitFor(findInput, 5000);
      }
      if (!input) return { ok: false, error: '에디터 사진 올리기 칸을 찾지 못했습니다.' };
      await putFile(input, args);
      const ok = await waitFor(() => count() > before, 25000);
      return ok ? { ok: true } : { ok: false, error: '에디터에 사진이 들어가지 않았습니다.' };
    }

    if (cmd === 'editorDone') {
      const done = [...document.querySelectorAll('button')].find((b) => visible(b) && b.textContent.replace(/\s+/g, '') === '등록' && b.className.includes('progress-button'));
      if (!done) return { ok: false, error: '에디터 「등록」 버튼을 찾지 못했습니다.' };
      done.click();
      const closed = await waitFor(() => !document.querySelector('.se-image-toolbar-button'), 20000);
      return closed ? { ok: true } : { ok: false, error: '에디터가 닫히지 않았습니다.' };
    }

    if (cmd === 'submit') {
      const btn = args.target === 'vm.createTempSave'
        ? [...document.querySelectorAll('button[ng-click="vm.createTempSave()"]')].find(visible)
        : [...document.querySelectorAll('button')].find((b) => visible(b) && b.textContent.replace(/\s+/g, '') === '저장하기');
      if (!btn) return { ok: false, error: '저장 버튼을 찾지 못했습니다.' };
      btn.click();
      await sleep(4000);
      const modal = [...document.querySelectorAll('.modal.in, [role="dialog"], .toast, .alert')].filter(visible).map((m) => m.innerText.replace(/\s+/g, ' ').trim()).join(' / ');
      const no = (modal.match(/상품번호[^0-9]*([0-9]{6,})/) || [])[1] || null;
      return { ok: true, message: modal.slice(0, 300), productNo: no };
    }

    return { ok: false, error: `모르는 명령 ${cmd}` };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e).slice(0, 200) };
  }
}

// 에디터 사진 넣기 — 페이지 자체 스크립트 쪽(MAIN)에서 실행해야 한다.
// 스마트 에디터는 사진 버튼을 누르면 화면에 붙이지 않은 파일 칸을 만들고 곧바로 click()으로 파일 창을 띄운다 →
// 그 click()을 잠깐 가로채 파일 칸을 받아 두고, 파일을 넣고 change를 보낸다(파일 창은 뜨지 않음).
async function editorImageMain(a) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const count = () => document.querySelectorAll('.se-component.se-image, .se-component[data-comp-type="image"]').length;
  const before = count();
  const orig = HTMLInputElement.prototype.click;
  let captured = null;
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { captured = this; return; }
    return orig.call(this);
  };
  try {
    const btn = document.querySelector('.se-image-toolbar-button, button[data-name="image"]');
    if (!btn) return { ok: false, error: '에디터 사진 버튼을 찾지 못했습니다.' };
    btn.click();
    for (let t = 0; t < 30 && !captured; t++) await sleep(100);
    if (!captured) captured = [...document.querySelectorAll('input[type=file]')].find((el) => /image|.png|.jpg/i.test(el.accept || '')) || null;
    if (!captured) return { ok: false, error: '에디터 사진 올리기 칸을 찾지 못했습니다(가로채기 실패).' };
    const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], a.name, { type: a.mime }));
    captured.files = dt.files;
    captured.dispatchEvent(new Event('input', { bubbles: true }));
    captured.dispatchEvent(new Event('change', { bubbles: true }));
  } finally {
    HTMLInputElement.prototype.click = orig;
  }
  for (let t = 0; t < 100; t++) { if (count() > before) return { ok: true }; await sleep(250); }
  return { ok: false, error: '에디터에 사진이 들어가지 않았습니다.' };
}

async function runMain(tabId, func, args) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args: [args] });
  return res?.result || { ok: false, error: '에디터에서 실행하지 못했습니다.' };
}

async function run(tabId, cmd, args = {}) {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: pageCommand, args: [cmd, args] });
  return res?.result || { ok: false, error: '화면에서 실행하지 못했습니다.' };
}

async function fetchAsset(a) {
  const res = await fetch(a.url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
  if (!res.ok) throw new Error('이미지를 받지 못했습니다.');
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { data: btoa(bin), name: a.name, mime: res.headers.get('content-type') || 'image/jpeg' };
}

/** 에디터가 같은 탭이나 새 창(#/editor)으로 열린다 — 사진 버튼이 보이는 판매자센터 탭을 찾는다 */
async function findEditorTab(productTabId) {
  for (let t = 0; t < 30; t++) {
    await wait(1000);
    const tabs = await chrome.tabs.query({ url: 'https://sell.smartstore.naver.com/*' });
    tabs.sort((a, b) => Number((b.url || '').includes('#/editor')) - Number((a.url || '').includes('#/editor')) || (a.id === productTabId ? 1 : -1));
    for (const tab of tabs) {
      const r = await run(tab.id, 'editorReady').catch(() => ({ ok: false }));
      if (r.ok) return tab.id;
    }
  }
  return null;
}

async function openCreateTab() {
  // 항상 화면 맨 앞에 새 창으로 연다 — 다른(뒤쪽) 창의 탭에 열리면 회원이 진행을 볼 수 없다(포그라운드 원칙).
  const win = await chrome.windows.create({ url: CREATE_URL, focused: true, state: 'maximized' });
  const tab = win.tabs[0];
  for (let t = 0; t < 45; t++) {
    await wait(1000);
    const r = await run(tab.id, 'ready').catch(() => ({ ok: false }));
    if (r.ok) return tab.id;
    if (r.error) throw new Error(r.error);
  }
  throw new Error('「상품 등록」 화면이 열리지 않았습니다. 스마트스토어센터 로그인 상태를 확인해 주세요.');
}

async function runJob(job) {
  await chrome.storage.local.set({ activeJob: job.id });
  await setStatus('상품 등록 화면을 여는 중…');
  const failures = [];
  let tabId;
  try {
    tabId = await openCreateTab();
    const TOP = new Set(['카테고리', '상품명', '판매가', '재고수량', '상품이미지', '상세설명', '저장']);
    const opened = new Set();
    for (const step of job.steps) {
      await human();
      if (!TOP.has(step.section) && !opened.has(step.section)) {
        opened.add(step.section);
        await run(tabId, 'expand', { title: step.section });
      }
      await setStatus(`입력 중: ${step.label}`);
      let r;
      if (step.key === 'discount') r = await run(tabId, 'discount', { value: step.value });
      else if (step.action === 'type') r = await run(tabId, 'type', { target: step.target, value: step.value });
      else if (step.action === 'radio') r = await run(tabId, 'radio', { target: step.target, value: step.value });
      else if (step.action === 'check') r = await run(tabId, 'check', { target: step.target });
      else if (step.action === 'search_pick') {
        if (step.key === 'origin' && step.value === '국산') continue; // 기본값이 국산 — 건드리지 않음
        if (step.key === 'delivery_tpl') { failures.push(`${step.label}(템플릿 고르기는 아직 수동)`); continue; }
        const isCat = step.key === 'category';
        r = await run(tabId, 'pick', { target: step.target, value: step.value.split('|').pop(), leaf: isCat, verifyText: isCat ? '선택한 카테고리' : null });
      } else if (step.action === 'images') {
        if (!job.mainImage) { failures.push('대표 이미지(없음)'); continue; }
        r = await run(tabId, 'mainImage', await fetchAsset(job.mainImage));
      } else if (step.action === 'html') {
        if (!job.detailImages?.length) continue;
        r = await run(tabId, 'openEditor');
        if (r.ok) {
          const editorTab = await findEditorTab(tabId);
          if (!editorTab) r = { ok: false, error: '스마트 에디터 화면을 찾지 못했습니다.' };
          else {
            for (const [i, img] of job.detailImages.entries()) {
              await setStatus(`상세설명 사진 ${i + 1}/${job.detailImages.length}`);
              r = await runMain(editorTab, editorImageMain, await fetchAsset(img));
              if (!r.ok) break;
              await human();
            }
            const d = await run(editorTab, 'editorDone').catch(() => ({ ok: true })); // 창이 닫히면 실행 오류 — 정상 종료로 봄
            if (r.ok && !d.ok) r = d;
            await chrome.tabs.update(tabId, { active: true }).catch(() => {});
            const t2 = await chrome.tabs.get(tabId).catch(() => null);
            if (t2) await chrome.windows.update(t2.windowId, { focused: true }).catch(() => {});
            await wait(1500);
          }
        }
      } else if (step.action === 'button') {
        continue; // 마지막에 따로
      } else continue;
      if (!r?.ok) failures.push(`${step.label}${r?.error ? ` — ${r.error}` : ''}`);
    }

    const submit = job.steps.find((s) => s.action === 'button');
    if (submit && failures.length) {
      await api('/api/extension/finish', { jobId: job.id, status: 'filled', failedStep: failures[0].slice(0, 200), error: `실패한 칸이 있어 저장 버튼은 누르지 않았습니다: ${failures.join(' / ')}`.slice(0, 1000) });
    } else if (submit) {
      await setStatus(submit.target === 'vm.createTempSave' ? '임시저장 누르는 중…' : '저장하기 누르는 중…');
      const r = await run(tabId, 'submit', { target: submit.target });
      if (!r.ok) await api('/api/extension/finish', { jobId: job.id, status: 'failed', failedStep: submit.label, error: r.error });
      else await api('/api/extension/finish', { jobId: job.id, status: submit.target === 'vm.createTempSave' ? 'temp_saved' : 'registered', marketProductNo: r.productNo, error: r.message ? `화면 안내: ${r.message}` : null });
    } else {
      await api('/api/extension/finish', { jobId: job.id, status: 'filled', failedStep: failures[0]?.slice(0, 200) || null, error: failures.length ? `직접 확인할 칸: ${failures.join(' / ')}`.slice(0, 1000) : null });
    }
    await setStatus(failures.length ? `끝 — 직접 확인할 칸 ${failures.length}개` : '끝 — 화면을 확인해 주세요');
  } catch (e) {
    await api('/api/extension/finish', { jobId: job.id, status: 'failed', failedStep: failures[0] || '시작', error: String(e.message || e).slice(0, 500) }).catch(() => {});
    await setStatus(`멈춤: ${e.message || e}`);
  } finally {
    await chrome.storage.local.remove('activeJob');
  }
}

async function pump() {
  if (busy || !(await getToken())) return;
  busy = true;
  try {
    // 확장이 작업 중에 꺼졌다 켜졌으면 그 작업은 결과가 불확실 — 다시 실행하지 않고 실패로 남긴다.
    const { activeJob } = await chrome.storage.local.get('activeJob');
    if (activeJob) {
      await api('/api/extension/finish', { jobId: activeJob, status: 'failed', failedStep: '중단', error: '확장이 작업 중에 멈췄습니다. 판매자센터 화면을 확인하고 필요하면 다시 보내 주세요.' }).catch(() => {});
      await chrome.storage.local.remove('activeJob');
    }
    const { job } = await api('/api/extension/task', {});
    if (job) await runJob(job);
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
      let latest = null;
      try { latest = (await fetch(API + '/api/extension/version', { cache: 'no-store' }).then((r) => r.json())).latest; } catch {}
      return { ok: true, version: chrome.runtime.getManifest().version_name, connected: !!token, lastStatus, latest };
    }
    if (msg.type === 'pair') {
      const code = String(msg.code || '').trim().toUpperCase();
      const res = await fetch(API + '/api/extension/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, deviceName: 'Chrome' }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.token) return { ok: false, error: json.error || '연결하지 못했습니다.' };
      await chrome.storage.local.set({ token: json.token });
      await setStatus('연결되었습니다. 작업을 기다리는 중…');
      pump();
      return { ok: true };
    }
    if (msg.type === 'disconnect') {
      await api('/api/extension/auth', {}, 'DELETE').catch(() => {});
      await chrome.storage.local.remove('token');
      await setStatus('연결을 끊었습니다.');
      return { ok: true };
    }
    if (msg.type === 'runNow') { pump(); return { ok: true }; }
    return { ok: false, error: 'unknown' };
  })().then(reply, (e) => reply({ ok: false, error: String(e.message || e) }));
  return true;
});
