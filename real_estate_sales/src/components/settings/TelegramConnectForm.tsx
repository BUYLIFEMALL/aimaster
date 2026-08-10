"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { connectTelegramAction, type TelegramActionState } from "@/lib/actions/telegram";

const initialState: TelegramActionState = {};

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
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-green-400">{state.success}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "확인 중..." : "연동 확인하기"}
      </Button>
    </form>
  );
}
