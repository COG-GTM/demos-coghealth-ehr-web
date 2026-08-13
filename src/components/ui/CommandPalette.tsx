import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Calendar, FileText, FlaskConical, LayoutDashboard, Pill, Search, Settings, Users } from 'lucide-react';
import { defaultPatientSearch, type DefaultPatient } from '../../data/defaultPatients';
import { patientService } from '../../services/patientService';
import { logPatientAccess } from '../../services/auditService';
import { useRecentPatientStore } from '../../stores/recentPatientStore';
import { fuzzyMatch, type FuzzyMatch } from '../../utils/fuzzyMatch';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  detail?: string;
  section: 'Patients' | 'Navigate' | 'Actions';
  icon: typeof Users;
  match: FuzzyMatch | null;
  run: () => void;
}

const navigationItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/patients', label: 'Patients', icon: Users },
  { path: '/schedule', label: 'Schedule', icon: Calendar },
  { path: '/labs', label: 'Lab Results', icon: FlaskConical },
  { path: '/vitals', label: 'Vitals', icon: Activity },
  { path: '/medications', label: 'Medications', icon: Pill },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const actionItems = [
  { path: '/medications', label: 'New Prescription', detail: 'Open medication workspace' },
  { path: '/schedule', label: 'New Order', detail: 'Open scheduling and orders workspace' },
  { path: '/patients', label: 'Print Chart', detail: 'Open patient workspace' },
];

function HighlightedText({ value, match }: { value: string; match: FuzzyMatch | null }) {
  if (!match || match.indices.length === 0) return <>{value}</>;
  const selected = new Set(match.indices);
  return (
    <>
      {Array.from(value).map((character, index) => (
        <span key={`${character}-${index}`} className={selected.has(index) ? 'command-palette-match' : undefined}>
          {character}
        </span>
      ))}
    </>
  );
}

function patientFromApi(patient: { id?: number; firstName: string; lastName: string; mrn?: string; dateOfBirth: string }): DefaultPatient | null {
  if (!patient.id || !patient.mrn) return null;
  return {
    id: patient.id,
    name: `${patient.lastName}, ${patient.firstName}`,
    mrn: patient.mrn,
    dob: new Date(patient.dateOfBirth).toLocaleDateString('en-US'),
  };
}

export function CommandPalette({ isOpen, onClose, onOpen }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [apiPatients, setApiPatients] = useState<DefaultPatient[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const recentPatients = useRecentPatientStore((state) => state.recentPatients);
  const addRecentPatient = useRecentPatientStore((state) => state.addRecentPatient);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    let active = true;
    patientService.search(query, 0, 20)
      .then((page) => {
        if (!active) return;
        setApiPatients(page.content.map(patientFromApi).filter((patient): patient is DefaultPatient => patient !== null));
      })
      .catch(() => {
        if (active) setApiPatients([]);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const runPatient = (patient: DefaultPatient) => {
    addRecentPatient(patient);
    logPatientAccess(String(patient.id), patient.mrn, patient.name);
    closePalette();
    navigate(`/patients/${patient.id}`);
  };

  const closePalette = useCallback(() => {
    setQuery('');
    setHighlightedIndex(0);
    onClose();
  }, [onClose]);

  const items = (() => {
    const patients = [...apiPatients, ...defaultPatientSearch, ...recentPatients]
      .filter((patient, index, all) => all.findIndex((candidate) => candidate.id === patient.id) === index);
    const patientItems: PaletteItem[] = patients.map((patient) => {
      const nameMatch = fuzzyMatch(query, patient.name);
      const mrnMatch = fuzzyMatch(query, patient.mrn);
      const match = nameMatch && mrnMatch ? (nameMatch.score >= mrnMatch.score ? nameMatch : mrnMatch)
        : nameMatch || mrnMatch;
      return {
        id: `patient-${patient.id}`,
        label: patient.name,
        detail: `${patient.mrn} • DOB: ${patient.dob}`,
        section: 'Patients',
        icon: Users,
        match,
        run: () => runPatient(patient),
      };
    });
    const nav: PaletteItem[] = navigationItems.map((item) => ({
      id: `navigate-${item.path}`,
      label: item.label,
      section: 'Navigate',
      icon: item.icon,
      match: fuzzyMatch(query, item.label),
      run: () => {
        closePalette();
        navigate(item.path);
      },
    }));
    const actions: PaletteItem[] = actionItems.map((item) => ({
      id: `action-${item.label}`,
      label: item.label,
      detail: item.detail,
      section: 'Actions',
      icon: FileText,
      match: fuzzyMatch(query, item.label),
      run: () => {
        closePalette();
        navigate(item.path);
      },
    }));
    const sections = [patientItems, nav, actions].map((section) => (
      query.trim()
        ? section.filter((item) => item.match).sort((left, right) => (right.match?.score ?? 0) - (left.match?.score ?? 0))
        : section
    ));
    return sections.flat();
  })();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isOpen) inputRef.current?.focus();
        else onOpen?.();
        return;
      }
      if (!isOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (items.length > 0) {
          setHighlightedIndex((current) => event.key === 'ArrowDown'
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length);
        }
      }
      if (event.key === 'Enter' && items[highlightedIndex]) {
        event.preventDefault();
        items[highlightedIndex].run();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePalette, highlightedIndex, isOpen, items, onOpen]);

  useEffect(() => {
    const row = listRef.current?.querySelector(`[data-palette-index="${highlightedIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  if (!isOpen) return null;

  let currentSection = '';
  return (
    <div className="command-palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closePalette()}>
      <div className="command-palette-window" role="dialog" aria-modal="true" aria-label="Clinical command palette">
        <div className="command-palette-titlebar">
          <span>Clinical Command Palette</span>
          <button type="button" onClick={closePalette} aria-label="Close command palette">×</button>
        </div>
        <div className="command-palette-search">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlightedIndex(0);
            }}
            placeholder="Find a patient, page, or action..."
            aria-label="Search commands"
          />
        </div>
        <div ref={listRef} className="command-palette-list">
          {items.length === 0 ? (
            <div className="command-palette-empty">No matching patients, pages, or actions.</div>
          ) : items.map((item, index) => {
            const showSection = item.section !== currentSection;
            currentSection = item.section;
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {showSection && <div className="command-palette-section">{item.section}</div>}
                <button
                  type="button"
                  data-palette-index={index}
                  className={`command-palette-row ${index === highlightedIndex ? 'command-palette-row-active' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={item.run}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block"><HighlightedText value={item.label} match={item.match} /></span>
                    {item.detail && <span className="block command-palette-detail">{item.detail}</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="command-palette-footer">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
