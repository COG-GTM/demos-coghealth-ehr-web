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
  serverId?: number;
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

export function apiToBlock(a: ProviderAvailability): AvailabilityBlock {
  const [startH, startM] = (a.startTime || '08:00').split(':').map(Number);
  const [endH, endM] = (a.endTime || '17:00').split(':').map(Number);
  return {
    id: `server-${a.id}`,
    serverId: a.id,
    blockType: a.blockType,
    dayOfWeek: a.dayOfWeek ?? 0,
    startHour: startH,
    startMinute: startM,
    endHour: endH,
    endMinute: endM,
    slotDuration: a.slotDuration,
    visitTypesAllowed: a.visitTypesAllowed ? a.visitTypesAllowed.split(',').filter(Boolean) : [],
    recurring: a.recurring,
    specificDate: a.specificDate,
    recurrencePattern: a.recurrencePattern,
    overrideReason: a.overrideReason,
    notes: a.notes,
  };
}

export function blockToApi(b: AvailabilityBlock, providerId: number): Partial<ProviderAvailability> {
  return {
    providerId,
    blockType: b.blockType,
    dayOfWeek: b.dayOfWeek,
    specificDate: b.specificDate,
    startTime: `${b.startHour.toString().padStart(2, '0')}:${b.startMinute.toString().padStart(2, '0')}`,
    endTime: `${b.endHour.toString().padStart(2, '0')}:${b.endMinute.toString().padStart(2, '0')}`,
    slotDuration: b.slotDuration,
    visitTypesAllowed: b.visitTypesAllowed.length > 0 ? b.visitTypesAllowed.join(',') : undefined,
    recurring: b.recurring,
    recurrencePattern: b.recurrencePattern,
    overrideReason: b.overrideReason,
    notes: b.notes,
    active: true,
  };
}
