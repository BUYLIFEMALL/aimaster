"use client";

// 🚀 시작하기 체크리스트(2026-10-25 UX 리뉴얼 A) — 처음 쓰는 회원이 순서를 헤매지 않게 5단계를 자동 판정하고
// 「다음 할 일」 하나만 크게 보여 준다. 설치·연결은 이 브라우저의 확장에 물어보고(web-bridge ping), 나머지는 저장값.
import { useEffect, useState } from "react";
import { askExtension } from "@/lib/extensionBridge";

type Facts = { hasToken: boolean; telegram: boolean; targetCount: number; scheduleOn: boolean; email: string };
type Step = { key: string; icon: string; title: string; desc: string; done: boolean; action: { label: string; href: string; external?: boolean; download?: boolean } };

export default function StartChecklist({ facts }: { facts: Facts }) {
  const [ext, setExt] = useState<{ installed: boolean; connected: boolean; otherEmail: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    void askExtension<{ ok?: boolean; connected?: boolean; email?: string | null }>("ping", 2500).then((p) => {
      if (!alive) return;
      // 예전 확장(연결 여부를 안 알려 줌)이면 서버의 연결 코드 기록으로 대신 판단
      const linked = p?.ok ? (p.connected ?? facts.hasToken) : false;
      // 확장이 다른 계정에 연결돼 있으면 이 계정 기준으로는 「연결 전」(2026-10-25 시험에서 발견)
      const other = linked && p?.email && p.email.toLowerCase() !== facts.email.toLowerCase() ? p.email : null;
      setExt({ installed: !!p?.ok, connected: linked && !other, otherEmail: other });
    });
    return () => { alive = false; };
  }, [facts.hasToken, facts.email]);

  const steps: Step[] = [
    { key: "install", icon: "🧩", title: "확장 설치", desc: "크롬에 매물 알림 확장을 설치해요(1번만).", done: !!ext?.installed, action: { label: "⬇ 확장 받기", href: "/downloads/realty-listing-alert-extension-latest.zip", download: true } },
    { key: "connect", icon: "🔗", title: "웹과 연결", desc: ext?.otherEmail ? `지금 확장은 다른 계정(${ext.otherEmail})에 연결돼 있어요. 이 계정으로 다시 연결해 주세요.` : "버튼 한 번으로 이 계정과 확장을 연결해요.", done: !!ext?.connected, action: { label: "🔗 바로 연결하러 가기", href: "/settings" } },
    { key: "telegram", icon: "📨", title: "텔레그램 연결", desc: "알림을 받을 내 텔레그램 봇을 연결해요.", done: facts.telegram, action: { label: "📨 텔레그램 연결하기", href: "/delivery" } },
    { key: "target", icon: "🏠", title: "단지 추가", desc: "네이버 부동산에서 단지를 열고 초록 「➕ 매물 알림에 추가」를 눌러요.", done: facts.targetCount > 0, action: { label: "🏠 네이버 부동산에서 단지 찾기", href: "https://new.land.naver.com/", external: true } },
    { key: "schedule", icon: "⏰", title: "예약 켜기", desc: "얼마나 자주 살펴볼지 정하고 켜요.", done: facts.scheduleOn, action: { label: "⏰ 예약 켜기", href: "/schedule" } },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = ext ? steps.find((s) => !s.done) : null;

  if (ext && !next) {
    return (
      <section className="card start-done">
        <strong>✅ 준비 완료!</strong> 크롬이 켜져 있으면 확장이 정해진 간격마다 단지를 살펴보고, 새 매물·가격 변동을 텔레그램으로 알려 드려요.
      </section>
    );
  }

  return (
    <section className="card start-card" aria-labelledby="start-title">
      <div className="start-head">
        <h2 className="card-title" id="start-title">🚀 시작하기 <span className="card-caption">{ext ? `${doneCount} / 5 완료` : "확인 중…"}</span></h2>
        <div className="start-bar" aria-hidden="true"><i style={{ width: `${(doneCount / 5) * 100}%` }} /></div>
      </div>
      <ol className="start-steps">
        {steps.map((s, i) => (
          <li key={s.key} className={s.done ? "done" : next?.key === s.key ? "now" : ""}>
            <span className="start-num">{s.done ? "✓" : i + 1}</span>
            <span className="start-text"><strong>{s.icon} {s.title}</strong><small>{s.desc}</small></span>
          </li>
        ))}
      </ol>
      {next && (
        <div className="start-next">
          <span>👉 다음 할 일: <b>{next.title}</b></span>
          <a
            className="start-next-btn"
            href={next.action.href}
            {...(next.action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            {...(next.action.download ? { download: true } : {})}
          >
            {next.action.label}
          </a>
          {next.key === "install" && <small>받은 ZIP을 풀고 chrome://extensions → 개발자 모드 → 「압축해제된 확장 프로그램을 로드」로 그 폴더를 고르세요. 설치 뒤 이 화면을 새로고침하면 다음 단계로 넘어가요.</small>}
          {next.key === "target" && <small>단지 화면이 열리면 오른쪽 아래 초록 버튼이 보여요. 누른 뒤 이 화면을 새로고침하세요.</small>}
        </div>
      )}
    </section>
  );
}
