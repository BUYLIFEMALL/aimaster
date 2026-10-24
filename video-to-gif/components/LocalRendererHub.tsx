"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Laptop,
  Puzzle,
  Terminal,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Info
} from "lucide-react";
import {
  detectLocalRenderer,
  checkRendererUpdate,
  type RendererStatus,
  type RendererUpdate,
  LOCAL_RENDERER_EXT_ID
} from "@/lib/localRenderer";
import { APP_VERSION } from "@/lib/version";

export default function LocalRendererHub({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<RendererStatus | null>(null);
  const [updateInfo, setUpdateInfo] = useState<RendererUpdate | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedMac, setCopiedMac] = useState(false);
  const [activeTab, setActiveTab] = useState<"windows" | "mac" | "extension">("windows");

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await detectLocalRenderer();
      setStatus(res);
      const update = await checkRendererUpdate(res);
      setUpdateInfo(update);
    } catch {
      setStatus({ kind: "none" });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const copyMacCommand = () => {
    const cmd = "curl -fsSL https://video-to-gif.buylife.xyz/downloads/local-renderer/install-mac.sh | bash";
    navigator.clipboard.writeText(cmd);
    setCopiedMac(true);
    setTimeout(() => setCopiedMac(false), 2000);
  };

  const isReady = status?.kind === "ready";
  const hasUpdate = updateInfo?.ext || updateInfo?.host;

  return (
    <section className={`rounded-3xl border border-amber-500/30 bg-[#0d1117] p-6 sm:p-8 shadow-2xl relative overflow-hidden ${className}`}>
      {/* 앰비언트 글로우 배경 */}
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-500/10 blur-[90px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-[90px] pointer-events-none" />

      {/* 헤더 & 최신 버전 상태 배너 */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#30363d]/80">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              <Cpu className="h-3.5 w-3.5" />
              <span>내 PC 하드웨어 3~4배 초고속 가속</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
              공식 최신 v1.25 (Host 1.30)
            </span>
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span>로컬 렌더러 프로그램 &amp; 확장 다운로드 센터</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-300">
            내 컴퓨터의 GPU/CPU 성능을 직접 활용하여 무설치 대비 3배 이상 빠른 렌더링 속도를 제공합니다.
          </p>
        </div>

        {/* 실시간 내 PC 상태 진단 뱃지 & 점검 버튼 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
          <div className="rounded-2xl border border-[#30363d] bg-[#161b22] px-3.5 py-2 flex items-center gap-2.5">
            {checking ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                <span className="text-xs font-bold text-gray-300">내 PC 연동 상태 진단 중...</span>
              </>
            ) : isReady ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <div className="text-left">
                  <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
                    <span>로컬 렌더러 가동 중</span>
                    {hasUpdate ? (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300 border border-amber-500/30">업데이트 가능</span>
                    ) : (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300 border border-emerald-500/30">최신 버전</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-gray-400">
                    Ext {status.extVersion} · Host {status.hostVersion} ({status.os.toUpperCase()})
                  </div>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-amber-300">
                    {status?.kind === "no-host"
                      ? "확장 연결됨 · PC 렌더러 미설치"
                      : status?.kind === "no-ffmpeg"
                      ? "FFmpeg 엔진 미감지"
                      : "로컬 렌더러 미설치 (무설치 모드)"}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    프로그램을 받으면 3~4배 빨라집니다
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => void runCheck()}
              disabled={checking}
              className="ml-1 rounded-lg border border-[#30363d] bg-black/40 p-1.5 text-gray-400 hover:text-white hover:bg-black/60 transition-colors"
              title="연결 및 최신 버전 재확인"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 업데이트 알림 배너 (구버전 설치된 경우) */}
      {hasUpdate && (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-white">새로운 최신 버전이 출시되었습니다!</span>
            <div className="mt-0.5 text-amber-300/90 leading-relaxed">
              {updateInfo.ext && `· 브라우저 확장 새 버전: ${updateInfo.ext.latest} (현재 설치됨: ${updateInfo.ext.installed}) `}
              {updateInfo.host && `· PC 렌더러 새 버전: ${updateInfo.host.latest} (현재 설치됨: ${updateInfo.host.installed})`}
              <span className="block mt-1 text-gray-300">아래 최신 패키지를 내려받아 덮어쓰기 하시면 바로 최신 기능이 적용됩니다.</span>
            </div>
          </div>
        </div>
      )}

      {/* 메인 3대 다운로드 카드 그리드 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {/* 카드 1: Windows PC 렌더러 */}
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-5 flex flex-col justify-between hover:border-amber-500/40 transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                <Laptop className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                추천 · Windows 10/11
              </span>
            </div>
            <h3 className="mt-4 text-base font-extrabold text-white flex items-center gap-1.5">
              <span>Windows 렌더러 프로그램</span>
            </h3>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              내 PC의 FFmpeg와 브라우저를 연동하는 네이티브 고속 렌더러 프로그램 (호스트 1.30 최신판)
            </p>
            <div className="mt-3 rounded-xl bg-black/30 p-2.5 text-[11px] text-gray-300 font-mono border border-white/5 space-y-1">
              <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Check className="h-3 w-3" /> 1초 설치: install-windows.bat 실행
              </div>
              <div className="text-gray-400">· 관리자 권한 불필요 · 100% 무료</div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#30363d]">
            <a
              href="/downloads/local-renderer/gif-renderer-windows-latest.zip"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/20"
            >
              <Download className="h-4 w-4" />
              <span>Windows 렌더러 받기 (ZIP)</span>
            </a>
          </div>
        </div>

        {/* 카드 2: 브라우저 확장프로그램 */}
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                <Puzzle className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/20">
                Chrome / Whale / Edge
              </span>
            </div>
            <h3 className="mt-4 text-base font-extrabold text-white flex items-center gap-1.5">
              <span>브라우저 확장프로그램</span>
            </h3>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              웹 스튜디오 화면과 내 PC 렌더러를 안전하게 이어주는 고속 중계 확장프로그램 (v1.25 최신판)
            </p>
            <div className="mt-3 rounded-xl bg-black/30 p-2.5 text-[11px] text-gray-300 font-mono border border-white/5 space-y-1">
              <div className="flex items-center gap-1 text-cyan-400 font-semibold">
                <Check className="h-3 w-3" /> 압축해제 후 브라우저에 등록
              </div>
              <div className="text-gray-400">· chrome://extensions ➔ 확장 로드</div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#30363d]">
            <a
              href="/downloads/local-renderer/gif-renderer-extension-latest.zip"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 transition-all shadow-md shadow-cyan-500/10"
            >
              <Download className="h-4 w-4" />
              <span>확장프로그램 받기 (ZIP)</span>
            </a>
          </div>
        </div>

        {/* 카드 3: macOS 원클릭 터미널 설치 */}
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                <Terminal className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                macOS (M1/M2/Intel)
              </span>
            </div>
            <h3 className="mt-4 text-base font-extrabold text-white flex items-center gap-1.5">
              <span>Mac 원클릭 터미널 설치</span>
            </h3>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              Apple 공증 경고 없이 터미널 명령어 한 줄로 1초 만에 네이티브 렌더러 등록 완료
            </p>
            <div className="mt-3 rounded-xl bg-black/40 p-2 text-[10px] text-gray-300 font-mono border border-white/5 break-all">
              curl -fsSL .../install-mac.sh | bash
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#30363d]">
            <button
              onClick={copyMacCommand}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2.5 text-xs font-bold text-purple-300 hover:bg-purple-500/25 transition-all shadow-md shadow-purple-500/10"
            >
              {copiedMac ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copiedMac ? "명령어 복사 완료!" : "Mac 설치 명령어 1초 복사"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 30초 설치 가이드 3단계 카드 */}
      <div className="mt-7 pt-6 border-t border-[#30363d]/80 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-black">!</span>
            <span>처음 1회만 설치하면 끝나는 초간단 3단계 설치 가이드</span>
          </h4>
          <Link
            href="/guide#local-renderer"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
          >
            <span>상세 매뉴얼 및 사진 가이드 보기</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-[#161b22]/70 border border-[#30363d] p-3 flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs">1</div>
            <div>
              <div className="font-bold text-white">확장 ZIP 다운 &amp; 압축 해제</div>
              <div className="text-gray-400 text-[11px] mt-0.5">
                브라우저 주소창에 <code className="text-amber-300">chrome://extensions</code> 입력 후 우측 상단 개발자 모드 켜기 ➔ [압축해제된 확장 로드] 선택
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#161b22]/70 border border-[#30363d] p-3 flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-xs">2</div>
            <div>
              <div className="font-bold text-white">렌더러 ZIP 다운 &amp; 실행</div>
              <div className="text-gray-400 text-[11px] mt-0.5">
                윈도우는 압축 풀고 <code className="text-cyan-300">install-windows.bat</code> 더블 클릭 (맥은 위 터미널 1초 복사 명령어 실행)
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#161b22]/70 border border-[#30363d] p-3 flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs">3</div>
            <div>
              <div className="font-bold text-white">완료! 3배 빠른 가속 시작</div>
              <div className="text-gray-400 text-[11px] mt-0.5">
                새로고침하면 <code className="text-emerald-300">로컬 렌더러 가동 중</code> 녹색 불이 켜지며 고속 렌더링이 자동 활성화됩니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
