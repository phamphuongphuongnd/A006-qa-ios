/**
 * B-38: typing a part amount in Split on the Sort card hid "Left to assign" and "Split & sort" under the keyboard.
 * The Sort screen must shrink above the keyboard (and drop the FAB), and the card must scroll its open form into view.
 * Checked on Galaxy A13; this guards the wiring so a refactor doesn't silently drop it.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(SRC, p), 'utf8');

test('Sort screen avoids the keyboard and hides the FAB while typing', () => {
  const sort = read('app/(tabs)/sort.tsx');
  expect(sort).toMatch(/<KeyboardAvoidingView[^>]*behavior=/);
  expect(sort).toMatch(/keyboardUp \? null : <CaptureFab \/>/);
});

test('Sort card scrolls Edit / Split into view when the keyboard opens', () => {
  const card = read('features/entries/SortEntryCard.tsx');
  expect(card).toMatch(/useKeyboardUp\(\)/);
  expect(card).toMatch(/scrollToEnd/);
});
