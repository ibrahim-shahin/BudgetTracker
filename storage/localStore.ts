import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

// The web preview keeps the data in the browser's storage.
// Android and iOS use localStore.native.ts.
export const localStore: StateStorage = {
  getItem: name => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: name => AsyncStorage.removeItem(name),
};
