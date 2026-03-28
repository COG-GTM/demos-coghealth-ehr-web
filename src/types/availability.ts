export type BlockType = 'AVAILABLE' | 'ADMIN' | 'LUNCH' | 'MEETING';

export type RecurrencePattern = 'MWF' | 'TTH' | 'WEEKDAYS' | 'WEEKEND' | 'DAILY' | 'CUSTOM';

export interface ProviderAvailability {
  id?: number;
  providerId: number;
  blockType: BlockType;
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  visitTypesAllowed?: string;
  recurring: boolean;
  recurrencePattern?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  overrideReason?: string;
  notes?: string;
  active: boolean;
}

export interface AvailabilityBlock {
  id: string;
  blockType: BlockType;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  slotDuration: number;
  visitTypesAllowed: string[];
  recurring: boolean;
  specificDate?: string;
  recurrencePattern?: string;
  overrideReason?: string;
  notes?: string;
}
