"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  addBroadcastRecipientAction,
  addBulkBroadcastRecipientsAction,
  deleteBroadcastRecipientAction,
  importBroadcastRecipientsAction,
  moveBroadcastRecipientGroupAction,
  moveManyBroadcastRecipientsGroupAction,
  updateBroadcastRecipientAction,
  type AddBroadcastRecipientState,
  type BulkAddBroadcastRecipientsState,
} from "@/lib/actions/broadcastRecipients";
import { createBroadcastGroupAction, deleteBroadcastGroupAction, type CreateGroupState } from "@/lib/actions/broadcastGroups";

export interface BroadcastRecipientData {
  id: string;
  phone: string;
  label: string | null;
  group_id: string | null;
}

export interface BroadcastGroupData {
  id: string;
  name: string;
}

const addInitialState: AddBroadcastRecipientState = {};
const bulkInitialState: BulkAddBroadcastRecipientsState = {};
const groupInitialState: CreateGroupState = {};
const UNGROUPED = "__ungrouped__";
// 다중 선택 이동 드롭다운의 "아직 아무것도 안 골랐다"는 상태를 "미분류로 이동"(value="")과
// 구분하기 위한 값 — 기본값을 ""로 두면 그룹을 안 고르고 바로 "이동"을 눌렀을 때 조용히
// 미분류로 이동해버려(이미 미분류였다면 겉보기엔 아무 일도 안 일어난 것처럼 보임) 사용자가
// "이동이 안 된다"고 착각하는 버그가 있었다(2026-09-09).
const UNSELECTED = "__unselected__";

function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 3)}-****-${phone.slice(-4)}`;
}

/**
 * 리포트를 본인뿐 아니라 함께 받아볼 사람들에게도 카카오톡으로 발송할 수 있게 하는
 * 수신자 목록 관리 섹션. 실제 발송은 SOLAPI 브랜드메시지(카카오톡 채널 친구가 아니어도
 * 전화번호만 있으면 도달)를 거치므로, SOLAPI 계정(카카오 채널 ID 포함)이 함께
 * 연동되어 있어야 실제로 동작한다 — lib/kakaoSend.ts 참고. 그룹은 단순 분류표라
 * 발송 로직 자체에는 관여하지 않고, 화면에서 수신자를 정리해서 보기 위한 용도다.
 */
export function BroadcastRecipientsSection({
  recipients,
  groups,
  hasSolapiChannel,
  channelFriendUrl,
  hasAlimtalkTemplate,
}: {
  recipients: BroadcastRecipientData[];
  groups: BroadcastGroupData[];
  hasSolapiChannel: boolean;
  channelFriendUrl: string | null;
  hasAlimtalkTemplate: boolean;
}) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<"none" | "single" | "bulk">(recipients.length === 0 ? "single" : "none");
  const [state, formAction, isSaving] = useActionState(addBroadcastRecipientAction, addInitialState);
  const [bulkState, bulkFormAction, isBulkSaving] = useActionState(addBulkBroadcastRecipientsAction, bulkInitialState);
  const [groupState, groupFormAction, isGroupSaving] = useActionState(createBroadcastGroupAction, groupInitialState);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all"); // "all" | UNGROUPED | groupId
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveGroupId, setBulkMoveGroupId] = useState(UNSELECTED);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  const filteredRecipients = recipients.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === UNGROUPED) return !r.group_id;
    return r.group_id === activeFilter;
  });
  const searchDigits = searchQuery.replace(/[^0-9]/g, "");
  const searchText = searchQuery.trim().toLowerCase();
  const visibleRecipients = filteredRecipients.filter((r) => {
    if (!searchText) return true;
    const labelMatch = r.label?.toLowerCase().includes(searchText);
    const phoneMatch = searchDigits.length > 0 && r.phone.includes(searchDigits);
    return Boolean(labelMatch) || phoneMatch;
  });
  const defaultGroupForNew = activeFilter !== "all" && activeFilter !== UNGROUPED ? activeFilter : "";
  const allVisibleSelected = visibleRecipients.length > 0 && visibleRecipients.every((r) => selectedIds.has(r.id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleRecipients.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      visibleRecipients.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkMove() {
    if (selectedIds.size === 0 || bulkMoveGroupId === UNSELECTED) return;
    setIsBulkMoving(true);
    try {
      await moveManyBroadcastRecipientsGroupAction(Array.from(selectedIds), bulkMoveGroupId || null);
      setSelectedIds(new Set());
      setBulkMoveGroupId(UNSELECTED);
      router.refresh();
    } finally {
      setIsBulkMoving(false);
    }
  }

  async function handleImportSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImportError(null);
    setImportResult(null);
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setImportError("엑셀 파일을 선택해주세요.");
      return;
    }
    setIsImporting(true);
    try {
      const res = await importBroadcastRecipientsAction(formData);
      if (res.error) {
        setImportError(res.error);
      } else {
        setImportResult(`${res.importedCount ?? 0}명 등록 완료${res.skippedCount ? ` (이미 등록됨 ${res.skippedCount}건 제외)` : ""}`);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } finally {
      setIsImporting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 수신자를 목록에서 삭제할까요? 앞으로 리포트가 이 번호로 발송되지 않습니다.")) return;
    setDeletingId(id);
    try {
      await deleteBroadcastRecipientAction(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm("이 그룹을 삭제할까요? 그룹에 속한 수신자는 삭제되지 않고 미분류로 돌아갑니다.")) return;
    setDeletingGroupId(id);
    try {
      await deleteBroadcastGroupAction(id);
      if (activeFilter === id) setActiveFilter("all");
      router.refresh();
    } finally {
      setDeletingGroupId(null);
    }
  }

  function startEdit(recipient: BroadcastRecipientData) {
    setEditingId(recipient.id);
    setEditLabel(recipient.label ?? "");
    setEditPhone(recipient.phone);
    setEditError(null);
  }

  async function handleEditSave(id: string) {
    setEditError(null);
    setIsEditSaving(true);
    try {
      const res = await updateBroadcastRecipientAction(id, { label: editLabel, phone: editPhone });
      if (res.error) {
        setEditError(res.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setIsEditSaving(false);
    }
  }

  async function handleMoveGroup(id: string, groupId: string) {
    setMovingId(id);
    try {
      await moveBroadcastRecipientGroupAction(id, groupId || null);
      router.refresh();
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">📣 카카오톡 수신자 목록</h2>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowGroupManager((v) => !v)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {showGroupManager ? "닫기" : "🗂 그룹 관리"}
          </button>
          <button
            type="button"
            onClick={() => setFormMode((v) => (v === "single" ? "none" : "single"))}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {formMode === "single" ? "닫기" : "+ 수신자 추가"}
          </button>
          <button
            type="button"
            onClick={() => setFormMode((v) => (v === "bulk" ? "none" : "bulk"))}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            {formMode === "bulk" ? "닫기" : "+ 여러 명 한번에 추가"}
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        여기 등록한 전화번호로도 리포트가 카카오톡으로 함께 발송됩니다.{" "}
        {hasAlimtalkTemplate
          ? "알림톡 템플릿이 등록돼 있어 채널 친구가 아니어도 도달합니다."
          : "단, 브랜드메시지는 채널을 친구 추가한 사람에게만 도달합니다 — 아직 친구 추가하지 않았다면 먼저 추가하도록 안내해주세요."}
      </p>
      {!hasSolapiChannel && (
        <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          아래 SOLAPI(카카오 채널) 계정을 함께 연동해야 실제로 발송됩니다. 수신자만
          등록해두고 나중에 연동해도 됩니다.
        </p>
      )}
      {hasSolapiChannel && !hasAlimtalkTemplate && (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          {channelFriendUrl ? (
            <>
              📎 수신자에게 먼저 이 링크로 채널 친구 추가를 요청해주세요:{" "}
              <a href={channelFriendUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                {channelFriendUrl}
              </a>
            </>
          ) : (
            <>
              채널 친구추가 링크를 아래 SOLAPI 설정에 등록해두면 여기에 안내 링크를
              보여드립니다. (또는 알림톡 템플릿을 등록하면 친구 추가 없이도 도달합니다.)
            </>
          )}
        </div>
      )}

      {showGroupManager && (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold text-neutral-700">그룹 관리</p>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <span key={g.id} className="flex items-center gap-1 rounded-full bg-white border border-neutral-300 px-3 py-1 text-xs text-neutral-700">
                  {g.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(g.id)}
                    disabled={deletingGroupId === g.id}
                    className="text-red-500 hover:underline disabled:opacity-50"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <form action={groupFormAction} className="flex gap-2">
            <Input name="name" placeholder="새 그룹 이름 (예: 가족, 고객A)" className="flex-1" />
            <Button type="submit" disabled={isGroupSaving}>
              {isGroupSaving ? "추가 중..." : "그룹 추가"}
            </Button>
          </form>
          {groupState.error && <p className="text-xs text-red-600">{groupState.error}</p>}
        </div>
      )}

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[{ id: "all", name: `전체 (${recipients.length})` }, { id: UNGROUPED, name: `미분류 (${recipients.filter((r) => !r.group_id).length})` }, ...groups.map((g) => ({ id: g.id, name: `${g.name} (${recipients.filter((r) => r.group_id === g.id).length})` }))].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeFilter === tab.id ? "bg-yellow-100 text-yellow-800" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {recipients.length > 0 && (
        <div className="space-y-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 전화번호 검색"
          />

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2">
              <span className="text-xs font-semibold text-yellow-800">{selectedIds.size}명 선택됨</span>
              <select
                value={bulkMoveGroupId}
                onChange={(e) => setBulkMoveGroupId(e.target.value)}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 outline-none"
              >
                <option value={UNSELECTED} disabled>
                  이동할 그룹 선택...
                </option>
                <option value="">미분류로 이동</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    &quot;{g.name}&quot;(으)로 이동
                  </option>
                ))}
              </select>
              <Button type="button" onClick={handleBulkMove} disabled={isBulkMoving || bulkMoveGroupId === UNSELECTED}>
                {isBulkMoving ? "이동 중..." : "이동"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkMoveGroupId(UNSELECTED);
                }}
                className="text-xs font-semibold text-neutral-500 hover:underline"
              >
                선택 해제
              </button>
            </div>
          )}

          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} disabled={visibleRecipients.length === 0} />
              {searchText || activeFilter !== "all" ? `${visibleRecipients.length.toLocaleString()}명 표시 중` : `등록됨 ${recipients.length.toLocaleString()}명`}
            </label>
            {visibleRecipients.length === 0 && (
              <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-400">
                {searchText ? "검색 결과가 없습니다." : "이 그룹에는 아직 수신자가 없습니다."}
              </p>
            )}
            {visibleRecipients.map((recipient) =>
              editingId === recipient.id ? (
                <div key={recipient.id} className="space-y-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                  <div className="flex flex-wrap gap-2">
                    <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="이름/메모" className="min-w-[100px] flex-1" />
                    <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="전화번호" className="min-w-[140px] flex-1" />
                  </div>
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => handleEditSave(recipient.id)} disabled={isEditSaving}>
                      {isEditSaving ? "저장 중..." : "저장"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={isEditSaving}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div key={recipient.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.has(recipient.id)} onChange={() => toggleSelectOne(recipient.id)} />
                    <p className="text-sm text-neutral-900">
                      {recipient.label ? `${recipient.label} ` : ""}
                      <span className="text-neutral-500">{maskPhone(recipient.phone)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {groups.length > 0 && (
                      <select
                        value={recipient.group_id ?? ""}
                        onChange={(e) => handleMoveGroup(recipient.id, e.target.value)}
                        disabled={movingId === recipient.id}
                        className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 outline-none disabled:opacity-50"
                      >
                        <option value="">미분류</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button type="button" onClick={() => startEdit(recipient)} className="text-xs font-semibold text-blue-600 hover:underline">
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(recipient.id)}
                      disabled={deletingId === recipient.id}
                      className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
                    >
                      {deletingId === recipient.id ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {formMode === "single" && (
        <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">이름/메모 (선택)</label>
            <Input name="label" placeholder="예: 친구1, 고객A" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">전화번호</label>
            <Input name="phone" required placeholder="01012345678" autoComplete="off" />
          </div>
          {groups.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">그룹 (선택)</label>
              <select
                name="groupId"
                defaultValue={defaultGroupForNew}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
              >
                <option value="">미분류</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "추가 중..." : "추가"}
            </Button>
            {recipients.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setFormMode("none")} disabled={isSaving}>
                취소
              </Button>
            )}
          </div>
        </form>
      )}

      {formMode === "bulk" && (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <form onSubmit={handleImportSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">방법 1. 엑셀로 수신자 가져오기</label>
            <p className="text-xs text-neutral-400">
              컬럼: 이름 / 전화번호(필수). 이미 등록된 전화번호는 건너뜁니다.
            </p>
            {groups.length > 0 && (
              <select
                name="groupId"
                defaultValue={defaultGroupForNew}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 outline-none"
              >
                <option value="">가져온 수신자를 미분류로 등록</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    &quot;{g.name}&quot; 그룹으로 등록
                  </option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                name="file"
                accept=".xlsx,.xls,.csv"
                required
                className="min-w-[180px] flex-1 text-xs text-neutral-700 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-neutral-700"
              />
              <a
                href="/api/broadcast-recipients/template"
                className="whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                입력폼 다운로드
              </a>
              <Button type="submit" disabled={isImporting}>
                {isImporting ? "가져오는 중..." : "가져오기"}
              </Button>
            </div>
            <p className="text-xs text-neutral-400">
              파일 1개당 최대 5MB까지 올릴 수 있어요. 그보다 많으면 파일을 나눠서 여러 번
              올려주세요 — 누적 등록 건수에는 제한이 없습니다.
            </p>
            {importResult && <p className="text-xs text-green-600">{importResult}</p>}
            {importError && <p className="text-xs text-red-600">{importError}</p>}
          </form>

          <div className="border-t border-neutral-200 pt-4">
            <form action={bulkFormAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  방법 2. 직접 텍스트로 붙여넣기 (한 줄에 한 명씩, &quot;이름,전화번호&quot; 형식 — 이름은 생략 가능)
                </label>
                <textarea
                  name="bulkPhones"
                  required
                  rows={8}
                  placeholder={"친구1,01012345678\n고객A,01098765432\n01055556666"}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-900 outline-none focus:border-neutral-900"
                />
                <p className="mt-1 text-xs text-neutral-400">한 번에 최대 500명.</p>
              </div>
              {groups.length > 0 && (
                <select
                  name="groupId"
                  defaultValue={defaultGroupForNew}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 outline-none"
                >
                  <option value="">등록할 수신자를 미분류로 등록</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      &quot;{g.name}&quot; 그룹으로 등록
                    </option>
                  ))}
                </select>
              )}
              {bulkState.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{bulkState.error}</p>}
              <Button type="submit" disabled={isBulkSaving}>
                {isBulkSaving ? "등록 중..." : "일괄 등록"}
              </Button>
              {bulkState.results && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg bg-white p-3 text-xs">
                  <p className="mb-1 font-semibold text-neutral-700">
                    등록 결과: 성공 {bulkState.results.filter((r) => r.ok).length}건 / 실패{" "}
                    {bulkState.results.filter((r) => !r.ok).length}건
                  </p>
                  {bulkState.results.map((r, i) => (
                    <p key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
                      {r.line} — {r.ok ? "등록됨" : r.error}
                    </p>
                  ))}
                </div>
              )}
            </form>
          </div>

          <Button type="button" variant="ghost" onClick={() => setFormMode("none")}>
            닫기
          </Button>
        </div>
      )}
    </div>
  );
}
