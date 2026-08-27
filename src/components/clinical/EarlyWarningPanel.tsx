import { AlertTriangle, Activity, ShieldAlert, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { VitalReading } from '../../types';
import type { Consciousness, DeteriorationTrend, RiskLevel } from '../../utils/earlyWarningScore';
import { calculateNews2, screenForSepsis, scoreTrend } from '../../utils/earlyWarningScore';

const riskStyles: Record<RiskLevel, { background: string; border: string; color: string }> = {
  low: { background: '#e8f5e9', border: '#4caf50', color: '#1b5e20' },
  'low-medium': { background: '#fff8e1', border: '#f0ad4e', color: '#664d00' },
  medium: { background: '#fff3cd', border: '#e08e0b', color: '#7a4b00' },
  high: { background: '#ffcccc', border: '#cc0000', color: '#990000' },
};

const scoreCellStyle = (score: number) => {
  if (score >= 3) return { background: '#ffcccc', color: '#990000', fontWeight: 700 };
  if (score === 2) return { background: '#ffe0b2', color: '#7a4b00', fontWeight: 700 };
  if (score === 1) return { background: '#fff9c4', color: '#664d00' };
  return {};
};

function TrendIndicator({ trend }: { trend: DeteriorationTrend }) {
  if (trend.direction === 'worsening') {
    return (
      <span className="flex items-center text-red-700">
        <TrendingUp className="w-3 h-3 mr-0.5" />+{trend.delta} vs prior
      </span>
    );
  }
  if (trend.direction === 'improving') {
    return (
      <span className="flex items-center text-green-700">
        <TrendingDown className="w-3 h-3 mr-0.5" />{trend.delta} vs prior
      </span>
    );
  }
  if (trend.direction === 'stable') {
    return (
      <span className="flex items-center text-gray-600">
        <Minus className="w-3 h-3 mr-0.5" />unchanged vs prior
      </span>
    );
  }
  return <span className="text-gray-500">no prior reading</span>;
}

interface EarlyWarningPanelProps {
  readings: VitalReading[];
  supplementalOxygen: boolean;
  consciousness: Consciousness;
  onSupplementalOxygenChange: (value: boolean) => void;
  onConsciousnessChange: (value: Consciousness) => void;
}

export function EarlyWarningPanel({
  readings,
  supplementalOxygen,
  consciousness,
  onSupplementalOxygenChange,
  onConsciousnessChange,
}: EarlyWarningPanelProps) {
  if (readings.length === 0) {
    return (
      <div className="ehr-panel p-2 text-[11px] text-gray-600">
        No vital signs recorded — early warning score unavailable.
      </div>
    );
  }

  const options = { supplementalOxygen, consciousness };
  const latest = readings[0];
  const score = calculateNews2(latest, options);
  const sepsis = screenForSepsis(latest, options);
  const totals = readings.map(r => calculateNews2(r, options).total);
  const trend = scoreTrend(totals);
  const style = riskStyles[score.risk];

  const chartWidth = 120;
  const chartHeight = 34;
  const chronological = [...totals].reverse();
  const maxTotal = Math.max(...chronological, 7);
  const points = chronological
    .map((total, i) => {
      const x = chronological.length === 1 ? chartWidth : (i / (chronological.length - 1)) * chartWidth;
      const y = chartHeight - (total / maxTotal) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="ehr-panel flex flex-col w-[280px] min-w-[280px] overflow-auto">
      <div className="ehr-header flex items-center space-x-1">
        <Activity className="w-4 h-4" />
        <span>Deterioration Watch (NEWS2)</span>
      </div>

      <div className="p-2 space-y-2">
        <div
          className="flex items-center justify-between px-2 py-1.5 border"
          style={{ background: style.background, borderColor: style.border, color: style.color }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-wide">Aggregate score</div>
            <div className="text-[11px] font-semibold">{score.riskLabel}</div>
          </div>
          <div className="text-2xl font-bold font-mono leading-none">{score.total}</div>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <TrendIndicator trend={trend} />
          <svg width={chartWidth} height={chartHeight} aria-label="NEWS2 trend">
            <polyline points={points} fill="none" stroke={style.border} strokeWidth="1.5" />
          </svg>
        </div>

        <fieldset className="ehr-fieldset">
          <legend>Score Breakdown</legend>
          <table className="w-full text-[10px]">
            <tbody>
              {score.components.map(component => (
                <tr key={component.key}>
                  <td className="px-1 py-0.5 border border-gray-300">{component.label}</td>
                  <td className="px-1 py-0.5 border border-gray-300 font-mono text-right whitespace-nowrap">{component.display}</td>
                  <td className="px-1 py-0.5 border border-gray-300 text-center w-6" style={scoreCellStyle(component.score)}>
                    {component.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {score.missingParameters.length > 0 && (
            <div className="mt-1 text-[10px] text-gray-600">
              Not recorded: {score.missingParameters.join(', ')}
            </div>
          )}
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Clinical Inputs</legend>
          <label className="flex items-center text-[10px] mb-1">
            <input
              type="checkbox"
              className="ehr-checkbox mr-1"
              checked={supplementalOxygen}
              onChange={e => onSupplementalOxygenChange(e.target.checked)}
            />
            On supplemental oxygen
          </label>
          <label className="flex items-center text-[10px]">
            <span className="mr-1">Consciousness:</span>
            <select
              className="ehr-input text-[10px] py-0.5 flex-1"
              value={consciousness}
              onChange={e => onConsciousnessChange(e.target.value as Consciousness)}
            >
              <option value="alert">Alert (A)</option>
              <option value="cvpu">Confusion / V, P or U</option>
            </select>
          </label>
        </fieldset>

        <div
          className="px-2 py-1.5 border text-[10px]"
          style={
            score.risk === 'high' || score.risk === 'medium'
              ? { background: '#ffe9e9', borderColor: '#cc0000', color: '#7a0000' }
              : { background: '#eef4ff', borderColor: '#7a9cc6', color: '#123a63' }
          }
        >
          <div className="flex items-center font-semibold mb-0.5">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Recommended response
          </div>
          <div>{score.escalation}</div>
          <div className="mt-1">Monitoring: {score.monitoringFrequency}</div>
        </div>

        <div
          className="px-2 py-1.5 border text-[10px]"
          style={
            sepsis.positive
              ? { background: '#ffcccc', borderColor: '#cc0000', color: '#990000' }
              : { background: '#e8f5e9', borderColor: '#4caf50', color: '#1b5e20' }
          }
        >
          <div className="flex items-center font-semibold mb-0.5">
            <ShieldAlert className="w-3 h-3 mr-1" />
            Sepsis Screen — {sepsis.positive ? 'POSITIVE' : 'Negative'}
          </div>
          <div>SIRS criteria met: {sepsis.sirsCriteriaMet.length}/3</div>
          {sepsis.sirsCriteriaMet.length > 0 && (
            <ul className="list-disc list-inside">
              {sepsis.sirsCriteriaMet.map(criterion => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          )}
          <div className="mt-0.5">qSOFA: {sepsis.qsofaScore}/3</div>
          <div className="mt-1">{sepsis.recommendation}</div>
        </div>

        <div className="text-[9px] text-gray-500">
          NEWS2 (Royal College of Physicians) computed from the most recent recorded observation set
          ({latest.timestamp}). Decision support only — clinical judgement required.
        </div>
      </div>
    </div>
  );
}
