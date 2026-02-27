import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';
import { PrescriptionDialog } from '../components/ui/PrescriptionDialog';
import { OrderDialog } from '../components/ui/OrderDialog';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { patientService } from '../services/patientService';
import type { Patient } from '../types';
import { 
  FileText,
  Pill,
  FlaskConical,
  MessageSquare,
  CheckCircle2,
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
  ChevronRight,
  Clock,
  Circle,
  AlertTriangle,
  Zap,
  TrendingUp,
  Calendar
} from 'lucide-react';

type InboxTab = 'all' | 'results' | 'messages' | 'rxRefills' | 'orders' | 'cosign';
type WorklistFilter = 'all' | 'inpatient' | 'outpatient' | 'critical';

interface InboxItem {
  id: number;
  type: 'lab' | 'imaging' | 'message' | 'refill' | 'order' | 'cosign' | 'consult';
  priority: 'critical' | 'high' | 'normal' | 'low';
  patientName: string;
  patientMrn: string;
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
  flagged: boolean;
}

interface WorklistPatient {
  id: number;
  name: string;
  mrn: string;
  age: number;
  gender: string;
  room?: string;
  location: string;
  chiefComplaint: string;
  admitDate?: string;
  appointmentTime?: string;
  attendingProvider: string;
  status: 'waiting' | 'roomed' | 'in-progress' | 'ready-discharge' | 'critical';
  alerts: string[];
  lastVitals?: {
    bp: string;
    hr: number;
    temp: number;
    spo2: number;
    rr: number;
  };
  flags: ('fall-risk' | 'isolation' | 'npo' | 'allergy' | 'code-status' | 'vip')[];
}

function mapPatientToWorklist(patient: Patient, index: number): WorklistPatient {
  const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const statuses: WorklistPatient['status'][] = ['waiting', 'roomed', 'in-progress', 'ready-discharge', 'critical'];
  const locations = ['Clinic 2B', 'Med-Surg 4W', 'CCU', 'Med-Surg 3E'];
  const complaints = ['Follow-up visit', 'Annual exam', 'Lab review', 'Medication management', 'New symptoms'];
  return {
    id: patient.id || index,
    name: `${patient.lastName}, ${patient.firstName}`,
    mrn: patient.mrn || '',
    age,
    gender: patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : 'O',
    appointmentTime: `${9 + (index % 8)}:${index % 2 === 0 ? '00' : '30'} AM`,
    location: locations[index % locations.length],
    chiefComplaint: complaints[index % complaints.length],
    attendingProvider: 'Dr. Smith',
    status: statuses[index % statuses.length],
    alerts: [],
    flags: [],
  };
}

function mapPatientToInbox(patient: Patient, index: number): InboxItem {
  const types: InboxItem['type'][] = ['lab', 'imaging', 'message', 'refill', 'order', 'cosign'];
  const priorities: InboxItem['priority'][] = ['critical', 'high', 'normal', 'low'];
  return {
    id: patient.id || index,
    type: types[index % types.length],
    priority: priorities[index % priorities.length],
    patientName: `${patient.lastName}, ${patient.firstName}`,
    patientMrn: patient.mrn || '',
    title: `${types[index % types.length].toUpperCase()} Result`,
    detail: 'Review required',
    timestamp: `${index + 1} hr ago`,
    read: index > 3,
    flagged: index < 2,
  };
}

type InboxPriority = 'all' | 'critical' | 'high' | 'normal';
type InboxReadFilter = 'all' | 'unread' | 'read';
type WorklistSort = 'name' | 'location' | 'status' | 'time';

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

  const inboxCounts = useMemo(() => ({
    all: inboxItems.filter(i => !i.read).length,
    results: inboxItems.filter(i => !i.read && (i.type === 'lab' || i.type === 'imaging')).length,
    messages: inboxItems.filter(i => !i.read && i.type === 'message').length,
    rxRefills: inboxItems.filter(i => !i.read && i.type === 'refill').length,
    orders: inboxItems.filter(i => !i.read && i.type === 'order').length,
    cosign: inboxItems.filter(i => !i.read && (i.type === 'cosign' || i.type === 'consult')).length,
  }), [inboxItems]);

  const filteredInbox = useMemo(() => {
    let items = inboxItems;
    if (inboxTab !== 'all') {
      if (inboxTab === 'results') items = items.filter(i => i.type === 'lab' || i.type === 'imaging');
      else if (inboxTab === 'messages') items = items.filter(i => i.type === 'message');
      else if (inboxTab === 'rxRefills') items = items.filter(i => i.type === 'refill');
      else if (inboxTab === 'orders') items = items.filter(i => i.type === 'order');
      else if (inboxTab === 'cosign') items = items.filter(i => i.type === 'cosign' || i.type === 'consult');
    }
    if (inboxPriority !== 'all') {
      items = items.filter(i => i.priority === inboxPriority);
    }
    if (inboxReadFilter === 'unread') {
      items = items.filter(i => !i.read);
    } else if (inboxReadFilter === 'read') {
      items = items.filter(i => i.read);
    }
    return items;
  }, [inboxItems, inboxTab, inboxPriority, inboxReadFilter]);

  const filteredWorklist = useMemo(() => {
    const patients = worklistPatients.filter(patient => {
      if (worklistFilter === 'all') return true;
      if (worklistFilter === 'inpatient') return !!patient.room;
      if (worklistFilter === 'outpatient') return !!patient.appointmentTime;
      if (worklistFilter === 'critical') return patient.status === 'critical';
      return true;
    });
    patients.sort((a, b) => {
      let cmp = 0;
      if (worklistSort === 'name') cmp = a.name.localeCompare(b.name);
      else if (worklistSort === 'location') cmp = (a.room || a.appointmentTime || '').localeCompare(b.room || b.appointmentTime || '');
      else if (worklistSort === 'status') {
        const order = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
        cmp = (order[a.status] || 5) - (order[b.status] || 5);
      }
      return worklistSortAsc ? cmp : -cmp;
    });
    return patients;
  }, [worklistPatients, worklistFilter, worklistSort, worklistSortAsc]);

  const getInboxIcon = (type: string) => {
    switch (type) {
      case 'lab': return <FlaskConical className="w-4 h-4 text-violet-500" />;
      case 'imaging': return <Radio className="w-4 h-4 text-blue-500" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'refill': return <Pill className="w-4 h-4 text-amber-500" />;
      case 'order': return <ClipboardList className="w-4 h-4 text-indigo-500" />;
      case 'cosign': return <Edit3 className="w-4 h-4 text-orange-500" />;
      case 'consult': return <Stethoscope className="w-4 h-4 text-teal-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-50 text-red-700 border border-red-200';
      case 'waiting': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'roomed': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'in-progress': return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'ready-discharge': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      default: return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-orange-50', color: 'text-orange-700 border border-orange-200' };
      case 'isolation': return { label: 'ISO', bg: 'bg-purple-50', color: 'text-purple-700 border border-purple-200' };
      case 'npo': return { label: 'NPO', bg: 'bg-red-50', color: 'text-red-700 border border-red-200' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-rose-50', color: 'text-rose-700 border border-rose-200' };
      case 'code-status': return { label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700 border border-gray-300' };
      case 'vip': return { label: 'VIP', bg: 'bg-amber-50', color: 'text-amber-700 border border-amber-200' };
      default: return { label: flag, bg: 'bg-gray-50', color: 'text-gray-600 border border-gray-200' };
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-amber-500';
      case 'normal': return 'bg-blue-400';
      case 'low': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-[#f8f9fc]">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />

      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button className="ehr-toolbar-button flex items-center gap-1.5" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <button className="ehr-toolbar-button flex items-center gap-1.5" onClick={() => setShowRxDialog(true)}>
            <Pill className="w-4 h-4" /> e-Prescribe
          </button>
          <button className="ehr-toolbar-button flex items-center gap-1.5" onClick={() => setShowLabDialog(true)}>
            <FlaskConical className="w-4 h-4" /> Order Labs
          </button>
          <button className="ehr-toolbar-button flex items-center gap-1.5" onClick={() => setShowImagingDialog(true)}>
            <Radio className="w-4 h-4" /> Order Imaging
          </button>
          <button className="ehr-toolbar-button flex items-center gap-1.5" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
            <FileText className="w-4 h-4" /> New Note
          </button>
          <button className="ehr-toolbar-button flex items-center gap-1.5" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
            <Send className="w-4 h-4" /> Referral
          </button>
          <div className="h-5 w-px bg-gray-200" />
          <button className="ehr-toolbar-button flex items-center gap-1.5" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mx-6 mt-4 mb-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <span className="font-semibold text-[13px] text-red-800">Critical Alerts ({criticalAlerts.length})</span>
                <div className="flex items-center gap-4 mt-0.5">
                  {criticalAlerts.slice(0, 2).map((alert) => (
                    <span key={alert.id} className="text-[13px] text-red-700">
                      <strong>{alert.patient}:</strong> {alert.alert}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button className="ehr-button text-[13px] px-3 py-1.5 border-red-200 text-red-700 hover:bg-red-100">Review All</button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Inbox</div>
            <div className="text-xl font-semibold text-gray-900">{inboxCounts.all}</div>
            <div className="text-[12px] text-gray-400">unread items</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Patients</div>
            <div className="text-xl font-semibold text-gray-900">{worklistPatients.length}</div>
            <div className="text-[12px] text-gray-400">in worklist</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Unsigned</div>
            <div className="text-xl font-semibold text-gray-900">{unsignedNotes.length}</div>
            <div className="text-[12px] text-gray-400">notes pending</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">Critical</div>
            <div className="text-xl font-semibold text-gray-900">{criticalAlerts.length}</div>
            <div className="text-[12px] text-gray-400">alerts</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden px-6 pb-4 gap-5">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Inbox Panel */}
          <div className={`bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.inbox ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-[14px] text-gray-900">Inbox</span>
                {inboxCounts.all > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[12px] font-medium rounded-full">{inboxCounts.all}</span>
                )}
              </div>
            </div>
            {expandedPanels.inbox && (
              <>
                <div className="flex items-center gap-1 px-5 pb-2 border-b border-gray-100">
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
                      className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                        inboxTab === tab.key 
                          ? 'bg-indigo-50 text-indigo-600' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label} {tab.count > 0 && <span className="ml-1 text-[11px] opacity-70">({tab.count})</span>}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <select 
                    value={inboxPriority} 
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="ehr-input text-[12px] py-1 px-2"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select 
                    value={inboxReadFilter} 
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="ehr-input text-[12px] py-1 px-2"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <button className="ehr-toolbar-button text-[12px] py-1" onClick={markAllAsRead}>Mark All Read</button>
                </div>
                <div className="flex-1 overflow-auto">
                  {filteredInbox.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${!item.read ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className="flex-shrink-0 relative">
                        {getInboxIcon(item.type)}
                        {!item.read && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] ${!item.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{item.patientName}</span>
                          <span className="text-[12px] text-gray-400">{item.patientMrn}</span>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getPriorityDot(item.priority)}`} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[13px] ${item.priority === 'critical' ? 'text-red-700 font-medium' : 'text-gray-600'}`}>{item.title}</span>
                          <span className="text-[12px] text-gray-400 truncate">{item.detail}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[12px] text-gray-400">{item.timestamp}</span>
                        <div className="flex items-center gap-0.5">
                          <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" onClick={() => { markAsRead(item.id); navigate(`/patients/1`); }} title="View"><Eye className="w-3.5 h-3.5 text-gray-400" /></button>
                          <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" onClick={() => markAsRead(item.id)} title="Mark Read"><CheckCircle2 className="w-3.5 h-3.5 text-gray-400" /></button>
                          <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" onClick={() => toggleFlag(item.id)} title="Flag"><Flag className={`w-3.5 h-3.5 ${item.flagged ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Worklist Panel */}
          <div className={`bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.worklist ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-[14px] text-gray-900">Patient Worklist</span>
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[12px] font-medium rounded-full">{worklistPatients.length}</span>
              </div>
            </div>
            {expandedPanels.worklist && (
              <>
                <div className="flex items-center gap-2 px-5 pb-2 border-b border-gray-100">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'inpatient', label: 'Inpatient' },
                    { key: 'outpatient', label: 'Clinic' },
                    { key: 'critical', label: 'Critical' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setWorklistFilter(filter.key as WorklistFilter)}
                      className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                        worklistFilter === filter.key 
                          ? 'bg-indigo-50 text-indigo-600' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <span className="text-[12px] text-gray-500">Sort:</span>
                  <select 
                    value={worklistSort} 
                    onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                    className="ehr-input text-[12px] py-1 px-2"
                  >
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                    <option value="location">Location</option>
                  </select>
                  <button 
                    className="ehr-toolbar-button p-1 text-[12px]" 
                    onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                  >
                    {worklistSortAsc ? '↑' : '↓'}
                  </button>
                  <button className="ehr-button text-[12px] px-3 py-1 flex items-center gap-1" onClick={() => setShowPrintDialog(true)}>
                    <Printer className="w-3.5 h-3.5" /> Print List
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-[11px]">Patient</th>
                        <th className="px-3 py-2.5 text-left text-[11px]">Location</th>
                        <th className="px-3 py-2.5 text-left text-[11px]">Chief Complaint</th>
                        <th className="px-3 py-2.5 text-left text-[11px]">Vitals</th>
                        <th className="px-3 py-2.5 text-left text-[11px]">Alerts</th>
                        <th className="px-3 py-2.5 text-left text-[11px]">Status</th>
                        <th className="px-3 py-2.5 text-center text-[11px] w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorklist.map((patient) => (
                        <tr 
                          key={patient.id} 
                          className="cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50"
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900">{patient.name}</div>
                            <div className="text-gray-400 text-[12px]">{patient.mrn} &middot; {patient.age}{patient.gender}</div>
                            <div className="flex gap-1 mt-1">
                              {patient.flags.map((flag) => {
                                const style = getFlagStyle(flag);
                                return (
                                  <span key={flag} className={`px-1.5 py-0.5 text-[10px] rounded ${style.bg} ${style.color}`}>
                                    {style.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-gray-700">{patient.room || patient.appointmentTime}</div>
                            <div className="text-gray-400 text-[12px]">{patient.location}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-gray-700">{patient.chiefComplaint}</div>
                            {patient.admitDate && <div className="text-gray-400 text-[12px]">Admit: {patient.admitDate}</div>}
                          </td>
                          <td className="px-3 py-3 text-[12px]">
                            {patient.lastVitals ? (
                              <>
                                <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-red-600 font-semibold' : 'text-gray-700'}>{patient.lastVitals.bp}</span></div>
                                <div className="text-gray-500">HR: {patient.lastVitals.hr} SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-1">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-[12px] ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-red-700 font-semibold' : 'text-amber-700'}`}>
                                    {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[12px]">None</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-block px-2 py-1 text-[11px] font-medium rounded-md ${getStatusStyle(patient.status)}`}>
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Open Chart">
                                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Write Note">
                                <Edit3 className="w-3.5 h-3.5 text-gray-400" />
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
        <div className="w-72 flex flex-col gap-4 overflow-auto">
          {/* Unsigned Notes */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.unsigned ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-[14px] text-gray-900">Unsigned Notes</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[12px] font-medium rounded-full">{unsignedNotes.length}</span>
              </div>
            </div>
            {expandedPanels.unsigned && (
              <div>
                {unsignedNotes.map((note) => (
                  <div key={note.id} className="px-4 py-3 border-t border-gray-50 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-medium text-[13px] text-gray-900">{note.patientName}</div>
                      <div className="text-[12px] text-gray-400">{note.type} &middot; {note.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.daysOld >= 2 && <span className="text-[11px] text-red-500 font-medium">{note.daysOld}d</span>}
                      <button className="ehr-button ehr-button-primary text-[12px] px-3 py-1">Sign</button>
                    </div>
                  </div>
                ))}
                <div className="p-3 border-t border-gray-100">
                  <button className="ehr-button w-full text-[12px]">Sign All Notes</button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.orders ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-[14px] text-gray-900">Pending Orders</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[12px] font-medium rounded-full">{pendingOrders.length}</span>
              </div>
            </div>
            {expandedPanels.orders && (
              <div>
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-3 border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-[13px] text-gray-900">{order.patientName}</div>
                        <div className="text-[12px] text-gray-500 mt-0.5">{order.order}</div>
                        <div className="flex gap-1.5 mt-1.5">
                          <span className="text-[11px] px-2 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-200">{order.type}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded border ${
                            order.status === 'draft' ? 'bg-gray-50 text-gray-500 border-gray-200' :
                            order.status === 'pending-approval' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-blue-50 text-blue-600 border-blue-200'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="ehr-button text-[12px] px-3 py-1">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.schedule ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-[14px] text-gray-900">Today's Schedule</span>
              </div>
            </div>
            {expandedPanels.schedule && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-3 text-[13px]">
                  <span className="text-gray-400">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className="font-medium text-gray-600">8 appointments</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                  ].map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg text-[13px] transition-colors ${
                      slot.status === 'current' ? 'bg-indigo-50 border border-indigo-200' :
                      slot.status === 'next' ? 'bg-gray-50' :
                      slot.status === 'done' ? 'text-gray-400' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        {slot.status === 'current' ? <Circle className="w-2 h-2 fill-indigo-500 text-indigo-500" /> :
                         slot.status === 'done' ? <CheckCircle2 className="w-3 h-3 text-gray-300" /> :
                         <Clock className="w-3 h-3 text-gray-300" />}
                        <span className="text-gray-500">{slot.time}</span>
                      </div>
                      <span className={slot.status === 'current' ? 'font-semibold text-indigo-700' : ''}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="ehr-button w-full mt-3 text-[12px] flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> View Full Schedule
                </button>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3">
              <span className="font-semibold text-[14px] text-gray-900">System Status</span>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {[
                { label: 'Database', status: 'Connected', ok: true },
                { label: 'HL7 Interface', status: 'Active', ok: true },
                { label: 'Pharmacy Link', status: 'Online', ok: true },
                { label: 'Last Sync', status: '2 min ago', ok: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-500">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    {item.ok && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    <span className={item.ok ? 'text-emerald-600 font-medium' : 'text-gray-600'}>{item.status}</span>
                  </div>
                </div>
              ))}
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
