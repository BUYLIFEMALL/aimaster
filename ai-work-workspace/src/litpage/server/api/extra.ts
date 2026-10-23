// Additional endpoint modules: every file in api/modules exporting `handlers` is merged automatically,
// so feature work adds endpoints without touching shared files.
// 이식판: 원본은 실행 중에 폴더를 읽어 동적으로 불러왔다. 번들 배포에서도 동작하도록 빌드 전에
// scripts/gen-registry.mjs가 만든 정적 import 목록(modules.generated.ts)을 같은 순서로 합친다.
import type { Ctx } from './handlers.ts';
import { moduleList } from './modules.generated.ts';

type Handler = (ctx: Ctx, body: any) => any | Promise<any>;

export const extraHandlers: Record<string, Handler> = {};

for (const mod of moduleList) {
  Object.assign(extraHandlers, (mod.handlers ?? {}) as Record<string, Handler>);
}
