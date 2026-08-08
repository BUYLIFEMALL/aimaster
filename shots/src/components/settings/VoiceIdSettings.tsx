"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { saveVoiceIdAction, deleteVoiceIdAction, type SaveVoiceIdState } from "@/lib/actions/settings";

const initialState: SaveVoiceIdState = {};

export function VoiceIdSettings({
  currentVoiceId,
  currentConnectionId,
}: {
  currentVoiceId: string | null;
  currentConnectionId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(saveVoiceIdAction, initialState);
  const isSet = !!currentVoiceId;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      {isSet && (
        <div className="mb-2 flex items-center justify-end">
          <form action={deleteVoiceIdAction}>
            <button
              type="submit"
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              삭제
            </button>
          </form>
        </div>
      )}
      <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-neutral-500">
        <li>
          <span className="font-medium text-neutral-700">Voice ID만 입력</span> — JSON2Video 자체
          ElevenLabs 연동으로 더빙 (공개 Voice)
        </li>
        <li>
          <span className="font-medium text-neutral-700">본인의 클론보이스/커스텀 음성 사용 희망 시</span>
          — json2video Connections 메뉴 → Connection ID 생성 후 입력 (선택사항)
        </li>
      </ul>

      {isSet ? (
        <div className="space-y-1 text-sm text-neutral-600">
          <p>
            <span className="font-bold text-neutral-900">Voice ID:</span>{" "}
            <span className="font-mono">{currentVoiceId}</span>
          </p>
          {currentConnectionId && (
            <p>
              <span className="font-bold text-neutral-900">Connection ID:</span>{" "}
              <span className="font-mono">{currentConnectionId}</span>
            </p>
          )}
          <p className="text-xs text-neutral-400">등록됨</p>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">ElevenLabs Voice ID</label>
            <Input
              name="elevenlabsVoiceId"
              defaultValue={currentVoiceId ?? ""}
              placeholder="예: v1jVu1Ky28piIPEJqRrm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              ElevenLabs Connection ID (선택사항 — 커스텀 음성 사용시)
            </label>
            <Input
              name="elevenlabsConnectionId"
              defaultValue={currentConnectionId ?? ""}
              placeholder="예: my-elevenlabs (비워둬도 됨)"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </form>
      )}
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-green-600">저장되었습니다.</p>}
    </div>
  );
}
