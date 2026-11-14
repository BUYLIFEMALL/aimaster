// 디자인 빌더 D2-2 — 저장 모양(BlocksDoc, src/lib/blocks.ts) ↔ Puck 편집기 데이터 변환층(node --test 대상)
// Puck을 아는 곳은 이 파일과 편집 화면뿐이다. 저장 기준은 계속 BlocksDoc + validateDoc(Puck 판이 바뀌어도 저장본은 그대로).
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { BLOCK_DEFS, SCHEMA_VERSION, validateDoc, type Block, type BlockStyle, type BlockType, type BlocksDoc } from "../blocks.ts";

/** Puck 블록 하나의 props — 설정은 묶음 그대로(기존 설정 폼을 그대로 쓰기 위해) */
export type PuckBlockProps = {
  id: string;
  visible: boolean;
  settings: Block["settings"];
  style: BlockStyle;
  show_from: string;
  show_until: string;
};
export type PuckItem = { type: BlockType; props: PuckBlockProps };
export type PuckData = { root: { props: Record<string, unknown> }; content: PuckItem[] };

export function toPuck(doc: BlocksDoc): PuckData {
  return {
    root: { props: {} },
    content: doc.blocks.map((b) => ({
      type: b.type,
      props: { id: b.id, visible: b.visible, settings: b.settings, style: b.style ?? {}, show_from: b.show_from ?? "", show_until: b.show_until ?? "" },
    })),
  };
}

/** Puck 데이터 → 저장 전 문서(검사 전). 모르는 종류는 그대로 넘겨 validateDoc이 몇 번째인지 알려 주게 한다 */
export function fromPuckRaw(data: unknown): { schema_version: number; blocks: unknown[] } {
  const content = data && typeof data === "object" && Array.isArray((data as PuckData).content) ? (data as PuckData).content : [];
  return {
    schema_version: SCHEMA_VERSION,
    blocks: content.map((it) => {
      const p = (it?.props ?? {}) as Partial<PuckBlockProps>;
      return {
        id: p.id,
        type: it?.type,
        visible: p.visible !== false,
        settings: p.settings,
        ...(p.style && Object.keys(p.style).length ? { style: p.style } : {}),
        ...(p.show_from ? { show_from: p.show_from } : {}),
        ...(p.show_until ? { show_until: p.show_until } : {}),
      };
    }),
  };
}

/** Puck 데이터 → 검사·정리된 저장 문서 */
export function fromPuck(data: unknown): ReturnType<typeof validateDoc> {
  return validateDoc(fromPuckRaw(data));
}

/** 새 블록을 Puck에 넣을 때의 기본 props(id는 Puck이 붙인다) */
export function defaultPuckProps(type: BlockType): Omit<PuckBlockProps, "id"> {
  return { visible: true, settings: BLOCK_DEFS[type].defaults(), style: {}, show_from: "", show_until: "" };
}
