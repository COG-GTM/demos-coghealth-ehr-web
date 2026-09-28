export type SafetyAlertSeverity = 'contraindicated' | 'major' | 'moderate' | 'minor';

export type SafetyAlertType = 'allergy' | 'interaction' | 'duplicate-therapy';

export interface SafetyAlert {
  id: string;
  type: SafetyAlertType;
  severity: SafetyAlertSeverity;
  title: string;
  description: string;
  recommendation: string;
  trigger: string;
}

interface DrugProfile {
  generic: string;
  aliases: string[];
  classes: string[];
}

interface InteractionRule {
  a: string;
  b: string;
  severity: SafetyAlertSeverity;
  title: string;
  description: string;
  recommendation: string;
}

interface AllergyRule {
  allergen: string;
  aliases: string[];
  target: string;
  severity: SafetyAlertSeverity;
  description: string;
  recommendation: string;
}

interface DuplicateRule {
  classes: string[];
  severity: SafetyAlertSeverity;
  title: string;
  description: string;
  recommendation: string;
}

const drugProfiles: DrugProfile[] = [
  { generic: 'Lisinopril', aliases: ['zestril', 'prinivil'], classes: ['ace-inhibitor', 'raas-blocker', 'k-raising'] },
  { generic: 'Losartan', aliases: ['cozaar'], classes: ['arb', 'raas-blocker', 'k-raising'] },
  { generic: 'Metformin', aliases: ['glucophage'], classes: ['biguanide', 'antidiabetic'] },
  { generic: 'Amlodipine', aliases: ['norvasc'], classes: ['ccb'] },
  { generic: 'Metoprolol', aliases: ['toprol', 'lopressor'], classes: ['beta-blocker'] },
  { generic: 'Atorvastatin', aliases: ['lipitor'], classes: ['statin'] },
  { generic: 'Omeprazole', aliases: ['prilosec'], classes: ['ppi'] },
  { generic: 'Levothyroxine', aliases: ['synthroid'], classes: ['thyroid'] },
  { generic: 'Sertraline', aliases: ['zoloft'], classes: ['ssri', 'serotonergic'] },
  { generic: 'Gabapentin', aliases: ['neurontin'], classes: ['gabapentinoid', 'cns-depressant'] },
  { generic: 'Hydrochlorothiazide', aliases: ['hctz', 'microzide'], classes: ['thiazide', 'diuretic', 'sulfonamide-nonantibiotic', 'k-lowering'] },
  { generic: 'Furosemide', aliases: ['lasix'], classes: ['loop-diuretic', 'diuretic', 'sulfonamide-nonantibiotic', 'k-lowering'] },
  { generic: 'Prednisone', aliases: ['deltasone'], classes: ['corticosteroid'] },
  { generic: 'Amoxicillin', aliases: ['amoxil'], classes: ['penicillin', 'beta-lactam', 'antibiotic'] },
  { generic: 'Azithromycin', aliases: ['zithromax', 'z-pak'], classes: ['macrolide', 'antibiotic', 'qt-prolonging'] },
  { generic: 'Potassium Chloride', aliases: ['klor-con', 'kcl'], classes: ['potassium-supplement', 'k-raising'] },
  { generic: 'Warfarin', aliases: ['coumadin', 'jantoven'], classes: ['anticoagulant'] },
  { generic: 'Tramadol', aliases: ['ultram'], classes: ['opioid', 'serotonergic', 'cns-depressant'] },
  { generic: 'Cephalexin', aliases: ['keflex'], classes: ['cephalosporin', 'beta-lactam', 'antibiotic'] },
  { generic: 'Sulfamethoxazole-Trimethoprim', aliases: ['bactrim', 'septra', 'smx-tmp'], classes: ['sulfonamide-antibiotic', 'antibiotic', 'k-raising'] },
];

const interactionRules: InteractionRule[] = [
  {
    a: 'raas-blocker', b: 'potassium-supplement', severity: 'major',
    title: 'Hyperkalemia risk',
    description: 'RAAS blockade reduces potassium excretion; combined with potassium supplementation this can cause life-threatening hyperkalemia.',
    recommendation: 'Avoid routine co-administration. If required, check serum K+ and creatinine within 1 week.',
  },
  {
    a: 'ssri', b: 'opioid', severity: 'major',
    title: 'Serotonin syndrome risk',
    description: 'Concurrent serotonergic agents increase the risk of serotonin syndrome (agitation, hyperthermia, clonus).',
    recommendation: 'Consider a non-serotonergic analgesic. If co-prescribed, counsel patient on warning signs.',
  },
  {
    a: 'anticoagulant', b: 'ssri', severity: 'moderate',
    title: 'Bleeding risk',
    description: 'SSRIs impair platelet serotonin uptake and increase bleeding risk with anticoagulants.',
    recommendation: 'Monitor for signs of bleeding and check INR more frequently after initiation.',
  },
  {
    a: 'anticoagulant', b: 'macrolide', severity: 'major',
    title: 'Increased INR / bleeding',
    description: 'Macrolide antibiotics may potentiate warfarin and raise INR.',
    recommendation: 'Check INR within 3-5 days of starting therapy; consider an alternative antibiotic.',
  },
  {
    a: 'anticoagulant', b: 'sulfonamide-antibiotic', severity: 'major',
    title: 'Increased INR / bleeding',
    description: 'Sulfamethoxazole inhibits CYP2C9, markedly increasing warfarin exposure.',
    recommendation: 'Prefer an alternative antibiotic. If unavoidable, reduce warfarin dose and monitor INR closely.',
  },
  {
    a: 'corticosteroid', b: 'antidiabetic', severity: 'moderate',
    title: 'Hyperglycemia',
    description: 'Systemic corticosteroids raise blood glucose and may reduce the effectiveness of antidiabetic therapy.',
    recommendation: 'Increase glucose monitoring during steroid course; adjust antidiabetic regimen as needed.',
  },
  {
    a: 'ppi', b: 'thyroid', severity: 'minor',
    title: 'Reduced levothyroxine absorption',
    description: 'Reduced gastric acidity can decrease levothyroxine absorption.',
    recommendation: 'Monitor TSH 6-8 weeks after starting; separate administration times.',
  },
  {
    a: 'gabapentinoid', b: 'opioid', severity: 'major',
    title: 'Respiratory depression',
    description: 'Gabapentinoids combined with opioids increase the risk of CNS and respiratory depression (FDA warning).',
    recommendation: 'Use the lowest effective doses and counsel patient on sedation risk.',
  },
  {
    a: 'k-lowering', b: 'corticosteroid', severity: 'minor',
    title: 'Hypokalemia',
    description: 'Corticosteroids and potassium-wasting diuretics have additive hypokalemic effects.',
    recommendation: 'Monitor serum potassium periodically.',
  },
  {
    a: 'raas-blocker', b: 'sulfonamide-antibiotic', severity: 'moderate',
    title: 'Hyperkalemia risk',
    description: 'Trimethoprim reduces renal potassium excretion; with RAAS blockade hyperkalemia is more likely, particularly in older adults.',
    recommendation: 'Check serum K+ within 3-5 days, or choose an alternative antibiotic.',
  },
];

const allergyRules: AllergyRule[] = [
  {
    allergen: 'penicillin', aliases: ['pcn', 'penicillins'], target: 'penicillin', severity: 'contraindicated',
    description: 'Documented penicillin allergy. This medication is a penicillin-class antibiotic.',
    recommendation: 'Do not prescribe. Choose a non-beta-lactam alternative (e.g., azithromycin, doxycycline).',
  },
  {
    allergen: 'penicillin', aliases: ['pcn', 'penicillins'], target: 'cephalosporin', severity: 'moderate',
    description: 'Documented penicillin allergy. Cephalosporins carry a low (~1-2%) risk of cross-reactivity.',
    recommendation: 'Review reaction history. Avoid if prior reaction was anaphylaxis or severe.',
  },
  {
    allergen: 'sulfa', aliases: ['sulfonamide', 'sulfonamides', 'sulfa drugs'], target: 'sulfonamide-antibiotic', severity: 'contraindicated',
    description: 'Documented sulfonamide allergy. This medication is a sulfonamide antibiotic.',
    recommendation: 'Do not prescribe. Select a non-sulfonamide alternative.',
  },
  {
    allergen: 'sulfa', aliases: ['sulfonamide', 'sulfonamides', 'sulfa drugs'], target: 'sulfonamide-nonantibiotic', severity: 'minor',
    description: 'Documented sulfonamide allergy. Cross-reactivity with non-antibiotic sulfonamides is uncommon.',
    recommendation: 'Generally safe; monitor for hypersensitivity reactions.',
  },
  {
    allergen: 'ace inhibitor', aliases: ['ace inhibitors', 'lisinopril', 'enalapril'], target: 'ace-inhibitor', severity: 'contraindicated',
    description: 'Documented ACE inhibitor allergy (risk of angioedema).',
    recommendation: 'Do not prescribe any ACE inhibitor.',
  },
];

const duplicateRules: DuplicateRule[] = [
  {
    classes: ['ace-inhibitor', 'arb'], severity: 'major',
    title: 'Dual RAAS blockade',
    description: 'Combining an ACE inhibitor with an ARB increases the risk of hyperkalemia, hypotension and acute kidney injury without added cardiovascular benefit.',
    recommendation: 'Discontinue one agent before starting the other.',
  },
];

const severityRank: Record<SafetyAlertSeverity, number> = {
  contraindicated: 0,
  major: 1,
  moderate: 2,
  minor: 3,
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9 -]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function findDrugProfile(name: string): DrugProfile | undefined {
  const n = normalize(name);
  return drugProfiles.find(p =>
    [p.generic, ...p.aliases].some(term => {
      const t = normalize(term);
      return n === t || n.startsWith(`${t} `) || n.includes(` ${t} `) || n.endsWith(` ${t}`) || n.startsWith(`${t}-`);
    })
  );
}

function hasClass(profile: DrugProfile, cls: string): boolean {
  return profile.classes.includes(cls);
}

function matchesAllergen(allergy: string, rule: AllergyRule): boolean {
  const a = normalize(allergy);
  return [rule.allergen, ...rule.aliases].some(term => a === term || a.includes(term));
}

export function compareSeverity(a: SafetyAlertSeverity, b: SafetyAlertSeverity): number {
  return severityRank[a] - severityRank[b];
}

export function requiresOverride(alerts: SafetyAlert[]): boolean {
  return alerts.some(a => a.severity === 'contraindicated' || a.severity === 'major');
}

export function highestSeverity(alerts: SafetyAlert[]): SafetyAlertSeverity | null {
  if (alerts.length === 0) return null;
  return [...alerts].sort((x, y) => compareSeverity(x.severity, y.severity))[0].severity;
}

export function checkPrescriptionSafety(
  medication: string,
  currentMedications: string[] = [],
  allergies: string[] = []
): SafetyAlert[] {
  const candidate = findDrugProfile(medication);
  if (!candidate) return [];

  const alerts: SafetyAlert[] = [];
  const seen = new Set<string>();
  const push = (alert: SafetyAlert) => {
    if (seen.has(alert.id)) return;
    seen.add(alert.id);
    alerts.push(alert);
  };

  for (const allergy of allergies) {
    for (const rule of allergyRules) {
      if (hasClass(candidate, rule.target) && matchesAllergen(allergy, rule)) {
        push({
          id: `allergy:${normalize(allergy)}:${rule.target}`,
          type: 'allergy',
          severity: rule.severity,
          title: `Allergy: ${allergy}`,
          description: rule.description,
          recommendation: rule.recommendation,
          trigger: allergy,
        });
      }
    }
  }

  for (const currentName of currentMedications) {
    const current = findDrugProfile(currentName);
    if (!current) continue;

    if (current.generic === candidate.generic) {
      push({
        id: `duplicate:${candidate.generic}`,
        type: 'duplicate-therapy',
        severity: 'moderate',
        title: 'Duplicate order',
        description: `Patient already has an active order for ${currentName}.`,
        recommendation: 'Review the existing order; modify or renew it instead of creating a duplicate.',
        trigger: currentName,
      });
      continue;
    }

    for (const rule of duplicateRules) {
      const [x, y] = rule.classes;
      if ((hasClass(candidate, x) && hasClass(current, y)) || (hasClass(candidate, y) && hasClass(current, x))) {
        push({
          id: `duplicate-class:${rule.classes.join('+')}:${current.generic}`,
          type: 'duplicate-therapy',
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          recommendation: rule.recommendation,
          trigger: currentName,
        });
      }
    }

    for (const rule of interactionRules) {
      if ((hasClass(candidate, rule.a) && hasClass(current, rule.b)) || (hasClass(candidate, rule.b) && hasClass(current, rule.a))) {
        push({
          id: `interaction:${rule.a}+${rule.b}:${current.generic}`,
          type: 'interaction',
          severity: rule.severity,
          title: `${rule.title} (with ${currentName})`,
          description: rule.description,
          recommendation: rule.recommendation,
          trigger: currentName,
        });
      }
    }
  }

  return alerts.sort((x, y) => compareSeverity(x.severity, y.severity));
}
