import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, Printer, RefreshCw, Plus, Calendar } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import type { VitalReading } from '../types';
import { calculateNews2, type News2Risk } from '../utils/news2';

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
  { id: 5, timestamp: '2024-01-17 18:00', systolic: 178, diastolic: 102, heartRate: 118, temperature: 100.8, respiratoryRate: 28, spo2: 90, weight: 83.2, painLevel: 8, recordedBy: 'RN Brown', location: 'ED' },
  { id: 6, timestamp: '2024-01-17 14:00', systolic: 182, diastolic: 108, heartRate: 124, temperature: 101.4, respiratoryRate: 30, spo2: 88, weight: 83.5, painLevel: 9, recordedBy: 'RN Miller', location: 'ED' },
  { id: 7, timestamp: '2024-01-17 10:00', systolic: 145, diastolic: 88, heartRate: 88, temperature: 98.4, respiratoryRate: 18, spo2: 96, weight: 82.0, painLevel: 2, recordedBy: 'RN Wilson', location: 'Clinic' },
  { id: 8, timestamp: '2024-01-16 14:00', systolic: 138, diastolic: 84, heartRate: 76, temperature: 98.2, respiratoryRate: 16, spo2: 98, weight: 82.0, painLevel: 0, recordedBy: 'RN Taylor', location: 'Clinic' },
];

const patientInfo = { name: 'Smith, John', mrn: 'MRN001234', age: 58, gender: 'M', room: '412A' };

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
  const isAbnormal = vitalKey === 'news2'
    ? lastValue >= 5
    : vital !== undefined && (lastValue < vital.normalRange.min || lastValue > vital.normalRange.max);

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

export default function VitalsPage() {
  const [vitals, setVitals] = useState<VitalReading[]>(defaultVitals);
  const [selectedReading, setSelectedReading] = useState<VitalReading | null>(null);
  const [showAddVitals, setShowAddVitals] = useState(false);
  const [dateRange, setDateRange] = useState<'24h' | '48h' | '7d' | '30d'>('48h');
  const [selectedPatient] = useState(patientInfo);
  const [newVitals, setNewVitals] = useState<Partial<Record<typeof vitalSigns[number]['key'], string>>>({});

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

  const getNews2Style = (risk: News2Risk) => {
    switch (risk) {
      case 'low-medium': return { background: '#fff3cd', color: '#664d00' };
      case 'medium': return { background: '#ffe0b3', color: '#8a4b00' };
      case 'high': return { background: '#ffcccc', color: '#990000' };
      default: return { background: '#c6efce', color: '#006100' };
    }
  };

  const saveVitals = () => {
    const enteredVitals = vitalSigns.reduce<Partial<VitalReading>>((values, vital) => {
      const value = newVitals[vital.key];
      if (value !== undefined && value.trim() !== '') {
        values[vital.key] = Number(value);
      }
      return values;
    }, {});
    const nextId = vitals.reduce((maxId, reading) => Math.max(maxId, reading.id), 0) + 1;
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const reading: VitalReading = {
      id: nextId,
      timestamp,
      recordedBy: 'Dr. Sarah Anderson',
      location: `Room ${selectedPatient.room}`,
      ...enteredVitals,
    };

    setVitals(previousVitals => [reading, ...previousVitals]);
    setShowAddVitals(false);
    setNewVitals({});
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
              <tr className="bg-[#f8f8f8]">
                <td className="px-2 py-1 border border-gray-300 font-semibold sticky left-0 bg-[#f8f8f8] z-10">
                  <div>NEWS2 Score</div>
                  <div className="text-[9px] text-gray-500 font-normal">0-20 (RCP 2017)</div>
                </td>
                <td className="px-2 py-1 border border-gray-300 text-center">
                  <Sparkline data={vitals.map(reading => calculateNews2(reading).total)} vitalKey="news2" />
                </td>
                {vitals.map(reading => {
                  const news2 = calculateNews2(reading);
                  const isAlert = news2.risk === 'medium' || news2.risk === 'high';
                  return (
                    <td
                      key={reading.id}
                      className="px-2 py-1 border border-gray-300 text-center cursor-pointer hover:bg-[#e0e8f0]"
                      onClick={() => setSelectedReading(reading)}
                    >
                      <span className="font-mono font-bold px-1.5 py-0.5" style={getNews2Style(news2.risk)}>
                        {news2.total}
                      </span>
                      {isAlert && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-600" />}
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
          <span>
            Current NEWS2: {vitals.length > 0 ? calculateNews2(vitals[0]).total : 0} ({vitals.length > 0 ? calculateNews2(vitals[0]).risk : 'low'})
            <span className="ml-3">Last updated: {new Date().toLocaleTimeString()}</span>
          </span>
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
              </div>
            </fieldset>
            <fieldset className="ehr-fieldset">
              <legend>NEWS2 Early Warning Score</legend>
              {(() => {
                const news2 = calculateNews2(selectedReading);
                return (
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-2xl font-bold">{news2.total}</span>
                      <span className="px-1.5 py-0.5 font-semibold" style={getNews2Style(news2.risk)}>{news2.risk}</span>
                    </div>
                    <div className="text-gray-700">{news2.response}</div>
                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-[#e0e0e0]">
                          <th className="border border-gray-400 px-1 py-0.5 text-left">Component</th>
                          <th className="border border-gray-400 px-1 py-0.5 text-right">Value</th>
                          <th className="border border-gray-400 px-1 py-0.5 text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {news2.components.map(component => (
                          <tr key={component.name}>
                            <td className="border border-gray-300 px-1 py-0.5">{component.name}</td>
                            <td className="border border-gray-300 px-1 py-0.5 text-right font-mono">
                              {component.value === undefined ? '-' : component.name === 'Temperature' ? `${component.value.toFixed(1)} °C` : component.value}
                            </td>
                            <td
                              className="border border-gray-300 px-1 py-0.5 text-right font-mono font-semibold"
                              style={component.points >= 3 ? { background: '#ffcccc', color: '#990000' } : undefined}
                            >
                              {component.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
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
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showAddVitals}
        onClose={() => setShowAddVitals(false)}
        title="Record Vital Signs"
        width="md"
        footer={
          <>
            <button className="ehr-button" onClick={() => setShowAddVitals(false)}>Cancel</button>
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
                  <label htmlFor={`new-${vital.key}`} className="text-[11px] text-gray-600 w-20">{vital.name}:</label>
                  <input
                    id={`new-${vital.key}`}
                    type="number"
                    className="ehr-input flex-1 text-[11px]"
                    placeholder={`${vital.normalRange.min}-${vital.normalRange.max}`}
                    value={newVitals[vital.key] ?? ''}
                    onChange={event => setNewVitals(previous => ({ ...previous, [vital.key]: event.target.value }))}
                  />
                  <span className="text-[10px] text-gray-500 w-10">{vital.unit}</span>
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="ehr-fieldset">
            <legend>Notes</legend>
            <textarea className="ehr-input w-full h-16 text-[11px]" placeholder="Additional notes..."></textarea>
          </fieldset>
        </div>
      </Modal>
    </div>
  );
}
