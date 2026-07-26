import { useState, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import {
  useDashboardLayoutStore,
  type PanelColumn,
  type PanelId,
} from '../../stores/dashboardLayoutStore';

const DROP_LINE = '#2563eb';

interface DraggablePanelProps {
  panelId: PanelId;
  column: PanelColumn;
  title: string;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps a dashboard panel so it can be reordered within its column by dragging
 * the panel's title bar, or with Alt+Arrow keys while the panel has focus.
 */
export function DraggablePanel({ panelId, column, title, className = '', children }: DraggablePanelProps) {
  const [armed, setArmed] = useState(false);
  const dragging = useDashboardLayoutStore((s) => s.dragging);
  const dropTarget = useDashboardLayoutStore((s) => s.dropTarget);
  const startDrag = useDashboardLayoutStore((s) => s.startDrag);
  const endDrag = useDashboardLayoutStore((s) => s.endDrag);
  const setDropTarget = useDashboardLayoutStore((s) => s.setDropTarget);
  const movePanel = useDashboardLayoutStore((s) => s.movePanel);
  const nudgePanel = useDashboardLayoutStore((s) => s.nudgePanel);

  const isDragging = dragging?.id === panelId;
  const canAcceptDrop = dragging !== null && dragging.column === column && dragging.id !== panelId;
  const showDropLine = canAcceptDrop && dropTarget?.id === panelId ? dropTarget.position : null;

  // Only the title bar starts a drag, so tables and buttons inside stay usable.
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setArmed(Boolean((e.target as HTMLElement).closest('.ehr-header')));
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!armed) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', panelId);
    startDrag({ id: panelId, column });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canAcceptDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (dropTarget?.id !== panelId || dropTarget.position !== position) {
      setDropTarget({ id: panelId, position });
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!canAcceptDrop || !dragging) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    movePanel(column, dragging.id, panelId, position);
    endDrag();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    nudgePanel(column, panelId, e.key === 'ArrowUp' ? -1 : 1);
  };

  return (
    <div
      data-panel-id={panelId}
      className={`ehr-panel ehr-draggable-panel ${className} ${isDragging ? 'opacity-50' : ''}`}
      style={
        showDropLine === 'before'
          ? { boxShadow: `inset 0 3px 0 0 ${DROP_LINE}` }
          : showDropLine === 'after'
            ? { boxShadow: `inset 0 -3px 0 0 ${DROP_LINE}` }
            : undefined
      }
      draggable={armed}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragEnd={() => {
        endDrag();
        setArmed(false);
      }}
      onDragOver={handleDragOver}
      onDragLeave={() => {
        if (dropTarget?.id === panelId) setDropTarget(null);
      }}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="Reorderable panel"
      aria-label={`${title} panel. Drag its title bar, or press Alt with the up and down arrow keys, to reorder.`}
    >
      {children}
    </div>
  );
}
