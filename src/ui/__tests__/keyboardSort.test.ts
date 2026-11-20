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
  // B-114 v2: also hidden while the Sort screen scrolls (short window / large text).
  expect(sort).toMatch(/keyboardUp( \|\| short)? \? null : <CaptureFab \/>/);
});

test('Sort card scrolls Edit / Split into view when the keyboard opens', () => {
  const card = read('features/entries/SortEntryCard.tsx');
  expect(card).toMatch(/useKeyboardUp\(\)/);
  // Split scrolls toward the form's end (B-151: computed, so the row being typed in stays in view too).
  expect(card).toMatch(/area\.current\.content - area\.current\.height/);
});

test('B-151: in the scrolling layout the card fits above the keyboard (iOS)', () => {
  const sort = read('app/(tabs)/sort.tsx');
  expect(sort).toMatch(/fitAboveKeyboard \? .*viewport - 18/);
});

// B-153: outside the tab bar the last button scrolled under the 3-button navigation bar, and on the Galaxy A13 the
// keyboard-avoiding views stopped short of the keyboard. Guards the wiring.
test('B-153: Screen clears the navigation bar and pads what the keyboard still covers', () => {
  const layout = read('ui/Layout.tsx');
  expect(layout).toMatch(/bottomInset && !bottom \? insets\.bottom : 0/);
  expect(layout).toMatch(/useKeyboardGap\(avoidKeyboard\)/);
  const overlays = read('ui/Overlays.tsx');
  expect(overlays.match(/useKeyboardGap\(visible\)/g)?.length).toBe(2); // Sheet + Dialog
  const gap = read('ui/keyboardGap.tsx');
  expect(gap).toMatch(/Math\.min\(screenY, Dimensions\.get\('screen'\)\.height - height - navBar\)/);
});
