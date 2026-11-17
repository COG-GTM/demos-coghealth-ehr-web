import type { ReactNode } from 'react';

interface PanelHeadingProps {
  children: ReactNode;
  className?: string;
}

interface CollapsiblePanelHeadingProps extends PanelHeadingProps {
  panelId: string;
  expanded: boolean;
  onToggle: () => void;
}

const glyphClassName =
  'w-4 h-4 mr-2 shrink-0 flex items-center justify-center border border-white/50 text-[10px] font-bold';

export function PanelHeading({ children, className = '' }: PanelHeadingProps) {
  return <h2 className={`ehr-header flex items-center ${className}`}>{children}</h2>;
}

export function PanelGlyph({ children }: { children: ReactNode }) {
  return (
    <span className={glyphClassName} aria-hidden="true">
      {children}
    </span>
  );
}

export function CollapsiblePanelHeading({
  panelId,
  expanded,
  onToggle,
  children,
  className = '',
}: CollapsiblePanelHeadingProps) {
  return (
    <h2 className={`ehr-header ehr-header-collapsible ${className}`}>
      <button
        type="button"
        className="ehr-panel-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <PanelGlyph>{expanded ? '-' : '+'}</PanelGlyph>
        {children}
      </button>
    </h2>
  );
}
