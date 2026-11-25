// Shared expo-router mock for screen tests:
//   jest.mock('expo-router', () => require('@/test-utils/router').routerMock);
export const mockParams: { current: Record<string, string | undefined> } = { current: {} };

export const routerMock = {
  router: {
    push: jest.fn(),
    back: jest.fn(),
    canDismiss: jest.fn(() => false),
    dismissAll: jest.fn(),
  },
  useLocalSearchParams: () => mockParams.current,
};

export function resetRouter(params: Record<string, string | undefined> = {}) {
  mockParams.current = params;
  routerMock.router.push.mockClear();
  routerMock.router.back.mockClear();
  routerMock.router.dismissAll.mockClear();
}
