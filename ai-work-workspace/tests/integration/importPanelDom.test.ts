// @vitest-environment jsdom
// 2026-11-20(WS-IMPORT-PANEL-DOM-REGRESSION): 가져오기 완료 화면 회귀 — 실제 ImportPanel을 jsdom에 그려, 서버 응답 모양별로
// 「가져오기 완료」와 「저장됨 + 화면 일부는 새로 고침 뒤」 안내가 구분되어 보이는지, 추가 조회를 몇 번 하는지 확인한다.
// 서버 응답(lib/api.ts)만 모의한다. DB·서버·네트워크를 쓰지 않는다. 포인터 처리 규칙 자체(한도·연속 실패·빈 맵 종류)는
// importResponseSize.test.ts가 loadImportPending을 직접 불러 확인하므로 여기서는 화면에 이어지는 결과만 본다.
// 실제 브라우저의 모양(CSS·배치)과 실제 HTTP 응답 크기는 이 시험의 범위가 아니다.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

type Call = { name: string; params: any };
const calls: Call[] = [];
let answer: (name: string, params: any) => unknown = () => ({});

vi.mock('../../src/litpage/web/lib/api.ts', () => {
  class ApiError extends Error {
    status = 0;
  }
  return {
    ApiError,
    api: async (name: string, params: any) => {
      calls.push({ name, params });
      return answer(name, params);
    },
    uploadFile: async (_file: File, name: string) => ({ url: `/files/f1/${name}`, name }),
  };
});

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom에는 matchMedia가 없다(테마 저장소가 불러올 때 쓴다)
if (!window.matchMedia) (window as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });

const NOTICE = '가져온 내용은 모두 저장됐습니다. 일부를 이 화면에 불러오지 못했습니다. 페이지를 새로 고치면 보입니다.';
const ptr = (id: string) => ({ table: 'block', id });
const rec = (id: string, type = 'text') => ({ value: { value: { id, type, properties: { title: [[`제목 ${id}`]] }, alive: true }, role: 'editor' } });
/** importFiles 응답: 뿌리 쪽 하나 + 넘겨받은 추가 칸 */
const imported = (extra: Record<string, unknown> = {}) => ({ pageIds: ['p1'], pages: 1, databases: 0, recordMap: { __version__: 3, block: { p1: rec('p1', 'page') } }, ...extra });
/** fetchRecords 응답: 요청한 포인터를 그대로 돌려준다 */
const fetched = (params: any) => {
  const id = params.requests[0].pointer.id;
  return { recordMap: { __version__: 3, block: { [id]: rec(id) } } };
};

/** 패널을 그리고 파일 하나를 넣어 완료(또는 오류) 화면까지 기다린 뒤 화면 값을 읽는다 */
async function importOneFile() {
  const { ImportPanel } = await import('../../src/litpage/web/features/import/ImportPanel.tsx');
  const { useSession } = await import('../../src/litpage/web/lib/store/session.ts');
  useSession.setState({ spaceId: 's1' } as any);
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(createElement(ImportPanel, {}));
  });
  const input = host.querySelector('input[type=file]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [new File(['# 안녕하세요\n본문'], 'note.md', { type: 'text/markdown' })], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  for (let i = 0; i < 200 && !host.querySelector('.nc-import-results'); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  const seen = {
    done: !!host.querySelector('.nc-import-results'),
    title: host.querySelector('.nc-import-drop-title')?.textContent ?? '',
    notice: host.querySelector('.nc-import-drop-note')?.textContent ?? null,
    importCalls: calls.filter((c) => c.name === 'importFiles').length,
    fetchedIds: calls.filter((c) => c.name === 'fetchRecords').map((c) => c.params.requests.map((r: any) => r.pointer.id).join(',')),
  };
  await act(async () => root.unmount());
  host.remove();
  return seen;
}

describe('가져오기 완료 화면: 응답 모양별 안내와 추가 조회', () => {
  beforeEach(() => {
    calls.length = 0;
    localStorage.clear();
  });

  it.each([
    ['전체 응답', {}],
    ['줄인 응답(partial)', { partial: true }],
  ])('%s: 완료만 보이고 안내·추가 조회가 없다', async (_label, extra) => {
    answer = (name) => (name === 'importFiles' ? imported(extra) : {});
    const seen = await importOneFile();
    expect(seen).toEqual({ done: true, title: '가져오기 완료', notice: null, importCalls: 1, fetchedIds: [] });
  });

  it('못 실은 레코드(pending)를 모두 받으면 안내 없이 완료 — 포인터마다 한 번씩 조회', async () => {
    answer = (name, params) => (name === 'importFiles' ? imported({ partial: true, pending: [ptr('b1'), ptr('b2')] }) : fetched(params));
    const seen = await importOneFile();
    expect(seen).toEqual({ done: true, title: '가져오기 완료', notice: null, importCalls: 1, fetchedIds: ['b1', 'b2'] });
  });

  it('조회는 성공했지만 레코드가 오지 않으면 완료 + 안내 — 다시 조회하지 않는다', async () => {
    answer = (name) => (name === 'importFiles' ? imported({ partial: true, pending: [ptr('b1'), ptr('b2')] }) : { recordMap: { __version__: 3 } });
    const seen = await importOneFile();
    expect(seen).toEqual({ done: true, title: '가져오기 완료', notice: NOTICE, importCalls: 1, fetchedIds: ['b1', 'b2'] });
  });

  it('조회가 실패해도 가져오기는 실패로 보이지 않는다 — 완료 + 안내, importFiles를 다시 보내지 않는다', async () => {
    answer = (name) => {
      if (name === 'importFiles') return imported({ partial: true, pending: [ptr('b1'), ptr('b2'), ptr('b3'), ptr('b4'), ptr('b5')] });
      throw new Error('응답 없음');
    };
    const seen = await importOneFile();
    expect(seen).toEqual({ done: true, title: '가져오기 완료', notice: NOTICE, importCalls: 1, fetchedIds: ['b1', 'b2', 'b3'] });
  });

  it('포인터 목록에도 못 실은 레코드(pendingOmitted)가 있으면, 받은 포인터가 다 와도 안내한다', async () => {
    answer = (name, params) => (name === 'importFiles' ? imported({ partial: true, pending: [ptr('b1')], pendingOmitted: 7 }) : fetched(params));
    const seen = await importOneFile();
    expect(seen).toEqual({ done: true, title: '가져오기 완료', notice: NOTICE, importCalls: 1, fetchedIds: ['b1'] });
  });
});
