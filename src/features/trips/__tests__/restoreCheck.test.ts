import { restoreIfNotRecording, type RestoreDeps } from '../restoreCheck';

function deps(over: Partial<RestoreDeps> = {}) {
  const log = jest.fn();
  const restore = jest.fn(async () => {});
  const d: RestoreDeps = { tripRunning: () => true, recording: async () => false, restore, log, ...over };
  return { d, log: d.log as jest.Mock, restore: d.restore as jest.Mock };
}

describe('B-144: every native wake-up puts a running Trip’s GPS back', () => {
  it.each(['activity', 'bluetooth', 'wake', 'sample', 'boot'])('%s: running Trip, GPS not registered → restore + restore_ok', async (reason) => {
    const { d, log, restore } = deps();
    expect(await restoreIfNotRecording(reason, d)).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('restore_ok', { reason });
  });

  it('GPS still registered → nothing (registering again would restart the service)', async () => {
    const { d, log, restore } = deps({ recording: async () => true });
    expect(await restoreIfNotRecording('activity', d)).toBe(false);
    expect(restore).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('no running Trip (none, paused or ended) → nothing', async () => {
    const { d, restore } = deps({ tripRunning: () => false });
    expect(await restoreIfNotRecording('wake', d)).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  it('the check itself fails → left alone', async () => {
    const { d, restore } = deps({ recording: () => Promise.reject(new Error('x')) });
    expect(await restoreIfNotRecording('wake', d)).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  it('B-129 restart: always registers again (the registration outlives the process)', async () => {
    const { d, restore, log } = deps({ recording: async () => true });
    expect(await restoreIfNotRecording('restart', d)).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('restore_ok', { reason: 'restart' });
  });

  it('restore fails → restore_failed with the error, never throws', async () => {
    const { d, log } = deps({ restore: async () => Promise.reject(new Error('fgs not allowed')) });
    expect(await restoreIfNotRecording('bluetooth', d)).toBe(false);
    expect(log).toHaveBeenCalledWith('restore_failed', { reason: 'bluetooth', error: 'fgs not allowed' });
  });
});
