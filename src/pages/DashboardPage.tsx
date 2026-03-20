import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';
import { PrescriptionDialog } from '../components/ui/PrescriptionDialog';
import { OrderDialog } from '../components/ui/OrderDialog';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { patientService } from '../services/patientService';
import {
  mapPatientToWorklist,
  mapPatientToInbox,
  computeInboxCounts,
  filterInboxItems,
  filterWorklistPatients,
} from '../utils/dashboardUtils';
import type {
  InboxItem,
  WorklistPatient,
  InboxTab,
  InboxPriority,
  InboxReadFilter,
  WorklistFilter,
  WorklistSort,
} from '../utils/dashboardUtils';
import { 
  FileText,
  Pill,
  FlaskConical,
  MessageSquare,
  CheckCircle2,
  Bell,
  Stethoscope,
  Send,
  RefreshCw,
  Flag,
  Eye,
  Edit3,
  Printer,
  ExternalLink,
  ShieldAlert,
  Radio,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Activity,
  Inbox,
  Users,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [inboxTab, setInboxTab] = useState<InboxTab>('all');
  const [inboxPriority, setInboxPriority] = useState<InboxPriority>('all');
  const [inboxReadFilter, setInboxReadFilter] = useState<InboxReadFilter>('all');
  const [worklistFilter, setWorklistFilter] = useState<WorklistFilter>('all');
  const [worklistSort, setWorklistSort] = useState<WorklistSort>('status');
  const [worklistSortAsc, setWorklistSortAsc] = useState(true);

  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    inbox: true,
    worklist: true,
    unsigned: true,
    orders: true,
    schedule: true,
    quality: false,
  });
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showRxDialog, setShowRxDialog] = useState(false);
  const [showLabDialog, setShowLabDialog] = useState(false);
  const [showImagingDialog, setShowImagingDialog] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [worklistPatients, setWorklistPatients] = useState<WorklistPatient[]>([]);
  const [unsignedNotes, setUnsignedNotes] = useState<{id: number; patientName: string; type: string; date: string; daysOld: number}[]>([]);
  const [pendingOrders, setPendingOrders] = useState<{id: number; patientName: string; order: string; type: string; status: string}[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<{id: number; type: string; patient: string; alert: string; action: string; time: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await patientService.search('', 0, 20);
        const patients = result.content;
        setInboxItems(patients.slice(0, 10).map((p, i) => mapPatientToInbox(p, i)));
        setWorklistPatients(patients.slice(0, 8).map((p, i) => mapPatientToWorklist(p, i)));
        setUnsignedNotes(patients.slice(0, 5).map((p, i) => ({
          id: p.id || i,
          patientName: `${p.lastName}, ${p.firstName}`,
          type: ['Progress Note', 'H&P', 'Discharge Summary'][i % 3],
          date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
          daysOld: i,
        })));
        setPendingOrders(patients.slice(0, 4).map((p, i) => ({
          id: p.id || i,
          patientName: `${p.lastName}, ${p.firstName}`,
          order: ['Lab Panel', 'Imaging', 'Medication'][i % 3],
          type: ['Lab', 'Imaging', 'Medication'][i % 3],
          status: ['draft', 'pending-approval', 'pending-signature'][i % 3],
        })));
        setCriticalAlerts(patients.slice(0, 3).map((p, i) => ({
          id: p.id || i,
          type: ['lab', 'vital', 'imaging'][i % 3],
          patient: `${p.lastName}, ${p.firstName}`,
          alert: ['Critical lab value', 'Elevated BP', 'Abnormal finding'][i % 3],
          action: 'Review required',
          time: `${(i + 1) * 5} min ago`,
        })));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const markAsRead = (itemId: number) => {
    setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, read: true } : item));
  };

  const toggleFlag = (itemId: number) => {
    setInboxItems(prev => prev.map(item => item.id === itemId ? { ...item, flagged: !item.flagged } : item));
  };

  const markAllAsRead = () => {
    setInboxItems(prev => prev.map(item => ({ ...item, read: true })));
    setShowAlert({ title: 'Inbox Updated', message: 'All items marked as read.', type: 'success' });
  };

  const inboxCounts = useMemo(() => computeInboxCounts(inboxItems), [inboxItems]);

  const filteredInbox = useMemo(() => filterInboxItems(inboxItems, inboxTab, inboxPriority, inboxReadFilter), [inboxItems, inboxTab, inboxPriority, inboxReadFilter]);

  const filteredWorklist = useMemo(() => filterWorklistPatients(worklistPatients, worklistFilter, worklistSort, worklistSortAsc), [worklistPatients, worklistFilter, worklistSort, worklistSortAsc]);

  const getInboxIcon = (type: string) => {
    switch (type) {
      case 'lab': return <FlaskConical className="w-4 h-4" />;
      case 'imaging': return <Radio className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'refill': return <Pill className="w-4 h-4" />;
      case 'order': return <ClipboardList className="w-4 h-4" />;
      case 'cosign': return <Edit3 className="w-4 h-4" />;
      case 'consult': return <Stethoscope className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-50 text-red-700 border border-red-200';
      case 'waiting': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'roomed': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'in-progress': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'ready-discharge': return 'bg-purple-50 text-purple-700 border border-purple-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-amber-50', color: 'text-amber-700' };
      case 'isolation': return { label: 'ISO', bg: 'bg-purple-50', color: 'text-purple-700' };
      case 'npo': return { label: 'NPO', bg: 'bg-blue-50', color: 'text-blue-700' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-red-50', color: 'text-red-700' };
      case 'code-status': return { label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700' };
      case 'vip': return { label: 'VIP', bg: 'bg-pink-50', color: 'text-pink-700' };
      default: return { label: flag, bg: 'bg-gray-50', color: 'text-gray-600' };
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'normal': return 'bg-emerald-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lab': return 'bg-violet-50 text-violet-600';
      case 'imaging': return 'bg-blue-50 text-blue-600';
      case 'message': return 'bg-emerald-50 text-emerald-600';
      case 'refill': return 'bg-amber-50 text-amber-600';
      case 'order': return 'bg-pink-50 text-pink-600';
      case 'cosign': case 'consult': return 'bg-indigo-50 text-indigo-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-[#F7F7F7]">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />

      {/* Quick Actions Bar */}
      <div className="bg-white border-b border-[#EBEBEB] px-6 py-3">
        <div className="flex items-center justify-between max-w-[1760px] mx-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-sm font-medium rounded-full transition-colors" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-sm font-medium rounded-full transition-colors" onClick={() => setShowRxDialog(true)}>
              <Pill className="w-4 h-4" /> e-Prescribe
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-sm font-medium rounded-full transition-colors" onClick={() => setShowLabDialog(true)}>
              <FlaskConical className="w-4 h-4" /> Order Labs
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-sm font-medium rounded-full transition-colors" onClick={() => setShowImagingDialog(true)}>
              <Radio className="w-4 h-4" /> Order Imaging
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-sm font-medium rounded-full transition-colors" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
              <FileText className="w-4 h-4" /> New Note
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-sm font-medium rounded-full transition-colors" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
              <Send className="w-4 h-4" /> Referral
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-sm font-medium rounded-full transition-colors" onClick={() => setShowPrintDialog(true)}>
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
          <button className="relative p-2.5 hover:bg-[#F7F7F7] rounded-full transition-colors">
            <Bell className="w-5 h-5 text-[#222222]" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF385C] text-white text-[10px] font-bold flex items-center justify-center rounded-full">3</span>
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <span className="font-semibold text-red-800 text-sm">Critical Alerts ({criticalAlerts.length})</span>
            </div>
            <div className="flex items-center gap-6">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <span key={alert.id} className="text-sm text-red-700">
                  <strong>{alert.patient}:</strong> {alert.alert}
                </span>
              ))}
              <button className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-colors">Review All</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6 max-w-[1760px] mx-auto w-full">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Inbox Panel */}
          <div className={`bg-white rounded-xl shadow-sm border border-[#EBEBEB] flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#FF385C]/10 rounded-xl flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-[#FF385C]" />
                </div>
                <h2 className="text-lg font-semibold text-[#222222]">Inbox</h2>
                {inboxCounts.all > 0 && (
                  <span className="px-2.5 py-0.5 bg-[#FF385C] text-white text-xs font-bold rounded-full">{inboxCounts.all}</span>
                )}
              </div>
              {expandedPanels.inbox ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
            </div>
            {expandedPanels.inbox && (
              <>
                <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                  {[
                    { key: 'all', label: 'All', count: inboxCounts.all },
                    { key: 'results', label: 'Results', count: inboxCounts.results },
                    { key: 'messages', label: 'Messages', count: inboxCounts.messages },
                    { key: 'rxRefills', label: 'Rx Refills', count: inboxCounts.rxRefills },
                    { key: 'orders', label: 'Orders', count: inboxCounts.orders },
                    { key: 'cosign', label: 'Co-sign', count: inboxCounts.cosign },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setInboxTab(tab.key as InboxTab)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                        inboxTab === tab.key
                          ? 'bg-[#222222] text-white'
                          : 'bg-[#F7F7F7] text-[#717171] hover:bg-[#EBEBEB]'
                      }`}
                    >
                      {tab.label} {tab.count > 0 && <span className="ml-1 text-xs opacity-75">({tab.count})</span>}
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-auto">
                    <select 
                      value={inboxPriority} 
                      onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                      className="px-3 py-1.5 text-sm border border-[#DDDDDD] rounded-lg bg-white text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#222222]"
                    >
                      <option value="all">All Priority</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                    </select>
                    <select 
                      value={inboxReadFilter} 
                      onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                      className="px-3 py-1.5 text-sm border border-[#DDDDDD] rounded-lg bg-white text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#222222]"
                    >
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                    </select>
                    <button className="px-3 py-1.5 text-sm font-medium text-[#FF385C] hover:bg-[#FF385C]/5 rounded-lg transition-colors" onClick={markAllAsRead}>Mark All Read</button>
                    <button className="p-1.5 hover:bg-[#F7F7F7] rounded-lg transition-colors"><RefreshCw className="w-4 h-4 text-[#717171]" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#FAFAFA] border-y border-[#EBEBEB]">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider w-8"></th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider w-10">Type</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Patient</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Subject</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider w-24">Time</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-[#717171] uppercase tracking-wider w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBEBEB]">
                      {filteredInbox.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`cursor-pointer hover:bg-[#FAFAFA] transition-colors ${!item.read ? 'bg-[#FFF8F6]' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${getPriorityDot(item.priority)}`} />
                              {item.flagged && <Flag className="w-3.5 h-3.5 text-[#FF385C]" />}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${getTypeColor(item.type)}`}>
                              {getInboxIcon(item.type)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-[#222222] ${!item.read ? 'font-semibold' : ''}`}>{item.patientName}</span>
                            <span className="text-[#717171] ml-2 text-xs">{item.patientMrn}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className={`text-[#222222] ${!item.read ? 'font-semibold' : ''} ${item.priority === 'critical' ? 'text-red-700' : ''}`}>{item.title}</div>
                            <div className="text-[#717171] text-xs truncate max-w-[300px]">{item.detail}</div>
                          </td>
                          <td className="px-3 py-3 text-[#717171] text-xs">{item.timestamp}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button className="p-1.5 hover:bg-[#F7F7F7] rounded-lg transition-colors" onClick={() => { markAsRead(item.id); navigate(`/patients/1`); }} title="View"><Eye className="w-4 h-4 text-[#717171]" /></button>
                              <button className="p-1.5 hover:bg-[#F7F7F7] rounded-lg transition-colors" onClick={() => markAsRead(item.id)} title="Mark Read"><CheckCircle2 className="w-4 h-4 text-[#717171]" /></button>
                              <button className="p-1.5 hover:bg-[#F7F7F7] rounded-lg transition-colors" onClick={() => toggleFlag(item.id)} title="Flag"><Flag className={`w-4 h-4 ${item.flagged ? 'text-[#FF385C]' : 'text-[#717171]'}`} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Worklist Panel */}
          <div className={`bg-white rounded-xl shadow-sm border border-[#EBEBEB] flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-[#222222]">Patient Worklist</h2>
                <span className="px-2.5 py-0.5 bg-[#F7F7F7] text-[#717171] text-xs font-medium rounded-full">{worklistPatients.length} patients</span>
              </div>
              {expandedPanels.worklist ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
            </div>
            {expandedPanels.worklist && (
              <>
                <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'inpatient', label: 'Inpatient' },
                    { key: 'outpatient', label: 'Clinic' },
                    { key: 'critical', label: 'Critical' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setWorklistFilter(filter.key as WorklistFilter)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                        worklistFilter === filter.key
                          ? 'bg-[#222222] text-white'
                          : 'bg-[#F7F7F7] text-[#717171] hover:bg-[#EBEBEB]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-[#717171]">Sort:</span>
                    <select 
                      value={worklistSort} 
                      onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                      className="px-3 py-1.5 text-sm border border-[#DDDDDD] rounded-lg bg-white text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#222222]"
                    >
                      <option value="status">Status</option>
                      <option value="name">Name</option>
                      <option value="location">Location</option>
                    </select>
                    <button 
                      className="p-1.5 hover:bg-[#F7F7F7] rounded-lg transition-colors text-sm text-[#717171]" 
                      onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                    >
                      {worklistSortAsc ? '↑' : '↓'}
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#222222] hover:bg-[#F7F7F7] rounded-lg transition-colors" onClick={() => setShowPrintDialog(true)}>
                      <Printer className="w-4 h-4" /> Print List
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#FAFAFA] border-y border-[#EBEBEB]">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Patient</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Location</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Chief Complaint</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Vitals</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Alerts</th>
                        <th className="px-3 py-2.5 text-left text-xs font-medium text-[#717171] uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2.5 text-center text-xs font-medium text-[#717171] uppercase tracking-wider w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBEBEB]">
                      {filteredWorklist.map((patient) => (
                        <tr 
                          key={patient.id} 
                          className={`cursor-pointer hover:bg-[#FAFAFA] transition-colors ${patient.status === 'critical' ? 'bg-red-50/50' : ''}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-[#FF385C] to-[#E31C5F] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {patient.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-[#222222]">{patient.name}</div>
                                <div className="text-[#717171] text-xs">{patient.mrn} · {patient.age}{patient.gender}</div>
                                {patient.flags.length > 0 && (
                                  <div className="flex gap-1 mt-1">
                                    {patient.flags.map((flag) => {
                                      const style = getFlagStyle(flag);
                                      return (
                                        <span key={flag} className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${style.bg} ${style.color}`}>
                                          {style.label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-[#222222]">{patient.room || patient.appointmentTime}</div>
                            <div className="text-[#717171] text-xs">{patient.location}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-[#222222]">{patient.chiefComplaint}</div>
                            {patient.admitDate && <div className="text-[#717171] text-xs">Admit: {patient.admitDate}</div>}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            {patient.lastVitals ? (
                              <>
                                <div className="text-[#222222]">BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-red-600 font-semibold' : ''}>{patient.lastVitals.bp}</span></div>
                                <div className="text-[#717171]">HR: {patient.lastVitals.hr} · SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-[#DDDDDD]">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-1">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-xs ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                                    {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#DDDDDD] text-xs">None</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(patient.status)}`}>
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 hover:bg-[#F7F7F7] rounded-lg transition-colors" title="Open Chart">
                                <ExternalLink className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 hover:bg-[#F7F7F7] rounded-lg transition-colors" title="Write Note">
                                <Edit3 className="w-4 h-4 text-[#717171]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Panels */}
        <div className="w-80 flex flex-col gap-4 overflow-auto shrink-0">
          {/* Unsigned Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EBEBEB] overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold text-[#222222]">Unsigned Notes</h3>
                {unsignedNotes.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{unsignedNotes.length}</span>
                )}
              </div>
              {expandedPanels.unsigned ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.unsigned && (
              <div>
                <div className="divide-y divide-[#EBEBEB]">
                  {unsignedNotes.map((note) => (
                    <div key={note.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors">
                      <div>
                        <div className="font-medium text-sm text-[#222222]">{note.patientName}</div>
                        <div className="text-xs text-[#717171]">{note.type} · {note.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {note.daysOld >= 2 && <span className="text-xs text-red-600 font-semibold">{note.daysOld}d</span>}
                        <button className="px-3 py-1 bg-[#222222] hover:bg-[#000000] text-white text-xs font-medium rounded-full transition-colors">Sign</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-[#EBEBEB] bg-[#FAFAFA]">
                  <button className="w-full py-1.5 text-sm font-medium text-[#FF385C] hover:bg-[#FF385C]/5 rounded-lg transition-colors">Sign All Notes</button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EBEBEB] overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-semibold text-[#222222]">Pending Orders</h3>
                {pendingOrders.length > 0 && (
                  <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full">{pendingOrders.length}</span>
                )}
              </div>
              {expandedPanels.orders ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.orders && (
              <div className="divide-y divide-[#EBEBEB]">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm text-[#222222]">{order.patientName}</div>
                        <div className="text-xs text-[#717171] mt-0.5">{order.order}</div>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 bg-[#F7F7F7] text-[#717171] rounded-full font-medium">{order.type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            order.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                            order.status === 'pending-approval' ? 'bg-amber-50 text-amber-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1 bg-[#F7F7F7] hover:bg-[#EBEBEB] text-[#222222] text-xs font-medium rounded-full transition-colors shrink-0">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EBEBEB] overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-[#222222]">Today's Schedule</h3>
              </div>
              {expandedPanels.schedule ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.schedule && (
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-[#717171]">January 18, 2024</span>
                  <span className="font-semibold text-[#222222]">8 appointments</span>
                </div>
                <div className="space-y-1">
                  {[
                    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                  ].map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 text-sm rounded-lg ${
                      slot.status === 'current' ? 'bg-[#FF385C]/5 border border-[#FF385C]/20' :
                      slot.status === 'next' ? 'bg-blue-50' :
                      slot.status === 'done' ? 'text-[#DDDDDD]' : 'hover:bg-[#FAFAFA]'
                    }`}>
                      <span className="text-xs font-medium">{slot.time}</span>
                      <span className={`text-xs ${slot.status === 'current' ? 'font-semibold text-[#FF385C]' : ''}`}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 py-2 text-sm font-medium text-[#FF385C] hover:bg-[#FF385C]/5 rounded-lg transition-colors">View Full Schedule</button>
              </div>
            )}
          </div>

          {/* System Messages */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EBEBEB] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-[#222222]">System Messages</h3>
            </div>
            <div className="divide-y divide-[#EBEBEB]">
              <div className="px-4 py-2.5">
                <div className="text-xs text-[#717171]">01/18 08:00</div>
                <div className="text-sm text-[#222222] mt-0.5">System maintenance scheduled for 01/20 2:00 AM</div>
              </div>
              <div className="px-4 py-2.5">
                <div className="text-xs text-[#717171]">01/17 14:30</div>
                <div className="text-sm text-[#222222] mt-0.5">New formulary updates available</div>
              </div>
              <div className="px-4 py-2.5">
                <div className="text-xs text-[#717171]">01/16 09:15</div>
                <div className="text-sm text-[#222222] mt-0.5">Lab interface upgraded to v3.2</div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl shadow-sm border border-[#EBEBEB] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-[#222222]">System Status</h3>
            </div>
            <div className="px-4 pb-3">
              <div className="space-y-2">
                {[
                  { label: 'Database', status: 'Connected', ok: true },
                  { label: 'HL7 Interface', status: 'Active', ok: true },
                  { label: 'Pharmacy Link', status: 'Online', ok: true },
                  { label: 'Last Sync', status: '2 min ago', ok: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-[#717171]">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      {item.ok && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                      <span className="text-sm font-medium text-[#222222]">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={(options) => {
          console.log('Print options:', options);
          setShowPrintDialog(false);
          setShowAlert({ title: 'Print Sent', message: `Document sent to printer (${options.action}).`, type: 'success' });
        }}
        title="Print Dashboard"
        documentName="Dashboard Summary"
      />

      <PrescriptionDialog
        isOpen={showRxDialog}
        onClose={() => setShowRxDialog(false)}
        onSubmit={(rx) => {
          console.log('New Rx:', rx);
          setShowRxDialog(false);
          setShowAlert({ title: 'Prescription Sent', message: `${rx.medication} ${rx.strength} sent to ${rx.pharmacy}.`, type: 'success' });
        }}
      />

      <OrderDialog
        isOpen={showLabDialog}
        onClose={() => setShowLabDialog(false)}
        type="lab"
        onSubmit={(orders) => {
          console.log('Lab order:', orders);
          setShowLabDialog(false);
          setShowAlert({ title: 'Lab Order Placed', message: `${orders.length} test(s) ordered.`, type: 'success' });
        }}
      />

      <OrderDialog
        isOpen={showImagingDialog}
        onClose={() => setShowImagingDialog(false)}
        type="imaging"
        onSubmit={(orders) => {
          console.log('Imaging order:', orders);
          setShowImagingDialog(false);
          setShowAlert({ title: 'Imaging Order Placed', message: `${orders.length} study(ies) ordered.`, type: 'success' });
        }}
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
