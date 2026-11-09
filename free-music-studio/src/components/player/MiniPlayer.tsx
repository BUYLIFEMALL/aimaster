"use client";

import { useState } from "react";
import { ListMusic, Loader2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, SlidersHorizontal, Volume2, VolumeX, X } from "lucide-react";
import { PLAYBACK_RATES, usePlayer } from "./PlayerProvider";
import { Visualizer, VISUALIZER_MODES } from "./Visualizer";
import { EQ_FREQUENCIES, EQ_MAX, EQ_MIN, EQ_PRESETS, hzLabel } from "@/lib/playerEq";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const REPEAT_LABEL = { off: "반복 끔", all: "목록 반복", one: "한 곡 반복" } as const;

/** 화면 아래 고정 재생바 — 곡을 재생하면 나타난다. 왼쪽 메뉴 오른쪽 본문 폭에 맞춘다(휴대폰은 전체 폭). */
export function MiniPlayer() {
  const p = usePlayer();
  const [queueOpen, setQueueOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  if (!p?.current) return null;
  const on = "text-emerald-300 bg-emerald-400/10";
  const off = "text-slate-500 hover:bg-slate-800 hover:text-white";
  return (
    <>
    {queueOpen && (
      <aside aria-label="재생 대기열" className="fixed bottom-16 right-2 z-30 flex max-h-[60vh] w-[min(22rem,calc(100vw-1rem))] flex-col rounded-2xl border border-slate-700 bg-[#0a0e1a]/97 shadow-2xl backdrop-blur sm:right-4">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5">
          <ListMusic className="h-4 w-4 text-emerald-300" />
          <p className="text-sm font-bold text-white">재생 대기열</p>
          <span className="text-[11px] text-slate-500">
            {p.queue.length}곡 · {p.shuffle ? "섞어서" : "순서대로"} · {REPEAT_LABEL[p.repeat]}
          </span>
          <button type="button" onClick={() => setQueueOpen(false)} aria-label="대기열 닫기" className="ml-auto rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="overflow-y-auto p-2">
          {p.queue.map((t, i) => {
            const now = t.key === p.current?.key;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => p.jump(t.key)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${now ? "bg-emerald-950/60 text-emerald-200" : "text-slate-300 hover:bg-slate-900"}`}
                >
                  <span className="w-6 shrink-0 text-right tabular-nums text-slate-500">{now && p.playing ? <Volume2 className="ml-auto h-3.5 w-3.5 text-emerald-300" /> : i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.title}</span>
                    <span className="block truncate text-[10px] text-slate-500">{t.subtitle}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
    )}
    {eqOpen && (
      <aside aria-label="이퀄라이저" className="fixed bottom-16 right-4 z-30 w-[min(92vw,26rem)] space-y-3 rounded-2xl border border-slate-700 bg-[#0a0e1a]/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-white">🎚 이퀄라이저</p>
          <select
            aria-label="이퀄라이저 프리셋"
            value={EQ_PRESETS.find((x) => x.gains.every((g, i) => g === p.eq[i]))?.name ?? ""}
            onChange={(e) => {
              const pr = EQ_PRESETS.find((x) => x.name === e.target.value);
              if (pr) p.setEq(pr.gains);
            }}
            className="ml-auto rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200"
          >
            <option value="">직접 맞춤</option>
            {EQ_PRESETS.map((x) => (
              <option key={x.name} value={x.name}>
                {x.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => { p.setEq(EQ_FREQUENCIES.map(() => 0)); p.setPreamp(0); }} className="rounded-md px-2 py-1 text-[11px] text-slate-400 hover:text-white">
            초기화
          </button>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          프리앰프
          <input type="range" min={EQ_MIN} max={EQ_MAX} step={1} value={p.preamp} onChange={(e) => p.setPreamp(Number(e.target.value))} className="h-5 flex-1 accent-emerald-400" />
          <span className="w-12 text-right tabular-nums text-slate-300">{p.preamp > 0 ? "+" : ""}{p.preamp}dB</span>
        </label>
        <div className="grid grid-cols-8 gap-1">
          {EQ_FREQUENCIES.map((f, i) => (
            <label key={f} className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
              <span className="tabular-nums text-slate-300">{p.eq[i] > 0 ? "+" : ""}{p.eq[i]}</span>
              <input
                type="range"
                min={EQ_MIN}
                max={EQ_MAX}
                step={1}
                value={p.eq[i]}
                onChange={(e) => p.setEqBand(i, Number(e.target.value))}
                aria-label={`${hzLabel(f)}Hz`}
                className="h-24 w-5 accent-emerald-400 [writing-mode:vertical-lr] [direction:rtl]"
              />
              <span>{hzLabel(f)}</span>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">이 브라우저에 기억합니다 · 소리를 너무 키우면 찢어질 수 있어요(프리앰프를 낮추세요)</p>
      </aside>
    )}
    <div role="region" aria-label="재생바" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#1e293b] bg-[#0a0e1a]/95 backdrop-blur md:left-64">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:px-8">
        <div className="min-w-0 flex-1 sm:max-w-[16rem]">
          <p className="truncate text-sm font-bold text-white" title={p.current.title}>
            {p.current.title}
          </p>
          <p className={`truncate text-[11px] ${p.error ? "text-rose-300" : "text-slate-400"}`}>{p.error || p.current.subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button type="button" onClick={p.toggleShuffle} aria-label={p.shuffle ? "섞어 듣기 끄기" : "섞어 듣기 켜기"} aria-pressed={p.shuffle} title={p.shuffle ? "섞어 듣기 켜짐" : "섞어 듣기 꺼짐"} className={`rounded-full p-2 ${p.shuffle ? on : off}`}>
            <Shuffle className="h-4 w-4" />
          </button>
          <button type="button" onClick={p.prev} aria-label="이전 곡" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <SkipBack className="h-4 w-4" />
          </button>
          <button type="button" onClick={p.toggle} aria-label={p.playing ? "일시정지" : "재생"} className="rounded-full bg-emerald-600 p-2.5 text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-500">
            {p.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : p.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button type="button" onClick={p.next} aria-label="다음 곡" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <SkipForward className="h-4 w-4" />
          </button>
          <button type="button" onClick={p.cycleRepeat} aria-label={`${REPEAT_LABEL[p.repeat]} — 눌러서 바꾸기`} title={REPEAT_LABEL[p.repeat]} className={`rounded-full p-2 ${p.repeat === "off" ? off : on}`}>
            {p.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
        </div>
        <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
          <span className="w-10 text-right text-[11px] tabular-nums text-slate-500">{mmss(p.time)}</span>
          <input type="range" min={0} max={p.duration || 0} step={0.5} value={Math.min(p.time, p.duration || 0)} onChange={(e) => p.seek(Number(e.target.value))} aria-label="재생 위치" className="h-6 min-w-0 flex-1 accent-emerald-400" />
          <span className="w-10 text-[11px] tabular-nums text-slate-500">{mmss(p.duration)}</span>
        </div>
        <div className="hidden shrink-0 items-center gap-1 lg:flex" title="음량 · 단축키: Space 재생/멈춤, ←→ 5초(Shift 15초)">
          <button
            type="button"
            onClick={() => p.setVolume(p.volume > 0 ? 0 : 1)}
            aria-label={p.volume > 0 ? "소리 끄기" : "소리 켜기"}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {p.volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <input type="range" min={0} max={1} step={0.05} value={p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} aria-label="음량" className="h-6 w-20 accent-emerald-400" />
        </div>
        {/* 백로그 D-10: 시각화(누르면 모양 바꾸기)·재생 속도·이퀄라이저 */}
        <button
          type="button"
          onClick={p.cycleVis}
          title={`시각화 · ${VISUALIZER_MODES.find((x) => x.id === p.visMode)?.label} — 눌러서 바꾸기`}
          aria-label="시각화 모양 바꾸기"
          className="hidden h-8 w-24 shrink-0 overflow-hidden rounded-md bg-black/30 xl:block"
        >
          <Visualizer analyser={p.analyser} mode={p.visMode} active={p.playing} />
        </button>
        <select
          value={p.rate}
          onChange={(e) => p.setRate(Number(e.target.value))}
          aria-label="재생 속도"
          title="재생 속도"
          className="hidden shrink-0 rounded-md border border-slate-700 bg-slate-950 px-1 py-1 text-[11px] text-slate-300 md:block"
        >
          {PLAYBACK_RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEqOpen((v) => !v)}
          aria-pressed={eqOpen}
          aria-label="이퀄라이저"
          title="이퀄라이저"
          className={`shrink-0 rounded-full p-2 ${eqOpen || p.eq.some((g) => g !== 0) || p.preamp !== 0 ? on : off}`}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setQueueOpen((v) => !v)}
          aria-pressed={queueOpen}
          aria-label="재생 대기열 보기"
          title="재생 대기열"
          className={`shrink-0 rounded-full p-2 ${queueOpen ? on : off}`}
        >
          <ListMusic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setQueueOpen(false);
            setEqOpen(false);
            p.close();
          }}
          aria-label="재생바 닫기"
          className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
    </>
  );
}
