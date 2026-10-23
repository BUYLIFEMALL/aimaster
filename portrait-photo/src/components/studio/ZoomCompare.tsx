"use client";
import { useState } from "react";

// 후보 두 장을 같은 위치·같은 배율로 나란히 확대해 비교한다(한쪽을 움직이면 다른 쪽도 같이 움직인다).
export function ZoomCompare({ urls, initialA, aspect, onPick, onClose }: {
  urls: string[]; initialA: number; aspect: string; onPick: (index: number) => void; onClose: () => void;
}) {
  const [a, setA] = useState(Math.min(initialA, urls.length - 1));
  const [b, setB] = useState(a === 0 ? Math.min(1, urls.length - 1) : 0);
  const [zoom, setZoom] = useState(2.5);
  const [pos, setPos] = useState({ x: 50, y: 28 });

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)), y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)) });
  }

  const pane = (idx: number, set: (n: number) => void, label: string) => (
    <div className="zc-pane">
      <div className="zc-head">
        <label>{label}
          <select value={idx} onChange={(e) => set(Number(e.target.value))} aria-label={`${label} 후보 선택`}>
            {urls.map((_, i) => <option key={i} value={i}>{i + 1}번</option>)}
          </select>
        </label>
        <button type="button" onClick={() => onPick(idx)}>이 사진 선택</button>
      </div>
      <div
        className="zc-view"
        onPointerMove={move}
        style={{ aspectRatio: aspect.replace(":", " / "), backgroundImage: `url(${urls[idx]})`, backgroundSize: `${zoom * 100}%`, backgroundPosition: `${pos.x}% ${pos.y}%` }}
        role="img"
        aria-label={`${idx + 1}번 후보 확대 보기`}
      />
    </div>
  );

  return (
    <div className="zc">
      <div className="zc-bar">
        <label className="slider"><span>배율</span><input type="range" min={1} max={4} step={0.5} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="확대 배율" /><b>{zoom}×</b></label>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
      <p className="muted">사진 위에 마우스를 올리면 같은 위치를 두 사진에서 동시에 확대해 볼 수 있어요. 눈·입꼬리·머리 끝을 비교해 보세요.</p>
      <div className="zc-grid">
        {pane(a, setA, "왼쪽")}
        {pane(b, setB, "오른쪽")}
      </div>
    </div>
  );
}
