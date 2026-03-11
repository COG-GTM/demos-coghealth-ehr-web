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
  AlertTriangle,
  Users,
  Calendar,
  Activity,
  Circle
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
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-amber-50', color: 'text-amber-700' };
      case 'isolation': return { label: 'ISO', bg: 'bg-blue-50', color: 'text-blue-700' };
      case 'npo': return { label: 'NPO', bg: 'bg-orange-50', color: 'text-orange-700' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-red-50', color: 'text-red-700' };
      case 'code-status': return { label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700' };
      case 'vip': return { label: 'VIP', bg: 'bg-purple-50', color: 'text-purple-700' };
      default: return { label: flag, bg: 'bg-gray-50', color: 'text-gray-600' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-amber-500';
      case 'normal': return 'text-emerald-500';
      case 'low': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-white">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />

      {/* Quick Actions Toolbar - Airbnb-style with rounded buttons */}
      <div className="bg-white border-b border-[#ebebeb] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:border-[#222222] hover:shadow-sm transition-all"
              onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}
            >
              <RefreshCw className="w-4 h-4 mr-2 text-[#717171]" /> Refresh
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:border-[#222222] hover:shadow-sm transition-all"
              onClick={() => setShowRxDialog(true)}
            >
              <Pill className="w-4 h-4 mr-2 text-[#FF385C]" /> e-Prescribe
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:border-[#222222] hover:shadow-sm transition-all"
              onClick={() => setShowLabDialog(true)}
            >
              <FlaskConical className="w-4 h-4 mr-2 text-blue-500" /> Order Labs
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:border-[#222222] hover:shadow-sm transition-all"
              onClick={() => setShowImagingDialog(true)}
            >
              <Radio className="w-4 h-4 mr-2 text-purple-500" /> Order Imaging
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:border-[#222222] hover:shadow-sm transition-all"
              onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}
            >
              <FileText className="w-4 h-4 mr-2 text-[#717171]" /> New Note
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:border-[#222222] hover:shadow-sm transition-all"
              onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}
            >
              <Send className="w-4 h-4 mr-2 text-[#717171]" /> Referral
            </button>
            <button 
              className="flex items-center px-4 py-2 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:border-[#222222] hover:shadow-sm transition-all"
              onClick={() => setShowPrintDialog(true)}
            >
              <Printer className="w-4 h-4 mr-2 text-[#717171]" /> Print
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button className="relative p-2.5 rounded-full border border-[#dddddd] hover:shadow-sm transition-all">
              <Bell className="w-5 h-5 text-[#222222]" />
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FF385C] text-white text-[10px] font-bold flex items-center justify-center rounded-full">3</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mx-6 mt-4 px-5 py-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <span className="font-bold text-sm text-red-800">CRITICAL ALERTS ({criticalAlerts.length})</span>
            </div>
            <div className="flex items-center space-x-6">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <span key={alert.id} className="text-sm text-red-700">
                  <strong>{alert.patient}:</strong> {alert.alert} - {alert.action}
                </span>
              ))}
              <button className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors">Review All</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats Cards - Airbnb style */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#ebebeb] rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#717171] uppercase tracking-wider">Unread Inbox</p>
                <p className="text-2xl font-bold text-[#222222] mt-1">{inboxCounts.all}</p>
              </div>
              <div className="w-10 h-10 bg-[#FFF1F2] rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-[#FF385C]" />
              </div>
            </div>
            <p className="text-xs text-[#717171] mt-2">{inboxCounts.results} results &middot; {inboxCounts.messages} messages</p>
          </div>
          <div className="bg-white border border-[#ebebeb] rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#717171] uppercase tracking-wider">Patients Today</p>
                <p className="text-2xl font-bold text-[#222222] mt-1">{worklistPatients.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-[#717171] mt-2">{filteredWorklist.filter(p => p.status === 'waiting').length} waiting &middot; {filteredWorklist.filter(p => p.status === 'in-progress').length} in progress</p>
          </div>
          <div className="bg-white border border-[#ebebeb] rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#717171] uppercase tracking-wider">Unsigned Notes</p>
                <p className="text-2xl font-bold text-[#222222] mt-1">{unsignedNotes.length}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-[#717171] mt-2">{unsignedNotes.filter(n => n.daysOld >= 2).length} overdue</p>
          </div>
          <div className="bg-white border border-[#ebebeb] rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#717171] uppercase tracking-wider">Pending Orders</p>
                <p className="text-2xl font-bold text-[#222222] mt-1">{pendingOrders.length}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-xs text-[#717171] mt-2">{pendingOrders.filter(o => o.status === 'pending-approval').length} need approval</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden px-6 pb-4 space-x-4">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Inbox Panel */}
          <div className={`bg-white border border-[#ebebeb] rounded-xl flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-[#FFF1F2] rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-[#FF385C]" />
                </div>
                <span className="font-bold text-base text-[#222222]">Inbox</span>
                {inboxCounts.all > 0 && (
                  <span className="px-2.5 py-0.5 bg-[#FF385C] text-white text-xs font-bold rounded-full">{inboxCounts.all} unread</span>
                )}
              </div>
              {expandedPanels.inbox ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
            </div>
            {expandedPanels.inbox && (
              <>
                <div className="px-5 py-2 border-t border-[#ebebeb] bg-[#fafafa] flex items-center space-x-2 overflow-x-auto">
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
                      className={`ehr-tab ${inboxTab === tab.key ? 'active' : ''}`}
                    >
                      {tab.label} {tab.count > 0 && <span className="ml-1 text-xs opacity-75">({tab.count})</span>}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <select 
                    value={inboxPriority} 
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="text-sm border border-[#dddddd] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#222222]"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select 
                    value={inboxReadFilter} 
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="text-sm border border-[#dddddd] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#222222]"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <button className="text-sm font-medium text-[#FF385C] hover:underline px-2" onClick={markAllAsRead}>Mark All Read</button>
                  <button className="p-1.5 rounded-full hover:bg-[#f0f0f0] transition-colors"><RefreshCw className="w-4 h-4 text-[#717171]" /></button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#fafafa]">
                      <tr>
                        <th className="px-5 py-2.5 text-left w-8"></th>
                        <th className="px-2 py-2.5 text-left w-10">Type</th>
                        <th className="px-3 py-2.5 text-left">Patient</th>
                        <th className="px-3 py-2.5 text-left">Subject</th>
                        <th className="px-3 py-2.5 text-left w-24">Time</th>
                        <th className="px-3 py-2.5 text-center w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInbox.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`cursor-pointer hover:bg-[#fafafa] transition-colors ${item.priority === 'critical' ? 'bg-red-50' : ''} ${!item.read ? 'font-semibold' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-1">
                              {!item.read && <Circle className={`w-2.5 h-2.5 fill-current ${getPriorityStyle(item.priority)}`} />}
                              {item.flagged && <Flag className="w-3.5 h-3.5 text-[#FF385C] fill-current" />}
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-8 h-8 bg-[#f7f7f7] rounded-full flex items-center justify-center">
                              {getInboxIcon(item.type)}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-[#222222]">{item.patientName}</span>
                            <span className="text-[#717171] ml-2 text-xs">{item.patientMrn}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className={item.priority === 'critical' ? 'text-red-700 font-semibold' : 'text-[#222222]'}>{item.title}</div>
                            <div className="text-[#717171] text-xs truncate max-w-[300px]">{item.detail}</div>
                          </td>
                          <td className="px-3 py-3 text-[#717171] text-xs">{item.timestamp}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button className="p-1.5 rounded-full hover:bg-[#f0f0f0] transition-colors" onClick={() => { markAsRead(item.id); navigate(`/patients/1`); }} title="View">
                                <Eye className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button className="p-1.5 rounded-full hover:bg-[#f0f0f0] transition-colors" onClick={() => markAsRead(item.id)} title="Mark Read">
                                <CheckCircle2 className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button className="p-1.5 rounded-full hover:bg-[#f0f0f0] transition-colors" onClick={() => toggleFlag(item.id)} title="Flag">
                                <Flag className={`w-4 h-4 ${item.flagged ? 'text-[#FF385C] fill-current' : 'text-[#717171]'}`} />
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

          {/* Worklist Panel */}
          <div className={`bg-white border border-[#ebebeb] rounded-xl flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <span className="font-bold text-base text-[#222222]">Patient Worklist</span>
                <span className="px-2.5 py-0.5 bg-[#f7f7f7] text-[#717171] text-xs font-medium rounded-full">{worklistPatients.length} patients</span>
              </div>
              {expandedPanels.worklist ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
            </div>
            {expandedPanels.worklist && (
              <>
                <div className="px-5 py-2 border-t border-[#ebebeb] bg-[#fafafa] flex items-center space-x-2">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'inpatient', label: 'Inpatient' },
                    { key: 'outpatient', label: 'Clinic' },
                    { key: 'critical', label: 'Critical' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setWorklistFilter(filter.key as WorklistFilter)}
                      className={`ehr-tab ${worklistFilter === filter.key ? 'active' : ''}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <span className="text-xs text-[#717171] font-medium">Sort:</span>
                  <select 
                    value={worklistSort} 
                    onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                    className="text-sm border border-[#dddddd] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#222222]"
                  >
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                    <option value="location">Location</option>
                  </select>
                  <button 
                    className="p-1.5 rounded-full hover:bg-[#f0f0f0] transition-colors" 
                    onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                  >
                    {worklistSortAsc ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
                  </button>
                  <button 
                    className="flex items-center px-3 py-1.5 bg-white border border-[#dddddd] rounded-full text-xs font-medium hover:border-[#222222] transition-all" 
                    onClick={() => setShowPrintDialog(true)}
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Print List
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#fafafa]">
                      <tr>
                        <th className="px-5 py-2.5 text-left">Patient</th>
                        <th className="px-3 py-2.5 text-left">Location</th>
                        <th className="px-3 py-2.5 text-left">Chief Complaint</th>
                        <th className="px-3 py-2.5 text-left">Vitals</th>
                        <th className="px-3 py-2.5 text-left">Alerts</th>
                        <th className="px-3 py-2.5 text-left">Status</th>
                        <th className="px-3 py-2.5 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorklist.map((patient) => (
                        <tr 
                          key={patient.id} 
                          className={`cursor-pointer hover:bg-[#fafafa] transition-colors ${patient.status === 'critical' ? 'bg-red-50' : ''}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 bg-[#f7f7f7] rounded-full flex items-center justify-center text-sm font-bold text-[#717171]">
                                {patient.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-[#222222]">{patient.name}</div>
                                <div className="text-[#717171] text-xs">{patient.mrn} &middot; {patient.age}{patient.gender}</div>
                                <div className="flex space-x-1 mt-0.5">
                                  {patient.flags.map((flag) => {
                                    const style = getFlagStyle(flag);
                                    return (
                                      <span key={flag} className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium ${style.bg} ${style.color}`}>
                                        {style.label}
                                      </span>
                                    );
                                  })}
                                </div>
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
                                <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-red-600 font-semibold' : ''}>{patient.lastVitals.bp}</span></div>
                                <div>HR: {patient.lastVitals.hr} SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-[#b0b0b0]">&mdash;</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-0.5">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-xs ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-red-700 font-semibold' : 'text-amber-700'}`}>
                                    &bull; {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#b0b0b0] text-xs">None</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(patient.status)}`}>
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-full hover:bg-[#f0f0f0] transition-colors" title="Open Chart">
                                <ExternalLink className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-full hover:bg-[#f0f0f0] transition-colors" title="Write Note">
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
        <div className="w-80 flex flex-col space-y-4 overflow-auto">
          {/* Unsigned Notes */}
          <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-500" />
                <span className="font-semibold text-sm text-[#222222]">Unsigned Notes ({unsignedNotes.length})</span>
              </div>
              {expandedPanels.unsigned ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.unsigned && (
              <div>
                {unsignedNotes.map((note) => (
                  <div key={note.id} className="px-4 py-3 border-t border-[#f0f0f0] flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                    <div>
                      <div className="font-medium text-sm text-[#222222]">{note.patientName}</div>
                      <div className="text-xs text-[#717171]">{note.type} &middot; {note.date}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {note.daysOld >= 2 && <span className="text-xs text-red-500 font-semibold">{note.daysOld}d</span>}
                      <button className="px-3 py-1 bg-[#FF385C] text-white text-xs font-medium rounded-full hover:bg-[#e31c5f] transition-colors">Sign</button>
                    </div>
                  </div>
                ))}
                <div className="p-3 border-t border-[#f0f0f0]">
                  <button className="w-full py-2 bg-[#222222] text-white text-sm font-medium rounded-lg hover:bg-[#000000] transition-colors">Sign All Notes</button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-sm text-[#222222]">Pending Orders ({pendingOrders.length})</span>
              </div>
              {expandedPanels.orders ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.orders && (
              <div>
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-3 border-t border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm text-[#222222]">{order.patientName}</div>
                        <div className="text-xs text-[#717171] mt-0.5">{order.order}</div>
                        <div className="flex space-x-1.5 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 bg-[#f7f7f7] text-[#717171] rounded-full font-medium">{order.type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            order.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                            order.status === 'pending-approval' ? 'bg-amber-50 text-amber-700' :
                            'bg-blue-50 text-blue-600'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1 bg-white border border-[#dddddd] text-xs font-medium rounded-full hover:border-[#222222] transition-all">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm text-[#222222]">Today&apos;s Schedule</span>
              </div>
              {expandedPanels.schedule ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
            </div>
            {expandedPanels.schedule && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-3 pt-2 border-t border-[#f0f0f0]">
                  <span className="text-xs text-[#717171]">January 18, 2024</span>
                  <span className="font-semibold text-sm text-[#222222]">8 appointments</span>
                </div>
                <div className="space-y-1">
                  {[
                    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                  ].map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between py-2.5 px-3 text-sm rounded-lg ${
                      slot.status === 'current' ? 'bg-[#FF385C]/5 border border-[#FF385C]/20 font-semibold text-[#FF385C]' :
                      slot.status === 'next' ? 'bg-[#f7f7f7]' :
                      slot.status === 'done' ? 'text-[#b0b0b0]' : 'text-[#222222]'
                    }`}>
                      <span className="text-xs font-medium">{slot.time}</span>
                      <span>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 py-2 bg-white border border-[#dddddd] text-sm font-medium rounded-lg hover:border-[#222222] transition-all">View Full Schedule</button>
              </div>
            )}
          </div>

          {/* System Messages */}
          <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 space-x-2">
              <AlertTriangle className="w-4 h-4 text-[#717171]" />
              <span className="font-semibold text-sm text-[#222222]">System Messages</span>
            </div>
            <div className="text-xs">
              <div className="px-4 py-2.5 border-t border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                <span className="text-[#b0b0b0]">01/18 08:00</span>
                <span className="text-[#717171] ml-2">System maintenance scheduled for 01/20 2:00 AM</span>
              </div>
              <div className="px-4 py-2.5 border-t border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                <span className="text-[#b0b0b0]">01/17 14:30</span>
                <span className="text-[#717171] ml-2">New formulary updates available</span>
              </div>
              <div className="px-4 py-2.5 border-t border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                <span className="text-[#b0b0b0]">01/16 09:15</span>
                <span className="text-[#717171] ml-2">Lab interface upgraded to v3.2</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 space-x-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-sm text-[#222222]">System Status</span>
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
                    <span className="text-xs text-[#717171]">{item.label}</span>
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className={`text-xs font-medium ${item.ok ? 'text-emerald-600' : 'text-red-600'}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>Dr. Sarah Anderson, MD | Internal Medicine | Logged in 2h 34m</span>
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
