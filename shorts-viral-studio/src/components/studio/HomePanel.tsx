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
      {/* 상단 히어로 배너 */}
      <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 via-white to-rose-50 p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-black text-red-600 shadow-xs mb-3">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <span>YOUTUBE SHORTS CREATOR STUDIO v2.0</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              AI 쇼츠 떡상 분석 및 대본 자동화
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl font-medium">
              구독자 대비 조회수 10배 이상 터진 떡상 영상을 데이터로 해체하고, 11대 바이럴 공식을 적용해
              씬당 1문장 대본과 영상 연출 프롬프트까지 10분 만에 완성합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <PrimaryButton
              onClick={() => {
                newProject();
                router.push("/search");
              }}
            >
              ⚡ 새 쇼츠 떡상 분석 시작
            </PrimaryButton>
            {hasWork && (
              <GhostButton onClick={() => router.push(nextStepOf(data))}>
                이어서 작업하기{title ? ` · ${title}` : ""}
              </GhostButton>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측: 시작 가이드 및 워크플로우 (2열) */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">🚀 6단계 올인원 제작 워크플로우</h2>
              <span className="text-xs font-bold text-red-600">30일 안전 자동보관</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-black text-red-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-bold">1</span>
                  <span>01. 쇼츠 검색 & 떡상 탐지</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  V/S Ratio(구독자 대비 조회수) 기준 10배↑ '초대박' 영상을 즉시 필터링합니다.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-black text-red-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-bold">2</span>
                  <span>02. 바이럴 메커니즘 해체</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  Gemini 영상 직접 분석으로 컷 전환, 무빙, 3초 락인 공식을 역설계합니다.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-black text-red-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-bold">3</span>
                  <span>03. 킬러 훅 & 소재 6종</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  검증된 바이럴 DNA를 이식해 내 채널 맞춤형 새 소재 6개를 자동 발굴합니다.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center gap-2 text-xs font-black text-red-600">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] text-white font-bold">4</span>
                  <span>04. 씬당 1문장 원칙 대본</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  시청 지속시간 100% 돌파를 위한 무한루프 엔딩 대본을 완성합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50/70 p-3 border border-red-100">
              <span className="text-xs font-bold text-red-700">🎬 완성된 대본은 shorts-onestop-studio로 바로 연결됩니다.</span>
              <Link href="/guide" className="text-xs font-black text-red-600 underline hover:text-red-700">
                매뉴얼 보기 ➔
              </Link>
            </div>
          </Card>

          {/* 내 프로젝트 보관함 */}
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">📂 최근 작업 프로젝트 보관함</h2>
              <span className="text-xs text-slate-500 font-medium">30일 보관 정책 적용</span>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {!projects ? (
              <div className="py-8 text-center text-xs text-slate-400">목록을 불러오는 중...</div>
            ) : projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                아직 저장된 프로젝트가 없습니다. 위의 <strong>[새 쇼츠 떡상 분석 시작]</strong> 버튼을 눌러보세요.
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {projects.map((p) => {
                  const days = daysLeft(p.created_at);
                  const isCur = p.id === projectId;
                  return (
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-bold text-slate-800 hover:text-red-600 cursor-pointer" onClick={() => open(p.id)}>
                            {p.title || "제목 없는 프로젝트"}
                          </span>
                          {isCur && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                              작업 중
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {p.keyword ? `키워드: ${p.keyword} · ` : ""}{p.updated_at.slice(0, 10)} 갱신 ·
                          <span className={days <= 3 ? "ml-1 font-bold text-red-600" : "ml-1 text-slate-500"}>
                            {days}일 후 만료
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => open(p.id)}
                          disabled={openingId === p.id}
                          className="btn-3d-yt-red px-3 py-1.5 text-xs font-bold text-white"
                        >
                          {openingId === p.id ? "여는 중..." : "열기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(p.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* 우측: 9:16 모바일 쇼츠 폰 뷰파인더 덱 목업 */}
        <div className="flex flex-col items-center">
          <div className="mb-2 text-xs font-black text-slate-500 uppercase tracking-wider">
            🔴 실시간 9:16 쇼츠 뷰파인더 시뮬레이터
          </div>
          <div className="phone-viewfinder-deck">
            {/* 상단 헤더 */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between text-white text-xs font-black">
              <span>Shorts Live</span>
              <span className="rounded bg-red-600/90 px-1.5 py-0.5 text-[10px]">V/S 14.2x 초대박</span>
            </div>

            {/* 메인 뷰포트 시뮬레이션 */}
            <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
              <span className="inline-block rounded-lg bg-yellow-400 px-3 py-1 text-xs font-black text-black shadow-md mb-3">
                💥 첫 3초 시선강탈 훅
              </span>
              <div className="text-white font-black text-lg leading-snug drop-shadow-md">
                "지금 이 영상 3초 안에<br />못 넘기면 당신은 천재!"
              </div>
              <div className="mt-3 text-xs text-slate-400 leading-tight">
                [카메라 줌인 + 반전 효과음]
              </div>
            </div>

            {/* 하단 오버레이 정보 */}
            <div className="absolute bottom-4 left-4 right-14 z-10 text-white">
              <div className="text-xs font-black mb-1">@바이럴크리에이터</div>
              <div className="text-[11px] text-slate-300 leading-tight line-clamp-2">
                인간의 뇌가 0.1초 만에 반응하는 충격적인 착시현상 3가지 #쇼츠 #심리
              </div>
            </div>

            {/* 우측 인터랙션 버튼 목업 */}
            <div className="absolute bottom-5 right-3 z-10 flex flex-col items-center gap-3.5 text-white">
              <div className="flex flex-col items-center text-[10px] font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-base">👍</span>
                <span>42.8만</span>
              </div>
              <div className="flex flex-col items-center text-[10px] font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-base">💬</span>
                <span>1,420</span>
              </div>
              <div className="flex flex-col items-center text-[10px] font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-base">↗️</span>
                <span>공유</span>
              </div>
              <div className="flex flex-col items-center text-[10px] font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-xs">🎵</span>
                <span>음원</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
