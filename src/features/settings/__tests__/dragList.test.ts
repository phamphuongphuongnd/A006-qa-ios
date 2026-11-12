import { DRAG_ROW_H, dropIndex, moveItem } from '../reorder';

describe('drag reorder', () => {
  it('maps a drag offset to a clamped index', () => {
    expect(dropIndex(2, 0, 5)).toBe(2);
    expect(dropIndex(2, DRAG_ROW_H * 0.6, 5)).toBe(3);
    expect(dropIndex(2, -DRAG_ROW_H * 1.4, 5)).toBe(1);
    expect(dropIndex(0, -500, 5)).toBe(0);
    expect(dropIndex(3, 5000, 5)).toBe(4);
  });

  it('moves an item', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });
});
