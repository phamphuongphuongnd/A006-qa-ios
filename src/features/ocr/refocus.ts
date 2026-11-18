/** What refocus needs from a text input instance (works for every TextInput ref type RN hands out). */
interface Focusable {
  isFocused(): boolean;
  blur(): void;
  focus(): void;
}

/**
 * QA-100 MOD-9: after Back hid the keyboard the field stays focused, and focus() on a focused field doesn't bring the
 * keyboard back on Android. Blur first, then focus on the next frame.
 */
export function refocus(input: Focusable | null | undefined): void {
  if (!input) return;
  if (input.isFocused()) {
    input.blur();
    requestAnimationFrame(() => input.focus());
  } else input.focus();
}
