import { TextExport } from '../core/export/form-document-export';

export function downloadTextFile(file: TextExport): void {
  const blob = new Blob([file.content], { type: `${file.mediaType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readTextFile(file: File): Promise<string> {
  return file.text();
}
