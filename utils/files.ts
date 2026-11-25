// The web preview downloads files instead of sharing them.
// Android and iOS use files.native.ts.

export async function shareFile(name: string, text: string, mimeType: string, _dialogTitle?: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickTextFile(): Promise<string | null> {
  return null;
}

/** The web preview restores by pasting a backup instead. */
export const canPickFiles = false;
