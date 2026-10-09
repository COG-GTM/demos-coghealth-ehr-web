export type InboxItemType = 'lab' | 'imaging' | 'message' | 'refill' | 'order' | 'cosign' | 'consult';
export type InboxItemPriority = 'critical' | 'high' | 'normal' | 'low';

export const INBOX_TYPE_LABELS: Record<InboxItemType, string> = {
  lab: 'Lab result',
  imaging: 'Imaging result',
  message: 'Message',
  refill: 'Rx refill request',
  order: 'Order',
  cosign: 'Cosign request',
  consult: 'Consult',
};

export function inboxTypeLabel(type: string): string {
  return INBOX_TYPE_LABELS[type as InboxItemType] ?? 'Document';
}

export function inboxPriorityLabel(priority: InboxItemPriority): string | null {
  switch (priority) {
    case 'critical': return 'Critical priority';
    case 'high': return 'High priority';
    default: return null;
  }
}

export function inboxStatusLabels(item: { read: boolean; flagged: boolean }): string[] {
  const labels: string[] = [];
  if (!item.read) labels.push('Unread');
  if (item.flagged) labels.push('Flagged');
  return labels;
}
