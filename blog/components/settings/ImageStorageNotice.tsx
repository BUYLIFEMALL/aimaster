// 설정 화면의 "이미지 저장 안내" 박스. 2026-10-01 Cloudinary 연동을 없애고 AIMaster 저장소(Supabase Storage)에
// 자동 저장하도록 바꾸면서, 예전 Cloudinary 설정 칸 자리에 넣었다.
export function ImageStorageNotice() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-zinc-900">🖼️ 이미지 저장 안내</h2>
      </div>
      <ul className="list-disc space-y-1.5 pl-5 text-xs leading-5 text-zinc-600">
        <li>AI가 만든 이미지와 편집기에서 첨부한 이미지는 AIMaster 저장소에 자동으로 저장되고, 글에는 이미지 주소만 들어갑니다.</li>
        <li>따로 이미지 저장소(Cloudinary 등)를 연결하지 않아도 됩니다.</li>
      </ul>
    </section>
  )
}
