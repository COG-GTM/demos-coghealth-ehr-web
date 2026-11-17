export interface ScheduleRowTone {
  background: string;
  text: string;
  secondary: string;
  alert: string;
}

export const SCHEDULE_ROW_TONES = {
  selected: { background: '#316ac5', text: '#ffffff', secondary: '#f3f4f6', alert: '#fef9c3' },
  urgent: { background: '#ffcccc', text: '#990000', secondary: '#660000', alert: '#990000' },
  finished: { background: '#ffffff', text: '#4b5563', secondary: '#666666', alert: '#dc2626' },
  striped: { background: '#f9fafb', text: '#000000', secondary: '#666666', alert: '#dc2626' },
  plain: { background: '#ffffff', text: '#000000', secondary: '#666666', alert: '#dc2626' },
} satisfies Record<string, ScheduleRowTone>;

export const SELECTED_ROW_BADGE = { background: '#ffffff', color: '#316ac5' };

export const ROW_ACTION_BUTTONS = {
  room: { top: '#5c3399', bottom: '#3f1f6b', border: '#2e1650', text: '#ffffff' },
  start: { top: '#2d7a2d', bottom: '#1f5c1f', border: '#174417', text: '#ffffff' },
};

export function getScheduleRowTone(opts: {
  isSelected: boolean;
  isUrgent: boolean;
  isFinished: boolean;
  isStriped: boolean;
}): ScheduleRowTone {
  if (opts.isSelected) return SCHEDULE_ROW_TONES.selected;
  if (opts.isUrgent) return SCHEDULE_ROW_TONES.urgent;
  if (opts.isFinished) return SCHEDULE_ROW_TONES.finished;
  return opts.isStriped ? SCHEDULE_ROW_TONES.striped : SCHEDULE_ROW_TONES.plain;
}

export function rowActionButtonStyle(key: keyof typeof ROW_ACTION_BUTTONS) {
  const b = ROW_ACTION_BUTTONS[key];
  return {
    background: `linear-gradient(to bottom, ${b.top} 0%, ${b.bottom} 100%)`,
    color: b.text,
    border: `1px solid ${b.border}`,
  };
}
