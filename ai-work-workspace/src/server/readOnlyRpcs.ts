// 2026-11-20(WS-LECTURE-PREVIEW-ONLY): DB에 한 줄도 쓰지 않아야 하는 명령 목록 — 실행기(runtime.ts)와 진입점(app/api/rpc/[name]/route.ts)이 함께 쓴다.
// 실행기: 회원 준비(`ensureMember` — 회원·설정 생성, 이름 읽기, 이메일 맞춤)를 하지 않고 회원 레코드가 있는지만 읽는다(없으면 403).
// 진입점: 인증·권한·계정 확인은 다른 명령과 같고, 회원 AI 키 조회·모델 목록 예열·정시 작업 추적·응답 뒤 afterRpc를 하지 않는다.
export const READ_ONLY_MEMBER_RPCS: ReadonlySet<string> = new Set(['previewLectureImport']);
export const isReadOnlyMemberRpc = (name: string) => READ_ONLY_MEMBER_RPCS.has(name);
