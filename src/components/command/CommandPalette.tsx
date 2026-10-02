import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Clock, CornerDownLeft, FlaskConical, LogOut, Trash2, Loader2, Zap } from 'lucide-react';
import { bestFuzzyMatch } from '../../utils/fuzzyMatch';
import { demoPatients, type PatientSummary } from '../../services/demoPatients';
import { addRecentPatient, clearRecentPatients, getRecentPatients } from '../../services/recentPatients';
import { patientService } from '../../services/patientService';
import { logPatientSearch } from '../../services/auditService';

type IconComponent = ComponentType<{ className?: string }>;

export interface PalettePage {
  path: string;
  label: string;
  icon: IconComponent;
}

type PaletteGroup = 'Recent Patients' | 'Patients' | 'Go To' | 'Actions';

interface PaletteItem {
  id: string;
  group: PaletteGroup;
  label: string;
  sublabel?: string;
  icon: IconComponent;
  highlight: number[];
  score: number;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PalettePage[];
  onLogout: () => void;
}

const GROUP_ORDER: PaletteGroup[] = ['Recent Patients', 'Patients', 'Go To', 'Actions'];
const MAX_PATIENT_RESULTS = 8;
const API_SEARCH_DEBOUNCE_MS = 250;

function HighlightedText({ text, positions }: { text: string; positions: number[] }) {
  if (positions.length === 0) return <>{text}</>;
  const marked = new Set(positions);
  return (
    <>
      {text.split('').map((char, i) =>
        marked.has(i) ? <span key={i} className="font-bold underline">{char}</span> : <span key={i}>{char}</span>
      )}
    </>
  );
}

export function CommandPalette({ isOpen, onClose, pages, onLogout }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentPatients, setRecentPatients] = useState<PatientSummary[]>([]);
  const [remotePatients, setRemotePatients] = useState<PatientSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commandsOnly = query.startsWith('>');
  const searchText = commandsOnly ? query.slice(1).trim() : query.trim();

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    setRemotePatients([]);
    setRecentPatients(getRecentPatients());
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || commandsOnly || searchText.length < 2) {
      setRemotePatients([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const page = await patientService.search(searchText, 0, MAX_PATIENT_RESULTS);
        if (cancelled) return;
        const results = page.content
          .filter(p => p.id !== undefined)
          .map(p => ({
            id: p.id as number,
            name: `${p.lastName}, ${p.firstName}`,
            mrn: p.mrn || '',
            dob: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-US') : '',
          }));
        setRemotePatients(results);
        logPatientSearch(searchText, results.length);
      } catch {
        if (!cancelled) setRemotePatients([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, API_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, commandsOnly, searchText]);

  const items = useMemo<PaletteItem[]>(() => {
    const openPatient = (patient: PatientSummary) => () => {
      addRecentPatient(patient);
      navigate(`/patients/${patient.id}`);
    };

    const result: PaletteItem[] = [];

    if (!commandsOnly) {
      const recentIds = new Set(recentPatients.map(p => p.id));
      if (!searchText) {
        recentPatients.forEach(patient => {
          result.push({
            id: `recent-${patient.id}`,
            group: 'Recent Patients',
            label: patient.name,
            sublabel: `${patient.mrn} • DOB: ${patient.dob}`,
            icon: Clock,
            highlight: [],
            score: 0,
            run: openPatient(patient),
          });
        });
      } else {
        const seen = new Set<string>();
        const candidates = [...recentPatients, ...remotePatients, ...demoPatients].filter(p => {
          const key = p.mrn || String(p.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        candidates
          .map(patient => ({ patient, match: bestFuzzyMatch(searchText, [patient.name, patient.mrn, patient.dob]) }))
          .filter((c): c is { patient: PatientSummary; match: NonNullable<typeof c.match> } => c.match !== null)
          .sort((a, b) => b.match.score - a.match.score)
          .slice(0, MAX_PATIENT_RESULTS)
          .forEach(({ patient, match }) => {
            result.push({
              id: `patient-${patient.mrn || patient.id}`,
              group: 'Patients',
              label: patient.name,
              sublabel: `${patient.mrn} • DOB: ${patient.dob}`,
              icon: recentIds.has(patient.id) ? Clock : User,
              highlight: match.field === 0 ? match.positions : [],
              score: match.score + (recentIds.has(patient.id) ? 3 : 0),
              run: openPatient(patient),
            });
          });
      }
    }

    const commands: Omit<PaletteItem, 'highlight' | 'score'>[] = [
      ...pages.map(page => ({
        id: `page-${page.path}`,
        group: 'Go To' as const,
        label: page.label,
        sublabel: page.path,
        icon: page.icon,
        run: () => navigate(page.path),
      })),
      {
        id: 'action-critical-labs',
        group: 'Actions',
        label: 'Review critical lab results',
        sublabel: 'Lab Results',
        icon: FlaskConical,
        run: () => navigate('/labs'),
      },
      ...(recentPatients.length > 0
        ? [{
            id: 'action-clear-recent',
            group: 'Actions' as const,
            label: 'Clear recent patients',
            sublabel: `${recentPatients.length} in this session`,
            icon: Trash2,
            run: () => clearRecentPatients(),
          }]
        : []),
      {
        id: 'action-logout',
        group: 'Actions',
        label: 'Logout',
        sublabel: 'End session',
        icon: LogOut,
        run: onLogout,
      },
    ];

    commands.forEach(command => {
      const match = bestFuzzyMatch(searchText, [command.label]);
      if (match) result.push({ ...command, highlight: match.positions, score: match.score });
    });

    return GROUP_ORDER.flatMap(group =>
      result.filter(item => item.group === group).sort((a, b) => (searchText ? b.score - a.score : 0))
    );
  }, [commandsOnly, searchText, recentPatients, remotePatients, pages, navigate, onLogout]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => (items.length === 0 ? 0 : (i + 1) % items.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
        break;
      case 'Enter':
        e.preventDefault();
        runItem(items[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  let lastGroup: PaletteGroup | null = null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh]" data-testid="command-palette">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick Launch"
        className="relative w-[560px] bg-white border-2 border-gray-400 flex flex-col"
        style={{ fontFamily: 'Tahoma, sans-serif', boxShadow: '2px 2px 12px rgba(0,0,0,0.35)' }}
      >
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
        >
          <span className="flex items-center text-white font-semibold text-[11px]">
            <Zap className="w-3.5 h-3.5 mr-1" /> Quick Launch
          </span>
          <span className="text-blue-100 text-[10px]">Ctrl+K</span>
        </div>

        <div className="flex items-center px-2 py-1.5 bg-[#ece9d8] border-b border-gray-400">
          <Search className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search patients by name, MRN or DOB, or type > for commands..."
            className="ehr-input flex-1"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={items[activeIndex] ? `palette-item-${activeIndex}` : undefined}
          />
          {searching && <Loader2 className="w-3.5 h-3.5 ml-1.5 text-gray-500 animate-spin" />}
        </div>

        <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-[50vh] overflow-auto">
          {items.length === 0 && (
            <div className="px-3 py-4 text-center text-[11px] text-gray-500">
              No matches for "{searchText}"
            </div>
          )}
          {items.map((item, index) => {
            const showHeader = item.group !== lastGroup;
            lastGroup = item.group;
            const Icon = item.icon;
            const active = index === activeIndex;
            return (
              <div key={item.id}>
                {showHeader && (
                  <div className="px-2 py-0.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide bg-gradient-to-b from-[#f8f8f8] to-[#e8e8e8] border-y border-gray-300">
                    {item.group}
                  </div>
                )}
                <div
                  id={`palette-item-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={active}
                  onMouseMove={() => !active && setActiveIndex(index)}
                  onClick={() => runItem(item)}
                  className={`flex items-center px-2 py-1 cursor-pointer text-[11px] ${
                    active ? 'bg-[#316ac5] text-white' : 'text-gray-800'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${active ? 'text-white' : 'text-[#336699]'}`} />
                  <span className="flex-1 truncate">
                    <HighlightedText text={item.label} positions={item.highlight} />
                  </span>
                  {item.sublabel && (
                    <span className={`ml-2 text-[10px] truncate ${active ? 'text-blue-100' : 'text-gray-500'}`}>
                      {item.sublabel}
                    </span>
                  )}
                  {active && <CornerDownLeft className="w-3 h-3 ml-2 flex-shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-5 bg-gradient-to-b from-[#ece9d8] to-[#d4d0c8] border-t border-gray-400 flex items-center justify-between px-2 text-[10px] text-gray-600">
          <span>↑↓ Navigate &nbsp;•&nbsp; Enter Open &nbsp;•&nbsp; Esc Close</span>
          <span>{items.length} result{items.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
