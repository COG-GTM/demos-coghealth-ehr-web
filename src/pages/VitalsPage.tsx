import { useMemo, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Printer, RefreshCw, Plus, Calendar, Siren } from 'lucide-react';
import { Modal, AlertDialog } from '../components/ui/Modal';
import type { Consciousness, VitalReading } from '../types';
import { calculateNews2, news2ParameterLabels, news2RiskLabels, news2RiskStyles, type News2Result } from '../utils/news2';

const vitalSigns = [
  { name: 'BP Systolic', key: 'systolic' as const, unit: 'mmHg', normalRange: { min: 90, max: 140 }, criticalLow: 80, criticalHigh: 180 },
  { name: 'BP Diastolic', key: 'diastolic' as const, unit: 'mmHg', normalRange: { min: 60, max: 90 }, criticalLow: 50, criticalHigh: 110 },
  { name: 'Heart Rate', key: 'heartRate' as const, unit: 'bpm', normalRange: { min: 60, max: 100 }, criticalLow: 40, criticalHigh: 150 },
  { name: 'Temperature', key: 'temperature' as const, unit: '°F', normalRange: { min: 97.0, max: 99.5 }, criticalLow: 95.0, criticalHigh: 103.0 },
  { name: 'Resp Rate', key: 'respiratoryRate' as const, unit: '/min', normalRange: { min: 12, max: 20 }, criticalLow: 8, criticalHigh: 30 },
  { name: 'SpO2', key: 'spo2' as const, unit: '%', normalRange: { min: 95, max: 100 }, criticalLow: 88, criticalHigh: undefined },
  { name: 'Weight', key: 'weight' as const, unit: 'kg', normalRange: { min: 0, max: 999 } },
  { name: 'Pain Level', key: 'painLevel' as const, unit: '/10', normalRange: { min: 0, max: 3 }, criticalHigh: 7 },
];

const defaultVitals: VitalReading[] = [
  { id: 1, timestamp: '2024-01-18 14:00', systolic: 158, diastolic: 94, heartRate: 98, temperature: 98.6, respiratoryRate: 20, spo2: 94, weight: 82.5, painLevel: 4, onOxygen: false, consciousness: 'A', recordedBy: 'RN Smith', location: 'Med-Surg 4W' },
  { id: 2, timestamp: '2024-01-18 10:00', systolic: 162, diastolic: 96, heartRate: 102, temperature: 99.1, respiratoryRate: 22, spo2: 93, weight: 82.5, painLevel: 5, onOxygen: false, consciousness: 'A', recordedBy: 'RN Johnson', location: 'Med-Surg 4W' },
  { id: 3, timestamp: '2024-01-18 06:00', systolic: 168, diastolic: 98, heartRate: 108, temperature: 99.8, respiratoryRate: 24, spo2: 92, weight: 82.8, painLevel: 6, onOxygen: false, consciousness: 'A', recordedBy: 'RN Williams', location: 'Med-Surg 4W' },
  { id: 4, timestamp: '2024-01-17 22:00', systolic: 172, diastolic: 100, heartRate: 112, temperature: 100.2, respiratoryRate: 26, spo2: 91, weight: 83.0, painLevel: 7, onOxygen: true, consciousness: 'A', recordedBy: 'RN Davis', location: 'Med-Surg 4W' },
  { id: 5, timestamp: '2024-01-17 18:00', systolic: 178, diastolic: 102, heartRate: 118, temperature: 100.8, respiratoryRate: 28, spo2: 90, weight: 83.2, painLevel: 8, onOxygen: true, consciousness: 'A', recordedBy: 'RN Brown', location: 'ED' },
  { id: 6, timestamp: '2024-01-17 14:00', systolic: 182, diastolic: 108, heartRate: 124, temperature: 101.4, respiratoryRate: 30, spo2: 88, weight: 83.5, painLevel: 9, onOxygen: true, consciousness: 'C', recordedBy: 'RN Miller', location: 'ED' },
  { id: 7, timestamp: '2024-01-17 10:00', systolic: 145, diastolic: 88, heartRate: 88, temperature: 98.4, respiratoryRate: 18, spo2: 96, weight: 82.0, painLevel: 2, onOxygen: false, consciousness: 'A', recordedBy: 'RN Wilson', location: 'Clinic' },
  { id: 8, timestamp: '2024-01-16 14:00', systolic: 138, diastolic: 84, heartRate: 76, temperature: 98.2, respiratoryRate: 16, spo2: 98, weight: 82.0, painLevel: 0, onOxygen: false, consciousness: 'A', recordedBy: 'RN Taylor', location: 'Clinic' },
];

const patientInfo = { name: 'Smith, John', mrn: 'MRN001234', age: 58, gender: 'M', room: '412A' };

type VitalsForm = Partial<Record<(typeof vitalSigns)[number]['key'], string>> & {
  onOxygen: boolean;
  consciousness: Consciousness;
  notes: string;
};

const emptyForm: VitalsForm = { onOxygen: false, consciousness: 'A', notes: '' };

const formatTimestamp = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formToReading = (form: VitalsForm, id: number): VitalReading => {
  const reading: VitalReading = {
    id,
    timestamp: formatTimestamp(new Date()),
    recordedBy: 'Dr. Anderson',
    location: 'Med-Surg 4W',
    onOxygen: form.onOxygen,
    consciousness: form.consciousness,
    notes: form.notes.trim() || undefined,
  };
  vitalSigns.forEach(v => {
    const raw = form[v.key];
    if (raw !== undefined && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
      reading[v.key] = Number(raw);
    }
  });
  return reading;
};

function News2Badge({ result, size = 'sm' }: { result: News2Result; size?: 'sm' | 'lg' }) {
  const style = news2RiskStyles[result.risk];
  return (
    <span
      data-testid="news2-badge"
      className={`inline-flex items-center justify-center font-bold font-mono border ${size === 'lg' ? 'text-[22px] w-12 h-12' : 'text-[11px] min-w-[22px] px-1'}`}
      style={{ background: style.background, color: style.color, borderColor: style.border }}
    >
      {result.total}
    </span>
  );
}

function News2Chart({ scores }: { scores: number[] }) {
  const width = 180;
  const height = 48;
  const max = Math.max(10, ...scores);
  const barW = width / Math.max(scores.length, 1);
  const y = (v: number) => height - (v / max) * height;
  return (
    <svg width={width} height={height} className="border border-gray-400 bg-white" data-testid="news2-chart">
      <line x1={0} x2={width} y1={y(5)} y2={y(5)} stroke="#e08a1f" strokeDasharray="3,2" strokeWidth={1} />
      <line x1={0} x2={width} y1={y(7)} y2={y(7)} stroke="#cc3333" strokeDasharray="3,2" strokeWidth={1} />
      {scores.map((score, i) => {
        const color = score >= 7 ? '#cc3333' : score >= 5 ? '#e08a1f' : score >= 1 ? '#e0b84d' : '#7fbf7f';
        return (
          <rect key={i} x={i * barW + 2} y={y(score)} width={barW - 4} height={height - y(score)} fill={color}>
            <title>NEWS2 {score}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export default function VitalsPage() {
  const [vitals, setVitals] = useState<VitalReading[]>(defaultVitals);
  const [form, setForm] = useState<VitalsForm>(emptyForm);
  const [escalation, setEscalation] = useState<News2Result | null>(null);
  const [selectedReading, setSelectedReading] = useState<VitalReading | null>(null);
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [dateRange, setDateRange] = useState<'24h' | '48h' | '7d' | '30d'>('48h');
  const [selectedPatient] = useState(patientInfo);

  const news2Scores = useMemo(() => vitals.map(calculateNews2), [vitals]);
  const completeIdx = news2Scores.map((r, i) => (r.complete ? i : -1)).filter(i => i >= 0);
  const latestIdx = completeIdx[0];
  const latestNews2 = latestIdx !== undefined ? news2Scores[latestIdx] : undefined;
  const previousNews2 = completeIdx[1] !== undefined ? news2Scores[completeIdx[1]] : undefined;
  const newestIncomplete = news2Scores[0] && !news2Scores[0].complete;
  const news2Delta = latestNews2 && previousNews2 ? latestNews2.total - previousNews2.total : 0;
  const formPreview = useMemo(() => calculateNews2(formToReading(form, 0)), [form]);

  const closeAddVitals = () => {
    setShowAddVitals(false);
    setForm(emptyForm);
  };

  const saveVitals = () => {
    const reading = formToReading(form, Math.max(0, ...vitals.map(v => v.id)) + 1);
    const result = calculateNews2(reading);
    setVitals(prev => [reading, ...prev]);
    closeAddVitals();
    if (result.risk === 'MEDIUM' || result.risk === 'HIGH' || result.risk === 'LOW_MEDIUM') {
      setEscalation(result);
    }
  };

  const getValueStatus = (key: string, value: number | undefined) => {
    if (value === undefined) return 'normal';
    const vital = vitalSigns.find(v => v.key === key);
    if (!vital) return 'normal';
    
    if (vital.criticalLow && value <= vital.criticalLow) return 'critical';
    if (vital.criticalHigh && value >= vital.criticalHigh) return 'critical';
    if (value < vital.normalRange.min || value > vital.normalRange.max) return 'abnormal';
    return 'normal';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'critical': return { background: '#ffcccc', color: '#990000', fontWeight: 'bold' };
      case 'abnormal': return { background: '#fff3cd', color: '#664d00' };
      default: return {};
    }
  };

  const getTrend = (key: string, currentIdx: number) => {
    if (currentIdx >= vitals.length - 1) return null;
    const current = vitals[currentIdx][key as keyof VitalReading] as number | undefined;
    const previous = vitals[currentIdx + 1][key as keyof VitalReading] as number | undefined;
    if (current === undefined || previous === undefined) return null;
    
    const diff = current - previous;
    const threshold = key === 'temperature' ? 0.3 : key === 'spo2' ? 1 : 3;
    
    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const TrendIcon = ({ trend, vital }: { trend: string | null; vital: string }) => {
    if (!trend) return null;
    const isGoodUp = vital === 'spo2';
    const isGoodDown = ['systolic', 'diastolic', 'heartRate', 'temperature', 'respiratoryRate', 'painLevel'].includes(vital);
    
    if (trend === 'stable') return <Minus className="w-3 h-3 text-gray-400 inline ml-0.5" />;
    if (trend === 'up') {
      const color = isGoodUp ? 'text-green-600' : isGoodDown ? 'text-red-600' : 'text-gray-600';
      return <TrendingUp className={`w-3 h-3 ${color} inline ml-0.5`} />;
    }
    if (trend === 'down') {
      const color = isGoodDown ? 'text-green-600' : isGoodUp ? 'text-red-600' : 'text-gray-600';
      return <TrendingDown className={`w-3 h-3 ${color} inline ml-0.5`} />;
    }
    return null;
  };

  const Sparkline = ({ data, vitalKey }: { data: (number | undefined)[]; vitalKey: string }) => {
    const values = data.filter((v): v is number => v !== undefined);
    if (values.length < 2) return null;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const height = 20;
    const width = 60;
    
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const vital = vitalSigns.find(v => v.key === vitalKey);
    const lastValue = values[0];
    const isAbnormal = vital && (lastValue < vital.normalRange.min || lastValue > vital.normalRange.max);

    return (
      <svg width={width} height={height} className="inline-block ml-1">
        <polyline
          points={points}
          fill="none"
          stroke={isAbnormal ? '#dc2626' : '#2563eb'}
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-2">
      <div className="ehr-panel flex-1 flex flex-col overflow-hidden">
        <div className="ehr-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Vital Signs Flowsheet</span>
            <span className="text-blue-200">|</span>
            <span className="text-[10px]">{selectedPatient.name} ({selectedPatient.mrn}) - {selectedPatient.age}yo {selectedPatient.gender} - Room {selectedPatient.room}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button className="ehr-button flex items-center space-x-1" onClick={() => setShowAddVitals(true)}>
              <Plus className="w-3 h-3" />
              <span>Record Vitals</span>
            </button>
            <button className="ehr-button flex items-center space-x-1">
              <Printer className="w-3 h-3" />
              <span>Print</span>
            </button>
            <button className="ehr-button flex items-center space-x-1">
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="ehr-toolbar flex items-center justify-between py-1">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-600">Time Range:</span>
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="ehr-input text-[10px] py-0.5"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="48h">Last 48 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="flex items-center"><span className="w-2 h-2 bg-green-500 inline-block mr-1"></span>Normal</span>
            <span className="flex items-center"><span className="w-2 h-2 bg-yellow-400 inline-block mr-1"></span>Abnormal</span>
            <span className="flex items-center"><span className="w-2 h-2 bg-red-500 inline-block mr-1"></span>Critical</span>
          </div>
        </div>

        {latestNews2 && (
          <div
            data-testid="news2-summary"
            className="flex items-center space-x-4 px-3 py-2 border border-gray-400 mb-1"
            style={{ background: news2RiskStyles[latestNews2.risk].background, borderColor: news2RiskStyles[latestNews2.risk].border }}
          >
            <div className="flex items-center space-x-2">
              <News2Badge result={latestNews2} size="lg" />
              <div className="text-[11px]" style={{ color: news2RiskStyles[latestNews2.risk].color }}>
                <div className="font-bold text-[12px] flex items-center">
                  {latestNews2.risk === 'HIGH' && <Siren className="w-4 h-4 mr-1" />}
                  NEWS2 Early Warning Score
                </div>
                <div><span className="font-semibold">{news2RiskLabels[latestNews2.risk]} clinical risk</span> · {vitals[latestIdx].timestamp}</div>
                {newestIncomplete && (
                  <div className="flex items-center font-semibold" data-testid="news2-incomplete-warning">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Latest reading ({vitals[0].timestamp}) is incomplete and not scored
                  </div>
                )}
                {previousNews2 && (
                  <div className="flex items-center" data-testid="news2-trend">
                    {news2Delta > 0 ? <TrendingUp className="w-3 h-3 mr-1 text-red-600" /> : news2Delta < 0 ? <TrendingDown className="w-3 h-3 mr-1 text-green-700" /> : <Minus className="w-3 h-3 mr-1" />}
                    {news2Delta > 0 ? `Worsening (+${news2Delta})` : news2Delta < 0 ? `Improving (${news2Delta})` : 'Unchanged'} since previous complete reading
                  </div>
                )}
              </div>
            </div>
            <div className="text-[11px] border-l border-gray-400 pl-4" style={{ color: news2RiskStyles[latestNews2.risk].color }}>
              <div><span className="font-semibold">Clinical response:</span> {latestNews2.response}</div>
              <div><span className="font-semibold">Monitoring:</span> {latestNews2.frequency}</div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {latestNews2.components.filter(c => c.points > 0).map(c => (
                  <span key={c.parameter} className="px-1 border border-gray-400 bg-white/70 text-[10px] text-gray-700">
                    {c.label} +{c.points}
                  </span>
                ))}
              </div>
            </div>
            <div className="ml-auto flex flex-col items-end">
              <News2Chart scores={news2Scores.filter(r => r.complete).reverse().map(r => r.total)} />
              <span className="text-[9px] text-gray-600">NEWS2 trend (oldest → newest) · dashed: 5 / 7</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-white border border-gray-400">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0">
              <tr className="bg-gradient-to-b from-[#f0f0f0] to-[#e0e0e0]">
                <th className="text-left px-2 py-1 border border-gray-400 bg-gradient-to-b from-[#f8f8f8] to-[#e8e8e8] sticky left-0 z-10 min-w-[100px]">Vital Sign</th>
                <th className="text-center px-2 py-1 border border-gray-400 bg-gradient-to-b from-[#f8f8f8] to-[#e8e8e8] min-w-[50px]">Trend</th>
                {vitals.map((reading) => (
                  <th key={reading.id} className="text-center px-2 py-1 border border-gray-400 min-w-[80px]">
                    <div className="text-[10px] font-normal text-gray-600">{reading.timestamp.split(' ')[0]}</div>
                    <div className="font-semibold">{reading.timestamp.split(' ')[1]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#eef3fa]" data-testid="news2-row">
                <td className="px-2 py-1 border border-gray-300 font-semibold sticky left-0 bg-[#eef3fa] z-10">
                  <div>NEWS2 Score</div>
                  <div className="text-[9px] text-gray-500 font-normal">Early warning (0-20)</div>
                </td>
                <td className="px-2 py-1 border border-gray-300 text-center text-[10px] text-gray-600">
                  {latestNews2 ? news2RiskLabels[latestNews2.risk] : '-'}
                </td>
                {vitals.map((reading, idx) => (
                  <td
                    key={reading.id}
                    className="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-[#e0e8f0]"
                    onClick={() => setSelectedReading(reading)}
                    title={news2Scores[idx].complete ? `${news2RiskLabels[news2Scores[idx].risk]} risk` : 'Incomplete: not risk-classified'}
                  >
                    <News2Badge result={news2Scores[idx]} />
                  </td>
                ))}
              </tr>
              {vitalSigns.map((vital, vitalIdx) => (
                <tr key={vital.key} className={vitalIdx % 2 === 0 ? 'bg-white' : 'bg-[#f8f8f8]'}>
                  <td className="px-2 py-1 border border-gray-300 font-semibold sticky left-0 bg-inherit z-10">
                    <div>{vital.name}</div>
                    <div className="text-[9px] text-gray-500 font-normal">{vital.unit} ({vital.normalRange.min}-{vital.normalRange.max})</div>
                  </td>
                  <td className="px-2 py-1 border border-gray-300 text-center">
                    <Sparkline 
                      data={vitals.map(r => r[vital.key] as number | undefined)} 
                      vitalKey={vital.key}
                    />
                  </td>
                  {vitals.map((reading, readingIdx) => {
                    const value = reading[vital.key] as number | undefined;
                    const status = getValueStatus(vital.key, value);
                    const trend = getTrend(vital.key, readingIdx);
                    
                    return (
                      <td
                        key={reading.id}
                        className="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-[#e0e8f0]"
                        style={getStatusStyle(status)}
                        onClick={() => setSelectedReading(reading)}
                      >
                        {value !== undefined ? (
                          <span className="font-mono">
                            {status === 'critical' && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                            {vital.key === 'temperature' ? value.toFixed(1) : value}
                            <TrendIcon trend={trend} vital={vital.key} />
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-100">
                <td className="px-2 py-1 border border-gray-300 font-semibold sticky left-0 bg-gray-100 z-10">Recorded By</td>
                <td className="px-2 py-1 border border-gray-300"></td>
                {vitals.map((reading) => (
                  <td key={reading.id} className="px-2 py-1 border border-gray-300 text-center text-[10px] text-gray-600">
                    {reading.recordedBy}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-100">
                <td className="px-2 py-1 border border-gray-300 font-semibold sticky left-0 bg-gray-100 z-10">Location</td>
                <td className="px-2 py-1 border border-gray-300"></td>
                {vitals.map((reading) => (
                  <td key={reading.id} className="px-2 py-1 border border-gray-300 text-center text-[10px] text-gray-600">
                    {reading.location}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="ehr-status-bar flex items-center justify-between">
          <span>{vitals.length} readings displayed</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <Modal
        isOpen={selectedReading !== null}
        onClose={() => setSelectedReading(null)}
        title="Vital Signs Detail"
        width="md"
        footer={
          <button className="ehr-button ehr-button-primary" onClick={() => setSelectedReading(null)}>
            Close
          </button>
        }
      >
        {selectedReading && (
          <div className="space-y-3">
            <fieldset className="ehr-fieldset">
              <legend>Reading Information</legend>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><span className="text-gray-500">Date/Time:</span> <span className="ml-1 font-semibold">{selectedReading.timestamp}</span></div>
                <div><span className="text-gray-500">Recorded By:</span> <span className="ml-1">{selectedReading.recordedBy}</span></div>
                <div><span className="text-gray-500">Location:</span> <span className="ml-1">{selectedReading.location}</span></div>
                {selectedReading.notes && (
                  <div className="col-span-2"><span className="text-gray-500">Notes:</span> <span className="ml-1 whitespace-pre-wrap">{selectedReading.notes}</span></div>
                )}
              </div>
            </fieldset>
            <fieldset className="ehr-fieldset">
              <legend>Vital Signs</legend>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {vitalSigns.map(vital => {
                  const value = selectedReading[vital.key] as number | undefined;
                  const status = getValueStatus(vital.key, value);
                  return (
                    <div key={vital.key} className="flex justify-between" style={getStatusStyle(status)}>
                      <span className="text-gray-600">{vital.name}:</span>
                      <span className="font-mono font-semibold">
                        {value !== undefined ? (vital.key === 'temperature' ? value.toFixed(1) : value) : '-'} {vital.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </fieldset>
            <News2Breakdown result={calculateNews2(selectedReading)} />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showAddVitals}
        onClose={closeAddVitals}
        title="Record Vital Signs"
        width="md"
        footer={
          <>
            <button className="ehr-button" onClick={closeAddVitals}>Cancel</button>
            <button className="ehr-button ehr-button-primary" onClick={saveVitals}>Save</button>
          </>
        }
      >
        <div className="space-y-3">
          <fieldset className="ehr-fieldset">
            <legend>Patient</legend>
            <div className="text-[11px]">
              <span className="font-semibold">{selectedPatient.name}</span> ({selectedPatient.mrn}) - Room {selectedPatient.room}
            </div>
          </fieldset>
          <fieldset className="ehr-fieldset">
            <legend>Vital Signs</legend>
            <div className="grid grid-cols-2 gap-3">
              {vitalSigns.map(vital => (
                <div key={vital.key} className="flex items-center space-x-2">
                  <label className="text-[11px] text-gray-600 w-20">{vital.name}:</label>
                  <input
                    type="number"
                    name={vital.key}
                    className="ehr-input flex-1 text-[11px]"
                    placeholder={`${vital.normalRange.min}-${vital.normalRange.max}`}
                    value={form[vital.key] ?? ''}
                    onChange={(e) => setForm(prev => ({ ...prev, [vital.key]: e.target.value }))}
                  />
                  <span className="text-[10px] text-gray-500 w-10">{vital.unit}</span>
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="ehr-fieldset">
            <legend>NEWS2 Assessment</legend>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <label className="flex items-center text-gray-600">
                <input
                  type="checkbox"
                  name="onOxygen"
                  className="ehr-checkbox"
                  checked={form.onOxygen}
                  onChange={(e) => setForm(prev => ({ ...prev, onOxygen: e.target.checked }))}
                />
                On supplemental oxygen
              </label>
              <div className="flex items-center space-x-2">
                <label className="text-gray-600">AVPU:</label>
                <select
                  name="consciousness"
                  className="ehr-input flex-1 text-[11px]"
                  value={form.consciousness}
                  onChange={(e) => setForm(prev => ({ ...prev, consciousness: e.target.value as Consciousness }))}
                >
                  <option value="A">Alert</option>
                  <option value="C">New confusion</option>
                  <option value="V">Responds to voice</option>
                  <option value="P">Responds to pain</option>
                  <option value="U">Unresponsive</option>
                </select>
              </div>
            </div>
            <div
              data-testid="news2-preview"
              className="mt-2 flex items-center space-x-2 p-1.5 border text-[11px]"
              style={{ background: news2RiskStyles[formPreview.risk].background, borderColor: news2RiskStyles[formPreview.risk].border, color: news2RiskStyles[formPreview.risk].color }}
            >
              <News2Badge result={formPreview} />
              <div>
                <div className="font-semibold">Live NEWS2: {formPreview.complete ? `${news2RiskLabels[formPreview.risk]} risk` : 'Incomplete'}</div>
                <div className="text-[10px]">
                  {formPreview.missing.length > 0
                    ? `Incomplete — enter ${formPreview.missing.length} more parameter(s) for a full score`
                    : formPreview.response}
                </div>
              </div>
            </div>
          </fieldset>
          <fieldset className="ehr-fieldset">
            <legend>Notes</legend>
            <textarea
              className="ehr-input w-full h-16 text-[11px]"
              placeholder="Additional notes..."
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            ></textarea>
          </fieldset>
        </div>
      </Modal>

      <AlertDialog
        isOpen={escalation !== null}
        onClose={() => setEscalation(null)}
        title="NEWS2 Escalation Required"
        message={escalation ? `NEWS2 score ${escalation.total} (${news2RiskLabels[escalation.risk]} clinical risk) for ${selectedPatient.name}. ${escalation.response}. Monitoring: ${escalation.frequency}.` : ''}
        type={escalation?.risk === 'HIGH' ? 'error' : 'warning'}
      />
    </div>
  );
}

function News2Breakdown({ result }: { result: News2Result }) {
  const style = news2RiskStyles[result.risk];
  return (
    <fieldset className="ehr-fieldset" data-testid="news2-breakdown">
      <legend>NEWS2 Early Warning Score</legend>
      <table className="w-full text-[11px]">
        <tbody>
          {result.components.map(c => (
            <tr key={c.parameter} className="border-b border-gray-200">
              <td className="text-gray-600 py-0.5">{c.label}</td>
              <td className="font-mono">{c.value}</td>
              <td className="text-right font-mono font-semibold" style={c.points === 3 ? { color: '#990000' } : undefined}>+{c.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center space-x-2 p-1.5 border text-[11px]" style={{ background: style.background, borderColor: style.border, color: style.color }}>
        <News2Badge result={result} />
        <div>
          {result.complete ? (
            <>
              <div className="font-semibold">{news2RiskLabels[result.risk]} clinical risk{result.hasRedScore && result.risk === 'LOW_MEDIUM' ? ' (single parameter scored 3)' : ''}</div>
              <div className="text-[10px]">{result.response} · {result.frequency}</div>
            </>
          ) : (
            <>
              <div className="font-semibold">Incomplete: partial score only, not risk-classified</div>
              <div className="text-[10px]">Missing: {result.missing.map(m => news2ParameterLabels[m]).join(', ')}</div>
            </>
          )}
        </div>
      </div>
    </fieldset>
  );
}
