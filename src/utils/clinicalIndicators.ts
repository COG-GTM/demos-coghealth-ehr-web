export const HIGH_SYSTOLIC_THRESHOLD = 140;

export function isSystolicHigh(bp: string): boolean {
  const systolic = parseInt(bp, 10);
  return Number.isFinite(systolic) && systolic > HIGH_SYSTOLIC_THRESHOLD;
}

export function copayStatusLabel(collected: boolean | undefined): string {
  return collected ? 'Collected' : 'Not collected';
}
