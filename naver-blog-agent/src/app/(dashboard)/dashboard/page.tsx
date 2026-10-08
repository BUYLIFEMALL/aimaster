"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  PenLine,
  Flame,
  Users,
  Send,
  Key,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Bot,
  ShieldCheck,
  FileText,
  Layers,
  RefreshCw,
} from "lucide-react";
import type { BlogViralCandidate } from "@/types/collector";

interface Account {
  id: string;
  blog_id: string;
  label: string;
  categories: any[];
}

interface SavedPost {
  id: string;
  blog_id: string;
  category_name: string;
  title: string;
  content: string;
  tags?: string[];
  status: "draft" | "queued" | "publishing" | "published" | "failed";
  created_at: string;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [candidates, setCandidates] = useState<BlogViralCandidate[]>([]);
  const [registeredKeys, setRegisteredKeys] = useState<string[]>([]);
  const [pairCode, setPairCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      // 1. 계정 로드
      const savedAcc = localStorage.getItem("nba_accounts_local");
      if (savedAcc) {
        setAccounts(JSON.parse(savedAcc));
      }

      // 2. 작성 원고 로드
      const savedP = localStorage.getItem("nba_saved_posts");
      if (savedP) {
        setSavedPosts(JSON.parse(savedP));
      }

      // 3. 수집 글감 로드
      const savedCand = localStorage.getItem("nba_viral_candidates");
      if (savedCand) {
        setCandidates(JSON.parse(savedCand));
      }

      // 4. 확장 프로그램 페어링 코드
      const pair = localStorage.getItem("nba_extension_pairing_code");
      if (pair) {
        setPairCode(pair);
      }
    } catch (e) {
      console.error("Dashboard storage load error:", e);
    } finally {
      setMounted(true);
    }

    // 5. 서버 API 키 현황 조회
    fetch("/api/keys")
      .then((res) => res.json())
      .then((data) => {
        if (data.registered && Array.isArray(data.registered)) {
          setRegisteredKeys(data.registered);
        }
      })
      .catch(() => {});
  }, []);

  const primaryAccount = accounts[0];
  const queuedPosts = savedPosts.filter((p) => p.status === "queued");
  const publishedPosts = savedPosts.filter((p) => p.status === "published");
  const readyCandidates = candidates.filter((c) => c.status === "ready");

  const totalCategories = accounts.reduce(
    (acc, cur) => acc + (cur.categories?.length || 0),
    0
  );

  if (!mounted) {
    return <div className="p-8 text-neutral-500 text-sm">대시보드를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. 상단 브리핑 & 헤더 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-sm">
                📊
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Naver Blog Agent Operation Desk
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black text-neutral-900 tracking-tight">
              네이버 블로그 운영 대시보드
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 max-w-3xl">
              블로그 원고 자동 생성, 실시간 떡상 글감 발굴, 스마트에디터 ONE 크롬 확장 자동 타이핑 및
              다중 네이버 계정 현황을 한눈에 모니터링하고 제어합니다.
            </p>
          </div>

          {/* 현재 주 운영 계정 배지 */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shrink-0 min-w-[260px]">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>현재 주 운영 블로그</span>
              <Link
                href="/accounts"
                className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
              >
                계정 관리 →
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  primaryAccount ? "bg-emerald-500 animate-pulse" : "bg-neutral-300"
                }`}
              />
              <span className="text-sm font-bold text-neutral-900 truncate">
                {primaryAccount ? `@${primaryAccount.blog_id}` : "등록된 블로그 계정 없음"}
              </span>
              {primaryAccount?.label && (
                <span className="rounded bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                  {primaryAccount.label}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-neutral-400">
              카테고리 {primaryAccount?.categories?.length || 0}개 등록됨
            </p>
          </div>
        </div>
      </section>

      {/* 2. 5대 핵심 운영 지표 카드 그리드 */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold">누적 생성 원고</span>
            <FileText size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-neutral-900">{savedPosts.length}</p>
          <p className="mt-1 text-[11px] text-neutral-400">AI 5단계 완성 원고</p>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm hover:border-sky-300 transition-all">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-semibold">발행 대기 큐</span>
            <Send size={16} className="text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-sky-800">{queuedPosts.length}</p>
          <p className="mt-1 text-[11px] text-sky-600">
            {publishedPosts.length > 0 ? `발행 완료 ${publishedPosts.length}건` : "스마트에디터 ONE 대기"}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold">수집된 떡상 글감</span>
            <Flame size={16} className="text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-800">{candidates.length}</p>
          <p className="mt-1 text-[11px] text-rose-600">사용 가능 {readyCandidates.length}건</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold">연동 블로그 계정</span>
            <Users size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-neutral-900">{accounts.length}</p>
          <p className="mt-1 text-[11px] text-neutral-400">카테고리 {totalCategories}개 세팅</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-neutral-300 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold">연동 AI 엔진</span>
            <Key size={16} className="text-violet-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-violet-700">
            {registeredKeys.length > 0 ? `${registeredKeys.length}개 활성` : "키 등록 필요"}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400 truncate">
            {registeredKeys.length > 0 ? registeredKeys.join(", ") : "OpenAI/Gemini/Claude"}
          </p>
        </div>
      </section>

      {/* 3. 원클릭 빠른 작업 네비게이션 카드 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-neutral-900">원클릭 빠른 작업 시작</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              원하는 작업으로 바로 이동하여 기획부터 포스팅까지 신속하게 처리하세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 작업 1: 글감 수집 */}
          <Link
            href="/collector"
            className="group rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 hover:border-rose-400 hover:bg-rose-50/40 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-neutral-200 text-lg group-hover:scale-105 transition-transform">
                  🔥
                </span>
                <ArrowUpRight size={16} className="text-neutral-400 group-hover:text-rose-600 transition-colors" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-neutral-900 group-hover:text-rose-900">
                떡상 글감 수집소
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                웹 뉴스 스크랩, Perplexity 72시간 핫이슈, 유튜브 쇼츠 대박 분석.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-200/60 text-[11px] font-bold text-rose-700 flex items-center gap-1">
              <span>인기 소재 발굴하기</span>
              <ChevronRight size={12} />
            </div>
          </Link>

          {/* 작업 2: 글 생성 */}
          <Link
            href="/"
            className="group rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-neutral-200 text-lg group-hover:scale-105 transition-transform">
                  ✍️
                </span>
                <ArrowUpRight size={16} className="text-neutral-400 group-hover:text-emerald-700 transition-colors" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-neutral-900 group-hover:text-emerald-800">
                블로그 글 자동 생성
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                6대 화자 페르소나와 1~4000자 목표 글자수 슬라이더 맞춤 생성.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-200/60 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <span>5단계 AI 작성 시작하기</span>
              <ChevronRight size={12} />
            </div>
          </Link>

          {/* 작업 3: 계정 및 카테고리 */}
          <Link
            href="/accounts"
            className="group rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-neutral-200 text-lg group-hover:scale-105 transition-transform">
                  👥
                </span>
                <ArrowUpRight size={16} className="text-neutral-400 group-hover:text-amber-700 transition-colors" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-neutral-900 group-hover:text-amber-900">
                계정 & 카테고리 관리
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                다중 블로그 ID 등록, 카테고리 순서 위/아래 이동 및 롱테일 키워드 세팅.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-200/60 text-[11px] font-bold text-amber-800 flex items-center gap-1">
              <span>카테고리 설정하기</span>
              <ChevronRight size={12} />
            </div>
          </Link>

          {/* 작업 4: 발행 대기 큐 */}
          <Link
            href="/queue"
            className="group rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 hover:border-sky-400 hover:bg-sky-50/40 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-neutral-200 text-lg group-hover:scale-105 transition-transform">
                  🚀
                </span>
                <ArrowUpRight size={16} className="text-neutral-400 group-hover:text-sky-700 transition-colors" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-neutral-900 group-hover:text-sky-900">
                스마트에디터 ONE 발행 큐
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                크롬 확장 프로그램의 자동 타이핑 전송 큐 및 발행 이력 실시간 확인.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-200/60 text-[11px] font-bold text-sky-700 flex items-center gap-1">
              <span>대기열 확인하기</span>
              <ChevronRight size={12} />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. 엔진 & 확장 프로그램 연동 현황판 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 확장 프로그램 연동 상태 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">크롬 확장 프로그램</h3>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                pairCode
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {pairCode ? "페어링 활성" : "페어링 코드 생성 필요"}
            </span>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            일반 크롬 브라우저에서 스마트에디터 ONE iframe에 사람 타자 속도로 안전하게 자동 포스팅합니다.
          </p>
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
            <span className="text-neutral-400">다운로드 버전</span>
            <span className="font-semibold text-neutral-800">v1.8.0 (최신)</span>
          </div>
          <div className="flex gap-2 pt-1">
            <Link
              href="/settings"
              className="flex-1 text-center rounded-xl border border-neutral-200 bg-neutral-50 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              페어링 설정
            </Link>
            <Link
              href="/guide"
              className="flex-1 text-center rounded-xl bg-neutral-900 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
            >
              설치 매뉴얼
            </Link>
          </div>
        </div>

        {/* AI 파이프라인 및 보안 상태 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">AI 엔진 및 보안 상태</h3>
            </div>
            <Link href="/settings" className="text-xs font-semibold text-emerald-700 hover:underline">
              API 키 관리 →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5 text-center">
              <span className="text-[11px] text-neutral-400 block">OpenAI (GPT-4o)</span>
              <span
                className={`text-xs font-bold mt-1 inline-block ${
                  registeredKeys.includes("openai") ? "text-emerald-700" : "text-neutral-400"
                }`}
              >
                {registeredKeys.includes("openai") ? "연결됨 ✓" : "미등록"}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5 text-center">
              <span className="text-[11px] text-neutral-400 block">Google Gemini</span>
              <span
                className={`text-xs font-bold mt-1 inline-block ${
                  registeredKeys.includes("gemini") ? "text-emerald-700" : "text-neutral-400"
                }`}
              >
                {registeredKeys.includes("gemini") ? "연결됨 ✓" : "미등록"}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5 text-center">
              <span className="text-[11px] text-neutral-400 block">Claude (Anthropic)</span>
              <span
                className={`text-xs font-bold mt-1 inline-block ${
                  registeredKeys.includes("anthropic") ? "text-emerald-700" : "text-neutral-400"
                }`}
              >
                {registeredKeys.includes("anthropic") ? "연결됨 ✓" : "미등록"}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50/70 p-2.5 text-center">
              <span className="text-[11px] text-neutral-400 block">Perplexity (72h)</span>
              <span
                className={`text-xs font-bold mt-1 inline-block ${
                  registeredKeys.includes("perplexity") ? "text-emerald-700" : "text-neutral-400"
                }`}
              >
                {registeredKeys.includes("perplexity") ? "연결됨 ✓" : "미등록"}
              </span>
            </div>
          </div>

          <p className="text-xs text-neutral-500 pt-1">
            ※ BYOK 원칙 준수: 회원의 통합 계정에 등록된 개인 API 키로만 동작하며, 관리자 공용 키는 사용되지 않습니다.
          </p>
        </div>
      </section>

      {/* 5. 최근 생성 원고 & 수집 글감 미리보기 테이블 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 최근 원고 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText size={17} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">최근 생성 원고</h3>
              <span className="text-xs text-neutral-400">({savedPosts.length}건)</span>
            </div>
            <Link href="/queue" className="text-xs font-semibold text-emerald-700 hover:underline">
              전체 보기 →
            </Link>
          </div>

          {savedPosts.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400">
              아직 생성된 원고가 없습니다. [블로그 글 자동 생성]에서 새 글을 작성해 보세요.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 space-y-2">
              {savedPosts.slice(0, 4).map((post) => (
                <div key={post.id} className="pt-2 first:pt-0">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-neutral-600 font-semibold">
                      {post.category_name}
                    </span>
                    <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <p className="text-xs font-bold text-neutral-900 truncate">{post.title}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500">
                      약 {post.content?.length || 0}자
                    </span>
                    <span
                      className={`font-semibold ${
                        post.status === "queued"
                          ? "text-sky-600"
                          : post.status === "published"
                          ? "text-emerald-600"
                          : "text-neutral-500"
                      }`}
                    >
                      {post.status === "queued"
                        ? "발행 대기중"
                        : post.status === "published"
                        ? "발행 완료"
                        : "보관함 저장"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 수집 떡상 글감 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Flame size={17} className="text-rose-600" />
              <h3 className="text-sm font-bold text-neutral-900">최근 수집 떡상 글감</h3>
              <span className="text-xs text-neutral-400">({candidates.length}건)</span>
            </div>
            <Link href="/collector" className="text-xs font-semibold text-rose-700 hover:underline">
              전체 보기 →
            </Link>
          </div>

          {candidates.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400">
              수집된 글감이 없습니다. [떡상 글감 수집소]에서 실시간 화제를 찾아보세요.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 space-y-2">
              {candidates.slice(0, 4).map((cand) => (
                <div key={cand.id} className="pt-2 first:pt-0">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span className="rounded bg-rose-50 text-rose-700 px-1.5 py-0.2 font-semibold">
                      {cand.category}
                    </span>
                    <span>
                      {cand.method === "perplexity"
                        ? "⚡ 화제검색"
                        : cand.method === "shorts"
                        ? "🎬 쇼츠분석"
                        : "🌐 웹기사"}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-neutral-900 truncate">{cand.title}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 truncate max-w-[200px]">
                      {cand.angle || cand.content.slice(0, 30)}
                    </span>
                    <Link
                      href={`/?viralId=${cand.id}&topic=${encodeURIComponent(
                        cand.title
                      )}&category=${encodeURIComponent(cand.category)}`}
                      className="font-bold text-neutral-900 hover:underline"
                    >
                      글 생성 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
