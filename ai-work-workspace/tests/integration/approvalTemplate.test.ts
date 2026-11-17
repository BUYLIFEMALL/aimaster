// WS-20261117-24 E3-1 「간단 전자결재」 템플릿(PLAN 7-10, Master msg_0186d3820539). 실제 템플릿 적용 경로(OpsBuilder.block)로 펼쳐 확인 — DB·AI·외부 0.
// 결재자만 승인하는 권한·알림 자동 생성은 이 단위에 없다(설명에 그렇게 적혀 있는지도 확인).
import { describe, expect, it } from 'vitest';

const { OpsBuilder } = await import('../../src/litpage/server/content/spec.ts');
const { TEMPLATES } = await import('../../src/litpage/server/content/catalog.ts');

type Opt = { id: string; value: string };
type Prop = { name: string; type: string; options?: Opt[]; groups?: { optionIds: string[] }[]; number_format?: string };

function expand(id: string) {
  const t = TEMPLATES.find((x) => x.id === id)!;
  const b = new OpsBuilder('sp-e3', 'u-e3');
  b.block(t.build() as never, 'sp-e3', 'space');
  const sets = b.ops.filter((o) => o.command === 'set');
  const col = sets.find((o) => o.pointer.table === 'collection')?.args as { schema: Record<string, Prop> } | undefined;
  const rows = sets.filter((o) => o.pointer.table === 'block' && (o.args as { parent_table?: string }).parent_table === 'collection').map((o) => o.args as { properties?: Record<string, unknown> });
  const views = sets.filter((o) => o.pointer.table === 'collection_view').map((o) => o.args as { type: string; query2?: { group_by?: string } });
  return { t, col, rows, views };
}
/** 상태 선택지 → 그룹 번호(0 시작 전 · 1 진행 · 2 완료) */
function groupsOf(p: Prop): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [gi, g] of (p.groups ?? []).entries()) for (const oid of g.optionIds) out[p.options!.find((o) => o.id === oid)!.value] = gi;
  return out;
}
/** 바꾸기 전 판정(spec.ts 기존 정규식) — 기존 템플릿 회귀 비교용 */
const legacyGroup = (v: string) => (/done|complete|finished|launched|shipped|read$|완료|출시|다 읽음/i.test(v) ? 2 : /progress|doing|reading|active|review|planning|started|진행|기획|검토|읽는 중/i.test(v) && !/not started/i.test(v) ? 1 : 0);

describe('E3-1 간단 전자결재 템플릿', () => {
  it('템플릿 목록에 하나, 설명에 자동화 안내와 권한 한계를 평문으로', () => {
    const list = TEMPLATES.filter((x) => x.id === 'simple-approval');
    expect(list).toHaveLength(1);
    const d = list[0].description;
    expect(d).toMatch(/자동화/);
    // E3-3: 결재자 전용 칸과 전체 권한자 예외를 평문으로
    expect(d).toMatch(/결재자로 선택된 사람만/);
    expect(d).toMatch(/전체 권한자는 모든 칸을 바꿀 수 있습니다/);
    expect(d).not.toMatch(/결재자만 승인할 수 있/);
  });

  it('속성 8개(E3-3 결재 올림 추가)·종류, 상태 선택지 4개와 그룹(작성 중=시작 전, 승인 요청=진행, 승인·반려=완료)', () => {
    const { col } = expand('simple-approval');
    const props = Object.values(col!.schema);
    expect(props).toHaveLength(8);
    const byName = Object.fromEntries(props.map((p) => [p.name, p]));
    expect(Object.fromEntries(props.map((p) => [p.name, p.type]))).toEqual({
      '결재 건': 'title', 상태: 'status', '결재 올림': 'checkbox', 요청자: 'person', 결재자: 'person', 금액: 'number', '결재 의견': 'text', 결재일: 'date',
    });
    expect(byName['금액'].number_format).toBe('won');
    expect(byName['상태'].options!.map((o) => o.value)).toEqual(['작성 중', '승인 요청', '승인', '반려']);
    expect(groupsOf(byName['상태'])).toEqual({ '작성 중': 0, '승인 요청': 1, 승인: 2, 반려: 2 });
  });

  it('보기는 상태별 보드와 전체 표, 예시 행 하나', () => {
    const { col, rows, views } = expand('simple-approval');
    const statusId = Object.entries(col!.schema).find(([, p]) => p.name === '상태')![0];
    expect(views.map((v) => v.type).sort()).toEqual(['board', 'table']);
    expect(views.find((v) => v.type === 'board')!.query2?.group_by).toBe(statusId);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0].properties)).toContain('(예시) 사무용품 구매');
  });

  it('회귀: 다른 모든 템플릿의 상태 그룹은 바꾸기 전 판정과 같음', () => {
    let checked = 0;
    for (const t of TEMPLATES) {
      if (t.id === 'simple-approval') continue;
      let built: ReturnType<typeof expand>;
      try {
        built = expand(t.id);
      } catch {
        continue; // 데이터베이스가 아닌 템플릿
      }
      for (const p of Object.values(built.col?.schema ?? {})) {
        if (p.type !== 'status' || !p.groups) continue;
        for (const [v, g] of Object.entries(groupsOf(p))) {
          expect(g, `${t.id} ${v}`).toBe(legacyGroup(v));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
