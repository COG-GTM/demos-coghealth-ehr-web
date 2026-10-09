import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VitalsPage from '../src/pages/VitalsPage';

const markup = renderToStaticMarkup(createElement(VitalsPage));
const table = markup.slice(markup.indexOf('<table'), markup.indexOf('</table>') + '</table>'.length);
const thead = table.slice(table.indexOf('<thead'), table.indexOf('</thead>'));
const bodyRows = table
  .slice(table.indexOf('<tbody'), table.indexOf('</tbody>'))
  .split('<tr')
  .slice(1);

describe('VitalsPage flowsheet table semantics (WCAG 1.3.1)', () => {
  it('has an accessible caption naming the patient', () => {
    expect(table).toMatch(/^<table[^>]*><caption class="sr-only">[^<]*Vital signs flowsheet for Smith, John \(MRN001234\)/);
  });

  it('marks every header-row cell as a column header', () => {
    const headers = thead.match(/<th\b[^>]*>/g) ?? [];
    expect(headers.length).toBeGreaterThan(2);
    headers.forEach((th) => expect(th).toContain('scope="col"'));
    expect(thead).not.toContain('<td');
  });

  it('starts every body row with a row header', () => {
    const labels = bodyRows.map((row) => {
      const first = row.match(/^[^>]*>\s*<(th|td)\b([^>]*)>(.*?)<\/\1>/);
      expect(first).not.toBeNull();
      expect(first![1]).toBe('th');
      expect(first![2]).toContain('scope="row"');
      return first![3].replace(/<[^>]+>/g, ' ').trim();
    });
    expect(labels).toEqual(expect.arrayContaining([
      expect.stringContaining('Heart Rate'),
      expect.stringContaining('SpO2'),
      'Recorded By',
      'Location',
    ]));
    expect(labels).toHaveLength(10);
  });

  it('keeps only one row header per body row', () => {
    bodyRows.forEach((row) => expect(row.match(/<th\b/g)).toHaveLength(1));
  });
});
