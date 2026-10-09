export type Sex = 'M' | 'F';

export type Severity = 'normal' | 'abnormal' | 'critical';

export interface Interpretation {
  label: string;
  severity: Severity;
}

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const isPositive = (...values: number[]) => values.every(v => Number.isFinite(v) && v > 0);

export function cockcroftGault(age: number, weightKg: number, serumCreatinine: number, sex: Sex): number | null {
  if (!isPositive(age, weightKg, serumCreatinine) || age >= 140) return null;
  const crcl = ((140 - age) * weightKg) / (72 * serumCreatinine);
  return round(sex === 'F' ? crcl * 0.85 : crcl);
}

export function interpretCrCl(crcl: number): Interpretation {
  if (crcl >= 90) return { label: 'Normal renal function', severity: 'normal' };
  if (crcl >= 60) return { label: 'Mildly reduced', severity: 'normal' };
  if (crcl >= 30) return { label: 'Moderately reduced - review renal dosing', severity: 'abnormal' };
  if (crcl >= 15) return { label: 'Severely reduced - renal dose adjustment required', severity: 'critical' };
  return { label: 'Kidney failure range', severity: 'critical' };
}

export function bmi(weightKg: number, heightCm: number): number | null {
  if (!isPositive(weightKg, heightCm)) return null;
  const meters = heightCm / 100;
  return round(weightKg / (meters * meters));
}

export function interpretBmi(value: number): Interpretation {
  if (value < 18.5) return { label: 'Underweight', severity: 'abnormal' };
  if (value < 25) return { label: 'Normal weight', severity: 'normal' };
  if (value < 30) return { label: 'Overweight', severity: 'abnormal' };
  if (value < 40) return { label: 'Obese', severity: 'abnormal' };
  return { label: 'Severely obese', severity: 'critical' };
}

export function bsaMosteller(weightKg: number, heightCm: number): number | null {
  if (!isPositive(weightKg, heightCm)) return null;
  return round(Math.sqrt((weightKg * heightCm) / 3600), 2);
}

export function meanArterialPressure(systolic: number, diastolic: number): number | null {
  if (!isPositive(systolic, diastolic) || diastolic > systolic) return null;
  return round((systolic + 2 * diastolic) / 3, 0);
}

export function interpretMap(value: number): Interpretation {
  if (value < 65) return { label: 'Hypoperfusion risk (MAP < 65)', severity: 'critical' };
  if (value > 110) return { label: 'Elevated', severity: 'abnormal' };
  return { label: 'Adequate perfusion', severity: 'normal' };
}

export function anionGap(sodium: number, chloride: number, bicarbonate: number, albumin?: number): number | null {
  if (!isPositive(sodium, chloride, bicarbonate)) return null;
  const gap = sodium - (chloride + bicarbonate);
  const corrected = albumin !== undefined && isPositive(albumin) ? gap + 2.5 * (4 - albumin) : gap;
  return round(corrected);
}

export function interpretAnionGap(value: number): Interpretation {
  if (value > 20) return { label: 'Markedly elevated - evaluate for HAGMA (MUDPILES)', severity: 'critical' };
  if (value > 12) return { label: 'Elevated anion gap', severity: 'abnormal' };
  if (value < 3) return { label: 'Low anion gap', severity: 'abnormal' };
  return { label: 'Normal anion gap', severity: 'normal' };
}

export function correctedCalcium(calcium: number, albumin: number): number | null {
  if (!isPositive(calcium, albumin)) return null;
  return round(calcium + 0.8 * (4 - albumin));
}

export function interpretCalcium(value: number): Interpretation {
  if (value < 7.5) return { label: 'Critical hypocalcemia', severity: 'critical' };
  if (value < 8.5) return { label: 'Hypocalcemia', severity: 'abnormal' };
  if (value > 12) return { label: 'Critical hypercalcemia', severity: 'critical' };
  if (value > 10.5) return { label: 'Hypercalcemia', severity: 'abnormal' };
  return { label: 'Normal', severity: 'normal' };
}

export interface Cha2ds2VascInput {
  age: number;
  sex: Sex;
  chf: boolean;
  hypertension: boolean;
  diabetes: boolean;
  strokeOrTia: boolean;
  vascularDisease: boolean;
}

// Adjusted annual stroke rate (%) by score, Lip et al. 2010.
const CHA2DS2_VASC_STROKE_RISK = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7, 15.2];

export function cha2ds2Vasc(input: Cha2ds2VascInput): number {
  let score = 0;
  if (input.chf) score += 1;
  if (input.hypertension) score += 1;
  if (input.age >= 75) score += 2;
  else if (input.age >= 65) score += 1;
  if (input.diabetes) score += 1;
  if (input.strokeOrTia) score += 2;
  if (input.vascularDisease) score += 1;
  if (input.sex === 'F') score += 1;
  return score;
}

export function cha2ds2VascStrokeRisk(score: number): number {
  return CHA2DS2_VASC_STROKE_RISK[Math.max(0, Math.min(score, CHA2DS2_VASC_STROKE_RISK.length - 1))];
}

export function interpretCha2ds2Vasc(score: number, sex: Sex): Interpretation {
  const nonSexScore = sex === 'F' ? score - 1 : score;
  if (nonSexScore <= 0) return { label: 'Low risk - anticoagulation not recommended', severity: 'normal' };
  if (nonSexScore === 1) return { label: 'Consider oral anticoagulation', severity: 'abnormal' };
  return { label: 'Oral anticoagulation recommended', severity: 'critical' };
}
