import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import SchedulePage from '../src/pages/SchedulePage';

const render = () =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SchedulePage)));

describe('SchedulePage date navigation accessibility', () => {
  it.each(['Previous day', 'Next day'])('gives the "%s" icon button an accessible name', (label) => {
    const markup = render();
    const button = markup.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>(.*?)</button>`));
    expect(button).not.toBeNull();
    expect(button![1]).toMatch(/^<svg[^>]*aria-hidden="true"/);
  });
});
