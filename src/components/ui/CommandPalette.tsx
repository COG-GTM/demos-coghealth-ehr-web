import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Printer,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';

export interface CommandPaletteNavigationItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

interface CommandPalettePatient {
  id: number;
  name: string;
  mrn: string;
  dob: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  navigationItems: CommandPaletteNavigationItem[];
  patients: CommandPalettePatient[];
  onLogout: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  detail?: string;
  section: 'NAVIGATION' | 'PATIENTS' | 'ACTIONS';
  icon: LucideIcon;
  execute: () => void;
}

export default function CommandPalette({
  isOpen,
  onOpen,
  onClose,
  navigationItems,
  patients,
  onLogout,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [onOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const commandItems = useMemo(() => {
    const matches = (value: string) =>
      normalizedQuery.length === 0 || value.toLowerCase().includes(normalizedQuery);

    const navigationCommands: PaletteItem[] = navigationItems
      .filter((item) => matches(item.label))
      .map((item) => ({
        id: `navigation-${item.path}`,
        label: item.label,
        section: 'NAVIGATION' as const,
        icon: item.icon,
        execute: () => {
          navigate(item.path);
          onClose();
        },
      }));

    const patientCommands: PaletteItem[] = normalizedQuery.length > 0
      ? patients
        .filter((patient) =>
          patient.name.toLowerCase().includes(normalizedQuery) ||
          patient.mrn.toLowerCase().includes(normalizedQuery)
        )
        .map((patient) => ({
          id: `patient-${patient.id}`,
          label: patient.name,
          detail: `${patient.mrn} • DOB: ${patient.dob}`,
          section: 'PATIENTS' as const,
          icon: Search,
          execute: () => {
            navigate(`/patients/${patient.id}`);
            onClose();
          },
        }))
      : [];

    const actionCommands: PaletteItem[] = [
      {
        id: 'action-print-chart',
        label: 'Print Chart',
        section: 'ACTIONS' as const,
        icon: Printer,
        execute: () => {
          window.print();
          onClose();
        },
      },
      {
        id: 'action-logout',
        label: 'Logout',
        section: 'ACTIONS' as const,
        icon: LogOut,
        execute: () => {
          onLogout();
          onClose();
        },
      },
    ].filter((item) => matches(item.label));

    return [...navigationCommands, ...patientCommands, ...actionCommands];
  }, [navigate, navigationItems, normalizedQuery, onClose, onLogout, patients]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((current) =>
          commandItems.length === 0 ? 0 : (current + 1) % commandItems.length
        );
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((current) =>
          commandItems.length === 0
            ? 0
            : (current - 1 + commandItems.length) % commandItems.length
        );
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        commandItems[highlightedIndex]?.execute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandItems, highlightedIndex, isOpen]);

  if (!isOpen) return null;

  const sections = ['NAVIGATION', 'PATIENTS', 'ACTIONS'] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{ fontFamily: 'Tahoma, sans-serif' }}
    >
      <div
        className="w-[480px] max-w-[calc(100vw-24px)] border-2 border-gray-400 bg-white shadow-lg"
        style={{ boxShadow: '2px 2px 8px rgba(0,0,0,0.3)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{ background: 'linear-gradient(to bottom, #6699cc 0%, #336699 100%)' }}
        >
          <span className="text-[11px] font-semibold text-white">Command Palette</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center text-white hover:bg-white/20"
            aria-label="Close command palette"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="bg-[#ece9d8] p-2">
          <div className="flex items-center border border-[#7f9db9] bg-white px-1">
            <Search className="mr-1 h-3 w-3 text-gray-500" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search commands, patients, or actions..."
              className="w-full bg-transparent py-1 text-[11px] text-gray-800 outline-none"
              aria-label="Search commands, patients, or actions"
            />
          </div>

          <div className="mt-2 max-h-72 overflow-y-auto border border-gray-400 bg-white">
            {sections.map((section) => {
              const sectionItems = commandItems.filter((item) => item.section === section);
              if (sectionItems.length === 0) return null;

              return (
                <div key={section}>
                  <div className="border-b border-gray-300 bg-[#d4d0c8] px-2 py-1 text-[10px] font-semibold text-gray-600">
                    {section}
                  </div>
                  {sectionItems.map((item) => {
                    const itemIndex = commandItems.indexOf(item);
                    const Icon = item.icon;
                    const isHighlighted = itemIndex === highlightedIndex;

                    return (
                      <button
                        type="button"
                        key={item.id}
                        ref={isHighlighted ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                        onClick={item.execute}
                        onMouseEnter={() => setHighlightedIndex(itemIndex)}
                        className={`flex w-full items-center border-b border-gray-200 px-2 py-1.5 text-left text-[11px] ${
                          isHighlighted ? 'bg-[#316ac5] text-white' : 'text-gray-800 hover:bg-blue-50'
                        }`}
                        aria-selected={isHighlighted}
                      >
                        <Icon className="mr-2 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0">
                          <span className="block">{item.label}</span>
                          {item.detail && (
                            <span className={`block text-[10px] ${isHighlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                              {item.detail}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {commandItems.length === 0 && (
              <div className="px-2 py-5 text-center text-[11px] text-gray-500">No results</div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-400 bg-[#ece9d8] px-2 py-1 text-[10px] text-gray-600">
          ↑↓ navigate&nbsp;&nbsp; Enter select&nbsp;&nbsp; Esc close
        </div>
      </div>
    </div>
  );
}
