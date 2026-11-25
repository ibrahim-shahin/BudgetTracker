import { Alert, Platform } from 'react-native';

import { confirm, notify } from '../confirm';

afterEach(() => jest.restoreAllMocks());

it('asks with a native dialog and answers with the chosen button', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1].onPress?.());
  await expect(confirm('Delete?', 'Sure?', 'Delete', true)).resolves.toBe(true);
  expect(alert.mock.calls[0][2]?.[1]).toMatchObject({ text: 'Delete', style: 'destructive' });

  alert.mockImplementation((_t, _m, buttons) => buttons?.[0].onPress?.());
  await expect(confirm('Delete?', 'Sure?', 'Delete')).resolves.toBe(false);

  alert.mockImplementation((_t, _m, _b, options) => options?.onDismiss?.());
  await expect(confirm('Delete?', 'Sure?', 'Delete')).resolves.toBe(false);
});

it("uses the browser's dialogs on the web preview, where Alert does nothing", async () => {
  const os = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  const browserConfirm = jest.fn(() => true);
  const browserAlert = jest.fn();
  Object.assign(globalThis, { confirm: browserConfirm, alert: browserAlert });
  try {
    await expect(confirm('Delete?', 'Sure?', 'Delete')).resolves.toBe(true);
    expect(browserConfirm).toHaveBeenCalledWith('Delete?\n\nSure?');
    notify('Done', 'Saved');
    expect(browserAlert).toHaveBeenCalledWith('Done\n\nSaved');
  } finally {
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  }
});
