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
  Clock,
  Calendar,
  AlertTriangle,
  Check,
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
      case 'critical': return 'bg-[#FFF1F0] text-[#C01048] border border-[#FFB0A6]';
      case 'waiting': return 'bg-[#FFF8ED] text-[#8B5E00] border border-[#FFD699]';
      case 'roomed': return 'bg-[#EFF8FF] text-[#0055B3] border border-[#B3D9FF]';
      case 'in-progress': return 'bg-[#F0FFF4] text-[#0D6832] border border-[#A3E6C0]';
      case 'ready-discharge': return 'bg-[#F7F7F7] text-[#484848] border border-[#EBEBEB]';
      default: return 'bg-[#F7F7F7] text-[#484848] border border-[#EBEBEB]';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-[#FFF8ED]', color: 'text-[#8B5E00]' };
      case 'isolation': return { label: 'ISO', bg: 'bg-[#EFF8FF]', color: 'text-[#0055B3]' };
      case 'npo': return { label: 'NPO', bg: 'bg-[#FFF1F0]', color: 'text-[#C01048]' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-[#FFF1F0]', color: 'text-[#C01048]' };
      case 'code-status': return { label: 'DNR', bg: 'bg-[#F7F7F7]', color: 'text-[#484848]' };
      case 'vip': return { label: 'VIP', bg: 'bg-[#F0FFF4]', color: 'text-[#0D6832]' };
      default: return { label: flag, bg: 'bg-[#F7F7F7]', color: 'text-[#484848]' };
    }
  };

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-[#FF385C]';
      case 'high': return 'bg-[#FF8C7C]';
      case 'normal': return 'bg-[#B0B0B0]';
      case 'low': return 'bg-[#DDDDDD]';
      default: return 'bg-[#DDDDDD]';
    }
  };


  return (
    <div className="h-full flex flex-col relative" style={{ background: '#FAFAFA' }}>
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />
      
      {/* Quick Actions Toolbar */}
      <div className="bg-white border-b border-[#EBEBEB] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all"
            onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}
          >
            <RefreshCw className="w-4 h-4" /> <span>Refresh</span>
          </button>
          <div className="h-6 w-px bg-[#EBEBEB]"></div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#FF385C] text-white rounded-full text-sm font-semibold hover:bg-[#E31C5F] transition-all" onClick={() => setShowRxDialog(true)}>
            <Pill className="w-4 h-4" /> <span>e-Prescribe</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all" onClick={() => setShowLabDialog(true)}>
            <FlaskConical className="w-4 h-4" /> <span>Order Labs</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all" onClick={() => setShowImagingDialog(true)}>
            <Radio className="w-4 h-4" /> <span>Order Imaging</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
            <FileText className="w-4 h-4" /> <span>New Note</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
            <Send className="w-4 h-4" /> <span>Referral</span>
          </button>
          <div className="h-6 w-px bg-[#EBEBEB]"></div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#DDDDDD] rounded-full text-sm font-semibold text-[#222222] hover:border-[#222222] transition-all" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-4 h-4" /> <span>Print</span>
          </button>
        </div>
        <div className="flex items-center">
          <button className="relative p-2 hover:bg-[#F7F7F7] rounded-full transition-colors">
            <Bell className="w-5 h-5 text-[#484848]" />
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FF385C] text-white text-[10px] font-bold flex items-center justify-center rounded-full">3</span>
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mx-6 mt-4 bg-[#FFF1F0] border border-[#FFB0A6] rounded-xl px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-[#FF385C] flex items-center justify-center mr-3">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-[#C01048]">CRITICAL ALERTS ({criticalAlerts.length})</span>
            </div>
            <div className="flex items-center space-x-6">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <span key={alert.id} className="text-sm text-[#C01048]">
                  <strong>{alert.patient}:</strong> {alert.alert} &mdash; {alert.action}
                </span>
              ))}
              <button className="px-4 py-1.5 bg-white border border-[#FFB0A6] rounded-full text-sm font-semibold text-[#C01048] hover:bg-[#FFF1F0] transition-colors">Review All</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-6 space-x-6">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
          {/* Inbox Panel */}
          <div className={`airbnb-card flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center space-x-3">
                {expandedPanels.inbox ? <ChevronDown className="w-5 h-5 text-[#717171]" /> : <ChevronRight className="w-5 h-5 text-[#717171]" />}
                <h2 className="font-bold text-base text-[#222222]">Inbox</h2>
                {inboxCounts.all > 0 && (
                  <span className="px-2.5 py-0.5 bg-[#FF385C] text-white text-xs font-bold rounded-full">{inboxCounts.all} unread</span>
                )}
              </div>
            </div>
            {expandedPanels.inbox && (
              <>
                <div className="px-5 py-2 border-t border-b border-[#EBEBEB] flex items-center space-x-1 bg-white">
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
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        inboxTab === tab.key 
                          ? 'bg-[#222222] text-white' 
                          : 'bg-[#F7F7F7] text-[#717171] hover:bg-[#EBEBEB]'
                      }`}
                    >
                      {tab.label} {tab.count > 0 && <span className="ml-1 opacity-80">({tab.count})</span>}
                    </button>
                  ))}
                  <div className="h-5 w-px bg-[#EBEBEB] mx-1"></div>
                  <select 
                    value={inboxPriority} 
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F7F7F7] text-[#717171] border-none outline-none cursor-pointer"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select 
                    value={inboxReadFilter} 
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F7F7F7] text-[#717171] border-none outline-none cursor-pointer"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <div className="flex-1" />
                  <button className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#FF385C] hover:bg-[#FFF1F0] transition-colors" onClick={markAllAsRead}>Mark All Read</button>
                  <button className="p-1.5 hover:bg-[#F7F7F7] rounded-full transition-colors"><RefreshCw className="w-3.5 h-3.5 text-[#717171]" /></button>
                </div>
                <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#FAFAFA]">
                      <tr>
                        <th className="px-5 py-2.5 text-left w-8 border-b border-[#EBEBEB]"></th>
                        <th className="px-2 py-2.5 text-left w-8 border-b border-[#EBEBEB]">Type</th>
                        <th className="px-3 py-2.5 text-left border-b border-[#EBEBEB]">Patient</th>
                        <th className="px-3 py-2.5 text-left border-b border-[#EBEBEB]">Subject</th>
                        <th className="px-3 py-2.5 text-left w-24 border-b border-[#EBEBEB]">Time</th>
                        <th className="px-3 py-2.5 text-center w-28 border-b border-[#EBEBEB]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInbox.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`cursor-pointer transition-colors hover:bg-[#F7F7F7] ${item.priority === 'critical' ? 'bg-[#FFF1F0] hover:bg-[#FFE4E1]' : ''} ${!item.read ? 'font-semibold' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-1">
                              {!item.read && <span className={`w-2 h-2 rounded-full ${getPriorityDot(item.priority)}`} />}
                              {item.flagged && <Flag className="w-3.5 h-3.5 text-[#FF385C]" />}
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              item.type === 'lab' ? 'bg-[#EFF8FF] text-[#0055B3]' :
                              item.type === 'imaging' ? 'bg-[#F0FFF4] text-[#0D6832]' :
                              item.type === 'message' ? 'bg-[#FFF8ED] text-[#8B5E00]' :
                              item.type === 'refill' ? 'bg-[#FFF1F0] text-[#C01048]' :
                              'bg-[#F7F7F7] text-[#484848]'
                            }`}>
                              {getInboxIcon(item.type)}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-[#222222]">{item.patientName}</span>
                            <span className="text-[#717171] ml-2 text-xs">{item.patientMrn}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className={item.priority === 'critical' ? 'text-[#C01048]' : 'text-[#222222]'}>{item.title}</div>
                            <div className="text-[#717171] text-xs truncate max-w-[300px]">{item.detail}</div>
                          </td>
                          <td className="px-3 py-3 text-xs text-[#717171]">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{item.timestamp}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button className="p-1.5 hover:bg-[#F7F7F7] rounded-full transition-colors" onClick={() => { markAsRead(item.id); navigate(`/patients/${item.id}`); }} title="View">
                                <Eye className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button className="p-1.5 hover:bg-[#F7F7F7] rounded-full transition-colors" onClick={() => markAsRead(item.id)} title="Mark Read">
                                <CheckCircle2 className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button className="p-1.5 hover:bg-[#FFF1F0] rounded-full transition-colors" onClick={() => toggleFlag(item.id)} title="Flag">
                                <Flag className={`w-4 h-4 ${item.flagged ? 'text-[#FF385C] fill-[#FF385C]' : 'text-[#717171]'}`} />
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
          <div className={`airbnb-card flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center space-x-3">
                {expandedPanels.worklist ? <ChevronDown className="w-5 h-5 text-[#717171]" /> : <ChevronRight className="w-5 h-5 text-[#717171]" />}
                <h2 className="font-bold text-base text-[#222222]">Patient Worklist</h2>
                <span className="px-2.5 py-0.5 bg-[#F7F7F7] text-[#484848] text-xs font-semibold rounded-full">{worklistPatients.length} patients</span>
              </div>
            </div>
            {expandedPanels.worklist && (
              <>
                <div className="px-5 py-2 border-t border-b border-[#EBEBEB] flex items-center space-x-1 bg-white">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'inpatient', label: 'Inpatient' },
                    { key: 'outpatient', label: 'Clinic' },
                    { key: 'critical', label: 'Critical' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setWorklistFilter(filter.key as WorklistFilter)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        worklistFilter === filter.key 
                          ? 'bg-[#222222] text-white' 
                          : 'bg-[#F7F7F7] text-[#717171] hover:bg-[#EBEBEB]'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="h-5 w-px bg-[#EBEBEB] mx-1"></div>
                  <span className="text-xs text-[#717171] font-medium">Sort:</span>
                  <select 
                    value={worklistSort} 
                    onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F7F7F7] text-[#717171] border-none outline-none cursor-pointer"
                  >
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                    <option value="location">Location</option>
                  </select>
                  <button 
                    className="p-1.5 hover:bg-[#F7F7F7] rounded-full transition-colors text-xs font-semibold text-[#717171]" 
                    onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                  >
                    {worklistSortAsc ? '\u2191' : '\u2193'}
                  </button>
                  <div className="flex-1" />
                  <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F7F7F7] text-[#484848] hover:bg-[#EBEBEB] transition-colors" onClick={() => setShowPrintDialog(true)}>
                    <Printer className="w-3.5 h-3.5" /> <span>Print List</span>
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#FAFAFA]">
                      <tr>
                        <th className="px-5 py-2.5 text-left border-b border-[#EBEBEB]">Patient</th>
                        <th className="px-3 py-2.5 text-left border-b border-[#EBEBEB]">Location</th>
                        <th className="px-3 py-2.5 text-left border-b border-[#EBEBEB]">Chief Complaint</th>
                        <th className="px-3 py-2.5 text-left border-b border-[#EBEBEB]">Vitals</th>
                        <th className="px-3 py-2.5 text-left border-b border-[#EBEBEB]">Alerts</th>
                        <th className="px-3 py-2.5 text-left border-b border-[#EBEBEB]">Status</th>
                        <th className="px-3 py-2.5 text-center w-20 border-b border-[#EBEBEB]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorklist.map((patient) => (
                        <tr 
                          key={patient.id} 
                          className={`cursor-pointer transition-colors hover:bg-[#F7F7F7] ${patient.status === 'critical' ? 'bg-[#FFF1F0] hover:bg-[#FFE4E1]' : ''}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="font-semibold text-[#222222]">{patient.name}</div>
                            <div className="text-[#717171] text-xs">{patient.mrn} &bull; {patient.age}{patient.gender}</div>
                            <div className="flex space-x-1 mt-1">
                              {patient.flags.map((flag) => {
                                const style = getFlagStyle(flag);
                                return (
                                  <span key={flag} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.color}`}>
                                    {style.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-[#222222] font-medium">{patient.room || patient.appointmentTime}</div>
                            <div className="text-[#717171] text-xs">{patient.location}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-[#222222]">{patient.chiefComplaint}</div>
                            {patient.admitDate && <div className="text-[#717171] text-xs">Admit: {patient.admitDate}</div>}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            {patient.lastVitals ? (
                              <>
                                <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-[#FF385C] font-semibold' : 'text-[#222222]'}>{patient.lastVitals.bp}</span></div>
                                <div className="text-[#717171]">HR: {patient.lastVitals.hr} SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-[#B0B0B0]">&mdash;</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-1">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-xs ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-[#C01048] font-semibold' : 'text-[#8B5E00]'}`}>
                                    &bull; {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#B0B0B0] text-xs">None</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyle(patient.status)}`}>
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 hover:bg-[#F7F7F7] rounded-full transition-colors" title="Open Chart">
                                <ExternalLink className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 hover:bg-[#F7F7F7] rounded-full transition-colors" title="Write Note">
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
        <div className="w-72 flex flex-col space-y-4 overflow-auto">
          {/* Unsigned Notes */}
          <div className="airbnb-card">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center space-x-2">
                {expandedPanels.unsigned ? <ChevronDown className="w-4 h-4 text-[#717171]" /> : <ChevronRight className="w-4 h-4 text-[#717171]" />}
                <h3 className="font-bold text-sm text-[#222222]">Unsigned Notes</h3>
                <span className="px-2 py-0.5 bg-[#FFF8ED] text-[#8B5E00] text-xs font-bold rounded-full">{unsignedNotes.length}</span>
              </div>
            </div>
            {expandedPanels.unsigned && (
              <div className="border-t border-[#EBEBEB]">
                {unsignedNotes.map((note) => (
                  <div key={note.id} className="px-4 py-3 border-b border-[#F7F7F7] hover:bg-[#FAFAFA] transition-colors flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[#222222]">{note.patientName}</div>
                      <div className="text-xs text-[#717171] mt-0.5">{note.type} &bull; {note.date}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {note.daysOld >= 2 && <span className="text-xs text-[#FF385C] font-bold">{note.daysOld}d</span>}
                      <button className="px-3 py-1 bg-[#FF385C] text-white text-xs font-semibold rounded-full hover:bg-[#E31C5F] transition-colors">Sign</button>
                    </div>
                  </div>
                ))}
                <div className="p-3">
                  <button className="w-full px-4 py-2 bg-[#F7F7F7] text-[#222222] text-sm font-semibold rounded-full hover:bg-[#EBEBEB] transition-colors">Sign All Notes</button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="airbnb-card">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center space-x-2">
                {expandedPanels.orders ? <ChevronDown className="w-4 h-4 text-[#717171]" /> : <ChevronRight className="w-4 h-4 text-[#717171]" />}
                <h3 className="font-bold text-sm text-[#222222]">Pending Orders</h3>
                <span className="px-2 py-0.5 bg-[#EFF8FF] text-[#0055B3] text-xs font-bold rounded-full">{pendingOrders.length}</span>
              </div>
            </div>
            {expandedPanels.orders && (
              <div className="border-t border-[#EBEBEB]">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-3 border-b border-[#F7F7F7] hover:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-[#222222]">{order.patientName}</div>
                        <div className="text-xs text-[#484848] mt-0.5">{order.order}</div>
                        <div className="flex space-x-1.5 mt-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F7F7F7] text-[#484848]">{order.type}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            order.status === 'draft' ? 'bg-[#F7F7F7] text-[#717171]' :
                            order.status === 'pending-approval' ? 'bg-[#FFF8ED] text-[#8B5E00]' :
                            'bg-[#EFF8FF] text-[#0055B3]'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1 bg-[#F7F7F7] text-[#222222] text-xs font-semibold rounded-full hover:bg-[#EBEBEB] transition-colors">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="airbnb-card">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <div className="flex items-center space-x-2">
                {expandedPanels.schedule ? <ChevronDown className="w-4 h-4 text-[#717171]" /> : <ChevronRight className="w-4 h-4 text-[#717171]" />}
                <h3 className="font-bold text-sm text-[#222222]">Today's Schedule</h3>
              </div>
            </div>
            {expandedPanels.schedule && (
              <div className="border-t border-[#EBEBEB] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-[#717171] flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>January 18, 2024</span>
                  </span>
                  <span className="text-xs font-bold text-[#222222]">8 appointments</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                  ].map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                      slot.status === 'current' ? 'bg-[#FF385C] text-white' :
                      slot.status === 'next' ? 'bg-[#FFF1F0] text-[#222222]' :
                      slot.status === 'done' ? 'bg-[#F7F7F7] text-[#B0B0B0]' : 'hover:bg-[#F7F7F7]'
                    } transition-colors`}>
                      <span className={`text-xs font-medium ${slot.status === 'current' ? 'text-white/80' : ''}`}>{slot.time}</span>
                      <span className={`font-semibold text-xs ${slot.status === 'current' ? 'text-white' : ''}`}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 px-4 py-2 bg-[#F7F7F7] text-[#222222] text-sm font-semibold rounded-full hover:bg-[#EBEBEB] transition-colors">View Full Schedule</button>
              </div>
            )}
          </div>

          {/* System Messages */}
          <div className="airbnb-card">
            <div className="flex items-center space-x-2 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-[#8B5E00]" />
              <h3 className="font-bold text-sm text-[#222222]">System Messages</h3>
            </div>
            <div className="border-t border-[#EBEBEB]">
              <div className="px-4 py-2.5 border-b border-[#F7F7F7] text-xs text-[#484848]">
                <span className="text-[#717171]">01/18 08:00</span> &mdash; System maintenance scheduled for 01/20 2:00 AM
              </div>
              <div className="px-4 py-2.5 border-b border-[#F7F7F7] text-xs text-[#484848]">
                <span className="text-[#717171]">01/17 14:30</span> &mdash; New formulary updates available
              </div>
              <div className="px-4 py-2.5 text-xs text-[#484848]">
                <span className="text-[#717171]">01/16 09:15</span> &mdash; Lab interface upgraded to v3.2
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="airbnb-card">
            <div className="flex items-center space-x-2 px-4 py-3">
              <Circle className="w-3 h-3 text-[#0D6832] fill-[#0D6832]" />
              <h3 className="font-bold text-sm text-[#222222]">System Status</h3>
            </div>
            <div className="border-t border-[#EBEBEB] p-4">
              <div className="space-y-2.5">
                {[
                  { label: 'Database', status: 'Connected', ok: true },
                  { label: 'HL7 Interface', status: 'Active', ok: true },
                  { label: 'Pharmacy Link', status: 'Online', ok: true },
                  { label: 'Last Sync', status: '2 min ago', ok: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-[#717171]">{item.label}</span>
                    <div className="flex items-center space-x-1.5">
                      {item.ok && <Check className="w-3 h-3 text-[#0D6832]" />}
                      <span className={`text-xs font-semibold ${item.ok ? 'text-[#0D6832]' : 'text-[#C01048]'}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-[#EBEBEB] flex items-center justify-between px-6 py-2 text-xs text-[#717171]">
        <span className="font-medium">Dr. Sarah Anderson, MD &bull; Internal Medicine &bull; Logged in 2h 34m</span>
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
