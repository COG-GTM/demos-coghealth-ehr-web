import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PanelId =
  | 'inbox'
  | 'worklist'
  | 'unsigned'
  | 'orders'
  | 'schedule'
  | 'messages'
  | 'status';

export type PanelColumn = 'left' | 'right';
export type DropPosition = 'before' | 'after';

export interface PanelOrder {
  left: PanelId[];
  right: PanelId[];
}

export const DEFAULT_PANEL_ORDER: PanelOrder = {
  left: ['inbox', 'worklist'],
  right: ['unsigned', 'orders', 'schedule', 'messages', 'status'],
};

export const PANEL_TITLES: Record<PanelId, string> = {
  inbox: 'Inbox',
  worklist: 'Patient Worklist',
  unsigned: 'Unsigned Notes',
  orders: 'Pending Orders',
  schedule: "Today's Schedule",
  messages: 'System Messages',
  status: 'System Status',
};

const STORAGE_KEY = 'coghealth-dashboard-layout';

/**
 * Keeps a persisted column usable when panels are added, removed, or renamed:
 * unknown and duplicate ids are dropped and any missing panel is appended.
 */
function sanitizeColumn(stored: unknown, fallback: PanelId[]): PanelId[] {
  const allowed = new Set<PanelId>(fallback);
  const seen = new Set<PanelId>();
  const result: PanelId[] = [];

  if (Array.isArray(stored)) {
    for (const id of stored) {
      if (typeof id === 'string' && allowed.has(id as PanelId) && !seen.has(id as PanelId)) {
        seen.add(id as PanelId);
        result.push(id as PanelId);
      }
    }
  }
  for (const id of fallback) {
    if (!seen.has(id)) result.push(id);
  }
  return result;
}

interface DragState {
  id: PanelId;
  column: PanelColumn;
}

interface DropState {
  id: PanelId;
  position: DropPosition;
}

interface DashboardLayoutState extends PanelOrder {
  dragging: DragState | null;
  dropTarget: DropState | null;
  startDrag: (drag: DragState) => void;
  endDrag: () => void;
  setDropTarget: (drop: DropState | null) => void;
  movePanel: (column: PanelColumn, dragId: PanelId, targetId: PanelId, position: DropPosition) => void;
  nudgePanel: (column: PanelColumn, id: PanelId, delta: number) => void;
  resetLayout: () => void;
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PANEL_ORDER,
      dragging: null,
      dropTarget: null,
      startDrag: (drag) => set({ dragging: drag }),
      endDrag: () => set({ dragging: null, dropTarget: null }),
      setDropTarget: (drop) => set({ dropTarget: drop }),
      movePanel: (column, dragId, targetId, position) => {
        if (dragId === targetId) return;
        const order = [...get()[column]];
        const from = order.indexOf(dragId);
        const targetExists = order.includes(targetId);
        if (from === -1 || !targetExists) return;

        order.splice(from, 1);
        const target = order.indexOf(targetId);
        order.splice(position === 'after' ? target + 1 : target, 0, dragId);
        set(column === 'left' ? { left: order } : { right: order });
      },
      nudgePanel: (column, id, delta) => {
        const order = [...get()[column]];
        const from = order.indexOf(id);
        const to = from + delta;
        if (from === -1 || to < 0 || to >= order.length) return;
        [order[from], order[to]] = [order[to], order[from]];
        set(column === 'left' ? { left: order } : { right: order });
      },
      resetLayout: () => set({ ...DEFAULT_PANEL_ORDER }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ left: state.left, right: state.right }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<PanelOrder>;
        return {
          ...current,
          left: sanitizeColumn(stored.left, DEFAULT_PANEL_ORDER.left),
          right: sanitizeColumn(stored.right, DEFAULT_PANEL_ORDER.right),
        };
      },
    },
  ),
);

export function isDefaultLayout(order: PanelOrder): boolean {
  return (
    order.left.join() === DEFAULT_PANEL_ORDER.left.join() &&
    order.right.join() === DEFAULT_PANEL_ORDER.right.join()
  );
}
