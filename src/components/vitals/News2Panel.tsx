import { AlertTriangle, BellRing, CheckCircle2, HeartPulse } from 'lucide-react';
import type { VitalReading } from '../../types';
import {
  calculateNews2,
  NEWS2_POINT_STYLE,
  NEWS2_RESPONSE,
  NEWS2_RISK_STYLE,
  type News2Result,
} from '../../utils/news2';

interface News2PanelProps {
  readings: VitalReading[];
  escalatedAt: string | null;
  onEscalate: () => void;
}

const CHART_WIDTH = 280;
const CHART_HEIGHT = 84;
const CHART_PAD = { top: 6, right: 14, bottom: 14, left: 18 };

function News2TrendChart({ readings }: { readings: VitalReading[] }) {
  const chronological = [...readings].reverse();
  const scores = chronological.map(r => calculateNews2(r));
  const maxY = Math.max(12, ...scores.map(s => s.total));
  const innerW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const x = (i: number) => CHART_PAD.left + (scores.length > 1 ? (i / (scores.length - 1)) * innerW : innerW / 2);
  const y = (v: number) => CHART_PAD.top + innerH - (v / maxY) * innerH;

  const bands = [
    { from: 0, to: 4.5, fill: '#e6f4ea' },
    { from: 4.5, to: 6.5, fill: '#fff4dc' },
    { from: 6.5, to: maxY, fill: '#fde2e2' },
  ];

  return (
    <svg width={CHART_WIDTH} height={CHART_HEIGHT} data-testid="news2-trend-chart" className="bg-white border border-gray-400">
      {bands.map(b => (
        <rect key={b.from} x={CHART_PAD.left} width={innerW} y={y(b.to)} height={y(b.from) - y(b.to)} fill={b.fill} />
      ))}
      {[0, 5, 7].map(t => (
        <g key={t}>
          <line x1={CHART_PAD.left} x2={CHART_PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="#bbb" strokeDasharray={t ? '2,2' : undefined} />
          <text x={CHART_PAD.left - 3} y={y(t) + 3} fontSize="8" textAnchor="end" fill="#666">{t}</text>
        </g>
      ))}
      <polyline
        points={scores.map((s, i) => `${x(i)},${y(s.total)}`).join(' ')}
        fill="none"
        stroke="#336699"
        strokeWidth="1.5"
      />
      {scores.map((s, i) => (
        <g key={chronological[i].id}>
          <circle cx={x(i)} cy={y(s.total)} r="3.5" fill={NEWS2_RISK_STYLE[s.risk].border} stroke="#fff" strokeWidth="1">
            <title>{`${chronological[i].timestamp}: NEWS2 ${s.total} (${NEWS2_RESPONSE[s.risk].label})`}</title>
          </circle>
          <text x={x(i)} y={CHART_HEIGHT - 3} fontSize="7" textAnchor="middle" fill="#666">
            {chronological[i].timestamp.split(' ')[1]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function News2ScoreBadge({ result, size = 'sm' }: { result: News2Result; size?: 'sm' | 'lg' }) {
  const style = NEWS2_RISK_STYLE[result.risk];
  const dims = size === 'lg' ? 'w-16 h-16 text-[28px]' : 'w-6 h-5 text-[11px]';
  return (
    <span
      className={`inline-flex items-center justify-center font-bold font-mono ${dims}`}
      style={{ background: style.background, color: style.color, border: `${size === 'lg' ? 2 : 1}px solid ${style.border}` }}
    >
      {result.total}
    </span>
  );
}

export function News2Breakdown({ result }: { result: News2Result }) {
  return (
    <div className="flex flex-wrap gap-1">
      {result.components.map(c => (
        <div
          key={c.parameter}
          className="border border-gray-400 px-1.5 py-0.5 text-[10px] flex items-center space-x-1"
          style={NEWS2_POINT_STYLE[c.points]}
          title={c.assumed ? 'Not documented: assumed normal' : undefined}
        >
          <span className="text-gray-600">{c.label}:</span>
          <span className="font-semibold">{c.display}{c.assumed ? '*' : ''}</span>
          <span className="font-mono font-bold">+{c.points}</span>
        </div>
      ))}
    </div>
  );
}

export default function News2Panel({ readings, escalatedAt, onEscalate }: News2PanelProps) {
  if (readings.length === 0) return null;

  const latest = readings[0];
  const result = calculateNews2(latest);
  const previous = readings[1] ? calculateNews2(readings[1]) : null;
  const delta = previous ? result.total - previous.total : 0;
  const response = NEWS2_RESPONSE[result.risk];
  const style = NEWS2_RISK_STYLE[result.risk];
  const needsEscalation = result.risk === 'medium' || result.risk === 'high';
  const hasAssumed = result.components.some(c => c.assumed);

  return (
    <div
      className="flex items-stretch gap-3 p-2 border-b border-gray-400"
      style={{ background: '#f5f5f5' }}
      data-testid="news2-panel"
    >
      <div className="flex flex-col items-center justify-center px-2">
        <div className="text-[9px] font-semibold text-gray-600 mb-0.5 flex items-center">
          <HeartPulse className="w-3 h-3 mr-0.5" /> NEWS2
        </div>
        <News2ScoreBadge result={result} size="lg" />
        {previous && (
          <div className="text-[9px] mt-0.5 text-gray-600">
            {delta === 0 ? 'No change' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} vs prior`}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div
          className="px-2 py-1 flex items-center justify-between"
          style={{ background: style.background, color: style.color, border: `1px solid ${style.border}` }}
          data-testid="news2-risk"
        >
          <div className="flex items-center space-x-1.5">
            {result.risk === 'high' || result.risk === 'medium' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span className="font-bold text-[12px]">{response.label} clinical risk</span>
            <span className="text-[10px]">• Monitoring: {response.frequency}</span>
          </div>
          <span className="text-[10px]">Latest: {latest.timestamp}</span>
        </div>
        <div className="text-[10px] text-gray-700 my-1">{response.action}</div>
        <News2Breakdown result={result} />
        {(hasAssumed || result.missing.length > 0) && (
          <div className="text-[9px] text-gray-500 mt-0.5">
            {hasAssumed && '* Not documented: assumed normal. '}
            {result.missing.length > 0 && `Incomplete set: missing ${result.missing.join(', ')}.`}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end justify-between">
        <News2TrendChart readings={readings} />
        {needsEscalation && (
          escalatedAt ? (
            <div className="text-[10px] text-green-800 font-semibold flex items-center mt-1" data-testid="news2-escalated">
              <BellRing className="w-3 h-3 mr-1" /> Rapid Response paged at {escalatedAt}
            </div>
          ) : (
            <button
              className="ehr-button flex items-center space-x-1 mt-1"
              style={{ background: 'linear-gradient(to bottom, #e87458 0%, #c84030 100%)', color: 'white', border: '1px solid #a02010' }}
              onClick={onEscalate}
            >
              <BellRing className="w-3 h-3" />
              <span>Escalate to Rapid Response</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
