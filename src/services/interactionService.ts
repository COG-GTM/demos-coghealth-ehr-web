export type AlertSeverity = 'contraindicated' | 'major' | 'moderate' | 'minor';
export type AlertKind = 'allergy' | 'interaction' | 'duplicate';

export interface SafetyAlert {
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  interactsWith: string;
  mechanism: string;
  recommendation: string;
}

export interface SafetyCheckInput {
  medication: string;
  drugClass?: string;
  currentMedications: string[];
  allergies: string[];
}

export interface SafetyCheckResult {
  alerts: SafetyAlert[];
  highestSeverity: AlertSeverity | null;
  requiresOverride: boolean;
}

interface InteractionRule {
  drugs: [string, string];
  severity: AlertSeverity;
  title: string;
  mechanism: string;
  recommendation: string;
}

interface AllergyRule {
  allergen: string;
  crossReactive: string[];
  severity: AlertSeverity;
  mechanism: string;
  recommendation: string;
}

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  contraindicated: 4,
  major: 3,
  moderate: 2,
  minor: 1,
};

const OVERRIDE_THRESHOLD: AlertSeverity = 'major';

const interactionRules: InteractionRule[] = [
  {
    drugs: ['lisinopril', 'losartan'],
    severity: 'major',
    title: 'Dual RAAS blockade',
    mechanism: 'Concurrent ACE inhibitor and ARB therapy increases risk of hyperkalemia, hypotension and acute kidney injury.',
    recommendation: 'Avoid combination. Select a single RAAS agent and monitor renal function.',
  },
  {
    drugs: ['lisinopril', 'furosemide'],
    severity: 'moderate',
    title: 'First-dose hypotension',
    mechanism: 'Volume depletion from loop diuretic potentiates ACE inhibitor hypotensive effect.',
    recommendation: 'Start ACE inhibitor at low dose; monitor BP and serum creatinine.',
  },
  {
    drugs: ['lisinopril', 'hydrochlorothiazide'],
    severity: 'minor',
    title: 'Additive hypotension',
    mechanism: 'Thiazide diuretics enhance the antihypertensive effect of ACE inhibitors.',
    recommendation: 'Commonly co-prescribed; monitor BP and electrolytes.',
  },
  {
    drugs: ['sertraline', 'azithromycin'],
    severity: 'major',
    title: 'QT prolongation',
    mechanism: 'Both agents prolong the QT interval; combination increases risk of torsades de pointes.',
    recommendation: 'Consider alternative antibiotic. If unavoidable, obtain baseline ECG and correct electrolytes.',
  },
  {
    drugs: ['atorvastatin', 'azithromycin'],
    severity: 'moderate',
    title: 'Increased statin exposure',
    mechanism: 'Macrolide antibiotics may raise statin plasma levels, increasing risk of myopathy.',
    recommendation: 'Counsel patient on muscle pain; consider holding statin during short antibiotic course.',
  },
  {
    drugs: ['metoprolol succinate', 'amlodipine'],
    severity: 'moderate',
    title: 'Additive hypotension / bradycardia',
    mechanism: 'Beta blocker plus calcium channel blocker produce additive negative chronotropic and vasodilatory effects.',
    recommendation: 'Monitor heart rate and blood pressure; titrate slowly.',
  },
  {
    drugs: ['prednisone', 'hydrochlorothiazide'],
    severity: 'moderate',
    title: 'Hypokalemia',
    mechanism: 'Corticosteroids and thiazide diuretics both promote renal potassium loss.',
    recommendation: 'Monitor serum potassium; consider supplementation.',
  },
  {
    drugs: ['prednisone', 'furosemide'],
    severity: 'moderate',
    title: 'Hypokalemia',
    mechanism: 'Corticosteroids and loop diuretics both promote renal potassium loss.',
    recommendation: 'Monitor serum potassium; consider supplementation.',
  },
  {
    drugs: ['omeprazole', 'levothyroxine'],
    severity: 'moderate',
    title: 'Reduced levothyroxine absorption',
    mechanism: 'Gastric acid suppression impairs dissolution and absorption of levothyroxine.',
    recommendation: 'Separate administration; recheck TSH in 6-8 weeks.',
  },
  {
    drugs: ['gabapentin', 'sertraline'],
    severity: 'minor',
    title: 'Additive CNS depression',
    mechanism: 'Both agents may cause sedation and dizziness.',
    recommendation: 'Counsel patient on drowsiness; avoid driving until response known.',
  },
  {
    drugs: ['metformin', 'prednisone'],
    severity: 'moderate',
    title: 'Reduced glycemic control',
    mechanism: 'Corticosteroids induce hyperglycemia and antagonize the effect of antidiabetic agents.',
    recommendation: 'Increase glucose monitoring during steroid course; adjust dose as needed.',
  },
  {
    drugs: ['metformin', 'furosemide'],
    severity: 'minor',
    title: 'Altered metformin levels',
    mechanism: 'Furosemide may increase metformin plasma concentration; metformin may reduce furosemide levels.',
    recommendation: 'Monitor renal function and glycemic response.',
  },
];

const allergyRules: AllergyRule[] = [
  {
    allergen: 'penicillin',
    crossReactive: ['amoxicillin', 'ampicillin', 'piperacillin', 'penicillin'],
    severity: 'contraindicated',
    mechanism: 'Amoxicillin is an aminopenicillin; patients with penicillin allergy share the beta-lactam ring and are at risk of cross-reaction.',
    recommendation: 'Do not prescribe. Consider a non-beta-lactam alternative such as azithromycin or doxycycline.',
  },
  {
    allergen: 'sulfa',
    crossReactive: ['hydrochlorothiazide', 'furosemide', 'sulfamethoxazole'],
    severity: 'major',
    mechanism: 'Sulfonamide-containing diuretics may cross-react in patients with sulfonamide antibiotic allergy.',
    recommendation: 'Use with caution; consider a non-sulfonamide alternative and monitor for rash.',
  },
  {
    allergen: 'ace inhibitor',
    crossReactive: ['lisinopril', 'enalapril', 'ramipril'],
    severity: 'contraindicated',
    mechanism: 'Documented ACE inhibitor allergy (e.g. angioedema) is a class-wide contraindication.',
    recommendation: 'Do not prescribe. Consider an ARB with close monitoring.',
  },
  {
    allergen: 'statin',
    crossReactive: ['atorvastatin', 'simvastatin', 'rosuvastatin'],
    severity: 'major',
    mechanism: 'Prior statin-associated reaction (myopathy or hypersensitivity) may recur with any agent in the class.',
    recommendation: 'Review prior reaction details before prescribing; consider non-statin lipid therapy.',
  },
];

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function baseDrugName(name: string): string {
  return normalize(name)
    .replace(/\b(hcl|er|xl|sr|succinate|tartrate)\b/g, '')
    .replace(/\d+\s*(mg|mcg|g|ml)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesDrug(candidate: string, ruleDrug: string): boolean {
  const c = baseDrugName(candidate);
  const r = baseDrugName(ruleDrug);
  return c === r || c.startsWith(r) || r.startsWith(c);
}

function compareSeverity(a: AlertSeverity, b: AlertSeverity): number {
  return SEVERITY_RANK[b] - SEVERITY_RANK[a];
}

export function checkPrescriptionSafety(input: SafetyCheckInput): SafetyCheckResult {
  const alerts: SafetyAlert[] = [];
  const newDrug = input.medication;

  for (const allergy of input.allergies) {
    const rule = allergyRules.find(r => normalize(allergy).includes(r.allergen));
    if (rule && rule.crossReactive.some(d => matchesDrug(newDrug, d))) {
      alerts.push({
        kind: 'allergy',
        severity: rule.severity,
        title: `Documented ${allergy} allergy`,
        interactsWith: allergy,
        mechanism: rule.mechanism,
        recommendation: rule.recommendation,
      });
    }
  }

  const seenDuplicates = new Set<string>();
  for (const current of input.currentMedications) {
    if (matchesDrug(current, newDrug)) {
      const key = baseDrugName(current);
      if (!seenDuplicates.has(key)) {
        seenDuplicates.add(key);
        alerts.push({
          kind: 'duplicate',
          severity: 'major',
          title: 'Duplicate therapy',
          interactsWith: current,
          mechanism: 'Patient already has an active order for this medication.',
          recommendation: 'Discontinue or modify the existing order instead of adding a second prescription.',
        });
      }
      continue;
    }

    for (const rule of interactionRules) {
      const [a, b] = rule.drugs;
      const forward = matchesDrug(newDrug, a) && matchesDrug(current, b);
      const reverse = matchesDrug(newDrug, b) && matchesDrug(current, a);
      if (forward || reverse) {
        alerts.push({
          kind: 'interaction',
          severity: rule.severity,
          title: rule.title,
          interactsWith: current,
          mechanism: rule.mechanism,
          recommendation: rule.recommendation,
        });
      }
    }
  }

  alerts.sort((x, y) => compareSeverity(x.severity, y.severity));

  const highestSeverity = alerts.length > 0 ? alerts[0].severity : null;
  const requiresOverride =
    highestSeverity !== null && SEVERITY_RANK[highestSeverity] >= SEVERITY_RANK[OVERRIDE_THRESHOLD];

  return { alerts, highestSeverity, requiresOverride };
}

export const severityLabels: Record<AlertSeverity, string> = {
  contraindicated: 'CONTRAINDICATED',
  major: 'MAJOR',
  moderate: 'MODERATE',
  minor: 'MINOR',
};
