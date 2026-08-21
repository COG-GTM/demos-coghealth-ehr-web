import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  LogOut,
  Pill,
  Search,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react';
import { patientDirectory, type DirectoryPatient } from '../data/patientDirectory';
import type { NavigationItem } from '../navigation';
import { fuzzyMatch, rankFuzzy, type RankedMatch } from '../utils/fuzzyMatcher';
import { logPatientAccess, logPatientSearch } from '../services/auditService';

const RECENT_PATIENTS_KEY = 'coghealth_recent_patients';
const MAX_RECENT_PATIENTS = 5;
const MAX_PATIENT_RESULTS = 8;
const MAX_ACTION_RESULTS = 6;

interface ClinicalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  navigationItems: NavigationItem[];
}

type PaletteAction = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  action: () => void;
};

type PaletteResult =
  | { kind: 'patient'; patient: DirectoryPatient; match: RankedMatch<DirectoryPatient> }
  | { kind: 'navigation'; item: NavigationItem; match: RankedMatch<NavigationItem> }
  | { kind: 'action'; item: PaletteAction; match: RankedMatch<PaletteAction> };

interface PaletteGroup {
  label: string;
  results: PaletteResult[];
}

function readRecentPatients(): DirectoryPatient[] {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_PATIENTS_KEY) ?? '[]') as number[];
    return ids
      .map(id => patientDirectory.find(patient => patient.id === id))
      .filter((patient): patient is DirectoryPatient => patient !== undefined);
  } catch {
    return [];
  }
}

function saveRecentPatient(patient: DirectoryPatient): void {
  try {
    const ids = readRecentPatients().map(recent => recent.id);
    localStorage.setItem(
      RECENT_PATIENTS_KEY,
      JSON.stringify([patient.id, ...ids.filter(id => id !== patient.id)].slice(0, MAX_RECENT_PATIENTS)),
    );
  } catch {
    // Recent patients are a convenience and should not block chart access.
  }
}

function HighlightedLabel({ label, indices }: { label: string; indices: number[] }) {
  const matched = new Set(indices);
  return (
    <>
      {Array.from(label).map((character, index) => (
        matched.has(index)
          ? <mark key={`${character}-${index}`} className="bg-[#fff2a8] text-black">{character}</mark>
          : <span key={`${character}-${index}`}>{character}</span>
      ))}
    </>
  );
}

export default function ClinicalCommandPalette({
  isOpen,
  onClose,
  onLogout,
  navigationItems,
}: ClinicalCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [recentPatients, setRecentPatients] = useState<DirectoryPatient[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions = useMemo<PaletteAction[]>(() => [
    { id: 'new-prescription', label: 'New prescription', description: 'Open e-prescribing workspace', keywords: ['rx', 'medication', 'prescribe'], icon: Pill, action: () => navigate('/medications') },
    { id: 'new-order', label: 'New order', description: 'Open clinical orders workspace', keywords: ['lab', 'imaging', 'order'], icon: ClipboardList, action: () => navigate('/schedule') },
    { id: 'print-chart', label: 'Print chart', description: 'Open patient workspace print tools', keywords: ['print', 'paper', 'chart'], icon: FileText, action: () => navigate('/patients') },
    { id: 'audit-log', label: 'View audit log', description: 'Open compliance reports', keywords: ['hipaa', 'compliance', 'audit', 'log'], icon: Search, action: () => navigate('/reports') },
    { id: 'settings', label: 'Settings', description: 'Open system settings', keywords: ['preferences', 'configuration'], icon: Settings, action: () => navigate('/settings') },
    { id: 'logout', label: 'Log out', description: 'Sign out of CogHealth EHR', keywords: ['sign out', 'exit'], icon: LogOut, action: onLogout },
  ], [navigate, onLogout]);

  const patientMatches = useMemo(
    () => rankFuzzy(query, patientDirectory, patient => [patient.name, patient.mrn, ...(patient.flags ?? []), ...(patient.alerts ?? [])]).slice(0, MAX_PATIENT_RESULTS),
    [query],
  );
  const navigationMatches = useMemo(
    () => rankFuzzy(query, navigationItems, item => [item.label, item.path]),
    [navigationItems, query],
  );
  const actionMatches = useMemo(
    () => rankFuzzy(query, actions, item => [item.label, item.description, ...item.keywords]).slice(0, MAX_ACTION_RESULTS),
    [actions, query],
  );

  const groups = useMemo<PaletteGroup[]>(() => {
    const recent = query.trim()
      ? []
      : recentPatients.map(patient => ({ kind: 'patient' as const, patient, match: { score: 0, indices: [], item: patient, matchedField: 0 } }));
    const patients = query.trim()
      ? patientMatches.map(match => ({ kind: 'patient' as const, patient: match.item, match }))
      : recent;
    return [
      ...(patients.length > 0 ? [{ label: query.trim() ? 'Patients' : 'Recent patients', results: patients }] : []),
      { label: 'Actions', results: actionMatches.map(match => ({ kind: 'action' as const, item: match.item, match })) },
      { label: 'Navigation', results: navigationMatches.map(match => ({ kind: 'navigation' as const, item: match.item, match })) },
    ].filter(group => group.results.length > 0);
  }, [actionMatches, navigationMatches, patientMatches, query, recentPatients]);

  const flatResults = useMemo(() => groups.flatMap(group => group.results), [groups]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setRecentPatients(readRecentPatients());
    setSelectedIndex(0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = priorOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    previousFocusRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) return;
    const timer = window.setTimeout(() => logPatientSearch(query.trim(), patientMatches.length), 350);
    return () => window.clearTimeout(timer);
  }, [isOpen, patientMatches.length, query]);

  useEffect(() => {
    const selected = document.querySelector<HTMLElement>(`[data-palette-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const activate = (result: PaletteResult | undefined) => {
    if (!result) return;
    onClose();
    if (result.kind === 'patient') {
      saveRecentPatient(result.patient);
      setRecentPatients(readRecentPatients());
      logPatientAccess(String(result.patient.id), result.patient.mrn, result.patient.name);
      navigate(`/patients/${result.patient.id}`);
    } else if (result.kind === 'navigation') {
      navigate(result.item.path);
    } else {
      result.item.action();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(index => flatResults.length === 0 ? 0 : (index + 1) % flatResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(index => flatResults.length === 0 ? 0 : (index - 1 + flatResults.length) % flatResults.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setSelectedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setSelectedIndex(Math.max(0, flatResults.length - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activate(flatResults[selectedIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  let resultIndex = 0;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[12vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-[min(620px,calc(100vw-24px))] border-2 border-gray-500 bg-[#ece9d8] shadow-[2px_2px_8px_rgba(0,0,0,0.35)]"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clinical-command-palette-title"
      >
        <div className="ehr-header flex items-center justify-between">
          <span id="clinical-command-palette-title">Clinical Command Palette</span>
          <span className="text-[10px] font-normal text-blue-100">Quick switcher</span>
        </div>
        <div className="border-b border-gray-400 bg-white p-2">
          <div className="flex items-center border border-[#7f9db9] bg-white px-1">
            <Search className="mr-1 h-3.5 w-3.5 text-gray-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => { setQuery(event.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
              className="w-full border-0 py-1 text-[12px] outline-none"
              placeholder="Search patients, navigation, or actions..."
              aria-label="Search command palette"
              aria-controls="clinical-command-palette-results"
              aria-activedescendant={flatResults[selectedIndex] ? `palette-option-${selectedIndex}` : undefined}
            />
          </div>
        </div>
        <div id="clinical-command-palette-results" className="max-h-[52vh] overflow-y-auto p-1" role="listbox" aria-label="Command palette results">
          {groups.map(group => (
            <div key={group.label}>
              <div className="px-2 pb-0.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">{group.label}</div>
              {group.results.map(result => {
                const currentIndex = resultIndex++;
                const selected = currentIndex === selectedIndex;
                const label = result.kind === 'patient'
                  ? result.patient.name
                  : result.kind === 'navigation' ? result.item.label : result.item.label;
                const Icon = result.kind === 'patient'
                  ? User
                  : result.kind === 'navigation' ? result.item.icon : result.item.icon;
                const description = result.kind === 'patient'
                  ? `${result.patient.mrn} • DOB: ${result.patient.dob}`
                  : result.kind === 'navigation' ? result.item.path : result.item.description;
                return (
                  <div
                    key={result.kind === 'patient' ? `patient-${result.patient.id}` : `${result.kind}-${result.kind === 'navigation' ? result.item.path : result.item.id}`}
                    id={`palette-option-${currentIndex}`}
                    data-palette-index={currentIndex}
                    className={`flex cursor-pointer items-center border border-transparent px-2 py-1.5 ${selected ? 'border-blue-400 bg-[#316ac5] text-white' : 'hover:bg-[#d0e0f0]'}`}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    onClick={() => activate(result)}
                    role="option"
                    aria-selected={selected}
                  >
                    <Icon className={`mr-2 h-4 w-4 flex-shrink-0 ${selected ? 'text-white' : 'text-[#336699]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {result.kind === 'patient'
                          ? <HighlightedLabel label={label} indices={fuzzyMatch(query, label)?.indices ?? []} />
                          : label}
                      </div>
                      <div className={`text-[10px] ${selected ? 'text-blue-100' : 'text-gray-500'}`}>{description}</div>
                    </div>
                    {result.kind === 'patient' && (result.patient.flags?.length ?? 0) > 0 && (
                      <span className={`ml-2 text-[9px] ${selected ? 'text-yellow-200' : 'text-gray-600'}`}>{result.patient.flags?.join(', ')}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {flatResults.length === 0 && <div className="p-5 text-center text-[11px] text-gray-500">No matching commands or patients.</div>}
        </div>
        <div className="flex items-center justify-between border-t border-gray-400 bg-[#ece9d8] px-2 py-1 text-[10px] text-gray-600">
          <span>↑↓ Select&nbsp;&nbsp; Home/End Jump&nbsp;&nbsp; Enter Open&nbsp;&nbsp; Esc Close</span>
          <span>{flatResults.length} result{flatResults.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
