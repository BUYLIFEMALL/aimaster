"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { chooseTelegramBotAction, connectTelegramAction, type TelegramActionState } from "@/lib/actions/telegram";

const initialState: TelegramActionState = {};

/** 이미 연결한 본인 봇 중에서 받을 봇을 고른다. 토큰을 다시 넣지 않는다 */
export function TelegramBotPicker({ bots }: { bots: { slug: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState(chooseTelegramBotAction, initialState);

  return (
    <form action={formAction} className="mb-4 space-y-2">
      <p className="text-sm font-semibold text-mx-text">이미 연결한 봇에서 고르기</p>
      <div className="flex flex-wrap gap-2">
        <select name="source" required aria-label="받을 봇" className="mx-input min-h-[40px] max-w-md flex-1 py-2 text-sm">
          {bots.map((b) => (
            <option key={b.slug} value={b.slug}>@{b.name}</option>
          ))}
        </select>
        <Button type="submit" disabled={isPending}>
          {isPending ? "확인 메시지 보내는 중..." : "이 봇으로 받기"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
    </form>
  );
}

export function TelegramConnectForm() {
  const [state, formAction, isPending] = useActionState(connectTelegramAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <Input
        name="botToken"
        placeholder="봇 토큰 (예: 123456:AAF...)"
        required
        autoComplete="off"
      />
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "확인 중..." : "연동 확인하기"}
      </Button>
    </form>
  );
}
