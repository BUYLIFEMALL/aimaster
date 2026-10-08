"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  User,
  Tag,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from "lucide-react";

interface Account {
  id: string;
  blog_id: string;
  label: string;
  default_category?: string;
  categories: Category[];
}

interface Category {
  id: string;
  category_name: string;
  search_keywords: string;
  publish_purpose: string;
  preferred_tone: string;
}

export function AccountCategoryManager({ section }: { section: "accounts" | "categories" }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newBlogId, setNewBlogId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // 계정 정보 수정 상태
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountLabel, setEditAccountLabel] = useState("");
  const [editAccountBlogId, setEditAccountBlogId] = useState("");

  // 새 카테고리 추가 폼
  const [catName, setCatName] = useState("");
  const [catKeywords, setCatKeywords] = useState("");
  const [catPurpose, setCatPurpose] = useState("");
  const [catTone, setCatTone] = useState("해요체");

  // 카테고리 수정 상태
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatKeywords, setEditCatKeywords] = useState("");
  const [editCatPurpose, setEditCatPurpose] = useState("");
  const [editCatTone, setEditCatTone] = useState("해요체");

  // 로컬 스토리지 기반 관리 (기본 샘플 포함)
  useEffect(() => {
    const saved = localStorage.getItem("nba_accounts_local");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAccounts(parsed);
        if (parsed.length > 0) setSelectedAccountId(parsed[0].id);
      } catch {}
    } else {
      const initial: Account[] = [
        {
          id: "acc-1",
          blog_id: "myblog_sample",
          label: "메인 네이버 블로그",
          default_category: "생활정보",
          categories: [
            {
              id: "cat-1",
              category_name: "생활정보",
              search_keywords: "정부지원금, 일상 꿀팁, 절약 노하우",
              publish_purpose: "실생활에 유용한 복지 및 지원금 정보를 알기 쉽게 전달",
              preferred_tone: "해요체",
            },
            {
              id: "cat-2",
              category_name: "국내여행",
              search_keywords: "주말 나들이, 가족 여행지, 숨은 명소",
              publish_purpose: "주말에 가볼 만한 국내 힐링 여행지 추천",
              preferred_tone: "해요체",
            },
            {
              id: "cat-3",
              category_name: "AI자동화",
              search_keywords: "생산성 향상, 업무 자동화 툴, 인공지능 활용",
              publish_purpose: "누구나 쉽게 따라하는 AI 생산성 자동화 가이드",
              preferred_tone: "해요체",
            },
          ],
        },
      ];
      setAccounts(initial);
      setSelectedAccountId(initial[0].id);
      localStorage.setItem("nba_accounts_local", JSON.stringify(initial));
    }
  }, []);

  const saveToStorage = (updated: Account[]) => {
    setAccounts(updated);
    localStorage.setItem("nba_accounts_local", JSON.stringify(updated));
  };

  // 계정 추가
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlogId.trim() || !newLabel.trim()) return;

    const newAcc: Account = {
      id: "acc-" + Date.now(),
      blog_id: newBlogId.trim(),
      label: newLabel.trim(),
      categories: [],
    };
    const updated = [...accounts, newAcc];
    saveToStorage(updated);
    setSelectedAccountId(newAcc.id);
    setNewBlogId("");
    setNewLabel("");
  };

  // 계정 삭제
  const handleDeleteAccount = (id: string) => {
    if (!confirm("정말 이 계정을 삭제하시겠습니까?")) return;
    const updated = accounts.filter((a) => a.id !== id);
    saveToStorage(updated);
    if (selectedAccountId === id) {
      setSelectedAccountId(updated[0]?.id || null);
    }
    if (editingAccountId === id) setEditingAccountId(null);
    setEditingCatId(null);
  };

  // 계정 정보 수정
  const handleStartEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditAccountLabel(acc.label);
    setEditAccountBlogId(acc.blog_id);
  };

  const handleCancelEditAccount = () => {
    setEditingAccountId(null);
  };

  const handleSaveEditAccount = (accId: string) => {
    if (!editAccountLabel.trim() || !editAccountBlogId.trim()) {
      alert("계정 별칭과 블로그 ID를 모두 입력해주세요.");
      return;
    }
    const updated = accounts.map((acc) => {
      if (acc.id === accId) {
        return {
          ...acc,
          label: editAccountLabel.trim(),
          blog_id: editAccountBlogId.trim(),
        };
      }
      return acc;
    });
    saveToStorage(updated);
    setEditingAccountId(null);
  };

  // 카테고리 추가
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !catName.trim()) return;

    const newCat: Category = {
      id: "cat-" + Date.now(),
      category_name: catName.trim(),
      search_keywords: catKeywords.trim(),
      publish_purpose: catPurpose.trim(),
      preferred_tone: catTone,
    };

    const updated = accounts.map((acc) => {
      if (acc.id === selectedAccountId) {
        return {
          ...acc,
          categories: [...acc.categories, newCat],
        };
      }
      return acc;
    });

    saveToStorage(updated);
    setCatName("");
    setCatKeywords("");
    setCatPurpose("");
  };

  // 카테고리 삭제
  const handleDeleteCategory = (catId: string) => {
    if (!selectedAccountId) return;
    if (!confirm("이 카테고리를 삭제하시겠습니까?")) return;
    const updated = accounts.map((acc) => {
      if (acc.id === selectedAccountId) {
        return {
          ...acc,
          categories: acc.categories.filter((c) => c.id !== catId),
        };
      }
      return acc;
    });
    saveToStorage(updated);
    if (editingCatId === catId) setEditingCatId(null);
  };

  // 카테고리 순서 위/아래 이동
  const handleMoveCategory = (index: number, direction: "up" | "down") => {
    if (!selectedAccountId) return;
    const updated = accounts.map((acc) => {
      if (acc.id === selectedAccountId) {
        const newCats = [...acc.categories];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newCats.length) return acc;
        const temp = newCats[index];
        newCats[index] = newCats[targetIndex];
        newCats[targetIndex] = temp;
        return {
          ...acc,
          categories: newCats,
        };
      }
      return acc;
    });
    saveToStorage(updated);
  };

  // 카테고리 수정 시작
  const handleStartEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.category_name);
    setEditCatKeywords(cat.search_keywords || "");
    setEditCatPurpose(cat.publish_purpose || "");
    setEditCatTone(cat.preferred_tone || "해요체");
  };

  // 카테고리 수정 취소
  const handleCancelEditCategory = () => {
    setEditingCatId(null);
  };

  // 카테고리 수정 저장
  const handleSaveEditCategory = (catId: string) => {
    if (!selectedAccountId) return;
    if (!editCatName.trim()) {
      alert("카테고리명을 입력해주세요.");
      return;
    }

    const updated = accounts.map((acc) => {
      if (acc.id === selectedAccountId) {
        return {
          ...acc,
          categories: acc.categories.map((c) => {
            if (c.id === catId) {
              return {
                ...c,
                category_name: editCatName.trim(),
                search_keywords: editCatKeywords.trim(),
                publish_purpose: editCatPurpose.trim(),
                preferred_tone: editCatTone,
              };
            }
            return c;
          }),
        };
      }
      return acc;
    });

    saveToStorage(updated);
    setEditingCatId(null);
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* 상단 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {section === "accounts" ? "네이버 블로그 계정 연결" : "네이버 카테고리 관리"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {section === "accounts"
            ? "발행에 사용할 네이버 블로그 ID를 등록하고 관리합니다."
            : "선택한 네이버 블로그의 카테고리별 검색 키워드와 발행 목적을 관리합니다."}
        </p>
      </div>

      {/* 1. 상단: 네이버 블로그 계정 목록 */}
      {section === "accounts" && (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>네이버 블로그 계정 목록</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              관리할 계정을 선택하면 아래에 해당 블로그의 카테고리 및 키워드 목록이 표시됩니다.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 w-fit">
            총 {accounts.length}개 계정 등록됨
          </span>
        </div>

        {/* 계정 추가 폼 (가로형 그리드) */}
        <form onSubmit={handleAddAccount} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
          <div className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>새 네이버 블로그 계정 추가</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                계정 별칭 (라벨)
              </label>
              <input
                type="text"
                placeholder="예: 메인 블로그, 부계정, 클라이언트 A"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                required
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                네이버 블로그 ID (영문)
              </label>
              <input
                type="text"
                placeholder="blog.naver.com/[여기입력]"
                value={newBlogId}
                onChange={(e) => setNewBlogId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 h-[34px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>계정 추가</span>
              </button>
            </div>
          </div>
        </form>

        {/* 계정 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => {
            const isSelected = acc.id === selectedAccountId;
            const isEditingAcc = editingAccountId === acc.id;

            if (isEditingAcc) {
              return (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/30 space-y-2.5 shadow-xs"
                >
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      계정 별칭
                    </label>
                    <input
                      type="text"
                      value={editAccountLabel}
                      onChange={(e) => setEditAccountLabel(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 mb-0.5">
                      네이버 블로그 ID
                    </label>
                    <input
                      type="text"
                      value={editAccountBlogId}
                      onChange={(e) => setEditAccountBlogId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelEditAccount}
                      className="px-2.5 py-1 text-xs rounded bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEditAccount(acc.id)}
                      className="px-3 py-1 text-xs rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>완료</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={acc.id}
                onClick={() => {
                  setSelectedAccountId(acc.id);
                  setEditingCatId(null);
                }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/15 shadow-xs"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-neutral-900 truncate">{acc.label}</span>
                    {isSelected && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-600 text-white">
                        선택됨
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                    ID: {acc.blog_id}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    등록된 카테고리 {acc.categories.length}개
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditAccount(acc);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="계정 정보 수정"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(acc.id);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="계정 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* 2. 하단: 선택된 계정의 카테고리 & 키워드 설정 (블로그 계정 목록 바로 밑으로 위치 이동) */}
      {section === "categories" && (
      <div>
        {selectedAccount ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-neutral-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span>[{selectedAccount.label}] 카테고리 & 키워드 설정</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  선택된 네이버 블로그 ID: <span className="font-mono text-emerald-700 font-semibold">{selectedAccount.blog_id}</span>
                </p>
              </div>
              <select
                value={selectedAccountId || ""}
                onChange={(event) => {
                  setSelectedAccountId(event.target.value || null);
                  setEditingCatId(null);
                }}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 focus:border-neutral-900 focus:outline-none"
                aria-label="카테고리를 관리할 네이버 블로그 계정 선택"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label} ({account.blog_id})
                  </option>
                ))}
              </select>
              <span className="text-xs text-neutral-500">
                원하는 카테고리를 추가하고 ▲▼ 화살표로 순서를 정렬하세요.
              </span>
            </div>

            {/* 새 카테고리 등록 폼 */}
            <form onSubmit={handleAddCategory} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
              <div className="font-semibold text-xs text-neutral-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>새 카테고리 및 주제 키워드 등록</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                    네이버 블로그 카테고리명
                  </label>
                  <input
                    type="text"
                    placeholder="실제 블로그 메뉴명과 동일하게 입력"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                    기본 말투 (어조)
                  </label>
                  <select
                    value={catTone}
                    onChange={(e) => setCatTone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                  >
                    <option value="해요체">친근하고 자연스러운 해요체</option>
                    <option value="합니다체">신뢰도 높고 정중한 합니다체</option>
                    <option value="친근한 반말">친구에게 말하듯 편한 반말</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  발굴할 핵심 키워드 (쉼표 구분)
                </label>
                <input
                  type="text"
                  placeholder="예: 청년일자리, 취업지원금, 면접정장대여, 자격증응시료"
                  value={catKeywords}
                  onChange={(e) => setCatKeywords(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  발행 목적 및 타깃 독자
                </label>
                <input
                  type="text"
                  placeholder="예: 2030 취준생 및 사회초년생에게 유용한 정책 혜택 정보 안내"
                  value={catPurpose}
                  onChange={(e) => setCatPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  className="py-2 px-4 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  카테고리 저장
                </button>
              </div>
            </form>

            {/* 등록된 카테고리 목록 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-neutral-700">
                  등록된 카테고리 목록 ({selectedAccount.categories.length})
                </div>
                <span className="text-[11px] text-neutral-400">
                  ▲▼ 화살표로 순서를 변경하고, ✎ 아이콘으로 정보를 수정할 수 있습니다.
                </span>
              </div>

              {selectedAccount.categories.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                  등록된 카테고리가 없습니다. 위 양식에서 카테고리를 추가해주세요.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {selectedAccount.categories.map((c, idx) => {
                    const isEditing = editingCatId === c.id;

                    if (isEditing) {
                      return (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/20 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                            <span className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                              <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>카테고리 정보 수정</span>
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              정보 수정 후 완료 버튼을 눌러주세요
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                                네이버 블로그 카테고리명
                              </label>
                              <input
                                type="text"
                                value={editCatName}
                                onChange={(e) => setEditCatName(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                                placeholder="예: 생활정보"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                                기본 말투 (어조)
                              </label>
                              <select
                                value={editCatTone}
                                onChange={(e) => setEditCatTone(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                              >
                                <option value="해요체">친근하고 자연스러운 해요체</option>
                                <option value="합니다체">신뢰도 높고 정중한 합니다체</option>
                                <option value="친근한 반말">친구에게 말하듯 편한 반말</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                              발굴할 핵심 키워드 (쉼표 구분)
                            </label>
                            <input
                              type="text"
                              value={editCatKeywords}
                              onChange={(e) => setEditCatKeywords(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                              placeholder="예: 청년일자리, 취업지원금, 면접정장대여"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                              발행 목적 및 타깃 독자
                            </label>
                            <input
                              type="text"
                              value={editCatPurpose}
                              onChange={(e) => setEditCatPurpose(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white focus:outline-none focus:border-neutral-900"
                              placeholder="예: 2030 취준생 및 사회초년생에게 유용한 혜택 정보"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleCancelEditCategory}
                              className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 text-xs font-semibold hover:bg-neutral-100 transition-colors"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditCategory(c.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>수정 완료</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-neutral-200 bg-white shadow-xs flex items-start justify-between gap-3 hover:border-neutral-300 transition-colors"
                      >
                        {/* 순서 변경 버튼 및 순서 번호 */}
                        <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0 bg-neutral-50 px-1 py-1 rounded-lg border border-neutral-200/60">
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(idx, "up")}
                            disabled={idx === 0}
                            className={`p-1 rounded transition-colors ${
                              idx === 0
                                ? "text-neutral-300 cursor-not-allowed"
                                : "text-neutral-600 hover:text-emerald-700 hover:bg-white"
                            }`}
                            title="위로 이동"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-mono font-bold text-neutral-500 leading-none py-0.5">
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(idx, "down")}
                            disabled={idx === selectedAccount.categories.length - 1}
                            className={`p-1 rounded transition-colors ${
                              idx === selectedAccount.categories.length - 1
                                ? "text-neutral-300 cursor-not-allowed"
                                : "text-neutral-600 hover:text-emerald-700 hover:bg-white"
                            }`}
                            title="아래로 이동"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 카테고리 본문 정보 */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-neutral-900">
                              {c.category_name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600">
                              {c.preferred_tone}
                            </span>
                          </div>
                          {c.search_keywords && (
                            <div className="text-xs text-neutral-600">
                              <span className="text-neutral-400 font-medium">키워드: </span>
                              {c.search_keywords}
                            </div>
                          )}
                          {c.publish_purpose && (
                            <div className="text-xs text-neutral-500">
                              <span className="text-neutral-400 font-medium">목적: </span>
                              {c.publish_purpose}
                            </div>
                          )}
                        </div>

                        {/* 수정 및 삭제 액션 버튼 */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(c)}
                            className="p-1.5 text-neutral-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="카테고리 정보 수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="카테고리 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-400 text-sm">
            상단에서 블로그 계정을 선택하거나 새로 추가해주세요.
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return <AccountCategoryManager section="categories" />;
}
