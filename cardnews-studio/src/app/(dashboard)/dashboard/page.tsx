"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/cardnews/types";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote } from "@/components/studio/ui";
import { APP_NAME } from "@/lib/version";

export default function DashboardPage() {
  const router = useRouter();
  const { newProject, openProject, projectId, keys } = useStudio();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "목록을 불러오지 못했습니다.");
      setProjects(data.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: string) => {
    setBusyId(id);
    const ok = await openProject(id);
    setBusyId(null);
    if (ok) router.push("/plan");
    else setError("프로젝트를 열지 못했습니다.");
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "삭제하지 못했습니다.");
      if (id === projectId) newProject();
      setConfirmId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const start = () => {
    newProject();
    router.push("/plan");
  };

  const imageKeyMissing = keys && !keys.gemini;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{APP_NAME}</h1>
            <p className="mt-1 text-sm text-gray-500">주제만 넣으면 AI가 페이지별 문구와 배경을 만들고, 글자가 얹힌 카드뉴스를 PNG로 완성합니다. 모든 AI 호출은 회원님 본인의 키로 이루어집니다.</p>
          </div>

          <button type="button" onClick={start} className={BTN_PRIMARY}>
            <Plus size={16} /> 새 카드뉴스 만들기
          </button>
        </div>
        {imageKeyMissing && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            배경 이미지를 만들려면 Gemini API 키가 필요합니다. 왼쪽 메뉴의 API키등록·플랫폼연동에서 본인 키를 등록해주세요.
          </p>
        )}
        <ol className="mt-4 grid gap-2 text-xs text-gray-600 sm:grid-cols-5">
          {["① 기획: 분야·주제·어조", "② 문구: AI가 쓴 글 다듬기", "③ 디자인: 화풍·글자·배치", "④ 배경 생성: 페이지별 이미지", "⑤ 내보내기: PNG 저장"].map((t) => (
            <li key={t} className="rounded-lg bg-gray-50 px-3 py-2">
              {t}
            </li>
          ))}
        </ol>
      </Card>

      {error && <ErrorNote message={error} />}

      <Card>
        <h2 className="text-base font-bold text-gray-900">내 프로젝트</h2>
        {projects === null ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
          </p>
        ) : projects.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">아직 저장된 프로젝트가 없습니다. 새 카드뉴스를 만들어 보세요.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id} className="flex gap-3 rounded-xl border border-gray-200 p-3">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900" title={p.title}>
                    {p.title}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {p.category}
                    {p.topic ? ` · ${p.topic}` : ""}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {p.pageCount}장 · {new Date(p.updatedAt).toLocaleString("ko-KR")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {confirmId === p.id ? (
                      <>
                        <button type="button" disabled={busyId === p.id} onClick={() => void remove(p.id)} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                          {busyId === p.id ? "삭제 중…" : "삭제 확인"}
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-gray-500 underline">
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" disabled={busyId === p.id} onClick={() => void open(p.id)} className={`${BTN_GHOST} px-3 py-1 text-xs`}>
                          {busyId === p.id ? "여는 중…" : "열기"}
                        </button>
                        <button type="button" aria-label="삭제" onClick={() => setConfirmId(p.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-gray-500">프로젝트를 삭제하면 그 프로젝트의 배경 이미지도 함께 삭제됩니다.</p>
      </Card>
    </div>
  );
}
