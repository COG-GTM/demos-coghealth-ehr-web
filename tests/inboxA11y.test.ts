import { INBOX_TYPE_LABELS, inboxPriorityLabel, inboxStatusLabels, inboxTypeLabel } from '../src/pages/inboxA11y';

describe('inbox accessibility labels', () => {
  it('gives every inbox item type a text label', () => {
    for (const type of ['lab', 'imaging', 'message', 'refill', 'order', 'cosign', 'consult']) {
      expect(inboxTypeLabel(type)).toBe(INBOX_TYPE_LABELS[type as keyof typeof INBOX_TYPE_LABELS]);
      expect(inboxTypeLabel(type)).not.toHaveLength(0);
    }
    expect(inboxTypeLabel('unknown')).toBe('Document');
  });

  it('announces critical and high priority but not normal or low', () => {
    expect(inboxPriorityLabel('critical')).toBe('Critical priority');
    expect(inboxPriorityLabel('high')).toBe('High priority');
    expect(inboxPriorityLabel('normal')).toBeNull();
    expect(inboxPriorityLabel('low')).toBeNull();
  });

  it('describes unread and flagged state in text', () => {
    expect(inboxStatusLabels({ read: false, flagged: true })).toEqual(['Unread', 'Flagged']);
    expect(inboxStatusLabels({ read: false, flagged: false })).toEqual(['Unread']);
    expect(inboxStatusLabels({ read: true, flagged: true })).toEqual(['Flagged']);
    expect(inboxStatusLabels({ read: true, flagged: false })).toEqual([]);
  });
});
