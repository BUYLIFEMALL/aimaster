"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  Bot,
  Globe,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Save,
  RotateCcw
} from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("sk-ant-api03-buylife-official-authenticated");
  const [useGpu, setUseGpu] = useState(true);
  const [bitrate, setBitrate] = useState("18");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 상단 헤더 배너 */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-amber-400 to-blue-500 opacity-15 blur-3xl" />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 border border-amber-200 text-amber-800">
          <Settings size={13} className="text-amber-600" />
          <span>환경설정 & API 플랫폼 연동</span>
        </span>
        <h1 className="mt-3 text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
          계정 및 <span className="text-amber-600">플랫폼 연동 설정</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Claude API 연동 상태 및 숏폼 플랫폼 자동 포스팅 확장 연동, GPU 하드웨어 가속 옵션을 관리합니다.
        </p>
      </div>

      {/* 1. Buylife Claude API 연동 카드 */}
      <section className="lv-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Bot size={18} className="text-amber-600" />
            <span>Buylife 공식 Claude API 엔진 연동 (기본 AI)</span>
          </h2>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
            <CheckCircle2 size={13} />
            <span>연결됨: buylifemall@gmail.com</span>
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-black text-slate-900">Claude 3.5 Sonnet / Opus 엔진</div>
            <p className="text-xs text-slate-500 mt-0.5">
              숏폼 바이럴 나레이션 루프 훅 문장 분석 및 나노 프레임 매칭 보조 AI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={apiKey}
              disabled
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-500 w-56 shadow-2xs"
            />
            <button
              onClick={() => alert("운영자 공식 Claude API가 정상 활성화되어 있습니다.")}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              재검증
            </button>
          </div>
        </div>
      </section>

      {/* 2. 숏폼 플랫폼 연동 카드 */}
      <section className="lv-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Globe size={18} className="text-amber-600" />
            <span>숏폼 플랫폼 연동 상태 (크롬 확장 자동화 연계)</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">
            원클릭 발행 연동
          </span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          {/* YouTube Shorts */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span className="text-red-600 font-black">▶</span>
                <span>YouTube Shorts</span>
              </span>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                연동 완료
              </span>
            </div>
            <p className="text-xs text-slate-500">채널: 바이럴 숏폼 연구소</p>
            <button
              onClick={() => alert("유튜브 쇼츠 연동 계정이 활성화되어 있습니다.")}
              className="w-full text-center py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              채널 설정 변경
            </button>
          </div>

          {/* Instagram Reels */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span className="text-pink-600 font-black">📸</span>
                <span>Instagram Reels</span>
              </span>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                연동 완료
              </span>
            </div>
            <p className="text-xs text-slate-500">계정: @buylife_official</p>
            <button
              onClick={() => alert("인스타그램 릴스 연동 계정이 활성화되어 있습니다.")}
              className="w-full text-center py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              계정 설정 변경
            </button>
          </div>

          {/* TikTok */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span>🎵</span>
                <span>TikTok Studio</span>
              </span>
              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                미연동
              </span>
            </div>
            <p className="text-xs text-slate-500">연결된 틱톡 계정 없음</p>
            <button
              onClick={() => alert("틱톡 스튜디오 연동 창을 엽니다.")}
              className="w-full text-center py-1.5 rounded-lg btn-3d-amber text-xs"
            >
              + 계정 연결하기
            </button>
          </div>
        </div>
      </section>

      {/* 3. GPU 하드웨어 가속 및 코덱 설정 */}
      <section className="lv-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Cpu size={18} className="text-amber-600" />
            <span>NLE 비디오 렌더링 엔진 가속 설정</span>
          </h2>
          <span className="text-xs font-bold text-slate-500">
            하드웨어 성능 극대화
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800">GPU 하드웨어 가속 활성화</span>
              <input
                type="checkbox"
                checked={useGpu}
                onChange={(e) => setUseGpu(e.target.checked)}
                className="accent-amber-600 h-4 w-4"
              />
            </label>
            <p className="text-xs text-slate-500">
              WebGL 및 WebGPU 셰이더를 사용하여 렌더링 속도를 최대 5.2배 향상시킵니다.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">기본 인코딩 비트레이트 품질</span>
              <span className="text-xs font-black text-amber-700">{bitrate} Mbps</span>
            </div>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs"
            >
              <option value="12">12 Mbps (표준 용량 절약형)</option>
              <option value="18">18 Mbps (고화질 무손실 쇼츠 프리셋 - 권장)</option>
              <option value="25">25 Mbps (초고화질 마스터링)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              1080×1920 60FPS 숏폼 영상에 가장 최적화된 비트레이트입니다.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fade-in">
              <CheckCircle2 size={14} />
              <span>설정이 안전하게 저장되었습니다!</span>
            </span>
          )}
          <button
            onClick={handleSave}
            className="btn-3d-amber text-xs px-5 py-2"
          >
            <Save size={14} />
            <span>설정 저장하기</span>
          </button>
        </div>
      </section>
    </div>
  );
}
