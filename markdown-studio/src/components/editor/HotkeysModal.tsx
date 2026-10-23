"use client";
import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";
import { showToast } from "@/components/ui/Toast";

// 2026-10-17 v1.12: 단축키 안내 창 — [⌨️ 단축키] 버튼 또는 입력 중이 아닐 때 "?" 키로 연다. Esc로 닫는다.
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

// 2026-10-17 v1.14: 세 번째 값(동작 이름)이 있는 항목은 눌러서 바로 편집기에 적용한다(EditorPane이 이 이벤트를 받는다).
export const HOTKEY_EVENT = "md-studio:hotkey";
export type HotkeyAction = "bold" | "italic" | "link" | "indent" | "outdent" | "undo" | "redo" | "find" | "save";
const GROUPS: { title: string; items: [string, string, HotkeyAction?][] }[] = [
  { title: "서식", items: [[`${MOD} + B`, "굵게", "bold"], [`${MOD} + I`, "기울임", "italic"], [`${MOD} + K`, "링크 넣기", "link"], ["Tab", "들여쓰기", "indent"], ["Shift + Tab", "내어쓰기", "outdent"]] },
  { title: "편집", items: [[`${MOD} + Z`, "실행 취소", "undo"], [`${MOD} + Shift + Z`, "다시 실행", "redo"], [`${MOD} + F`, "찾기·바꾸기", "find"], ["Enter", "목록·체크리스트 이어 쓰기"]] },
  { title: "저장·이동", items: [[`${MOD} + S`, "지금 저장", "save"], ["Esc → Tab", "편집기 밖으로 이동"], ["?", "이 안내 창 열기"]] },
];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

export function HotkeysButton() {
  const [open, setOpen] = useState(false);
  function apply(action: HotkeyAction) {
    setOpen(false);
    // 편집기가 받으면 preventDefault로 알려 준다. 아무도 받지 않으면 문서가 열려 있지 않은 것
    const handled = !window.dispatchEvent(new CustomEvent(HOTKEY_EVENT, { detail: action, cancelable: true }));
    if (!handled) showToast("먼저 문서를 열어 주세요. 편집기에 바로 적용됩니다.", "error");
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) { e.preventDefault(); setOpen(true); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" title="단축키 안내 (?)">
        <Keyboard size={14} />
        단축키
      </button>
      {open && (
        <div className="hotkeys-overlay" onClick={() => setOpen(false)}>
          <div className="hotkeys-modal" role="dialog" aria-modal="true" aria-label="단축키 안내" onClick={e => e.stopPropagation()}>
            <div className="hotkeys-head">
              <h2>⌨️ 단축키 안내</h2>
              <button type="button" aria-label="닫기" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>
            <div className="hotkeys-groups">
              {GROUPS.map(g => (
                <section key={g.title}>
                  <h3>{g.title}</h3>
                  <dl>
                    {g.items.map(([k, d, action]) => action ? (
                      // dl 안에는 div만 둘 수 있어 버튼 역할의 div로 만든다(Enter·Space로도 적용)
                      <div key={k} className="hotkey-item" role="button" tabIndex={0} aria-label={`${d} 바로 적용`} title="눌러서 바로 적용"
                        onClick={() => apply(action)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apply(action); } }}>
                        <dt><kbd>{k}</kbd></dt><dd>{d} <span className="hotkey-apply">적용 ›</span></dd>
                      </div>
                    ) : (
                      <div key={k} className="hotkey-item static"><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            <p className="hotkeys-foot">항목을 누르면 편집기의 커서 위치(선택한 글자)에 그 서식이 바로 들어갑니다. 편집기 안에서 글을 쓰는 중에는 &quot;?&quot;가 그대로 입력됩니다. 이때는 위 [단축키] 버튼을 눌러 주세요.</p>
          </div>
        </div>
      )}
    </>
  );
}
