import { readFileSync } from 'fs';
import { join } from 'path';

// B-43 · TC-244: the card actions ("Edit · Split · Merge · Skip" / "Split trip · Skip") are pinned under the card's
// ScrollView, not inside it — with three rows of chips or a route sketch they used to sit below the card's edge.
// (No React Native renderer in this project, so this guards the layout in the source.)
describe('Sort card actions are pinned outside the scroll area', () => {
  it.each(['SortEntryCard.tsx', 'SortTripCard.tsx'])('%s', (file) => {
    const src = readFileSync(join(__dirname, '..', file), 'utf8');
    const scrollEnd = src.indexOf('</ScrollView>');
    const actions = src.indexOf('testID="sort-card-actions"');
    const cardEnd = src.indexOf('</Card>');
    expect(scrollEnd).toBeGreaterThan(0);
    expect(actions).toBeGreaterThan(scrollEnd);
    expect(actions).toBeLessThan(cardEnd);
    expect(src.indexOf("t('sort.skip')")).toBeGreaterThan(scrollEnd);
  });
});
