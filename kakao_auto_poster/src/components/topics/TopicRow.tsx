"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { toggleTopicActiveAction, deleteTopicAction, generateReportAction, type GenerateReportState } from "@/lib/actions/topics";

interface TopicRowProps {
  id: string;
  topicName: string;
  keywords: string[];
  isActive: boolean;
}

const initialState: GenerateReportState = {};

export function TopicRow({ id, topicName, keywords, isActive }: TopicRowProps) {
  const [state, formAction, isPending] = useActionState(generateReportAction, initialState);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-neutral-900">{topicName}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {keywords.map((k) => (
              <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {k}
              </span>
            ))}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            isActive ? "bg-yellow-100 text-yellow-800" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {isActive ? "활성" : "비활성"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        <form action={formAction}>
          <input type="hidden" name="topicId" value={id} />
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "생성 중..." : "✨ 지금 생성"}
          </Button>
        </form>
        <form action={toggleTopicActiveAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="isActive" value={String(isActive)} />
          <Button type="submit" variant="ghost">
            {isActive ? "비활성화" : "활성화"}
          </Button>
        </form>
        <form action={deleteTopicAction}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" className="text-red-600 hover:bg-red-50">
            삭제
          </Button>
        </form>
      </div>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
