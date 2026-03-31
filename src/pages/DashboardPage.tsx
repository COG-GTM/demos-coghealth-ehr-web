import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';
import { PrescriptionDialog } from '../components/ui/PrescriptionDialog';
import { OrderDialog } from '../components/ui/OrderDialog';
import { patientService } from '../services/patientService';
import type { Patient } from '../types';
import { 
  FileText, Pill, FlaskConical, MessageSquare, CheckCircle2, Bell,
  Stethoscope, Send, RefreshCw, Flag, Eye, Edit3, Printer, ShieldAlert,
  Radio, ClipboardList, ChevronLeft, ChevronRight, Heart, AlertTriangle,
  Activity, Filter, X, CheckCircle, Circle, Loader2, Inbox, ArrowRight,
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
  lastVitals?: { bp: string; hr: number; temp: number; spo2: number; rr: number };
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

const patientAvatarColors = [
  'from-rose-400 to-pink-500', 'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500', 'from-cyan-400 to-sky-500',
  'from-fuchsia-400 to-pink-500', 'from-lime-400 to-green-500',
];

function PatientCard({ patient, index, onClick }: { patient: WorklistPatient; index: number; onClick: () => void }) {
  const initials = patient.name.split(',').map(n => n.trim()[0]).reverse().join('');
  const colorClass = patientAvatarColors[index % patientAvatarColors.length];
  return (
    <div className="airbnb-card group cursor-pointer flex-shrink-0 w-[220px]" onClick={onClick} data-testid={`patient-card-${patient.id}`}>
      <div className={`relative h-[140px] rounded-t-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center overflow-hidden`}>
        <span className="text-white text-4xl font-bold opacity-90">{initials}</span>
        {patient.status === 'critical' && (
          <div className="absolute top-3 left-3 airbnb-badge-critical"><AlertTriangle className="w-3 h-3 mr-1" />Critical</div>
        )}
        {patient.status !== 'critical' && (
          <div className="absolute top-3 left-3 airbnb-badge">
            {patient.status === 'in-progress' ? 'In Progress' : patient.status === 'ready-discharge' ? 'Ready' : patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
          </div>
        )}
        <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors" onClick={(e) => { e.stopPropagation(); }}>
          <Heart className="w-4 h-4 text-white" />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[15px] text-gray-900 truncate mb-1">{patient.name}</h3>
        <p className="text-sm text-gray-500 mb-1">{patient.mrn} · {patient.age}{patient.gender}</p>
        <p className="text-sm text-gray-600">{patient.chiefComplaint}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-500">{patient.room || patient.appointmentTime}</span>
          <span className="text-sm text-gray-500">{patient.location}</span>
        </div>
        {patient.flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {patient.flags.map((flag) => (<span key={flag} className="airbnb-flag">{flag.replace('-', ' ')}</span>))}
          </div>
        )}
      </div>
    </div>
  );
}

function HorizontalScroll({ children, label, count, onViewAll }: { children: React.ReactNode; label: string; count?: number; onViewAll?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }
  };
  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) { el.addEventListener('scroll', checkScroll); return () => el.removeEventListener('scroll', checkScroll); }
  }, [children]);
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) { scrollRef.current.scrollBy({ left: direction === 'left' ? -240 : 240, behavior: 'smooth' }); }
  };
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-bold text-gray-900">{label}</h2>
          {count !== undefined && <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">{count}</span>}
          {onViewAll && <button onClick={onViewAll} className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:underline">View all <ArrowRight className="w-4 h-4" /></button>}
        </div>
        <div className="flex items-center gap-2">
          {canScrollLeft && <button onClick={() => scroll('left')} className="airbnb-scroll-btn" aria-label="Scroll left"><ChevronLeft className="w-4 h-4" /></button>}
          {canScrollRight && <button onClick={() => scroll('right')} className="airbnb-scroll-btn" aria-label="Scroll right"><ChevronRight className="w-4 h-4" /></button>}
        </div>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>{children}</div>
    </div>
  );
}

function InboxCard({ item, onMarkRead, onToggleFlag, onView }: { item: InboxItem; onMarkRead: () => void; onToggleFlag: () => void; onView: () => void }) {
  const typeConfig: Record<string, { icon: typeof FlaskConical; color: string; bg: string }> = {
    lab: { icon: FlaskConical, color: 'text-violet-600', bg: 'bg-violet-50' },
    imaging: { icon: Radio, color: 'text-blue-600', bg: 'bg-blue-50' },
    message: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    refill: { icon: Pill, color: 'text-orange-600', bg: 'bg-orange-50' },
    order: { icon: ClipboardList, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    cosign: { icon: Edit3, color: 'text-pink-600', bg: 'bg-pink-50' },
    consult: { icon: Stethoscope, color: 'text-teal-600', bg: 'bg-teal-50' },
  };
  const config = typeConfig[item.type] || typeConfig.lab;
  const Icon = config.icon;
  return (
    <div className={`airbnb-inbox-card ${!item.read ? 'ring-1 ring-gray-200 bg-white' : 'bg-gray-50/50'} ${item.priority === 'critical' ? 'ring-2 ring-rose-200 bg-rose-50/30' : ''}`} data-testid={`inbox-item-${item.id}`}>
      <div className="flex items-start gap-3 p-4">
        <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-5 h-5 ${config.color}`} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {!item.read && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />}
            <span className={`text-sm truncate ${!item.read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{item.title}</span>
            {item.priority === 'critical' && <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full flex-shrink-0">URGENT</span>}
          </div>
          <p className="text-sm text-gray-900 font-medium truncate">{item.patientName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{item.patientMrn} · {item.timestamp}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onView(); }} className="airbnb-icon-btn" title="View"><Eye className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onMarkRead(); }} className="airbnb-icon-btn" title="Mark Read"><CheckCircle2 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onToggleFlag(); }} className={`airbnb-icon-btn ${item.flagged ? 'text-rose-500' : ''}`} title="Flag"><Flag className={`w-4 h-4 ${item.flagged ? 'fill-rose-500' : ''}`} /></button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [inboxTab, setInboxTab] = useState<InboxTab>('all');
  const [inboxPriority, setInboxPriority] = useState<InboxPriority>('all');
  const [inboxReadFilter, setInboxReadFilter] = useState<InboxReadFilter>('all');
  const [worklistFilter, setWorklistFilter] = useState<WorklistFilter>('all');
  const [worklistSort, setWorklistSort] = useState<WorklistSort>('status');
  const [worklistSortAsc, setWorklistSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

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
      if (worklistFilter === 'inpatient') return patient.location.includes('Med-Surg') || patient.location === 'CCU';
      if (worklistFilter === 'outpatient') return patient.location.includes('Clinic');
      if (worklistFilter === 'critical') return patient.status === 'critical';
      return true;
    });
    patients.sort((a, b) => {
      let cmp = 0;
      if (worklistSort === 'name') cmp = a.name.localeCompare(b.name);
      else if (worklistSort === 'location') cmp = (a.room || a.appointmentTime || '').localeCompare(b.room || b.appointmentTime || '');
      else if (worklistSort === 'status') {
        const order = { critical: 0, 'in-progress': 1, roomed: 2, waiting: 3, 'ready-discharge': 4 };
        cmp = (order[a.status] ?? 5) - (order[b.status] ?? 5);
      }
      return worklistSortAsc ? cmp : -cmp;
    });
    return patients;
  }, [worklistPatients, worklistFilter, worklistSort, worklistSortAsc]);

  const scheduleSlots = [
    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' as const },
    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' as const },
    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' as const },
    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' as const },
    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' as const },
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200" />
            <Loader2 className="w-12 h-12 text-rose-500 absolute inset-0 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto" data-testid="dashboard-page">
      {/* Quick Actions Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowRxDialog(true)} className="airbnb-action-pill">
                <Pill className="w-4 h-4" /><span>e-Prescribe</span>
              </button>
              <button onClick={() => setShowLabDialog(true)} className="airbnb-action-pill">
                <FlaskConical className="w-4 h-4" /><span>Order Labs</span>
              </button>
              <button onClick={() => setShowImagingDialog(true)} className="airbnb-action-pill">
                <Radio className="w-4 h-4" /><span>Order Imaging</span>
              </button>
              <button onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })} className="airbnb-action-pill">
                <FileText className="w-4 h-4" /><span>New Note</span>
              </button>
              <button onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })} className="airbnb-action-pill">
                <Send className="w-4 h-4" /><span>Referral</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowFilters(!showFilters)} className="airbnb-filter-btn">
                <Filter className="w-4 h-4" />Filters
              </button>
              <button onClick={() => setShowPrintDialog(true)} className="airbnb-icon-btn-lg"><Printer className="w-5 h-5" /></button>
              <button className="airbnb-icon-btn-lg" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}><RefreshCw className="w-5 h-5" /></button>
              <button className="airbnb-icon-btn-lg relative">
                <Bell className="w-5 h-5" />
                {criticalAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">{criticalAlerts.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-gray-100 bg-gray-50/50">
            <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Worklist</span>
                {(['all', 'inpatient', 'outpatient', 'critical'] as WorklistFilter[]).map((filter) => (
                  <button key={filter} onClick={() => setWorklistFilter(filter)} className={`airbnb-chip ${worklistFilter === filter ? 'airbnb-chip-active' : ''}`}>
                    {filter === 'all' ? 'All' : filter === 'outpatient' ? 'Clinic' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <div className="w-px h-6 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sort</span>
                <select value={worklistSort} onChange={(e) => setWorklistSort(e.target.value as WorklistSort)} className="airbnb-select">
                  <option value="status">Status</option>
                  <option value="name">Name</option>
                  <option value="location">Location</option>
                </select>
                <button className="airbnb-chip" onClick={() => setWorklistSortAsc(!worklistSortAsc)}>
                  {worklistSortAsc ? '↑ Asc' : '↓ Desc'}
                </button>
              </div>
              <div className="w-px h-6 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</span>
                <select value={inboxPriority} onChange={(e) => setInboxPriority(e.target.value as InboxPriority)} className="airbnb-select">
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                </select>
              </div>
              <button onClick={() => setShowFilters(false)} className="ml-auto airbnb-icon-btn"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {/* Critical Alerts Banner */}
          {criticalAlerts.length > 0 && (
            <div className="mb-8 airbnb-alert-banner" data-testid="critical-alerts">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-rose-600" /></div>
                <h3 className="font-bold text-rose-900">Critical Alerts ({criticalAlerts.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {criticalAlerts.map((alert) => (
                  <div key={alert.id} className="bg-white/60 rounded-xl p-3 backdrop-blur-sm">
                    <p className="font-semibold text-sm text-rose-900">{alert.patient}</p>
                    <p className="text-sm text-rose-700">{alert.alert}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-rose-500">{alert.time}</span>
                      <button className="text-xs font-semibold text-rose-700 hover:text-rose-900">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient Worklist Carousel */}
          <HorizontalScroll label="Patient Worklist" count={filteredWorklist.length}>
            {filteredWorklist.map((patient, idx) => (
              <PatientCard key={patient.id} patient={patient} index={idx} onClick={() => navigate(`/patients/${patient.id}`)} />
            ))}
          </HorizontalScroll>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Inbox */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[22px] font-bold text-gray-900">Inbox</h2>
                  {inboxCounts.all > 0 && <span className="text-sm text-white bg-rose-500 px-2.5 py-0.5 rounded-full font-medium">{inboxCounts.all} unread</span>}
                </div>
                <button onClick={markAllAsRead} className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Mark all read</button>
              </div>

              <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide" data-testid="inbox-tabs">
                {([
                  { key: 'all' as InboxTab, label: 'All', count: inboxCounts.all },
                  { key: 'results' as InboxTab, label: 'Results', count: inboxCounts.results },
                  { key: 'messages' as InboxTab, label: 'Messages', count: inboxCounts.messages },
                  { key: 'rxRefills' as InboxTab, label: 'Rx Refills', count: inboxCounts.rxRefills },
                  { key: 'orders' as InboxTab, label: 'Orders', count: inboxCounts.orders },
                  { key: 'cosign' as InboxTab, label: 'Co-sign', count: inboxCounts.cosign },
                ]).map((tab) => (
                  <button key={tab.key} onClick={() => setInboxTab(tab.key)} className={`airbnb-tab ${inboxTab === tab.key ? 'airbnb-tab-active' : ''}`} data-testid={`inbox-tab-${tab.key}`}>
                    {tab.label}
                    {tab.count > 0 && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${inboxTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}>{tab.count}</span>}
                  </button>
                ))}
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <select value={inboxReadFilter} onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)} className="airbnb-select text-sm" data-testid="inbox-read-filter">
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>

              <div className="space-y-2" data-testid="inbox-list">
                {filteredInbox.map((item) => (
                  <InboxCard key={item.id} item={item} onMarkRead={() => markAsRead(item.id)} onToggleFlag={() => toggleFlag(item.id)} onView={() => { markAsRead(item.id); navigate('/patients/1'); }} />
                ))}
                {filteredInbox.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No items match your filters</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Unsigned Notes */}
              <div className="airbnb-sidebar-card" data-testid="unsigned-notes">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Unsigned Notes</h3>
                  <span className="airbnb-count-badge">{unsignedNotes.length}</span>
                </div>
                <div className="space-y-3">
                  {unsignedNotes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 text-amber-600" /></div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{note.patientName}</p>
                          <p className="text-xs text-gray-500">{note.type} &middot; {note.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {note.daysOld >= 2 && <span className="text-xs font-bold text-rose-500">{note.daysOld}d</span>}
                        <button className="airbnb-btn-sm">Sign</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Sign All Notes</button>
              </div>

              {/* Pending Orders */}
              <div className="airbnb-sidebar-card" data-testid="pending-orders">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Pending Orders</h3>
                  <span className="airbnb-count-badge">{pendingOrders.length}</span>
                </div>
                <div className="space-y-3">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${order.type === 'Lab' ? 'bg-violet-50' : order.type === 'Imaging' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                          {order.type === 'Lab' ? <FlaskConical className="w-4 h-4 text-violet-600" /> : order.type === 'Imaging' ? <Radio className="w-4 h-4 text-blue-600" /> : <Pill className="w-4 h-4 text-orange-600" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{order.patientName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{order.order}</span>
                            <span className={`airbnb-status-dot ${order.status === 'draft' ? 'bg-gray-400' : order.status === 'pending-approval' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                            <span className="text-xs text-gray-400">{order.status.replace('-', ' ')}</span>
                          </div>
                        </div>
                      </div>
                      <button className="airbnb-btn-sm">Review</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today's Schedule */}
              <div className="airbnb-sidebar-card" data-testid="todays-schedule">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Today&apos;s Schedule</h3>
                  <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="space-y-2">
                  {scheduleSlots.map((slot, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${slot.status === 'current' ? 'bg-rose-50 ring-1 ring-rose-200' : slot.status === 'next' ? 'bg-gray-50' : slot.status === 'done' ? 'opacity-50' : ''}`}>
                      <div className="flex-shrink-0">
                        {slot.status === 'done' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : slot.status === 'current' ? (
                          <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center"><Activity className="w-3 h-3 text-white" /></div>
                        ) : <Circle className="w-5 h-5 text-gray-300" />}
                      </div>
                      <span className="text-sm font-medium text-gray-500 w-16">{slot.time}</span>
                      <span className={`text-sm flex-1 ${slot.status === 'current' ? 'font-bold text-gray-900' : slot.status === 'done' ? 'text-gray-400' : 'text-gray-700'}`}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/schedule')} className="w-full mt-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">View Full Schedule</button>
              </div>

              {/* System Status */}
              <div className="airbnb-sidebar-card" data-testid="system-status">
                <h3 className="font-bold text-lg text-gray-900 mb-4">System Status</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Database', status: 'Connected', ok: true },
                    { label: 'HL7 Interface', status: 'Active', ok: true },
                    { label: 'Pharmacy Link', status: 'Online', ok: true },
                    { label: 'Last Sync', status: '2 min ago', ok: true },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className={`text-sm font-medium ${item.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <PrintDialog isOpen={showPrintDialog} onClose={() => setShowPrintDialog(false)} onPrint={(options) => { console.log('Print options:', options); setShowPrintDialog(false); setShowAlert({ title: 'Print Sent', message: `Document sent to printer (${options.action}).`, type: 'success' }); }} title="Print Dashboard" documentName="Dashboard Summary" />
      <PrescriptionDialog isOpen={showRxDialog} onClose={() => setShowRxDialog(false)} onSubmit={(rx) => { console.log('New Rx:', rx); setShowRxDialog(false); setShowAlert({ title: 'Prescription Sent', message: `${rx.medication} ${rx.strength} sent to ${rx.pharmacy}.`, type: 'success' }); }} />
      <OrderDialog isOpen={showLabDialog} onClose={() => setShowLabDialog(false)} type="lab" onSubmit={(orders) => { console.log('Lab order:', orders); setShowLabDialog(false); setShowAlert({ title: 'Lab Order Placed', message: `${orders.length} test(s) ordered.`, type: 'success' }); }} />
      <OrderDialog isOpen={showImagingDialog} onClose={() => setShowImagingDialog(false)} type="imaging" onSubmit={(orders) => { console.log('Imaging order:', orders); setShowImagingDialog(false); setShowAlert({ title: 'Imaging Order Placed', message: `${orders.length} study(ies) ordered.`, type: 'success' }); }} />
      {showAlert && <AlertDialog isOpen={true} onClose={() => setShowAlert(null)} title={showAlert.title} message={showAlert.message} type={showAlert.type} />}
    </div>
  );
}
