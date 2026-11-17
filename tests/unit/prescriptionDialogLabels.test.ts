import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrescriptionDialog } from '../../src/components/ui/PrescriptionDialog';

const mockState: { selectedMed: unknown } = { selectedMed: null };

// The details panel only renders once a medication is picked; seed that state for SSR.
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: (initial: unknown) =>
      mockState.selectedMed && initial === null
        ? [mockState.selectedMed, () => undefined]
        : actual.useState(initial),
  };
});

const selectedMed = {
  name: 'Lisinopril',
  strengths: ['10mg', '20mg'],
  form: 'tablet',
  class: 'ACE Inhibitor',
};

function renderDialog(withSelectedMed: boolean): string {
  mockState.selectedMed = withSelectedMed ? selectedMed : null;
  try {
    return renderToStaticMarkup(
      React.createElement(PrescriptionDialog, {
        isOpen: true,
        onClose: () => undefined,
        onSubmit: () => undefined,
      }),
    );
  } finally {
    mockState.selectedMed = null;
  }
}

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

function controls(markup: string): string[] {
  return markup.match(/<(input|select|textarea)\b[^>]*>/g) ?? [];
}

function labelFor(markup: string, id: string): string | undefined {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<label[^>]*\\sfor="${escaped}"[^>]*>([^<]*)</label>`).exec(markup)?.[1];
}

function textById(markup: string, id: string): string | undefined {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<[a-z]+[^>]*\\sid="${escaped}"[^>]*>([^<]*)</`).exec(markup)?.[1];
}

function controlById(markup: string, id: string): string | undefined {
  return controls(markup).find((tag) => attr(tag, 'id') === id);
}

describe('PrescriptionDialog form labels', () => {
  it('gives the medication search field an accessible name', () => {
    const markup = renderDialog(false);
    const search = controls(markup).find((tag) => attr(tag, 'placeholder') === 'Search medications...');
    expect(search).toBeDefined();
    expect(attr(search!, 'aria-label')).toBe('Search medications');
  });

  it('associates every prescription detail label with its control', () => {
    const markup = renderDialog(true);
    const expected: Record<string, string> = {
      Strength: 'select',
      Quantity: 'input',
      'Sig (Directions)': 'select',
      Refills: 'select',
      Pharmacy: 'select',
    };

    const labels = [...markup.matchAll(/<label[^>]*\sfor="([^"]+)"[^>]*>([^<]*)<\/label>/g)];
    const byText = Object.fromEntries(labels.map(([, id, text]) => [text, id]));

    for (const [text, tagName] of Object.entries(expected)) {
      const id = byText[text];
      expect(id).toBeDefined();
      const control = controlById(markup, id);
      expect(control).toBeDefined();
      expect(control!.startsWith(`<${tagName}`)).toBe(true);
    }

    const ids = labels.map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('leaves no form control without an accessible name', () => {
    const markup = renderDialog(true);
    const unlabeled = controls(markup).filter((tag) => {
      if (attr(tag, 'aria-label') || attr(tag, 'aria-labelledby')) return false;
      const id = attr(tag, 'id');
      if (id && labelFor(markup, id)) return false;
      return !/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*$/.test(markup.slice(0, markup.indexOf(tag)));
    });
    expect(unlabeled).toEqual([]);

    const customSig = controls(markup).find((tag) => attr(tag, 'placeholder') === 'Or type custom directions...');
    expect(attr(customSig!, 'aria-label')).toBe('Custom directions');
  });

  it('exposes DAW as a named group instead of an orphaned label', () => {
    const markup = renderDialog(true);
    expect(markup).not.toMatch(/<label[^>]*>DAW<\/label>/);
    const group = /<div[^>]*role="group"[^>]*aria-labelledby="([^"]+)"[^>]*>/.exec(markup);
    expect(group).not.toBeNull();
    expect(textById(markup, group![1])).toBe('DAW');
    expect(markup).toMatch(/<label[^>]*><input[^>]*type="checkbox"[^>]*\/><span[^>]*>Dispense as Written<\/span><\/label>/);
  });
});
