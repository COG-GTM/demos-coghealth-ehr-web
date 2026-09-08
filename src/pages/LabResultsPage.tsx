import { useState } from 'react';
import { FlaskConical, AlertTriangle, ChevronDown, ChevronRight, Printer, RefreshCw, Filter, Calendar, CheckCircle2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { AcknowledgeLabDialog } from '../components/ui/AcknowledgeLabDialog';
import { defaultLabPanels } from '../data/labPanels';
import { acknowledgePanel, getAcknowledgments, hasCriticalResult, isUnacknowledgedCritical } from '../services/labAcknowledgmentService';
import type { LabAcknowledgment, LabPanel, LabResult } from '../types';

export default function LabResultsPage() {
  const [labPanels] = useState<LabPanel[]>(defaultLabPanels);
  const [acknowledgments, setAcknowledgments] = useState<Record<number, LabAcknowledgment>>(() => getAcknowledgments());
  const [panelToAcknowledge, setPanelToAcknowledge] = useState<LabPanel | null>(null);
  const [expandedPanels, setExpandedPanels] = useState<number[]>([1, 3]);
  const [selectedResult, setSelectedResult] = useState<LabResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'abnormal' | 'critical' | 'unackCritical'>('all');
  const [filterPatient, setFilterPatient] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const handleAcknowledge = (note: string) => {
    if (!panelToAcknowledge) return;
    const ack = acknowledgePanel(panelToAcknowledge, note);
    setAcknowledgments(prev => ({ ...prev, [ack.panelId]: ack }));
    setPanelToAcknowledge(null);
  };

  const formatAckTime = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

  const togglePanel = (panelId: number) => {
    setExpandedPanels(prev =>
      prev.includes(panelId) ? prev.filter(id => id !== panelId) : [...prev, panelId]
    );
  };

  const getStatusStyle = (status: LabResult['status']) => {
    switch (status) {
      case 'critical':
        return { background: '#ffcccc', color: '#990000', fontWeight: 'bold' };
      case 'abnormal':
        return { background: '#fff3cd', color: '#664d00' };
      default:
        return {};
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
      return hasCriticalResult(panel);
    }
    if (filterStatus === 'unackCritical') {
      return isUnacknowledgedCritical(panel, acknowledgments);
    }
    return true;
  });

  const criticalCount = labPanels.reduce((acc, p) => acc + p.results.filter(r => r.status === 'critical').length, 0);
  const unackCriticalPanelCount = labPanels.filter(p => isUnacknowledgedCritical(p, acknowledgments)).length;
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
              <option value="unackCritical">Unacknowledged Critical</option>
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
            <span className="px-2 py-0.5 bg-orange-100 text-orange-800 border border-orange-300">
              {unackCriticalPanelCount} Unacknowledged
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
                  className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-b from-[#f8f8f8] to-[#e8e8e8] cursor-pointer hover:from-[#fff] hover:to-[#f0f0f0]"
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
                    {hasCriticalResult(panel) && (
                      <span className="flex items-center space-x-0.5 text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[9px] font-bold">CRITICAL</span>
                      </span>
                    )}
                    {acknowledgments[panel.id] && (
                      <span
                        className="flex items-center space-x-0.5 px-1.5 py-0.5 text-[9px] bg-green-100 text-green-800 border border-green-300"
                        title={acknowledgments[panel.id].note ? `Note: ${acknowledgments[panel.id].note}` : undefined}
                        data-testid={`ack-badge-${panel.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Acknowledged by {acknowledgments[panel.id].acknowledgedBy} at {formatAckTime(acknowledgments[panel.id].acknowledgedAt)}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-[10px] text-gray-600">
                    {isUnacknowledgedCritical(panel, acknowledgments) && (
                      <button
                        className="ehr-button ehr-button-primary text-[10px] px-2 py-0.5"
                        onClick={(e) => { e.stopPropagation(); setPanelToAcknowledge(panel); }}
                        data-testid={`ack-button-${panel.id}`}
                      >
                        Acknowledge
                      </button>
                    )}
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
                      <tr className="bg-gradient-to-b from-[#f0f0f0] to-[#e0e0e0]">
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
                          className={`cursor-pointer hover:bg-[#e0e8f0] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f8f8]'}`}
                          style={getStatusStyle(result.status)}
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

      <AcknowledgeLabDialog
        panel={panelToAcknowledge}
        onCancel={() => setPanelToAcknowledge(null)}
        onConfirm={handleAcknowledge}
      />

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
                  <span className="ml-2" style={getStatusStyle(selectedResult.status)}>
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
