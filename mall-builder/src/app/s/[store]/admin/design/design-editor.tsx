"use client";

// 디자인 빌더 D2 — Puck(MIT, @puckeditor/core 0.24.0, THIRD_PARTY_NOTICES.md)으로 만든 첫 화면 편집기
// Puck은 배치(블록 끌어 놓기·순서·복제·삭제·실행 취소·휴대폰/PC 폭)를 맡고,
// 블록 내용 칸은 기존 첫 화면 편집기의 SettingsForm(12종, 그림 올리기·상품 고르기)을 그대로 쓴다.
// 저장 모양은 BlocksDoc(src/lib/blocks.ts) — 변환은 src/lib/builder/puck-adapter.ts, 검사는 validateDoc.

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Puck, type Config, type Data } from "@puckeditor/core";
import "@puckeditor/core/no-external.css";
import { BLOCK_DEFS, BLOCK_TYPES, MAX_PAD, validateDoc, type Block, type BlockType, type BlocksDoc } from "@/lib/blocks";
import { defaultPuckProps, fromPuck, fromPuckRaw, toPuck, type PuckBlockProps } from "@/lib/builder/puck-adapter";
import { previewSlotAction } from "@/lib/builder/design-actions";
import { publishHomeAction, saveHomeDraftAction } from "@/lib/page-actions";
import { BlockView } from "../../home-blocks";
import { renderSlot, SLOT_BLOCK_TYPES, type SlotData } from "../../home-slots";
import { SettingsForm, fromLocalKst, toLocalKst, type Option } from "../home/block-editor";

const DICTIONARY: Record<string, string> = {
  "header-publish": "게시",
  "header-undo": "실행 취소",
  "header-redo": "다시 실행",
  "header-toggle-leftsidebar": "왼쪽 칸 열기·닫기",
  "header-toggle-rightsidebar": "오른쪽 칸 열기·닫기",
  "header-toggle-menubar": "메뉴 열기·닫기",
  "action-selectparent": "바깥 고르기",
  "action-drag": "끌어서 순서 바꾸기",
  "action-duplicate": "복제",
  "action-delete": "빼기",
  "label-page": "첫 화면",
  "label-component": "블록",
  "outline-empty": "블록이 없습니다",
  "outline-item-collapse": "접기",
  "outline-item-expand": "펼치기",
  "outline-header-title": "블록 순서",
  "outline-header-collapseall": "모두 접기",
  "outline-item-duplicate": "복제",
  "outline-item-delete": "빼기",
  "drawer-category-collapse": "{title} 접기",
  "drawer-category-expand": "{title} 펼치기",
  "drawer-category-other": "그 밖",
  "canvas-noconfig": "{type} 설정이 없습니다",
  "field-readonly": "읽기 전용",
  "field-arrayitem-summary": "{index}번째",
  "field-arrayitem-duplicate": "복제",
  "field-arrayitem-delete": "빼기",
  "viewport-zoom-in": "크게 보기",
  "viewport-zoom-out": "작게 보기",
  "viewport-zoom-auto": "{zoom}% (자동)",
  "viewport-toggle-menu": "화면 폭 메뉴",
  "viewport-switch": "{label} 폭으로 보기",
  "viewport-switch-default": "화면 폭 바꾸기",
  "plugin-blocks": "블록 추가",
  "plugin-outline": "블록 순서",
  "plugin-fields": "설정",
  "plugin-components": "블록 추가",
};

const VIEWPORTS = [
  { width: 390, label: "휴대폰", icon: "Smartphone" as const },
  { width: 768, label: "태블릿", icon: "Tablet" as const },
  { width: 1280, label: "PC", icon: "Monitor" as const },
];

const CATEGORIES = {
  banner: { title: "배너·알림", components: ["topbar", "slider", "banner"] },
  products: { title: "상품", components: ["showcase", "tabs", "timesale", "category_icons"] },
  content: { title: "글·사진·소식", components: ["html", "video", "gallery", "notice", "reviews"] },
};

const input = "mt-0.5 w-full rounded border px-2 py-1.5 text-sm";

function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }): ReactElement {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input type="datetime-local" value={toLocalKst(value || undefined)} onChange={(e) => onChange(fromLocalKst(e.target.value))} className={input} />
    </label>
  );
}

/** 상품·공지·후기 블록의 실제 데이터 — 설정이 바뀌면 0.4초 뒤 다시 읽는다(운영자만, 읽기만) */
function useSlotData(storeId: string, block: Block | null): { data: SlotData | null; error: string } {
  const [state, setState] = useState<{ key: string; data: SlotData | null; error: string }>({ key: "", data: null, error: "" });
  const key = block ? JSON.stringify([block.type, block.settings]) : "";
  useEffect(() => {
    if (!block || key === state.key) return;
    const t = setTimeout(async () => {
      const r = await previewSlotAction(storeId, block);
      setState({ key, data: r.ok ? r.data : null, error: r.ok ? "" : r.error });
    }, 400);
    return () => clearTimeout(t);
    // block은 key로 대신 비교한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storeId]);
  return state.key === key ? state : { data: state.data, error: "" };
}

/** 가운데 화면의 블록 하나 — 손님 화면과 같은 BlockView, 상품 블록은 실제 상품, 고칠 곳이 있으면 안내 */
function CanvasBlock({ type, p, storeId, base }: { type: BlockType; p: PuckBlockProps; storeId: string; base: string }) {
  const checked = useMemo(() => validateDoc({ blocks: [{ id: p.id, type, visible: true, settings: p.settings, style: p.style }] }), [type, p.id, p.settings, p.style]);
  const block = checked.ok ? checked.value.blocks[0] : null;
  const isSlot = (SLOT_BLOCK_TYPES as readonly string[]).includes(type);
  const slot = useSlotData(storeId, isSlot ? block : null);
  if (!block) {
    return (
      <div className="mx-4 my-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-6 py-6 text-center text-sm text-amber-800 sm:mx-6">
        <p className="font-semibold">{BLOCK_DEFS[type].label}</p>
        <p className="mt-1 text-xs">{checked.ok ? "" : checked.error.replace(/^1번째 블록\([^)]*\): /, "")} — 오른쪽 설정에서 채워 주세요.</p>
      </div>
    );
  }
  const body = isSlot ? (slot.data ? renderSlot(block, base, slot.data) : <p className="px-6 py-8 text-center text-sm text-slate-400">{slot.error || "실제 상품·공지를 불러오는 중…"}</p>) : null;
  return (
    <div className={p.visible ? "" : "relative opacity-40"} data-design-block={type}>
      {!p.visible && <span className="absolute right-3 top-2 z-10 rounded bg-gray-900 px-2 py-0.5 text-[11px] text-white">숨김 — 손님에게 안 보임</span>}
      <BlockView b={block} slot={body} />
    </div>
  );
}

export default function DesignEditor({ slug, storeId, categories, products, initial, published, draftAt, publishedAt, themeVars }: {
  slug: string; storeId: string; categories: Option[]; products: Option[]; initial: BlocksDoc; published: BlocksDoc | null;
  draftAt: string | null; publishedAt: string | null; themeVars: Record<string, string>;
}) {
  const base = `/s/${slug}`;
  const start = useMemo(() => toPuck(initial) as unknown as Data, [initial]);
  const [saved, setSaved] = useState(JSON.stringify(initial.blocks));
  const [live, setLive] = useState(published ? JSON.stringify(published.blocks) : null);
  const [times, setTimes] = useState({ draftAt, publishedAt });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = useRef<Data>(start);

  const config = useMemo((): Config => {
    const components: Record<string, unknown> = {};
    for (const t of BLOCK_TYPES) {
      components[t] = {
        label: BLOCK_DEFS[t].label,
        defaultProps: defaultPuckProps(t),
        fields: {
          settings: {
            type: "custom",
            label: `${BLOCK_DEFS[t].label} 내용`,
            render: ({ id, value, onChange }: { id: string; value: Block["settings"]; onChange: (v: Block["settings"]) => void }) => (
              <div className="text-sm">
                <p className="mb-2 text-xs text-gray-500">{BLOCK_DEFS[t].description}</p>
                <SettingsForm storeId={storeId} block={{ id, type: t, visible: true, settings: value } as Block} categories={categories} products={products} onChange={onChange} />
              </div>
            ),
          },
          visible: { type: "radio", label: "손님에게", options: [{ label: "보임", value: true }, { label: "숨김", value: false }] },
          style: {
            type: "object",
            label: "겉모양(여백·배경·폭)",
            objectFields: {
              pad_top: { type: "number", label: "위 여백(px, 0~160)", min: 0, max: MAX_PAD, step: 8 },
              pad_bottom: { type: "number", label: "아래 여백(px, 0~160)", min: 0, max: MAX_PAD, step: 8 },
              width: { type: "radio", label: "배경 폭", options: [{ label: "본문 폭", value: "content" }, { label: "화면 가득", value: "full" }] },
              bg_color: {
                type: "custom",
                label: "배경색",
                render: ({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) => (
                  <div className="flex items-center gap-2">
                    <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 shrink-0 rounded border" aria-label="배경색 고르기" />
                    <input
                      value={value ?? ""}
                      onChange={(e) => onChange(e.target.value.trim())}
                      placeholder="없음(투명) · 예: #fef3c7"
                      maxLength={7}
                      className="w-full rounded border px-2 py-1 text-sm"
                      aria-label="배경색 코드"
                    />
                    {value && <button type="button" onClick={() => onChange("")} className="shrink-0 text-xs text-gray-600 underline">지우기</button>}
                  </div>
                ),
              },
              title_align: { type: "radio", label: "제목 정렬", options: [{ label: "왼쪽", value: "left" }, { label: "가운데", value: "center" }] },
              hide_pc: { type: "radio", label: "PC(768px 이상)", options: [{ label: "보임", value: false }, { label: "숨김", value: true }] },
              hide_mobile: { type: "radio", label: "휴대폰(767px 이하)", options: [{ label: "보임", value: false }, { label: "숨김", value: true }] },
            },
          },
          show_from: { type: "custom", label: "예약 노출", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <DateTimeField label="보이기 시작(한국 시간, 비우면 바로)" value={value} onChange={onChange} /> },
          show_until: { type: "custom", label: " ", render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <DateTimeField label="보이기 끝(한국 시간, 비우면 계속)" value={value} onChange={onChange} /> },
        },
        render: (props: PuckBlockProps) => <CanvasBlock type={t} p={props} storeId={storeId} base={base} />,
      };
    }
    return {
      categories: CATEGORIES,
      components,
      root: {
        fields: {},
        render: ({ children }: { children: ReactNode }) => (
          <div className="min-h-screen bg-[var(--mall-bg,var(--color-slate-50))] py-6 font-sans text-slate-900 antialiased" style={themeVars as CSSProperties}>
            <div className="mx-auto max-w-6xl space-y-8">{children}</div>
          </div>
        ),
      },
    } as unknown as Config;
  }, [storeId, base, categories, products, themeVars]);

  function current(): ReturnType<typeof fromPuck> {
    return fromPuck(latest.current);
  }
  function run(kind: "save" | "publish") {
    setMsg(null);
    const raw = fromPuckRaw(latest.current);
    const check = validateDoc(raw);
    if (!check.ok) return setMsg({ ok: false, text: `고칠 곳: ${check.error}` });
    const now = JSON.stringify(check.value.blocks);
    startTransition(async () => {
      const r = kind === "save" ? await saveHomeDraftAction(slug, storeId, raw) : await publishHomeAction(slug, storeId, raw);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setSaved(now);
      if (kind === "publish") {
        setLive(now);
        setTimes({ draftAt: r.at, publishedAt: r.at });
        setMsg({ ok: true, text: "게시했습니다. 손님 첫 화면에 바로 보입니다." });
      } else {
        setTimes((t) => ({ ...t, draftAt: r.at }));
        setMsg({ ok: true, text: "초안을 저장했습니다. 게시하기 전까지 손님에게는 보이지 않습니다." });
      }
    });
  }
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ko-KR") : "없음");
  const [nowJson, setNowJson] = useState(saved);
  const dirty = nowJson !== saved;
  const unpublished = live === null ? nowJson !== "[]" : nowJson !== live;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-design-editor>
      <div className="flex flex-wrap items-center gap-2 rounded bg-gray-50 px-3 py-2 text-xs text-gray-700">
        <span>초안 저장: {when(times.draftAt)}</span>
        <span className="text-gray-300">|</span>
        <span>게시: {when(times.publishedAt)}</span>
        {dirty && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">저장 안 한 변경</span>}
        {unpublished && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">게시 안 된 변경</span>}
        {pending && <span className="text-gray-500">처리 중…</span>}
        {msg && <span className={msg.ok ? "text-green-700" : "text-red-600"} data-design-msg>{msg.text}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded border bg-white">
        <Puck
          config={config}
          data={start}
          dictionary={DICTIONARY}
          viewports={VIEWPORTS}
          iframe={{ enabled: true, waitForStyles: true }}
          headerTitle="첫 화면 디자인"
          height="100%"
          onChange={(d) => {
            latest.current = d;
            const v = current();
            setNowJson(v.ok ? JSON.stringify(v.value.blocks) : `invalid:${Date.now()}`);
          }}
          renderHeaderActions={() => (
            <div className="flex items-center gap-2">
              <button type="button" disabled={pending} onClick={() => run("save")} className="rounded border bg-white px-3 py-1.5 text-sm disabled:opacity-40" data-design-save>
                초안 저장
              </button>
              <button type="button" disabled={pending} onClick={() => run("publish")} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-40" data-design-publish>
                손님 화면에 게시
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
