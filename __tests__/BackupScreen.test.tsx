import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import BackupScreen from '@/app/backup';
import { useBudgetStore } from '@/store/budgetStore';
import { budgetData, category, expense } from '@/test-utils/data';
import { setBudgetData } from '@/test-utils/store';
import { createBackup } from '@/utils/backup';
import { confirm, notify } from '@/utils/confirm';
import { pickTextFile, shareFile } from '@/utils/files';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);
jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true), notify: jest.fn() }));
jest.mock('@/utils/files', () => ({ shareFile: jest.fn(async () => undefined), pickTextFile: jest.fn(), canPickFiles: true }));
jest.mock('@/components/KeyboardAwareScrollViewCompat', () => ({
  KeyboardAwareScrollViewCompat: jest.requireActual('react-native').ScrollView,
}));

const state = () => useBudgetStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  // A queued answer from one test must never reach the next.
  jest.mocked(confirm).mockReset().mockResolvedValue(true);
  setBudgetData({
    categories: [category({ id: 'food', name: 'Food' })],
    expenses: [expense({ id: 'e1', categoryId: 'food', amount: 12345, merchant: '=HYPERLINK("http://evil","x")', notes: 'Bread, "fresh"' })],
  });
});

it('saves a backup file and remembers when', async () => {
  await render(<BackupScreen />);
  expect(screen.getByTestId('last-backup')).toHaveTextContent('No backup saved yet');
  await fireEvent.press(screen.getByTestId('save-backup'));
  await waitFor(() => expect(shareFile).toHaveBeenCalled());
  const [name, text, mime] = jest.mocked(shareFile).mock.calls[0];
  expect(name).toMatch(/^budget-tracker-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(mime).toBe('application/json');
  expect(JSON.parse(text)).toMatchObject({ app: 'budget-tracker', version: 2, currency: 'JOD', expenses: [{ id: 'e1', amount: 12345 }] });
  await waitFor(() => expect(state().lastBackupAt).not.toBeNull());
  expect(confirm).toHaveBeenCalledWith('Did you save the backup?', expect.any(String), 'Yes, saved');
});

it("doesn't record a backup that wasn't saved (regression: closing the share sheet counted as a backup)", async () => {
  jest.mocked(confirm).mockResolvedValueOnce(false);
  await render(<BackupScreen />);
  await fireEvent.press(screen.getByTestId('save-backup'));
  await waitFor(() => expect(confirm).toHaveBeenCalled());
  expect(state().lastBackupAt).toBeNull();
  expect(screen.getByTestId('last-backup')).toHaveTextContent('No backup saved yet');
});

it('exports a CSV that spreadsheets open safely (regression: formula injection and broken quoting)', async () => {
  await render(<BackupScreen />);
  await fireEvent.press(screen.getByTestId('export-csv'));
  await waitFor(() => expect(shareFile).toHaveBeenCalled());
  const [, csv, mime] = jest.mocked(shareFile).mock.calls[0];
  expect(mime).toBe('text/csv');
  expect(csv.split('\r\n')[1]).toBe(`2026-11-20,Food,12.345,JOD,"'=HYPERLINK(""http://evil"",""x"")","Bread, ""fresh""",`);
});

it('refuses a damaged backup and keeps the data (regression: any JSON with a category list replaced everything)', async () => {
  await render(<BackupScreen />);
  const bad = JSON.stringify({ ...createBackup(budgetData()), expenses: [expense({ amount: 'lots' as unknown as number })] });
  await fireEvent.changeText(screen.getByTestId('paste-input'), bad);
  await fireEvent.press(screen.getByTestId('restore-pasted'));
  await waitFor(() => expect(notify).toHaveBeenCalledWith("Can't restore this", 'Expense 1 has an amount that isn\'t valid.'));
  expect(confirm).not.toHaveBeenCalled();
  expect(state().expenses.map(e => e.id)).toEqual(['e1']);
});

it('restores a pasted backup after asking', async () => {
  await render(<BackupScreen />);
  const backup = createBackup(budgetData({ expenses: [expense({ id: 'n1' }), expense({ id: 'n2' })], periodStartDay: 25 }));
  await fireEvent.changeText(screen.getByTestId('paste-input'), JSON.stringify(backup));
  await fireEvent.press(screen.getByTestId('restore-pasted'));
  await waitFor(() => expect(state().expenses.map(e => e.id)).toEqual(['n1', 'n2']));
  expect(jest.mocked(confirm).mock.calls[0][1]).toMatch(/1 category and 2 expenses. They replace the 1 category and 1 expense on/);
  expect(state().periodStartDay).toBe(25);
});

it('restores from a file, and does nothing when picking is cancelled', async () => {
  jest.mocked(pickTextFile).mockResolvedValueOnce(null);
  await render(<BackupScreen />);
  await fireEvent.press(screen.getByTestId('restore-file'));
  await waitFor(() => expect(pickTextFile).toHaveBeenCalled());
  expect(confirm).not.toHaveBeenCalled();

  jest.mocked(pickTextFile).mockResolvedValueOnce(JSON.stringify(createBackup(budgetData({ expenses: [] }))));
  await fireEvent.press(screen.getByTestId('restore-file'));
  await waitFor(() => expect(state().expenses).toEqual([]));
});
