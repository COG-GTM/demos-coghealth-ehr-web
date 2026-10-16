import { ShieldAlert, ShieldCheck, Siren } from 'lucide-react';
import type { VitalReading } from '../../types';
import {
  calculateNews2,
  describeMissing,
  news2Colors,
  news2RiskLabel,
  NEWS2_COLORS,
  NEWS2_INDETERMINATE_COLORS,
  NEWS2_RESPONSES,
  type News2Result,
} from '../../utils/news2';

export function News2Badge({ result, size = 'sm' }: { result: News2Result; size?: 'sm' | 'lg' }) {
  const colors = news2Colors(result);
  const sizing = size === 'lg' ? 'text-[28px] w-16 h-16' : 'text-[11px] min-w-[28px] px-1.5 py-0.5';
  return (
    <span
      data-testid="news2-badge"
      className={`inline-flex items-center justify-center font-bold font-mono ${sizing}`}
      style={{ background: colors.bg, color: colors.text, border: `${size === 'lg' ? 2 : 1}px solid ${colors.border}` }}
      title={`NEWS2 ${result.total}${result.complete ? '' : ' (partial, incomplete set)'} - ${news2RiskLabel(result)}`}
    >
      {result.total}
      {!result.complete && <sup className="text-[8px] ml-0.5">*</sup>}
    </span>
  );
}

export function News2Breakdown({ result }: { result: News2Result }) {
  return (
    <table className="w-full text-[11px] border border-gray-300">
      <tbody>
        {result.components.map(c => (
          <tr key={c.parameter} className="border-b border-gray-200">
            <td className="px-1.5 py-0.5 text-gray-600">{c.label}</td>
            <td className="px-1.5 py-0.5 font-mono">{c.value}</td>
            <td className="px-1.5 py-0.5 text-right">
              <span
                className="inline-block min-w-[18px] text-center font-bold font-mono"
                style={pointStyle(c.points)}
              >
                {c.points}
              </span>
            </td>
          </tr>
        ))}
        <tr className="bg-gray-100 font-semibold">
          <td className="px-1.5 py-0.5" colSpan={2}>Total NEWS2</td>
          <td className="px-1.5 py-0.5 text-right font-mono">{result.total}</td>
        </tr>
      </tbody>
    </table>
  );
}

const pointStyle = (points: number) =>
  points === 0 ? { color: '#6b7280' } : points === 3 ? { background: '#c62828', color: 'white' } : { background: '#fff3cd', color: '#664d00' };

function News2Chips({ result }: { result: News2Result }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1" data-testid="news2-chips">
      {result.components.map(c => (
        <span key={c.parameter} className="inline-flex items-center border border-gray-300 bg-white text-[10px]">
          <span className="px-1 text-gray-600">{c.label}</span>
          <span className="px-1 font-mono">{c.parameter === 'temperature' ? c.value.split(' ')[0] : c.value}</span>
          <span className="px-1 font-bold font-mono min-w-[16px] text-center" style={pointStyle(c.points)}>{c.points}</span>
        </span>
      ))}
    </div>
  );
}

function News2TrendChart({ scores }: { scores: { label: string; total: number }[] }) {
  const width = 260;
  const height = 60;
  const pad = 14;
  const max = Math.max(12, ...scores.map(s => s.total));
  const y = (v: number) => height - (v / max) * height;
  const x = (i: number) => (scores.length === 1 ? width / 2 : pad + (i / (scores.length - 1)) * (width - 2 * pad));
  const labelEvery = Math.ceil(scores.length / 5);
  const points = scores.map((s, i) => `${x(i)},${y(s.total)}`).join(' ');

  return (
    <svg width={width} height={height + 12} className="bg-white border border-gray-300" data-testid="news2-trend">
      <rect x={0} y={y(max)} width={width} height={y(7) - y(max)} fill="#ffcdd2" opacity={0.6} />
      <rect x={0} y={y(7)} width={width} height={y(5) - y(7)} fill="#ffe0b2" opacity={0.6} />
      <rect x={0} y={y(5)} width={width} height={height - y(5)} fill="#e6f4ea" opacity={0.6} />
      <text x={width - 2} y={y(7) - 2} fontSize={7} textAnchor="end" fill="#8b0000">High ≥7</text>
      <text x={width - 2} y={y(5) - 1} fontSize={7} textAnchor="end" fill="#8a3c00">Med ≥5</text>
      <polyline points={points} fill="none" stroke="#1e3a8a" strokeWidth={1.5} />
      {scores.map((s, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(s.total)} r={2.5} fill="#1e3a8a" />
          <text x={x(i)} y={y(s.total) - 4} fontSize={8} textAnchor="middle" fontWeight="bold" fill="#1e3a8a">{s.total}</text>
          {(i % labelEvery === 0 || i === scores.length - 1) && (
            <text x={x(i)} y={height + 10} fontSize={7} textAnchor="middle" fill="#6b7280">{s.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function News2SummaryPanel({ readings }: { readings: VitalReading[] }) {
  if (readings.length === 0) return null;

  const scored = readings.map(r => ({ reading: r, result: calculateNews2(r) }));
  const completeSets = scored.filter(s => s.result.complete);
  const firstComplete = scored.findIndex(s => s.result.complete);
  const newerPartial = firstComplete === -1 ? scored : scored.slice(0, firstComplete);

  if (completeSets.length === 0) {
    return (
      <div
        data-testid="news2-panel"
        className="flex items-center gap-2 p-2 border-b border-gray-400 text-[11px]"
        style={{ background: NEWS2_INDETERMINATE_COLORS.bg, borderLeft: `6px solid ${NEWS2_INDETERMINATE_COLORS.border}` }}
      >
        <ShieldAlert className="w-4 h-4 text-gray-600" />
        <span className="font-bold" data-testid="news2-risk">NEWS2 Risk Indeterminate</span>
        <span className="text-gray-600">- no complete observation set recorded. Record all NEWS2 parameters to assess clinical risk.</span>
      </div>
    );
  }

  const latest = completeSets[0];
  const previous = completeSets[1];
  const peak = completeSets.reduce((a, b) => (b.result.total > a.result.total ? b : a));
  const response = NEWS2_RESPONSES[latest.result.risk];
  const colors = NEWS2_COLORS[latest.result.risk];
  const delta = previous ? latest.result.total - previous.result.total : 0;
  const Icon = latest.result.risk === 'high' ? Siren : latest.result.risk === 'low' ? ShieldCheck : ShieldAlert;
  const chronological = [...completeSets].reverse().map(s => ({ label: s.reading.timestamp.split(' ')[1], total: s.result.total }));

  return (
    <div
      data-testid="news2-panel"
      className="flex items-stretch gap-3 p-2 border-b border-gray-400"
      style={{ background: colors.bg, borderLeft: `6px solid ${colors.border}` }}
    >
      <div className="flex flex-col items-center justify-center px-2">
        <div className="text-[9px] font-semibold text-gray-600 tracking-wide">NEWS2</div>
        <News2Badge result={latest.result} size="lg" />
        {previous && (
          <div className="text-[10px] mt-0.5" style={{ color: delta > 0 ? '#c62828' : delta < 0 ? '#1b5e20' : '#6b7280' }}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {delta > 0 ? `+${delta}` : delta} vs prior
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 text-[11px]">
        <div className="flex items-center gap-1.5 font-bold text-[12px]" style={{ color: colors.text }}>
          <Icon className="w-4 h-4" />
          <span data-testid="news2-risk">{response.label} Clinical Risk</span>
          <span className="font-normal text-gray-600 text-[10px]">- latest complete set {latest.reading.timestamp}</span>
        </div>
        <div className="mt-1"><span className="font-semibold">Response:</span> {response.action}</div>
        <div className="mt-0.5"><span className="font-semibold">Monitoring:</span> {response.monitoring}</div>
        <div className="mt-0.5 text-[10px] text-gray-600">
          Peak in window: <span className="font-semibold">{peak.result.total}</span> ({NEWS2_RESPONSES[peak.result.risk].label}) at {peak.reading.timestamp}, {peak.reading.location}
        </div>
        {newerPartial.length > 0 && (
          <div className="mt-0.5 text-[10px] text-red-700" data-testid="news2-partial-warning">
            * {newerPartial.length} newer incomplete set(s) not used for risk assessment. Latest {newerPartial[0].reading.timestamp}: partial score {newerPartial[0].result.total} ({news2RiskLabel(newerPartial[0].result)}), missing {describeMissing(newerPartial[0].result)}
          </div>
        )}
        <News2Chips result={latest.result} />
      </div>

      <div className="shrink-0">
        <div className="text-[9px] font-semibold text-gray-600 mb-0.5">NEWS2 TREND</div>
        <News2TrendChart scores={chronological} />
      </div>
    </div>
  );
}
