import { readFileSync } from 'fs';
import { join } from 'path';

import { redirectSystemPath } from '@/app/+native-intent';

import {
  drainTripToggles,
  isTripTogglePath,
  onTripToggleRequest,
  pendingTripToggles,
  requestTripToggle,
  resetTripToggles,
  type ToggleEnd,
} from '../toggleQueue';

// B-53 part 2 (A13, 17/11): App lock on → toggle → fingerprint prompt up → toggle again 1.5 s later: the second link
// reached `/trip/toggle` while the first was still starting GPS, expo-router treated it as "already there" and the
// trip kept running. Links are now counted one by one and run in order.
describe('trip toggle queue (B-53 part 2)', () => {
  afterEach(() => resetTripToggles());

  it('recognises the toggle link in the forms expo-router passes', () => {
    expect(isTripTogglePath('sundaysort://trip/toggle')).toBe(true);
    expect(isTripTogglePath('sundaysort:///trip/toggle')).toBe(true);
    expect(isTripTogglePath('/trip/toggle')).toBe(true);
    expect(isTripTogglePath('/trip/toggle?src=nfc')).toBe(true);
    expect(isTripTogglePath('sundaysort://trip/toggle/')).toBe(true);
    expect(isTripTogglePath('sundaysort://trip/start')).toBe(false);
    expect(isTripTogglePath('sundaysort://trip/toggle-x')).toBe(false);
    expect(isTripTogglePath('sundaysort://')).toBe(false);
    expect(isTripTogglePath(null)).toBe(false);
  });

  it('+native-intent counts one toggle per link and keeps the path', () => {
    expect(redirectSystemPath({ path: 'sundaysort://trip/toggle', initial: true })).toBe('sundaysort://trip/toggle');
    expect(redirectSystemPath({ path: 'sundaysort://trip/toggle', initial: false })).toBe('sundaysort://trip/toggle');
    expect(redirectSystemPath({ path: 'sundaysort://capture?type=expense', initial: false })).toBe(
      'sundaysort://capture?type=expense',
    );
    expect(pendingTripToggles()).toBe(2);
  });

  it('a second tap that arrives while the first is still running is run after it (start, then end)', async () => {
    const log: string[] = [];
    let release!: () => void;
    let running = false;
    const run = jest.fn(async (): Promise<ToggleEnd> => {
      const n = run.mock.calls.length;
      log.push(`start ${n}`);
      if (n === 1) {
        running = true;
        await new Promise<void>((r) => (release = r));
        running = false;
      }
      log.push(`done ${n}`);
      return 'home';
    });

    requestTripToggle();
    const first = drainTripToggles(run);
    await Promise.resolve();
    expect(running).toBe(true);

    // Second link while the first toggle is still starting GPS.
    requestTripToggle();
    const second = drainTripToggles(run);
    expect(second).toBe(first);

    release();
    await expect(first).resolves.toBe('home');
    expect(run).toHaveBeenCalledTimes(2);
    expect(log).toEqual(['start 1', 'done 1', 'start 2', 'done 2']);
    expect(pendingTripToggles()).toBe(0);
  });

  it('nothing pending → resolves home without toggling (screen reached again after the queue already ran)', async () => {
    const run = jest.fn(async (): Promise<ToggleEnd> => 'home');
    await expect(drainTripToggles(run)).resolves.toBe('home');
    expect(run).not.toHaveBeenCalled();
  });

  it('a toggle that needs setup stops the queue and says so', async () => {
    requestTripToggle();
    requestTripToggle();
    const run = jest.fn(async (): Promise<ToggleEnd> => 'setup');
    await expect(drainTripToggles(run)).resolves.toBe('setup');
    expect(run).toHaveBeenCalledTimes(1);
    expect(pendingTripToggles()).toBe(0);
  });

  it('a toggle that throws does not stop the next one', async () => {
    requestTripToggle();
    requestTripToggle();
    let n = 0;
    const run = jest.fn(async (): Promise<ToggleEnd> => {
      n++;
      if (n === 1) throw new Error('gps');
      return 'home';
    });
    await expect(drainTripToggles(run)).resolves.toBe('home');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('tells the open toggle screen about a link that arrives after its queue ran dry', async () => {
    const seen = jest.fn();
    const unsub = onTripToggleRequest(seen);
    requestTripToggle();
    expect(seen).toHaveBeenCalledTimes(1);
    unsub();
    requestTripToggle();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it('the toggle screen runs the queue instead of toggling once per mount', () => {
    const src = readFileSync(join(__dirname, '../../../app/trip/toggle.tsx'), 'utf8');
    expect(src).toContain('drainTripToggles(');
    expect(src).toContain('onTripToggleRequest(');
  });
});
