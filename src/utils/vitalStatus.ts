export type VitalStatus = 'normal' | 'abnormal' | 'critical';
export type VitalDirection = 'high' | 'low';

export interface VitalThresholds {
  normalRange: { min: number; max: number };
  criticalLow?: number;
  criticalHigh?: number;
}

export interface VitalAssessment {
  status: VitalStatus;
  direction?: VitalDirection;
}

export function assessVital(thresholds: VitalThresholds | undefined, value: number | undefined): VitalAssessment {
  if (value === undefined || !thresholds) return { status: 'normal' };
  const { normalRange, criticalLow, criticalHigh } = thresholds;

  if (criticalLow !== undefined && value <= criticalLow) return { status: 'critical', direction: 'low' };
  if (criticalHigh !== undefined && value >= criticalHigh) return { status: 'critical', direction: 'high' };
  if (value < normalRange.min) return { status: 'abnormal', direction: 'low' };
  if (value > normalRange.max) return { status: 'abnormal', direction: 'high' };
  return { status: 'normal' };
}

export function statusMarker({ status, direction }: VitalAssessment): string {
  if (status === 'normal' || !direction) return '';
  const flag = direction === 'high' ? 'H' : 'L';
  return status === 'critical' ? flag + flag : flag;
}

export function statusLabel({ status, direction }: VitalAssessment): string {
  if (status === 'normal' || !direction) return '';
  return `${status === 'critical' ? 'Critical' : 'Abnormal'} ${direction}`;
}
