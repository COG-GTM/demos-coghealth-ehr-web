import type { CSSProperties } from 'react';
import type { Consciousness, RiskBand } from '../../utils/news2';
import { calculateNews2, news2Trend } from '../../utils/news2';
import type { VitalReading } from '../../types';

interface EarlyWarningPanelProps {
  readings: VitalReading[];
  consciousness?: Consciousness;
  onSupplementalOxygen?: boolean;
}

const bandStyles: Record<string, CSSProperties> = {
  low: { background: '#dfffdf', color: '#006600' },
  'low-medium': { background: '#fff3cd', color: '#664d00' },
  medium: { background: '#ffe0b2', color: '#8a4b00' },
  high: { background: '#ffcccc', color: '#990000' },
};

const bandChartColors: Record<RiskBand, string> = {
  low: '#66aa66',
  'low-medium': '#c79e2b',
  medium: '#d9822b',
  high: '#cc3333',
};

export default function EarlyWarningPanel({
  readings,
  consciousness = 'A',
  onSupplementalOxygen = false,
}: EarlyWarningPanelProps) {
  const results = readings.map(reading => calculateNews2(reading, {
    consciousness,
    onSupplementalOxygen,
  }));
  const currentResult = results[0];
  const trend = news2Trend(results.map(result => result.total));
  const previousTime = readings[1]?.timestamp.split(' ')[1] ?? 'previous reading';
  const trendColor = trend.trend === 'rising' ? '#990000' : trend.trend === 'falling' ? '#006600' : '#666666';
  const trendArrow = trend.trend === 'rising' ? '↑' : trend.trend === 'falling' ? '↓' : '→';
  const displayReadings = readings.slice().reverse();
  const displayResults = results.slice().reverse();
  const maxScore = Math.max(...results.map(result => result.total), 1);

  if (!currentResult) {
    return (
      <div className="ehr-panel ehr-early-warning-panel m-2 p-2 text-[11px]">
        <div className="ehr-header -m-2 mb-2">Deterioration Watch</div>
        <div className="text-gray-600">No vital sign readings available.</div>
      </div>
    );
  }

  return (
    <div className="ehr-panel ehr-early-warning-panel m-2 p-2 text-[11px]">
      <div className="ehr-header -mx-2 -mt-2 mb-2 flex items-center justify-between">
        <span>Deterioration Watch</span>
        <span className="text-[10px] font-normal">NEWS2 clinical early-warning score</span>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[140px_170px_1fr]">
        <fieldset className="ehr-fieldset m-0">
          <legend>Current score</legend>
          <div className="flex items-center gap-2">
            <span className="font-mono text-3xl font-bold leading-none">{currentResult.total}</span>
            <span
              className="border border-current px-1.5 py-0.5 text-[10px] font-bold"
              style={bandStyles[currentResult.band]}
            >
              {currentResult.bandLabel}
            </span>
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset m-0">
          <legend>Trend</legend>
          <div className="text-base font-bold" style={{ color: trendColor }}>
            {trendArrow} {trend.delta >= 0 ? '+' : ''}{trend.delta}
          </div>
          <div className="text-[10px] text-gray-600">
            {trend.trend === 'stable' ? 'No change' : trend.trend === 'rising' ? 'Score rising' : 'Score falling'} since {previousTime}
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset m-0">
          <legend>Score history (oldest to newest)</legend>
          <svg viewBox="0 0 260 58" className="h-14 w-full" role="img" aria-label="NEWS2 score history">
            <line x1="4" y1="48" x2="256" y2="48" stroke="#999" strokeWidth="1" />
            {displayResults.map((result, index) => {
              const slotWidth = 252 / Math.max(displayResults.length, 1);
              const barWidth = Math.max(slotWidth - 4, 3);
              const height = (result.total / maxScore) * 38;
              const x = 4 + index * slotWidth + 2;
              return (
                <g key={displayReadings[index].id}>
                  <rect
                    x={x}
                    y={48 - height}
                    width={barWidth}
                    height={height}
                    fill={bandChartColors[result.band]}
                  />
                  <text x={x + barWidth / 2} y="57" textAnchor="middle" fontSize="8" fill="#555">
                    {displayReadings[index].timestamp.split(' ')[1]}
                  </text>
                </g>
              );
            })}
          </svg>
        </fieldset>
      </div>

      <fieldset className="ehr-fieldset">
        <legend>Parameter contribution</legend>
        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="px-1 py-0.5 text-left">Parameter</th>
              <th className="px-1 py-0.5 text-left">Value</th>
              <th className="px-1 py-0.5 text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {currentResult.parameters.map(parameter => (
              <tr
                key={parameter.key}
                className={parameter.missing ? 'text-gray-400' : ''}
                style={parameter.score === 3 ? bandStyles.high : undefined}
              >
                <td className="px-1 py-0.5">{parameter.label}</td>
                <td className="px-1 py-0.5">{parameter.missing ? 'not recorded' : parameter.display}</td>
                <td className="px-1 py-0.5 text-center font-mono font-bold">{parameter.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <fieldset className="ehr-fieldset m-0">
          <legend>Escalation guidance</legend>
          <div>{currentResult.guidance}</div>
        </fieldset>
        <fieldset className="ehr-fieldset m-0">
          <legend>Monitoring frequency</legend>
          <div className="font-semibold">{currentResult.monitoringFrequency}</div>
          {currentResult.missingParameters.length > 0 && (
            <div className="mt-1 text-[#664d00]">
              Score may be incomplete: {currentResult.missingParameters.join(', ')}.
            </div>
          )}
        </fieldset>
      </div>
    </div>
  );
}
