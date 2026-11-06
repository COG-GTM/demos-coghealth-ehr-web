import { useEffect } from 'react';
import { formatDocumentTitle } from '../utils/navigation';

export function useDocumentTitle(...parts: Array<string | null | undefined>): void {
  const title = formatDocumentTitle(...parts);
  useEffect(() => {
    document.title = title;
  }, [title]);
}
