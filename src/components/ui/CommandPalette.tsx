import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Search, User, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { defaultPatientSearch, navItems, type PatientSearchEntry } from './commandData';

interface PaletteCommand {
  id: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
  action: () => void;
}

interface CommandGroup {
  label: string;
  commands: PaletteCommand[];
}

function matchesQuery(query: string, values: string[]): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const normalizedValues = values.map((value) => value.toLowerCase());
  if (normalizedValues.some((value) => value.includes(normalizedQuery))) return true;

  return normalizedValues.some((value) => {
    let queryIndex = 0;
    for (const character of value) {
      if (character === normalizedQuery[queryIndex]) queryIndex += 1;
      if (queryIndex === normalizedQuery.length) return true;
    }
    return false;
  });
}

export function CommandPalette() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const closePalette = useCallback(() => setIsOpen(false), []);

  const openPalette = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openPalette();
      } else if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closePalette();
      }
    };

    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [closePalette, isOpen, openPalette]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const groups = useMemo<CommandGroup[]>(() => {
    const navigationCommands = navItems
      .filter((item) => matchesQuery(query, [item.label, item.path]))
      .map((item) => ({
        id: `navigate-${item.path}`,
        label: item.label,
        detail: item.path,
        icon: item.icon,
        action: () => navigate(item.path),
      }));

    const patientCommands = defaultPatientSearch
      .filter((patient) => matchesQuery(query, [patient.name, patient.mrn]))
      .map((patient: PatientSearchEntry) => ({
        id: `patient-${patient.id}`,
        label: patient.name,
        detail: `${patient.mrn} • DOB: ${patient.dob}`,
        icon: User,
        action: () => navigate(`/patients/${patient.id}`),
      }));

    return [
      { label: 'Navigate', commands: navigationCommands },
      { label: 'Patients', commands: patientCommands },
    ].filter((group) => group.commands.length > 0);
  }, [navigate, query]);

  const commands = groups.flatMap((group) => group.commands);

  const activeIndex = commands.length > 0
    ? Math.min(selectedIndex, commands.length - 1)
    : 0;

  const executeCommand = (command: PaletteCommand | undefined) => {
    if (!command) return;
    closePalette();
    command.action();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && commands.length > 0) {
      event.preventDefault();
      setSelectedIndex((index) => (index + 1) % commands.length);
    } else if (event.key === 'ArrowUp' && commands.length > 0) {
      event.preventDefault();
      setSelectedIndex((index) => (index - 1 + commands.length) % commands.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      executeCommand(commands[activeIndex]);
    }
  };

  if (!isOpen) return null;

  let commandIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-black/50" onClick={closePalette} />
      <div
        className="relative w-[560px] max-w-[calc(100vw-2rem)] border-2 border-gray-400 bg-white shadow-lg"
        style={{ fontFamily: 'Tahoma, sans-serif', boxShadow: '2px 2px 8px rgba(0,0,0,0.3)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Quick Actions"
      >
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
        >
          <span className="text-white font-semibold text-[11px]">Quick Actions (Ctrl+K)</span>
          <button
            type="button"
            onClick={closePalette}
            className="w-5 h-5 flex items-center justify-center text-white hover:bg-white/20"
            aria-label="Close quick actions"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-[#ece9d8] p-2">
          <div className="flex items-center border border-[#7f9db9] bg-white px-1">
            <Search className="w-3.5 h-3.5 text-gray-500 mr-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search actions or patients..."
              className="w-full bg-transparent px-1 py-1 text-[11px] focus:outline-none"
              aria-label="Search quick actions"
            />
          </div>
        </div>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto border-t border-gray-400 bg-white p-1">
          {groups.length === 0 && (
            <div className="px-2 py-5 text-center text-[11px] text-gray-500">No results</div>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <div className="border-b border-gray-300 bg-[#d4d0c8] px-2 py-1 text-[10px] font-semibold text-gray-700">
                {group.label}
              </div>
              {group.commands.map((command) => {
                const currentIndex = commandIndex;
                commandIndex += 1;
                const Icon = command.icon;
                const isSelected = currentIndex === activeIndex;
                return (
                  <button
                    key={command.id}
                    type="button"
                    onClick={() => executeCommand(command)}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    className={`flex w-full items-center px-2 py-1.5 text-left text-[11px] ${
                      isSelected ? 'bg-[#316ac5] text-white' : 'text-gray-800 hover:bg-[#e0e8f0]'
                    }`}
                  >
                    <Icon className="mr-2 h-3.5 w-3.5 shrink-0" />
                    <span className="font-semibold">{command.label}</span>
                    {command.detail && (
                      <span className={`ml-auto pl-3 text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                        {command.detail}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-gray-400 bg-[#ece9d8] px-2 py-1 text-[10px] text-gray-600">
          <span>↑↓ Select&nbsp;&nbsp; Enter Open&nbsp;&nbsp; Esc Close</span>
        </div>
      </div>
    </div>
  );
}
