// 영상 생성 1단계 화풍·카메라 프리셋(v1.14에 생성 화면에서 옮김 — 생성 화면·프롬프트 게시판 공용, 이 프로그램 고유 문구)
// 영상 설명에 덧붙는 영문 지시(이 프로그램 고유 문구, 다른 프로그램과 공유하지 않음)
export const STYLES = [
  { id: "cinematic", label: "시네마틱 실사", text: "cinematic live-action footage, natural light, shallow depth of field, film grain" },
  { id: "anime", label: "2D 애니메이션", text: "2D anime style animation, clean line art, vivid colors" },
  { id: "pixar", label: "3D 애니메이션", text: "3D animated film style, soft global illumination, expressive characters" },
  { id: "documentary", label: "다큐멘터리", text: "documentary style handheld footage, realistic and candid" },
  { id: "product", label: "제품 광고", text: "premium product commercial, studio lighting, clean background, slow reveal" },
  { id: "drone", label: "드론 풍경", text: "aerial drone footage, sweeping landscape, golden hour" },
];
export const CAMERAS = [
  { id: "push", label: "천천히 다가가기", text: "slow push-in camera move" },
  { id: "pan", label: "좌우 팬", text: "smooth horizontal pan" },
  { id: "orbit", label: "주위 돌기", text: "slow orbit around the subject" },
  { id: "static", label: "고정 카메라", text: "static locked-off camera" },
  { id: "tracking", label: "따라가기", text: "tracking shot following the subject" },
];
