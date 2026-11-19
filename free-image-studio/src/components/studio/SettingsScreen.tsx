"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CONVERT_PROVIDER_LABEL, CONVERT_PROVIDER_ORDER } from "@/lib/convert/models";
import { fetchConvertStatus, type ConvertStatus } from "@/lib/convert/client";
import { API_SETTINGS_PATH, KEY_GUIDES, guidePath, mainSiteUrl } from "@/lib/studio/notices";

const MAIN = process.env.NEXT_PUBLIC_MAIN_SITE_URL;
const card = "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5";
const button = "rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40";
const ghost = "rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm disabled:opacity-40";

/** 메인 사이트 매뉴얼을 옆에 띄워 두고 따라 할 수 있게 팝업창으로 연다(같은 이름의 창을 다시 쓴다) */
function GuideLinkButton({ guideId, label }: { guideId: string | null; label: string }) {
  return (
    <button type="button" onClick={() => window.open(mainSiteUrl(MAIN, guidePath(guideId)), "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes")} className={ghost}>
      📄 {label}
    </button>
  );
}

/**
 * API키등록·플랫폼연동. 이 프로그램은 그림을 회원 PC에서 그려 **AI 키 없이 쓸 수 있다**.
 * AI 키는 선택 기능(한글 설명을 영문으로 바꾸기)에만 쓰이고, 등록은 메인 사이트 한 곳에서 한다 — 여기에는 입력 칸이 없다.
 * 이 화면은 등록 여부(있음·없음)만 보여 준다. AI를 부르지 않는다.
 */
export function SettingsScreen() {
  const [status, setStatus] = useState<ConvertStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const read = async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchConvertStatus(fetch));
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "등록된 키를 확인하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };
  // 화면이 열리면 등록 상태를 한 번 읽는다(AI 호출이 아니다). 화면이 닫힌 뒤에 온 응답은 버린다.
  useEffect(() => {
    let gone = false;
    fetchConvertStatus(fetch).then(
      (s) => {
        if (gone) return;
        setStatus(s);
        setLoading(false);
      },
      (e) => {
        if (gone) return;
        setStatus(null);
        setError(e instanceof Error ? e.message : "등록된 키를 확인하지 못했습니다.");
        setLoading(false);
      },
    );
    return () => {
      gone = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-bold">⚙ API키등록·플랫폼연동</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">그림은 회원님 PC에서 그리므로 AI 키가 없어도 쓸 수 있습니다. 아래 키는 한글 설명을 영문으로 바꾸는 선택 기능에만 쓰입니다.</p>
      </header>

      <section className={card} aria-labelledby="keys-title">
        <h2 id="keys-title" className="text-sm font-bold">
          등록된 AI 키
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">키는 메인 사이트 「API 설정」에 한 번 등록하면 모든 프로그램이 함께 씁니다. 이 화면에는 키를 적는 칸이 없고, 키 값도 보이지 않습니다.</p>
        <ul className="mt-3 space-y-2" aria-live="polite" aria-busy={loading}>
          {CONVERT_PROVIDER_ORDER.map((p) => {
            const on = status?.keys[p] === true;
            return (
              <li key={p} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm">
                <span>{CONVERT_PROVIDER_LABEL[p]}</span>
                <span className={on ? "font-bold text-emerald-300" : "text-[var(--muted)]"}>{loading ? "확인 중…" : !status ? "확인하지 못함" : on ? "✅ 등록됨" : "없음"}</span>
              </li>
            );
          })}
        </ul>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={mainSiteUrl(MAIN, API_SETTINGS_PATH)} target="_blank" rel="noreferrer" className={button}>
            메인 사이트 「API 설정」 열기
          </a>
          <button type="button" onClick={() => void read()} disabled={loading} className={ghost}>
            다시 확인
          </button>
        </div>
      </section>

      <section className={card} aria-labelledby="convert-title">
        <h2 id="convert-title" className="text-sm font-bold">
          한글로 적고 영문으로 바꾸기 (선택)
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          켜고 끄기와 AI 고르기는 「만들기」의 설명 칸 바로 아래에 있습니다. 켜면 회원님이 등록한 키로 유료 호출이 되고, 버튼을 누를 때 한 번만 부릅니다.
          {status && (status.defaultModel ? ` 지금 등록된 키 기준으로 가장 저렴한 등급이 기본으로 골라집니다.` : " 지금은 등록된 키가 없어 켤 수 없습니다.")}
        </p>
        <Link href="/create" className={`${ghost} mt-3 inline-block`}>
          🎨 만들기 열기
        </Link>
      </section>

      <section className={card} aria-labelledby="guide-title">
        <h2 id="guide-title" className="text-sm font-bold">
          📖 연동 매뉴얼
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">키 발급 방법을 옆 창에 띄워 두고 따라 할 수 있습니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {KEY_GUIDES.map((g) => (
            <GuideLinkButton key={g.provider} guideId={g.guideId} label={g.label} />
          ))}
          <Link href="/guide" className={ghost}>
            📖 이 프로그램 사용 매뉴얼
          </Link>
        </div>
      </section>
    </div>
  );
}
