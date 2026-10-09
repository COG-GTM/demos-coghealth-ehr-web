import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../src/pages/DashboardPage';

jest.mock('../src/services/patientService', () => ({
  patientService: { search: jest.fn(() => new Promise(() => {})) },
}));

const renderDashboard = () =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(DashboardPage)));

const stripAriaHidden = (html: string) => {
  let out = html;
  let prev;
  do {
    prev = out;
    out = out.replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>(?:(?!<\1[\s>])[\s\S])*?<\/\1>/g, '');
    out = out.replace(/<\w+[^>]*aria-hidden="true"[^>]*\/>/g, '');
  } while (out !== prev);
  return out;
};

const accessibleName = (buttonHtml: string) => {
  const open = buttonHtml.match(/^<button[^>]*>/)![0];
  const label = open.match(/aria-label="([^"]*)"/);
  if (label) return label[1].trim();
  const text = stripAriaHidden(buttonHtml.slice(open.length))
    .replace(/<[^>]+>/g, '')
    .trim();
  if (text) return text;
  const title = open.match(/title="([^"]*)"/);
  return title ? title[1].trim() : '';
};

const findButton = (html: string, attr: string) => {
  const match = html.match(new RegExp(`<button[^>]*${attr}[^>]*>[\\s\\S]*?</button>`));
  if (!match) throw new Error(`button with ${attr} not found`);
  return match[0];
};

describe('DashboardPage icon-only buttons', () => {
  const html = renderDashboard();

  test('every dashboard button exposes a non-glyph accessible name', () => {
    const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(0);
    const unnamed = buttons.filter(b => !/[A-Za-z]{2}/.test(accessibleName(b)));
    expect(unnamed).toEqual([]);
  });

  test('notification bell is named by purpose, not only by its badge count', () => {
    const bell = findButton(html, 'aria-label="Notifications');
    expect(accessibleName(bell)).toBe('Notifications, 3 unread');
    expect(bell).toMatch(/<span aria-hidden="true"[^>]*>3<\/span>/);
  });

  test('inbox refresh button is labelled and its icon hidden', () => {
    const refresh = findButton(html, 'aria-label="Refresh inbox"');
    expect(accessibleName(refresh)).toBe('Refresh inbox');
    expect(refresh).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  test('sort direction toggle announces its action instead of an arrow glyph', () => {
    const sort = findButton(html, 'aria-label="Sort descending"');
    expect(accessibleName(sort)).toBe('Sort descending');
    expect(sort).toMatch(/<span aria-hidden="true">↑<\/span>/);
  });
});
