export type MedicationAlertKind = 'interaction' | 'allergy' | 'renal' | 'geriatric';

export interface MedicationAlertSource {
  interactions: { drug: string; severity: string }[];
  allergies: string[];
  renalDoseAlert?: string;
  geriatricAlert?: string;
}

export interface MedicationAlert {
  kind: MedicationAlertKind;
  abbreviation: string;
  label: string;
  description: string;
}

export const ALERT_KIND_META: Record<MedicationAlertKind, { abbreviation: string; label: string }> = {
  interaction: { abbreviation: 'I', label: 'Drug interaction' },
  allergy: { abbreviation: 'A', label: 'Allergy alert' },
  renal: { abbreviation: 'R', label: 'Renal dosing' },
  geriatric: { abbreviation: 'G', label: 'Geriatric alert' },
};

export const ALERT_LEGEND = (Object.keys(ALERT_KIND_META) as MedicationAlertKind[])
  .map(kind => `${ALERT_KIND_META[kind].abbreviation} = ${ALERT_KIND_META[kind].label}`)
  .join(', ');

function build(kind: MedicationAlertKind, details: string[]): MedicationAlert {
  const { abbreviation, label } = ALERT_KIND_META[kind];
  return { kind, abbreviation, label, description: `${label}: ${details.join('; ')}` };
}

export function getMedicationAlerts(order: MedicationAlertSource): MedicationAlert[] {
  const alerts: MedicationAlert[] = [];
  if (order.interactions.length > 0) {
    alerts.push(build('interaction', order.interactions.map(i => `${i.drug} (${i.severity})`)));
  }
  if (order.allergies.length > 0) {
    alerts.push(build('allergy', order.allergies));
  }
  if (order.renalDoseAlert) {
    alerts.push(build('renal', [order.renalDoseAlert]));
  }
  if (order.geriatricAlert) {
    alerts.push(build('geriatric', [order.geriatricAlert]));
  }
  return alerts;
}
