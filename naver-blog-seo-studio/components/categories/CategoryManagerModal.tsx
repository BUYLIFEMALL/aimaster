"use client";

import { useState } from "react";
import { makeSlug, MAX_CATEGORIES, newCategoryId, type BlogCategory } from "@/lib/categories";

interface Props {
  categories: BlogCategory[];
  /** 글 개수(생성 기록에서 열었을 때만 전달) */
  counts?: Record<string, number>;
  onSave: (next: BlogCategory[]) => Promise<string | null>;
  onClose: () => void;
}

export function CategoryManagerModal({ categories, counts, onSave, onClose }: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = async (next: BlogCategory[]): Promise<boolean> => {
    setBusy(true);
    const err = await onSave(next.map((c, i) => ({ ...c, sort_order: i + 1 })));
    setBusy(false);
    setError(err ?? "");
    return !err;
  };
  const dup = (name: string, exceptId?: string) => categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase());

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (dup(name)) return setError("이미 같은 이름의 카테고리가 있습니다.");
    if (categories.length >= MAX_CATEGORIES) return setError(`카테고리는 ${MAX_CATEGORIES}개까지 만들 수 있습니다.`);
    if (await commit([...categories, { id: newCategoryId(), name, slug: makeSlug(name), sort_order: categories.length + 1 }])) setNewName("");
  };
  const saveEdit = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    if (dup(name, id)) return setError("이미 같은 이름의 다른 카테고리가 있습니다.");
    if (await commit(categories.map((c) => (c.id === id ? { ...c, name, slug: makeSlug(name) } : c)))) setEditingId(null);
  };
  const remove = async (id: string) => {
    if (categories.length <= 1) return setError("카테고리는 최소 1개는 남겨야 합니다.");
    if (await commit(categories.filter((c) => c.id !== id))) setConfirmId(null);
  };
  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[index], next[j]] = [next[j], next[index]];
    await commit(next);
  };

  return (
    <div className="cat-backdrop" role="dialog" aria-modal="true" aria-labelledby="seo-cat-title">
      <div className="cat-modal">
        <div className="cat-modal-head">
          <div>
            <h3 id="seo-cat-title">카테고리 관리</h3>
            <p>글 만들기 화면과 생성 기록이 같은 목록을 함께 씁니다</p>
          </div>
          <button type="button" className="cat-close" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        <div className="cat-modal-body">
          {error && <p className="cat-error" role="alert">{error}</p>}
          <form className="cat-add" onSubmit={add}>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={40} placeholder="새 카테고리 이름 (예: 뷰티/패션, 육아)" aria-label="새 카테고리 이름" />
            <button type="submit" className="secondary compact" disabled={!newName.trim() || busy}>추가</button>
          </form>
          <ul className="cat-list">
            {categories.map((cat, index) => (
              <li key={cat.id}>
                {editingId === cat.id ? (
                  <div className="cat-edit">
                    <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} maxLength={40} aria-label="카테고리 이름 수정" />
                    <button type="button" className="secondary compact" disabled={busy} onClick={() => void saveEdit(cat.id)}>저장</button>
                    <button type="button" className="text-button" onClick={() => setEditingId(null)}>취소</button>
                  </div>
                ) : (
                  <>
                    <span className="cat-order">
                      <button type="button" disabled={index === 0 || busy} onClick={() => void move(index, -1)} aria-label="위로">▲</button>
                      <button type="button" disabled={index === categories.length - 1 || busy} onClick={() => void move(index, 1)} aria-label="아래로">▼</button>
                    </span>
                    <strong>{cat.name}</strong>
                    {counts && <small>글 {counts[cat.id] ?? 0}개</small>}
                    {confirmId === cat.id ? (
                      <span className="cat-actions">
                        <small className="cat-warn">글은 미분류로 남습니다</small>
                        <button type="button" className="text-button danger" disabled={busy} onClick={() => void remove(cat.id)}>삭제 확인</button>
                        <button type="button" className="text-button" onClick={() => setConfirmId(null)}>취소</button>
                      </span>
                    ) : (
                      <span className="cat-actions">
                        <button type="button" className="text-button" onClick={() => { setEditingId(cat.id); setEditingName(cat.name); setError(""); }}>수정</button>
                        <button type="button" className="text-button danger" onClick={() => { setConfirmId(cat.id); setError(""); }}>삭제</button>
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="cat-note">카테고리를 지워도 글은 삭제되지 않고 &quot;미분류&quot;로 남습니다.</p>
        </div>
        <div className="cat-modal-foot"><button type="button" className="secondary" onClick={onClose}>완료 및 닫기</button></div>
      </div>
    </div>
  );
}
