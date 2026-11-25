// When the saved data can't be read, the app must stop instead of running
// with an empty budget that would overwrite it on the next save.
import { localStore } from '@/storage/localStore';
import { useBudgetStore } from '@/store/budgetStore';
import { useViewStore } from '@/store/viewStore';

// jest.mock calls are hoisted above the imports.
jest.mock('@/storage/localStore', () => ({
  localStore: {
    getItem: jest.fn(async () => {
      throw new Error('database is locked');
    }),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

it('reports a load error and writes nothing', async () => {
  await useBudgetStore.persist.rehydrate();
  expect(useViewStore.getState().loadError).toBe('database is locked');
  expect(useBudgetStore.persist.hasHydrated()).toBe(false);
  expect(localStore.setItem).not.toHaveBeenCalled();
});
