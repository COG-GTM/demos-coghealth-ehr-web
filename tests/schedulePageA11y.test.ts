import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import SchedulePage from '../src/pages/SchedulePage';

const render = () =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SchedulePage)));

describe('SchedulePage appointment selection accessibility', () => {
  const html = render();
  const selectMatches = [...html.matchAll(/(<button[^>]*class="ehr-row-select[^"]*"[^>]*>)([^<]*)<\/button>/g)];
  const selectButtons = selectMatches.map(m => m[1]);

  test('every appointment row has a focusable button that selects it', () => {
    const rows = html.match(/<tr[^>]*class="cursor-pointer/g) ?? [];
    expect(rows.length).toBeGreaterThan(0);
    expect(selectButtons).toHaveLength(rows.length);
    for (const button of selectButtons) {
      expect(button).toContain('type="button"');
      expect(button).toMatch(/aria-label="[^"]+: show appointment details"/);
      expect(button).toContain('aria-controls="schedule-appointment-detail"');
    }
  });

  test('exactly one appointment is exposed as selected', () => {
    expect(selectButtons.filter(b => b.includes('aria-pressed="true"'))).toHaveLength(1);
    expect(selectButtons.filter(b => b.includes('aria-pressed="false"'))).toHaveLength(selectButtons.length - 1);
    expect(html.match(/<tr[^>]*aria-current="true"/g)).toHaveLength(1);
  });

  test('detail panel is a labelled region that names the selected patient', () => {
    const patientName = selectMatches.find(m => m[1].includes('aria-pressed="true"'))![2];
    expect(html).toContain('<section id="schedule-appointment-detail" aria-labelledby="schedule-appointment-detail-heading"');
    expect(html).toMatch(new RegExp(`<h2 id="schedule-appointment-detail-heading"><span class="sr-only">Appointment details: </span>${patientName}</h2>`));
    expect(html).toMatch(new RegExp(`role="status" aria-live="polite">Showing appointment details for ${patientName}, `));
  });
});
