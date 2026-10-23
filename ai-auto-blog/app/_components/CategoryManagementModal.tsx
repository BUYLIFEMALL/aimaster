'use client'

import { useState, useEffect } from 'react'


interface Category {
  id: number
  name: string
  slug: string
  sort_order: number
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCategoriesUpdated: () => void
}

export default function CategoryManagementModal({ isOpen, onClose, onCategoriesUpdated }: Props) {
  const [canManage, setCanManage] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<number | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const response = await fetch('/api/categories', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '카테고리를 불러오지 못했습니다.')
      setCategories(result.data ?? [])
      setCanManage(result.canManage === true)
    } catch (error) {
      setCanManage(false)
      setErrorMsg(error instanceof Error ? error.message : '카테고리를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
      setNewCatName('')
      setEditingId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const changeCategory = async (method: string, body: Record<string, unknown>) => {
    if (!canManage) return
    setErrorMsg(null)
    setLoading(true)
    try {
      const response = await fetch('/api/categories', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '카테고리 변경에 실패했습니다.')
      setNewCatName('')
      setEditingId(null)
      await fetchCategories()
      onCategoriesUpdated()
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '카테고리 변경에 실패했습니다.')
    } finally {
      setLoading(false)
      setMovingId(null)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newCatName.trim()) await changeCategory('POST', { name: newCatName.trim() })
  }
  const handleSaveEdit = async (id: number) => {
    if (editingName.trim()) await changeCategory('PATCH', { id, name: editingName.trim() })
  }
  const handleDeleteCategory = async (id: number, name: string) => {
    if (canManage && confirm(`'${name}' 카테고리를 정말 삭제하시겠습니까?`)) await changeCategory('DELETE', { id })
  }
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    if (!canManage) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= categories.length) return
    setMovingId(categories[index].id)
    await changeCategory('PATCH', { id: categories[index].id, swapId: categories[swapIndex].id })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <h3 className="text-base font-extrabold text-slate-900">블로그 카테고리 관리</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* 추가 폼 */}
          {canManage && <form onSubmit={handleAddCategory} className="space-y-2">
            <label className="text-xs font-bold text-slate-700">➕ 새 카테고리 추가</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="예: AI/LLM, K-Food, 부동산..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-800 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !newCatName.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                추가
              </button>
            </div>
          </form>}
          {!canManage && <p className="text-xs text-slate-600">공통 카테고리는 관리자만 변경할 수 있습니다. 글 작성 시 카테고리를 선택할 수 있습니다.</p>}

          {/* 카테고리 리스트 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              📋 현재 등록된 카테고리 목록 ({categories.length}개)
            </label>

            {loading && categories.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                카테고리를 불러오는 중...
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                등록된 카테고리가 없습니다.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                {categories.map((cat, index) => (
                  <div key={cat.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    {editingId === cat.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 text-xs px-3 py-1.5 bg-white border border-indigo-400 rounded-lg focus:outline-none text-slate-800 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none' }}
                          className="px-3.5 py-1.5 bg-blue-600 text-white font-extrabold text-xs rounded-lg hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-300"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={canManage ? "flex flex-col flex-shrink-0" : "hidden"}>
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(index, 'up')}
                              disabled={index === 0 || movingId !== null}
                              className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 leading-none text-[10px]"
                              aria-label="위로 이동"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(index, 'down')}
                              disabled={index === categories.length - 1 || movingId !== null}
                              className="text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 leading-none text-[10px]"
                              aria-label="아래로 이동"
                            >
                              ▼
                            </button>
                          </div>
                          <span className="text-xs font-bold text-slate-800 truncate">{cat.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({cat.slug})</span>
                        </div>
                        <div className={canManage ? "flex items-center gap-1.5 flex-shrink-0" : "hidden"}>
                          <button
                            onClick={() => {
                              setEditingId(cat.id)
                              setEditingName(cat.name)
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
