"use client";

// D32 몰 로고 = 홈 화면 앱 아이콘. 정사각 그림 권장, 없으면 몰 이름 첫 글자 아이콘
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveLogoAction, type LogoState } from "./logo-actions";

const BUCKET = "mall-builder-public";
const MAX_BYTES = 2 * 1024 * 1024;

export default function LogoForm({ slug, storeId, logo }: { slug: string; storeId: string; logo: string }) {
  const [url, setUrl] = useState(logo);
  const [state, setState] = useState<LogoState>({ error: null, message: null });
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  const save = (next: string) => start(async () => {
    const r = await saveLogoAction(slug, next);
    setState(r);
    if (!r.error) setUrl(next);
  });
  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return setState({ error: "2MB 이하 그림만 올릴 수 있습니다.", message: null });
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setState({ error: "PNG·JPG·WEBP 그림만 올릴 수 있습니다.", message: null });
    setBusy(true);
    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${storeId}/logo/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    if (error) return setState({ error: `올리기 실패: ${error.message}`, message: null });
    save(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return (
    <fieldset className="rounded-lg border p-4" data-logo-setting>
      <legend className="px-1 text-sm font-semibold">📲 몰 로고(홈 화면 앱 아이콘)</legend>
      <p className="text-sm text-gray-600">손님이 휴대폰 홈 화면에 이 몰을 추가하면 이 그림이 아이콘이 됩니다. 정사각형 PNG를 권장하고, 없으면 몰 이름 첫 글자 아이콘을 씁니다.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/s/${slug}/app-icon/192?v=${encodeURIComponent(url).slice(-12)}`} alt="지금 앱 아이콘" className="h-16 w-16 rounded-2xl border object-cover" data-logo-preview />
        <label className="min-h-11 cursor-pointer rounded border px-4 py-2 text-sm">
          {busy || pending ? "올리는 중…" : url ? "로고 바꾸기" : "로고 올리기"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={busy || pending} onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {url && <button type="button" onClick={() => save("")} disabled={pending} className="text-sm text-red-700">로고 지우기</button>}
      </div>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
    </fieldset>
  );
}
