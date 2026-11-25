import { KeyboardController } from 'react-native-keyboard-controller';

import { KEYBOARD_HIDE_WAIT_MS, closeAfterKeyboard } from '../keyboard';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('closes once the keyboard has gone, and only once', async () => {
  const close = jest.fn();
  closeAfterKeyboard(close);
  expect(close).not.toHaveBeenCalled();
  await Promise.resolve();
  expect(close).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(KEYBOARD_HIDE_WAIT_MS);
  expect(close).toHaveBeenCalledTimes(1);
});

it('closes anyway when the keyboard never reports back', () => {
  jest.mocked(KeyboardController.dismiss).mockReturnValueOnce(new Promise(() => undefined));
  const close = jest.fn();
  closeAfterKeyboard(close);
  jest.advanceTimersByTime(KEYBOARD_HIDE_WAIT_MS - 1);
  expect(close).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(close).toHaveBeenCalledTimes(1);
});
