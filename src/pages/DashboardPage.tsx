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
  TrendingUp,
  Users,
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
        const order: Record<string, number> = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
        cmp = (order[a.status] ?? 5) - (order[b.status] ?? 5);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical': return 'badge badge-critical';
      case 'waiting': return 'badge badge-info';
      case 'roomed': return 'badge badge-success';
      case 'in-progress': return 'badge badge-warning';
      case 'ready-discharge': return 'badge badge-success';
      default: return 'badge badge-info';
    }
  };


  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-amber-50', color: 'text-amber-700' };
      case 'isolation': return { label: 'ISO', bg: 'bg-purple-50', color: 'text-purple-700' };
      case 'npo': return { label: 'NPO', bg: 'bg-orange-50', color: 'text-orange-700' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-red-50', color: 'text-red-700' };
      case 'code-status': return { label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700' };
      case 'vip': return { label: 'VIP', bg: 'bg-teal-50', color: 'text-teal-700' };
      default: return { label: flag, bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-auto bg-[#f7f7f7]">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
          
          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#222222] tracking-tight">Good morning, Dr. Anderson</h1>
            <div className="flex items-center space-x-2">
              <button 
                className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#dddddd] rounded-full text-sm font-medium hover:shadow-md transition-shadow"
                onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button className="relative p-2.5 bg-white border border-[#dddddd] rounded-full hover:shadow-md transition-shadow">
                <Bell className="w-4 h-4 text-[#222222]" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF385C] text-white text-[10px] font-bold flex items-center justify-center rounded-full">3</span>
              </button>
            </div>
          </div>

          {/* Critical Alerts Banner */}
          {criticalAlerts.length > 0 && (
            <div className="bg-white border border-[#FFD6D6] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#FFF1F0] rounded-full flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-[#FF385C]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#222222]">Critical Alerts ({criticalAlerts.length})</h3>
                    <p className="text-xs text-[#717171]">Requires immediate attention</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {criticalAlerts.slice(0, 2).map((alert) => (
                    <span key={alert.id} className="text-xs text-[#CC0000] bg-[#FFF1F0] px-3 py-1.5 rounded-full">
                      <strong>{alert.patient}:</strong> {alert.alert}
                    </span>
                  ))}
                  <button className="px-4 py-2 bg-[#FF385C] text-white rounded-lg text-xs font-semibold hover:bg-[#E31C5F] transition-colors">
                    Review All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stat Cards Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-[#f0fdfa] rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#008489]" />
                </div>
                <span className="text-xs font-medium text-[#008489] bg-[#f0fdfa] px-2 py-1 rounded-full">
                  {inboxCounts.all} new
                </span>
              </div>
              <div className="text-2xl font-bold text-[#222222]">{inboxItems.length}</div>
              <div className="text-xs text-[#717171] mt-1">Inbox Items</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-[#FFF8E5] rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#996600]" />
                </div>
                <span className="text-xs font-medium text-[#996600] bg-[#FFF8E5] px-2 py-1 rounded-full">
                  active
                </span>
              </div>
              <div className="text-2xl font-bold text-[#222222]">{worklistPatients.length}</div>
              <div className="text-xs text-[#717171] mt-1">Patients Today</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-[#FFF1F0] rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#FF385C]" />
                </div>
                <span className="text-xs font-medium text-[#FF385C] bg-[#FFF1F0] px-2 py-1 rounded-full">
                  pending
                </span>
              </div>
              <div className="text-2xl font-bold text-[#222222]">{unsignedNotes.length}</div>
              <div className="text-xs text-[#717171] mt-1">Unsigned Notes</div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-[#F0F9FF] rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-[#0055AA]" />
                </div>
                <span className="text-xs font-medium text-[#0055AA] bg-[#F0F9FF] px-2 py-1 rounded-full">
                  review
                </span>
              </div>
              <div className="text-2xl font-bold text-[#222222]">{pendingOrders.length}</div>
              <div className="text-xs text-[#717171] mt-1">Pending Orders</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-[#008489] text-white rounded-lg text-sm font-semibold hover:bg-[#006c70] transition-colors" onClick={() => setShowRxDialog(true)}>
              <Pill className="w-4 h-4" />
              <span>e-Prescribe</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowLabDialog(true)}>
              <FlaskConical className="w-4 h-4" />
              <span>Order Labs</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowImagingDialog(true)}>
              <Radio className="w-4 h-4" />
              <span>Order Imaging</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
              <FileText className="w-4 h-4" />
              <span>New Note</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
              <Send className="w-4 h-4" />
              <span>Referral</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-[#dddddd] rounded-lg text-sm font-medium hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowPrintDialog(true)}>
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Inbox & Worklist (spans 2 cols) */}
            <div className="col-span-2 space-y-6">
              
              {/* Inbox Panel */}
              <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() => togglePanel('inbox')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-[#f0fdfa] rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-[#008489]" />
                    </div>
                    <h2 className="text-lg font-bold text-[#222222]">Inbox</h2>
                    {inboxCounts.all > 0 && (
                      <span className="px-2.5 py-0.5 bg-[#FF385C] text-white text-xs font-bold rounded-full">
                        {inboxCounts.all}
                      </span>
                    )}
                  </div>
                  {expandedPanels.inbox ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
                </div>

                {expandedPanels.inbox && (
                  <>
                    {/* Inbox Tabs */}
                    <div className="px-6 border-b border-[#ebebeb]">
                      <div className="flex items-center space-x-1">
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
                            onClick={(e) => { e.stopPropagation(); setInboxTab(tab.key as InboxTab); }}
                            className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                              inboxTab === tab.key 
                                ? 'border-[#222222] text-[#222222]' 
                                : 'border-transparent text-[#717171] hover:text-[#222222]'
                            }`}
                          >
                            {tab.label}
                            {tab.count > 0 && (
                              <span className="ml-1.5 text-xs bg-[#f7f7f7] text-[#717171] px-1.5 py-0.5 rounded-full">{tab.count}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inbox Filters */}
                    <div className="px-6 py-3 flex items-center justify-between border-b border-[#f7f7f7]">
                      <div className="flex items-center space-x-2">
                        <select 
                          value={inboxPriority} 
                          onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                          className="text-sm border border-[#dddddd] rounded-lg px-3 py-1.5 bg-white text-[#222222] focus:outline-none focus:border-[#222222]"
                        >
                          <option value="all">All Priority</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="normal">Normal</option>
                        </select>
                        <select 
                          value={inboxReadFilter} 
                          onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                          className="text-sm border border-[#dddddd] rounded-lg px-3 py-1.5 bg-white text-[#222222] focus:outline-none focus:border-[#222222]"
                        >
                          <option value="all">All</option>
                          <option value="unread">Unread</option>
                          <option value="read">Read</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          className="text-sm text-[#008489] font-semibold hover:underline"
                          onClick={markAllAsRead}
                        >
                          Mark All Read
                        </button>
                        <button className="p-1.5 hover:bg-[#f7f7f7] rounded-full transition-colors">
                          <RefreshCw className="w-4 h-4 text-[#717171]" />
                        </button>
                      </div>
                    </div>

                    {/* Inbox Items */}
                    <div className="max-h-[360px] overflow-auto">
                      {filteredInbox.map((item) => (
                        <div 
                          key={item.id}
                          className={`px-6 py-3 flex items-center space-x-4 border-b border-[#f7f7f7] hover:bg-[#fafafa] cursor-pointer transition-colors ${
                            !item.read ? 'bg-[#f0fdfa]' : ''
                          }`}
                        >
                          {/* Priority indicator */}
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            item.priority === 'critical' ? 'bg-[#FF385C]' :
                            item.priority === 'high' ? 'bg-[#FF8C00]' :
                            item.priority === 'normal' ? 'bg-[#008489]' : 'bg-[#dddddd]'
                          }`} />
                          
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            item.priority === 'critical' ? 'bg-[#FFF1F0] text-[#FF385C]' : 'bg-[#f7f7f7] text-[#717171]'
                          }`}>
                            {getInboxIcon(item.type)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`text-sm ${!item.read ? 'font-bold text-[#222222]' : 'font-medium text-[#222222]'}`}>
                                {item.patientName}
                              </span>
                              <span className="text-xs text-[#717171]">{item.patientMrn}</span>
                              {item.flagged && <Flag className="w-3.5 h-3.5 text-[#FF385C]" />}
                            </div>
                            <div className={`text-sm ${item.priority === 'critical' ? 'text-[#FF385C] font-medium' : 'text-[#484848]'}`}>
                              {item.title}
                            </div>
                            <div className="text-xs text-[#717171] truncate">{item.detail}</div>
                          </div>

                          {/* Time & Actions */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="text-xs text-[#717171]">{item.timestamp}</span>
                            <button 
                              className="p-1.5 hover:bg-[#f7f7f7] rounded-full transition-colors"
                              onClick={(e) => { e.stopPropagation(); markAsRead(item.id); navigate(`/patients/1`); }} 
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-[#717171]" />
                            </button>
                            <button 
                              className="p-1.5 hover:bg-[#f7f7f7] rounded-full transition-colors"
                              onClick={(e) => { e.stopPropagation(); markAsRead(item.id); }} 
                              title="Mark Read"
                            >
                              <CheckCircle2 className="w-4 h-4 text-[#717171]" />
                            </button>
                            <button 
                              className="p-1.5 hover:bg-[#f7f7f7] rounded-full transition-colors"
                              onClick={(e) => { e.stopPropagation(); toggleFlag(item.id); }} 
                              title="Flag"
                            >
                              <Flag className={`w-4 h-4 ${item.flagged ? 'text-[#FF385C]' : 'text-[#717171]'}`} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Patient Worklist */}
              <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() => togglePanel('worklist')}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-[#FFF8E5] rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#996600]" />
                    </div>
                    <h2 className="text-lg font-bold text-[#222222]">Patient Worklist</h2>
                    <span className="text-xs text-[#717171] bg-[#f7f7f7] px-2.5 py-1 rounded-full">
                      {worklistPatients.length} patients
                    </span>
                  </div>
                  {expandedPanels.worklist ? <ChevronUp className="w-5 h-5 text-[#717171]" /> : <ChevronDown className="w-5 h-5 text-[#717171]" />}
                </div>

                {expandedPanels.worklist && (
                  <>
                    {/* Worklist Filters */}
                    <div className="px-6 py-3 border-b border-[#ebebeb] flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        {[
                          { key: 'all', label: 'All' },
                          { key: 'inpatient', label: 'Inpatient' },
                          { key: 'outpatient', label: 'Clinic' },
                          { key: 'critical', label: 'Critical' },
                        ].map((filter) => (
                          <button
                            key={filter.key}
                            onClick={() => setWorklistFilter(filter.key as WorklistFilter)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              worklistFilter === filter.key 
                                ? 'bg-[#222222] text-white' 
                                : 'bg-[#f7f7f7] text-[#222222] hover:bg-[#ebebeb]'
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <select 
                          value={worklistSort} 
                          onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                          className="text-sm border border-[#dddddd] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#222222]"
                        >
                          <option value="status">Sort: Status</option>
                          <option value="name">Sort: Name</option>
                          <option value="location">Sort: Location</option>
                        </select>
                        <button 
                          className="p-1.5 hover:bg-[#f7f7f7] rounded-full transition-colors" 
                          onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                        >
                          {worklistSortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button 
                          className="flex items-center space-x-1.5 px-3 py-1.5 border border-[#dddddd] rounded-lg text-sm hover:bg-[#f7f7f7] transition-colors" 
                          onClick={() => setShowPrintDialog(true)}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      </div>
                    </div>

                    {/* Worklist Table */}
                    <div className="overflow-auto max-h-[400px]">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-[#fafafa]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#717171] uppercase tracking-wider">Patient</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#717171] uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#717171] uppercase tracking-wider">Chief Complaint</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#717171] uppercase tracking-wider">Vitals</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#717171] uppercase tracking-wider">Alerts</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#717171] uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#717171] uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWorklist.map((patient) => (
                            <tr 
                              key={patient.id} 
                              className={`border-b border-[#f7f7f7] hover:bg-[#fafafa] cursor-pointer transition-colors ${
                                patient.status === 'critical' ? 'bg-[#FFF1F0]' : ''
                              }`}
                              onClick={() => navigate(`/patients/${patient.id}`)}
                            >
                              <td className="px-6 py-3">
                                <div className="font-semibold text-sm text-[#222222]">{patient.name}</div>
                                <div className="text-xs text-[#717171]">{patient.mrn} · {patient.age}{patient.gender}</div>
                                {patient.flags.length > 0 && (
                                  <div className="flex space-x-1 mt-1">
                                    {patient.flags.map((flag) => {
                                      const style = getFlagStyle(flag);
                                      return (
                                        <span key={flag} className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.color}`}>
                                          {style.label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-[#222222]">{patient.room || patient.appointmentTime}</div>
                                <div className="text-xs text-[#717171]">{patient.location}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-[#222222]">{patient.chiefComplaint}</div>
                                {patient.admitDate && <div className="text-xs text-[#717171]">Admit: {patient.admitDate}</div>}
                              </td>
                              <td className="px-4 py-3 text-xs text-[#484848]">
                                {patient.lastVitals ? (
                                  <>
                                    <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-[#FF385C] font-semibold' : ''}>{patient.lastVitals.bp}</span></div>
                                    <div>HR: {patient.lastVitals.hr} · SpO2: {patient.lastVitals.spo2}%</div>
                                  </>
                                ) : (
                                  <span className="text-[#b0b0b0]">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {patient.alerts.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {patient.alerts.slice(0, 2).map((alert, i) => (
                                      <div key={i} className={`text-xs ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-[#FF385C] font-semibold' : 'text-amber-600'}`}>
                                        {alert}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#b0b0b0]">None</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={getStatusBadge(patient.status)}>
                                  {patient.status.replace('-', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center space-x-1">
                                  <button onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-[#f7f7f7] rounded-full transition-colors" title="Open Chart">
                                    <ExternalLink className="w-4 h-4 text-[#717171]" />
                                  </button>
                                  <button onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-[#f7f7f7] rounded-full transition-colors" title="Write Note">
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

            {/* Right Column - Sidebar */}
            <div className="space-y-6">

              {/* Unsigned Notes */}
              <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() => togglePanel('unsigned')}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-[#FFF1F0] rounded-lg flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-[#FF385C]" />
                    </div>
                    <h3 className="font-bold text-sm text-[#222222]">Unsigned Notes</h3>
                    <span className="text-xs font-bold text-[#FF385C]">{unsignedNotes.length}</span>
                  </div>
                  {expandedPanels.unsigned ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
                </div>
                {expandedPanels.unsigned && (
                  <div>
                    {unsignedNotes.map((note) => (
                      <div key={note.id} className="px-5 py-3 border-t border-[#f7f7f7] hover:bg-[#fafafa] transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-[#222222]">{note.patientName}</div>
                            <div className="text-xs text-[#717171]">{note.type} · {note.date}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {note.daysOld >= 2 && (
                              <span className="text-xs font-bold text-[#FF385C] bg-[#FFF1F0] px-2 py-0.5 rounded-full">{note.daysOld}d</span>
                            )}
                            <button className="px-3 py-1.5 bg-[#008489] text-white text-xs font-semibold rounded-lg hover:bg-[#006c70] transition-colors">
                              Sign
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="px-5 py-3 border-t border-[#ebebeb]">
                      <button className="w-full py-2 text-sm font-semibold text-[#008489] border border-[#008489] rounded-lg hover:bg-[#f0fdfa] transition-colors">
                        Sign All Notes
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pending Orders */}
              <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() => togglePanel('orders')}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-[#F0F9FF] rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5 text-[#0055AA]" />
                    </div>
                    <h3 className="font-bold text-sm text-[#222222]">Pending Orders</h3>
                    <span className="text-xs font-bold text-[#0055AA]">{pendingOrders.length}</span>
                  </div>
                  {expandedPanels.orders ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
                </div>
                {expandedPanels.orders && (
                  <div>
                    {pendingOrders.map((order) => (
                      <div key={order.id} className="px-5 py-3 border-t border-[#f7f7f7] hover:bg-[#fafafa] transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium text-sm text-[#222222]">{order.patientName}</div>
                            <div className="text-xs text-[#717171] mt-0.5">{order.order}</div>
                            <div className="flex items-center space-x-1.5 mt-1.5">
                              <span className="text-[10px] font-medium px-2 py-0.5 bg-[#f7f7f7] text-[#717171] rounded-full">{order.type}</span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                order.status === 'draft' ? 'bg-[#f7f7f7] text-[#717171]' :
                                order.status === 'pending-approval' ? 'bg-[#FFF8E5] text-[#996600]' :
                                'bg-[#F0F9FF] text-[#0055AA]'
                              }`}>{order.status}</span>
                            </div>
                          </div>
                          <button className="px-3 py-1.5 text-xs font-medium border border-[#dddddd] rounded-lg hover:bg-[#f7f7f7] transition-colors">
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's Schedule */}
              <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
                  onClick={() => togglePanel('schedule')}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-[#f0fdfa] rounded-lg flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-[#008489]" />
                    </div>
                    <h3 className="font-bold text-sm text-[#222222]">Today&apos;s Schedule</h3>
                  </div>
                  {expandedPanels.schedule ? <ChevronUp className="w-4 h-4 text-[#717171]" /> : <ChevronDown className="w-4 h-4 text-[#717171]" />}
                </div>
                {expandedPanels.schedule && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-between mb-3 text-xs text-[#717171]">
                      <span>January 18, 2024</span>
                      <span className="font-semibold text-[#222222]">8 appointments</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                        { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                        { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                        { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                        { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                      ].map((slot, i) => (
                        <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg text-sm ${
                          slot.status === 'current' ? 'bg-[#f0fdfa] border border-[#008489]' :
                          slot.status === 'next' ? 'bg-[#f7f7f7]' :
                          slot.status === 'done' ? 'text-[#b0b0b0]' : ''
                        }`}>
                          <span className="text-xs font-medium">{slot.time}</span>
                          <span className={`text-sm ${slot.status === 'current' ? 'font-bold text-[#008489]' : ''}`}>{slot.patient}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-3 py-2.5 text-sm font-semibold text-[#008489] border border-[#008489] rounded-lg hover:bg-[#f0fdfa] transition-colors">
                      View Full Schedule
                    </button>
                  </div>
                )}
              </div>

              {/* System Messages */}
              <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
                <div className="flex items-center space-x-2 px-5 py-4">
                  <div className="w-7 h-7 bg-[#f7f7f7] rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#717171]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#222222]">System Messages</h3>
                </div>
                <div className="px-5 pb-4 space-y-2">
                  <div className="text-xs text-[#484848] py-2 border-t border-[#f7f7f7]">
                    <span className="text-[#717171]">01/18 08:00</span> — System maintenance scheduled for 01/20 2:00 AM
                  </div>
                  <div className="text-xs text-[#484848] py-2 border-t border-[#f7f7f7]">
                    <span className="text-[#717171]">01/17 14:30</span> — New formulary updates available
                  </div>
                  <div className="text-xs text-[#484848] py-2 border-t border-[#f7f7f7]">
                    <span className="text-[#717171]">01/16 09:15</span> — Lab interface upgraded to v3.2
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-2xl border border-[#ebebeb] shadow-sm overflow-hidden">
                <div className="flex items-center space-x-2 px-5 py-4">
                  <div className="w-7 h-7 bg-[#F0FFF4] rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-[#006644]" />
                  </div>
                  <h3 className="font-bold text-sm text-[#222222]">System Status</h3>
                </div>
                <div className="px-5 pb-4">
                  <div className="space-y-2">
                    {[
                      { name: 'Database', status: 'Connected' },
                      { name: 'HL7 Interface', status: 'Active' },
                      { name: 'Pharmacy Link', status: 'Online' },
                      { name: 'Last Sync', status: '2 min ago' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-[#717171]">{item.name}</span>
                        <div className="flex items-center space-x-1.5">
                          {item.name !== 'Last Sync' && <span className="w-2 h-2 bg-[#008489] rounded-full" />}
                          <span className="text-xs font-medium text-[#222222]">{item.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
