import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { News2Result, News2Trend } from '../../utils/news2';

interface News2PanelProps {
  result: News2Result;
  trend?: News2Trend | null;
  timestamp?: string;
}

const riskStyles = {
  low: { background: '#d4edda', color: '#155724', border: '#86b98f' },
  'low-medium': { background: '#fff3cd', color: '#664d00', border: '#d6bd66' },
  medium: { background: '#ffe0b2', color: '#7a3e00', border: '#d99a52' },
  high: { background: '#ffcccc', color: '#990000', border: '#d18b8b' },
};

const scoreStyles = {
  0: {},
  1: { background: '#fff3cd', color: '#664d00' },
  2: { background: '#ffe0b2', color: '#7a3e00' },
  3: { background: '#ffcccc', color: '#990000', fontWeight: 'bold' },
};

export default function News2Panel({ result, trend, timestamp }: News2PanelProps) {
  const bandStyle = riskStyles[result.riskBand];
  const TrendIcon = trend?.direction === 'rising'
    ? TrendingUp
    : trend?.direction === 'falling'
      ? TrendingDown
      : Minus;

  return (
    <section className="ehr-panel text-[11px]" aria-label="NEWS2 early-warning score">
      <div className="ehr-header flex items-center justify-between">
        <span>NEWS2 Early-Warning Score</span>
        {timestamp && <span className="text-[9px] font-normal">{timestamp}</span>}
      </div>
      <div className="bg-white p-2">
        <div className="flex items-center gap-2 border-b border-gray-300 pb-2">
          <div
            className="flex h-14 w-14 shrink-0 flex-col items-center justify-center border-2 text-center"
            style={{ background: bandStyle.background, color: bandStyle.color, borderColor: bandStyle.border }}
          >
            <span className="text-[9px]">TOTAL</span>
            <span className="text-2xl font-bold leading-6">{result.total}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold" style={{ color: bandStyle.color }}>{result.riskLabel}</div>
            <div className="text-[10px] text-gray-600">{result.monitoringFrequency}</div>
            {trend && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-700">
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{trend.direction} ({trend.delta > 0 ? '+' : ''}{trend.delta})</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 border border-gray-300 p-1.5 text-[10px]">
          <span className="font-semibold">Clinical response:</span> {result.clinicalResponse}
        </div>
        {!result.complete && (
          <div className="mt-2 border border-gray-300 bg-gray-100 px-1.5 py-1 text-[10px] text-gray-600">
            Incomplete observation set ({result.scoredParameterCount}/7 parameters recorded).
          </div>
        )}
        <table className="mt-2 w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#e0e0e0]">
              <th className="border border-gray-400 px-1 py-1 text-left">Parameter</th>
              <th className="border border-gray-400 px-1 py-1 text-left">Value</th>
              <th className="w-10 border border-gray-400 px-1 py-1 text-center">Score</th>
            </tr>
          </thead>
          <tbody>
            {result.parameters.map((parameter) => (
              <tr key={parameter.key} className={!parameter.scored ? 'text-gray-400' : undefined}>
                <td className="border border-gray-300 px-1 py-1">{parameter.label}</td>
                <td className="border border-gray-300 px-1 py-1">
                  {parameter.scored ? parameter.display : <span>— <span className="text-[9px]">(not recorded)</span></span>}
                </td>
                <td className="border border-gray-300 px-1 py-1 text-center" style={parameter.scored ? scoreStyles[parameter.score as 0 | 1 | 2 | 3] : undefined}>
                  {parameter.scored ? parameter.score : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
