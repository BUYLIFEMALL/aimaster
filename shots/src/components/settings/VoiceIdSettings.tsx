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
    <div className="rounded-xl border border-[#202945] bg-[#161c33] p-4 shadow-sm">
      {isSet && (
        <div className="mb-2 flex items-center justify-end">
          <form action={deleteVoiceIdAction}>
            <button
              type="submit"
              className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition-colors"
            >
              삭제
            </button>
          </form>
        </div>
      )}
      <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-slate-400">
        <li>
          <span className="font-semibold text-slate-200">Voice ID만 입력</span> — JSON2Video 자체
          ElevenLabs 연동으로 더빙 (공개 Voice)
        </li>
        <li>
          <span className="font-semibold text-slate-200">본인의 클론보이스/커스텀 음성 사용 희망 시</span>
          — json2video Connections 메뉴 → Connection ID 생성 후 입력 (선택사항)
        </li>
      </ul>

      {isSet ? (
        <div className="space-y-1.5 text-sm text-slate-300">
          <p>
            <span className="font-bold text-white">Voice ID:</span>{" "}
            <span className="font-mono text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/40">{currentVoiceId}</span>
          </p>
          {currentConnectionId && (
            <p>
              <span className="font-bold text-white">Connection ID:</span>{" "}
              <span className="font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">{currentConnectionId}</span>
            </p>
          )}
          <p className="text-xs text-emerald-400 font-semibold pt-1">정상 등록됨</p>
        </div>
      ) : (
        <form action={formAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-300">
              ElevenLabs Voice ID
            </label>
            <Input
              name="voiceId"
              placeholder="예: 21m00Tcm4TlvDq8ikWAM"
              className="bg-[#0f1325] border-[#202945] text-white placeholder:text-slate-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-300">
              JSON2Video Connection ID <span className="text-slate-500 font-normal">(선택사항)</span>
            </label>
            <Input
              name="connectionId"
              placeholder="예: conn_abc123"
              className="bg-[#0f1325] border-[#202945] text-white placeholder:text-slate-500 focus:border-rose-500"
            />
          </div>
          {state.error && <p className="text-xs text-rose-400 font-semibold">{state.error}</p>}
          {state.success && <p className="text-xs text-emerald-400 font-semibold">저장되었습니다.</p>}
          <button
            type="submit"
            disabled={isPending}
            className="btn-3d-rec px-4 py-2 text-xs font-bold"
          >
            {isPending ? "저장 중..." : "음성 설정 저장"}
          </button>
        </form>
      )}
    </div>
  );
}
