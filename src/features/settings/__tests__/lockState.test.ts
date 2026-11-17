import { readFileSync } from 'fs';
import { join } from 'path';

import { lockSuspended, resetLockSuspended, withLockSuspended } from '../lockState';

// B-53: a biometric prompt dropped by the system (trip-toggle / NFC intent while it was up) never answers; its
// suspension must not keep app lock off for good, and "Unlock" must be able to start over.
describe('lock suspension (B-53)', () => {
  afterEach(() => resetLockSuspended());

  it('counts a prompt that is up, and releases it when it answers', async () => {
    let answer!: (v: boolean) => void;
    const p = withLockSuspended(() => new Promise<boolean>((r) => (answer = r)));
    expect(lockSuspended()).toBe(true);
    answer(true);
    await p;
    expect(lockSuspended()).toBe(false);
  });

  it('resetLockSuspended clears a prompt that never answers; a late answer does not go negative', async () => {
    let answer!: (v: boolean) => void;
    const p = withLockSuspended(() => new Promise<boolean>((r) => (answer = r)));
    expect(lockSuspended()).toBe(true);
    resetLockSuspended();
    expect(lockSuspended()).toBe(false);
    answer(false);
    await p;
    expect(lockSuspended()).toBe(false);
    const q = withLockSuspended(() => new Promise<void>(() => {}));
    expect(lockSuspended()).toBe(true);
    void q;
  });
});

describe('S-13 Unlock button (B-53)', () => {
  it('cancels a stuck prompt and asks again instead of ignoring the tap', () => {
    const src = readFileSync(join(__dirname, '..', 'LockedView.tsx'), 'utf8');
    expect(src).toContain('onPress={onUnlockPress}');
    expect(src).toMatch(/cancelAuthenticate\(\)[\s\S]*resetLockSuspended\(\)/);
  });
});
