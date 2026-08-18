"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFormSourceAction,
  toggleFormSourceActiveAction,
  toggleNotifyChannelAction,
  updateFieldMappingAction,
} from "@/lib/actions/sources";

export interface FormSourceData {
  id: string;
  name: string;
  webhook_token: string;
  field_mapping: Record<string, string>;
  notify_email: boolean;
  notify_telegram: boolean;
  is_active: boolean;
}

function appsScriptSnippet(webhookUrl: string): string {
  return `function onFormSubmit(e) {
  var payload = {
    responseId: e.response ? e.response.getId() : Utilities.getUuid(),
    values: e.namedValues
  };
  UrlFetchApp.fetch("${webhookUrl}", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs font-semibold text-blue-600 hover:underline"
    >
      {copied ? "복사됨!" : "복사"}
    </button>
  );
}

export function SourceCard({ source }: { source: FormSourceData }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/form-submit/${source.webhook_token}`
      : `/api/webhooks/form-submit/${source.webhook_token}`;

  async function handleDelete() {
    if (!confirm(`"${source.name}" 연결을 삭제할까요? 저장된 접수 내역도 함께 삭제됩니다.`)) return;
    setIsDeleting(true);
    try {
      await deleteFormSourceAction(source.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleActive() {
    setIsToggling(true);
    try {
      await toggleFormSourceActiveAction(source.id, !source.is_active);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleToggleNotify(channel: "notify_email" | "notify_telegram") {
    await toggleNotifyChannelAction(source.id, channel, !source[channel]);
    router.refresh();
  }

  async function handleSaveMapping(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMappingError(null);
    setIsSavingMapping(true);
    try {
      const result = await updateFieldMappingAction(source.id, new FormData(e.currentTarget));
      if (result.error) setMappingError(result.error);
      else router.refresh();
    } finally {
      setIsSavingMapping(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-900">{source.name}</p>
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              source.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {source.is_active ? "연동 중" : "일시중지"}
          </span>
          <button type="button" onClick={handleToggleActive} disabled={isToggling} className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60">
            {source.is_active ? "일시중지" : "다시 켜기"}
          </button>
          <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-60">
            {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowSetup((v) => !v)}
        className="text-xs font-semibold text-blue-600 hover:underline"
      >
        {showSetup ? "연동 방법 접기" : "📎 구글시트에 연결하는 방법 보기"}
      </button>

      {showSetup && (
        <div className="space-y-3 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
          <ol className="list-inside list-decimal space-y-1">
            <li>구글폼의 &quot;응답&quot; 탭에서 스프레드시트 아이콘을 눌러 연결된 시트를 만드세요.</li>
            <li>그 시트에서 <b>확장 프로그램 → Apps Script</b>를 열고, 아래 코드를 전체 붙여넣은 뒤 저장하세요.</li>
            <li>Apps Script 편집기의 <b>트리거(시계 아이콘) → 트리거 추가</b>에서 이벤트 유형을 &quot;양식 제출 시&quot;로 등록하세요.</li>
            <li>폼에 테스트 응답을 1건 제출하면, 잠시 후 &quot;접수 내역&quot; 페이지에 떠요.</li>
          </ol>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-gray-700">웹훅 URL</span>
              <CopyButton text={webhookUrl} />
            </div>
            <code className="block break-all rounded-lg bg-white border border-gray-200 px-3 py-2 font-mono">{webhookUrl}</code>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Apps Script 코드</span>
              <CopyButton text={appsScriptSnippet(webhookUrl)} />
            </div>
            <pre className="overflow-x-auto rounded-lg bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-gray-100">
              {appsScriptSnippet(webhookUrl)}
            </pre>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveMapping} className="space-y-2 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-700">
          필드 매핑 — 구글폼 질문 제목을 정확히 입력하세요 (알림 문구에 쓰입니다)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <input
            name="nameQuestion"
            placeholder="이름 질문 (예: 성함)"
            defaultValue={source.field_mapping.name ?? ""}
            className="input-sm"
          />
          <input
            name="phoneQuestion"
            placeholder="연락처 질문 (예: 연락처)"
            defaultValue={source.field_mapping.phone ?? ""}
            className="input-sm"
          />
          <input
            name="emailQuestion"
            placeholder="이메일 질문 (예: 이메일)"
            defaultValue={source.field_mapping.email ?? ""}
            className="input-sm"
          />
        </div>
        {mappingError && <p className="text-xs text-red-600">{mappingError}</p>}
        <button
          type="submit"
          disabled={isSavingMapping}
          className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
        >
          {isSavingMapping ? "저장 중..." : "필드 매핑 저장"}
        </button>
      </form>

      <div className="flex gap-4 border-t border-gray-100 pt-4 text-xs">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={source.notify_email} onChange={() => handleToggleNotify("notify_email")} />
          신청자에게 이메일 발송
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={source.notify_telegram} onChange={() => handleToggleNotify("notify_telegram")} />
          운영자 텔레그램 알림
        </label>
      </div>
    </div>
  );
}
