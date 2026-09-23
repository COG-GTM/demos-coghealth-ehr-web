import { useState } from 'react';
import { 
  Download, 
  Calendar,
  RefreshCw,
  Printer,
  Plus,
  Play
} from 'lucide-react';
import { AlertDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';

interface Report {
  id: number;
  name: string;
  description: string;
  category: 'clinical' | 'operational' | 'financial' | 'compliance';
  lastRun?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on-demand';
}

const defaultReports: Report[] = [
  { id: 1, name: 'Daily Patient Census', description: 'Summary of patient visits, admissions, and discharges', category: 'operational', lastRun: '2024-01-18T06:00:00', frequency: 'daily' },
  { id: 2, name: 'Provider Productivity', description: 'Encounters per provider with RVU calculations', category: 'operational', lastRun: '2024-01-17T18:00:00', frequency: 'daily' },
  { id: 3, name: 'Medication Reconciliation', description: 'Patients with pending medication reconciliation', category: 'clinical', lastRun: '2024-01-18T07:00:00', frequency: 'daily' },
  { id: 4, name: 'Lab Results Pending Review', description: 'Outstanding lab results requiring physician review', category: 'clinical', lastRun: '2024-01-18T08:00:00', frequency: 'daily' },
  { id: 5, name: 'Monthly Revenue Summary', description: 'Charges, payments, and adjustments by department', category: 'financial', lastRun: '2024-01-01T00:00:00', frequency: 'monthly' },
  { id: 6, name: 'Claims Aging Report', description: 'Outstanding claims by payer and aging bucket', category: 'financial', lastRun: '2024-01-15T00:00:00', frequency: 'weekly' },
  { id: 7, name: 'HIPAA Access Audit', description: 'Patient record access log for compliance review', category: 'compliance', lastRun: '2024-01-17T00:00:00', frequency: 'weekly' },
  { id: 8, name: 'Quality Measures Dashboard', description: 'HEDIS and MIPS quality measure performance', category: 'compliance', lastRun: '2024-01-15T00:00:00', frequency: 'monthly' },
];

const defaultMetrics = {
  patientsToday: 24,
  patientsChange: 12,
  encounters: 156,
  encountersChange: 8,
  avgWaitTime: 14,
  waitTimeChange: -3,
  satisfaction: 94,
  satisfactionChange: 2,
};

const categoryConfig = {
  clinical: { label: 'Clinical Reports' },
  operational: { label: 'Operational Reports' },
  financial: { label: 'Financial Reports' },
  compliance: { label: 'Compliance Reports' },
};

type CategoryFilter = 'all' | 'clinical' | 'operational' | 'financial' | 'compliance';

export default function ReportsPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['clinical', 'operational', 'financial', 'compliance']));
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);

  const toggleCategory = (cat: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(cat)) {
      newExpanded.delete(cat);
    } else {
      newExpanded.add(cat);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredReports = defaultReports.filter(
    report => categoryFilter === 'all' || report.category === categoryFilter
  );

  const reportsByCategory = filteredReports.reduce((acc, report) => {
    if (!acc[report.category]) acc[report.category] = [];
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, Report[]>);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col ehr-desktop">
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Report data has been refreshed.', type: 'info' })}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </button>
          <span className="text-gray-400">|</span>
          <button className="ehr-toolbar-button flex items-center" onClick={() => { setSelectedReport(null); setShowPrintDialog(true); }}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowAlert({ title: 'New Report', message: 'Report builder wizard would open here.', type: 'info' })}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Report
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="ehr-input"
          >
            <option value="all">All Categories</option>
            <option value="clinical">Clinical</option>
            <option value="operational">Operational</option>
            <option value="financial">Financial</option>
            <option value="compliance">Compliance</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Report Summary */}
        <div className="w-56 overflow-auto p-2 space-y-2 ehr-sidebar">
          <fieldset className="ehr-fieldset">
            <legend>Today's Summary</legend>
            <table className="w-full text-[10px]">
              <tbody>
                <tr className="bg-white">
                  <td className="px-1 py-0.5 border border-gray-400">Patients</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right font-bold">{defaultMetrics.patientsToday}</td>
                </tr>
                <tr>
                  <td className="px-1 py-0.5 border border-gray-400">Encounters</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right font-bold">{defaultMetrics.encounters}</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-1 py-0.5 border border-gray-400">Avg Wait Time</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right font-bold">{defaultMetrics.avgWaitTime} min</td>
                </tr>
                <tr>
                  <td className="px-1 py-0.5 border border-gray-400">Satisfaction</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right font-bold">{defaultMetrics.satisfaction}%</td>
                </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset className="ehr-fieldset">
            <legend>Encounters by Type</legend>
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="px-1 py-0.5 text-left border border-gray-400 bg-gray-100">Type</th>
                  <th className="px-1 py-0.5 text-right border border-gray-400 bg-gray-100">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-1 py-0.5 border border-gray-400">Office Visit</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right">89</td>
                </tr>
                <tr>
                  <td className="px-1 py-0.5 border border-gray-400">Telehealth</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right">34</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-1 py-0.5 border border-gray-400">Lab Only</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right">18</td>
                </tr>
                <tr>
                  <td className="px-1 py-0.5 border border-gray-400">Urgent</td>
                  <td className="px-1 py-0.5 border border-gray-400 text-right">15</td>
                </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset className="ehr-fieldset">
            <legend>Weekly Volume</legend>
            <table className="w-full text-[10px]">
              <tbody>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, idx) => (
                  <tr key={day} className={idx % 2 === 0 ? 'bg-white' : ''}>
                    <td className="px-1 py-0.5 border border-gray-400">{day}</td>
                    <td className="px-1 py-0.5 border border-gray-400 text-right">{[65, 45, 78, 52, 88][idx]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
        </div>

        {/* Right Panel - Reports */}
        <div className="flex-1 overflow-auto bg-white border-l border-gray-500">
          {Object.entries(reportsByCategory).map(([category, reports]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig];
            return (
              <div key={category} className="border-b border-gray-300">
                <div
                  onClick={() => toggleCategory(category)}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center justify-between text-[11px] border-b border-gray-400"
                  style={{ background: 'linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%)' }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 border border-gray-500 bg-white flex items-center justify-center text-[10px] font-bold">
                      {expandedCategories.has(category) ? '-' : '+'}
                    </span>
                    <span className="font-semibold">{config.label}</span>
                    <span className="text-[9px] text-gray-600">({reports.length})</span>
                  </div>
                </div>
                {expandedCategories.has(category) && (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left">Report Name</th>
                        <th className="px-2 py-1 text-left">Description</th>
                        <th className="px-2 py-1 text-left w-20">Frequency</th>
                        <th className="px-2 py-1 text-left w-32">Last Run</th>
                        <th className="px-2 py-1 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report, idx) => (
                        <tr key={report.id} className={`hover:bg-blue-50 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                          <td className="px-2 py-1.5 font-medium">{report.name}</td>
                          <td className="px-2 py-1.5 text-gray-600">{report.description}</td>
                          <td className="px-2 py-1.5 capitalize">{report.frequency}</td>
                          <td className="px-2 py-1.5 text-gray-500">
                            {report.lastRun && (
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(report.lastRun)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button 
                              className="ehr-button text-[9px] px-1.5 py-0.5 mr-1"
                              onClick={() => setShowAlert({ title: 'Download', message: `${report.name} has been downloaded as PDF.`, type: 'success' })}
                            >
                              <Download className="w-3 h-3 inline" />
                            </button>
                            <button 
                              className="ehr-button ehr-button-primary text-[9px] px-1.5 py-0.5"
                              onClick={() => setShowAlert({ title: 'Report Running', message: `${report.name} is now running. Results will be available shortly.`, type: 'info' })}
                            >
                              <Play className="w-3 h-3 inline mr-0.5" /> Run
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>Reports | {filteredReports.length} report(s) available</span>
        <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Dialogs */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={(options) => {
          console.log('Print options:', options);
          setShowPrintDialog(false);
          setShowAlert({ title: 'Print Sent', message: `${selectedReport?.name || 'Report list'} sent to printer (${options.action}).`, type: 'success' });
        }}
        title={selectedReport ? `Print ${selectedReport.name}` : 'Print Report List'}
        documentName={selectedReport?.name || 'Available Reports'}
      />

      {showAlert && (
        <AlertDialog
          isOpen={true}
          onClose={() => setShowAlert(null)}
          title={showAlert.title}
          message={showAlert.message}
          type={showAlert.type}
        />
      )}
    </div>
  );
}
