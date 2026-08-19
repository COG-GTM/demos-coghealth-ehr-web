import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DemoPatient } from '../data/patients';
import { demoPatients } from '../data/patients';
import { paletteActions, type PaletteAction } from '../data/commandPalette';
import type { NavigationItem } from '../navigation';
import { navigationItems } from '../navigation';

const RECENT_ITEMS_KEY = 'coghealth_command_palette_recent';
const MAX_RECENT_ITEMS = 5;

interface StoredRecentItem {
  type: 'patient' | 'destination';
  id: string;
  label: string;
  subtitle: string;
  path: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: DemoPatient, query: string, resultCount: number) => void;
  onSelectDestination: (destination: NavigationItem) => void;
  onSelectAction: (action: PaletteAction) => void;
}

interface PaletteRow {
  key: string;
  type: 'patient' | 'destination' | 'action';
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  patient?: DemoPatient;
  destination?: NavigationItem;
  action?: PaletteAction;
  path: string;
}

interface PaletteSection {
  title: string;
  rows: PaletteRow[];
}

function isStoredRecentItem(value: unknown): value is StoredRecentItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    (item.type === 'patient' || item.type === 'destination') &&
    typeof item.id === 'string' &&
    typeof item.label === 'string' &&
    typeof item.subtitle === 'string' &&
    typeof item.path === 'string'
  );
}

function readRecentItems(): StoredRecentItem[] {
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isStoredRecentItem).slice(0, MAX_RECENT_ITEMS) : [];
  } catch {
    return [];
  }
}

function writeRecentItem(item: StoredRecentItem): StoredRecentItem[] {
  const recentItems = [
    item,
    ...readRecentItems().filter(existing => !(existing.type === item.type && existing.id === item.id)),
  ].slice(0, MAX_RECENT_ITEMS);
  localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(recentItems));
  return recentItems;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectPatient,
  onSelectDestination,
  onSelectAction,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [recentItems, setRecentItems] = useState<StoredRecentItem[]>(readRecentItems);
  const [requestedActiveIndex, setRequestedActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const normalizedQuery = query.trim().toLowerCase();

  const sections = useMemo<PaletteSection[]>(() => {
    if (!normalizedQuery) {
      const recentRows: PaletteRow[] = recentItems.flatMap((item): PaletteRow[] => {
        if (item.type === 'patient') {
          const patient = demoPatients.find(candidate => String(candidate.id) === item.id);
          return patient
            ? [{
                key: `patient-${patient.id}`,
                type: 'patient',
                id: String(patient.id),
                title: patient.name,
                subtitle: `${patient.mrn} • DOB: ${patient.dob}`,
                icon: User,
                patient,
                path: `/patients/${patient.id}`,
              }]
            : [];
        }
        const destination = navigationItems.find(candidate => candidate.path === item.path);
        return [{
          key: `destination-${item.id}-${item.path}`,
          type: 'destination',
          id: item.id,
          title: item.label,
          subtitle: item.subtitle,
          icon: destination?.icon ?? Search,
          destination,
          path: item.path,
        }];
      });
      return [{ title: 'Recent', rows: recentRows }];
    }

    const patientRows: PaletteRow[] = demoPatients
      .filter(patient =>
        patient.name.toLowerCase().includes(normalizedQuery) ||
        patient.mrn.toLowerCase().includes(normalizedQuery)
      )
      .map(patient => ({
        key: `patient-${patient.id}`,
        type: 'patient',
        id: String(patient.id),
        title: patient.name,
        subtitle: `${patient.mrn} • DOB: ${patient.dob}`,
        icon: User,
        patient,
        path: `/patients/${patient.id}`,
      }));
    const destinationRows: PaletteRow[] = navigationItems
      .filter(item =>
        item.label.toLowerCase().includes(normalizedQuery) ||
        item.path.toLowerCase().includes(normalizedQuery)
      )
      .map(item => ({
        key: `destination-${item.path}`,
        type: 'destination',
        id: item.path,
        title: item.label,
        subtitle: item.path === '/' ? 'Home' : item.path,
        icon: item.icon,
        destination: item,
        path: item.path,
      }));
    const actionRows: PaletteRow[] = paletteActions
      .filter(action =>
        action.label.toLowerCase().includes(normalizedQuery) ||
        action.description.toLowerCase().includes(normalizedQuery)
      )
      .map(action => ({
        key: `action-${action.id}`,
        type: 'action',
        id: action.id,
        title: action.label,
        subtitle: action.description,
        icon: action.icon,
        action,
        path: action.path ?? '',
      }));

    return [
      { title: 'Patients', rows: patientRows },
      { title: 'Go to', rows: destinationRows },
      { title: 'Actions', rows: actionRows },
    ];
  }, [normalizedQuery, recentItems]);

  const rows = sections.flatMap(section => section.rows);
  const activeIndex = rows.length > 0 ? Math.min(requestedActiveIndex, rows.length - 1) : 0;

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const rememberItem = (item: StoredRecentItem) => {
    setRecentItems(writeRecentItem(item));
  };

  const activateRow = (row: PaletteRow) => {
    if (row.type === 'patient' && row.patient) {
      rememberItem({
        type: 'patient',
        id: row.id,
        label: row.title,
        subtitle: row.subtitle,
        path: row.path,
      });
      onSelectPatient(row.patient, query, rows.filter(candidate => candidate.type === 'patient').length);
      return;
    }
    if (row.type === 'destination') {
      rememberItem({
        type: 'destination',
        id: row.id,
        label: row.title,
        subtitle: row.subtitle,
        path: row.path,
      });
      const destination = row.destination ?? navigationItems.find(item => item.path === row.path);
      if (destination) onSelectDestination(destination);
      return;
    }
    if (row.action) {
      if (row.action.path) {
        rememberItem({
          type: 'destination',
          id: row.action.id,
          label: row.action.label,
          subtitle: row.action.description,
          path: row.action.path,
        });
      }
      onSelectAction(row.action);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && rows.length > 0) {
      event.preventDefault();
      setRequestedActiveIndex(() => (activeIndex + 1) % rows.length);
    } else if (event.key === 'ArrowUp' && rows.length > 0) {
      event.preventDefault();
      setRequestedActiveIndex(() => (activeIndex - 1 + rows.length) % rows.length);
    } else if (event.key === 'Enter' && rows[activeIndex]) {
      event.preventDefault();
      activateRow(rows[activeIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="w-[min(620px,calc(100vw-24px))] border-2 border-gray-500 bg-[#ece9d8] shadow-[2px_2px_8px_rgba(0,0,0,0.35)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b border-[#1a4080] px-2 py-1 text-white"
          style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
        >
          <span id="command-palette-title" className="font-semibold text-[11px]">Clinical Command Palette</span>
          <span className="text-[10px] text-blue-100">Ctrl+K</span>
        </div>
        <div className="border-b border-gray-400 bg-white p-2">
          <div className="flex items-center border border-[#7f9db9] px-1">
            <Search className="mr-1 h-3.5 w-3.5 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              className="w-full border-0 py-1 text-[11px] outline-none"
              aria-label="Search patients, navigation, and actions"
              aria-controls="command-palette-results"
              aria-activedescendant={rows[activeIndex] ? `palette-row-${rows[activeIndex].key}` : undefined}
              placeholder="Search patients, navigation, and actions..."
            />
          </div>
        </div>
        <div id="command-palette-results" role="listbox" className="max-h-[min(420px,60vh)] overflow-auto bg-white p-1">
          {rows.length === 0 ? (
            <div className="px-2 py-3 text-[11px] text-gray-500" role="option" aria-disabled="true">No matches</div>
          ) : (
            sections.map(section => (
              section.rows.length > 0 && (
                <div key={section.title}>
                  <div className="border-b border-gray-300 bg-[#ece9d8] px-2 py-1 text-[10px] font-semibold uppercase text-gray-600">
                    {section.title}
                  </div>
                  {section.rows.map(row => {
                    const rowIndex = rows.findIndex(candidate => candidate.key === row.key);
                    const Icon = row.icon;
                    const isActive = rowIndex === activeIndex;
                    return (
                      <div
                        key={row.key}
                        id={`palette-row-${row.key}`}
                        ref={isActive ? activeRowRef : undefined}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setRequestedActiveIndex(rowIndex)}
                        onClick={() => activateRow(row)}
                        className={`flex cursor-pointer items-center border-b border-gray-200 px-2 py-1.5 text-[11px] ${
                          isActive ? 'bg-[#316ac5] text-white' : 'text-gray-800 hover:bg-blue-50'
                        }`}
                      >
                        <Icon className={`mr-2 h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{row.title}</span>
                          <span className={`block text-[10px] ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>{row.subtitle}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            ))
          )}
        </div>
        <div className="border-t border-gray-400 bg-[#ece9d8] px-2 py-1 text-[10px] text-gray-600">
          ↑↓ Select&nbsp;&nbsp; Enter Open&nbsp;&nbsp; Esc Close
        </div>
      </div>
    </div>
  );
}
