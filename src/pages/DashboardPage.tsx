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
  ChevronUp,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Zap
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
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'lab': return <FlaskConical className={iconClass} />;
      case 'imaging': return <Radio className={iconClass} />;
      case 'message': return <MessageSquare className={iconClass} />;
      case 'refill': return <Pill className={iconClass} />;
      case 'order': return <ClipboardList className={iconClass} />;
      case 'cosign': return <Edit3 className={iconClass} />;
      case 'consult': return <Stethoscope className={iconClass} />;
      default: return <FileText className={iconClass} />;
    }
  };

  const getInboxTypeColor = (type: string) => {
    switch (type) {
      case 'lab': return 'bg-purple-50 text-purple-600';
      case 'imaging': return 'bg-blue-50 text-blue-600';
      case 'message': return 'bg-emerald-50 text-emerald-600';
      case 'refill': return 'bg-orange-50 text-orange-600';
      case 'order': return 'bg-indigo-50 text-indigo-600';
      case 'cosign': return 'bg-amber-50 text-amber-600';
      case 'consult': return 'bg-teal-50 text-teal-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical': return { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500' };
      case 'waiting': return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' };
      case 'roomed': return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400' };
      case 'in-progress': return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
      case 'ready-discharge': return { bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700', dot: 'bg-violet-400' };
      default: return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' };
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-amber-100', color: 'text-amber-800' };
      case 'isolation': return { label: 'ISO', bg: 'bg-purple-100', color: 'text-purple-800' };
      case 'npo': return { label: 'NPO', bg: 'bg-orange-100', color: 'text-orange-800' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-red-100', color: 'text-red-800' };
      case 'code-status': return { label: 'DNR', bg: 'bg-gray-700', color: 'text-white' };
      case 'vip': return { label: 'VIP', bg: 'bg-amber-200', color: 'text-amber-900' };
      default: return { label: flag, bg: 'bg-gray-100', color: 'text-gray-700' };
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-400';
      case 'normal': return 'bg-emerald-400';
      case 'low': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-[#f7f7f7]">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />

      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#ebebeb]">
        <div className="flex items-center space-x-2">
          <button 
            className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#f7f7f7] hover:bg-[#ebebeb] text-[#484848] text-sm font-semibold transition-all"
            onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <div className="w-px h-6 bg-[#ebebeb]" />
          <button className="flex items-center space-x-1.5 px-4 py-2 rounded-full hover:bg-[#f7f7f7] text-[#484848] text-sm font-semibold transition-all" onClick={() => setShowRxDialog(true)}>
            <Pill className="w-4 h-4" />
            <span>e-Prescribe</span>
          </button>
          <button className="flex items-center space-x-1.5 px-4 py-2 rounded-full hover:bg-[#f7f7f7] text-[#484848] text-sm font-semibold transition-all" onClick={() => setShowLabDialog(true)}>
            <FlaskConical className="w-4 h-4" />
            <span>Order Labs</span>
          </button>
          <button className="flex items-center space-x-1.5 px-4 py-2 rounded-full hover:bg-[#f7f7f7] text-[#484848] text-sm font-semibold transition-all" onClick={() => setShowImagingDialog(true)}>
            <Radio className="w-4 h-4" />
            <span>Order Imaging</span>
          </button>
          <button className="flex items-center space-x-1.5 px-4 py-2 rounded-full hover:bg-[#f7f7f7] text-[#484848] text-sm font-semibold transition-all" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
            <FileText className="w-4 h-4" />
            <span>New Note</span>
          </button>
          <button className="flex items-center space-x-1.5 px-4 py-2 rounded-full hover:bg-[#f7f7f7] text-[#484848] text-sm font-semibold transition-all" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
            <Send className="w-4 h-4" />
            <span>Referral</span>
          </button>
          <div className="w-px h-6 bg-[#ebebeb]" />
          <button className="flex items-center space-x-1.5 px-4 py-2 rounded-full hover:bg-[#f7f7f7] text-[#484848] text-sm font-semibold transition-all" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button className="relative p-2 rounded-full hover:bg-[#f7f7f7] transition-colors">
            <Bell className="w-5 h-5 text-[#484848]" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-[#ff385c] text-white text-[9px] font-bold flex items-center justify-center rounded-full">3</span>
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mx-6 mt-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 p-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <span className="font-bold text-red-800 text-sm">Critical Alerts ({criticalAlerts.length})</span>
                <div className="flex items-center space-x-4 mt-1">
                  {criticalAlerts.slice(0, 2).map((alert) => (
                    <span key={alert.id} className="text-xs text-red-700">
                      <strong>{alert.patient}:</strong> {alert.alert}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-full transition-colors">
              Review All
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-6 pt-4 space-x-6">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col space-y-5 overflow-hidden">
          {/* Inbox Card */}
          <div className={`bg-white rounded-2xl border border-[#ebebeb] flex flex-col overflow-hidden shadow-sm ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#ff385c]/10 flex items-center justify-center">
                  <MessageSquare className="w-4.5 h-4.5 text-[#ff385c]" />
                </div>
                <div>
                  <h2 className="font-bold text-[#222222]">Inbox</h2>
                  <span className="text-xs text-[#717171]">{inboxCounts.all} unread</span>
                </div>
              </div>
              {expandedPanels.inbox ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
            </div>
            {expandedPanels.inbox && (
              <>
                <div className="px-5 pb-3 flex items-center space-x-2 flex-wrap">
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
                      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        inboxTab === tab.key
                          ? 'bg-[#222222] text-white'
                          : 'bg-[#f7f7f7] text-[#484848] hover:bg-[#ebebeb]'
                      }`}
                    >
                      {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <select 
                    value={inboxPriority} 
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#dddddd] bg-white text-[#484848] font-semibold"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select 
                    value={inboxReadFilter} 
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#dddddd] bg-white text-[#484848] font-semibold"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <button className="text-xs font-semibold text-[#ff385c] hover:underline px-2" onClick={markAllAsRead}>Mark All Read</button>
                  <button className="p-1.5 rounded-full hover:bg-[#f7f7f7]" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Inbox refreshed.', type: 'info' })}>
                    <RefreshCw className="w-3.5 h-3.5 text-[#717171]" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto border-t border-[#ebebeb]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#fafafa]">
                      <tr>
                        <th className="px-5 py-3 text-left w-8"></th>
                        <th className="px-2 py-3 text-left w-10">Type</th>
                        <th className="px-2 py-3 text-left">Patient</th>
                        <th className="px-2 py-3 text-left">Subject</th>
                        <th className="px-2 py-3 text-left w-24">Time</th>
                        <th className="px-2 py-3 text-center w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInbox.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`cursor-pointer transition-colors ${
                            item.priority === 'critical' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-[#f7f7f7]'
                          } ${!item.read ? 'font-semibold' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-1">
                              {!item.read && <span className={`w-2.5 h-2.5 rounded-full ${getPriorityDot(item.priority)}`} />}
                              {item.flagged && <Flag className="w-3.5 h-3.5 text-[#ff385c]" />}
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getInboxTypeColor(item.type)}`}>
                              {getInboxIcon(item.type)}
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="text-[#222222]">{item.patientName}</div>
                            <div className="text-[#717171] text-xs font-normal">{item.patientMrn}</div>
                          </td>
                          <td className="px-2 py-3">
                            <div className={item.priority === 'critical' ? 'text-red-700' : 'text-[#222222]'}>{item.title}</div>
                            <div className="text-[#717171] text-xs truncate max-w-[300px] font-normal">{item.detail}</div>
                          </td>
                          <td className="px-2 py-3 text-[#717171] text-xs font-normal">{item.timestamp}</td>
                          <td className="px-2 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button className="p-1.5 rounded-full hover:bg-[#f7f7f7] text-[#717171] hover:text-[#222222] transition-colors" onClick={() => { markAsRead(item.id); navigate(`/patients/1`); }} title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 rounded-full hover:bg-[#f7f7f7] text-[#717171] hover:text-emerald-600 transition-colors" onClick={() => markAsRead(item.id)} title="Mark Read">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 rounded-full hover:bg-[#f7f7f7] transition-colors" onClick={() => toggleFlag(item.id)} title="Flag">
                                <Flag className={`w-4 h-4 ${item.flagged ? 'text-[#ff385c] fill-[#ff385c]' : 'text-[#717171] hover:text-[#ff385c]'}`} />
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

          {/* Worklist Card */}
          <div className={`bg-white rounded-2xl border border-[#ebebeb] flex flex-col overflow-hidden shadow-sm ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ClipboardList className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-[#222222]">Patient Worklist</h2>
                  <span className="text-xs text-[#717171]">{worklistPatients.length} patients</span>
                </div>
              </div>
              {expandedPanels.worklist ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
            </div>
            {expandedPanels.worklist && (
              <>
                <div className="px-5 pb-3 flex items-center space-x-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'inpatient', label: 'Inpatient' },
                    { key: 'outpatient', label: 'Clinic' },
                    { key: 'critical', label: 'Critical' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setWorklistFilter(filter.key as WorklistFilter)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        worklistFilter === filter.key
                          ? 'bg-[#222222] text-white'
                          : 'bg-[#f7f7f7] text-[#484848] hover:bg-[#ebebeb]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <span className="text-xs text-[#717171] font-medium">Sort:</span>
                  <select 
                    value={worklistSort} 
                    onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#dddddd] bg-white text-[#484848] font-semibold"
                  >
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                    <option value="location">Location</option>
                  </select>
                  <button 
                    className="p-1.5 rounded-full hover:bg-[#f7f7f7] text-[#717171] font-semibold text-sm"
                    onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                  >
                    {worklistSortAsc ? '↑' : '↓'}
                  </button>
                  <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#f7f7f7] hover:bg-[#ebebeb] text-[#484848] text-xs font-semibold transition-all" onClick={() => setShowPrintDialog(true)}>
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print List</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto border-t border-[#ebebeb]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#fafafa]">
                      <tr>
                        <th className="px-5 py-3 text-left">Patient</th>
                        <th className="px-2 py-3 text-left">Location</th>
                        <th className="px-2 py-3 text-left">Chief Complaint</th>
                        <th className="px-2 py-3 text-left">Vitals</th>
                        <th className="px-2 py-3 text-left">Alerts</th>
                        <th className="px-2 py-3 text-left">Status</th>
                        <th className="px-2 py-3 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorklist.map((patient) => {
                        const statusBadge = getStatusBadge(patient.status);
                        return (
                          <tr 
                            key={patient.id} 
                            className={`cursor-pointer transition-colors ${
                              patient.status === 'critical' ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-[#f7f7f7]'
                            }`}
                            onClick={() => navigate(`/patients/${patient.id}`)}
                          >
                            <td className="px-5 py-3">
                              <div className="font-semibold text-[#222222]">{patient.name}</div>
                              <div className="text-[#717171] text-xs">{patient.mrn} · {patient.age}{patient.gender}</div>
                              {patient.flags.length > 0 && (
                                <div className="flex space-x-1 mt-1">
                                  {patient.flags.map((flag) => {
                                    const style = getFlagStyle(flag);
                                    return (
                                      <span key={flag} className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${style.bg} ${style.color}`}>
                                        {style.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <div className="text-[#222222] text-sm">{patient.room || patient.appointmentTime}</div>
                              <div className="text-[#717171] text-xs">{patient.location}</div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="text-[#222222]">{patient.chiefComplaint}</div>
                              {patient.admitDate && <div className="text-[#717171] text-xs">Admit: {patient.admitDate}</div>}
                            </td>
                            <td className="px-2 py-3 text-xs">
                              {patient.lastVitals ? (
                                <>
                                  <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-red-600 font-semibold' : 'text-[#484848]'}>{patient.lastVitals.bp}</span></div>
                                  <div className="text-[#717171]">HR: {patient.lastVitals.hr} · SpO2: {patient.lastVitals.spo2}%</div>
                                </>
                              ) : (
                                <span className="text-[#b0b0b0]">—</span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              {patient.alerts.length > 0 ? (
                                <div className="space-y-1">
                                  {patient.alerts.slice(0, 2).map((alert, i) => (
                                    <div key={i} className={`text-xs ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                                      • {alert}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[#b0b0b0] text-xs">None</span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${statusBadge.bg} ${statusBadge.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                                <span>{patient.status.replace('-', ' ')}</span>
                              </span>
                            </td>
                            <td className="px-2 py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/patients/${patient.id}`); }} className="p-1.5 rounded-full hover:bg-[#f7f7f7] text-[#717171] hover:text-[#222222] transition-colors" title="Open Chart">
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-full hover:bg-[#f7f7f7] text-[#717171] hover:text-[#222222] transition-colors" title="Write Note">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar Cards */}
        <div className="w-80 flex flex-col space-y-5 overflow-auto">
          {/* Unsigned Notes Card */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden shadow-sm">
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#222222] text-sm">Unsigned Notes</h3>
                  <span className="text-xs text-[#717171]">{unsignedNotes.length} pending</span>
                </div>
              </div>
              {expandedPanels.unsigned ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.unsigned && (
              <div className="border-t border-[#ebebeb]">
                {unsignedNotes.map((note) => (
                  <div key={note.id} className="px-5 py-3 border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-[#222222]">{note.patientName}</div>
                        <div className="text-xs text-[#717171] mt-0.5">{note.type} · {note.date}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {note.daysOld >= 2 && (
                          <span className="flex items-center space-x-1 text-xs text-red-600 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{note.daysOld}d</span>
                          </span>
                        )}
                        <button className="px-3 py-1 text-xs font-semibold rounded-full text-white transition-all" style={{ background: 'linear-gradient(to right, #e61e4d, #d70466)' }}>
                          Sign
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-3 bg-[#fafafa]">
                  <button className="w-full py-2 text-sm font-semibold rounded-full border border-[#222222] text-[#222222] hover:bg-[#222222] hover:text-white transition-all">
                    Sign All Notes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders Card */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden shadow-sm">
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#222222] text-sm">Pending Orders</h3>
                  <span className="text-xs text-[#717171]">{pendingOrders.length} awaiting</span>
                </div>
              </div>
              {expandedPanels.orders ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.orders && (
              <div className="border-t border-[#ebebeb]">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-5 py-3 border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-[#222222]">{order.patientName}</div>
                        <div className="text-xs text-[#484848] mt-0.5">{order.order}</div>
                        <div className="flex space-x-1.5 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f7f7f7] text-[#484848] font-semibold">{order.type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            order.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                            order.status === 'pending-approval' ? 'bg-amber-50 text-amber-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1 text-xs font-semibold rounded-full border border-[#222222] text-[#222222] hover:bg-[#222222] hover:text-white transition-all">
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule Card */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden shadow-sm">
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#222222] text-sm">Today's Schedule</h3>
                  <span className="text-xs text-[#717171]">8 appointments</span>
                </div>
              </div>
              {expandedPanels.schedule ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.schedule && (
              <div className="border-t border-[#ebebeb]">
                <div className="px-5 py-2.5 flex items-center justify-between text-xs text-[#717171] bg-[#fafafa]">
                  <span>January 18, 2024</span>
                  <span className="font-semibold text-[#222222]">8 appointments</span>
                </div>
                {[
                  { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                  { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                  { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                  { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                  { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                ].map((slot, i) => (
                  <div key={i} className={`flex items-center justify-between px-5 py-3 border-b border-[#f0f0f0] last:border-b-0 ${
                    slot.status === 'current' ? 'bg-[#ff385c]/5 border-l-2 border-l-[#ff385c]' :
                    slot.status === 'next' ? 'bg-blue-50/50' :
                    slot.status === 'done' ? 'opacity-50' : ''
                  }`}>
                    <div className="flex items-center space-x-3">
                      <Clock className={`w-3.5 h-3.5 ${slot.status === 'current' ? 'text-[#ff385c]' : 'text-[#717171]'}`} />
                      <span className={`text-sm ${slot.status === 'current' ? 'font-bold text-[#222222]' : 'text-[#484848]'}`}>{slot.time}</span>
                    </div>
                    <span className={`text-sm ${
                      slot.status === 'current' ? 'font-bold text-[#222222]' :
                      slot.status === 'done' ? 'text-[#717171]' : 'text-[#484848] font-medium'
                    }`}>{slot.patient}</span>
                  </div>
                ))}
                <div className="p-3 bg-[#fafafa]">
                  <button className="w-full py-2 text-sm font-semibold rounded-full border border-[#222222] text-[#222222] hover:bg-[#222222] hover:text-white transition-all flex items-center justify-center space-x-1.5">
                    <span>View Full Schedule</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* System Messages Card */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden shadow-sm">
            <div className="flex items-center space-x-3 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <Bell className="w-4.5 h-4.5 text-[#484848]" />
              </div>
              <h3 className="font-bold text-[#222222] text-sm">System Messages</h3>
            </div>
            <div className="border-t border-[#ebebeb]">
              {[
                { date: '01/18 08:00', message: 'System maintenance scheduled for 01/20 2:00 AM' },
                { date: '01/17 14:30', message: 'New formulary updates available' },
                { date: '01/16 09:15', message: 'Lab interface upgraded to v3.2' },
              ].map((msg, i) => (
                <div key={i} className="px-5 py-3 border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#fafafa] transition-colors">
                  <div className="text-[10px] text-[#b0b0b0] font-medium">{msg.date}</div>
                  <div className="text-xs text-[#484848] mt-0.5">{msg.message}</div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status Card */}
          <div className="bg-white rounded-2xl border border-[#ebebeb] overflow-hidden shadow-sm">
            <div className="flex items-center space-x-3 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Stethoscope className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-[#222222] text-sm">System Status</h3>
            </div>
            <div className="border-t border-[#ebebeb] px-5 py-3 space-y-2.5">
              {[
                { label: 'Database', value: 'Connected', ok: true },
                { label: 'HL7 Interface', value: 'Active', ok: true },
                { label: 'Pharmacy Link', value: 'Online', ok: true },
                { label: 'Last Sync', value: '2 min ago', ok: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-[#717171]">{item.label}</span>
                  <div className="flex items-center space-x-1.5">
                    {item.ok && <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />}
                    <span className={`text-xs font-semibold ${item.ok ? 'text-emerald-600' : 'text-red-600'}`}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="bg-white border-t border-[#ebebeb] flex items-center justify-between px-6 py-2 text-xs text-[#717171]">
        <span>Dr. Sarah Anderson, MD · Internal Medicine · Logged in 2h 34m</span>
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
