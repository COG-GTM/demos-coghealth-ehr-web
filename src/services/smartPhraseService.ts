export interface NotePatientContext {
  id: number;
  name: string;
  firstName: string;
  mrn: string;
  dob: string;
  age: number;
  sex: 'M' | 'F';
  room?: string;
  allergies: string[];
  problems: string[];
  medications: string[];
  vitals: { bp: string; hr: number; temp: number; rr: number; spo2: number; weight?: number };
  labs: string[];
}

export interface SmartPhrase {
  key: string;
  description: string;
  category: 'Note' | 'History' | 'Exam' | 'Plan' | 'Data';
  template: string;
}

export const PLACEHOLDER = '***';

export const smartPhrases: SmartPhrase[] = [
  {
    key: 'soap',
    description: 'Full SOAP progress note skeleton',
    category: 'Note',
    template:
`PROGRESS NOTE - @DATE@
Patient: @NAME@ | @AGE@ y/o @SEX@ | MRN @MRN@

SUBJECTIVE:
@FIRSTNAME@ is a @AGE@ y/o @SEX@ seen today for ***. Patient reports ***.

OBJECTIVE:
Vitals: @VITALS@
Exam: ***

ASSESSMENT:
***

PLAN:
***

@SIGNATURE@`,
  },
  {
    key: 'hpi',
    description: 'History of present illness',
    category: 'History',
    template:
`HISTORY OF PRESENT ILLNESS:
@NAME@ is a @AGE@ y/o @SEX@ with a history of @PROBLEMS@ who presents with ***. Symptoms began *** and are described as ***. Associated symptoms include ***. Denies ***.`,
  },
  {
    key: 'ros',
    description: 'Review of systems (negative template)',
    category: 'History',
    template:
`REVIEW OF SYSTEMS:
Constitutional: Negative for fever, chills, weight loss.
Cardiovascular: Negative for chest pain, palpitations, edema.
Respiratory: Negative for cough, dyspnea, wheezing.
GI: Negative for nausea, vomiting, abdominal pain.
GU: Negative for dysuria, hematuria.
Neuro: Negative for headache, dizziness, focal weakness.
All other systems reviewed and negative except as noted in HPI: ***`,
  },
  {
    key: 'pe',
    description: 'Physical exam (normal template)',
    category: 'Exam',
    template:
`PHYSICAL EXAM:
Vitals: @VITALS@
General: Alert, oriented, in no acute distress.
HEENT: Normocephalic, atraumatic. PERRL. Oropharynx clear.
Neck: Supple, no lymphadenopathy, no JVD.
CV: Regular rate and rhythm, no murmurs, rubs, or gallops.
Lungs: Clear to auscultation bilaterally, no wheezes or crackles.
Abdomen: Soft, non-tender, non-distended, normal bowel sounds.
Extremities: No edema, cyanosis, or clubbing.
Neuro: CN II-XII intact, strength 5/5 throughout.
Skin: Warm, dry, intact. ***`,
  },
  {
    key: 'vitals',
    description: 'Most recent vital signs',
    category: 'Data',
    template: `Vitals (most recent): @VITALS@`,
  },
  {
    key: 'labs',
    description: 'Most recent lab results',
    category: 'Data',
    template:
`RECENT LABS:
@LABS@`,
  },
  {
    key: 'meds',
    description: 'Current medication list',
    category: 'Data',
    template:
`CURRENT MEDICATIONS:
@MEDS@`,
  },
  {
    key: 'allergies',
    description: 'Allergy list',
    category: 'Data',
    template: `ALLERGIES: @ALLERGIES@`,
  },
  {
    key: 'problems',
    description: 'Active problem list',
    category: 'Data',
    template:
`ACTIVE PROBLEMS:
@PROBLEMLIST@`,
  },
  {
    key: 'ap',
    description: 'Assessment & plan by problem',
    category: 'Plan',
    template:
`ASSESSMENT & PLAN:
1. *** - ***
2. *** - ***
Disposition: ***`,
  },
  {
    key: 'dc',
    description: 'Discharge summary skeleton',
    category: 'Note',
    template:
`DISCHARGE SUMMARY - @DATE@
Patient: @NAME@ | @AGE@ y/o @SEX@ | MRN @MRN@

ADMISSION DIAGNOSIS: ***
DISCHARGE DIAGNOSIS: ***

HOSPITAL COURSE:
***

DISCHARGE MEDICATIONS:
@MEDS@

ALLERGIES: @ALLERGIES@

DISCHARGE CONDITION: ***
DISPOSITION: ***
FOLLOW-UP: ***

@SIGNATURE@`,
  },
  {
    key: 'fu',
    description: 'Follow-up instructions',
    category: 'Plan',
    template:
`FOLLOW-UP:
Return to clinic in ***. Call or return sooner for ***. Patient verbalized understanding of the plan and all questions were answered.`,
  },
  {
    key: 'sig',
    description: 'Provider signature block',
    category: 'Note',
    template: `@SIGNATURE@`,
  },
];

export interface ExpansionContext {
  patient: NotePatientContext;
  author: string;
  now?: Date;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const formatDateTime = (d: Date) =>
  `${formatDate(d)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

function formatVitals(v: NotePatientContext['vitals']): string {
  const parts = [`BP ${v.bp}`, `HR ${v.hr}`, `Temp ${v.temp}°F`, `RR ${v.rr}`, `SpO2 ${v.spo2}%`];
  if (v.weight) parts.push(`Wt ${v.weight} kg`);
  return parts.join(', ');
}

const listOrNone = (items: string[], none = 'None documented') =>
  items.length ? items.map(i => `- ${i}`).join('\n') : none;

export function expandTokens(template: string, ctx: ExpansionContext): string {
  const { patient: p, author } = ctx;
  const now = ctx.now ?? new Date();
  const tokens: Record<string, string> = {
    NAME: p.name,
    FIRSTNAME: p.firstName,
    MRN: p.mrn,
    DOB: p.dob,
    AGE: String(p.age),
    SEX: p.sex === 'M' ? 'male' : 'female',
    DATE: formatDate(now),
    DATETIME: formatDateTime(now),
    ROOM: p.room ?? 'N/A',
    VITALS: formatVitals(p.vitals),
    LABS: listOrNone(p.labs, 'No recent labs'),
    MEDS: listOrNone(p.medications, 'No active medications'),
    ALLERGIES: p.allergies.length ? p.allergies.join(', ') : 'NKDA',
    PROBLEMS: p.problems.length ? p.problems.join(', ') : 'no significant past medical history',
    PROBLEMLIST: listOrNone(p.problems, 'No active problems'),
    AUTHOR: author,
    SIGNATURE: `${author}\n${formatDateTime(now)}`,
  };
  return template.replace(/@([A-Z]+)@/g, (match, key: string) => tokens[key] ?? match);
}

export function findSmartPhrase(key: string): SmartPhrase | undefined {
  return smartPhrases.find(p => p.key === key.toLowerCase());
}

export function expandSmartPhrase(key: string, ctx: ExpansionContext): string | null {
  const phrase = findSmartPhrase(key);
  return phrase ? expandTokens(phrase.template, ctx) : null;
}

/** Returns the dot-phrase fragment (without the dot) immediately before the caret, or null. */
export function getDotPhraseAtCaret(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|[\s(])\.([a-z0-9]*)$/i.exec(before);
  if (!match) return null;
  const start = caret - match[2].length - 1;
  return { start, query: match[2] };
}

export function matchSmartPhrases(query: string): SmartPhrase[] {
  const q = query.toLowerCase();
  return smartPhrases.filter(p => p.key.startsWith(q));
}

export function countPlaceholders(text: string): number {
  return text.split(PLACEHOLDER).length - 1;
}

/** Position of the next *** at or after `from`, wrapping around to the start. */
export function findNextPlaceholder(text: string, from: number): { start: number; end: number } | null {
  let idx = text.indexOf(PLACEHOLDER, from);
  if (idx === -1) idx = text.indexOf(PLACEHOLDER);
  if (idx === -1) return null;
  return { start: idx, end: idx + PLACEHOLDER.length };
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
