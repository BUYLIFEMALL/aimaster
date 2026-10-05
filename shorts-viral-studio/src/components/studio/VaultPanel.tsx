"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { deleteSavedPromptAction, listSavedPromptsAction } from "@/lib/actions/savedPrompts";
import { downloadPromptSetMarkdown, formatPromptSetText } from "@/lib/export";
import { Card, CopyBox, ErrorBanner, GhostButton, StepHeader } from "@/components/studio/ui";
import type { SavedPromptSet } from "@/types/svs";

function matches(set: SavedPromptSet, q: string): boolean {
  if (!q) return true;
  const hay = [
    set.title,
    set.ideaTitle,
    set.hook,
    set.keyword,
    set.bgmPrompt?.sunoPrompt ?? "",
    ...set.prompts.flatMap((p) => [p.sceneSummary, p.imagePrompt, p.videoPrompt]),
  ]
    .join("\n")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function VaultPanel() {
  const [sets, setSets] = useState<SavedPromptSet[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    const res = await listSavedPromptsAction();
    if (res.success && res.data) {
      setSets(res.data);
      setError(null);
    } else {
      setSets([]);
      setError(res.error ?? "보관함을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => (sets ?? []).filter((s) => matches(s, query.trim())), [sets, query]);

  async function remove(id: string) {
    if (!window.confirm("이 프롬프트 세트를 보관함에서 삭제할까요? 되돌릴 수 없습니다.")) return;
    const res = await deleteSavedPromptAction(id);
    if (!res.success) {
      setError(res.error ?? "삭제하지 못했습니다.");
      return;
    }
    if (openId === id) setOpenId(null);
    await refresh();
  }

  async function copyAll(set: SavedPromptSet) {
    try {
      await navigator.clipboard.writeText(formatPromptSetText(set));
      setCopiedId(set.id);
      setTimeout(() => setCopiedId((cur) => (cur === set.id ? null : cur)), 1500);
    } catch {
      setError("클립보드에 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">📚 프롬프트 보관함</h1>
        <p className="mt-1 text-sm text-neutral-500">
          6단계에서 <strong>보관함에 저장</strong>한 최종 이미지·영상·BGM 프롬프트를 모아 봅니다. 프로젝트와 달리 직접 삭제할 때까지 보관됩니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·키워드·프롬프트 내용으로 검색"
          className="min-w-[240px] flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
        />
        <span className="text-xs text-neutral-500">
          {sets === null ? "" : `${filtered.length}세트${query ? ` / 전체 ${sets.length}세트` : ""}`}
        </span>
      </div>

      <ErrorBanner message={error} />

      {sets === null ? (
        <Card>
          <p className="py-8 text-center text-sm text-neutral-400">불러오는 중…</p>
        </Card>
      ) : sets.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-neutral-400">
            아직 저장된 프롬프트가 없습니다.{" "}
            <Link href="/prompts" className="font-semibold text-rose-600 underline">
              6단계 프롬프트
            </Link>
            에서 프롬프트를 만든 뒤 &lsquo;보관함에 저장&rsquo;을 눌러 보세요.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-neutral-400">검색 결과가 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((set) => {
            const open = openId === set.id;
            return (
              <Card key={set.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-bold text-neutral-900" title={set.title}>
                      {set.title}
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-500">
                      {set.keyword ? `키워드 ${set.keyword} · ` : ""}씬 {set.prompts.length}개
                      {set.bgmPrompt ? " · BGM 포함" : ""} · 저장 {new Date(set.createdAt).toLocaleString("ko-KR")}
                    </div>
                    {set.hook && <div className="mt-1.5 text-xs text-neutral-600">⚡ &ldquo;{set.hook}&rdquo;</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <GhostButton onClick={() => setOpenId(open ? null : set.id)} className="py-1.5 text-xs">
                      {open ? "접기" : "펼쳐 보기"}
                    </GhostButton>
                    <GhostButton onClick={() => copyAll(set)} className="py-1.5 text-xs">
                      {copiedId === set.id ? "복사됨!" : "세트 전체 복사"}
                    </GhostButton>
                    <GhostButton onClick={() => downloadPromptSetMarkdown(set)} className="py-1.5 text-xs">
                      📥 .md
                    </GhostButton>
                    <button
                      type="button"
                      onClick={() => remove(set.id)}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
                    {set.bgmPrompt?.sunoPrompt && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-3.5">
                        <div className="mb-2 text-sm font-bold text-neutral-900">
                          🎵 {set.bgmPrompt.title}
                          {set.bgmPrompt.bpm ? <span className="ml-2 text-xs font-normal text-neutral-500">{set.bgmPrompt.bpm}</span> : null}
                        </div>
                        <CopyBox label="SUNO / UDIO PROMPT" text={set.bgmPrompt.sunoPrompt} tone="dark" />
                      </div>
                    )}
                    {set.prompts.map((p) => (
                      <div key={p.sceneNumber} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-xs font-extrabold text-rose-600">
                            SCENE {p.sceneNumber}
                          </span>
                          <span className="text-xs text-neutral-500">{p.sceneSummary}</span>
                        </div>
                        <div className="space-y-3">
                          {p.imagePrompt && <CopyBox label="🖼️ IMAGE PROMPT (9:16)" text={p.imagePrompt} tone="dark" />}
                          {p.videoPrompt && <CopyBox label="🎥 VIDEO MOTION PROMPT" text={p.videoPrompt} tone="green" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
