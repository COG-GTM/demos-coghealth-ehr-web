interface DisclosureHeaderProps {
  label: string;
  expanded: boolean;
  controls: string;
  onToggle: () => void;
}

export function DisclosureHeader({ label, expanded, controls, onToggle }: DisclosureHeaderProps) {
  return (
    <button
      type="button"
      className="ehr-header ehr-disclosure w-full flex items-center justify-between text-left cursor-pointer"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      <span className="flex items-center">
        <span
          aria-hidden="true"
          className="w-4 h-4 border border-gray-400 bg-white text-black flex items-center justify-center text-[10px] font-bold mr-1"
        >
          {expanded ? '-' : '+'}
        </span>
        {label}
      </span>
    </button>
  );
}
