export interface MedicationAlertSource {
  interactions: { drug: string; severity: 'high' | 'moderate' | 'low'; description: string }[];
  allergies: string[];
  renalDoseAlert?: string;
  geriatricAlert?: string;
  duplicateTherapy?: string;
}

const severityLabel = { high: 'High', moderate: 'Moderate', low: 'Low' } as const;

export function listMedicationAlerts(order: MedicationAlertSource): string[] {
  return [
    ...order.interactions.map(
      (i) => `${severityLabel[i.severity]} drug interaction with ${i.drug}: ${i.description}`
    ),
    ...order.allergies.map((a) => `Allergy alert: ${a}`),
    ...(order.renalDoseAlert ? [`Renal dosing: ${order.renalDoseAlert}`] : []),
    ...(order.geriatricAlert ? [`Geriatric alert: ${order.geriatricAlert}`] : []),
    ...(order.duplicateTherapy ? [`Override: ${order.duplicateTherapy}`] : []),
  ];
}

export function hasMedicationAlerts(order: MedicationAlertSource): boolean {
  return listMedicationAlerts(order).length > 0;
}

export function describeMedicationAlerts(order: MedicationAlertSource): string {
  const alerts = listMedicationAlerts(order);
  if (alerts.length === 0) return 'No clinical alerts.';
  const count = alerts.length === 1 ? '1 clinical alert' : `${alerts.length} clinical alerts`;
  return `${count}: ${alerts.join('; ')}.`;
}
