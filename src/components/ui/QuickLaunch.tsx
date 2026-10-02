import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CornerDownLeft, LogOut, Printer, Search, User, Zap, type LucideIcon } from 'lucide-react';
import {
  groupByCategory,
  parseQuery,
  rankCommands,
  type CommandCategory,
  type CommandItem,
} from '../../utils/quickLaunch';
import { getRecentPatientIds, recordRecentPatient } from '../../services/recentPatientsService';
import { logPatientSearch } from '../../services/auditService';

export interface QuickLaunchPatient {
  id: number;
  name: string;
  mrn: string;
  dob: string;
}

export interface QuickLaunchNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface QuickLaunchProps {
  isOpen: boolean;
  onClose: () => void;
  patients: QuickLaunchPatient[];
  navItems: QuickLaunchNavItem[];
  onLogout: () => void;
}

interface PaletteCommand extends CommandItem {
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  recent: 'Recent Patients',
  patient: 'Patients',
  navigate: 'Go To',
  action: 'Actions',
};

function HighlightedText({ text, indices, active }: { text: string; indices: number[]; active: boolean }) {
  if (indices.length === 0) return <>{text}</>;
  const marked = new Set(indices);
  return (
    <>
      {text.split('').map((ch, i) =>
        marked.has(i) ? (
          <span key={i} className={`font-bold underline ${active ? 'decoration-white' : 'decoration-[#316ac5]'}`}>{ch}</span>
        ) : (
          <span key={i}>{ch}</span>
        )
      )}
    </>
  );
}

export function QuickLaunch({ isOpen, onClose, patients, navItems, onLogout }: QuickLaunchProps) {
  if (!isOpen) return null;
  return <QuickLaunchWindow onClose={onClose} patients={patients} navItems={navItems} onLogout={onLogout} />;
}

function QuickLaunchWindow({ onClose, patients, navItems, onLogout }: Omit<QuickLaunchProps, 'isOpen'>) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds] = useState<number[]>(getRecentPatientIds);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const parsed = parseQuery(query);

  const commands = useMemo<PaletteCommand[]>(() => {
    const openPatient = (patient: QuickLaunchPatient) => () => {
      recordRecentPatient(patient.id);
      navigate(`/patients/${patient.id}`);
    };
    const toPatientCommand = (patient: QuickLaunchPatient, category: CommandCategory): PaletteCommand => ({
      id: `${category}-${patient.id}`,
      category,
      title: patient.name,
      subtitle: `${patient.mrn} • DOB: ${patient.dob}`,
      keywords: [patient.mrn, patient.dob],
      icon: category === 'recent' ? Clock : User,
      run: openPatient(patient),
    });

    const showRecents = parsed.text === '';
    const recents = showRecents
      ? recentIds
          .map(id => patients.find(p => p.id === id))
          .filter((p): p is QuickLaunchPatient => p !== undefined)
      : [];
    const recentSet = new Set(recents.map(p => p.id));

    return [
      ...recents.map(p => toPatientCommand(p, 'recent')),
      ...patients.filter(p => !recentSet.has(p.id)).map(p => toPatientCommand(p, 'patient')),
      ...navItems.map<PaletteCommand>(item => ({
        id: `nav-${item.path}`,
        category: 'navigate',
        title: item.label,
        subtitle: item.path,
        icon: item.icon,
        run: () => navigate(item.path),
      })),
      {
        id: 'action-print',
        category: 'action',
        title: 'Print Current Screen',
        keywords: ['print', 'paper'],
        icon: Printer,
        shortcut: 'Ctrl+P',
        run: () => setTimeout(() => window.print(), 0),
      },
      {
        id: 'action-logout',
        category: 'action',
        title: 'Log Out',
        keywords: ['logout', 'sign out', 'exit'],
        icon: LogOut,
        run: onLogout,
      },
    ];
  }, [parsed.text, recentIds, patients, navItems, navigate, onLogout]);

  const groups = useMemo(() => {
    const scoped = parsed.scope ? commands.filter(c => parsed.scope?.includes(c.category)) : commands;
    return groupByCategory(rankCommands(scoped, parsed.text));
  }, [commands, parsed.scope, parsed.text]);

  const flat = groups.flatMap(g => g.commands);
  const clampedIndex = flat.length === 0 ? 0 : Math.min(activeIndex, flat.length - 1);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${clampedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [clampedIndex]);

  const execute = (index: number) => {
    const cmd = flat[index];
    if (!cmd) return;
    if (parsed.text && (cmd.item.category === 'patient' || cmd.item.category === 'recent')) {
      const patientCount = flat.filter(c => c.item.category === 'patient' || c.item.category === 'recent').length;
      logPatientSearch(parsed.text, patientCount);
    }
    onClose();
    cmd.item.run();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flat.length) setActiveIndex((clampedIndex + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length) setActiveIndex((clampedIndex - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(clampedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let runningIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" data-testid="quick-launch">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Quick Launch"
        className="relative w-[560px] bg-white border-2 border-gray-400 flex flex-col"
        style={{ fontFamily: 'Tahoma, sans-serif', boxShadow: '2px 2px 8px rgba(0,0,0,0.3)' }}
      >
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
        >
          <span className="flex items-center text-white font-semibold text-[11px]">
            <Zap className="w-3.5 h-3.5 mr-1 text-yellow-300" /> Quick Launch
          </span>
          <span className="text-blue-100 text-[10px]">Ctrl+K</span>
        </div>

        <div className="p-2 bg-[#ece9d8] border-b border-gray-400">
          <div className="flex items-center bg-white border border-[#7f9db9] px-2 py-1">
            <Search className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search patients, MRNs, screens, actions...  (> commands, @ patients)"
              aria-label="Quick Launch search"
              className="flex-1 text-[12px] focus:outline-none"
            />
          </div>
        </div>

        <div ref={listRef} className="max-h-[320px] overflow-y-auto bg-white" role="listbox">
          {flat.length === 0 && (
            <div className="p-4 text-center text-[11px] text-gray-500">
              No matches for "{parsed.text}"
            </div>
          )}
          {groups.map(group => (
            <div key={group.category}>
              <div className="ehr-subheader">{CATEGORY_LABELS[group.category]}</div>
              {group.commands.map(cmd => {
                const index = runningIndex++;
                const active = index === clampedIndex;
                const Icon = cmd.item.icon;
                return (
                  <div
                    key={cmd.item.id}
                    data-index={index}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => active || setActiveIndex(index)}
                    onClick={() => execute(index)}
                    className={`flex items-center px-2 py-1 cursor-pointer text-[11px] ${
                      active ? 'bg-[#316ac5] text-white' : 'text-gray-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${active ? 'text-white' : 'text-[#336699]'}`} />
                    <span className="flex-1 truncate">
                      <HighlightedText text={cmd.item.title} indices={cmd.titleIndices} active={active} />
                      {cmd.item.subtitle && (
                        <span className={`ml-2 text-[10px] ${active ? 'text-blue-100' : 'text-gray-500'}`}>
                          {cmd.item.subtitle}
                        </span>
                      )}
                    </span>
                    {cmd.item.shortcut && (
                      <span className={`ml-2 text-[10px] ${active ? 'text-blue-100' : 'text-gray-400'}`}>
                        {cmd.item.shortcut}
                      </span>
                    )}
                    {active && <CornerDownLeft className="w-3 h-3 ml-2 text-blue-100" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="ehr-status-bar flex items-center justify-between">
          <span>↑↓ Select &nbsp; Enter Open &nbsp; Esc Close</span>
          <span>{flat.length} result{flat.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
