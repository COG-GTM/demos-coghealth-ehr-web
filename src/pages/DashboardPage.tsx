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
  ClipboardList
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
      case 'critical': return 'bg-red-50 text-red-700';
      case 'waiting': return 'bg-amber-50 text-amber-700';
      case 'roomed': return 'bg-blue-50 text-blue-700';
      case 'in-progress': return 'bg-indigo-50 text-indigo-700';
      case 'ready-discharge': return 'bg-emerald-50 text-emerald-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-amber-50', color: 'text-amber-700' };
      case 'isolation': return { label: 'ISO', bg: 'bg-purple-50', color: 'text-purple-700' };
      case 'npo': return { label: 'NPO', bg: 'bg-orange-50', color: 'text-orange-700' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-red-50', color: 'text-red-700' };
      case 'code-status': return { label: 'DNR', bg: 'bg-gray-100', color: 'text-gray-700' };
      case 'vip': return { label: 'VIP', bg: 'bg-indigo-50', color: 'text-indigo-700' };
      default: return { label: flag, bg: 'bg-gray-100', color: 'text-gray-600' };
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-gray-50">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />

      {/* Page header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Welcome back, Dr. Anderson</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setShowPrintDialog(true)}
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button className="relative p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-medium flex items-center justify-center rounded-full">3</span>
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors" onClick={() => setShowRxDialog(true)}>
            <Pill className="w-3.5 h-3.5" /> e-Prescribe
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowLabDialog(true)}>
            <FlaskConical className="w-3.5 h-3.5" /> Order Labs
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowImagingDialog(true)}>
            <Radio className="w-3.5 h-3.5" /> Order Imaging
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
            <FileText className="w-3.5 h-3.5" /> New Note
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
            <Send className="w-3.5 h-3.5" /> Referral
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <span className="font-semibold text-sm text-red-800">Critical Alerts ({criticalAlerts.length})</span>
                <div className="flex items-center gap-4 mt-0.5">
                  {criticalAlerts.slice(0, 2).map((alert) => (
                    <span key={alert.id} className="text-xs text-red-700">
                      <strong>{alert.patient}:</strong> {alert.alert}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Review All</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-5">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col gap-5 overflow-hidden min-w-0">
          {/* Inbox Panel */}
          <div className={`bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Inbox</span>
                {inboxCounts.all > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-full">{inboxCounts.all} unread</span>
                )}
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedPanels.inbox ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {expandedPanels.inbox && (
              <>
                <div className="flex items-center gap-1 px-4 pb-2 border-b border-gray-100 flex-wrap">
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
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${inboxTab === tab.key ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                      {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <select 
                    value={inboxPriority} 
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select 
                    value={inboxReadFilter} 
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1" onClick={markAllAsRead}>Mark All Read</button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left w-8"></th>
                        <th className="px-2 py-2 text-left w-8">Type</th>
                        <th className="px-2 py-2 text-left">Patient</th>
                        <th className="px-2 py-2 text-left">Subject</th>
                        <th className="px-2 py-2 text-left w-20">Time</th>
                        <th className="px-2 py-2 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInbox.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`cursor-pointer transition-colors hover:bg-gray-50 ${item.priority === 'critical' ? 'bg-red-50/50' : ''} ${!item.read ? 'font-medium' : 'text-gray-500'}`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              {!item.read && <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />}
                              {item.flagged && <Flag className="w-3.5 h-3.5 text-amber-500" />}
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-gray-400">{getInboxIcon(item.type)}</td>
                          <td className="px-2 py-2.5">
                            <span className="text-gray-900">{item.patientName}</span>
                            <span className="text-gray-400 ml-1.5 text-xs">{item.patientMrn}</span>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className={`text-sm ${item.priority === 'critical' ? 'text-red-700 font-medium' : 'text-gray-900'}`}>{item.title}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[300px]">{item.detail}</div>
                          </td>
                          <td className="px-2 py-2.5 text-xs text-gray-400">{item.timestamp}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <button className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => { markAsRead(item.id); navigate(`/patients/1`); }} title="View"><Eye className="w-3.5 h-3.5" /></button>
                              <button className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => markAsRead(item.id)} title="Mark Read"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                              <button className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => toggleFlag(item.id)} title="Flag"><Flag className={`w-3.5 h-3.5 ${item.flagged ? 'text-amber-500' : ''}`} /></button>
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
          <div className={`bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Patient Worklist</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{worklistPatients.length} patients</span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedPanels.worklist ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {expandedPanels.worklist && (
              <>
                <div className="flex items-center gap-1 px-4 pb-2 border-b border-gray-100 flex-wrap">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'inpatient', label: 'Inpatient' },
                    { key: 'outpatient', label: 'Clinic' },
                    { key: 'critical', label: 'Critical' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setWorklistFilter(filter.key as WorklistFilter)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${worklistFilter === filter.key ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <span className="text-xs text-gray-400">Sort:</span>
                  <select 
                    value={worklistSort} 
                    onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                    <option value="location">Location</option>
                  </select>
                  <button 
                    className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors" 
                    onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                  >
                    {worklistSortAsc ? '↑' : '↓'}
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Patient</th>
                        <th className="px-2 py-2 text-left">Location</th>
                        <th className="px-2 py-2 text-left">Chief Complaint</th>
                        <th className="px-2 py-2 text-left">Vitals</th>
                        <th className="px-2 py-2 text-left">Alerts</th>
                        <th className="px-2 py-2 text-left">Status</th>
                        <th className="px-2 py-2 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorklist.map((patient) => (
                        <tr 
                          key={patient.id} 
                          className={`cursor-pointer transition-colors hover:bg-gray-50 ${patient.status === 'critical' ? 'bg-red-50/50' : ''}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-gray-900">{patient.name}</div>
                            <div className="text-xs text-gray-400">{patient.mrn} &middot; {patient.age}{patient.gender}</div>
                            {patient.flags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {patient.flags.map((flag) => {
                                  const style = getFlagStyle(flag);
                                  return (
                                    <span key={flag} className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${style.bg} ${style.color}`}>
                                      {style.label}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="text-gray-900">{patient.room || patient.appointmentTime}</div>
                            <div className="text-xs text-gray-400">{patient.location}</div>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="text-gray-700">{patient.chiefComplaint}</div>
                            {patient.admitDate && <div className="text-xs text-gray-400">Admit: {patient.admitDate}</div>}
                          </td>
                          <td className="px-2 py-2.5 text-xs">
                            {patient.lastVitals ? (
                              <>
                                <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-red-600 font-medium' : 'text-gray-700'}>{patient.lastVitals.bp}</span></div>
                                <div className="text-gray-500">HR: {patient.lastVitals.hr} SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-gray-300">&mdash;</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-0.5">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-xs ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-red-600 font-medium' : 'text-amber-600'}`}>
                                    {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">&mdash;</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusStyle(patient.status)}`}>
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Open Chart">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="Write Note">
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
        <div className="w-72 flex flex-col gap-4 overflow-auto flex-shrink-0">
          {/* Unsigned Notes */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Unsigned Notes</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-600 rounded-full">{unsignedNotes.length}</span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedPanels.unsigned ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {expandedPanels.unsigned && (
              <div>
                {unsignedNotes.map((note) => (
                  <div key={note.id} className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{note.patientName}</div>
                      <div className="text-xs text-gray-400">{note.type} &middot; {note.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {note.daysOld >= 2 && <span className="text-xs text-red-500 font-medium">{note.daysOld}d</span>}
                      <button className="px-2.5 py-1 text-xs font-medium bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors">Sign</button>
                    </div>
                  </div>
                ))}
                <div className="p-3 border-t border-gray-100">
                  <button className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Sign All Notes</button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Pending Orders</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">{pendingOrders.length}</span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedPanels.orders ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {expandedPanels.orders && (
              <div>
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-2.5 border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{order.patientName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{order.order}</div>
                        <div className="flex gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{order.type}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            order.status === 'draft' ? 'bg-gray-100 text-gray-500' :
                            order.status === 'pending-approval' ? 'bg-amber-50 text-amber-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Today's Schedule</span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedPanels.schedule ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {expandedPanels.schedule && (
              <div className="px-4 pb-3">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-gray-400">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className="font-medium text-gray-600">8 appointments</span>
                </div>
                <div className="space-y-1">
                  {[
                    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                  ].map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                      slot.status === 'current' ? 'bg-indigo-50 text-indigo-700' :
                      slot.status === 'next' ? 'bg-gray-50 text-gray-700' :
                      slot.status === 'done' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      <span className="text-xs font-mono">{slot.time}</span>
                      <span className={slot.status === 'current' ? 'font-medium' : ''}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">View Full Schedule</button>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">System Status</span>
            </div>
            <div className="px-4 pb-3 space-y-2">
              {[
                { label: 'Database', status: 'Connected', ok: true },
                { label: 'HL7 Interface', status: 'Active', ok: true },
                { label: 'Pharmacy Link', status: 'Online', ok: true },
                { label: 'Last Sync', status: '2 min ago', ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    {item.ok && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    <span className={item.ok ? 'text-emerald-600 font-medium' : 'text-gray-600'}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Messages */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">System Messages</span>
            </div>
            <div className="pb-1">
              {[
                { date: '01/18 08:00', text: 'System maintenance scheduled for 01/20 2:00 AM' },
                { date: '01/17 14:30', text: 'New formulary updates available' },
                { date: '01/16 09:15', text: 'Lab interface upgraded to v3.2' },
              ].map((msg, i) => (
                <div key={i} className="px-4 py-2 border-t border-gray-50 text-xs">
                  <span className="text-gray-400">{msg.date}</span>
                  <span className="text-gray-600 ml-2">{msg.text}</span>
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
