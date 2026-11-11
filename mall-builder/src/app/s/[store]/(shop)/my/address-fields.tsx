"use client";

import { useRef, useState } from "react";

// 우편번호·주소 칸 + 「주소 찾기」(카카오 우편번호 서비스 — 키·비용 없음, 손님 브라우저에서 바로 열림)
// 검색 창을 못 불러오면 지금처럼 손으로 입력한다. 도서산간 판단은 우편번호로 하므로 검색 결과의 5자리 우편번호를 그대로 넣는다.

const SCRIPT = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
type PostcodeData = { zonecode: string; roadAddress: string; jibunAddress: string; userSelectedType: "R" | "J"; buildingName: string; apartment: "Y" | "N" };
type DaumPostcode = new (o: { oncomplete: (d: PostcodeData) => void }) => { open: () => void };
declare global { interface Window { daum?: { Postcode: DaumPostcode } } }

function loadScript(): Promise<void> {
  if (window.daum?.Postcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("load"));
    document.head.appendChild(s);
  });
}

const input = "mt-0.5 w-full rounded border px-2 py-1.5 text-sm";

export default function AddressFields({ zip, addr1, onZip }: { zip: string; addr1: string; /** 우편번호가 바뀔 때(비회원 주문서가 배송비 지역을 다시 계산) */ onZip?: (zip: string) => void }) {
  const [z, setZRaw] = useState(zip);
  const setZ = (v: string) => { setZRaw(v); onZip?.(v); };
  const [a, setA] = useState(addr1);
  const [error, setError] = useState("");
  const box = useRef<HTMLButtonElement | null>(null);

  async function find() {
    setError("");
    try {
      await loadScript();
      new window.daum!.Postcode({
        oncomplete: (d) => {
          const base = d.userSelectedType === "R" ? d.roadAddress : d.jibunAddress;
          const extra = d.userSelectedType === "R" && d.buildingName && d.apartment === "Y" ? ` (${d.buildingName})` : "";
          setZ(d.zonecode);
          setA(`${base}${extra}`);
          // 상세 주소 칸으로 이동(같은 폼 안)
          setTimeout(() => box.current?.closest("form")?.querySelector<HTMLInputElement>("input[name=addr2]")?.focus(), 0);
        },
      }).open();
    } catch {
      setError("주소 검색 창을 열지 못했습니다. 우편번호와 주소를 직접 입력해 주세요.");
    }
  }

  return (
    <>
      <label className="block">
        <span className="text-xs text-gray-500">우편번호</span>
        <div className="flex gap-2">
          <input name="zip" value={z} onChange={(e) => setZ(e.target.value)} required inputMode="numeric" maxLength={5} placeholder="06236" className={input} />
          <button ref={box} type="button" onClick={find} className="mt-0.5 whitespace-nowrap rounded border px-3 text-sm" data-find-address>주소 찾기</button>
        </div>
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs text-gray-500">주소</span>
        <input name="addr1" value={a} onChange={(e) => setA(e.target.value)} required maxLength={120} className={input} />
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
    </>
  );
}
