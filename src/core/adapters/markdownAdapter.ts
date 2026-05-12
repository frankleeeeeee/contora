/** CRLF → LF, strip NULs (some transports / logs choke on `\0`). */
export function normalizeExportMarkdown(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\0/g, '');
}

/** Raw structured prompt (already markdown sections). */
export function adaptMarkdown(promptText: string): string {
  return normalizeExportMarkdown(promptText);
}
