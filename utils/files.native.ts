import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { MAX_BACKUP_CHARS } from '@/utils/backup';

/**
 * Writes the text to a file in the app's private cache and opens the share
 * sheet, so it can be saved to Files or Drive or sent to a chat. Nothing is
 * sent anywhere unless the user picks a place.
 */
export async function shareFile(name: string, text: string, mimeType: string, dialogTitle: string): Promise<void> {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  try {
    await Sharing.shareAsync(file.uri, { dialogTitle, mimeType, UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'public.json' });
  } finally {
    // The copy is no longer needed once the share sheet has handed it over.
    if (file.exists) file.delete();
  }
}

/** Asks for a file and returns its text, or null when the user cancels. */
export async function pickTextFile(): Promise<string | null> {
  // Any file type: Drive and chat apps often save JSON without a JSON type.
  const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
  if (picked.canceled) return null;
  if (picked.result.size > MAX_BACKUP_CHARS) throw new Error('This file is too large to be a backup.');
  return picked.result.text();
}

export const canPickFiles = true;
