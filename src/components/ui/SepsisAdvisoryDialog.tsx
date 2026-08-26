import { useMemo, useState, type CSSProperties } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Modal } from './Modal';
import { SEPSIS_BUNDLE_ORDERS } from '../../services/sepsisService';
import type {
  SepsisAssessment,
  SepsisBundleOrder,
  SepsisCriterion,
  SepsisCriterionSet,
  SepsisRiskSummary,
} from '../../types/sepsis';

interface SepsisPatient {
  name: string;
  mrn: string;
  age: number;
  gender: string;
  room: string;
}

interface SepsisAdvisoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SepsisRiskSummary;
  assessment: SepsisAssessment;
  patient: SepsisPatient;
  onAcceptOrders: (orders: SepsisBundleOrder[]) => void;
  onDecline: (reason: string) => void;
}

const criterionSets: SepsisCriterionSet[] = ['SIRS', 'qSOFA', 'MEWS'];
const declineReasons = [
  'Sepsis already being treated',
  'Clinical presentation not consistent with sepsis',
  'Comfort care / DNR',
  'Vitals artifact or equipment error',
  'Other',
];

function riskStyle(riskLevel: SepsisAssessment['riskLevel']): CSSProperties {
  if (riskLevel === 'high') return { background: '#ffcccc', color: '#990000', fontWeight: 'bold' };
  if (riskLevel === 'moderate') return { background: '#fff3cd', color: '#664d00' };
  return {};
}

function MewsSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 110;
  const height = 28;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block align-middle ml-2">
      <polyline points={points} fill="none" stroke="#dc2626" strokeWidth="1.5" />
    </svg>
  );
}

function CriterionRow({ criterion }: { criterion: SepsisCriterion }) {
  return (
    <div
      className={`grid grid-cols-[1.5fr_1fr_70px] gap-2 px-1 py-0.5 border-b border-gray-200 text-[10px] ${
        criterion.documented ? '' : 'text-gray-400'
      }`}
    >
      <span>{criterion.label}</span>
      <span>{criterion.detail}{criterion.set === 'MEWS' ? ` (${criterion.points} pt)` : ''}</span>
      <span className={criterion.documented && criterion.met ? 'font-bold text-red-700' : ''}>
        {criterion.documented ? (criterion.met ? 'Met' : 'Not met') : 'Not documented'}
      </span>
    </div>
  );
}

export function SepsisAdvisoryDialog({
  isOpen,
  onClose,
  summary,
  assessment,
  patient,
  onAcceptOrders,
  onDecline,
}: SepsisAdvisoryDialogProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(
    SEPSIS_BUNDLE_ORDERS.filter(order => order.defaultSelected).map(order => order.id),
  );
  const [declineReason, setDeclineReason] = useState('');

  const criteriaBySet = useMemo(() => {
    return criterionSets.reduce<Record<SepsisCriterionSet, SepsisCriterion[]>>((groups, set) => {
      groups[set] = assessment.criteria.filter(criterion => criterion.set === set);
      return groups;
    }, { SIRS: [], qSOFA: [], MEWS: [] });
  }, [assessment]);

  const assessmentIndex = summary.history.findIndex(
    historyAssessment => historyAssessment.readingId === assessment.readingId,
  );
  const assessmentHistory = assessmentIndex >= 0
    ? summary.history.slice(assessmentIndex)
    : summary.history;
  const mewsTrend = assessmentHistory.slice().reverse().map(reading => reading.mewsScore);
  const trendLabel = assessment.mewsDelta > 0 ? 'Rising' : assessment.mewsDelta < 0 ? 'Falling' : 'Stable';
  const trendIcon = assessment.mewsDelta > 0
    ? <TrendingUp className="w-3 h-3 inline text-red-600" />
    : assessment.mewsDelta < 0
      ? <TrendingDown className="w-3 h-3 inline text-green-600" />
      : <Minus className="w-3 h-3 inline text-gray-500" />;

  const selectedOrders = SEPSIS_BUNDLE_ORDERS.filter(order => selectedOrderIds.includes(order.id));
  const toggleOrder = (order: SepsisBundleOrder) => {
    setSelectedOrderIds(current => current.includes(order.id)
      ? current.filter(id => id !== order.id)
      : [...current, order.id]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sepsis Early-Warning Best Practice Advisory"
      width="xl"
      footer={
        <>
          <button
            className="ehr-button"
            onClick={() => onDecline(declineReason)}
            disabled={!declineReason}
          >
            Decline Advisory
          </button>
          <button
            className="ehr-button ehr-button-primary"
            onClick={() => onAcceptOrders(selectedOrders)}
            disabled={selectedOrders.length === 0}
          >
            Accept Selected Orders
          </button>
        </>
      }
    >
      <div className="space-y-2">
        <fieldset className="ehr-fieldset">
          <legend>Patient &amp; Assessment</legend>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <div><span className="text-gray-500">Patient:</span> <span className="font-semibold">{patient.name}</span> ({patient.mrn})</div>
            <div><span className="text-gray-500">Age/Sex:</span> {patient.age}yo {patient.gender} - Room {patient.room}</div>
            <div><span className="text-gray-500">Assessment:</span> {assessment.timestamp}</div>
            <div style={riskStyle(assessment.riskLevel)}>
              <span className="text-gray-500">Risk:</span> <span className="font-bold uppercase">{assessment.riskLevel}</span>
            </div>
          </div>
          <div className="mt-2 px-2 py-1 border border-gray-400 text-[11px]" style={riskStyle(assessment.riskLevel)}>
            {assessment.recommendation}
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Criteria Breakdown</legend>
          {criterionSets.map(set => (
            <div key={set} className="mb-1 last:mb-0">
              <div className="font-bold text-[10px] bg-gray-200 border-b border-gray-400 px-1 py-0.5">
                {set} {set === 'SIRS' ? `(${assessment.sirsCount}/4)` : set === 'qSOFA' ? `(${assessment.qsofaScore}/3)` : `(${assessment.mewsScore} points)`}
              </div>
              {criteriaBySet[set].map((criterion, index) => (
                <CriterionRow key={`${set}-${index}`} criterion={criterion} />
              ))}
            </div>
          ))}
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>MEWS Trend</legend>
          <div className="flex items-center text-[11px]">
            <span className="font-semibold">MEWS history:</span>
            <MewsSparkline data={mewsTrend} />
            <span className="ml-2">{assessment.mewsScore} current</span>
            <span className="ml-2 font-semibold">{trendIcon} {trendLabel} ({assessment.mewsDelta > 0 ? '+' : ''}{assessment.mewsDelta})</span>
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Sepsis Bundle Order Set</legend>
          <div className="space-y-0.5">
            {SEPSIS_BUNDLE_ORDERS.map(order => (
              <label key={order.id} className="flex items-start gap-2 px-1 py-0.5 border-b border-gray-200 text-[10px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={() => toggleOrder(order)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="font-semibold">{order.name}</span>
                  <span className="text-gray-600"> — {order.detail}</span>
                </span>
                <span className="text-gray-500 uppercase">{order.category}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="ehr-fieldset">
          <legend>Decline Reason</legend>
          <select
            className="ehr-input w-full text-[11px]"
            value={declineReason}
            onChange={event => setDeclineReason(event.target.value)}
          >
            <option value="">Select a reason to decline...</option>
            {declineReasons.map(reason => <option key={reason} value={reason}>{reason}</option>)}
          </select>
        </fieldset>
      </div>
    </Modal>
  );
}
