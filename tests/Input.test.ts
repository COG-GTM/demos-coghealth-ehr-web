import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Input from '../src/components/ui/Input';

const render = (props: Parameters<typeof Input>[0]) => renderToStaticMarkup(createElement(Input, props));

const attr = (html: string, tag: string, name: string): string | undefined => {
  const element = html.match(new RegExp(`<${tag}[^>]*>`))?.[0] ?? '';
  return element.match(new RegExp(`${name}="([^"]*)"`))?.[1];
};

describe('Input accessibility', () => {
  it('links the error message to the input and marks it invalid', () => {
    const html = render({ label: 'Patient Name', error: 'Name is required' });
    const inputId = attr(html, 'input', 'id');

    expect(inputId).toBeTruthy();
    expect(attr(html, 'label', 'for')).toBe(inputId);
    expect(attr(html, 'input', 'aria-invalid')).toBe('true');
    expect(attr(html, 'input', 'aria-describedby')).toBe(`${inputId}-error`);
    expect(html).toContain(`<p id="${inputId}-error" role="alert"`);
  });

  it('links helper text when there is no error', () => {
    const html = render({ id: 'mrn', label: 'MRN', helperText: '7 digits' });

    expect(attr(html, 'input', 'aria-invalid')).toBeUndefined();
    expect(attr(html, 'input', 'aria-describedby')).toBe('mrn-helper');
    expect(html).toContain('<p id="mrn-helper"');
  });

  it('prefers the error over helper text', () => {
    const html = render({ id: 'dob', helperText: 'MM/DD/YYYY', error: 'Invalid date' });

    expect(attr(html, 'input', 'aria-describedby')).toBe('dob-error');
    expect(html).not.toContain('dob-helper');
  });

  it('always renders an id even without id or label', () => {
    const html = render({ placeholder: 'Search' });

    expect(attr(html, 'input', 'id')).toBeTruthy();
    expect(attr(html, 'input', 'aria-describedby')).toBeUndefined();
  });

  it('keeps caller-supplied aria-describedby', () => {
    const html = render({ id: 'q', 'aria-describedby': 'search-hint', error: 'Too short' });

    expect(attr(html, 'input', 'aria-describedby')).toBe('search-hint q-error');
  });
});
