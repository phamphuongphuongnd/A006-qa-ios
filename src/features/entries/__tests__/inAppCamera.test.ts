import { finishInAppCamera, inAppCameraWaiting, openInAppCamera, pickPictureSize } from '../inAppCamera';

const mockPush = jest.fn();
jest.mock('@/services/router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
const push = mockPush;

describe('in-app receipt camera (QA-100 B-106)', () => {
  beforeEach(() => push.mockClear());

  it('resolves with the photo, or null when closed', async () => {
    const a = openInAppCamera();
    expect(push).toHaveBeenCalledTimes(1);
    expect(inAppCameraWaiting()).toBe(true);
    finishInAppCamera('file:///cache/Camera/1.jpg');
    await expect(a).resolves.toBe('file:///cache/Camera/1.jpg');
    expect(inAppCameraWaiting()).toBe(false);
    const b = openInAppCamera();
    finishInAppCamera(null);
    await expect(b).resolves.toBeNull();
  });

  it('a double tap opens one screen; the older caller gets null', async () => {
    const a = openInAppCamera();
    const b = openInAppCamera();
    expect(push).toHaveBeenCalledTimes(1);
    finishInAppCamera('file:///x.jpg');
    await expect(a).resolves.toBeNull();
    await expect(b).resolves.toBe('file:///x.jpg');
  });

  it('asks for the smallest picture size that still has a 2400 px long side', () => {
    expect(pickPictureSize(['8160x6120', '4000x3000', '3264x2448', '2560x1920', '1920x1080'])).toBe('2560x1920');
    expect(pickPictureSize(['1600x1200', '1280x720'])).toBe('1600x1200');
    expect(pickPictureSize(['junk'])).toBeUndefined();
  });
});
