import { FileText, LogOut, Pill } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PaletteAction {
  id: 'new-prescription' | 'audit-log' | 'logout';
  label: string;
  description: string;
  path?: string;
  icon: LucideIcon;
}

export const paletteActions: PaletteAction[] = [
  {
    id: 'new-prescription',
    label: 'New prescription',
    description: 'Open medication management',
    path: '/medications',
    icon: Pill,
  },
  {
    id: 'audit-log',
    label: 'View audit log',
    description: 'Open compliance reports',
    path: '/reports',
    icon: FileText,
  },
  {
    id: 'logout',
    label: 'Log out',
    description: 'End the current session',
    icon: LogOut,
  },
];
