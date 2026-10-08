"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, User, Check } from "lucide-react";

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

export function NaverAccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newBlogId, setNewBlogId] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // 계정 정보 수정 상태
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editAccountLabel, setEditAccountLabel] = useState("");
  const [editAccountBlogId, setEditAccountBlogId] = useState("");

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

  return (
    <div className="space-y-6">
      {/* 상단 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          네이버 블로그 계정 연결
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          발행에 사용할 네이버 블로그 ID를 등록하고 관리합니다.
        </p>
      </div>

      {/* 1. 상단: 네이버 블로그 계정 목록 */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              <span>네이버 블로그 계정 목록</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              블로그 ID를 등록하거나 기존 계정 정보를 수정할 수 있습니다.
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

    </div>
  );
}
