import * as fs from 'fs';
import * as path from 'path';
import { APP_TITLE, formatDocumentTitle, isNavItemActive } from '../src/utils/navigation';

describe('formatDocumentTitle', () => {
  it('returns the app name when no page parts are given', () => {
    expect(formatDocumentTitle()).toBe(APP_TITLE);
  });

  it('prefixes page parts, most specific first', () => {
    expect(formatDocumentTitle('Patient Chart', 'Smith, John')).toBe(
      'Patient Chart – Smith, John – CogHealth EHR'
    );
  });

  it('skips empty, null and undefined parts', () => {
    expect(formatDocumentTitle('Patient Chart', undefined, null, '  ')).toBe(
      'Patient Chart – CogHealth EHR'
    );
  });
});

describe('isNavItemActive', () => {
  it('matches the dashboard only on the root path', () => {
    expect(isNavItemActive('/', '/')).toBe(true);
    expect(isNavItemActive('/', '/patients')).toBe(false);
  });

  it('matches exact and nested paths', () => {
    expect(isNavItemActive('/patients', '/patients')).toBe(true);
    expect(isNavItemActive('/patients', '/patients/3')).toBe(true);
    expect(isNavItemActive('/labs', '/labs')).toBe(true);
  });

  it('does not match sibling paths that share a prefix', () => {
    expect(isNavItemActive('/patients', '/patients-archive')).toBe(false);
    expect(isNavItemActive('/labs', '/patients/3')).toBe(false);
  });
});

describe('route titles', () => {
  const srcDir = path.join(__dirname, '..', 'src');
  const app = fs.readFileSync(path.join(srcDir, 'App.tsx'), 'utf8');
  const routedPages = Array.from(app.matchAll(/<Route\s+path="[^"]+"\s+element={<(\w+)\s*\/>}/g)).map(
    (match) => match[1]
  );

  it('finds the routed pages', () => {
    expect(routedPages.length).toBeGreaterThan(0);
  });

  it.each(routedPages)('%s sets a per-route document title', (page) => {
    const source = fs.readFileSync(path.join(srcDir, 'pages', `${page}.tsx`), 'utf8');
    expect(source).toMatch(/useDocumentTitle\(\s*'[^']+'/);
  });
});
