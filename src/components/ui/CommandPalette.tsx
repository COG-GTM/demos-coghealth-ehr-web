import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import type { Patient } from '../../types';
import { navItems } from '../../utils/navigation';
import { addRecentPatient, getRecentPatients, type RecentPatient } from '../../utils/recentPatients';
import { demoPatients } from '../../utils/demoPatients';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type CommandItem =
  | {
      type: 'navigate';
      label: string;
      path: string;
      icon: typeof navItems[number]['icon'];
    }
  | {
      type: 'patient';
      id: number;
      name: string;
      mrn: string;
    };

interface CommandGroup {
  label: string;
  items: CommandItem[];
}

const matchesQuery = (value: string, query: string) =>
  value.toLowerCase().includes(query.toLowerCase());

const toPatientItem = (patient: Patient): CommandItem | null => {
  if (typeof patient.id !== 'number' || typeof patient.mrn !== 'string') return null;
  return {
    type: 'patient',
    id: patient.id,
    name: `${patient.lastName}, ${patient.firstName}`,
    mrn: patient.mrn,
  };
};

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recentPatients] = useState<RecentPatient[]>(getRecentPatients);
  const [patientResults, setPatientResults] = useState<CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const searchQuery = query.trim();
    if (searchQuery.length < 2) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void patientService.search(searchQuery, 0, 6)
        .then((result) => {
          if (cancelled) return;
          const results = result.content
            .map(toPatientItem)
            .filter((patient): patient is CommandItem => patient !== null);
          setPatientResults(results);
          setIsSearching(false);
        })
        .catch(() => {
          if (cancelled) return;
          setPatientResults(
            demoPatients
              .filter((patient) =>
                matchesQuery(patient.name, searchQuery) || matchesQuery(patient.mrn, searchQuery),
              )
              .map((patient) => ({
                type: 'patient' as const,
                id: patient.id,
                name: patient.name,
                mrn: patient.mrn,
              })),
          );
          setIsSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const groups = useMemo<CommandGroup[]>(() => {
    const searchQuery = query.trim();
    const navigateItems: CommandItem[] = navItems
      .filter((item) => !searchQuery || matchesQuery(item.label, searchQuery))
      .map((item) => ({
        type: 'navigate' as const,
        label: item.label,
        path: item.path,
        icon: item.icon,
      }));
    const recentItems: CommandItem[] = recentPatients
      .filter(
        (patient) =>
          !searchQuery ||
          matchesQuery(patient.name, searchQuery) ||
          matchesQuery(patient.mrn, searchQuery),
      )
      .map((patient) => ({
        type: 'patient' as const,
        id: patient.id,
        name: patient.name,
        mrn: patient.mrn,
      }));

    const result: CommandGroup[] = [];
    if (navigateItems.length > 0) result.push({ label: 'Navigate', items: navigateItems });
    if (recentItems.length > 0) result.push({ label: 'Recent Patients', items: recentItems });
    if (searchQuery.length >= 2 && !isSearching && patientResults.length > 0) {
      result.push({ label: 'Patients', items: patientResults });
    }
    return result;
  }, [isSearching, patientResults, query, recentPatients]);

  const allItems = groups.flatMap((group) => group.items);
  const selectedIndex = allItems.length > 0
    ? Math.min(highlightedIndex, allItems.length - 1)
    : 0;

  const execute = (item: CommandItem) => {
    if (item.type === 'navigate') {
      navigate(item.path);
    } else {
      addRecentPatient({ id: item.id, name: item.name, mrn: item.mrn });
      navigate(`/patients/${item.id}`);
    }
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (allItems.length > 0) {
        setHighlightedIndex((index) => (index + 1) % allItems.length);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (allItems.length > 0) {
        setHighlightedIndex((index) => (index - 1 + allItems.length) % allItems.length);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selectedItem = allItems[selectedIndex];
      if (selectedItem) execute(selectedItem);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  let itemIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/30"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative mx-auto mt-[80px] w-[520px] border border-gray-500 bg-[#ece9d8] shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick Actions"
      >
        <div className="ehr-header flex items-center justify-between">
          <span>Quick Actions</span>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-normal text-blue-100">Esc to close</span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-4 w-4 items-center justify-center text-white hover:bg-white/20"
              aria-label="Close command palette"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="p-2">
          <div className="flex items-center space-x-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setHighlightedIndex(0);
                setPatientResults([]);
                setIsSearching(nextQuery.trim().length >= 2);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="ehr-input w-full"
              placeholder="Type a command or patient name / MRN..."
              aria-label="Type a command or patient name or MRN"
            />
            <span className="whitespace-nowrap border border-gray-400 bg-gray-200 px-1 text-[10px] text-gray-600">
              Ctrl+K
            </span>
          </div>

          <div className="mt-2 max-h-[320px] overflow-y-auto border border-gray-400 bg-white">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="ehr-subheader">{group.label}</div>
                {group.items.map((item) => {
                  itemIndex += 1;
                  const currentIndex = itemIndex;
                  const Icon = item.type === 'navigate' ? item.icon : null;
                  return (
                    <button
                      type="button"
                      key={item.type === 'navigate' ? item.path : `${item.id}-${item.mrn}`}
                      onMouseEnter={() => setHighlightedIndex(currentIndex)}
                      onClick={() => execute(item)}
                      className={`flex w-full items-center border-b border-gray-200 px-2 py-1 text-left text-[11px] ${
                        currentIndex === selectedIndex
                          ? 'bg-[#316ac5] text-white'
                          : 'text-gray-800 hover:bg-blue-100'
                      }`}
                    >
                      {Icon ? <Icon className="mr-2 h-3.5 w-3.5" /> : <span className="mr-2 w-3.5" />}
                      <span className="flex-1">{item.type === 'navigate' ? item.label : item.name}</span>
                      {item.type === 'patient' && (
                        <span className={`text-[10px] ${currentIndex === selectedIndex ? 'text-blue-100' : 'text-gray-500'}`}>
                          {item.mrn}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
            {query.trim().length >= 2 && isSearching && (
              <div className="px-2 py-2 text-[11px] text-gray-500">Searching...</div>
            )}
            {query.trim().length >= 2 && !isSearching && patientResults.length === 0 && (
              <div className="px-2 py-2 text-[11px] text-gray-500">No patients found</div>
            )}
            {groups.length === 0 && query.trim().length < 2 && (
              <div className="px-2 py-2 text-[11px] text-gray-500">No commands found</div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-400 px-2 py-1 text-[10px] text-gray-600">
          ↑↓ navigate&nbsp;&nbsp;&nbsp; Enter select&nbsp;&nbsp;&nbsp; Esc close
        </div>
      </div>
    </div>
  );
}
