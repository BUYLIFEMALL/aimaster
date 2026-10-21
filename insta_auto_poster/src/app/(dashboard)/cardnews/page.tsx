"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, Sparkles, BookOpen, Layers, Lightbulb, PenLine, Palette, ImageIcon, Download } from "lucide-react";
import type { ProjectSummary } from "@/lib/cardnews/types";
import { useStudio } from "@/components/cardnews/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote } from "@/components/cardnews/studio/ui";
import { APP_VERSION } from "@/lib/version";
import { InstaWeekPosts } from "@/components/weekChart/InstaWeekPosts";

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
    if (ok) router.push("/cardnews/plan");
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
    router.push("/cardnews/plan");
  };

  const imageKeyMissing = keys && !keys.gemini;

  return (
    <div className="space-y-6">
      {/* 1. 상단 환영 & 액션 카드 */}
      <Card className="relative overflow-hidden border-purple-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-100">🎨 카드뉴스 스튜디오</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-pink-500/10 text-pink-400 border border-pink-500/30">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              주제만 입력하면 AI가 페이지별 문구와 고화질 배경을 만들고, 글자가 얹힌 완성형 카드뉴스와 인스타그램 피드 캡션을 제작합니다. 모든 AI 호출은 회원 본인 소유의 키로 안전하게 격리 처리됩니다.
            </p>
          </div>

          <button type="button" onClick={start} className={BTN_PRIMARY}>
            <Plus size={16} /> 새 카드뉴스 만들기
          </button>
        </div>

        {imageKeyMissing && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-center justify-between">
            <span>⚠️ 배경 이미지를 생성하려면 Gemini API 키가 필요합니다. 본인 키를 등록해주세요.</span>
            <Link href="/cardnews/settings" className="font-bold underline text-amber-400 hover:text-amber-300 ml-2">
              API 키 등록하기 →
            </Link>
          </div>
        )}
      </Card>

      {/* v1.45 카드뉴스 최근 7일 게시(공용 기준 코드 `insta-week-posts`, 본인 카드뉴스 게시 기록 최근 30건) */}
      <InstaWeekPosts
        postsUrl="/api/cardnews/instagram/posts"
        defaultOpen
        cardClassName="rounded-2xl border border-[#262c3d] bg-[#161922] p-5 text-slate-100"
        classes={{ border: "border-[#262c3d]", item: "bg-[#11141c]", muted: "text-slate-400", danger: "text-red-400" }}
      />

      {/* 2. 5단계 카드뉴스 제작 가이드 바 */}
      <Card className="border-[#262c3d]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-bold text-slate-200">5단계 카드뉴스 제작 가이드</h2>
          </div>
          <Link href="/cardnews/guide" className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1">
            <span>전체 매뉴얼 보기</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {[
            { step: "1단계", title: "기획", desc: "분야·주제·어조·매수", icon: Lightbulb, color: "text-amber-400" },
            { step: "2단계", title: "문구", desc: "AI 장별 문구 다듬기", icon: PenLine, color: "text-pink-400" },
            { step: "3단계", title: "디자인", desc: "화풍·글자·배치·효과", icon: Palette, color: "text-blue-400" },
            { step: "4단계", title: "배경 생성", desc: "나노바나나 고화질 이미지", icon: ImageIcon, color: "text-emerald-400" },
            { step: "5단계", title: "내보내기", desc: "완성 PNG & 캡션 복사", icon: Download, color: "text-purple-400" }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="rounded-xl bg-[#0d0f17] p-3 border border-[#1f2433] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{item.step}</span>
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                </div>
                <p className="text-xs font-bold text-slate-200">{item.title}</p>
                <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {error && <ErrorNote message={error} />}

      {/* 3. 내 프로젝트 목록 */}
      <Card className="border-[#262c3d]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">내 프로젝트 보관함</h2>
          </div>
          {projects && projects.length > 0 && (
            <span className="text-xs text-slate-400 font-mono">총 {projects.length}개</span>
          )}
        </div>

        {projects === null ? (
          <div className="py-12 text-center">
            <p className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-purple-400" /> 프로젝트 목록 불러오는 중…
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-[#0d0f17] border border-[#1f2433] space-y-3">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers size={24} />
            </div>
            <p className="text-sm font-medium text-slate-300">아직 저장된 카드뉴스 프로젝트가 없습니다.</p>
            <p className="text-xs text-slate-500">지금 바로 첫 번째 카드뉴스를 만들어보세요!</p>
            <button type="button" onClick={start} className={`${BTN_PRIMARY} mt-2`}>
              <Plus size={15} /> 첫 카드뉴스 만들기
            </button>
          </div>
        ) : (
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id} className="flex gap-3 rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3.5 hover:border-purple-500/40 transition-colors">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[#161922] border border-[#1f2433]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-600">
                      <Layers size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="truncate text-sm font-bold text-slate-200" title={p.title}>
                      {p.title}
                    </p>
                    <p className="truncate text-[11px] text-slate-400 mt-0.5">
                      {p.category}
                      {p.topic ? ` · ${p.topic}` : ""}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      {p.pageCount}장 · {new Date(p.updatedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    {confirmId === p.id ? (
                      <>
                        <button 
                          type="button" 
                          disabled={busyId === p.id} 
                          onClick={() => void remove(p.id)} 
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
                        >
                          {busyId === p.id ? "삭제 중…" : "삭제 확인"}
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)} className="text-xs text-slate-400 hover:text-slate-200 underline">
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          type="button" 
                          disabled={busyId === p.id} 
                          onClick={() => void open(p.id)} 
                          className={`${BTN_GHOST} px-3 py-1 text-xs`}
                        >
                          {busyId === p.id ? "여는 중…" : "편집하기"}
                        </button>
                        <button 
                          type="button" 
                          aria-label="삭제" 
                          onClick={() => setConfirmId(p.id)} 
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950/30 hover:text-red-400 transition-colors"
                        >
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
        <p className="mt-4 text-[11px] text-slate-500">
          💡 프로젝트를 삭제하면 해당 프로젝트에 사용된 배경 이미지 파일도 스토리지에서 함께 정리됩니다.
        </p>
      </Card>
    </div>
  );
}
