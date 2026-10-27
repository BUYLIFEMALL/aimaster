// AIMaster · AI 스마트스토어 상품 자동등록기 확장 (v1.02, EC-W8 2단계)
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
  if (res.status === 401) await chrome.storage.local.remove(['token', 'accountEmail']);
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

    if (cmd === 'choose') {
      // 줄 이름(예: 「어린이제품인증」)으로 줄을 찾고, 그 줄 안에서 글자가 정확히 같은 버튼(예: 「어린이제품 인증대상 아님」)을 누른다.
      // 카테고리에 따라 그 줄이 없으면 건너뛴다.
      const norm = (s) => s.replace(/\s+/g, '');
      const lab = [...document.querySelectorAll('label, th, .control-label, .title, span, div')].find((e) => e.children.length < 3 && norm(e.textContent).startsWith(norm(args.target)) && norm(e.textContent).length <= norm(args.target).length + 4 && visible(e));
      if (!lab) return { ok: true, skipped: true };
      for (let box = lab.parentElement, up = 0; box && up < 5; up++, box = box.parentElement) {
        const btn = [...box.querySelectorAll('button, a, label')].find((b) => visible(b) && norm(b.textContent) === norm(args.value));
        if (btn) { btn.scrollIntoView({ block: 'center' }); btn.click(); await sleep(500); return { ok: true }; }
      }
      return { ok: false, error: `「${args.value}」 버튼을 찾지 못했습니다.` };
    }

    if (cmd === 'unitPick') {
      // 혜택 단위(원·%·개) — 드롭다운 안 링크를 글자로 찾아 누른다(드롭다운이 닫혀 있어도 ng-click은 동작)
      const links = [...document.querySelectorAll('a[ng-click]')].filter((x) => x.getAttribute('ng-click').includes("'" + args.target + "'"));
      const link = links.find((x) => x.textContent.trim() === args.value);
      if (!link) return { ok: false, error: `단위 「${args.value}」를 찾지 못했습니다(보기 ${links.map((x) => x.textContent.trim()).join('·') || '없음'}).` };
      link.click();
      await sleep(300);
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
      // 앞 검색의 목록이 남아 있으면 그걸 새 결과로 착각한다(2026-10-27 실측) → 비우고 잠깐 기다린 뒤 입력
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(400);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, args.value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: args.value.slice(-1) }));
      const squash = (s) => String(s || '').replace(/\s+/g, '');
      const words = args.value.split(/\s+/).filter(Boolean);
      const options = await waitFor(() => {
        const list = [...document.querySelectorAll('.selectize-dropdown [data-selectable], .selectize-dropdown .option')].filter(visible);
        // 검색어의 마지막 낱말이 든 줄만 새 결과로 본다(남은 옛 목록·「결과 없음」 줄 제외)
        const fresh = list.filter((o) => squash(o.textContent).includes(squash(words[words.length - 1] || args.value)));
        return fresh.length ? fresh : null;
      }, 8000);
      if (!options) return { ok: false, error: `「${args.value}」 검색 결과가 나오지 않았습니다.` };
      const text = (o) => o.textContent.replace(/\s+/g, ' ').trim();
      // 상세페이지 경로(예: 패션잡화>남성가방>백팩>여행/노트북 백팩)와 앞에서부터 가장 길게 겹치는 줄 — 여성가방>백팩 같은 다른 갈래를 피한다
      let best = null;
      if (args.path) {
        const segs = args.path.split('>').map(squash);
        let bestN = 0;
        for (const o of options) {
          const os = text(o).split('>').map(squash);
          let n = 0; while (n < os.length && n < segs.length && os[n] === segs[n]) n++;
          if (n === os.length && n > bestN) { bestN = n; best = o; }
        }
      }
      const pick = best || (args.leaf && options.find((o) => text(o).endsWith(args.value))) || options.find((o) => text(o).includes(args.value)) || options[0];
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
      const open = document.querySelector('a[ng-click="vm.openUploadModal()"][data-nclicks-code="image.repre"]') || document.querySelector('a[ng-click="vm.openUploadModal()"]');
      if (!open) return { ok: false, error: '「이미지 등록」 버튼을 찾지 못했습니다.' };
      open.scrollIntoView({ block: 'center' });
      open.click();
      const input = await waitFor(() => document.querySelector('input[type=file][ngf-select*="uploadImagesFromDevice"]'), 8000);
      if (!input) return { ok: false, error: '사진 올리기 칸을 찾지 못했습니다.' };
      await putFile(input, args);
      const done = await waitFor(() => !document.querySelector('.modal.in input[type=file][ngf-select*="uploadImagesFromDevice"]'), 20000);
      return done ? { ok: true } : { ok: false, error: '대표 이미지 올리기가 끝나지 않았습니다.' };
    }

    if (cmd === 'extraImages') {
      // 추가 이미지(최대 9장): 「이미지 등록」(data-nclicks-code="image.add") → 「내 사진」 파일 칸에 여러 장 한 번에(창 1회 총 20MB 이하로 나눠 받음)
      const links = [...document.querySelectorAll('a[ng-click="vm.openUploadModal()"]')];
      const open = links.find((a) => a.getAttribute('data-nclicks-code') === 'image.add') || links[1];
      if (!open) return { ok: false, error: '추가 이미지 「이미지 등록」 버튼을 찾지 못했습니다(이미 9장이 찼을 수 있음).' };
      const list = open.closest('ul.img-list');
      const countImgs = () => (list ? list.querySelectorAll('li img').length : 0);
      const before = countImgs();
      open.scrollIntoView({ block: 'center' });
      open.click();
      const input = await waitFor(() => document.querySelector('.modal.in input[type=file][ngf-select*="uploadImagesFromDevice"]') || document.querySelector('input[type=file][ngf-select*="uploadImagesFromDevice"]'), 8000);
      if (!input) return { ok: false, error: '추가 이미지 사진 올리기 칸을 찾지 못했습니다.' };
      const dt = new DataTransfer();
      for (const f of args.files) dt.items.add(new File([Uint8Array.from(atob(f.data), (ch) => ch.charCodeAt(0))], f.name, { type: f.mime }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const done = await waitFor(() => !document.querySelector('.modal.in input[type=file][ngf-select*="uploadImagesFromDevice"]'), 30000);
      if (!done) return { ok: false, error: '추가 이미지 올리기가 끝나지 않았습니다.' };
      if (list) {
        const grew = await waitFor(() => countImgs() > before, 10000);
        if (!grew) return { ok: false, error: '추가 이미지가 목록에 보이지 않습니다.' };
      }
      return { ok: true, added: countImgs() - before };
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
        // 「상품속성 미입력 확인」(상품속성을 입력해 보시겠어요?) — 선택 항목이라 「다음에 할래요」로 넘긴다(2026-10-27 실제 시험에서 등록을 막던 창)
        const later = [...document.querySelectorAll('.modal.in, [role="dialog"]')].filter(visible).flatMap((m) => [...m.querySelectorAll('button, a')]).find((b) => visible(b) && b.textContent.replace(/\s+/g, '') === '다음에할래요');
        if (later) { later.click(); await sleep(800); continue; }
        const text = notes().join(' / ');
        if (location.hash !== startHash && !/products\/create/.test(location.hash)) verdict = { state: 'success', message: text };
        else if (/(등록|저장)\s*(이|가)?\s*(완료|되었)|임시저장\s*(이|가)?\s*(완료|되었)/.test(text)) verdict = { state: 'success', message: text };
        else if (/입력해\s*주세요|선택해\s*주세요|확인해\s*주세요|필수|오류|실패|할 수 없|올바르지/.test(text)) verdict = { state: 'error', message: text };
      }
      const message = (verdict?.message || notes().join(' / ')).slice(0, 300);
      // 완료 창(「상품저장이 완료되었습니다」)의 「스마트스토어 상품보기」 링크 주소에 상품번호가 있다
      const viewHref = [...document.querySelectorAll('.modal.in a[href], [role="dialog"] a[href]')].map((a) => a.href).find((h) => /products\/[0-9]{6,}/.test(h)) || '';
      const no = (message.match(/상품번호[^0-9]*([0-9]{6,})/) || viewHref.match(/products\/([0-9]{6,})/) || location.href.match(/products\/(?:edit\/)?([0-9]{6,})/) || [])[1] || null;
      if (verdict?.state === 'success') return { ok: true, confirmed: true, message, productNo: no };
      if (verdict?.state === 'error') return { ok: false, error: `판매자센터가 저장을 거절했습니다: ${message || '오류 안내'}` };
      // 성공도 오류 안내도 없으면 — 화면 전체에서 「잘못됨」(ng-invalid) 칸을 찾아 칸 이름으로 남긴다(회원이 스크롤해 찾지 않게)
      const bad = [...document.querySelectorAll('input.ng-invalid, textarea.ng-invalid, select.ng-invalid, [ng-model].ng-invalid')]
        .filter((e) => !e.closest('form.ng-invalid > form') && (visible(e) || visible(e.parentElement)))
        .map((e) => { const n = fieldName(e) || (e.closest('.title-line, .panel, section')?.querySelector('.title-line label, h3, .title')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30); const why = [...e.classList].filter((c) => c.startsWith('ng-invalid-')).map((c) => c.slice(11)).join(','); return `${n || e.getAttribute('ng-model') || '이름 모름'}${why ? `(${why})` : ''}`; });
      const uniq = [...new Set(bad)].slice(0, 8);
      if (uniq.length) return { ok: false, error: `저장되지 않았습니다 — 판매자센터가 잘못됐다고 표시한 칸: ${uniq.join(' / ')}` };
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

// 옵션 — 판매자센터 「엑셀 일괄등록」(2026-10-27 v1.12). 옵션 칸 화면 템플릿이 저장본에 없어 화면 글자와 옵션 칸 범위로 찾는다.
// 「엑셀 일괄등록하기」는 파일 고르는 창을 띄우므로 에디터 사진처럼 파일 칸 click()을 잠깐 가로채 파일을 넣는다.
async function optionsMain(a) {
  // 카테고리를 바꾸면 옛 칸이 보이지 않은 채 문서에 남는다(2026-10-28 실측) → 같은 id 중 보이는 쪽만 쓴다
  const _vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const vid = (id) => { const all = [...document.querySelectorAll('[id="' + id + '"]')]; return all.find((e) => _vis(e) || _vis(e.parentElement) || _vis(document.querySelector('label[for="' + id + '"]'))) || null; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const modalText = () => [...document.querySelectorAll('.modal.in, [role="dialog"], [role="alertdialog"]')].filter(visible).map((m) => norm(m.textContent).slice(0, 160)).join(' / ');
  const title = [...document.querySelectorAll('.title-line label')].find((l) => _vis(l) && norm(l.textContent).startsWith('옵션'));
  if (!title) return { ok: false, error: '「옵션」 칸을 찾지 못했습니다.' };
  const byText = (root, sel, text) => [...root.querySelectorAll(sel)].find((b) => visible(b) && norm(b.textContent) === text);
  let card = title.closest('.title-line') || title;
  for (let i = 0; i < 8 && card && !byText(card, 'button, a, label', '설정함'); i++) card = card.parentElement;
  if (!card) return { ok: false, error: '옵션 「설정함」 버튼을 찾지 못했습니다.' };
  byText(card, 'button, a, label', '설정함').click();
  await sleep(800);
  const pick = async (text) => {
    const lab = [...card.querySelectorAll('label, span')].find((l) => visible(l) && norm(l.textContent) === text);
    if (!lab) return false;
    const input = (lab.tagName === 'LABEL' && (lab.querySelector('input') || (lab.htmlFor && document.getElementById(lab.htmlFor)))) || lab.closest('label')?.querySelector('input') || null;
    (input || lab).click();
    await sleep(600);
    return true;
  };
  if (!(await pick('엑셀 일괄등록'))) return { ok: false, error: '옵션 입력방식 「엑셀 일괄등록」을 찾지 못했습니다.' };
  if (!(await pick(a.type === 'simple' ? '단독형' : '조합형'))) return { ok: false, error: '옵션 구성타입 단독형/조합형을 찾지 못했습니다.' };
  const btn = byText(card, 'button, a', '엑셀 일괄등록하기');
  if (!btn) return { ok: false, error: '「엑셀 일괄등록하기」 버튼을 찾지 못했습니다.' };

  const orig = HTMLInputElement.prototype.click;
  let captured = null;
  HTMLInputElement.prototype.click = function () { if (this.type === 'file') { captured = this; return; } return orig.call(this); };
  try {
    btn.click();
    for (let t = 0; t < 40 && !captured; t++) {
      await sleep(100);
      if (!captured) captured = [...document.querySelectorAll('.modal.in input[type=file], [role="dialog"] input[type=file]')].find((el) => /xls|excel|sheet/i.test((el.accept || '') + (el.getAttribute('ngf-pattern') || '') + (el.getAttribute('ngf-select') || ''))) || null;
    }
  } finally {
    HTMLInputElement.prototype.click = orig;
  }
  if (!captured) return { ok: false, error: '엑셀 파일 칸을 찾지 못했습니다.' + (modalText() ? ' 화면 안내: ' + modalText() : '') };
  const bytes = Uint8Array.from(atob(a.file.data), (c) => c.charCodeAt(0));
  const dt = new DataTransfer();
  dt.items.add(new File([bytes], a.file.name, { type: a.file.mime }));
  captured.files = dt.files;
  captured.dispatchEvent(new Event('input', { bubbles: true }));
  captured.dispatchEvent(new Event('change', { bubbles: true }));

  // 결과: 옵션목록 「(총 N개)」가 0보다 커지면 성공. 확인 창이 뜨면 글자를 보고 「확인」만 누른다.
  for (let t = 0; t < 60; t++) {
    await sleep(250);
    const m = norm(card.textContent).match(/총\s*(\d+)\s*개/);
    if (m && Number(m[1]) > 0) return { ok: true, count: Number(m[1]), expected: a.rows };
    const dlg = [...document.querySelectorAll('.modal.in, [role="dialog"], [role="alertdialog"]')].find((d) => visible(d) && /옵션|엑셀|적용|등록/.test(d.textContent));
    if (dlg && /실패|오류|올바르지|확인해\s*주세요|없습니다/.test(dlg.textContent)) return { ok: false, error: '엑셀 일괄등록 거절 — ' + norm(dlg.textContent).slice(0, 200) };
    if (dlg) { const okBtn = [...dlg.querySelectorAll('button')].find((b) => /^(확인|적용|등록)$/.test(norm(b.textContent))); if (okBtn) { okBtn.click(); await sleep(600); } }
  }
  return { ok: false, error: '옵션목록에 줄이 생기지 않았습니다.' + (modalText() ? ' 화면 안내: ' + modalText() : '') };
}

// 검색설정 태그(2026-10-27 v1.14) — 「태그를 입력해주세요.」 selectize 상자(select[ng-model="vm.directInputTag"])에 하나씩 추가.
// selectize 인스턴스가 있으면 createItem, 없으면 입력칸에 글자를 넣고 Enter. 결과는 숨은 칸 seoInfo.sellerTags 또는 화면의 태그 수로 확인.
async function tagsMain(a) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sel = document.querySelector('select[ng-model="vm.directInputTag"]');
  if (!sel) return { ok: false, error: '검색 태그 입력 상자를 찾지 못했습니다(「검색설정」 칸이 접혀 있을 수 있음).' };
  const box = sel.parentElement;
  const shownCount = () => (box?.querySelectorAll('.selectize-input .item').length || 0);
  const before = shownCount();
  const inst = sel.selectize;
  if (inst) inst.__ssrStart = inst.items.length;
  const input = box?.querySelector('.selectize-input input');
  const rejected = [];
  // 판매자센터가 카테고리·브랜드가 든 태그를 「태그로 등록할 수 없는 단어」 창으로 거절한다(2026-10-27 실측) → 단어를 기록하고 「확인」으로 닫는다
  const closeReject = async () => {
    await sleep(500);
    const m = [...document.querySelectorAll('.modal, [role="dialog"], .layer, div')].filter((e) => e.offsetParent !== null && /태그로 등록할 수 없는/.test(e.textContent || '') && e.querySelector('button')).pop(); // 가장 안쪽 상자
    if (!m) return;
    const w = (m.textContent.match(/태그 불가 단어\s*:?\s*([^\s]+?)(?:카테고리|$|\s)/) || [])[1];
    if (w && !rejected.includes(w)) rejected.push(w);
    const ok = [...m.querySelectorAll('button')].find((b) => b.textContent.trim() === '확인') || m.querySelector('button');
    ok?.click();
    await sleep(400);
  };
  for (const tag of a.tags) {
    if (inst && typeof inst.createItem === 'function') {
      const before1 = inst.items.length;
      try { inst.setTextboxValue ? inst.setTextboxValue(tag) : null; inst.createItem(tag, () => {}); } catch (e) { /* 아래에서 다시 */ }
      await sleep(400);
      if (inst.items.length === before1) {
        const vf = inst.settings.valueField || 'value', lf = inst.settings.labelField || 'text';
        try { inst.addOption({ [vf]: tag, [lf]: tag }); inst.addItem(tag); } catch (e) { /* 확인에서 실패로 */ }
      }
    } else if (input) {
      input.focus();
      input.value = tag;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(150);
      // 크롬은 new KeyboardEvent의 keyCode·which를 0으로 만든다 → selectize가 Enter로 알아보도록 직접 붙인다
      for (const type of ['keydown', 'keypress', 'keyup']) {
        const ev = new KeyboardEvent(type, { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true });
        Object.defineProperty(ev, 'keyCode', { get: () => 13 });
        Object.defineProperty(ev, 'which', { get: () => 13 });
        input.dispatchEvent(ev);
      }
      if (window.jQuery) { try { window.jQuery(input).trigger(window.jQuery.Event('keydown', { keyCode: 13, which: 13 })); } catch (e) { /* 무시 */ } }
    } else return { ok: false, error: '태그 입력칸을 찾지 못했습니다.' };
    await sleep(600);
    await closeReject();
  }
  await sleep(800);
  const added = Math.max(shownCount() - before, inst ? inst.items.length - (inst.__ssrStart ?? 0) : 0);
  // 화면 표시와 별개로 판매자센터 값(seoInfo.sellerTags)에 들어갔는지도 본다
  let saved = -1;
  try { const h = document.querySelector('input[ng-model="vm.product.detailAttribute.seoInfo.sellerTags"]'); const c = h && window.angular ? window.angular.element(h).controller('ngModel') : null; if (c && Array.isArray(c.$modelValue)) saved = c.$modelValue.length; } catch (e) { /* 무시 */ }
  // 이 화면은 태그를 입력칸 아래 「# 여행백팩」 칩으로 따로 보여 준다 → 칩 수도 센다
  const area = sel.closest('fieldset') || box?.parentElement?.parentElement || document;
  const chips = [...area.querySelectorAll('span, li, a, div')].filter((e) => e.children.length <= 2 && /^#\s*\S/.test((e.textContent || '').trim()) && e.offsetParent !== null).length;
  const count = Math.max(added, saved, chips);
  if (count <= 0 && !rejected.length) return { ok: false, error: `태그가 화면에 추가되지 않았습니다(${inst ? '상자 연결됨' : '상자 연결 없음 — Enter 입력'}).` };
  return { ok: true, added: count, expected: a.tags.length, rejected };
}

// 카테고리별 상품속성(2026-10-27 v1.14) — 「상품속성」 표(ncp-product-attribute-table)에서 속성 이름이 같은 줄을 찾아
// 그 줄의 고르기 상자(selectize·select)·체크/라디오·글자 칸에 값을 넣는다. 표는 카테고리를 고른 뒤 그려지므로 칸 이름이 아니라 화면 글자로 찾는다.
async function attributesMain(a) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || '').replace(/\s+/g, '').trim();
  const visible = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const table = document.querySelector('ncp-product-attribute-table') || document.getElementById('anchor-product-attribute')?.closest('.form-sub-wrap');
  if (!table) return { ok: false, error: '「상품속성」 표를 찾지 못했습니다(카테고리를 먼저 골라야 나타남).' };
  table.scrollIntoView({ block: 'center' });
  const done = [], missed = [];
  for (const { name, value } of a.pairs) {
    const head = [...table.querySelectorAll('th, td, label, dt, span, strong, div')].find((e) => e.children.length < 3 && visible(e) && norm(e.textContent).replace(/[*필수]/g, '') === norm(name));
    if (!head) { missed.push(name + '(속성 없음)'); continue; }
    const row = head.closest('tr') || head.closest('li') || head.parentElement?.parentElement || head.parentElement;
    let ok = false;
    // 1) selectize 고르기 상자: 목록을 열고 글자가 같은(없으면 포함하는) 보기를 누른다
    const sz = row.querySelector('.selectize-control');
    if (!ok && sz) {
      sz.querySelector('.selectize-input')?.click();
      await sleep(400);
      const opts = [...document.querySelectorAll('.selectize-dropdown .option')].filter(visible);
      const pick = opts.find((o) => norm(o.textContent) === norm(value)) || opts.find((o) => norm(o.textContent).includes(norm(value)));
      if (pick) { pick.click(); ok = true; } else document.body.click();
    }
    // 2) 진짜 select
    const sel = row.querySelector('select:not(.selectized)');
    if (!ok && sel) {
      const o = [...sel.options].find((x) => norm(x.textContent) === norm(value)) || [...sel.options].find((x) => norm(x.textContent).includes(norm(value)));
      if (o) { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); ok = true; }
    }
    // 3) 체크/라디오: 값 여러 개는 쉼표로
    if (!ok) {
      const wants = String(value).split(',').map(norm).filter(Boolean);
      const labels = [...row.querySelectorAll('label')].filter((l) => visible(l) && wants.includes(norm(l.textContent)));
      for (const l of labels) { const inp = l.querySelector('input') || (l.htmlFor && document.getElementById(l.htmlFor)); if (!inp || !inp.checked) l.click(); ok = true; await sleep(150); }
    }
    // 4) 글자 칸
    const txt = row.querySelector('input[type=text]:not([readonly]), input:not([type]), textarea');
    if (!ok && txt && visible(txt)) {
      const ng = window.angular; const ctrl = ng ? ng.element(txt).controller('ngModel') : null;
      if (ctrl) { ctrl.$setViewValue(String(value)); ctrl.$render(); } else { txt.value = String(value); txt.dispatchEvent(new Event('input', { bubbles: true })); }
      txt.dispatchEvent(new Event('change', { bubbles: true }));
      ok = true;
    }
    await sleep(300);
    (ok ? done : missed).push(ok ? name : name + '(「' + value + '」 보기 없음)');
  }
  return { ok: true, done, missed };
}

// 직접입력형 옵션(2026-10-27 v1.14) — 「직접입력형」 설정함(#option_direct_type_true) → 옵션명 개수(selectize vm.customOptionNameCount) → 이름 칸 #custom_option_name0.. 에 넣기.
// 이름 칸은 ng-model-options debounce라 모델에 바로 반영(commit)하고 모델 값으로 확인한다.
async function customOptionsMain(a) {
  // 카테고리를 바꾸면 옛 칸이 보이지 않은 채 문서에 남는다(2026-10-28 실측) → 같은 id 중 보이는 쪽만 쓴다
  const _vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const vid = (id) => { const all = [...document.querySelectorAll('[id="' + id + '"]')]; return all.find((e) => _vis(e) || _vis(e.parentElement) || _vis(document.querySelector('label[for="' + id + '"]'))) || null; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ng = window.angular;
  const on = vid('option_direct_type_true');
  if (!on) return { ok: false, error: '「직접입력형」 설정 버튼을 찾지 못했습니다(옵션 칸이 접혀 있을 수 있음).' };
  ([...document.querySelectorAll('label[for="option_direct_type_true"]')].find(_vis) || on).click();
  await sleep(700);
  const countSel = document.querySelector('input[ng-model="vm.customOptionNameCount"]');
  if (a.names.length > 1 && countSel?.selectize) { countSel.selectize.setValue(String(a.names.length)); await sleep(600); }
  let root = null;
  try { root = ng.element(document.body).injector().get('$rootScope'); } catch (e) { root = null; }
  const apply = (fn) => { if (!root || root.$$phase) fn(); else root.$apply(fn); };
  for (let i = 0; i < a.names.length; i++) {
    const el = vid('custom_option_name' + i);
    if (!el) return { ok: false, error: '직접입력형 옵션명 칸 ' + (i + 1) + '번을 찾지 못했습니다.' };
    const ctrl = ng ? ng.element(el).controller('ngModel') : null;
    if (ctrl) {
      apply(() => { ctrl.$setViewValue(a.names[i]); ctrl.$render(); });
      try { if (ctrl.$commitViewValue) apply(() => ctrl.$commitViewValue()); } catch (e) { /* 무시 */ }
      if (String(ctrl.$modelValue || '') !== a.names[i]) return { ok: false, error: '직접입력형 옵션명이 들어가지 않았습니다(' + a.names[i] + ').' };
    } else {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, a.names[i]);
      for (const t of ['input', 'change', 'blur']) el.dispatchEvent(new Event(t, { bubbles: true }));
    }
    await sleep(300);
  }
  return { ok: true };
}

// 추가상품(2026-10-27 v1.14) — 「선택형」 설정함(#supplement_true) → 직접 입력하기 → 줄마다 추가상품명·값·가격 → 「목록으로 적용」 → 목록 「총 N개」 확인.
async function supplementsMain(a) {
  // 카테고리를 바꾸면 옛 칸이 보이지 않은 채 문서에 남는다(2026-10-28 실측) → 같은 id 중 보이는 쪽만 쓴다
  const _vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const vid = (id) => { const all = [...document.querySelectorAll('[id="' + id + '"]')]; return all.find((e) => _vis(e) || _vis(e.parentElement) || _vis(document.querySelector('label[for="' + id + '"]'))) || null; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ng = window.angular;
  const norm = (s) => (s || '').replace(/\s+/g, '');
  let on = vid('supplement_true');
  if (!on) {
    const head = [...document.querySelectorAll('.title-line')].find((l) => (l.querySelector('label')?.textContent || '').replace(/\s+/g, '').startsWith('추가상품'));
    if (head) { head.scrollIntoView({ block: 'center' }); (head.querySelector('.input-content') || head).click(); await sleep(1000); }
    on = vid('supplement_true');
  }
  if (!on) {
    const why = [...document.querySelectorAll('p, div, span')].filter((e) => _vis(e) && (e.textContent || '').length < 200 && /추가상품 설정이 불가/.test(e.textContent || '')).pop();
    return { ok: false, error: why ? why.textContent.trim().slice(0, 120) : '추가상품 「설정함」 버튼을 찾지 못했습니다(추가상품 칸이 접혀 있거나 이 카테고리에서 쓸 수 없음).' };
  }
  if (!on.checked) { (on.parentElement?.querySelector('label[for="supplement_true"]') || on).click(); await sleep(700); }
  const direct = [...document.querySelectorAll('input[ng-model="vm.suppleInputType"]')].find((x) => x.value === 'direct' && (_vis(x) || _vis(x.parentElement)));
  if (direct && !direct.checked) { (direct.closest('label') || direct).click(); await sleep(500); }
  let root = null;
  try { root = ng.element(document.body).injector().get('$rootScope'); } catch (e) { root = null; }
  const apply = (fn) => { if (!root || root.$$phase) fn(); else root.$apply(fn); };
  const put = (el, v) => {
    const ctrl = ng ? ng.element(el).controller('ngModel') : null;
    if (!ctrl) { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); for (const t of ['input', 'change', 'blur']) el.dispatchEvent(new Event(t, { bubbles: true })); return true; }
    apply(() => { ctrl.$setViewValue(v); ctrl.$render(); });
    try { if (ctrl.$commitViewValue) apply(() => ctrl.$commitViewValue()); } catch (e) { /* 무시 */ }
    return String(ctrl.$modelValue ?? '') === v;
  };
  for (let i = 0; i < a.groups.length; i++) {
    if (i > 0 && !vid('supple_group_name' + i)) {
      const plus = [...document.querySelectorAll('a[ng-click="vm.addSuppleInput()"]')].filter(_vis).pop();
      if (!plus) return { ok: false, error: '추가상품 줄 추가 버튼을 찾지 못했습니다.' };
      plus.click(); await sleep(500);
    }
    const g = a.groups[i];
    const cells = [['supple_group_name', g.name], ['supple_names', g.values.join(',')], ['supple_prices', g.prices.join(',')]];
    for (const [id, v] of cells) {
      const el = vid(id + i);
      if (!el) return { ok: false, error: `추가상품 ${i + 1}번째 줄 칸을 찾지 못했습니다.` };
      if (!put(el, v)) return { ok: false, error: `추가상품 「${g.name}」 값이 들어가지 않았습니다.` };
      await sleep(250);
    }
  }
  await sleep(400);
  const btn = [...document.querySelectorAll('a, button')].find((b) => _vis(b) && norm(b.textContent) === '목록으로적용' && b.closest('[ng-show="vm.isConfig"], fieldset, div'));
  if (!btn) return { ok: false, error: '「목록으로 적용」 버튼을 찾지 못했습니다.' };
  btn.scrollIntoView({ block: 'center' });
  btn.click();
  await sleep(1500);
  const lab = [...document.querySelectorAll('label')].find((l) => _vis(l) && norm(l.textContent).startsWith('추가상품목록'));
  const n = Number(lab?.querySelector('em')?.textContent || 0);
  if (n !== a.expect) return { ok: false, error: `추가상품 목록이 ${n}개입니다(기대 ${a.expect}개). 판매자센터에서 확인해 주세요.` };
  return { ok: true };
}

// 예약구매(2026-10-27 v1.14) — 「설정함」 → 주문기간(달력 칸 2개) → 기간 끝난 뒤 상태. 달력 칸은 읽기 전용이라 모델에 넣고 화면 값으로 확인한다.
async function preOrderMain(a) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ng = window.angular;
  const on = document.getElementById('preOrder1_1');
  if (!on) return { ok: false, error: '예약구매 「설정함」 버튼을 찾지 못했습니다(예약구매 칸이 접혀 있을 수 있음).' };
  if (!on.checked) { (document.querySelector('label[for="preOrder1_1"]') || on).click(); await sleep(900); }
  const scope = on.closest('fieldset')?.parentElement || document;
  const dates = [...scope.querySelectorAll('input[ng-model="vm.startDateModel"], input[ng-model="vm.endDateModel"]')].slice(0, 2);
  if (dates.length < 2) return { ok: false, error: '예약구매 주문기간 칸을 찾지 못했습니다.' };
  let root = null;
  try { root = ng.element(document.body).injector().get('$rootScope'); } catch (e) { root = null; }
  const apply = (fn) => { if (!root || root.$$phase) fn(); else root.$apply(fn); };
  const vals = [a.start, a.end];
  for (let i = 0; i < 2; i++) {
    const el = dates[i];
    const ctrl = ng ? ng.element(el).controller('ngModel') : null;
    // 화면에 이미 쓰인 날짜 모양(예: 2026.10.27.)을 따라 쓴다
    const sample = el.value || el.placeholder || '';
    const sep = (sample.match(/\d{4}([.\-/])/) || [])[1] || '.';
    const text = vals[i].replace(/-/g, sep) + (sample.trim().endsWith('.') ? '.' : '');
    if (ctrl) apply(() => { ctrl.$setViewValue(text); ctrl.$render(); });
    else { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('change', { bubbles: true })); }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(400);
    if (!(el.value || '').replace(/\D/g, '').startsWith(vals[i].replace(/\D/g, ''))) return { ok: false, error: '예약구매 주문기간이 들어가지 않았습니다 — 판매자센터 달력에서 직접 골라 주세요.' };
  }
  if (a.after) {
    const r = document.getElementById(a.after === 'SALE' ? 'afterSaleStatus2' : 'afterSaleStatus1');
    if (r && !r.checked) { (document.querySelector(`label[for="${r.id}"]`) || r).click(); await sleep(300); }
  }
  return { ok: true };
}

// 브랜드·제조사(2026-10-27 v1.15) — <ncp-brand-manufacturer-input model-type="brand|manufacturer"> 안의 숨은 칸(ng-model vm.bindModel, name …brandName/manufacturerName)에 넣고,
// 보이는 자동완성 상자(selectize)에도 같은 글자를 띄운다. 일반 글자 칸이 아니라 type 동작으로는 찾지 못했다(실제 시험).
async function brandInputMain(a) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ng = window.angular;
  const comp = document.querySelector('ncp-brand-manufacturer-input[model-type="' + a.kind + '"]');
  if (!comp) return { ok: false, error: (a.kind === 'brand' ? '브랜드' : '제조사') + ' 칸을 찾지 못했습니다.' };
  comp.scrollIntoView({ block: 'center' });
  const hidden = comp.querySelector('input[type=hidden][ng-model="vm.bindModel"]');
  const ctrl = hidden && ng ? ng.element(hidden).controller('ngModel') : null;
  if (!ctrl) return { ok: false, error: '숨은 칸을 찾지 못했습니다.' };
  let root = null;
  try { root = ng.element(document.body).injector().get('$rootScope'); } catch (e) { root = null; }
  const apply = (fn) => { if (!root || root.$$phase) fn(); else root.$apply(fn); };
  const sel = comp.querySelector('input[selectize]');
  const inst = sel && sel.selectize;
  if (inst) {
    try {
      const vf = inst.settings.valueField || 'value', lf = inst.settings.labelField || 'text';
      inst.addOption({ [vf]: a.value, [lf]: a.value });
      inst.setValue(a.value, true);
    } catch (e) { /* 표시만 실패 — 값은 아래에서 넣는다 */ }
  }
  apply(() => { ctrl.$setViewValue(a.value); ctrl.$render(); });
  await sleep(300);
  if (String(ctrl.$modelValue ?? '') !== a.value) return { ok: false, error: '값이 들어가지 않았습니다.' };
  return { ok: true };
}

// 옵션 상태 읽기(2026-10-28) — 카테고리 화면 갱신으로 옵션·직접입력형이 지워졌는지 마지막에 확인한다
function optionStateMain() {
  // 카테고리를 바꾸면 옛 칸이 보이지 않은 채 문서에 남는다(2026-10-28 실측) → 같은 id 중 보이는 쪽만 쓴다
  const _vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const vid = (id) => { const all = [...document.querySelectorAll('[id="' + id + '"]')]; return all.find((e) => _vis(e) || _vis(e.parentElement) || _vis(document.querySelector('label[for="' + id + '"]'))) || null; };
  const lab = [...document.querySelectorAll('label, div, span')].find((e) => _vis(e) && e.children.length < 4 && /^옵션목록\s*\(총/.test((e.textContent || '').trim()));
  const m = lab ? (lab.textContent || '').match(/총\s*(\d+)\s*개/) : null;
  const custom = vid('option_direct_type_true');
  return { ok: true, optionCount: m ? Number(m[1]) : -1, customOn: !!(custom && custom.checked) };
}

// 옵션 진단(2026-10-28, 읽기만) — 옵션목록 글자·직접입력형 칸이 문서에 몇 개 있고 어느 것이 보이는지
function optionDiagMain() {
  const vis = (el) => !!el && !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  const lists = [...document.querySelectorAll('label, div, span, p, strong, em')]
    .filter((e) => e.children.length < 4 && /^옵션목록\s*\(총/.test((e.textContent || '').trim()))
    .map((e) => `${e.tagName.toLowerCase()}${vis(e) ? '보임' : '숨김'}:${((e.textContent || '').match(/총\s*(\d+)/) || [])[1]}`);
  const ids = [...document.querySelectorAll('[id="option_direct_type_true"]')]
    .map((e) => `${e.tagName.toLowerCase()}/${e.type || ''}${vis(e) ? '보임' : '숨김'}${vis(e.parentElement) ? '+부모보임' : ''}${e.checked ? '+켜짐' : ''}`);
  const labs = [...document.querySelectorAll('label[for="option_direct_type_true"]')].map((l) => (vis(l) ? '보임' : '숨김'));
  const custHead = [...document.querySelectorAll('label, th, div, span')].find((e) => e.children.length < 3 && vis(e) && (e.textContent || '').trim() === '직접입력형');
  let btns = '';
  for (let box = custHead?.parentElement, up = 0; box && up < 4 && !btns; up++, box = box.parentElement) {
    const b = [...box.querySelectorAll('button, a, label, input')].filter((x) => vis(x) && /설정함|설정안함/.test(x.textContent || x.value || ''));
    if (b.length) btns = b.map((x) => `${x.tagName.toLowerCase()}${x.getAttribute('for') ? '[for=' + x.getAttribute('for') + ']' : ''}${x.getAttribute('ng-click') ? '[click=' + x.getAttribute('ng-click').slice(0, 40) + ']' : ''}:${(x.textContent || '').trim()}`).join(',');
  }
  return { ok: true, text: `옵션목록[${lists.join(' ')}] 직접입력형id[${ids.join(' ')}] 라벨[${labs.join(',')}] 버튼[${btns || '못찾음'}]` };
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
    el = all.find(visible) || (a.label ? null : all[0]) || null;
    // 상품군마다 칸 이름이 달라지는 고시 칸은 화면 글자(라벨)로 한 번 더 찾는다 — 그 줄 안의 보이는 글자 입력칸
    if (!el && a.label) {
      const norm = (s) => s.replace(/\s+/g, '');
      const lab = [...document.querySelectorAll('label, th, .control-label, span, div')].find((e) => e.children.length < 4 && norm(e.textContent).startsWith(norm(a.label)) && visible(e));
      for (let box = lab?.parentElement, up = 0; box && up < 6 && !el; up++, box = box.parentElement) {
        // 라벨 「뒤에」 오는 칸만(위쪽 「제조자(사)」 검색 칸 등을 잘못 고르지 않게)
        el = [...box.querySelectorAll('input[type=text], input[type=tel], input:not([type])')].find((x) => visible(x) && !x.readOnly && !x.disabled && (lab.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING) && !x.closest('.selectize-control')) || null;
      }
    }
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
    // 기존 탭을 옮기면(칸이 채워진 등록 화면이면) 판매자센터가 「저장하지 않고 나가면 유실됩니다」 브라우저 확인 창을 띄워
    // 작업이 멈춘다 → 그 탭을 닫고(확인 창 없음) 같은 창·같은 자리에 새 탭을 연다
    await chrome.tabs.remove(existing.id).catch(() => {});
    tab = await chrome.tabs.create({ url: CREATE_URL, active: true, windowId: existing.windowId, index: existing.index });
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
    // 옵션이 어느 단계에서 지워지는지 찾기 위한 기록(2026-10-28) — 칸마다 옵션목록 개수가 바뀌면 적는다
    const optTrace = [];
    let lastOpt = null;
    const traceOpt = async (k) => {
      if (!job.optionFile) return;
      const st = await runMain(tabId, optionStateMain, {}).catch(() => null);
      const c = st?.optionCount ?? -1;
      if (c !== lastOpt) { optTrace.push(`${k}:${c}`); lastOpt = c; }
    };
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
      else if (step.action === 'type') r = await runMain(tabId, ngTypeMain, { target: step.target, value: step.value, ...(step.key === 'notice_phone' ? { label: 'A/S 책임자 또는 소비자 상담' } : {}) });
      else if (step.action === 'type_label') r = await runMain(tabId, ngTypeMain, { target: '__by_label__', label: step.target, value: step.value });
      else if (step.action === 'radio') r = await run(tabId, 'radio', { target: step.target, value: step.value });
      else if (step.action === 'check') {
        r = await run(tabId, 'check', { target: step.target });
        // 옛 서버가 만든 작업에는 고시 「A/S 책임자 전화번호」 단계가 없다 → 「상품상세 참조」 다음에 A/S 전화번호를 넣는다
        const asPhone = job.steps.find((s) => s.key === 'as_phone')?.value;
        if (r.ok && step.key === 'notice_ref' && asPhone && !job.steps.some((s) => s.key === 'notice_phone')) {
          await human();
          const p = await runMain(tabId, ngTypeMain, { target: 'vm.content.customerServicePhoneNumber', label: 'A/S 책임자 또는 소비자 상담', value: asPhone });
          if (!p.ok) failures.push(`고시 A/S 책임자 전화번호 — ${p.error}`);
        }
      }
      else if (step.action === 'select') r = await run(tabId, 'select', { target: step.target, value: step.value });
      else if (step.action === 'template') r = await run(tabId, 'deliveryTemplate', { value: step.value });
      else if (step.action === 'choose') r = await run(tabId, 'choose', { target: step.target, value: step.value });
      else if (step.action === 'search_pick') {
        if (step.key === 'origin' && step.value === '국산') continue; // 기본값이 국산 — 건드리지 않음
        if (step.key === 'delivery_tpl') { failures.push(`${step.label}(템플릿 고르기는 아직 수동)`); continue; } // 옛 작업 기록 호환
        const isCat = step.key === 'category';
        const kw = step.value.split('|').pop().trim();
        if (!isCat) r = await run(tabId, 'pick', { target: step.target, value: kw, leaf: false, verifyText: null });
        else {
          // 후보: 입력한 검색어 → 그 마지막 낱말 → 상세페이지 경로의 단계(뒤에서부터). 경로와 겹치는 줄을 우선 고른다.
          const segs = (step.path || '').split('>').map((s) => s.trim()).filter(Boolean).reverse();
          const cands = [...new Set([kw, kw.split(/\s+/).pop(), ...segs].filter(Boolean))].slice(0, 5);
          for (const c of cands) {
            r = await run(tabId, 'pick', { target: step.target, value: c, leaf: true, path: step.path || '', verifyText: '선택한 카테고리' });
            if (r.ok) {
              if (c !== kw) r.note = `「${kw}」 대신 「${c}」로 골랐습니다`;
              // 카테고리를 바꾸면 판매자센터가 조금 늦게 화면을 다시 그리며 바로 뒤에 넣은 칸(판매가·직접입력형)을 비운다(2026-10-27 실측) → 가라앉을 때까지 기다린다
              await wait(3000);
              break;
            }
            await human();
          }
        }
      } else if (step.action === 'images') {
        if (!job.mainImage) { failures.push('대표 이미지(없음)'); continue; }
        r = await run(tabId, 'mainImage', await fetchAsset(job.mainImage));
      } else if (step.action === 'brand_input') {
        r = await runMain(tabId, brandInputMain, { kind: step.target, value: step.value });
      } else if (step.action === 'unit_pick') {
        r = await run(tabId, 'unitPick', { target: step.target, value: step.value });
      } else if (step.action === 'supplements') {
        let groups = []; try { groups = JSON.parse(step.value); } catch (e) { groups = []; }
        if (!groups.length) continue;
        r = await runMain(tabId, supplementsMain, { groups, expect: groups.reduce((n, g) => n + g.values.length, 0) });
      } else if (step.action === 'preorder') {
        let po = null; try { po = JSON.parse(step.value); } catch (e) { po = null; }
        if (!po) continue;
        r = await runMain(tabId, preOrderMain, po);
      } else if (step.action === 'custom_options') {
        let names = []; try { names = JSON.parse(step.value); } catch (e) { names = []; }
        if (!names.length) continue;
        r = await runMain(tabId, customOptionsMain, { names });
      } else if (step.action === 'attributes') {
        let pairs = []; try { pairs = JSON.parse(step.value); } catch (e) { pairs = []; }
        if (!pairs.length) continue;
        r = await runMain(tabId, attributesMain, { pairs });
        if (r.ok && r.missed?.length) failures.push('상품속성 — 직접 확인: ' + r.missed.join(', '));
      } else if (step.action === 'tags') {
        let tags = []; try { tags = JSON.parse(step.value); } catch (e) { tags = []; }
        if (!tags.length) continue;
        r = await runMain(tabId, tagsMain, { tags });
        if (r.ok && r.rejected?.length) failures.push('검색 태그 — 스마트스토어가 거절: ' + r.rejected.join(', ') + '(카테고리·브랜드·판매처 이름이 든 태그는 쓸 수 없음)');
        else if (r.ok && r.added < r.expected) failures.push('검색 태그 — ' + r.added + '개만 들어감(보낸 것 ' + r.expected + '개). 카테고리·브랜드가 들어간 태그는 스마트스토어가 받지 않습니다');
      } else if (step.action === 'options') {
        if (!job.optionFile) { failures.push('옵션(엑셀 파일을 받지 못함)'); continue; }
        r = await runMain(tabId, optionsMain, { file: job.optionFile, type: job.optionFile.type, rows: job.optionFile.rows });
        if (r.ok && r.expected && r.count !== r.expected) failures.push('옵션 — 목록 ' + r.count + '줄(보낸 것 ' + r.expected + '줄), 직접 확인해 주세요');
      } else if (step.action === 'extra_images') {
        if (!job.extraImages?.length) { failures.push('추가 이미지(받은 사진 없음)'); continue; }
        // 창 한 번에 총 20MB까지 — 18MB 이하 묶음으로 나눠 올린다
        const assets = [];
        for (const a of job.extraImages) assets.push(await fetchAsset(a));
        const batches = [[]]; let size = 0;
        for (const a of assets) { const bytes = a.data.length * 0.75; if (batches.at(-1).length && size + bytes > 18e6) { batches.push([]); size = 0; } batches.at(-1).push(a); size += bytes; }
        for (const [i, files] of batches.entries()) {
          await setStatus(`추가 이미지 ${i + 1}/${batches.length}묶음`);
          r = await run(tabId, 'extraImages', { files });
          if (!r.ok) break;
          await human();
        }
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
      await traceOpt(step.key);
      // 카테고리를 못 고르면 뒤 칸(대표이미지는 「먼저 카테고리를 선택해 주세요」, 판매가는 카테고리 변경 때 지워짐)이 줄줄이 틀어진다 → 여기서 멈춘다(2026-10-27 실측)
      if (!r?.ok && step.key === 'category') { failures.push('카테고리를 판매자센터에서 직접 고른 뒤 나머지 칸을 확인해 주세요(이후 칸은 넣지 않았습니다)'); break; }
    }

    // 카테고리 쪽 늦은 화면 갱신으로 지워졌을 수 있는 핵심 칸을 한 번 더 넣는다
    if (!failures.some((f) => f.startsWith('카테고리'))) {
      for (const key of ['price', 'discount_on', 'discount', 'stock']) {
        const s = job.steps.find((x) => x.key === key);
        if (!s) continue;
        await human();
        let rr;
        if (key === 'discount') { await wait(400); rr = await runMain(tabId, ngTypeMain, { discount: true, value: s.value }); }
        else if (s.action === 'radio') rr = await run(tabId, 'radio', { target: s.target, value: s.value });
        else rr = await runMain(tabId, ngTypeMain, { target: s.target, value: s.value });
        if (!rr?.ok && !failures.some((f) => f.startsWith(s.label))) failures.push(`${s.label} — 마지막 확인에서 다시 넣지 못했습니다${rr?.error ? `(${rr.error})` : ''}`);
      }
      // 옵션·직접입력형도 지워졌으면 다시 넣는다(2026-10-28 실측: 패션 카테고리에서 옵션목록 0개·직접입력형 설정안함으로 돌아감)
      const optStep = job.steps.find((x) => x.key === 'options');
      const cusStep = job.steps.find((x) => x.key === 'custom_options');
      if (optStep || cusStep) {
        await run(tabId, 'expand', { title: '옵션' });
        const st = await runMain(tabId, optionStateMain, {});
        if (optStep && job.optionFile && st?.optionCount !== job.optionFile.rows) {
          await human();
          const ro = await runMain(tabId, optionsMain, { file: job.optionFile, type: job.optionFile.type, rows: job.optionFile.rows });
          if (!ro?.ok || (ro.expected && ro.count !== ro.expected)) failures.push(`옵션 — 마지막 확인에서 목록이 ${st?.optionCount}줄이라 다시 넣었지만 맞지 않습니다${ro?.error ? `(${ro.error})` : ''}`);
        }
        if (cusStep && !st?.customOn) {
          let names = []; try { names = JSON.parse(cusStep.value); } catch (e) { names = []; }
          if (names.length) {
            await human();
            const rc = await runMain(tabId, customOptionsMain, { names });
            if (!rc?.ok) failures.push(`${cusStep.label} — 마지막 확인에서 다시 넣지 못했습니다${rc?.error ? `(${rc.error})` : ''}`);
          }
        }
      }
      // 추가상품은 옵션이 「색상/사이즈 간편 입력」이면 막힌다 → 옵션을 다시 넣은 뒤 한 번 더(2026-10-28 실측)
      const supStep = job.steps.find((x) => x.key === 'supplements');
      const supIdx = supStep ? failures.findIndex((f) => f.startsWith(supStep.label)) : -1;
      if (supIdx >= 0) {
        let groups = []; try { groups = JSON.parse(supStep.value); } catch (e) { groups = []; }
        if (groups.length) {
          await run(tabId, 'expand', { title: '추가상품' });
          await human();
          const rs = await runMain(tabId, supplementsMain, { groups, expect: groups.reduce((n, g) => n + g.values.length, 0) });
          if (rs?.ok) failures.splice(supIdx, 1);
          else failures[supIdx] = `${supStep.label} — ${rs?.error || '다시 넣지 못했습니다'}`;
        }
      }
    }

    await traceOpt('끝');
    if (job.optionFile || job.steps.some((x) => x.key === 'custom_options')) {
      const dg = await runMain(tabId, optionDiagMain, {}).catch(() => null);
      if (dg?.text) failures.push('진단 — ' + dg.text.slice(0, 400));
    }
    if (job.optionFile && lastOpt !== job.optionFile.rows) failures.push(`옵션 — 끝났을 때 목록 ${lastOpt}줄(보낸 것 ${job.optionFile.rows}줄). 개수 변화: ${optTrace.join(' → ')}`);

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
      let { accountEmail } = await chrome.storage.local.get('accountEmail');
      let latest = null;
      try { latest = (await fetch(API + '/api/extension/version', { cache: 'no-store' }).then((r) => r.json())).latest; } catch {}
      // 예전에 연결한 확장은 이메일을 모른다 → 한 번 물어서 저장(어느 계정과 연결됐는지 보여 주기)
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
