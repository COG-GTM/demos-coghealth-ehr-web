import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  RefreshCw,
  AlertTriangle,
  Activity,
  ClipboardList,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { chronicService } from '../services/chronicService';
import type {
  AdherenceDistribution,
  AdherenceStatus,
  AtRiskPatient,
  CareGap,
  CareGapPriority,
  ChronicConditionType,
  ChronicDashboardSummary,
} from '../types/chronic';

const conditionLabels: Record<ChronicConditionType, string> = {
  DIABETES_TYPE_1: 'Type 1 Diabetes',
  DIABETES_TYPE_2: 'Type 2 Diabetes',
  HYPERTENSION: 'Hypertension',
  COPD: 'COPD',
  CHF: 'Heart Failure',
  CKD: 'Chronic Kidney Disease',
  ASTHMA: 'Asthma',
  OBESITY: 'Obesity',
  HYPERLIPIDEMIA: 'Hyperlipidemia',
  ATRIAL_FIBRILLATION: 'Atrial Fibrillation',
};

const adherenceLabels: Record<AdherenceStatus, string> = {
  ADHERENT: 'Adherent',
  PARTIALLY_ADHERENT: 'Partially Adherent',
  NON_ADHERENT: 'Non-Adherent',
  UNKNOWN: 'Unknown',
};

const priorityOrder: Record<CareGapPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type SortKey = 'patientName' | 'currentPdc' | 'lastFillDate' | 'nextFillDue' | 'daysOverdue';
type SortDir = 'asc' | 'desc';

function pdcAsPercent(pdc?: number): number | null {
  if (pdc === undefined || pdc === null || Number.isNaN(pdc)) return null;
  // Backend returns BigDecimal serialized as a number 0..1 (or sometimes 0..100).
  // Treat values <= 1 as fractions, otherwise as already-percent.
  return pdc <= 1 ? Math.round(pdc * 100) : Math.round(pdc);
}

function pdcColor(pdcPct: number | null): { color: string; bg: string; border: string } {
  if (pdcPct === null) return { color: '#555', bg: '#f0f0f0', border: '#999' };
  if (pdcPct >= 80) return { color: '#0a5d23', bg: '#d4edda', border: '#27ae60' };
  if (pdcPct >= 50) return { color: '#7a5500', bg: '#fff3cd', border: '#cc9900' };
  return { color: '#990000', bg: '#ffcccc', border: '#cc0000' };
}

function priorityClass(priority: CareGapPriority): string {
  switch (priority) {
    case 'CRITICAL':
      return 'ehr-alert-critical';
    case 'HIGH':
      return 'ehr-alert-warning';
    case 'MEDIUM':
      return 'ehr-alert-info';
    case 'LOW':
    default:
      return '';
  }
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function deriveDistribution(patients: AtRiskPatient[]): AdherenceDistribution {
  const dist: AdherenceDistribution = { adherent: 0, partiallyAdherent: 0, nonAdherent: 0, unknown: 0 };
  for (const p of patients) {
    switch (p.adherenceStatus) {
      case 'ADHERENT':
        dist.adherent += 1;
        break;
      case 'PARTIALLY_ADHERENT':
        dist.partiallyAdherent += 1;
        break;
      case 'NON_ADHERENT':
        dist.nonAdherent += 1;
        break;
      default:
        dist.unknown += 1;
    }
  }
  return dist;
}

function aggregateGaps(gaps: CareGap[]): Map<string, CareGap[]> {
  const grouped = new Map<string, CareGap[]>();
  for (const gap of gaps) {
    const key = gap.gapType || 'Other';
    const list = grouped.get(key) ?? [];
    list.push(gap);
    grouped.set(key, list);
  }
  return grouped;
}

export default function ChronicCareDashboardPage() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<ChronicDashboardSummary | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskPatient[]>([]);
  const [careGaps, setCareGaps] = useState<CareGap[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('currentPdc');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedGapTypes, setExpandedGapTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const results = await Promise.allSettled([
        chronicService.getDashboardSummary(),
        chronicService.getAtRiskPatients(),
        chronicService.getCareGaps(),
      ]);
      if (cancelled) return;

      const [summaryRes, atRiskRes, gapsRes] = results;
      const fetchedAtRisk = atRiskRes.status === 'fulfilled' ? atRiskRes.value : [];
      const fetchedGaps = gapsRes.status === 'fulfilled' ? gapsRes.value : [];
      const fetchedSummary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;

      setAtRisk(fetchedAtRisk);
      setCareGaps(fetchedGaps);
      setSummary(fetchedSummary);

      const allFailed =
        summaryRes.status === 'rejected' &&
        atRiskRes.status === 'rejected' &&
        gapsRes.status === 'rejected';
      setError(allFailed ? 'Unable to load chronic care data. The backend may be unavailable.' : null);

      setLastRefreshed(new Date());
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const distribution = useMemo<AdherenceDistribution>(() => {
    if (summary?.adherenceDistribution) return summary.adherenceDistribution;
    return deriveDistribution(atRisk);
  }, [summary, atRisk]);

  const distributionTotal = useMemo(
    () =>
      distribution.adherent +
      distribution.partiallyAdherent +
      distribution.nonAdherent +
      distribution.unknown,
    [distribution],
  );

  const sortedAtRisk = useMemo(() => {
    const copy = [...atRisk];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'patientName':
          return dir * a.patientName.localeCompare(b.patientName);
        case 'currentPdc': {
          const ap = pdcAsPercent(a.currentPdc) ?? Number.POSITIVE_INFINITY;
          const bp = pdcAsPercent(b.currentPdc) ?? Number.POSITIVE_INFINITY;
          return dir * (ap - bp);
        }
        case 'lastFillDate':
          return dir * (a.lastFillDate ?? '').localeCompare(b.lastFillDate ?? '');
        case 'nextFillDue':
          return dir * (a.nextFillDue ?? '').localeCompare(b.nextFillDue ?? '');
        case 'daysOverdue':
          return dir * ((a.daysOverdue ?? 0) - (b.daysOverdue ?? 0));
        default:
          return 0;
      }
    });
    return copy;
  }, [atRisk, sortKey, sortDir]);

  const groupedGaps = useMemo(() => aggregateGaps(careGaps), [careGaps]);

  const totalEnrolled = summary?.totalEnrolled ?? null;
  const atRiskCount = summary?.atRiskCount ?? atRisk.length;
  const openCareGaps = summary?.openCareGaps ?? careGaps.length;
  const averagePdcPct = pdcAsPercent(summary?.averagePdc);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'patientName' ? 'asc' : key === 'currentPdc' ? 'asc' : 'desc');
    }
  };

  const toggleGap = (gapType: string) => {
    setExpandedGapTypes((prev) => {
      const next = new Set(prev);
      if (next.has(gapType)) next.delete(gapType);
      else next.add(gapType);
      return next;
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  return (
    <div className="h-full flex flex-col relative" style={{ background: '#d4d0c8' }}>
      <LoadingOverlay isLoading={loading} text="Loading chronic care data..." />

      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            className="ehr-toolbar-button flex items-center"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </button>
          <span className="text-gray-400">|</span>
          <span className="flex items-center px-2 text-[11px] text-gray-700">
            <HeartPulse className="w-3.5 h-3.5 mr-1 text-blue-700" />
            <span className="font-semibold">Chronic Care Dashboard</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-gray-600">
          {lastRefreshed && <span>Last refreshed: {lastRefreshed.toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {error && (
          <div className="ehr-alert-warning px-2 py-1 text-[11px] flex items-center">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <SummaryCard
            icon={<Activity className="w-4 h-4 text-blue-700" />}
            label="Total Enrolled"
            value={totalEnrolled !== null ? totalEnrolled.toLocaleString() : '—'}
            sublabel="Patients in disease management programs"
          />
          <SummaryCard
            icon={<AlertTriangle className="w-4 h-4 text-red-700" />}
            label="At-Risk Patients"
            value={atRiskCount.toLocaleString()}
            sublabel="Non-adherent or trending down"
            tone={atRiskCount > 0 ? 'alert' : 'normal'}
          />
          <SummaryCard
            icon={<ClipboardList className="w-4 h-4 text-amber-700" />}
            label="Open Care Gaps"
            value={openCareGaps.toLocaleString()}
            sublabel="Outstanding actions for the population"
          />
          <SummaryCard
            icon={<TrendingUp className="w-4 h-4 text-green-700" />}
            label="Avg PDC"
            value={averagePdcPct !== null ? `${averagePdcPct}%` : '—'}
            sublabel="Population proportion of days covered"
            tone={averagePdcPct !== null && averagePdcPct < 80 ? 'alert' : 'normal'}
          />
        </div>

        {/* Adherence Overview */}
        <fieldset className="ehr-fieldset">
          <legend>Adherence Distribution</legend>
          {distributionTotal === 0 ? (
            <div className="text-[11px] text-gray-500 px-1 py-2">
              No adherence data available.
            </div>
          ) : (
            <div className="space-y-1">
              <DistributionBar
                label={adherenceLabels.ADHERENT}
                value={distribution.adherent}
                total={distributionTotal}
                color="#27ae60"
              />
              <DistributionBar
                label={adherenceLabels.PARTIALLY_ADHERENT}
                value={distribution.partiallyAdherent}
                total={distributionTotal}
                color="#cc9900"
              />
              <DistributionBar
                label={adherenceLabels.NON_ADHERENT}
                value={distribution.nonAdherent}
                total={distributionTotal}
                color="#cc0000"
              />
              <DistributionBar
                label={adherenceLabels.UNKNOWN}
                value={distribution.unknown}
                total={distributionTotal}
                color="#888"
              />
            </div>
          )}
        </fieldset>

        {/* Two-column layout: at-risk + care gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* At-Risk Patients */}
          <div className="ehr-panel lg:col-span-2 flex flex-col">
            <div className="ehr-header flex items-center justify-between">
              <span>At-Risk Patients</span>
              <span className="text-[10px] text-blue-100">
                {sortedAtRisk.length} patient{sortedAtRisk.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 360 }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr>
                    <SortableTh label="Patient" active={sortKey === 'patientName'} onClick={() => handleSort('patientName')} icon={renderSortIcon('patientName')} />
                    <th className="px-2 py-1 text-left">Condition / Medication</th>
                    <SortableTh label="PDC" active={sortKey === 'currentPdc'} onClick={() => handleSort('currentPdc')} icon={renderSortIcon('currentPdc')} />
                    <th className="px-2 py-1 text-left">Status</th>
                    <SortableTh label="Last Fill" active={sortKey === 'lastFillDate'} onClick={() => handleSort('lastFillDate')} icon={renderSortIcon('lastFillDate')} />
                    <SortableTh label="Next Due" active={sortKey === 'nextFillDue'} onClick={() => handleSort('nextFillDue')} icon={renderSortIcon('nextFillDue')} />
                    <SortableTh label="Days Overdue" active={sortKey === 'daysOverdue'} onClick={() => handleSort('daysOverdue')} icon={renderSortIcon('daysOverdue')} />
                    <th className="px-2 py-1 text-left">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAtRisk.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="px-2 py-3 text-center text-gray-500">
                        No at-risk patients at this time.
                      </td>
                    </tr>
                  )}
                  {sortedAtRisk.map((p, idx) => {
                    const pct = pdcAsPercent(p.currentPdc);
                    const colors = pdcColor(pct);
                    return (
                      <tr
                        key={`${p.patientId}-${p.medicationName ?? idx}`}
                        onClick={() => navigate(`/patients/${p.patientId}`)}
                        className={`cursor-pointer hover:bg-blue-50 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}
                        title="Open patient chart"
                      >
                        <td className="px-2 py-1.5">
                          <div className="font-semibold">{p.patientName}</div>
                          {p.patientMrn && (
                            <div className="text-[10px] text-gray-500">{p.patientMrn}</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {p.conditionType && (
                            <div className="text-[10px] text-gray-600">
                              {conditionLabels[p.conditionType] ?? p.conditionType}
                            </div>
                          )}
                          {p.medicationName && <div>{p.medicationName}</div>}
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className="inline-block px-1.5 py-0.5 font-semibold"
                            style={{
                              color: colors.color,
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {pct !== null ? `${pct}%` : '—'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          {p.adherenceStatus ? adherenceLabels[p.adherenceStatus] : '—'}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">{formatDate(p.lastFillDate)}</td>
                        <td className="px-2 py-1.5 text-gray-600">{formatDate(p.nextFillDue)}</td>
                        <td className="px-2 py-1.5">
                          {p.daysOverdue && p.daysOverdue > 0 ? (
                            <span className="text-red-700 font-semibold">{p.daysOverdue}d</span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">{p.riskReason ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Care Gaps */}
          <div className="ehr-panel flex flex-col">
            <div className="ehr-header flex items-center justify-between">
              <span>Care Gaps</span>
              <span className="text-[10px] text-blue-100">
                {careGaps.length} gap{careGaps.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 360 }}>
              {groupedGaps.size === 0 && !loading && (
                <div className="px-2 py-3 text-[11px] text-center text-gray-500">
                  No outstanding care gaps.
                </div>
              )}
              {Array.from(groupedGaps.entries()).map(([gapType, gaps]) => {
                const expanded = expandedGapTypes.has(gapType);
                const sortedGaps = [...gaps].sort(
                  (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
                );
                const topPriority = sortedGaps[0]?.priority ?? 'LOW';
                return (
                  <div key={gapType} className="border-b border-gray-300">
                    <button
                      type="button"
                      onClick={() => toggleGap(gapType)}
                      className="w-full text-left px-2 py-1 flex items-center justify-between hover:bg-gray-100"
                      style={{ background: 'linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%)' }}
                    >
                      <div className="flex items-center space-x-2">
                        {expanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        <span className="font-semibold text-[11px]">{gapType}</span>
                        <span className="text-[10px] text-gray-600">({gaps.length})</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 ${priorityClass(topPriority)}`}
                      >
                        {topPriority}
                      </span>
                    </button>
                    {expanded && (
                      <ul className="text-[11px]">
                        {sortedGaps.map((gap, idx) => (
                          <li
                            key={`${gap.patientId ?? 'pop'}-${idx}`}
                            className={`px-2 py-1 border-t border-gray-200 ${
                              gap.patientId ? 'cursor-pointer hover:bg-blue-50' : ''
                            }`}
                            onClick={() => gap.patientId && navigate(`/patients/${gap.patientId}`)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold">
                                {gap.patientName ?? 'Population'}
                              </div>
                              <span
                                className={`text-[10px] px-1 ${priorityClass(gap.priority)}`}
                              >
                                {gap.priority}
                              </span>
                            </div>
                            <div className="text-gray-700">{gap.description}</div>
                            {gap.recommendation && (
                              <div className="text-[10px] text-gray-500 italic">
                                Recommendation: {gap.recommendation}
                              </div>
                            )}
                            {gap.dueDate && (
                              <div className="text-[10px] text-gray-500">
                                Due: {formatDate(gap.dueDate)}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>
          Chronic Care | {atRisk.length} at-risk · {careGaps.length} care gap(s)
          {totalEnrolled !== null ? ` · ${totalEnrolled} enrolled` : ''}
        </span>
        <span>{lastRefreshed ? `Last refreshed: ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'}</span>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  tone?: 'normal' | 'alert';
}

function SummaryCard({ icon, label, value, sublabel, tone = 'normal' }: SummaryCardProps) {
  return (
    <div
      className="ehr-panel p-2"
      style={{
        background: tone === 'alert' ? '#fff8f0' : '#ffffff',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wide text-gray-600 font-semibold flex items-center">
          <span className="mr-1">{icon}</span>
          {label}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800 mt-1">{value}</div>
      {sublabel && <div className="text-[10px] text-gray-500">{sublabel}</div>}
    </div>
  );
}

interface SortableThProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

function SortableTh({ label, active, onClick, icon }: SortableThProps) {
  return (
    <th
      className={`px-2 py-1 text-left cursor-pointer select-none ${active ? 'text-blue-800' : ''}`}
      onClick={onClick}
    >
      {label}
      {icon}
    </th>
  );
}

interface DistributionBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function DistributionBar({ label, value, total, color }: DistributionBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center text-[11px]">
      <div className="w-32 text-gray-700">{label}</div>
      <div className="flex-1 h-3 bg-gray-200 border border-gray-400 mr-2 relative">
        <div
          className="h-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-20 text-right text-gray-700">
        {value} ({pct}%)
      </div>
    </div>
  );
}
