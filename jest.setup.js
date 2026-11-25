/* global jest */
// AsyncStorage has no native module under Jest; use the package's own mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The keyboard library has no native module under Jest either; use its own mock.
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));

// Safe-area insets come from a native module; the package's mock reports zero insets.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// expo-sqlite's key-value store needs the native database; keep it in memory.
jest.mock('expo-sqlite/kv-store', () => {
  const values = new Map();
  class SQLiteStorage {
    async getItemAsync(key) {
      return values.has(key) ? values.get(key) : null;
    }
    async setItemAsync(key, value) {
      values.set(key, value);
    }
    async removeItemAsync(key) {
      return values.delete(key);
    }
  }
  return { __esModule: true, SQLiteStorage, default: new SQLiteStorage(), __values: values };
});
