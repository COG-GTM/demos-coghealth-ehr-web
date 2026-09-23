import { useState } from 'react';
import { FlaskConical, AlertTriangle, ChevronDown, ChevronRight, Printer, RefreshCw, Filter, Calendar } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import type { LabPanel, LabResult } from '../types';

const defaultLabPanels: LabPanel[] = [
  {
    id: 1,
    panelName: 'Basic Metabolic Panel (BMP)',
    patientName: 'Smith, John',
    patientMrn: 'MRN001234',
    collectedAt: '01/18/2024 08:30',
    resultedAt: '01/18/2024 10:15',
    status: 'final',
    results: [
      { id: 1, testName: 'Sodium', value: '138', unit: 'mEq/L', referenceRange: '136-145', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 2, testName: 'Potassium', value: '6.8', unit: 'mEq/L', referenceRange: '3.5-5.0', status: 'critical', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 3, testName: 'Chloride', value: '102', unit: 'mEq/L', referenceRange: '98-106', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 4, testName: 'CO2', value: '18', unit: 'mEq/L', referenceRange: '23-29', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 5, testName: 'BUN', value: '42', unit: 'mg/dL', referenceRange: '7-20', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 6, testName: 'Creatinine', value: '3.2', unit: 'mg/dL', referenceRange: '0.7-1.3', status: 'critical', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 7, testName: 'Glucose', value: '156', unit: 'mg/dL', referenceRange: '70-100', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 8, testName: 'Calcium', value: '9.1', unit: 'mg/dL', referenceRange: '8.5-10.5', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 10:15', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 2,
    panelName: 'Complete Blood Count (CBC)',
    patientName: 'Smith, John',
    patientMrn: 'MRN001234',
    collectedAt: '01/18/2024 08:30',
    resultedAt: '01/18/2024 09:45',
    status: 'final',
    results: [
      { id: 9, testName: 'WBC', value: '12.4', unit: 'K/uL', referenceRange: '4.5-11.0', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 10, testName: 'RBC', value: '3.8', unit: 'M/uL', referenceRange: '4.5-5.5', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 11, testName: 'Hemoglobin', value: '10.2', unit: 'g/dL', referenceRange: '13.5-17.5', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 12, testName: 'Hematocrit', value: '31.5', unit: '%', referenceRange: '38.8-50.0', status: 'abnormal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 13, testName: 'Platelets', value: '245', unit: 'K/uL', referenceRange: '150-400', status: 'normal', collectedAt: '01/18/2024 08:30', resultedAt: '01/18/2024 09:45', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 3,
    panelName: 'Cardiac Enzymes',
    patientName: 'Martinez, Ana',
    patientMrn: 'MRN001241',
    collectedAt: '01/18/2024 06:00',
    resultedAt: '01/18/2024 07:30',
    status: 'final',
    results: [
      { id: 14, testName: 'Troponin I', value: '2.4', unit: 'ng/mL', referenceRange: '<0.04', status: 'critical', collectedAt: '01/18/2024 06:00', resultedAt: '01/18/2024 07:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 15, testName: 'CK-MB', value: '28', unit: 'ng/mL', referenceRange: '0-5', status: 'critical', collectedAt: '01/18/2024 06:00', resultedAt: '01/18/2024 07:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 16, testName: 'BNP', value: '890', unit: 'pg/mL', referenceRange: '<100', status: 'abnormal', collectedAt: '01/18/2024 06:00', resultedAt: '01/18/2024 07:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 4,
    panelName: 'Lipid Panel',
    patientName: 'Johnson, Sarah',
    patientMrn: 'MRN001235',
    collectedAt: '01/17/2024 07:00',
    resultedAt: '01/17/2024 14:00',
    status: 'final',
    results: [
      { id: 17, testName: 'Total Cholesterol', value: '242', unit: 'mg/dL', referenceRange: '<200', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 18, testName: 'LDL', value: '165', unit: 'mg/dL', referenceRange: '<100', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 19, testName: 'HDL', value: '38', unit: 'mg/dL', referenceRange: '>40', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 20, testName: 'Triglycerides', value: '195', unit: 'mg/dL', referenceRange: '<150', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 14:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 5,
    panelName: 'Hemoglobin A1c',
    patientName: 'Johnson, Sarah',
    patientMrn: 'MRN001235',
    collectedAt: '01/17/2024 07:00',
    resultedAt: '01/17/2024 16:00',
    status: 'final',
    results: [
      { id: 21, testName: 'HbA1c', value: '9.2', unit: '%', referenceRange: '<5.7', status: 'abnormal', collectedAt: '01/17/2024 07:00', resultedAt: '01/17/2024 16:00', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
  {
    id: 6,
    panelName: 'Urinalysis',
    patientName: 'Williams, Michael',
    patientMrn: 'MRN001236',
    collectedAt: '01/16/2024 10:00',
    resultedAt: '01/16/2024 11:30',
    status: 'final',
    results: [
      { id: 22, testName: 'Color', value: 'Yellow', unit: '', referenceRange: 'Yellow', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 23, testName: 'Clarity', value: 'Clear', unit: '', referenceRange: 'Clear', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 24, testName: 'pH', value: '6.0', unit: '', referenceRange: '5.0-8.0', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 25, testName: 'Protein', value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
      { id: 26, testName: 'Glucose', value: 'Negative', unit: '', referenceRange: 'Negative', status: 'normal', collectedAt: '01/16/2024 10:00', resultedAt: '01/16/2024 11:30', orderedBy: 'Dr. Anderson', performingLab: 'Main Lab' },
    ]
  },
];

export default function LabResultsPage() {
  const [labPanels] = useState<LabPanel[]>(defaultLabPanels);
  const [expandedPanels, setExpandedPanels] = useState<number[]>([1, 3]);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'abnormal' | 'critical'>('all');
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const togglePanel = (panelId: number) => {
    setExpandedPanels(prev =>
      prev.includes(panelId) ? prev.filter(id => id !== panelId) : [...prev, panelId]
    );
  };

  const getStatusClass = (status: LabResult['status']) => {
    switch (status) {
      case 'critical':
        return 'ehr-result-critical';
      case 'abnormal':
        return 'ehr-result-abnormal';
      default:
        return '';
    }
  };

  const getStatusBadge = (status: LabPanel['status']) => {
    switch (status) {
      case 'final':
        return <span className="px-1.5 py-0.5 text-[9px] bg-green-100 text-green-800 border border-green-300">FINAL</span>;
      case 'preliminary':
        return <span className="px-1.5 py-0.5 text-[9px] bg-yellow-100 text-yellow-800 border border-yellow-300">PRELIM</span>;
      case 'pending':
        return <span className="px-1.5 py-0.5 text-[9px] bg-gray-100 text-gray-600 border border-gray-300">PENDING</span>;
    }
  };

  const uniquePatients = [...new Set(labPanels.map(p => p.patientMrn))];

  const filteredPanels = labPanels.filter(panel => {
    if (filterPatient !== 'all' && panel.patientMrn !== filterPatient) return false;
    if (filterStatus === 'abnormal') {
      return panel.results.some(r => r.status === 'abnormal' || r.status === 'critical');
    }
    if (filterStatus === 'critical') {
      return panel.results.some(r => r.status === 'critical');
    }
    return true;
  });

  const criticalCount = labPanels.reduce((acc, p) => acc + p.results.filter(r => r.status === 'critical').length, 0);
  const abnormalCount = labPanels.reduce((acc, p) => acc + p.results.filter(r => r.status === 'abnormal').length, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden p-2">
      <div className="ehr-panel flex-1 flex flex-col overflow-hidden">
        <div className="ehr-header flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-4 h-4" />
            <span>Laboratory Results</span>
          </div>
          <div className="flex items-center space-x-2">
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
              <Filter className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-600">Filter:</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="ehr-input text-[10px] py-0.5"
            >
              <option value="all">All Results</option>
              <option value="abnormal">Abnormal Only</option>
              <option value="critical">Critical Only</option>
            </select>
            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="ehr-input text-[10px] py-0.5"
            >
              <option value="all">All Patients</option>
              {uniquePatients.map(mrn => {
                const panel = labPanels.find(p => p.patientMrn === mrn);
                return (
                  <option key={mrn} value={mrn}>{panel?.patientName} ({mrn})</option>
                );
              })}
            </select>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                className="ehr-input text-[10px] py-0.5"
              >
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-[10px]">
            <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300">
              {criticalCount} Critical
            </span>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300">
              {abnormalCount} Abnormal
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white border border-gray-400">
          {filteredPanels.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-[11px]">
              No lab results match the selected filters
            </div>
          ) : (
            filteredPanels.map(panel => (
              <div key={panel.id} className="border-b border-gray-300">
                <div
                  className="ehr-table-heading flex items-center justify-between px-2 py-1.5 cursor-pointer"
                  onClick={() => togglePanel(panel.id)}
                >
                  <div className="flex items-center space-x-2">
                    {expandedPanels.includes(panel.id) ? (
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-600" />
                    )}
                    <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-[11px]">{panel.panelName}</span>
                    {getStatusBadge(panel.status)}
                    {panel.results.some(r => r.status === 'critical') && (
                      <span className="flex items-center space-x-0.5 text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[9px] font-bold">CRITICAL</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-[10px] text-gray-600">
                    <span>{panel.patientName}</span>
                    <span className="text-gray-400">|</span>
                    <span>{panel.patientMrn}</span>
                    <span className="text-gray-400">|</span>
                    <span>Collected: {panel.collectedAt}</span>
                    <span className="text-gray-400">|</span>
                    <span>Resulted: {panel.resultedAt}</span>
                  </div>
                </div>

                {expandedPanels.includes(panel.id) && (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="ehr-table-heading">
                        <th className="text-left px-2 py-1 border-b border-gray-400 w-1/4">Test</th>
                        <th className="text-left px-2 py-1 border-b border-gray-400 w-1/6">Result</th>
                        <th className="text-left px-2 py-1 border-b border-gray-400 w-1/6">Units</th>
                        <th className="text-left px-2 py-1 border-b border-gray-400 w-1/4">Reference Range</th>
                        <th className="text-left px-2 py-1 border-b border-gray-400 w-1/6">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {panel.results.map((result, idx) => (
                        <tr
                          key={result.id}
                          className={`cursor-pointer hover:bg-[#e0e8f0] ${idx % 2 === 0 ? 'bg-white' : 'ehr-table-row-alt'} ${getStatusClass(result.status)}`}
                          onClick={() => setSelectedResult(result)}
                        >
                          <td className="px-2 py-1 border-b border-gray-200">{result.testName}</td>
                          <td className="px-2 py-1 border-b border-gray-200 font-mono">
                            {result.status === 'critical' && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-600" />}
                            {result.value}
                          </td>
                          <td className="px-2 py-1 border-b border-gray-200">{result.unit}</td>
                          <td className="px-2 py-1 border-b border-gray-200 text-gray-600">{result.referenceRange}</td>
                          <td className="px-2 py-1 border-b border-gray-200">
                            {result.status === 'critical' && <span className="text-red-700 font-bold">CRITICAL</span>}
                            {result.status === 'abnormal' && <span className="text-yellow-700">Abnormal</span>}
                            {result.status === 'normal' && <span className="text-green-700">Normal</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>

        <div className="ehr-status-bar flex items-center justify-between">
          <span>{filteredPanels.length} panel(s) displayed</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <Modal
        isOpen={selectedResult !== null}
        onClose={() => setSelectedResult(null)}
        title="Lab Result Detail"
        width="md"
        footer={
          <button className="ehr-button ehr-button-primary" onClick={() => setSelectedResult(null)}>
            Close
          </button>
        }
      >
        {selectedResult && (
          <div className="space-y-3">
            <fieldset className="ehr-fieldset">
              <legend>Result Information</legend>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Test Name:</span>
                  <span className="ml-2 font-semibold">{selectedResult.testName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className={`ml-2 ${getStatusClass(selectedResult.status)}`}>
                    {selectedResult.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Result:</span>
                  <span className="ml-2 font-mono font-bold">{selectedResult.value} {selectedResult.unit}</span>
                </div>
                <div>
                  <span className="text-gray-500">Reference Range:</span>
                  <span className="ml-2">{selectedResult.referenceRange}</span>
                </div>
              </div>
            </fieldset>
            <fieldset className="ehr-fieldset">
              <legend>Collection Details</legend>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Collected:</span>
                  <span className="ml-2">{selectedResult.collectedAt}</span>
                </div>
                <div>
                  <span className="text-gray-500">Resulted:</span>
                  <span className="ml-2">{selectedResult.resultedAt}</span>
                </div>
                <div>
                  <span className="text-gray-500">Ordered By:</span>
                  <span className="ml-2">{selectedResult.orderedBy}</span>
                </div>
                <div>
                  <span className="text-gray-500">Performing Lab:</span>
                  <span className="ml-2">{selectedResult.performingLab}</span>
                </div>
              </div>
            </fieldset>
            {selectedResult.status === 'critical' && (
              <div className="ehr-alert-critical p-2 text-[11px]">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-bold">CRITICAL VALUE ALERT</span>
                </div>
                <p className="mt-1">This result is outside the critical range and requires immediate clinical attention.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
