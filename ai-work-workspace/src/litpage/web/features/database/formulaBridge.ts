// Plugs the formula language (shared/formula/index.ts) into the shared database engine.
// 이식판: 원본은 모듈이 아직 없을 때를 대비해 import.meta.glob으로 불러왔다. 이제 항상 있으므로 직접 불러온다.
import { registerFormulaEngine, registerRollupEngine } from '#shared/database/computed.ts';
import { evaluateFormula, evaluateRollup } from '#shared/formula/index.ts';

if (typeof evaluateFormula === 'function') registerFormulaEngine(evaluateFormula);
if (typeof evaluateRollup === 'function') registerRollupEngine(evaluateRollup);
