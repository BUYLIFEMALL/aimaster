"use client";

// 최근 7일 응대 그래프 + 막대를 누르면 그날 답한 목록 — 공용 기준 코드(docs/SHARED_MODULES.md 「week-reply-panel」).
// 기준: comment-inbox. 사본은 직접 고치지 말고 기준을 고친 뒤 node scripts/check-shared-modules.mjs --sync.
// 목록을 불러오는 서버 동작(loadDay)과 테마 색(classes)은 부르는 쪽이 넘긴다. 바깥 카드 테두리도 부르는 쪽이 감싼다.
import { useRef, useState, useTransition } from "react";
import { WeekReplyChart, type ChartSeries } from "@/components/weekChart/WeekReplyChart";
import type { DayCount } from "@/lib/weekChart/bucket";

export type DayReplyItem = {
  key: string;
  /** 플랫폼 표시(예: 「📸 인스타 댓글」) — 한 플랫폼만 쓰는 프로그램은 비워 둔다 */
  tag?: string;
  color?: string;
  /** 작성자(게시 프로그램처럼 없으면 비워 둔다) */
  author?: string;
  at: string;
  /** 상대가 남긴 원래 댓글·메시지 앞부분 */
  comment?: string | null;
  /** 실제로 게시·발송한 답장 앞부분 */
  reply: string;
  href?: string | null;
  /** 게시 이미지 작은 썸네일(공개 주소) */
  thumbUrl?: string | null;
};

export type DayReplyResult = { items?: DayReplyItem[]; error?: string };

export type PanelClasses = { border: string; item: string; muted: string; danger: string };

/** 문구(기본값은 댓글 응대용). 게시 프로그램은 「게시한 글」 문구로 바꿔 쓴다 */
export type PanelLabels = { title?: string; noun?: string; list?: string; empty?: string; more?: string; replyIcon?: string };

const DEFAULT_LABELS = {
  title: "📊 최근 7일 응대",
  noun: "응대",
  list: "답한 목록",
  empty: "이날은 게시·발송한 답장이 없어요.",
  more: "플랫폼마다 최근 {n}건까지 보여요. 나머지는 답변 기록에서 확인해 주세요.",
  replyIcon: "↪",
};

/** 한국 시간 「오전 9:05」 */
function kstTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const h = d.getUTCHours();
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function WeekReplyPanel({
  days,
  series,
  loadDay,
  classes,
  perPlatformLimit = 50,
  labels,
}: {
  days: DayCount[];
  series?: ChartSeries[];
  loadDay: (dayKey: string) => Promise<DayReplyResult>;
  classes: PanelClasses;
  perPlatformLimit?: number;
  labels?: PanelLabels;
}) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<DayReplyItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const latest = useRef<string | null>(null); // 빠르게 다른 막대를 눌렀을 때 늦게 온 이전 응답은 버린다
  const day = days.find((d) => d.key === selected);

  function select(key: string) {
    if (key === selected) {
      setSelected(null);
      latest.current = null;
      return;
    }
    setSelected(key);
    latest.current = key;
    setItems(null);
    setError(null);
    start(async () => {
      try {
        const r = await loadDay(key);
        if (latest.current !== key) return;
        if (r.error) setError(r.error);
        else setItems(r.items ?? []);
      } catch {
        if (latest.current === key) setError("그날 목록을 불러오지 못했습니다. 잠시 후 다시 눌러 주세요.");
      }
    });
  }

  return (
    <div>
      <WeekReplyChart
        days={days}
        series={series}
        selectedKey={selected}
        onSelect={select}
        title={L.title}
        noun={L.noun}
        selectHint={`막대를 누르면 그날 ${L.list}을 볼 수 있어요.`}
      />
      {day && (
        <div className={`mt-4 border-t pt-4 ${classes.border}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold">
              {day.label}({day.weekday}) {L.list} <span className={`font-normal ${classes.muted}`}>{day.count}건</span>
            </p>
            <button type="button" onClick={() => select(day.key)} className={`text-[11px] hover:underline ${classes.muted}`}>
              닫기 ✕
            </button>
          </div>
          {pending || (!items && !error) ? (
            <p className={`py-3 text-xs ${classes.muted}`}>불러오는 중…</p>
          ) : error ? (
            <p className={`py-3 text-xs ${classes.danger}`}>{error}</p>
          ) : items && items.length === 0 ? (
            <p className={`py-3 text-xs ${classes.muted}`}>{L.empty}</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {items?.map((it) => {
                const text = (
                  <div className="min-w-0 flex-1">
                    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${classes.muted}`}>
                      {it.color && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: it.color }} />}
                      {it.tag && <span>{it.tag}</span>}
                      {it.author && <span className="font-semibold opacity-100">{it.author}</span>}
                      <span>{kstTime(it.at)}</span>
                    </div>
                    {it.comment && <p className={`mt-1 break-words text-xs leading-relaxed ${classes.muted}`}>💬 {it.comment}</p>}
                    <p className="mt-1 break-words text-xs leading-relaxed">{L.replyIcon} {it.reply || "(내용 없음)"}</p>
                  </div>
                );
                const body = (
                  <div className="flex items-start gap-3">
                    {it.thumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.thumbUrl}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"; // 지워진 이미지는 깨진 그림 대신 숨김
                        }}
                      />
                    )}
                    {text}
                  </div>
                );
                return (
                  <li key={it.key}>
                    {it.href ? (
                      <a href={it.href} {...(/^https?:/.test(it.href) ? { target: "_blank", rel: "noreferrer" } : {})} className={`block rounded-xl border px-3 py-2 transition hover:border-pink-500/40 ${classes.border} ${classes.item}`}>
                        {body}
                      </a>
                    ) : (
                      <div className={`rounded-xl border px-3 py-2 ${classes.border} ${classes.item}`}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {items && items.length > 0 && items.length < day.count && (
            <p className={`mt-2 text-[11px] ${classes.muted}`}>{L.more.replace("{n}", String(perPlatformLimit))}</p>
          )}
        </div>
      )}
    </div>
  );
}
