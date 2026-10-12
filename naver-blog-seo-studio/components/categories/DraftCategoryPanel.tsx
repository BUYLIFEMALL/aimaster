"use client";

// 생성한 글(초안)의 분류 선택 — 결과 화면의 [Chrome 확장 전송] 위에 둔다.
//  · 생성 기록 분류(보관함 분류): 생성 기록 화면의 필터와 같은 목록
//  · 네이버 발행 카테고리: 확장이 네이버 발행 설정창에서 이 카테고리를 선택한다(기본값 = 마지막으로 쓴 카테고리)
import { useEffect, useRef, useState } from "react";
import { loadLastNaverCategory, saveLastNaverCategory, type NaverCategory } from "@/lib/naverCategory";
import { CategoryManagerModal } from "./CategoryManagerModal";
import { NaverCategoryPicker } from "./NaverCategoryPicker";
import { useCategories } from "./useCategories";

export type DraftCategoryFields = { id: string; category_id?: string | null; naver_category?: NaverCategory | null };

async function patchCategory(draftId: string, body: Record<string, unknown>): Promise<string | null> {
  try {
    const response = await fetch(`/api/drafts/${encodeURIComponent(draftId)}/category`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) return null;
    const data = await response.json().catch(() => null) as { error?: string } | null;
    return data?.error || "카테고리를 저장하지 못했습니다.";
  } catch {
    return "카테고리를 저장하지 못했습니다. 네트워크를 확인해 주세요.";
  }
}

export function DraftCategoryPanel({ draft, onChanged }: { draft: DraftCategoryFields; onChanged: (patch: { category_id?: string | null; naver_category?: NaverCategory | null }) => void }) {
  const { categories, saveCategories } = useCategories();
  const [manageOpen, setManageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const autoApplied = useRef<string | null>(null);
  const known = categories.some((c) => c.id === draft.category_id);

  // 네이버 카테고리가 아직 없는 글은 마지막으로 쓴 카테고리를 기본값으로 자동 선택한다(글마다 한 번).
  useEffect(() => {
    if (draft.naver_category || autoApplied.current === draft.id) return;
    autoApplied.current = draft.id;
    const last = loadLastNaverCategory(window.localStorage);
    if (!last) return;
    void patchCategory(draft.id, { naverCategory: last }).then((err) => { if (!err) onChanged({ naver_category: last }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  const changeCategory = async (id: string) => {
    setMessage("");
    const err = await patchCategory(draft.id, { categoryId: id });
    if (err) setMessage(err); else onChanged({ category_id: id || null });
  };
  const changeNaver = async (next: NaverCategory | null) => {
    setMessage("");
    const err = await patchCategory(draft.id, { naverCategory: next });
    if (err) { setMessage(err); return; }
    saveLastNaverCategory(window.localStorage, next);
    onChanged({ naver_category: next });
  };

  return (
    <div className="cat-panel">
      <strong>카테고리</strong>
      <div className="cat-field">
        <label htmlFor="seo-draft-category">생성 기록 분류</label>
        <div className="cat-row">
          <select id="seo-draft-category" value={known ? (draft.category_id as string) : ""} onChange={(event) => void changeCategory(event.target.value)}>
            <option value="">미분류</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="button" className="secondary compact" onClick={() => setManageOpen(true)}>카테고리 관리</button>
        </div>
      </div>
      <NaverCategoryPicker value={draft.naver_category ?? null} onChange={(next) => void changeNaver(next)} />
      {message && <p className="cat-error" role="alert">{message}</p>}
      {manageOpen && <CategoryManagerModal categories={categories} onSave={saveCategories} onClose={() => setManageOpen(false)} />}
    </div>
  );
}
