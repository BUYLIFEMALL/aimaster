"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareOnsiteUploadAction, saveOnsiteCaptureAction } from "@/lib/actions/onsite";
import { bestSample, exifGps, fitSize, shouldStopWaiting, type GeoSample } from "@/lib/onsite/geo";
import { locateAdminDong } from "@/lib/onsite/locate";
import { findAddress } from "@/lib/onsite/address";
import { autoParcel } from "@/lib/onsite/geo";
import { ONSITE_BUCKET, type CoordSource } from "@/lib/onsite/types";
import { createClient } from "@/lib/supabase/client";
import { OnsiteMap } from "./OnsiteMap";

type Fix = { lat: number; lon: number; accuracy: number | null; source: CoordSource };

async function shrinkPhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("사진을 줄이지 못했습니다.");
  return { blob, width, height };
}

/** 사진을 찍으면 위치를 재서 바로 저장한다. 위치를 못 받거나 앨범 사진에 위치가 없을 때만 지도에서 고른다 */
export function CaptureButtons({
  mapKey,
  propertyId = null,
  fallbackCenter = null,
}: {
  mapKey: string | null;
  propertyId?: string | null;
  fallbackCenter?: { lat: number; lon: number } | null;
}) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);
  const watch = useRef<{ id: number | null; samples: GeoSample[]; denied: boolean }>({ id: null, samples: [], denied: false });
  const pickedCenter = useRef<{ lat: number; lon: number } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [pickFile, setPickFile] = useState<File | null>(null);

  function stopWatching() {
    if (watch.current.id !== null) navigator.geolocation.clearWatch(watch.current.id);
    watch.current.id = null;
  }

  function openCamera() {
    setError("");
    setSaved(null);
    stopWatching();
    watch.current = { id: null, samples: [], denied: false };
    // 카메라를 여는 순간부터 위치를 재기 시작한다
    if (navigator.geolocation) {
      watch.current.id = navigator.geolocation.watchPosition(
        (p) => watch.current.samples.push({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
        (e) => {
          if (e.code === e.PERMISSION_DENIED) watch.current.denied = true;
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
      );
    }
    cameraRef.current?.click();
  }

  async function waitForFix(): Promise<GeoSample | null> {
    const started = Date.now();
    while (!watch.current.denied && !shouldStopWaiting(watch.current.samples, Date.now() - started)) {
      const best = bestSample(watch.current.samples);
      setBusy(best ? `위치를 맞추는 중입니다 (오차 약 ${Math.round(best.accuracy)}m)` : "위치를 찾는 중입니다");
      await new Promise((r) => setTimeout(r, 500));
    }
    stopWatching();
    return bestSample(watch.current.samples);
  }

  async function save(file: File, fix: Fix) {
    setBusy("사진을 저장하는 중입니다");
    setError("");
    try {
      const { blob, width, height } = await shrinkPhoto(file);
      const prepared = await prepareOnsiteUploadAction();
      if (!prepared.ok) throw new Error(prepared.error);
      const { error: uploadError } = await createClient().storage
        .from(ONSITE_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.token, blob, { contentType: "image/jpeg" });
      if (uploadError) throw new Error("사진을 올리지 못했습니다. 인터넷 연결을 확인해 주세요.");
      const [place, hit] = await Promise.all([locateAdminDong(fix.lat, fix.lon), findAddress(fix.lat, fix.lon)]);
      const result = await saveOnsiteCaptureAction({
        ...autoParcel(hit),
        propertyId,
        path: prepared.path,
        lat: fix.lat,
        lon: fix.lon,
        accuracy: fix.accuracy,
        source: fix.source,
        width,
        height,
        bytes: blob.size,
        ...place,
      });
      if (!result.ok) throw new Error(result.error);
      setSaved(result.propertyId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy("");
    }
  }

  async function onCamera(file: File | undefined) {
    if (cameraRef.current) cameraRef.current.value = "";
    if (!file) {
      stopWatching();
      return;
    }
    const fix = await waitForFix();
    setBusy("");
    if (fix) await save(file, { ...fix, source: "capture" });
    else setPickFile(file);
  }

  async function onAlbum(file: File | undefined) {
    if (albumRef.current) albumRef.current.value = "";
    if (!file) return;
    setError("");
    setSaved(null);
    const gps = exifGps(await file.arrayBuffer());
    if (gps) await save(file, { ...gps, accuracy: null, source: "exif" });
    else setPickFile(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="mx-btn-primary min-h-[52px] flex-1 text-base" disabled={Boolean(busy)} onClick={openCamera}>
          📷 {propertyId ? "사진 더 찍기" : "사진 찍기"}
        </button>
        <button type="button" className="mx-btn-ghost min-h-[52px]" disabled={Boolean(busy)} onClick={() => albumRef.current?.click()}>
          🖼 앨범에서 고르기
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onCamera(e.target.files?.[0])} />
      <input ref={albumRef} type="file" accept="image/*" hidden onChange={(e) => void onAlbum(e.target.files?.[0])} />
      {busy && <p role="status" className="text-sm text-mx-link">⏳ {busy}</p>}
      {error && <p role="alert" className="text-sm text-mx-danger">{error}</p>}
      {saved && !propertyId && (
        <p role="status" className="text-sm text-mx-success">
          ✅ 저장했습니다. 이어서 찍으셔도 됩니다. <Link href={`/onsite/${saved}`} className="underline">방금 저장한 곳 열기</Link>
        </p>
      )}
      {pickFile && (
        <div className="rounded-xl border border-mx-border bg-mx-raised p-3">
          <p className="mb-2 text-sm font-bold text-mx-text">이 사진의 위치를 찾지 못했습니다. 지도를 움직여 📍를 찍은 곳에 맞춰 주세요.</p>
          <OnsiteMap mapKey={mapKey} center={fallbackCenter} picking onCenterChange={(c) => (pickedCenter.current = c)} />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="mx-btn-primary min-h-[44px] flex-1"
              onClick={() => {
                const c = pickedCenter.current;
                const file = pickFile;
                setPickFile(null);
                if (c) void save(file, { ...c, accuracy: null, source: "manual" });
              }}
            >
              이 위치로 저장
            </button>
            <button type="button" className="mx-btn-ghost min-h-[44px]" onClick={() => setPickFile(null)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
