// 2026-10-21 이미지 병합 A(v1.11): AI 포토 리메이크는 「AI 바나나 캔버스 자동화」로 합쳐졌다. 이 앱은 안내와 브라우저 보관함만 남긴다(주소 유지).
import { ArrowRight, WandSparkles } from "lucide-react";

export const NEW_URL = "https://banana-canvas.buylife.xyz/studio";

export function MovedNotice({ mode }: { mode: "restore" | "compose" }) {
  const target = mode === "restore" ? `${NEW_URL}#card-restore` : `${NEW_URL}#card-composite`;
  return (
    <div className="remake-studio">
      <div className="page-heading">
        <p className="eyebrow">MOVED</p>
        <h1>AI 포토 리메이크가 「AI 바나나 캔버스 자동화」로 옮겨졌습니다</h1>
        <p>사진 복원·흑백 컬러화·실제 2배/4배 확대·원본과 완성 비교 슬라이더, 사물별 지시 합성은 이제 바나나 캔버스에서 그대로 쓰실 수 있습니다. 사용 권한도 함께 옮겨 드렸습니다.</p>
      </div>
      <section className="card">
        <div className="section-title"><span className="number"><WandSparkles size={16} /></span><h2>{mode === "restore" ? "🕰️ 옛 사진 복원" : "🧩 이미지 합성"}으로 가기</h2></div>
        <p className="muted help-text">본인 Gemini 키는 바나나 캔버스 「API키등록·플랫폼연동」에 이미 등록돼 있으면 그대로 쓰입니다(회원 공용 키 저장소).</p>
        <div className="actions"><a className="button primary" href={target}>바나나 캔버스에서 계속하기<ArrowRight size={16} /></a></div>
      </section>
      <div className="notice">이 브라우저에 보관했던 사진은 왼쪽 「내 보관함」에서 계속 내려받을 수 있습니다. 바나나 캔버스로 옮겨지지는 않으니 필요한 사진은 파일로 저장해 주세요.</div>
    </div>
  );
}
