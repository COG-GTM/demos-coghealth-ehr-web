import { AlertTriangle, Ban, User, Zap, type LucideIcon } from 'lucide-react';
import { getMedicationAlerts, type MedicationAlertKind, type MedicationAlertSource } from './medicationAlerts';

const KIND_STYLE: Record<MedicationAlertKind, { icon: LucideIcon; color: string; selectedColor: string }> = {
  interaction: { icon: AlertTriangle, color: 'text-red-600', selectedColor: 'text-yellow-200' },
  allergy: { icon: Ban, color: 'text-orange-600', selectedColor: 'text-orange-200' },
  renal: { icon: Zap, color: 'text-purple-600', selectedColor: 'text-purple-200' },
  geriatric: { icon: User, color: 'text-blue-600', selectedColor: 'text-blue-200' },
};

interface MedicationAlertBadgesProps {
  order: MedicationAlertSource;
  selected?: boolean;
}

export function MedicationAlertBadges({ order, selected = false }: MedicationAlertBadgesProps) {
  const alerts = getMedicationAlerts(order);

  if (alerts.length === 0) {
    return (
      <span className={selected ? 'text-gray-200' : 'text-gray-400'}>
        <span aria-hidden="true">-</span>
        <span className="sr-only">No alerts</span>
      </span>
    );
  }

  return (
    <ul className="flex items-center justify-center space-x-1" aria-label={`${alerts.length} clinical alert${alerts.length === 1 ? '' : 's'}`}>
      {alerts.map(alert => {
        const { icon: Icon, color, selectedColor } = KIND_STYLE[alert.kind];
        return (
          <li key={alert.kind} className="flex">
            <span
              role="img"
              aria-label={alert.description}
              title={alert.description}
              className={`flex items-center font-bold text-[9px] leading-none ${selected ? selectedColor : color}`}
            >
              <Icon className="w-3 h-3" aria-hidden="true" />
              <span aria-hidden="true">{alert.abbreviation}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
