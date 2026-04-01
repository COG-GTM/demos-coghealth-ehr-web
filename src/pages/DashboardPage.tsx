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
  ChevronRight,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  Activity,
  Inbox,
  Users
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
      case 'lab': return <FlaskConical className="w-3.5 h-3.5" />;
      case 'imaging': return <Radio className="w-3.5 h-3.5" />;
      case 'message': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'refill': return <Pill className="w-3.5 h-3.5" />;
      case 'order': return <ClipboardList className="w-3.5 h-3.5" />;
      case 'cosign': return <Edit3 className="w-3.5 h-3.5" />;
      case 'consult': return <Stethoscope className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  const getInboxIconColor = (type: string) => {
    switch (type) {
      case 'lab': return 'text-violet-500';
      case 'imaging': return 'text-blue-500';
      case 'message': return 'text-emerald-500';
      case 'refill': return 'text-amber-500';
      case 'order': return 'text-sky-500';
      case 'cosign': return 'text-orange-500';
      case 'consult': return 'text-indigo-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      case 'waiting': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
      case 'roomed': return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'in-progress': return 'bg-violet-50 text-violet-700 ring-1 ring-violet-200';
      case 'ready-discharge': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
      default: return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'waiting': return 'bg-amber-400';
      case 'roomed': return 'bg-blue-400';
      case 'in-progress': return 'bg-violet-500';
      case 'ready-discharge': return 'bg-emerald-500';
      default: return 'bg-gray-400';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', classes: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' };
      case 'isolation': return { label: 'ISO', classes: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' };
      case 'npo': return { label: 'NPO', classes: 'bg-red-50 text-red-700 ring-1 ring-red-200' };
      case 'allergy': return { label: 'ALLERGY', classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
      case 'code-status': return { label: 'DNR', classes: 'bg-gray-100 text-gray-700 ring-1 ring-gray-300' };
      case 'vip': return { label: 'VIP', classes: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' };
      default: return { label: flag, classes: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-400';
      case 'normal': return 'text-blue-400';
      case 'low': return 'text-gray-300';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-gray-50">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />

      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-1">
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setShowRxDialog(true)}
          >
            <Pill className="w-3.5 h-3.5" /> e-Prescribe
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setShowLabDialog(true)}
          >
            <FlaskConical className="w-3.5 h-3.5" /> Order Labs
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setShowImagingDialog(true)}
          >
            <Radio className="w-3.5 h-3.5" /> Order Imaging
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}
          >
            <FileText className="w-3.5 h-3.5" /> New Note
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}
          >
            <Send className="w-3.5 h-3.5" /> Referral
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setShowPrintDialog(true)}
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
        <div className="flex items-center">
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-violet-500 text-white text-[9px] font-medium flex items-center justify-center rounded-full">3</span>
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              </div>
              <span className="font-semibold text-xs text-red-800">Critical Alerts ({criticalAlerts.length})</span>
            </div>
            <div className="flex items-center gap-4">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <span key={alert.id} className="text-xs text-red-700">
                  <strong>{alert.patient}:</strong> {alert.alert} &mdash; {alert.action}
                </span>
              ))}
              <button className="text-xs font-medium text-red-700 hover:text-red-900 px-2.5 py-1 rounded-md hover:bg-red-100 transition-colors">
                Review All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Inbox Panel */}
          <div className={`bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <button
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('inbox')}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.inbox ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <Inbox className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Inbox</span>
                {inboxCounts.all > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-semibold rounded-full">{inboxCounts.all} unread</span>
                )}
              </div>
            </button>
            {expandedPanels.inbox && (
              <>
                {/* Inbox Tabs & Filters */}
                <div className="flex items-center gap-1 px-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    {([
                      { key: 'all' as const, label: 'All', count: inboxCounts.all },
                      { key: 'results' as const, label: 'Results', count: inboxCounts.results },
                      { key: 'messages' as const, label: 'Messages', count: inboxCounts.messages },
                      { key: 'rxRefills' as const, label: 'Rx Refills', count: inboxCounts.rxRefills },
                      { key: 'orders' as const, label: 'Orders', count: inboxCounts.orders },
                      { key: 'cosign' as const, label: 'Co-sign', count: inboxCounts.cosign },
                    ]).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setInboxTab(tab.key)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                          inboxTab === tab.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                        {tab.count > 0 && <span className="ml-1 text-[9px] text-violet-500">({tab.count})</span>}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <select
                    value={inboxPriority}
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="text-[11px] text-gray-600 bg-transparent border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select
                    value={inboxReadFilter}
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="text-[11px] text-gray-600 bg-transparent border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <button
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    onClick={markAllAsRead}
                  >
                    Mark All Read
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Inbox List */}
                <div className="flex-1 overflow-auto">
                  {filteredInbox.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                      No items to display
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredInbox.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer group ${
                            !item.read ? 'bg-violet-50/30' : ''
                          } ${item.priority === 'critical' ? 'border-l-2 border-l-red-400' : ''}`}
                        >
                          <div className="flex-shrink-0">
                            <Circle className={`w-2 h-2 fill-current ${getPriorityStyle(item.priority)}`} />
                          </div>
                          <div className={`flex-shrink-0 ${getInboxIconColor(item.type)}`}>
                            {getInboxIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${!item.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{item.patientName}</span>
                              <span className="text-[10px] text-gray-400">{item.patientMrn}</span>
                              {item.flagged && <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[11px] ${item.priority === 'critical' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{item.title}</span>
                              <span className="text-[10px] text-gray-400 truncate">&mdash; {item.detail}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-[10px] text-gray-400">{item.timestamp}</div>
                          <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                              onClick={(e) => { e.stopPropagation(); markAsRead(item.id); navigate('/patients/1'); }}
                              title="View"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              onClick={(e) => { e.stopPropagation(); markAsRead(item.id); }}
                              title="Mark Read"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="p-1 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
                              onClick={(e) => { e.stopPropagation(); toggleFlag(item.id); }}
                              title="Flag"
                            >
                              <Flag className={`w-3.5 h-3.5 ${item.flagged ? 'text-amber-500 fill-amber-500' : ''}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Worklist Panel */}
          <div className={`bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <button
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('worklist')}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.worklist ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Patient Worklist</span>
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full">{worklistPatients.length} patients</span>
              </div>
            </button>
            {expandedPanels.worklist && (
              <>
                <div className="flex items-center gap-2 px-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    {([
                      { key: 'all' as const, label: 'All' },
                      { key: 'inpatient' as const, label: 'Inpatient' },
                      { key: 'outpatient' as const, label: 'Clinic' },
                      { key: 'critical' as const, label: 'Critical' },
                    ]).map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setWorklistFilter(filter.key)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                          worklistFilter === filter.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span>Sort:</span>
                    <select
                      value={worklistSort}
                      onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                      className="text-[11px] text-gray-600 bg-transparent border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300"
                    >
                      <option value="status">Status</option>
                      <option value="name">Name</option>
                      <option value="location">Location</option>
                    </select>
                    <button
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-xs"
                      onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                    >
                      {worklistSortAsc ? '\u2191' : '\u2193'}
                    </button>
                  </div>
                  <div className="flex-1" />
                  <button
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                    onClick={() => setShowPrintDialog(true)}
                  >
                    <Printer className="w-3 h-3" /> Print List
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Patient</th>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Location</th>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Chief Complaint</th>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Vitals</th>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Alerts</th>
                        <th className="px-4 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Status</th>
                        <th className="px-4 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredWorklist.map((patient) => (
                        <tr
                          key={patient.id}
                          className={`hover:bg-gray-50 transition-colors cursor-pointer group ${patient.status === 'critical' ? 'bg-red-50/30' : ''}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-gray-900">{patient.name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{patient.mrn} &middot; {patient.age}{patient.gender}</div>
                            {patient.flags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {patient.flags.map((flag) => {
                                  const style = getFlagStyle(flag);
                                  return (
                                    <span key={flag} className={`px-1.5 py-0 text-[9px] font-medium rounded-full ${style.classes}`}>
                                      {style.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="text-gray-700">{patient.room || patient.appointmentTime}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{patient.location}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="text-gray-700">{patient.chiefComplaint}</div>
                            {patient.admitDate && <div className="text-[10px] text-gray-400 mt-0.5">Admit: {patient.admitDate}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-[11px]">
                            {patient.lastVitals ? (
                              <>
                                <div className="text-gray-600">BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-red-600 font-medium' : ''}>{patient.lastVitals.bp}</span></div>
                                <div className="text-gray-400 mt-0.5">HR: {patient.lastVitals.hr} &middot; SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-gray-300">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-0.5">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-[10px] ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-red-600 font-medium' : 'text-amber-600'}`}>
                                    {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[10px]">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusStyle(patient.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(patient.status)}`} />
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                                title="Open Chart"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                                title="Write Note"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
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
        <div className="w-72 flex flex-col gap-3 overflow-auto">
          {/* Unsigned Notes */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('unsigned')}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.unsigned ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Unsigned Notes</span>
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded-full">{unsignedNotes.length}</span>
              </div>
            </button>
            {expandedPanels.unsigned && (
              <div className="border-t border-gray-100">
                <div className="divide-y divide-gray-100">
                  {unsignedNotes.map((note) => (
                    <div key={note.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{note.patientName}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{note.type} &middot; {note.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {note.daysOld >= 2 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {note.daysOld}d
                          </span>
                        )}
                        <button className="text-[10px] font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-md transition-colors">
                          Sign
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-gray-100">
                  <button className="w-full text-[11px] font-medium text-gray-600 hover:text-gray-900 py-1.5 rounded-md hover:bg-gray-100 transition-colors">
                    Sign All Notes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('orders')}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.orders ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <ClipboardList className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Pending Orders</span>
                <span className="px-1.5 py-0.5 bg-sky-100 text-sky-700 text-[10px] font-semibold rounded-full">{pendingOrders.length}</span>
              </div>
            </button>
            {expandedPanels.orders && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{order.patientName}</div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{order.order}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[9px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">{order.type}</span>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                            order.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                            order.status === 'pending-approval' ? 'bg-amber-50 text-amber-700' :
                            'bg-violet-50 text-violet-600'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="text-[10px] font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-md transition-colors">
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => togglePanel('schedule')}
            >
              <div className="flex items-center gap-2">
                {expandedPanels.schedule ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Today's Schedule</span>
              </div>
            </button>
            {expandedPanels.schedule && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-gray-400">January 18, 2024</span>
                  <span className="font-medium text-gray-700">8 appointments</span>
                </div>
                <div className="space-y-1">
                  {[
                    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                  ].map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 text-xs rounded-md transition-colors ${
                      slot.status === 'current' ? 'bg-violet-50 ring-1 ring-violet-200' :
                      slot.status === 'next' ? 'bg-gray-50' :
                      slot.status === 'done' ? 'text-gray-400' : 'hover:bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Clock className={`w-3 h-3 ${slot.status === 'current' ? 'text-violet-500' : 'text-gray-300'}`} />
                        <span className={slot.status === 'done' ? 'text-gray-400' : 'text-gray-500'}>{slot.time}</span>
                      </div>
                      <span className={`${
                        slot.status === 'current' ? 'font-semibold text-violet-700' :
                        slot.status === 'done' ? 'text-gray-400' : 'text-gray-700'
                      }`}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 text-[11px] font-medium text-violet-600 hover:text-violet-700 py-2 rounded-md hover:bg-violet-50 transition-colors">
                  View Full Schedule
                </button>
              </div>
            )}
          </div>

          {/* System Messages */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">System Messages</span>
            </div>
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              <div className="px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <span className="text-gray-400 text-[10px]">01/18 08:00</span>
                <span className="mx-1.5 text-gray-200">&middot;</span>
                System maintenance scheduled for 01/20 2:00 AM
              </div>
              <div className="px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <span className="text-gray-400 text-[10px]">01/17 14:30</span>
                <span className="mx-1.5 text-gray-200">&middot;</span>
                New formulary updates available
              </div>
              <div className="px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <span className="text-gray-400 text-[10px]">01/16 09:15</span>
                <span className="mx-1.5 text-gray-200">&middot;</span>
                Lab interface upgraded to v3.2
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">System Status</span>
            </div>
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="space-y-2">
                {[
                  { label: 'Database', status: 'Connected', ok: true },
                  { label: 'HL7 Interface', status: 'Active', ok: true },
                  { label: 'Pharmacy Link', status: 'Online', ok: true },
                  { label: 'Last Sync', status: '2 min ago', ok: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{item.label}</span>
                    <span className={`flex items-center gap-1.5 font-medium ${item.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                      {item.ok && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-gray-200 text-[10px] text-gray-500">
        <span>Dr. Sarah Anderson, MD &middot; Internal Medicine &middot; Logged in 2h 34m</span>
        <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
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
