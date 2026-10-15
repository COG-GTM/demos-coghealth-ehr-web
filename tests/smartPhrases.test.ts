import {
  expandSmartPhrase,
  expandTokens,
  getDotPhraseAtCaret,
  matchSmartPhrases,
  countPlaceholders,
  findNextPlaceholder,
  type NotePatientContext,
} from '../src/services/smartPhraseService';

const patient: NotePatientContext = {
  id: 1,
  name: 'Smith, John',
  firstName: 'John',
  mrn: 'MRN001234',
  dob: '03/15/1965',
  age: 58,
  sex: 'M',
  room: '412A',
  allergies: ['Penicillin (rash)'],
  problems: ['Hypertension', 'CKD stage 3'],
  medications: ['Lisinopril 20 mg PO daily'],
  vitals: { bp: '158/94', hr: 98, temp: 98.6, rr: 20, spo2: 94, weight: 82.5 },
  labs: ['Potassium 6.8 mEq/L (H)'],
};

const ctx = { patient, author: 'Sarah Anderson, MD', now: new Date('2024-01-18T14:05:00') };

describe('smartPhraseService', () => {
  test('expands patient tokens', () => {
    const out = expandTokens('@NAME@ (@AGE@ y/o @SEX@) MRN @MRN@ on @DATE@', ctx);
    expect(out).toBe('Smith, John (58 y/o male) MRN MRN001234 on 01/18/2024');
  });

  test('expands list tokens and vitals', () => {
    const out = expandTokens('@VITALS@\n@MEDS@\n@ALLERGIES@', ctx);
    expect(out).toContain('BP 158/94, HR 98, Temp 98.6°F, RR 20, SpO2 94%, Wt 82.5 kg');
    expect(out).toContain('- Lisinopril 20 mg PO daily');
    expect(out).toContain('Penicillin (rash)');
  });

  test('falls back to NKDA and leaves unknown tokens untouched', () => {
    const out = expandTokens('@ALLERGIES@ @UNKNOWN@', { ...ctx, patient: { ...patient, allergies: [] } });
    expect(out).toBe('NKDA @UNKNOWN@');
  });

  test('expands a dot-phrase by key and keeps *** placeholders', () => {
    const out = expandSmartPhrase('hpi', ctx);
    expect(out).not.toBeNull();
    expect(out).toContain('Smith, John is a 58 y/o male with a history of Hypertension, CKD stage 3');
    expect(countPlaceholders(out!)).toBeGreaterThan(0);
    expect(expandSmartPhrase('nope', ctx)).toBeNull();
  });

  test('detects a dot-phrase fragment at the caret', () => {
    const text = 'Plan today .hp';
    expect(getDotPhraseAtCaret(text, text.length)).toEqual({ start: 11, query: 'hp' });
    expect(getDotPhraseAtCaret('version 1.2', 11)).toBeNull();
    expect(getDotPhraseAtCaret('hello world', 5)).toBeNull();
  });

  test('matches phrases by prefix', () => {
    expect(matchSmartPhrases('').length).toBeGreaterThan(5);
    expect(matchSmartPhrases('p').map(p => p.key)).toEqual(['pe', 'problems']);
  });

  test('finds the next placeholder and wraps around', () => {
    const text = 'a *** b *** c';
    expect(findNextPlaceholder(text, 0)).toEqual({ start: 2, end: 5 });
    expect(findNextPlaceholder(text, 5)).toEqual({ start: 8, end: 11 });
    expect(findNextPlaceholder(text, 11)).toEqual({ start: 2, end: 5 });
    expect(findNextPlaceholder('none', 0)).toBeNull();
  });
});
