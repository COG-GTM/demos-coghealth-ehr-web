import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Printer, RefreshCw, Plus, Calendar, BellRing, CheckCircle } from 'lucide-react';
import { Modal, ConfirmDialog, AlertDialog } from '../components/ui/Modal';
import { logAuditEvent } from '../services/auditService';
import { calculateNews2, consciousnessLabels, getNews2Response, isNews2Actionable, news2ParameterLabels, news2RiskStyles, type News2Result } from '../utils/news2';
import type { Consciousness, VitalReading } from '../types';

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
  { id: 1, timestamp: '2024-01-18 14:00', systolic: 158, diastolic: 94, heartRate: 98, temperature: 98.6, respiratoryRate: 20, spo2: 94, weight: 82.5, painLevel: 4, recordedBy: 'RN Smith', location: 'Med-Surg 4W' },
  { id: 2, timestamp: '2024-01-18 10:00', systolic: 162, diastolic: 96, heartRate: 102, temperature: 99.1, respiratoryRate: 22, spo2: 93, weight: 82.5, painLevel: 5, recordedBy: 'RN Johnson', location: 'Med-Surg 4W' },
  { id: 3, timestamp: '2024-01-18 06:00', systolic: 168, diastolic: 98, heartRate: 108, temperature: 99.8, respiratoryRate: 24, spo2: 92, weight: 82.8, painLevel: 6, recordedBy: 'RN Williams', location: 'Med-Surg 4W' },
  { id: 4, timestamp: '2024-01-17 22:00', systolic: 172, diastolic: 100, heartRate: 112, temperature: 100.2, respiratoryRate: 26, spo2: 91, weight: 83.0, painLevel: 7, recordedBy: 'RN Davis', location: 'Med-Surg 4W' },
  { id: 5, timestamp: '2024-01-17 18:00', systolic: 178, diastolic: 102, heartRate: 118, temperature: 100.8, respiratoryRate: 28, spo2: 90, weight: 83.2, painLevel: 8, onSupplementalO2: true, recordedBy: 'RN Brown', location: 'ED' },
  { id: 6, timestamp: '2024-01-17 14:00', systolic: 182, diastolic: 108, heartRate: 124, temperature: 101.4, respiratoryRate: 30, spo2: 88, weight: 83.5, painLevel: 9, onSupplementalO2: true, recordedBy: 'RN Miller', location: 'ED' },
  { id: 7, timestamp: '2024-01-17 10:00', systolic: 145, diastolic: 88, heartRate: 88, temperature: 98.4, respiratoryRate: 18, spo2: 96, weight: 82.0, painLevel: 2, recordedBy: 'RN Wilson', location: 'Clinic' },
  { id: 8, timestamp: '2024-01-16 14:00', systolic: 138, diastolic: 84, heartRate: 76, temperature: 98.2, respiratoryRate: 16, spo2: 98, weight: 82.0, painLevel: 0, recordedBy: 'RN Taylor', location: 'Clinic' },
];

const patientInfo = { name: 'Smith, John', mrn: 'MRN001234', age: 58, gender: 'M', room: '412A' };

type VitalFormValues = Partial<Record<(typeof vitalSigns)[number]['key'], string>>;

interface VitalForm {
  values: VitalFormValues;
  consciousness: Consciousness;
  onSupplementalO2: boolean;
  notes: string;
}

const emptyVitalForm: VitalForm = { values: {}, consciousness: 'A', onSupplementalO2: false, notes: '' };

function parseVitalForm(form: VitalForm): Partial<VitalReading> {
  const reading: Partial<VitalReading> = { consciousness: form.consciousness, onSupplementalO2: form.onSupplementalO2 };
  if (form.notes.trim() !== '') reading.notes = form.notes.trim();
  vitalSigns.forEach(({ key }) => {
    const raw = form.values[key];
    if (raw !== undefined && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
      reading[key] = Number(raw);
    }
  });
  return reading;
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getEscalationTarget(result: News2Result): string {
  return result.risk === 'HIGH' ? 'Rapid Response Team' : 'Attending Provider (Dr. Sarah Anderson)';
}

function Sparkline({ data, vitalKey, abnormal }: { data: (number | undefined)[]; vitalKey: string; abnormal?: boolean }) {
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
  const isAbnormal = abnormal ?? (vital && (lastValue < vital.normalRange.min || lastValue > vital.normalRange.max));

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
}

function News2Breakdown({ result }: { result: News2Result }) {
  const response = getNews2Response(result);
  const style = news2RiskStyles[result.risk];
  return (
    <div className="space-y-2" data-testid="news2-breakdown">
      <table className="w-full text-[11px] bg-white border border-gray-400">
        <thead>
          <tr className="bg-gradient-to-b from-[#f8f8f8] to-[#e8e8e8]">
            <th className="text-left px-2 py-0.5 border border-gray-300">Parameter</th>
            <th className="text-left px-2 py-0.5 border border-gray-300">Value</th>
            <th className="text-center px-2 py-0.5 border border-gray-300 w-14">Points</th>
          </tr>
        </thead>
        <tbody>
          {result.components.map(c => (
            <tr key={c.key}>
              <td className="px-2 py-0.5 border border-gray-300">{c.label}</td>
              <td className="px-2 py-0.5 border border-gray-300 font-mono">{c.display}</td>
              <td
                className="px-2 py-0.5 border border-gray-300 text-center font-mono font-bold"
                style={c.points === 3 ? { background: '#ffcccc', color: '#990000' } : c.points > 0 ? { background: '#fff3cd', color: '#664d00' } : undefined}
              >
                {c.points}
              </td>
            </tr>
          ))}
          {result.missing.map(key => (
            <tr key={key} className="text-gray-400 italic">
              <td className="px-2 py-0.5 border border-gray-300">{news2ParameterLabels[key]}</td>
              <td className="px-2 py-0.5 border border-gray-300">not recorded</td>
              <td className="px-2 py-0.5 border border-gray-300 text-center">-</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 border text-[11px]" style={{ background: style.background, color: style.color, borderColor: style.border }}>
        <div className="font-bold">
          NEWS2 Total: <span data-testid="news2-breakdown-total">{result.total}</span> — {response.label}
          {!result.complete && <span className="font-normal italic"> (incomplete — missing {result.missing.length} parameter{result.missing.length === 1 ? '' : 's'})</span>}
        </div>
        <div>Monitoring: {response.monitoring}</div>
        <div>Response: {response.action}</div>
      </div>
    </div>
  );
}

export default function VitalsPage() {
  const [vitals, setVitals] = useState<VitalReading[]>(defaultVitals);
  const [vitalForm, setVitalForm] = useState<VitalForm>(emptyVitalForm);
  const [escalationReadingId, setEscalationReadingId] = useState<number | null>(null);
  const [escalations, setEscalations] = useState<Record<number, { target: string; time: string }>>({});
  const [escalationConfirmation, setEscalationConfirmation] = useState<string | null>(null);
  const [selectedReading, setSelectedReading] = useState<VitalReading | null>(null);
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [dateRange, setDateRange] = useState<'24h' | '48h' | '7d' | '30d'>('48h');
  const [selectedPatient] = useState(patientInfo);

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

  const news2Scores = vitals.map(r => calculateNews2(r));
  const latestReading = vitals[0];
  const latestNews2 = news2Scores[0];
  const previousNews2 = news2Scores[1];
  const peakIdx = news2Scores.reduce((best, s, i) => (s.total > news2Scores[best].total ? i : best), 0);
  const formPreview = calculateNews2(parseVitalForm(vitalForm));
  const formHasValues = Object.values(vitalForm.values).some(v => v !== undefined && v.trim() !== '');
  const escalationReading = vitals.find(r => r.id === escalationReadingId) ?? null;
  const escalationNews2 = escalationReading ? calculateNews2(escalationReading) : null;

  const closeAddVitals = () => {
    setShowAddVitals(false);
    setVitalForm(emptyVitalForm);
  };

  const saveVitals = () => {
    const parsed = parseVitalForm(vitalForm);
    const reading: VitalReading = {
      ...parsed,
      id: Math.max(0, ...vitals.map(v => v.id)) + 1,
      timestamp: formatTimestamp(new Date()),
      recordedBy: 'Dr. Anderson',
      location: 'Med-Surg 4W',
    };
    const result = calculateNews2(reading);
    setVitals(prev => [reading, ...prev]);
    logAuditEvent('VITALS_RECORD', {
      patientMrn: selectedPatient.mrn,
      patientName: selectedPatient.name,
      resourceType: 'VitalReading',
      resourceId: String(reading.id),
      action: 'Vital signs recorded',
      details: `NEWS2 ${result.total} (${result.risk})`,
    });
    closeAddVitals();
    if (isNews2Actionable(result.risk)) {
      setEscalationReadingId(reading.id);
    }
  };

  const confirmEscalation = () => {
    if (!escalationReading || !escalationNews2) return;
    const target = getEscalationTarget(escalationNews2);
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setEscalations(prev => ({ ...prev, [escalationReading.id]: { target, time } }));
    logAuditEvent('CLINICAL_ESCALATION', {
      patientMrn: selectedPatient.mrn,
      patientName: selectedPatient.name,
      resourceType: 'VitalReading',
      resourceId: String(escalationReading.id),
      action: `Escalated to ${target}`,
      details: `NEWS2 ${escalationNews2.total} (${escalationNews2.risk})`,
    });
    setEscalationConfirmation(
      `${target} notified for ${selectedPatient.name} (${selectedPatient.mrn}), Room ${selectedPatient.room}. NEWS2 ${escalationNews2.total} — ${getNews2Response(escalationNews2).label}.`
    );
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

        {latestReading && latestNews2 && (() => {
          const style = news2RiskStyles[latestNews2.risk];
          const response = getNews2Response(latestNews2);
          const delta = previousNews2 ? latestNews2.total - previousNews2.total : 0;
          const escalation = escalations[latestReading.id];
          return (
            <div
              className="flex items-center justify-between px-2 py-1.5 border-2 mb-1 text-[11px]"
              style={{ background: style.background, color: style.color, borderColor: style.border }}
              data-testid="news2-banner"
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 flex flex-col items-center justify-center border-2 bg-white font-bold"
                  style={{ borderColor: style.border }}
                >
                  <span className="text-[8px] leading-none">NEWS2</span>
                  <span className="text-[18px] leading-none" data-testid="news2-latest-score">{latestNews2.total}</span>
                </div>
                <div>
                  <div className="font-bold flex items-center space-x-2">
                    {isNews2Actionable(latestNews2.risk) && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span data-testid="news2-latest-risk">{response.label}</span>
                    <span className="font-normal">· Early Warning Score as of {latestReading.timestamp}</span>
                    {previousNews2 && (
                      <span className="font-normal flex items-center">
                        {delta > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : delta < 0 ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
                        {delta > 0 ? `Worsening (+${delta})` : delta < 0 ? `Improving (${delta})` : 'Unchanged'} vs previous
                      </span>
                    )}
                  </div>
                  <div>{response.monitoring} · {response.action}</div>
                  {peakIdx !== 0 && (
                    <div className="text-[10px] opacity-80">Peak this window: NEWS2 {news2Scores[peakIdx].total} at {vitals[peakIdx].timestamp}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {escalation ? (
                  <span className="flex items-center space-x-1 font-semibold" data-testid="news2-escalated">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{escalation.target} notified at {escalation.time}</span>
                  </span>
                ) : isNews2Actionable(latestNews2.risk) ? (
                  <button className="ehr-button flex items-center space-x-1" onClick={() => setEscalationReadingId(latestReading.id)}>
                    <BellRing className="w-3 h-3" />
                    <span>{latestNews2.risk === 'HIGH' ? 'Call Rapid Response' : 'Notify Provider'}</span>
                  </button>
                ) : null}
                <button className="ehr-button" onClick={() => setSelectedReading(latestReading)}>Score Details</button>
              </div>
            </div>
          );
        })()}

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
                <td className="px-2 py-1 border border-gray-300 text-center">
                  <Sparkline data={news2Scores.map(s => s.total)} vitalKey="news2" abnormal={latestNews2 ? isNews2Actionable(latestNews2.risk) : false} />
                </td>
                {vitals.map((reading, readingIdx) => {
                  const score = news2Scores[readingIdx];
                  const style = news2RiskStyles[score.risk];
                  return (
                    <td
                      key={reading.id}
                      className="px-2 py-1 border border-gray-300 text-center cursor-pointer font-mono font-bold"
                      style={{ background: style.background, color: style.color }}
                      title={`${getNews2Response(score).label}${score.complete ? '' : ' (incomplete)'}`}
                      onClick={() => setSelectedReading(reading)}
                    >
                      {score.total}{!score.complete && '*'}
                      {escalations[reading.id] && <BellRing className="w-3 h-3 inline ml-0.5" />}
                    </td>
                  );
                })}
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
                  <div className="col-span-2" data-testid="reading-notes"><span className="text-gray-500">Notes:</span> <span className="ml-1 whitespace-pre-wrap">{selectedReading.notes}</span></div>
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
            <fieldset className="ehr-fieldset">
              <legend>NEWS2 Early Warning Score</legend>
              <News2Breakdown result={calculateNews2(selectedReading)} />
              {(() => {
                const result = calculateNews2(selectedReading);
                const escalation = escalations[selectedReading.id];
                if (escalation) {
                  return (
                    <div className="mt-2 flex items-center space-x-1 text-[11px] font-semibold text-green-800" data-testid="detail-escalated">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{escalation.target} notified at {escalation.time}</span>
                    </div>
                  );
                }
                if (!isNews2Actionable(result.risk)) return null;
                return (
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-red-800 font-semibold">Escalation pending for this reading</span>
                    <button
                      className="ehr-button flex items-center space-x-1"
                      data-testid="detail-escalate"
                      onClick={() => {
                        setEscalationReadingId(selectedReading.id);
                        setSelectedReading(null);
                      }}
                    >
                      <BellRing className="w-3 h-3" />
                      <span>{result.risk === 'HIGH' ? 'Call Rapid Response' : 'Notify Provider'}</span>
                    </button>
                  </div>
                );
              })()}
            </fieldset>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showAddVitals}
        onClose={closeAddVitals}
        title="Record Vital Signs"
        width="lg"
        footer={
          <>
            <button className="ehr-button" onClick={closeAddVitals}>Cancel</button>
            <button className="ehr-button ehr-button-primary" onClick={saveVitals} disabled={!formHasValues}>Save</button>
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
                    value={vitalForm.values[vital.key] ?? ''}
                    onChange={(e) => setVitalForm(prev => ({ ...prev, values: { ...prev.values, [vital.key]: e.target.value } }))}
                  />
                  <span className="text-[10px] text-gray-500 w-10">{vital.unit}</span>
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="ehr-fieldset">
            <legend>Assessment</legend>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="flex items-center space-x-2">
                <label className="text-gray-600 w-20" htmlFor="consciousness">Level (ACVPU):</label>
                <select
                  id="consciousness"
                  className="ehr-input flex-1 text-[11px]"
                  value={vitalForm.consciousness}
                  onChange={(e) => setVitalForm(prev => ({ ...prev, consciousness: e.target.value as Consciousness }))}
                >
                  {(Object.keys(consciousnessLabels) as Consciousness[]).map(level => (
                    <option key={level} value={level}>{level} - {consciousnessLabels[level]}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="ehr-checkbox"
                  checked={vitalForm.onSupplementalO2}
                  onChange={(e) => setVitalForm(prev => ({ ...prev, onSupplementalO2: e.target.checked }))}
                />
                <span>On supplemental oxygen</span>
              </label>
            </div>
          </fieldset>
          <fieldset className="ehr-fieldset">
            <legend>Live NEWS2 Score</legend>
            {formHasValues ? (
              <News2Breakdown result={formPreview} />
            ) : (
              <div className="text-[11px] text-gray-500 italic">Enter vital signs to calculate the NEWS2 early warning score.</div>
            )}
          </fieldset>
          <fieldset className="ehr-fieldset">
            <legend>Notes</legend>
            <textarea
              className="ehr-input w-full h-16 text-[11px]"
              placeholder="Additional notes..."
              value={vitalForm.notes}
              onChange={(e) => setVitalForm(prev => ({ ...prev, notes: e.target.value }))}
            ></textarea>
          </fieldset>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={escalationReading !== null && escalationNews2 !== null && !escalations[escalationReading.id]}
        onClose={() => setEscalationReadingId(null)}
        onConfirm={confirmEscalation}
        title="NEWS2 Deterioration Alert"
        message={escalationNews2 ? `NEWS2 score is ${escalationNews2.total} (${getNews2Response(escalationNews2).label}) for ${selectedPatient.name}. ${getNews2Response(escalationNews2).action}. Notify ${getEscalationTarget(escalationNews2)} now?` : ''}
        confirmText={escalationNews2?.risk === 'HIGH' ? 'Call Rapid Response' : 'Notify Provider'}
        cancelText="Not Now"
        type={escalationNews2?.risk === 'HIGH' ? 'danger' : 'warning'}
      />

      <AlertDialog
        isOpen={escalationConfirmation !== null}
        onClose={() => setEscalationConfirmation(null)}
        title="Escalation Sent"
        message={escalationConfirmation ?? ''}
        type="success"
      />
    </div>
  );
}
