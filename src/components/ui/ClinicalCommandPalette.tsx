import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Printer, Search, Shield, UserRound, X, type LucideIcon } from 'lucide-react';
import { navItems } from '../../data/navigation';
import { demoPatients, formatPatientDob, formatPatientName } from '../../data/demoPatients';
import { filterPatients, getRecentPatients, rememberRecentPatient } from '../../utils/commandPalette';
import { patientService } from '../../services/patientService';
import { logPatientAccess, logPatientSearch } from '../../services/auditService';
import type { Patient } from '../../types';

interface ClinicalCommandPaletteProps {
  onLogout: () => void;
}

type PaletteItem =
  | { kind: 'patient'; patient: Patient }
  | { kind: 'navigation'; path: string; label: string; icon: LucideIcon }
  | { kind: 'action'; label: string; icon: LucideIcon; run: () => void };
type ActionItem = Extract<PaletteItem, { kind: 'action' }>;

export default function ClinicalCommandPalette({ onLogout }: ClinicalCommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const auditTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const close = useCallback(() => {
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
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) {
      return;
    }
    const requestId = ++requestIdRef.current;
    searchTimerRef.current = setTimeout(() => {
      patientService.search(query).then(response => {
        if (requestId !== requestIdRef.current) return;
        const apiPatients = response.content ?? [];
        setPatients(apiPatients.length > 0 ? apiPatients : filterPatients(demoPatients, query));
        setIsSearching(false);
      }).catch(() => {
        if (requestId !== requestIdRef.current) return;
        setPatients(filterPatients(demoPatients, query));
        setIsSearching(false);
      });
    }, 250);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [isOpen, query]);

  useEffect(() => {
    if (!isOpen || !query.trim()) return;
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    auditTimerRef.current = setTimeout(() => logPatientSearch(query.trim(), patients.length), 350);
    return () => {
      if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    };
  }, [isOpen, patients.length, query]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
  }, []);

  const actions = useMemo<ActionItem[]>(() => [
    { kind: 'action', label: 'View Audit Log', icon: Shield, run: () => navigate('/settings') },
    { kind: 'action', label: 'Print current view', icon: Printer, run: () => window.print() },
    { kind: 'action', label: 'Lock session / Logout', icon: LogOut, run: onLogout },
  ], [navigate, onLogout]);

  const items = useMemo<PaletteItem[]>(() => {
    const patientItems = query.trim() ? patients : recentPatients;
    const normalizedQuery = query.trim().toLowerCase();
    const matchingNavItems = navItems.filter(item => item.label.toLowerCase().includes(normalizedQuery));
    const matchingActions = actions.filter(action => action.label.toLowerCase().includes(normalizedQuery));
    return [
      ...patientItems.map(patient => ({ kind: 'patient' as const, patient })),
      ...matchingNavItems.map(item => ({ kind: 'navigation' as const, path: item.path, label: item.label, icon: item.icon })),
      ...matchingActions,
    ];
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
      if (items.length > 0) {
        setHighlightedIndex(index => event.key === 'ArrowDown'
          ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[highlightedIndex];
      if (item) activate(item);
    }
  };

  if (!isOpen) return null;
  const patientItems = query.trim() ? patients : recentPatients;
  const normalizedQuery = query.trim().toLowerCase();
  const matchingNavItems = navItems.filter(item => item.label.toLowerCase().includes(normalizedQuery));
  const matchingActions = actions.filter(action => action.label.toLowerCase().includes(normalizedQuery));

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
          {patientItems.length > 0 && (
            <section>
              <div className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-[#ece9d8] border-y border-gray-300">{query.trim() ? 'Patients' : 'Recent patients'}</div>
              {patientItems.map(patient => {
                const index = items.findIndex(item => item.kind === 'patient' && item.patient.id === patient.id);
                const highlighted = index === highlightedIndex;
                return <button key={patient.id} data-highlighted={highlighted} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => activate({ kind: 'patient', patient })} className={`w-full text-left px-2 py-1.5 flex items-center space-x-2 border-b border-gray-100 ${highlighted ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e0e8f0] text-gray-800'}`}><UserRound className="w-4 h-4" /><span><span className="block font-semibold text-[11px]">{formatPatientName(patient)}</span><span className={`block text-[10px] ${highlighted ? 'text-blue-100' : 'text-gray-500'}`}>{patient.mrn ?? 'No MRN'} • DOB: {formatPatientDob(patient.dateOfBirth)}</span></span></button>;
              })}
            </section>
          )}
          {query.trim() && !isSearching && patientItems.length === 0 && <div className="px-2 py-2 text-[11px] text-gray-500">No matches</div>}
          <section>
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-[#ece9d8] border-y border-gray-300">Go to</div>
            {matchingNavItems.map(item => {
              const index = items.findIndex(result => result.kind === 'navigation' && result.path === item.path);
              const highlighted = index === highlightedIndex;
              const Icon = item.icon;
              return <button key={item.path} data-highlighted={highlighted} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => activate({ kind: 'navigation', path: item.path, label: item.label, icon: item.icon })} className={`w-full text-left px-2 py-1.5 flex items-center space-x-2 ${highlighted ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e0e8f0] text-gray-800'}`}><Icon className="w-4 h-4" /><span>{item.label}</span></button>;
            })}
          </section>
          <section>
            <div className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-[#ece9d8] border-y border-gray-300">Actions</div>
            {matchingActions.map(action => {
              const index = items.findIndex(result => result.kind === 'action' && result.label === action.label);
              const highlighted = index === highlightedIndex;
              const Icon = action.icon;
              return <button key={action.label} data-highlighted={highlighted} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => activate(action)} className={`w-full text-left px-2 py-1.5 flex items-center space-x-2 ${highlighted ? 'bg-[#316ac5] text-white' : 'hover:bg-[#e0e8f0] text-gray-800'}`}><Icon className="w-4 h-4" /><span>{action.label}</span></button>;
            })}
          </section>
        </div>
        <div className="ehr-status-bar flex justify-between"><span>↑↓ navigate • Enter open • Esc close</span><span>Clinical quick-switcher</span></div>
      </div>
    </div>
  );
}
