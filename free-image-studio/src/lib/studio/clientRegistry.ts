// 회원별로 「지금 쓰는 것 하나」를 관리하는 등록부(순수 — 브라우저·React 없이 시험할 수 있다).
// 화면이 쓰는 동안만 만들어 두고, 마지막 사용 등록이 끊기면 정리한다. 엔진 연결 계층(useEngine)이 이것을 쓴다.
//
// 왜 필요한가: 화면이 떠 있는 동안에만 연결을 두고, 회원이 바뀌거나 화면을 떠나면 반드시 정리해야 한다
// (앞 회원이 보낸 요청의 늦은 응답이 다음 화면에 섞이지 않게). 화면이 그릴 때마다 만들면 여러 개가 생기고,
// 그린 뒤에 상태로 넣으면 한 박자 늦는다. 사용 등록으로 만들고 끊기면 정리하는 것이 가장 단순하다.

export type Disposable = { dispose(): void };

export function createClientRegistry<T extends Disposable>(create: (memberId: string) => T) {
  const live = new Map<string, { value: T; count: number }>();
  return {
    /**
     * 이 회원의 것을 쓰겠다고 알린다. 처음이면 만든다. 돌려준 함수를 부르면 사용 등록이 끊기고,
     * 그 회원의 마지막 사용 등록이었으면 정리(dispose)한다. 같은 사용 등록을 두 번 끊어도 한 번만 센다.
     */
    subscribe(memberId: string): () => void {
      let slot = live.get(memberId);
      if (!slot) {
        slot = { value: create(memberId), count: 0 };
        live.set(memberId, slot);
      }
      slot.count += 1;
      const mine = slot;
      let done = false;
      return () => {
        if (done) return;
        done = true;
        mine.count -= 1;
        if (mine.count > 0) return;
        if (live.get(memberId) === mine) live.delete(memberId);
        mine.value.dispose();
      };
    },
    /** 지금 사용 등록 중인 그 회원의 것. 사용 등록이 없으면 null(정리된 것을 돌려주지 않는다) */
    get(memberId: string): T | null {
      return live.get(memberId)?.value ?? null;
    },
    get size() {
      return live.size;
    },
  };
}
