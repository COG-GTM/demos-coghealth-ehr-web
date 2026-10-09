import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';

interface CollapsibleSectionHeadingProps {
  panelId: string;
  expanded: boolean;
  onToggle: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function CollapsibleSectionHeading({
  panelId,
  expanded,
  onToggle,
  icon,
  children,
  className = 'ehr-header',
  style,
}: CollapsibleSectionHeadingProps) {
  return (
    <h2 className={className} style={{ ...style, padding: 0 }}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-2 py-1 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
      >
        <span className="flex items-center">
          {expanded ? <FolderOpen className="w-3 h-3 mr-1" aria-hidden="true" /> : <Folder className="w-3 h-3 mr-1" aria-hidden="true" />}
          {icon}
          {children}
        </span>
        {expanded ? <ChevronDown className="w-3 h-3" aria-hidden="true" /> : <ChevronRight className="w-3 h-3" aria-hidden="true" />}
      </button>
    </h2>
  );
}
