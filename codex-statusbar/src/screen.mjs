import { isFooter } from './format.mjs';

export function findFooter(buffer, rows) {
  for (let row = rows - 1; row > buffer.cursorY; row--) {
    const line = buffer.getLine(buffer.viewportY + row)?.translateToString(true) || '';
    if (isFooter(line)) return { row, line };
  }
  return null;
}
