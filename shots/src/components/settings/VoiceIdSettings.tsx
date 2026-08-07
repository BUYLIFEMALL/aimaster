"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveVoiceIdAction, type SaveVoiceIdState } from "@/lib/actions/settings";

const initialState: SaveVoiceIdState = {};

export function VoiceIdSettings({
  currentVoiceId,
  currentConnectionId,
}: {
  currentVoiceId: string | null;
  currentConnectionId: string | null;
}) {
  const [state, formAction, isPending] = useActionState(saveVoiceIdAction, initialState);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-neutral-900">ElevenLabs 내레이션 음성</p>
      <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-neutral-500">
        <li>
          <span className="font-medium text-neutral-700">Voice ID만 입력</span> — JSON2Video 자체
          ElevenLabs 연동으로 더빙 (공개 Voice)
        </li>
        <li>
          <span className="font-medium text-neutral-700">본인 클론보이스/커스텀 음성</span> 사용
          희망 시 — json2video Connections 메뉴 → Connection ID 생성 후 입력 (선택사항)
        </li>
      </ul>
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
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-green-600">저장되었습니다.</p>}
    </div>
  );
}
