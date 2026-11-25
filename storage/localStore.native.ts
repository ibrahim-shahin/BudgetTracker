import { SQLiteStorage } from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

// On the phone the data lives in an SQLite database in the app's private
// storage, which other apps can't read. AsyncStorage would keep all of it in
// one database row that Android reads through a 2 MB window, which a few
// years of expenses could outgrow.
export const DATABASE_NAME = 'budget-tracker.db';

let storage: SQLiteStorage | null = null;

function database(): SQLiteStorage {
  if (!storage) storage = new SQLiteStorage(DATABASE_NAME);
  return storage;
}

export const localStore: StateStorage = {
  getItem: name => database().getItemAsync(name),
  setItem: (name, value) => database().setItemAsync(name, value),
  removeItem: async name => {
    await database().removeItemAsync(name);
  },
};
