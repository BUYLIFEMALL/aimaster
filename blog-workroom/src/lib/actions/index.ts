import "server-only";
import * as style from "./style";
import * as keywords from "./keywords";
import * as trend from "./trend";
import * as bench from "./bench";
import * as research from "./research";
import * as write from "./write";
import * as image from "./image";
import type { Handler } from "./common";

// 화면이 부르는 작업 단계 목록. 이름이 여기에 없으면 실행하지 않는다.
export const ACTIONS: Record<string, Handler> = {
  "style.create": style.create, "style.collect": style.collect, "style.analyze": style.analyze,
  "kw.discover": keywords.discover, "kw.metrics": keywords.metrics, "kw.save": keywords.save, "kw.related": keywords.related,
  "trend.collect": trend.collect, "trend.analyze": trend.analyze, "trend.verify": trend.verify,
  "bench.find": bench.find, "bench.analyze": bench.analyze,
  "research.create": research.create, "research.collect": research.collect, "research.analyze": research.analyze,
  "write.outline": write.outline, "write.section": write.section, "write.review": write.review, "write.finalize": write.finalize,
  "image.plan": image.plan, "image.generate": image.generate,
};
