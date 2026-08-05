export type CdsSeverity = 'CONTRAINDICATED' | 'MAJOR' | 'MODERATE' | 'MINOR';
export type CdsAlertCategory = 'DRUG_DRUG' | 'DRUG_ALLERGY' | 'DUPLICATE_THERAPY';

export interface InteractionMedication {
  name: string;
  class?: string;
}

export interface CdsAlert {
  id: string;
  severity: CdsSeverity;
  category: CdsAlertCategory;
  title: string;
  conflictingAgents: string[];
  mechanism: string;
  management: string;
}

export interface ScreenPrescriptionInput {
  medication: InteractionMedication | string;
  activeMedications?: (InteractionMedication | string)[];
  allergies?: string[];
}

const severityRank: Record<CdsSeverity, number> = {
  CONTRAINDICATED: 4,
  MAJOR: 3,
  MODERATE: 2,
  MINOR: 1,
};

const drugClasses: Record<string, string> = {
  lisinopril: 'ace inhibitor',
  losartan: 'arb',
  metformin: 'antidiabetic',
  amlodipine: 'calcium channel blocker',
  metoprolol: 'beta blocker',
  'metoprolol succinate': 'beta blocker',
  atorvastatin: 'statin',
  omeprazole: 'ppi',
  levothyroxine: 'thyroid',
  sertraline: 'ssri',
  gabapentin: 'anticonvulsant',
  hydrochlorothiazide: 'diuretic',
  furosemide: 'loop diuretic',
  prednisone: 'corticosteroid',
  amoxicillin: 'penicillin antibiotic',
  azithromycin: 'macrolide antibiotic',
  aspirin: 'antiplatelet',
  bupropion: 'antidepressant',
  carvedilol: 'beta blocker',
};

interface InteractionRule {
  drugs?: string[];
  classes?: string[];
  severity: CdsSeverity;
  title: string;
  mechanism: string;
  management: string;
}

const interactionRules: InteractionRule[] = [
  { drugs: ['lisinopril', 'losartan'], severity: 'MAJOR', title: 'Dual RAAS blockade', mechanism: 'ACE inhibitor plus ARB produces excessive renin-angiotensin system blockade, increasing hyperkalemia and acute kidney injury risk.', management: 'Avoid routine combination; discontinue one agent or monitor potassium and renal function closely with specialist justification.' },
  { drugs: ['omeprazole', 'levothyroxine'], severity: 'MODERATE', title: 'Reduced levothyroxine absorption', mechanism: 'Proton-pump inhibition raises gastric pH and can reduce levothyroxine tablet dissolution and absorption.', management: 'Separate administration when practical and monitor TSH; adjust levothyroxine if thyroid control changes.' },
  { drugs: ['amlodipine', 'atorvastatin'], severity: 'MODERATE', title: 'Increased atorvastatin exposure', mechanism: 'Amlodipine inhibits CYP3A4-mediated atorvastatin clearance, increasing myopathy and rhabdomyolysis risk.', management: 'Use the lowest effective atorvastatin dose (generally limit to 20 mg daily) and monitor for muscle symptoms.' },
  { drugs: ['prednisone', 'metformin'], severity: 'MODERATE', title: 'Corticosteroid-induced hyperglycemia', mechanism: 'Prednisone increases hepatic glucose output and reduces insulin sensitivity, opposing metformin glycemic control.', management: 'Increase glucose monitoring and adjust diabetes therapy temporarily or during steroid taper.' },
  { drugs: ['lisinopril', 'furosemide'], severity: 'MODERATE', title: 'Hypotension and renal perfusion risk', mechanism: 'ACE inhibition combined with loop diuresis can cause excessive volume-related hypotension and reduced renal perfusion.', management: 'Assess volume status and blood pressure; monitor creatinine and electrolytes after initiation or dose changes.' },
  { drugs: ['losartan', 'furosemide'], severity: 'MODERATE', title: 'Hypotension and renal perfusion risk', mechanism: 'ARB therapy combined with loop diuresis can cause excessive volume-related hypotension and reduced renal perfusion.', management: 'Assess volume status and blood pressure; monitor creatinine and electrolytes after initiation or dose changes.' },
  { drugs: ['metoprolol', 'amlodipine'], severity: 'MINOR', title: 'Additive cardiovascular effects', mechanism: 'Beta blockade with calcium-channel blockade may additively lower blood pressure and heart rate.', management: 'Monitor blood pressure and pulse; counsel about dizziness, syncope, or symptomatic bradycardia.' },
  { drugs: ['sertraline', 'azithromycin'], severity: 'MODERATE', title: 'Additive QT prolongation', mechanism: 'Both agents can prolong cardiac repolarization, increasing the risk of QT prolongation and torsades de pointes.', management: 'Prefer an alternative when risk factors exist; review QT-prolonging drugs and consider ECG/electrolyte monitoring.' },
  { classes: ['ace inhibitor', 'diuretic'], severity: 'MINOR', title: 'Additive blood-pressure lowering', mechanism: 'ACE inhibition and diuresis can additively lower blood pressure, particularly during volume depletion.', management: 'Monitor blood pressure, renal function, and electrolytes during therapy changes.' },
  { classes: ['ssri', 'antiplatelet'], severity: 'MODERATE', title: 'Increased bleeding tendency', mechanism: 'SSRIs impair platelet serotonin uptake and can add to antiplatelet-associated gastrointestinal bleeding risk.', management: 'Assess bleeding risk and monitor for bruising or gastrointestinal bleeding; consider gastroprotection when appropriate.' },
];

const crossSensitivity: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'penicillin antibiotic'],
  sulfa: ['hydrochlorothiazide', 'furosemide', 'diuretic', 'loop diuretic'],
  sulfonamide: ['hydrochlorothiazide', 'furosemide', 'diuretic', 'loop diuretic'],
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const ingredientAliases: Record<string, string> = {
  'metoprolol succinate': 'metoprolol',
};
const knownIngredients = Object.keys(drugClasses).sort((a, b) => b.length - a.length);

function resolveIngredient(value: string): string {
  const normalized = normalize(value);
  const matchedIngredient = knownIngredients.find(ingredient => normalized === ingredient || normalized.startsWith(`${ingredient} `));
  return matchedIngredient ? ingredientAliases[matchedIngredient] || matchedIngredient : normalized;
}

function medicationInfo(medication: InteractionMedication | string): { name: string; key: string; className: string } {
  const name = typeof medication === 'string' ? medication : medication.name;
  const key = resolveIngredient(name);
  const suppliedClass = typeof medication === 'string' ? '' : medication.class || '';
  return { name, key, className: drugClasses[key] || normalize(suppliedClass) };
}

function alertId(category: CdsAlertCategory, rule: string, agents: string[]): string {
  const identity = [category, rule, ...agents.map(resolveIngredient).sort()].join('|');
  return `cds-${normalize(identity).replace(/\s+/g, '-')}`;
}

function createAlert(rule: InteractionRule, agents: string[]): CdsAlert {
  return { id: alertId('DRUG_DRUG', rule.title, agents), severity: rule.severity, category: 'DRUG_DRUG', title: rule.title, conflictingAgents: agents, mechanism: rule.mechanism, management: rule.management };
}

export function screenPrescription({ medication, activeMedications = [], allergies = [] }: ScreenPrescriptionInput): CdsAlert[] {
  const candidate = medicationInfo(medication);
  const active = activeMedications.map(medicationInfo);
  const alerts: CdsAlert[] = [];
  const addAlert = (alert: CdsAlert) => {
    if (!alerts.some(existing => existing.id === alert.id)) alerts.push(alert);
  };
  const exactDuplicate = active.find(med => med.key === candidate.key);
  if (exactDuplicate) {
    addAlert({ id: alertId('DUPLICATE_THERAPY', 'duplicate exact', [candidate.key, exactDuplicate.key]), severity: 'MAJOR', category: 'DUPLICATE_THERAPY', title: 'Duplicate medication', conflictingAgents: [exactDuplicate.name], mechanism: 'The prescribed medication is already present on the active medication list, creating avoidable duplicate exposure.', management: 'Reconcile the medication list and discontinue or renew the existing therapy rather than creating a duplicate order.' });
  } else {
    const classDuplicate = active.find(med => med.className && candidate.className && med.className === candidate.className);
    if (classDuplicate) addAlert({ id: alertId('DUPLICATE_THERAPY', 'duplicate class', [candidate.key, classDuplicate.key]), severity: 'MODERATE', category: 'DUPLICATE_THERAPY', title: 'Duplicate therapeutic class', conflictingAgents: [classDuplicate.name], mechanism: `Both medications belong to the ${candidate.className} therapeutic class, creating potentially duplicative therapy.`, management: 'Confirm the intended regimen and discontinue the existing class member if this is a switch rather than combination therapy.' });
  }

  allergies.forEach(allergy => {
    const allergyKey = resolveIngredient(allergy);
    const matches = crossSensitivity[allergyKey] || [];
    if (matches.includes(candidate.key) || matches.includes(candidate.className)) {
      const penicillin = allergyKey === 'penicillin';
      addAlert({ id: alertId('DRUG_ALLERGY', allergyKey, [allergyKey, candidate.key]), severity: penicillin ? 'CONTRAINDICATED' : 'MAJOR', category: 'DRUG_ALLERGY', title: penicillin ? 'Documented penicillin allergy' : 'Potential sulfonamide cross-sensitivity', conflictingAgents: [allergy, candidate.name], mechanism: penicillin ? 'Amoxicillin is a penicillin derivative and may trigger an IgE-mediated or severe delayed hypersensitivity reaction in a patient with penicillin allergy.' : 'Sulfonamide allergy may cross-react with sulfonamide-derived diuretics, with risk dependent on the prior reaction and clinical context.', management: penicillin ? 'Do not prescribe; select a non-penicillin alternative and clarify reaction history.' : 'Review the documented reaction; consider a non-sulfonamide alternative or supervised use with appropriate monitoring.' });
    }
  });

  active.forEach(existing => {
    interactionRules.forEach(rule => {
      const matches = rule.drugs
        ? rule.drugs.includes(candidate.key) && rule.drugs.includes(existing.key)
        : Boolean(rule.classes && rule.classes.includes(candidate.className) && rule.classes.includes(existing.className));
      if (matches) addAlert(createAlert(rule, [candidate.name, existing.name]));
    });
  });
  return alerts.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}

export function requiresPrescriptionOverride(alerts: CdsAlert[]): boolean {
  return alerts.some(alert => alert.severity === 'CONTRAINDICATED' || alert.severity === 'MAJOR');
}

export const medicationClassMap = drugClasses;
