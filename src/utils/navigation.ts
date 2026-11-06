export const APP_TITLE = 'CogHealth EHR';

const TITLE_SEPARATOR = ' – ';

export function formatDocumentTitle(...parts: Array<string | null | undefined>): string {
  const segments = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return [...segments, APP_TITLE].join(TITLE_SEPARATOR);
}

export function isNavItemActive(itemPath: string, pathname: string): boolean {
  if (itemPath === '/') {
    return pathname === '/';
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
