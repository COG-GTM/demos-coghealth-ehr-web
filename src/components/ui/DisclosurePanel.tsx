import { useId, type ReactNode } from 'react';

interface DisclosurePanelProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  contentClassName?: string;
  children: ReactNode;
}

export function DisclosurePanel({ title, expanded, onToggle, contentClassName, children }: DisclosurePanelProps) {
  const contentId = useId();

  return (
    <div className="ehr-panel">
      <h3 className="m-0">
        <button
          type="button"
          className="ehr-header ehr-disclosure flex w-full items-center text-left cursor-pointer text-[11px]"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          <span
            aria-hidden="true"
            className="w-3 h-3 mr-1 flex items-center justify-center border border-white/50 text-[9px] font-bold"
          >
            {expanded ? '-' : '+'}
          </span>
          {title}
        </button>
      </h3>
      <div id={contentId} className={contentClassName} hidden={!expanded}>
        {children}
      </div>
    </div>
  );
}
