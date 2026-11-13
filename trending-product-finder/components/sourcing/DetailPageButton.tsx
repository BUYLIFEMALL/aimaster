"use client";

// 2026-11-13 원본 사진 참고 수집: 「상세페이지」를 누르면 상세페이지 새 상품 창을 열고, 확장이 회원 브라우저로 받은
// 상품 원본 사진(1~3장)을 그 창으로 넘긴다(공용 reference-photo-handoff). 사진은 참고·AI 분석용 —
// 상세페이지는 출처를 collected로 저장하고, 마켓 등록기는 등록 직전 경고한다.
// 확장이 없거나 사진을 못 받아도 상세페이지는 그대로 열린다(상품명·원본 정보만).
import { useState, type ReactNode } from "react";
import { askExtension } from "@/lib/extensionBridge";
import {
  REFERENCE_JOB_PARAM,
  REFERENCE_MSG_JOB,
  REFERENCE_RECEIVER_ORIGIN,
  isReferenceReady,
  readReferenceReceived,
} from "@/lib/referencePhotoHandoff";

type Collected = { ok: true; photos: { type: string; base64: string; sourceUrl: string }[]; big: boolean } | { ok: false; error: string; needConsent?: boolean };

const CONSENT_KEY = "tpf-reference-photo-consent-v1";

function toBlob(base64: string, type: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

function readConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function DetailPageButton({
  href,
  className,
  title,
  children,
  market,
  productId,
  productUrl,
  imageUrls = [],
}: {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
  /** 쿠팡·네이버 상품이면 마켓과 상품번호(확장 목록의 사진·열린 상품 페이지를 찾는다) */
  market?: "coupang" | "naver";
  productId?: string;
  productUrl?: string;
  /** 공식 API가 준 사진 주소(알리·도매매·11번가) */
  imageUrls?: string[];
}) {
  const [askConsent, setAskConsent] = useState(false);
  const [note, setNote] = useState("");

  async function open(consent: boolean) {
    setAskConsent(false);
    setNote("");
    const jobId = crypto.randomUUID();
    const url = `${href}${href.includes("?") ? "&" : "?"}${REFERENCE_JOB_PARAM}=${jobId}`;
    // 팝업 차단을 피하려고 누른 순간 창부터 연다(사진은 뒤이어 넘긴다)
    const win = window.open(url, "_blank");
    if (!win) {
      setNote("팝업이 막혔습니다. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.");
      return;
    }
    let ready = false;
    let photos: Blob[] = [];
    let sourceUrls: string[] = [];
    let sent = false;
    const send = () => {
      if (sent || !ready || !photos.length) return;
      sent = true;
      win.postMessage({ type: REFERENCE_MSG_JOB, jobId, photos: photos.map((file, i) => ({ file, sourceUrl: sourceUrls[i] ?? "" })) }, REFERENCE_RECEIVER_ORIGIN);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== win) return;
      if (isReferenceReady(e.origin, e.data, jobId)) {
        ready = true;
        send();
        return;
      }
      const received = readReferenceReceived(e.origin, e.data, jobId);
      if (received) {
        setNote(received.ok ? "✅ 참고 사진을 상세페이지로 넘겼습니다(참고·분석용)." : `상세페이지가 사진을 받지 못했습니다: ${received.error}`);
        window.removeEventListener("message", onMessage);
      }
    };
    window.addEventListener("message", onMessage);
    window.setTimeout(() => window.removeEventListener("message", onMessage), 90_000);

    const result = await askExtension<Collected>("collect-photos", 60_000, { market, id: productId, productUrl, imageUrls: imageUrls.filter(Boolean).slice(0, 3), consent });
    if (!result) {
      setNote("확장이 없거나 응답이 없어 사진 없이 열었습니다(상품소싱 확장을 설치·연결하면 참고 사진도 함께 넘어갑니다).");
      return;
    }
    if (!result.ok) {
      if (result.needConsent) {
        try {
          window.localStorage.removeItem(CONSENT_KEY);
        } catch {
          // 저장 못 해도 다음에 다시 묻는다
        }
      }
      setNote(`사진 없이 열었습니다: ${result.error}`);
      return;
    }
    photos = result.photos.map((p) => toBlob(p.base64, p.type));
    sourceUrls = result.photos.map((p) => p.sourceUrl);
    setNote(`📷 참고 사진 ${photos.length}장${result.big ? "(상품 페이지 큰 사진 포함)" : ""}을 넘기는 중입니다…`);
    send();
  }

  function onClick() {
    if (readConsent()) void open(false);
    else setAskConsent(true);
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={onClick} title={title} className={className}>
        {children}
      </button>
      {askConsent && (
        <span className="block max-w-xs rounded-lg border border-amber-400/60 bg-amber-50 p-2.5 text-left text-[11px] leading-relaxed text-amber-950">
          <b className="block">📷 원본 사진 참고 수집 안내</b>
          상품 원본 사진을 내 브라우저로 받아 상세페이지 기획·AI 분석의 <b>참고용</b>으로 넘깁니다. 저작권은 원 판매자에게 있으며, 그대로 마켓에 등록하면 신고·판매 정지될 수 있습니다(등록에는 편집본·직접 찍은 사진). 하루 50개 상품까지 받습니다.
          <span className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              className="rounded-md bg-amber-600 px-2 py-1 font-bold text-white"
              onClick={() => {
                try {
                  window.localStorage.setItem(CONSENT_KEY, "1");
                } catch {
                  // 다음에 다시 묻는다
                }
                void open(true);
              }}
            >
              동의하고 열기
            </button>
            <button type="button" className="rounded-md border border-amber-600/50 px-2 py-1 font-bold" onClick={() => { setAskConsent(false); window.open(href, "_blank"); }}>
              사진 없이 열기
            </button>
          </span>
        </span>
      )}
      {note && <span className="block max-w-xs text-right text-[11px] text-mx-muted">{note}</span>}
    </span>
  );
}
