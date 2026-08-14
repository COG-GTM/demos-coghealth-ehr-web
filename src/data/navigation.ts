import {
  Activity,
  Calendar,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

export const navItems: NavigationItem[] = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/patients', icon: Users, label: 'Patients' },
  { path: '/schedule', icon: Calendar, label: 'Schedule' },
  { path: '/labs', icon: FlaskConical, label: 'Lab Results' },
  { path: '/vitals', icon: Activity, label: 'Vitals' },
  { path: '/medications', icon: Pill, label: 'Medications' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];
