// 시험 전용: Next 앱 라우터 밖(시험 서버)에서 useRouter를 쓰는 컴포넌트를 렌더링하기 위한 대체 구현.
// 이동 요청은 실제로 이동하지 않고 window.__pushed에 기록한다(운영 코드에는 포함되지 않음).
declare global { interface Window { __pushed?: string[] } }

export function useRouter() {
  return {
    push: (url: string) => { (window.__pushed ??= []).push(url); },
    replace: (url: string) => { (window.__pushed ??= []).push(url); },
    refresh: () => {},
    back: () => {},
    prefetch: async () => {},
  };
}
export function notFound(): never { throw new Error("notFound"); }
export function redirect(url: string): never { throw new Error(`redirect:${url}`); }
export function usePathname() { return "/"; }
export function useSearchParams() { return new URLSearchParams(location.search); }
