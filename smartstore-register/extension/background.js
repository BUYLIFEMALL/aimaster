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
    headers: { 'Content-Type': 'application/json', 'X-Ext-Version': chrome.runtime.getManifest().version_name, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
      // 임시저장본이 있으면 「임시저장 된 내용(N건)을 불러오시겠습니까?」가 뜬다 — 새로 등록하므로 불러오지 않음(취소/아니오)
      const load = [...document.querySelectorAll('.modal.in, [role="dialog"]')].find((m) => visible(m) && /임시저장\s*된\s*내용/.test(m.textContent));
      if (load) { const no = [...load.querySelectorAll('button')].find((b) => /^(취소|아니오|아니요|닫기)$/.test(b.textContent.trim())); if (no) { no.click(); await sleep(500); } }
      return { ok: !!byModel('vm.product.name')[0] };
    }

    if (cmd === 'expand') {
      // 접힌 섹션은 칸이 아예 없다 — 머리(div.title-line, ncp-click="vm.openMenuToggle()")를 눌러 펼친다.
      const label = [...document.querySelectorAll('.title-line label')].find((l) => l.textContent.replace(/\s+/g, ' ').trim().startsWith(args.title));
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
      // 전시 상태처럼 실제 이름이 vm.singleChannelProductMap[channelServiceType].channelProductDisplayStatusType로 긴 칸은 끝부분으로도 찾는다
      let radios = byModel(args.target);
      if (!radios.length) radios = [...document.querySelectorAll('input[type=radio][ng-model]')].filter((e) => e.getAttribute('ng-model').endsWith('.' + args.target));
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

    if (cmd === 'select') {
      const sel = byModel(args.target).find((e) => e.tagName === 'SELECT');
      if (!sel) return { ok: false, error: '고르기 상자를 찾지 못했습니다.' };
      const norm = (s) => s.replace(/\s+/g, '').trim();
      // 판매자센터 배송 칸(택배사·배송비)은 진짜 select를 숨기고 selectize 목록을 덮어씌운 상자다(class "selectized").
      // 숨은 select 값을 바꾸면 selectize가 되돌리므로, 화면 목록을 열어 글자가 「정확히 같은」 보기를 누른다
      // (택배사 목록에 「CJ대한통운(새벽배송)」과 「CJ대한통운」이 함께 있음).
      const control = sel.classList.contains('selectized') ? (sel.parentElement?.querySelector('.selectize-control')) : null;
      if (control) {
        const shown = () => norm(control.querySelector('.selectize-input .item')?.textContent || '');
        if (shown() === norm(args.value)) return { ok: true, already: true };
        const box = control.querySelector('.selectize-input');
        box.scrollIntoView({ block: 'center' });
        box.click();
        box.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        const items = await waitFor(() => {
          const list = [...control.querySelectorAll('.selectize-dropdown [data-selectable], .selectize-dropdown .option')].filter(visible);
          return list.length ? list : null;
        }, 5000);
        if (!items) return { ok: false, error: '목록이 열리지 않았습니다.' };
        const item = items.find((o) => norm(o.textContent) === norm(args.value)) || (items.filter((o) => norm(o.textContent).includes(norm(args.value))).length === 1 ? items.find((o) => norm(o.textContent).includes(norm(args.value))) : null);
        if (!item) { document.body.click(); return { ok: false, error: `「${args.value}」 보기가 없습니다(있는 보기: ${items.map((o) => o.textContent.trim()).slice(0, 8).join(', ')})` }; }
        item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        item.click();
        const ok = await waitFor(() => shown() === norm(args.value), 3000);
        return ok ? { ok: true } : { ok: false, error: `고른 값이 반영되지 않았습니다(화면 값: ${shown() || '없음'})` };
      }
      const opts = [...sel.options].filter((o) => !/^\?/.test(o.value));
      const opt = opts.find((o) => norm(o.textContent) === norm(args.value)) || opts.filter((o) => norm(o.textContent).includes(norm(args.value)))[0];
      if (!opt) return { ok: false, error: `「${args.value}」 보기가 없습니다(있는 보기: ${opts.map((o) => o.textContent.trim()).slice(0, 8).join(', ')})` };
      sel.scrollIntoView({ block: 'center' });
      sel.focus();
      sel.value = opt.value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(400);
      return sel.value === opt.value ? { ok: true } : { ok: false, error: '고른 값이 반영되지 않았습니다.' };
    }

    if (cmd === 'deliveryTemplate') {
      // 「배송비 템플릿」 버튼 → 목록 창(표: 템플릿명 | 선택 | 삭제)에서 이름이 같은 줄의 「선택」만 누른다.
      // 「삭제」 칸과 「템플릿 추가」 체크 상자(vm.savedTemplate['DELIVERY'])는 절대 건드리지 않는다.
      const btn = [...document.querySelectorAll('button[ng-click="vm.templateModal()"]')].find((b) => b.textContent.replace(/\s+/g, '') === '배송비템플릿');
      if (!btn) return { ok: false, error: '「배송비 템플릿」 버튼을 찾지 못했습니다.' };
      if (btn.disabled) return { ok: false, error: '「배송비 템플릿」 버튼이 꺼져 있습니다.' };
      btn.scrollIntoView({ block: 'center' });
      btn.click();
      const modal = await waitFor(() => [...document.querySelectorAll('.modal.in')].find((m) => visible(m) && /배송비 템플릿 목록|배송정보 템플릿/.test(m.textContent)), 8000);
      if (!modal) return { ok: false, error: '배송비 템플릿 목록 창이 열리지 않았습니다.' };
      const close = () => modal.querySelector('button.close')?.click();
      await waitFor(() => modal.querySelector('tbody tr td:nth-child(2)') || /등록된 배송비 템플릿이 없습니다/.test(modal.innerText), 5000);
      const rows = [...modal.querySelectorAll('tbody tr')].filter((tr) => visible(tr) && tr.cells.length >= 2);
      const name = (tr) => tr.cells[0].textContent.replace(/\s+/g, ' ').trim();
      if (!rows.length) { close(); return { ok: false, error: '판매자센터에 등록된 배송비 템플릿이 없습니다. 기본값에서 템플릿 이름을 비우고 배송비를 직접 넣어 주세요.' }; }
      const want = args.value.replace(/\s+/g, ' ').trim();
      const row = rows.find((tr) => name(tr) === want) || (rows.filter((tr) => name(tr).includes(want)).length === 1 ? rows.find((tr) => name(tr).includes(want)) : null);
      if (!row) { const names = rows.map(name).slice(0, 8).join(', '); close(); return { ok: false, error: `「${want}」 템플릿이 없습니다(있는 템플릿: ${names})` }; }
      const pick = row.cells[1].querySelector('button, a');
      if (!pick || !/선택/.test(pick.textContent)) { close(); return { ok: false, error: '「선택」 버튼을 찾지 못했습니다.' }; }
      pick.click();
      // 적용 확인 창이 뜨면 「확인」
      await sleep(800);
      const confirm = [...document.querySelectorAll('.modal.in')].find((m) => m !== modal && visible(m) && /템플릿|적용|변경/.test(m.textContent));
      if (confirm) [...confirm.querySelectorAll('button')].find((b) => b.textContent.trim() === '확인')?.click();
      const gone = await waitFor(() => !document.body.contains(modal) || !visible(modal), 6000);
      return gone ? { ok: true } : { ok: false, error: '템플릿을 고른 뒤 목록 창이 닫히지 않았습니다.' };
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
      // 사진이 아직 올라가는 중이면 「등록」이 늦게 먹거나 닫히는 데 20초를 넘긴다(2026-10-27 사진 12장 시험) →
      // 올리는 중 표시가 사라질 때까지 기다리고, 닫힘은 45초까지, 15초에 안 닫혔으면 「등록」을 한 번 더 누른다.
      const uploading = () => [...document.querySelectorAll('.se-component [class*="loading"], .se-component [class*="uploading"], .se-component [class*="progress"]')].some(visible);
      await waitFor(() => !uploading(), 30000);
      const findDone = () => [...document.querySelectorAll('button')].find((b) => visible(b) && b.textContent.replace(/\s+/g, '') === '등록' && b.className.includes('progress-button'));
      const done = findDone();
      if (!done) return { ok: false, error: '에디터 「등록」 버튼을 찾지 못했습니다.' };
      done.click();
      const isClosed = () => !document.querySelector('.se-image-toolbar-button');
      if (await waitFor(isClosed, 15000)) return { ok: true };
      const again = findDone();
      if (again && !again.disabled) again.click();
      const closed = await waitFor(isClosed, 30000);
      return closed ? { ok: true } : { ok: false, error: '에디터가 45초 안에 닫히지 않았습니다.' };
    }

    if (cmd === 'submit') {
      // PC 화면의 임시저장 버튼은 progress-button="vm.createTempSave()"(아래 고정 막대), ng-click 버튼은 휴대폰 전용(visible-xs)이라 PC에서 숨겨져 있다.
      const temp = args.target === 'vm.createTempSave';
      const btn = temp
        ? [...document.querySelectorAll('button[progress-button="vm.createTempSave()"], button[ng-click="vm.createTempSave()"]')].find(visible)
        : [...document.querySelectorAll('button')].find((b) => visible(b) && b.textContent.replace(/\s+/g, '') === '저장하기');
      if (!btn) return { ok: false, error: '저장 버튼을 찾지 못했습니다.' };
      // 누르기 전부터 떠 있던 글(검색 SEO 안내·「달력보기」 등)은 판정에서 뺀다 — 누른 뒤 새로 나타난 글만 본다
      const noteNodes = () => [...document.querySelectorAll('.modal.in, [role="dialog"], .toast, .alert, .noti-message, .error-msg, [class*="error"]')].filter(visible);
      const before = new Set(noteNodes().map((m) => m.innerText.replace(/\s+/g, ' ').trim()));
      btn.click();
      if (temp) {
        // 「임시저장 하시겠습니까?」 같은 확인 창이 뜨면 「확인」
        const ask = await waitFor(() => [...document.querySelectorAll('.modal.in, [role="dialog"]')].find((m) => visible(m) && /임시저장/.test(m.textContent) && [...m.querySelectorAll('button')].some((b) => b.textContent.trim() === '확인')), 2500);
        if (ask) [...ask.querySelectorAll('button')].find((b) => b.textContent.trim() === '확인').click();
      }
      // 누르기만 하고 성공으로 보지 않는다(2026-10-27: 「등록 완료」로 기록됐는데 판매자센터에 상품이 없었음).
      // 성공 = 「상품 등록」 주소를 벗어남 또는 완료 안내 / 실패 = 오류 안내·칸 오류 문구 / 그 밖 = 결과 미확인.
      const startHash = location.hash;
      // 칸 오류는 그 칸 이름과 함께 남긴다(예: 「A/S 전화번호: 필수 정보입니다」)
      const fieldName = (m) => (m.closest('.form-group, .seller-input-wrap, li, tr')?.querySelector('label, th, .control-label, .title')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
      const notes = () => noteNodes().map((m) => { const t = m.innerText.replace(/\s+/g, ' ').trim(); return before.has(t) ? '' : (/필수|입력해|선택해/.test(t) && fieldName(m) ? `${fieldName(m)}: ${t}` : t); }).filter(Boolean);
      let verdict = null;
      for (let t = 0; t < 30 && !verdict; t++) {
        await sleep(500);
        const text = notes().join(' / ');
        if (location.hash !== startHash && !/products\/create/.test(location.hash)) verdict = { state: 'success', message: text };
        else if (/(등록|저장)\s*(이|가)?\s*(완료|되었)|임시저장\s*(이|가)?\s*(완료|되었)/.test(text)) verdict = { state: 'success', message: text };
        else if (/입력해\s*주세요|선택해\s*주세요|확인해\s*주세요|필수|오류|실패|할 수 없|올바르지/.test(text)) verdict = { state: 'error', message: text };
      }
      const message = (verdict?.message || notes().join(' / ')).slice(0, 300);
      const no = (message.match(/상품번호[^0-9]*([0-9]{6,})/) || location.href.match(/products\/(?:edit\/)?([0-9]{6,})/) || [])[1] || null;
      if (verdict?.state === 'success') return { ok: true, confirmed: true, message, productNo: no };
      if (verdict?.state === 'error') return { ok: false, error: `판매자센터가 저장을 거절했습니다: ${message || '오류 안내'}` };
      return { ok: true, confirmed: false, message };
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

// 글자 칸 값 넣기 — 페이지 자체 스크립트 쪽(MAIN)에서 AngularJS 모델에 직접 넣고, 모델에 실제로 들어갔는지 확인한다.
// 판매가·할인 금액·배송비 금액·전화번호처럼 ncp-number-format이 붙은 칸은 화면 글자만 바꾸면 내부 값이 비어
// 커서가 빠질 때 지워진다(2026-10-27 「바로 등록」 시험에서 판매가·할인 금액 「필수 정보입니다」로 저장 거절).
function ngTypeMain(a) {
  const ng = window.angular;
  const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  let el = null;
  if (a.discount) {
    const radio = [...document.querySelectorAll('[ng-model]')].find((e) => e.getAttribute('ng-model') === 'vm.viewData.isEnableImmediateDiscountPolicy');
    for (let box = radio?.parentElement, up = 0; box && up < 8 && !el; up++, box = box.parentElement) {
      el = [...box.querySelectorAll('input[type=tel], input[type=number], input[type=text]')].find((x) => visible(x) && x.getAttribute('ng-model') !== 'vm.product.salePrice' && !x.readOnly) || null;
    }
  } else {
    const all = [...document.querySelectorAll('[ng-model]')].filter((e) => e.getAttribute('ng-model') === a.target);
    el = all.find(visible) || all[0] || null;
  }
  if (!el) return { ok: false, error: a.discount ? '할인 금액 칸을 찾지 못했습니다.' : '칸을 찾지 못했습니다.' };
  el.scrollIntoView({ block: 'center' });
  el.focus();
  const ctrl = ng ? ng.element(el).controller('ngModel') : null;
  if (!ctrl) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, a.value);
    for (const t of ['input', 'change', 'blur']) el.dispatchEvent(new Event(t, { bubbles: true }));
    return { ok: true, via: 'dom' };
  }
  // 운영 모드(debugInfoEnabled false)에서는 element.scope()가 비어 있다 → injector로 $rootScope를 얻는다
  let root = null;
  try { root = (ng.element(document.body).injector() || ng.element(document.querySelector('[ng-app], [data-ng-app]') || document.documentElement).injector()).get('$rootScope'); } catch (e) { root = null; }
  const apply = (fn) => { if (!root || root.$$phase) fn(); else root.$apply(fn); };
  try { apply(() => { ctrl.$setViewValue(a.value); ctrl.$render(); }); } catch (e) { return { ok: false, error: `값 넣기 오류: ${String(e && e.message || e).slice(0, 120)}` }; }
  el.dispatchEvent(new Event('blur', { bubbles: true }));
  // ng-model-options(debounce·blur 반영)가 붙은 칸은 바로 반영되지 않는다 → 미뤄 둔 값을 바로 반영시킨 뒤 확인
  try { if (ctrl.$commitViewValue) apply(() => ctrl.$commitViewValue()); } catch (e) { /* 무시 */ }
  const model = ctrl.$modelValue;
  const filled = model !== undefined && model !== null && String(model).replace(/[,\s]/g, '') !== '';
  if (filled) return { ok: true, via: 'angular' };
  const why = ctrl.$error ? Object.keys(ctrl.$error).filter((k) => ctrl.$error[k]).join(',') : '';
  return { ok: false, error: `값이 판매자센터에 들어가지 않았습니다(화면: ${el.value || '빈칸'}${why ? `, 검사: ${why}` : ''})` };
}

async function runMain(tabId, func, args) {
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func, args: [args] });
    return res?.result || { ok: false, error: `페이지 안에서 실행하지 못했습니다(${func.name}).` };
  } catch (e) {
    return { ok: false, error: `페이지 안 실행 오류(${func.name}): ${String(e && e.message || e).slice(0, 120)}` };
  }
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
  // 새 창을 만들지 않는다(주인님 2026-10-27 「기존에 떠있는 브라우저에 새탭으로 추가하면 안되?」).
  // 판매자센터 탭이 있으면 그 탭을 다시 쓰고, 없으면 지금 쓰는 크롬 창에 새 탭 — 어느 쪽이든 그 탭·창을 맨 앞으로.
  const [existing] = await chrome.tabs.query({ url: 'https://sell.smartstore.naver.com/*' });
  let tab;
  if (existing) {
    tab = await chrome.tabs.update(existing.id, { url: CREATE_URL, active: true });
  } else {
    const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
    tab = await chrome.tabs.create({ url: CREATE_URL, active: true, ...(win ? { windowId: win.id } : {}) });
  }
  await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
  for (let t = 0; t < 45; t++) {
    await wait(1000);
    const r = await run(tab.id, 'ready').catch(() => ({ ok: false }));
    if (r.ok) return tab.id;
    if (r.error) throw new Error(r.error);
    // 하루 첫 접속이면 홈·공지 화면으로 넘어가기도 한다 — 15초에 한 번 「상품 등록」 주소로 다시 이동
    if (t === 15) await chrome.tabs.update(tab.id, { url: CREATE_URL }).catch(() => {});
  }
  // 짐작 문구 대신 실제로 열려 있던 화면을 남긴다(로그인 문제로 오해하지 않게)
  const now = await chrome.tabs.get(tab.id).catch(() => null);
  const where = now ? `${(now.title || '').slice(0, 40)} · ${(now.url || '').replace(/^https?:\/\//, '').slice(0, 80)}` : '창이 닫힘';
  throw new Error(`「상품 등록」 칸이 45초 안에 나타나지 않았습니다(열린 화면: ${where}).`);
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
      if (step.key === 'discount') { await wait(600); r = await runMain(tabId, ngTypeMain, { discount: true, value: step.value }); }
      else if (step.action === 'type') r = await runMain(tabId, ngTypeMain, { target: step.target, value: step.value });
      else if (step.action === 'radio') r = await run(tabId, 'radio', { target: step.target, value: step.value });
      else if (step.action === 'check') {
        r = await run(tabId, 'check', { target: step.target });
        // 옛 서버가 만든 작업에는 고시 「A/S 책임자 전화번호」 단계가 없다 → 「상품상세 참조」 다음에 A/S 전화번호를 넣는다
        const asPhone = job.steps.find((s) => s.key === 'as_phone')?.value;
        if (r.ok && step.key === 'notice_ref' && asPhone && !job.steps.some((s) => s.key === 'notice_phone')) {
          await human();
          const p = await runMain(tabId, ngTypeMain, { target: 'vm.content.customerServicePhoneNumber', value: asPhone });
          if (!p.ok) failures.push(`고시 A/S 책임자 전화번호 — ${p.error}`);
        }
      }
      else if (step.action === 'select') r = await run(tabId, 'select', { target: step.target, value: step.value });
      else if (step.action === 'template') r = await run(tabId, 'deliveryTemplate', { value: step.value });
      else if (step.action === 'search_pick') {
        if (step.key === 'origin' && step.value === '국산') continue; // 기본값이 국산 — 건드리지 않음
        if (step.key === 'delivery_tpl') { failures.push(`${step.label}(템플릿 고르기는 아직 수동)`); continue; } // 옛 작업 기록 호환
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
      else if (!r.confirmed) await api('/api/extension/finish', { jobId: job.id, status: 'filled', failedStep: submit.label, error: `「${submit.label}」은 눌렀지만 결과를 확인하지 못했습니다. 판매자센터 화면·상품 목록에서 직접 확인해 주세요.${r.message ? ` 화면 안내: ${r.message}` : ''}`.slice(0, 1000) });
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
    const { job, updateRequired } = await api('/api/extension/task', {});
    if (job) await runJob(job);
    else if (updateRequired) await setStatus(`새 버전(${updateRequired})이 있어야 하는 작업이 기다립니다 — 확장 ZIP을 다시 받아 덮어쓰고 새로고침해 주세요.`);
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
