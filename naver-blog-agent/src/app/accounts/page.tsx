"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, User, Tag, Sparkles } from "lucide-react";

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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newBlogId, setNewBlogId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // 카테고리 추가 폼
  const [catName, setCatName] = useState("");
  const [catKeywords, setCatKeywords] = useState("");
  const [catPurpose, setCatPurpose] = useState("");
  const [catTone, setCatTone] = useState("해요체");

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

  const handleDeleteAccount = (id: string) => {
    if (!confirm("정말 이 계정을 삭제하시겠습니까?")) return;
    const updated = accounts.filter((a) => a.id !== id);
    saveToStorage(updated);
    if (selectedAccountId === id) {
      setSelectedAccountId(updated[0]?.id || null);
    }
  };

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

  const handleDeleteCategory = (catId: string) => {
    if (!selectedAccountId) return;
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
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      {/* 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          네이버 계정 & 카테고리 관리
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          발행할 네이버 블로그 ID와 카테고리별 검색 키워드, 발행 목적을 등록하고 관리합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 계정 목록 & 등록 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>네이버 블로그 계정 목록</span>
            </h2>

            {/* 계정 추가 폼 */}
            <form onSubmit={handleAddAccount} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  계정 별칭 (라벨)
                </label>
                <input
                  type="text"
                  placeholder="예: 메인 블로그, 서브 블로그"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  네이버 블로그 ID (영문)
                </label>
                <input
                  type="text"
                  placeholder="blog.naver.com/[여기입력]"
                  value={newBlogId}
                  onChange={(e) => setNewBlogId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-3 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>새 계정 추가</span>
              </button>
            </form>

            {/* 계정 카드 목록 */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              {accounts.map((acc) => {
                const isSelected = acc.id === selectedAccountId;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/10"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-neutral-900">{acc.label}</div>
                      <div className="text-[11px] text-neutral-500">ID: {acc.blog_id}</div>
                      <div className="text-[10px] text-emerald-700 mt-0.5">
                        등록된 카테고리 {acc.categories.length}개
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAccount(acc.id);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                      title="계정 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 우측: 선택된 계정의 카테고리 관리 */}
        <div className="lg:col-span-2 space-y-4">
          {selectedAccount ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6">
              <div className="border-b border-neutral-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">
                    [{selectedAccount.label}] 카테고리 & 키워드 설정
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    블로그 ID: <span className="font-mono text-emerald-700 font-semibold">{selectedAccount.blog_id}</span>
                  </p>
                </div>
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
                <div className="text-xs font-semibold text-neutral-700">
                  등록된 카테고리 목록 ({selectedAccount.categories.length})
                </div>

                {selectedAccount.categories.length === 0 ? (
                  <div className="text-center py-8 text-neutral-400 text-xs bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                    등록된 카테고리가 없습니다. 위 양식에서 카테고리를 추가해주세요.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {selectedAccount.categories.map((c) => (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border border-neutral-200 bg-white shadow-xs flex items-start justify-between"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-neutral-900">
                              {c.category_name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-100 text-neutral-600">
                              {c.preferred_tone}
                            </span>
                          </div>
                          {c.search_keywords && (
                            <div className="text-xs text-neutral-600">
                              <span className="text-neutral-400">키워드: </span>
                              {c.search_keywords}
                            </div>
                          )}
                          {c.publish_purpose && (
                            <div className="text-xs text-neutral-500">
                              <span className="text-neutral-400">목적: </span>
                              {c.publish_purpose}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-neutral-400 text-sm">
              좌측에서 계정을 선택하거나 새로 추가해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
