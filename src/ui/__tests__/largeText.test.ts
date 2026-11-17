import { readFileSync } from 'fs';
import { join } from 'path';

// B-52 · TC-345: layouts that broke at 200% text. No React Native renderer in this project, so the fixes are guarded
// in the source.
const src = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

describe('200% text (B-52)', () => {
  it('a chip never grows wider than its row', () => {
    const chips = src('ui/Chips.tsx');
    expect(chips).toContain("maxWidth: '100%'");
    expect(chips).toMatch(/style=\{\{ flexShrink: 1, color: fg/);
  });

  it('Miles header lets the year label shrink so ⋯ stays on screen; trip titles get two lines', () => {
    const miles = src('app/(tabs)/miles.tsx');
    expect(miles).toContain('style={[styles.flex, { flex: 1, minWidth: 0 }]}');
    expect(miles).toMatch(/numberOfLines=\{1\} style=\{\{ marginLeft: 6, flexShrink: 1 \}\}/);
    expect(miles).toContain('<Txt v="h3" numberOfLines={2}>');
  });

  it('Split part category button shrinks its text to fit', () => {
    expect(src('features/entries/SortEntryCard.tsx')).toMatch(/adjustsFontSizeToFit\s+minimumFontScale=\{0\.6\}/);
  });
});

describe('200% text (B-54)', () => {
  it('screen titles shrink instead of breaking inside a word; header actions may shrink', () => {
    const layout = src('ui/Layout.tsx');
    expect(layout).toMatch(/numberOfLines=\{2\} adjustsFontSizeToFit minimumFontScale=\{0\.6\}/);
    expect(layout).toContain("maxWidth: '62%'");
  });
  it('Miles trip times get two lines next to an Exported badge', () => {
    expect(src('app/(tabs)/miles.tsx')).toMatch(/numberOfLines=\{2\} style=\{\{ flexShrink: 1 \}\}>\s*\{sub\}/);
  });
});
