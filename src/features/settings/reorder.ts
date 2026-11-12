/** Every row has this height so a drag offset maps to an index. */
export const DRAG_ROW_H = 64;

/** Index the dragged row lands on for a vertical offset. Exported for tests. */
export const dropIndex = (from: number, dy: number, count: number) =>
  Math.max(0, Math.min(count - 1, from + Math.round(dy / DRAG_ROW_H)));

/** New order after moving `from` to `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const out = [...list];
  const [it] = out.splice(from, 1);
  out.splice(to, 0, it);
  return out;
}
