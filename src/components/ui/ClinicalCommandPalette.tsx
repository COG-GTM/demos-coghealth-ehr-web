import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Printer, Search, Shield, UserRound, X, type LucideIcon } from 'lucide-react';
import { navItems } from '../../data/navigation';
import { demoPatients, formatPatientDob, formatPatientName } from '../../data/demoPatients';
import { filterPatients, getRecentPatients, rememberRecentPatient } from '../../utils/commandPalette';
import { patientService } from '../../services/patientService';
import { logPatientAccess, logPatientSearch, logPrint } from '../../services/auditService';
import type { Patient } from '../../types';

interface ClinicalCommandPaletteProps {
  onLogout: () => void;
}

type PaletteItem =
  | { kind: 'patient'; patient: Patient }
  | { kind: 'navigation'; path: string; label: string; icon: LucideIcon }
  | { kind: 'action'; label: string; icon: LucideIcon; run: () => void };
type ActionItem = Extract<PaletteItem, { kind: 'action' }>;

interface IndexedItem {
  item: PaletteItem;
  index: number;
}

export default function ClinicalCommandPalette({ onLogout }: ClinicalCommandPaletteProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(false);

  const close = useCallback(() => {
    requestIdRef.current += 1;
    setIsOpen(false);
    setQuery('');
    setPatients([]);
    setHighlightedIndex(0);
    setIsSearching(false);
  }, []);

  const open = useCallback(() => {
    setRecentPatients(getRecentPatients());
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        open();
      }
      if (event.key === 'Escape' && isOpen) close();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [close, isOpen, open]);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) {
      requestIdRef.current += 1;
      return;
    }
    const requestId = ++requestIdRef.current;
    searchTimerRef.current = setTimeout(() => {
      patientService.search(query).then(response => {
        if (requestId !== requestIdRef.current) return;
        const apiPatients = response.content ?? [];
        setHighlightedIndex(0);
        setPatients(apiPatients);
        logPatientSearch(query.trim(), apiPatients.length);
        setIsSearching(false);
      }).catch(() => {
        if (requestId !== requestIdRef.current) return;
        const fallbackPatients = filterPatients(demoPatients, query);
        setHighlightedIndex(0);
        setPatients(fallbackPatients);
        logPatientSearch(query.trim(), fallbackPatients.length);
        setIsSearching(false);
      });
    }, 250);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [isOpen, query]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  useEffect(() => {
    if (!pendingPrint || isOpen) return;
    const timer = setTimeout(() => {
      logPrint(undefined, 'Clinical Command Palette', `Route: ${location.pathname}${location.search}`);
      window.print();
      setPendingPrint(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, location.pathname, location.search, pendingPrint]);

  const actions = useMemo<ActionItem[]>(() => [
    { kind: 'action', label: 'View Audit Log', icon: Shield, run: () => navigate('/settings') },
    { kind: 'action', label: 'Print current view', icon: Printer, run: () => setPendingPrint(true) },
    { kind: 'action', label: 'Lock session / Logout', icon: LogOut, run: onLogout },
  ], [navigate, onLogout]);

  const sections = useMemo(() => {
    const patientItems: PaletteItem[] = (query.trim() ? patients : recentPatients)
      .map(patient => ({ kind: 'patient' as const, patient }));
    const normalizedQuery = query.trim().toLowerCase();
    const navigationItems: PaletteItem[] = navItems
      .filter(item => item.label.toLowerCase().includes(normalizedQuery))
      .map(item => ({ kind: 'navigation' as const, path: item.path, label: item.label, icon: item.icon }));
    const actionItems: PaletteItem[] = actions.filter(action => action.label.toLowerCase().includes(normalizedQuery));
    const groups = {
      patients: patientItems,
      navigation: navigationItems,
      actions: actionItems,
    };
    const items: PaletteItem[] = [...groups.patients, ...groups.navigation, ...groups.actions];
    let index = 0;
    const indexed = (itemsToIndex: PaletteItem[]): IndexedItem[] => itemsToIndex.map(item => ({ item, index: index++ }));
    return {
      patients: indexed(groups.patients),
      navigation: indexed(groups.navigation),
      actions: indexed(groups.actions),
      items,
    };
  }, [actions, patients, query, recentPatients]);

  useEffect(() => {
    const highlighted = listRef.current?.querySelector<HTMLElement>('[data-highlighted="true"]');
    highlighted?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const activate = (item: PaletteItem) => {
    if (item.kind === 'patient') {
      if (item.patient.id === undefined) return;
      rememberRecentPatient(item.patient);
      setRecentPatients(getRecentPatients());
      logPatientAccess(String(item.patient.id), item.patient.mrn ?? '', formatPatientName(item.patient));
      close();
      navigate(`/patients/${item.patient.id}`);
      return;
    }
    close();
    if (item.kind === 'navigation') navigate(item.path);
    else item.run();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (sections.items.length > 0) {
        setHighlightedIndex(index => event.key === 'ArrowDown'
          ? (index + 1) % sections.items.length
          : (index - 1 + sections.items.length) % sections.items.length);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = sections.items[highlightedIndex];
      if (item) activate(item);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-16" onClick={close}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-[560px] max-w-[calc(100vw-24px)] border-2 border-gray-400 bg-white shadow-lg" style={{ fontFamily: 'Tahoma, sans-serif' }} onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between px-2 py-1" style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}>
          <span className="text-white font-semibold text-[11px]">Clinical Command Palette</span>
          <button onClick={close} className="w-5 h-5 flex items-center justify-center text-white hover:bg-white/20" aria-label="Close command palette"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="p-2 bg-[#ece9d8] border-b border-gray-400">
          <div className="flex items-center bg-white border border-[#7f9db9] px-1">
            <Search className="w-3.5 h-3.5 text-gray-500 mr-1" />
            <input ref={inputRef} value={query} onChange={event => { const nextQuery = event.target.value; setHighlightedIndex(0); setPatients([]); setIsSearching(Boolean(nextQuery.trim())); setQuery(nextQuery); }} onKeyDown={handleKeyDown} className="w-full py-1 outline-none text-[11px]" placeholder="Search patients, pages, and actions..." aria-label="Command palette search" />
            {isSearching && <span className="text-[10px] text-gray-500 px-1">Searching...</span>}
          </div>
        </div>
        <div ref={listRef} className="max-h-[360px] overflow-y-auto bg-white p-1">
          {sections.patients.length > 0 && (
            <section>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-[#ece9d8] border-y border-gray-300">
                {query.trim() ? 'Patients' : 'Recent patients'}
              </div>
              {sections.patients.map(({ item, index }) => {
                if (item.kind !== 'patient') return null;
                const highlighted = index === highlightedIndex;
                return (
                  <button
                    key={item.patient.id}
                    data-highlighted={highlighted}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => activate(item)}
                    className={`w-full text-left px-2 py-1.5 flex items-center space-x-2 border-b border-gray-100 ${
                      highlighted ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e0e8f0] text-gray-800'
                    }`}
                  >
                    <UserRound className="w-4 h-4" />
                    <span>
                      <span className="block font-semibold text-[11px]">
                        {formatPatientName(item.patient)}
                      </span>
                      <span className={`block text-[10px] ${highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                        {item.patient.mrn ?? 'No MRN'} • DOB: {formatPatientDob(item.patient.dateOfBirth)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>
          )}
          {sections.navigation.length > 0 && (
            <section>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-[#ece9d8] border-y border-gray-300">
                Go to
              </div>
              {sections.navigation.map(({ item, index }) => {
                if (item.kind !== 'navigation') return null;
                const highlighted = index === highlightedIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    data-highlighted={highlighted}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => activate(item)}
                    className={`w-full text-left px-2 py-1.5 flex items-center space-x-2 ${
                      highlighted ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e0e8f0] text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          )}
          {sections.actions.length > 0 && (
            <section>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-[#ece9d8] border-y border-gray-300">
                Actions
              </div>
              {sections.actions.map(({ item, index }) => {
                if (item.kind !== 'action') return null;
                const highlighted = index === highlightedIndex;
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    data-highlighted={highlighted}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => activate(item)}
                    className={`w-full text-left px-2 py-1.5 flex items-center space-x-2 ${
                      highlighted ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e0e8f0] text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </section>
          )}
          {query.trim() && !isSearching && sections.items.length === 0 && (
            <div className="px-2 py-2 text-[11px] text-gray-500">No matches</div>
          )}
        </div>
        <div className="ehr-status-bar flex justify-between"><span>↑↓ navigate • Enter open • Esc close</span><span>Clinical quick-switcher</span></div>
      </div>
    </div>
  );
}
