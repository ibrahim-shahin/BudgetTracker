import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';

import { pickTextFile, shareFile } from '../files';

jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(async () => undefined) }));
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  class MockFile {
    uri: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    create() {
      files.set(this.uri, '');
    }
    write(text: string) {
      files.set(this.uri, text);
    }
    get exists() {
      return files.has(this.uri);
    }
    delete() {
      files.delete(this.uri);
    }
    static pickFileAsync = jest.fn();
  }
  return { File: MockFile, Paths: { cache: { uri: 'file:///cache' } }, __files: files };
});

const files = (jest.requireMock('expo-file-system') as { __files: Map<string, string> }).__files;

it('shares a file from the private cache and removes it afterwards', async () => {
  jest.mocked(Sharing.shareAsync).mockImplementationOnce(async uri => {
    expect(files.get(uri)).toBe('{"a":1}');
  });
  await shareFile('backup.json', '{"a":1}', 'application/json', 'Save');
  expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/backup.json', expect.objectContaining({ mimeType: 'application/json' }));
  expect(files.size).toBe(0);
});

it('removes the file even when sharing fails', async () => {
  jest.mocked(Sharing.shareAsync).mockRejectedValueOnce(new Error('cancelled'));
  await expect(shareFile('x.csv', 'a,b', 'text/csv', 'Export')).rejects.toThrow('cancelled');
  expect(files.size).toBe(0);
});

it('reads a picked file, refuses huge ones and handles cancelling', async () => {
  const pick = jest.mocked(File.pickFileAsync);
  pick.mockResolvedValueOnce({ canceled: true } as never);
  await expect(pickTextFile()).resolves.toBeNull();

  pick.mockResolvedValueOnce({ canceled: false, result: { size: 10, text: async () => '{"app":"budget-tracker"}' } } as never);
  await expect(pickTextFile()).resolves.toBe('{"app":"budget-tracker"}');

  pick.mockResolvedValueOnce({ canceled: false, result: { size: 50_000_000, text: async () => '' } } as never);
  await expect(pickTextFile()).rejects.toThrow('too large');
});
