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
  toggleBroadcastRecipientExcludedAction,
  updateBroadcastRecipientAction,
  type AddBroadcastRecipientState,
  type BulkAddBroadcastRecipientsState,
} from "@/lib/actions/broadcastRecipients";
import { createBroadcastGroupAction, deleteBroadcastGroupAction, type CreateGroupState } from "@/lib/actions/broadcastGroups";
import {
  sendCustomBroadcastAction,
  sendReportAlimtalkToRecipientsAction,
  sendReportEmailToRecipientsAction,
  type BroadcastSendResultRow,
} from "@/lib/actions/broadcastSend";
import { setEmailDualSendEnabledAction } from "@/lib/actions/solapiAccount";

export interface BroadcastRecipientData {
  id: string;
  phone: string | null;
  label: string | null;
  email: string | null;
  group_id: string | null;
  excluded: boolean;
}

export interface BroadcastGroupData {
  id: string;
  name: string;
}

export interface RecentReportData {
  id: string;
  title: string;
  created_at: string;
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
const EXCLUDED_FILTER = "__excluded__";
// 전화번호 없이 이메일만 등록한 수신자를 따로 볼 수 있는 필터 — 이 사람들은 카카오톡 채널
// 없이 이메일로만 정보성 콘텐츠를 받는다(사용자 지시, 2026-09-10).
const EMAIL_ONLY_FILTER = "__email_only__";
// stepmail의 리드 목록(app/(dashboard)/leads/page.tsx)과 동일한 페이지당 표시 수 —
// 수백 명 단위에서 스크롤 박스 대신 하단 페이지 번호로 넘겨보는 게 참고 화면과 더 가깝다
// (사용자 피드백, 2026-09-10).
const RECIPIENTS_PAGE_SIZE = 50;

function maskPhone(phone: string | null): string {
  if (!phone) return "-";
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
  hasSmtpAccount,
  emailDualSendEnabled,
  recentReports,
}: {
  recipients: BroadcastRecipientData[];
  groups: BroadcastGroupData[];
  hasSolapiChannel: boolean;
  channelFriendUrl: string | null;
  hasAlimtalkTemplate: boolean;
  hasSmtpAccount: boolean;
  emailDualSendEnabled: boolean;
  recentReports: RecentReportData[];
}) {
  const router = useRouter();
  // 카카오 발송 시 이메일을 함께/대체로 쓸지 켜고 끄는 토글 — 서버 값으로 낙관적 갱신한다.
  const [emailDualSendOn, setEmailDualSendOn] = useState(emailDualSendEnabled);
  const [isTogglingEmailDualSend, setIsTogglingEmailDualSend] = useState(false);
  const [emailDualSendError, setEmailDualSendError] = useState<string | null>(null);
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
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveGroupId, setBulkMoveGroupId] = useState(UNSELECTED);
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResults, setSendResults] = useState<BroadcastSendResultRow[] | null>(null);
  const [togglingExcludedId, setTogglingExcludedId] = useState<string | null>(null);
  // 알림톡으로 리포트 보내기 — 자유 문구 발송(브랜드메시지)과는 완전히 별개 패널이다.
  // 두 그룹(자유 메시지=브랜드메시지 / 정보 콘텐츠=알림톡)을 헷갈리지 않도록 버튼과 안내
  // 문구를 분리해뒀다(사용자 지시, 2026-09-10).
  const [showAlimtalkPanel, setShowAlimtalkPanel] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [isSendingAlimtalk, setIsSendingAlimtalk] = useState(false);
  const [alimtalkError, setAlimtalkError] = useState<string | null>(null);
  const [alimtalkResults, setAlimtalkResults] = useState<BroadcastSendResultRow[] | null>(null);
  // 이메일로 리포트 직접 발송 — 전화번호 없이 이메일만 등록한 수신자를 위한 세 번째
  // 발송 경로다(사용자 지시, 2026-09-10). 알림톡 패널과 동일한 구조.
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [selectedEmailReportId, setSelectedEmailReportId] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailResults, setEmailResults] = useState<BroadcastSendResultRow[] | null>(null);

  const filteredRecipients = recipients.filter((r) => {
    if (activeFilter === "all") return true;
    if (activeFilter === EXCLUDED_FILTER) return r.excluded;
    if (activeFilter === EMAIL_ONLY_FILTER) return !r.phone && Boolean(r.email);
    if (activeFilter === UNGROUPED) return !r.group_id;
    return r.group_id === activeFilter;
  });
  const searchDigits = searchQuery.replace(/[^0-9]/g, "");
  const searchText = searchQuery.trim().toLowerCase();
  const visibleRecipients = filteredRecipients.filter((r) => {
    if (!searchText) return true;
    const labelMatch = r.label?.toLowerCase().includes(searchText);
    const phoneMatch = Boolean(r.phone) && searchDigits.length > 0 && r.phone!.includes(searchDigits);
    const emailMatch = r.email?.toLowerCase().includes(searchText);
    return Boolean(labelMatch) || phoneMatch || Boolean(emailMatch);
  });
  const defaultGroupForNew =
    activeFilter !== "all" && activeFilter !== UNGROUPED && activeFilter !== EXCLUDED_FILTER && activeFilter !== EMAIL_ONLY_FILTER
      ? activeFilter
      : "";
  // 발송제외 처리된 사람은 체크박스로 선택해서 보내는 대상에 포함시키지 않는다.
  const selectableVisibleRecipients = visibleRecipients.filter((r) => !r.excluded);
  const allVisibleSelected =
    selectableVisibleRecipients.length > 0 && selectableVisibleRecipients.every((r) => selectedIds.has(r.id));
  const totalPages = Math.max(1, Math.ceil(visibleRecipients.length / RECIPIENTS_PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedRecipients = visibleRecipients.slice(
    (currentPageSafe - 1) * RECIPIENTS_PAGE_SIZE,
    currentPageSafe * RECIPIENTS_PAGE_SIZE,
  );

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        selectableVisibleRecipients.forEach((r) => next.delete(r.id));
        return next;
      }
      const next = new Set(prev);
      selectableVisibleRecipients.forEach((r) => next.add(r.id));
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

  async function handleSend() {
    if (selectedIds.size === 0) return;
    if (!sendMessage.trim()) {
      setSendError("발송할 메시지를 입력해주세요.");
      return;
    }
    if (!confirm(`선택한 ${selectedIds.size}명에게 카카오톡을 실제로 발송합니다. 계속할까요?`)) return;

    setSendError(null);
    setSendResults(null);
    setIsSending(true);
    try {
      const res = await sendCustomBroadcastAction(Array.from(selectedIds), sendMessage);
      if (res.error) {
        setSendError(res.error);
      } else {
        setSendResults(res.results ?? []);
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendAlimtalk() {
    if (selectedIds.size === 0) return;
    if (!selectedReportId) {
      setAlimtalkError("보낼 리포트를 선택해주세요.");
      return;
    }
    if (!confirm(`선택한 ${selectedIds.size}명에게 알림톡을 실제로 발송합니다. 계속할까요?`)) return;

    setAlimtalkError(null);
    setAlimtalkResults(null);
    setIsSendingAlimtalk(true);
    try {
      const res = await sendReportAlimtalkToRecipientsAction(Array.from(selectedIds), selectedReportId);
      if (res.error) {
        setAlimtalkError(res.error);
      } else {
        setAlimtalkResults(res.results ?? []);
      }
    } finally {
      setIsSendingAlimtalk(false);
    }
  }

  async function handleSendEmail() {
    if (selectedIds.size === 0) return;
    if (!selectedEmailReportId) {
      setEmailError("보낼 리포트를 선택해주세요.");
      return;
    }
    if (!confirm(`선택한 수신자 중 이메일이 등록된 사람에게 실제로 이메일을 발송합니다. 계속할까요?`)) return;

    setEmailError(null);
    setEmailResults(null);
    setIsSendingEmail(true);
    try {
      const res = await sendReportEmailToRecipientsAction(Array.from(selectedIds), selectedEmailReportId);
      if (res.error) {
        setEmailError(res.error);
      } else {
        setEmailResults(res.results ?? []);
      }
    } finally {
      setIsSendingEmail(false);
    }
  }

  /**
   * ON이면 카카오 발송이 성공해도 이메일이 등록된 사람에게 이메일을 함께 보내고,
   * 카카오 발송이 실패하면 이메일로 대체 발송한다. OFF면 카카오만 시도한다(사용자
   * 지시, 2026-09-10). 낙관적으로 먼저 바꾸고, 실패하면 되돌린다.
   */
  async function handleToggleEmailDualSend() {
    const next = !emailDualSendOn;
    setEmailDualSendOn(next);
    setEmailDualSendError(null);
    setIsTogglingEmailDualSend(true);
    try {
      const res = await setEmailDualSendEnabledAction(next);
      if (res.error) {
        setEmailDualSendOn(!next);
        setEmailDualSendError(res.error);
      } else {
        router.refresh();
      }
    } finally {
      setIsTogglingEmailDualSend(false);
    }
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
        setImportResult(
          `${res.importedCount ?? 0}명 등록 완료${
            res.duplicateCount
              ? ` (그중 ${res.duplicateCount}건은 전화번호/이메일이 기존과 겹쳐 "중복등록" 그룹으로 분류 + 자동 발송제외 처리됨 — 확인 후 필요하면 제외 해제하거나 삭제해주세요)`
              : ""
          }`,
        );
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
    setEditPhone(recipient.phone ?? "");
    setEditEmail(recipient.email ?? "");
    setEditError(null);
  }

  async function handleEditSave(id: string) {
    setEditError(null);
    setIsEditSaving(true);
    try {
      const res = await updateBroadcastRecipientAction(id, { label: editLabel, phone: editPhone, email: editEmail });
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

  async function handleToggleExcluded(id: string, excluded: boolean) {
    setTogglingExcludedId(id);
    try {
      await toggleBroadcastRecipientExcludedAction(id, excluded);
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      router.refresh();
    } finally {
      setTogglingExcludedId(null);
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
        등록한 전화번호로 리포트가 카카오톡으로 함께 발송됩니다.
        <br />
        브랜드 메시지는 채널친구에게만 발송되며, 친구 추가하지 않았다면 먼저 추가하도록
        안내해주세요.
        <br />
        이메일을 함께 등록해두면 카카오톡 발송이 실패시 이메일로 대체 발송합니다(이메일
        발송 기능 ON/OFF).
        <br />
        전화번호 없이 이메일만 등록하는 것도 가능하며, 이 경우 이메일로만 정보성
        콘텐츠를 받습니다.
      </p>
      <p className="text-xs text-neutral-500">
        📤 자유 메시지 발송(브랜드메시지 — 자유 문구, 채널 친구만 도달) / 📧 이메일로 리포트
        발송(전화번호 없는 이메일 전용 수신자용) / 📨 알림톡으로 리포트 발송(고정 템플릿 —
        자유 문구 불가, 비친구도 도달)은 서로 다른 발송 경로이니 상황에 맞게 선택해서 쓰세요.
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

      {/* 추가 폼은 버튼 바로 아래(목록 위)에 둔다 — 수백 명짜리 목록 맨 아래에 있으면
          클릭해도 화면 안에 폼이 보이지 않아 "추가가 안 된다"고 오해하기 쉽다
          (사용자 피드백, 2026-09-10). */}
      {formMode === "single" && (
        <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">이름/메모 (선택)</label>
            <Input name="label" placeholder="예: 친구1, 고객A" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">전화번호 (이메일만 등록할 경우 생략 가능)</label>
            <Input name="phone" placeholder="01012345678" autoComplete="off" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">
              이메일 (전화번호 생략 시 필수 — 카카오 발송 실패 시 대체 발송, 또는 이메일 전용 발송용)
            </label>
            <Input name="email" type="email" placeholder="friend1@example.com" autoComplete="off" />
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
              컬럼: 이름 / 전화번호 / 이메일 — 전화번호와 이메일 중 하나는 있어야 합니다
              (이메일만 있으면 이메일 전용 수신자로 등록). 이미 등록된 전화번호/이메일은
              자동으로 발송제외 처리됩니다(&quot;중복등록&quot; 그룹으로 분류 — 확인 후
              필요하면 제외 해제하거나 삭제하세요).
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
                  방법 2. 직접 텍스트로 붙여넣기 (한 줄에 한 명씩, &quot;이름,전화번호,이메일&quot; 형식)
                  <span className="block font-normal text-neutral-500">
                    - 이름/전화번호/이메일 각각 생략 가능하나 전화번호나 이메일 중 하나는 필요
                  </span>
                </label>
                <textarea
                  name="bulkPhones"
                  required
                  rows={8}
                  placeholder={"친구1,01012345678,friend1@example.com\n고객A,01098765432\n이메일만,,email-only@example.com"}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-900 outline-none focus:border-neutral-900"
                />
                <p className="mt-1 text-xs text-neutral-400">
                  한 번에 최대 500명. 이메일만 등록하려면 전화번호 자리를 비워두세요.
                </p>
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
                    등록 결과: 성공 {bulkState.results.filter((r) => r.ok && !r.duplicate).length}건 / 중복{" "}
                    {bulkState.results.filter((r) => r.duplicate).length}건(&quot;중복등록&quot; 그룹 분류 + 발송제외) / 실패{" "}
                    {bulkState.results.filter((r) => !r.ok).length}건
                  </p>
                  {bulkState.results.map((r, i) => (
                    <p key={i} className={!r.ok ? "text-red-600" : r.duplicate ? "text-amber-600" : "text-green-600"}>
                      {r.line} — {r.ok ? (r.duplicate ? `등록됨 (중복 — "중복등록" 그룹 분류 + 발송제외)` : "등록됨") : r.error}
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

      {recipients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", name: `전체 (${recipients.length})` },
            ...(groups.length > 0
              ? [
                  { id: UNGROUPED, name: `미분류 (${recipients.filter((r) => !r.group_id).length})` },
                  ...groups.map((g) => ({ id: g.id, name: `${g.name} (${recipients.filter((r) => r.group_id === g.id).length})` })),
                ]
              : []),
            { id: EMAIL_ONLY_FILTER, name: `이메일 전용 (${recipients.filter((r) => !r.phone && r.email).length})` },
            { id: EXCLUDED_FILTER, name: `발송제외 (${recipients.filter((r) => r.excluded).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveFilter(tab.id);
                setCurrentPage(1);
              }}
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="이름 또는 전화번호 검색"
          />

          {selectedIds.size > 0 && (
            <div className="space-y-2 rounded-lg bg-yellow-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
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
                    setShowSendPanel(false);
                    setShowAlimtalkPanel(false);
                    setShowEmailPanel(false);
                  }}
                  className="text-xs font-semibold text-neutral-500 hover:underline"
                >
                  선택 해제
                </button>
              </div>
              {/* 발송 버튼 3개는 그룹이동 컨트롤과 같은 줄에 두면 화면 폭이 좁을 때 "자유
                  메시지 발송" 버튼만 먼저 줄바꿈돼 다른 버튼들과 멀리 떨어져 보인다 — 버튼끼리
                  항상 붙어 보이도록 별도 줄로 분리한다(사용자 피드백, 2026-09-10). */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="info"
                  onClick={() => {
                    setShowSendPanel((v) => !v);
                    setShowAlimtalkPanel(false);
                    setShowEmailPanel(false);
                  }}
                  className="text-xs"
                >
                  {showSendPanel ? "발송 닫기" : "📤 자유 메시지 발송"}
                </Button>
                {hasSolapiChannel ? (
                  <Button
                    type="button"
                    variant={emailDualSendOn ? "info" : "muted"}
                    onClick={handleToggleEmailDualSend}
                    disabled={isTogglingEmailDualSend}
                    className="text-xs"
                    title="카카오 발송 시 이메일이 등록된 사람에게 이메일을 함께/대체로 보낼지 켜고 끕니다"
                  >
                    📧 이메일 함께 발송 {emailDualSendOn ? "ON" : "OFF"}
                  </Button>
                ) : (
                  <span className="text-xs text-neutral-400">
                    (SOLAPI 카카오 채널을 연동하면 이메일 함께 발송 여부를 설정할 수 있어요)
                  </span>
                )}
                <span className="mx-1 text-neutral-300">|</span>
                {hasSmtpAccount ? (
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => {
                      setShowEmailPanel((v) => !v);
                      setShowSendPanel(false);
                      setShowAlimtalkPanel(false);
                    }}
                    className="text-xs"
                  >
                    {showEmailPanel ? "발송 닫기" : "📧 이메일로 리포트 발송"}
                  </Button>
                ) : (
                  <span className="text-xs text-neutral-400">
                    (설정 페이지에 SMTP 계정을 등록하면 이메일 전용 수신자에게도 리포트를 보낼 수 있어요)
                  </span>
                )}
                {hasAlimtalkTemplate ? (
                  <Button
                    type="button"
                    variant="info"
                    onClick={() => {
                      setShowAlimtalkPanel((v) => !v);
                      setShowSendPanel(false);
                      setShowEmailPanel(false);
                    }}
                    className="text-xs"
                  >
                    {showAlimtalkPanel ? "발송 닫기" : "📨 알림톡으로 리포트 발송"}
                  </Button>
                ) : (
                  <span className="text-xs text-neutral-400">
                    (알림톡 템플릿을 등록하면 채널 친구가 아니어도 리포트를 보낼 수 있어요)
                  </span>
                )}
              </div>
              {emailDualSendError && <p className="text-xs text-red-600">{emailDualSendError}</p>}
            </div>
          )}

          {selectedIds.size > 0 && showSendPanel && (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">
                선택한 {selectedIds.size}명에게 지금 바로 카카오톡(브랜드메시지)을 보냅니다 — 채널을
                친구 추가한 사람에게만 도달합니다. 알림톡 템플릿은 정보성 고정 문구만 가능해 자유
                메시지 발송에는 쓸 수 없습니다.
              </p>
              <textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                rows={4}
                placeholder="보낼 메시지를 입력하세요."
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              />
              {sendError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{sendError}</p>}
              <Button type="button" onClick={handleSend} disabled={isSending}>
                {isSending ? "발송 중..." : `선택한 ${selectedIds.size}명에게 발송`}
              </Button>
              {sendResults && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg bg-white p-3 text-xs">
                  <p className="mb-1 font-semibold text-neutral-700">
                    발송 결과: 성공 {sendResults.filter((r) => r.ok).length}건 / 실패{" "}
                    {sendResults.filter((r) => !r.ok).length}건
                  </p>
                  {sendResults.map((r, i) => (
                    <p key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
                      {r.label ?? "이름 없음"} ({maskPhone(r.phone)}) —{" "}
                      {r.ok ? (r.viaEmail ? "성공(이메일로 대체)" : "성공") : `실패: ${r.error}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedIds.size > 0 && showAlimtalkPanel && (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">
                선택한 {selectedIds.size}명에게 이미 생성된 리포트를 알림톡(고정 템플릿)으로
                보냅니다 — 채널 친구가 아니어도 도달합니다. 알림톡은 승인된 템플릿의 제목/URL
                자리만 채워 보내므로 자유 문구는 입력할 수 없습니다.
              </p>
              {recentReports.length === 0 ? (
                <p className="text-xs text-neutral-400">아직 생성된 리포트가 없습니다.</p>
              ) : (
                <select
                  value={selectedReportId}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
                >
                  <option value="">보낼 리포트 선택...</option>
                  {recentReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              )}
              {alimtalkError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{alimtalkError}</p>}
              <Button type="button" onClick={handleSendAlimtalk} disabled={isSendingAlimtalk || recentReports.length === 0}>
                {isSendingAlimtalk ? "발송 중..." : `선택한 ${selectedIds.size}명에게 알림톡 발송`}
              </Button>
              {alimtalkResults && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg bg-white p-3 text-xs">
                  <p className="mb-1 font-semibold text-neutral-700">
                    발송 결과: 성공 {alimtalkResults.filter((r) => r.ok).length}건 / 실패{" "}
                    {alimtalkResults.filter((r) => !r.ok).length}건
                  </p>
                  {alimtalkResults.map((r, i) => (
                    <p key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
                      {r.label ?? "이름 없음"} ({maskPhone(r.phone)}) —{" "}
                      {r.ok ? (r.viaEmail ? "성공(이메일로 대체)" : "성공") : `실패: ${r.error}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedIds.size > 0 && showEmailPanel && (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">
                선택한 수신자 중 이메일이 등록된 사람에게만 이미 생성된 리포트를 이메일로 직접
                보냅니다 — 전화번호가 없어도(이메일 전용 수신자) 도달합니다. 카카오 발송의
                대체가 아니라 이메일이 주 발송 경로입니다.
              </p>
              {recentReports.length === 0 ? (
                <p className="text-xs text-neutral-400">아직 생성된 리포트가 없습니다.</p>
              ) : (
                <select
                  value={selectedEmailReportId}
                  onChange={(e) => setSelectedEmailReportId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
                >
                  <option value="">보낼 리포트 선택...</option>
                  {recentReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              )}
              {emailError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{emailError}</p>}
              <Button type="button" onClick={handleSendEmail} disabled={isSendingEmail || recentReports.length === 0}>
                {isSendingEmail ? "발송 중..." : "이메일로 리포트 발송"}
              </Button>
              {emailResults && (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg bg-white p-3 text-xs">
                  <p className="mb-1 font-semibold text-neutral-700">
                    발송 결과: 성공 {emailResults.filter((r) => r.ok).length}건 / 실패{" "}
                    {emailResults.filter((r) => !r.ok).length}건
                  </p>
                  {emailResults.map((r, i) => (
                    <p key={i} className={r.ok ? "text-green-600" : "text-red-600"}>
                      {r.label ?? "이름 없음"} — {r.ok ? "성공" : `실패: ${r.error}`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs font-semibold text-neutral-500">
            {searchText || activeFilter !== "all" ? `${visibleRecipients.length.toLocaleString()}명 표시 중` : `등록됨 ${recipients.length.toLocaleString()}명`}
          </p>

          {visibleRecipients.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-xs text-neutral-400">
              {searchText ? "검색 결과가 없습니다." : "이 그룹에는 아직 수신자가 없습니다."}
            </p>
          ) : (
            // stepmail의 리드 목록(LeadsTable)과 동일하게 카드형 박스 대신 얇은 구분선의
            // 표 형태로 렌더링한다(사용자 피드백, 2026-09-10) — 행마다 테두리 박스를 치지 않고
            // 한 카드 안에서 표처럼 촘촘하게 보여주는 편이 수백 명 단위에서 더 읽기 쉽다. 내부
            // 스크롤 박스 대신 stepmail 리드 페이지와 동일하게 하단 페이지 번호로 넘겨본다.
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="w-8 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        disabled={selectableVisibleRecipients.length === 0}
                        aria-label="전체 선택"
                      />
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-neutral-500">이름</th>
                    <th className="px-3 py-2 text-xs font-semibold text-neutral-500">전화번호</th>
                    <th className="px-3 py-2 text-xs font-semibold text-neutral-500">이메일</th>
                    {groups.length > 0 && <th className="px-3 py-2 text-xs font-semibold text-neutral-500">그룹</th>}
                    <th className="px-3 py-2 text-xs font-semibold text-neutral-500">상태</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRecipients.map((recipient) =>
                    editingId === recipient.id ? (
                      <tr key={recipient.id} className="border-b border-neutral-50 bg-yellow-50 last:border-0">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2">
                          <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="이름/메모" className="text-xs" />
                        </td>
                        <td className="px-3 py-2">
                          <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="전화번호" className="text-xs" />
                        </td>
                        <td className="px-3 py-2">
                          <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="이메일(선택)" className="text-xs" />
                        </td>
                        {groups.length > 0 && <td className="px-3 py-2"></td>}
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {editError && <span className="text-xs text-red-600">{editError}</span>}
                            <button
                              type="button"
                              onClick={() => handleEditSave(recipient.id)}
                              disabled={isEditSaving}
                              className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                            >
                              {isEditSaving ? "저장 중..." : "저장"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              disabled={isEditSaving}
                              className="text-xs font-semibold text-neutral-500 hover:underline disabled:opacity-50"
                            >
                              취소
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={recipient.id} className={`border-b border-neutral-50 last:border-0 ${recipient.excluded ? "opacity-60" : ""}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(recipient.id)}
                            onChange={() => toggleSelectOne(recipient.id)}
                            disabled={recipient.excluded}
                            aria-label={`${recipient.label ?? recipient.phone ?? recipient.email ?? "수신자"} 선택`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-neutral-900 whitespace-nowrap">{recipient.label ?? "-"}</td>
                        <td className="px-3 py-2 text-sm text-neutral-500 whitespace-nowrap">{maskPhone(recipient.phone)}</td>
                        <td className="px-3 py-2 text-sm text-neutral-500 whitespace-nowrap">{recipient.email ?? "-"}</td>
                        {groups.length > 0 && (
                          <td className="px-3 py-2">
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
                          </td>
                        )}
                        <td className="px-3 py-2">
                          {recipient.excluded ? (
                            <span className="whitespace-nowrap rounded-full bg-neutral-300 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                              발송제외
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-300">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button type="button" onClick={() => startEdit(recipient)} className="text-xs font-semibold text-blue-600 hover:underline">
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleExcluded(recipient.id, !recipient.excluded)}
                              disabled={togglingExcludedId === recipient.id}
                              className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50 whitespace-nowrap"
                            >
                              {togglingExcludedId === recipient.id ? "처리 중..." : recipient.excluded ? "제외 해제" : "발송제외 처리"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(recipient.id)}
                              disabled={deletingId === recipient.id}
                              className="text-xs font-semibold text-neutral-400 hover:underline disabled:opacity-50"
                            >
                              {deletingId === recipient.id ? "삭제 중..." : "삭제"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPageSafe) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-2">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-neutral-300">…</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                        p === currentPageSafe
                          ? "bg-yellow-500 text-white"
                          : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
