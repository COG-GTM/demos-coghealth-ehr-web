import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  Activity,
  Calendar,
  ClipboardList,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Lock,
  Pill,
  Printer,
  Search,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { logAuditEvent, logPatientAccess, logPrint } from '../../services/auditService';
import { scoreCommand } from './fuzzyScore';

export interface CommandPalettePatient {
  id: number;
  name: string;
  mrn: string;
  dob: string;
}

type CommandGroup = 'Go To' | 'Quick Actions' | 'Patients';

interface Command {
  id: string;
  label: string;
  hint: string;
  group: CommandGroup;
  icon: ComponentType<{ className?: string }>;
  keywords: string;
  run: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  onNavigate: (path: string) => void;
  onLock: () => void;
  patients: CommandPalettePatient[];
}

const RECENT_KEY = 'coghealth_recent_commands';
const MAX_RECENT = 5;

function getRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(commandId: string): void {
  const next = [commandId, ...getRecent().filter((id) => id !== commandId)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function CommandPalette({
  onClose,
  onNavigate,
  onLock,
  patients,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent] = useState<string[]>(getRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => onNavigate(path);

    const navCommands: Command[] = [
      { id: 'go-dashboard', label: 'Dashboard', hint: 'Worklist and clinical inbox', icon: LayoutDashboard, keywords: 'home worklist inbox', run: go('/') },
      { id: 'go-patients', label: 'Patient Search', hint: 'Find a patient by name or MRN', icon: Users, keywords: 'find mrn chart', run: go('/patients') },
      { id: 'go-schedule', label: 'Schedule', hint: "Today's appointments", icon: Calendar, keywords: 'appointments clinic', run: go('/schedule') },
      { id: 'go-labs', label: 'Lab Results', hint: 'Panels and critical values', icon: FlaskConical, keywords: 'cbc bmp results', run: go('/labs') },
      { id: 'go-vitals', label: 'Vitals', hint: 'Flowsheet of physiological data', icon: Activity, keywords: 'flowsheet bp pulse', run: go('/vitals') },
      { id: 'go-medications', label: 'Medications', hint: 'Active meds and refills', icon: Pill, keywords: 'rx drugs refill', run: go('/medications') },
      { id: 'go-reports', label: 'Reports', hint: 'Clinical and operational reports', icon: FileText, keywords: 'analytics export', run: go('/reports') },
      { id: 'go-settings', label: 'Settings', hint: 'Preferences and audit log', icon: Settings, keywords: 'preferences configuration', run: go('/settings') },
    ].map((cmd) => ({ ...cmd, group: 'Go To' as const }));

    const actionCommands: Command[] = [
      {
        id: 'action-prescribe',
        label: 'New Prescription',
        hint: 'Open e-Prescribe',
        icon: Pill,
        keywords: 'rx eprescribe sig medication order',
        run: () => {
          logAuditEvent('PRESCRIPTION_CREATE', { action: 'e-Prescribe opened from command palette', success: true });
          onNavigate('/medications?action=prescribe');
        },
      },
      {
        id: 'action-order-labs',
        label: 'Order Labs',
        hint: 'Place a diagnostic order',
        icon: ClipboardList,
        keywords: 'order panel cbc bmp draw',
        run: () => {
          logAuditEvent('ORDER_CREATE', { action: 'Lab order started from command palette', success: true });
          onNavigate('/labs?action=order');
        },
      },
      {
        id: 'action-audit',
        label: 'View Audit Log',
        hint: 'HIPAA access history',
        icon: Shield,
        keywords: 'hipaa compliance phi access history',
        run: go('/settings?tab=audit'),
      },
      {
        id: 'action-print',
        label: 'Print Current View',
        hint: 'Logged as a PHI print event',
        icon: Printer,
        keywords: 'paper export chart',
        run: () => {
          logPrint(undefined, 'Screen');
          window.print();
        },
      },
      {
        id: 'action-lock',
        label: 'Lock Session',
        hint: 'Secure the workstation',
        icon: Lock,
        keywords: 'logout sign out secure',
        run: onLock,
      },
    ].map((cmd) => ({ ...cmd, group: 'Quick Actions' as const }));

    const patientCommands: Command[] = patients.map((patient) => ({
      id: `patient-${patient.id}`,
      label: patient.name,
      hint: `${patient.mrn} • DOB ${patient.dob}`,
      group: 'Patients' as const,
      icon: User,
      keywords: `${patient.mrn} ${patient.dob} chart`,
      run: () => {
        logPatientAccess(String(patient.id), patient.mrn, patient.name);
        onNavigate(`/patients/${patient.id}`);
      },
    }));

    return [...actionCommands, ...navCommands, ...patientCommands];
  }, [onLock, onNavigate, patients]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const recentCommands = recent
        .map((id) => commands.find((cmd) => cmd.id === id))
        .filter((cmd): cmd is Command => Boolean(cmd));
      const rest = commands.filter((cmd) => !recent.includes(cmd.id));
      return [...recentCommands, ...rest];
    }

    return commands
      .map((cmd) => ({ cmd, score: scoreCommand(`${cmd.label} ${cmd.keywords}`, query.trim()) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd);
  }, [commands, query, recent]);

  const entries = useMemo(() => {
    const isBrowsing = !query.trim();
    const recentCount = isBrowsing ? results.findIndex((cmd) => !recent.includes(cmd.id)) : 0;
    const recentEnd = recentCount === -1 ? results.length : recentCount;

    return results.map((command, index) => {
      if (!isBrowsing) return { command, header: null as string | null };
      if (index < recentEnd) return { command, header: index === 0 ? 'Recent' : null };
      const previous = index > recentEnd ? results[index - 1] : null;
      return { command, header: previous?.group === command.group ? null : command.group };
    });
  }, [query, recent, results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const runCommand = (command: Command) => {
    pushRecent(command.id);
    onClose();
    command.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const command = results[activeIndex];
      if (command) runCommand(command);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24" data-testid="command-palette">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-[560px] max-w-[92vw] border-2 border-gray-400 bg-[#ece9d8]"
        style={{ fontFamily: 'Tahoma, sans-serif', boxShadow: '3px 3px 10px rgba(0,0,0,0.4)' }}
        onKeyDown={handleKeyDown}
      >
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
        >
          <span className="text-white font-semibold text-[11px]">Quick Actions</span>
          <span className="text-blue-100 text-[10px]">Esc to close</span>
        </div>

        <div className="flex items-center border-b border-gray-400 bg-white px-2 py-1.5">
          <Search className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search patients, pages and actions..."
            className="w-full text-[12px] text-gray-800 placeholder-gray-400 focus:outline-none"
            data-testid="command-palette-input"
          />
        </div>

        <div ref={listRef} className="max-h-72 overflow-y-auto bg-white">
          {results.length === 0 && (
            <div className="px-3 py-4 text-center text-[11px] text-gray-500">No matching commands</div>
          )}
          {entries.map(({ command, header }, index) => {
            const Icon = command.icon;
            const isActive = index === activeIndex;

            return (
              <div key={command.id}>
                {header && (
                  <div className="bg-[#d4d0c8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    {header}
                  </div>
                )}
                <button
                  type="button"
                  data-active={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runCommand(command)}
                  className={`flex w-full items-center px-2 py-1.5 text-left text-[11px] ${
                    isActive ? 'bg-[#316ac5] text-white' : 'text-gray-800 hover:bg-blue-50'
                  }`}
                >
                  <Icon className={`mr-2 h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-blue-800'}`} />
                  <span className="font-semibold">{command.label}</span>
                  <span className={`ml-2 truncate ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                    {command.hint}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-gray-400 px-2 py-1 text-[10px] text-gray-600">
          <span>↑↓ navigate • Enter run • Esc close</span>
          <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
