"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProjectAction, listProjectsAction } from "@/lib/actions/projects";
import { useStudio } from "@/components/studio/StudioProvider";
import { Card, GhostButton, PrimaryButton } from "@/components/studio/ui";
import type { ProjectData, ProjectSummary } from "@/types/svs";

const RETENTION_DAYS = 30;

function nextStepOf(d: ProjectData): string {
  if (d.promptsResult) return "/prompts";
  if (d.scenes.length) return "/script";
  if (d.selectedIdea) return "/select";
  if (d.ideas.length) return "/ideate";
  if (d.analysis) return "/analyze";
  return "/search";
}

function daysLeft(createdAt: string): number {
  const ms = new Date(createdAt).getTime() + RETENTION_DAYS * 86400000 - Date.now();
  return Math.max(Math.ceil(ms / 86400000), 0);
}

export function HomePanel() {
  const router = useRouter();
  const { hydrated, data, title, newProject, loadProject, projectId } = useStudio();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function refresh() {
    const res = await listProjectsAction();
    if (res.success && res.data) {
      setProjects(res.data);
      setError(null);
    } else {
      setProjects([]);
      setError(res.error ?? "프로젝트 목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function open(id: string) {
    setOpeningId(id);
    const loaded = await loadProject(id);
    setOpeningId(null);
    if (!loaded) {
      setError("프로젝트를 불러오지 못했습니다.");
      return;
    }
    router.push(nextStepOf(loaded));
  }

  async function remove(id: string) {
    if (!window.confirm("이 프로젝트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await deleteProjectAction(id);
    if (id === projectId) newProject();
    await refresh();
  }

  const hasWork = hydrated && (data.videos.length > 0 || data.analysis || data.selectedIdea);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">쇼츠 떡상 분석·대본 자동화</h1>
        <p className="mt-1 text-sm text-neutral-500">
          떡상 쇼츠 검색 → 바이럴 분석 → 소재 발굴 → 대본 → 이미지·영상·BGM 프롬프트까지 한 흐름으로 만듭니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="text-base font-bold text-neutral-900">작업 시작하기</h2>
          <ol className="mt-3 space-y-1.5 text-sm text-neutral-600">
            <li>① <Link href="/settings" className="font-semibold text-rose-600 underline">API키등록·플랫폼연동</Link>에서 YouTube 키와 AI 키(Gemini 권장)를 등록합니다.</li>
            <li>② 쇼츠를 검색해 구독자 대비 조회수가 터진 영상을 최대 3개 고릅니다.</li>
            <li>③ 분석 → 소재 6개 → 주제 확정 → 대본 → 프롬프트 순서로 진행합니다.</li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton
              onClick={() => {
                newProject();
                router.push("/search");
              }}
            >
              새 프로젝트 시작
            </PrimaryButton>
            {hasWork && (
              <GhostButton onClick={() => router.push(nextStepOf(data))}>
                진행 중인 작업 이어서 하기{title ? ` · ${title}` : ""}
              </GhostButton>
            )}
          </div>
        </Card>
        <Card className="bg-neutral-50/60">
          <h2 className="text-sm font-bold text-neutral-900">알아두세요</h2>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-neutral-600">
            <li>• 프로젝트는 만든 지 {RETENTION_DAYS}일 뒤 자동 삭제됩니다. (YouTube 데이터 보관 정책)</li>
            <li>• 필요한 결과는 .md 파일로 저장해 두세요.</li>
            <li>• 검색 1회는 YouTube 할당량 약 100유닛을 씁니다.</li>
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-bold text-neutral-900">내 프로젝트</h2>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
        {projects === null ? (
          <p className="py-8 text-center text-sm text-neutral-400">불러오는 중…</p>
        ) : projects.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">저장된 프로젝트가 없습니다. 새 프로젝트를 시작해 보세요.</p>
        ) : (
          <div className="mt-3 divide-y divide-neutral-100">
            {projects.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900">{p.title}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-400">
                    키워드 {p.keyword || "-"} · 수정 {new Date(p.updated_at).toLocaleString("ko-KR")} · {daysLeft(p.created_at)}일 후 자동삭제
                  </div>
                </div>
                <div className="flex gap-2">
                  <GhostButton onClick={() => open(p.id)} disabled={openingId === p.id} className="py-1.5 text-xs">
                    {openingId === p.id ? "여는 중…" : "열기"}
                  </GhostButton>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
