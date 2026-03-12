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
      case 'lab': return <FlaskConical className="w-3 h-3" />;
      case 'imaging': return <Radio className="w-3 h-3" />;
      case 'message': return <MessageSquare className="w-3 h-3" />;
      case 'refill': return <Pill className="w-3 h-3" />;
      case 'order': return <ClipboardList className="w-3 h-3" />;
      case 'cosign': return <Edit3 className="w-3 h-3" />;
      case 'consult': return <Stethoscope className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] font-semibold';
      case 'waiting': return 'bg-[#fffbeb] text-[#92400e] border border-[#fde68a]';
      case 'roomed': return 'bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]';
      case 'in-progress': return 'bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]';
      case 'ready-discharge': return 'bg-[#faf5ff] text-[#6b21a8] border border-[#e9d5ff]';
      default: return 'bg-[#f7f7f7] text-[#484848] border border-[#ebebeb]';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-[#fef2f2]', color: 'text-[#991b1b]' };
      case 'isolation': return { label: 'ISO', bg: 'bg-[#fffbeb]', color: 'text-[#92400e]' };
      case 'npo': return { label: 'NPO', bg: 'bg-[#eff6ff]', color: 'text-[#1e40af]' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-[#fef2f2]', color: 'text-[#991b1b]' };
      case 'code-status': return { label: 'DNR', bg: 'bg-[#fef2f2]', color: 'text-[#991b1b]' };
      case 'vip': return { label: 'VIP', bg: 'bg-[#f0fdf4]', color: 'text-[#166534]' };
      default: return { label: flag, bg: 'bg-[#f7f7f7]', color: 'text-[#484848]' };
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-[#f7f7f7]">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />

      {/* Quick Actions Toolbar - Airbnb-style clean bar */}
      <div className="bg-white border-b border-[#ebebeb] px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[#484848] hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </button>
            <div className="w-px h-6 bg-[#ebebeb]" />
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[#484848] hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowRxDialog(true)}>
              <Pill className="w-4 h-4 mr-2" /> e-Prescribe
            </button>
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[#484848] hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowLabDialog(true)}>
              <FlaskConical className="w-4 h-4 mr-2" /> Order Labs
            </button>
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[#484848] hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowImagingDialog(true)}>
              <Radio className="w-4 h-4 mr-2" /> Order Imaging
            </button>
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[#484848] hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
              <FileText className="w-4 h-4 mr-2" /> New Note
            </button>
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[#484848] hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
              <Send className="w-4 h-4 mr-2" /> Referral
            </button>
            <div className="w-px h-6 bg-[#ebebeb]" />
            <button className="flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-[#484848] hover:bg-[#f7f7f7] transition-colors" onClick={() => setShowPrintDialog(true)}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </button>
          </div>
          <button className="relative p-2 rounded-full hover:bg-[#f7f7f7] transition-colors">
            <Bell className="w-5 h-5 text-[#484848]" />
            <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#FF385C] text-white text-[10px] font-bold flex items-center justify-center rounded-full">3</span>
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner - Modern style */}
      {criticalAlerts.length > 0 && (
        <div className="mx-6 mt-4 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldAlert className="w-5 h-5 mr-3 text-[#991b1b]" />
              <span className="font-bold text-sm text-[#991b1b]">CRITICAL ALERTS ({criticalAlerts.length})</span>
            </div>
            <div className="flex items-center space-x-6">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <span key={alert.id} className="text-sm text-[#991b1b]">
                  <strong>{alert.patient}:</strong> {alert.alert} - {alert.action}
                </span>
              ))}
              <button className="px-4 py-1.5 bg-white border border-[#fecaca] rounded-lg text-sm font-semibold text-[#991b1b] hover:bg-[#fef2f2] transition-colors">Review All</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-6 space-x-6">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
          {/* Inbox Panel - Card style */}
          <div className={`ehr-panel flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-[#222222]">Inbox</span>
                {inboxCounts.all > 0 && (
                  <span className="px-2.5 py-0.5 bg-[#FF385C] text-white text-xs font-bold rounded-full">{inboxCounts.all}</span>
                )}
              </div>
              <span className="text-[#717171] text-sm">{expandedPanels.inbox ? '−' : '+'}</span>
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
                      className={`ehr-tab ${inboxTab === tab.key ? 'active' : ''}`}
                    >
                      {tab.label} {tab.count > 0 && <span className="ml-1 text-[11px]">({tab.count})</span>}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-[#ebebeb] mx-1" />
                  <select 
                    value={inboxPriority} 
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="ehr-input text-sm py-1.5 px-3 rounded-full"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select 
                    value={inboxReadFilter} 
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="ehr-input text-sm py-1.5 px-3 rounded-full"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <div className="flex-1" />
                  <button className="text-sm font-semibold text-[#484848] hover:text-[#222222] px-3 py-1.5 rounded-lg hover:bg-[#f7f7f7] transition-colors" onClick={markAllAsRead}>Mark All Read</button>
                  <button className="p-2 rounded-full hover:bg-[#f7f7f7] transition-colors"><RefreshCw className="w-4 h-4 text-[#717171]" /></button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="px-5 py-3 text-left w-8"></th>
                        <th className="px-2 py-3 text-left w-8">Type</th>
                        <th className="px-3 py-3 text-left">Patient</th>
                        <th className="px-3 py-3 text-left">Subject</th>
                        <th className="px-3 py-3 text-left w-24">Time</th>
                        <th className="px-3 py-3 text-center w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInbox.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`cursor-pointer transition-colors hover:bg-[#f7f7f7] ${item.priority === 'critical' ? 'bg-[#fef2f2]' : ''} ${!item.read ? 'font-semibold' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center space-x-1">
                              {!item.read && <span className="w-2.5 h-2.5 bg-[#FF385C] rounded-full inline-block" />}
                              {item.flagged && <Flag className="w-3.5 h-3.5 text-[#FF385C] inline" />}
                            </div>
                          </td>
                          <td className="px-2 py-3">{getInboxIcon(item.type)}</td>
                          <td className="px-3 py-3">
                            <span className="text-[#222222]">{item.patientName}</span>
                            <span className="text-[#717171] ml-2 text-xs">{item.patientMrn}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className={item.priority === 'critical' ? 'text-[#991b1b]' : 'text-[#222222]'}>{item.title}</div>
                            <div className="text-[#717171] text-xs truncate max-w-[300px]">{item.detail}</div>
                          </td>
                          <td className="px-3 py-3 text-[#717171] text-xs">{item.timestamp}</td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button className="p-1.5 rounded-full hover:bg-[#ebebeb] transition-colors" onClick={() => { markAsRead(item.id); navigate(`/patients/1`); }} title="View"><Eye className="w-4 h-4 text-[#717171]" /></button>
                              <button className="p-1.5 rounded-full hover:bg-[#ebebeb] transition-colors" onClick={() => markAsRead(item.id)} title="Mark Read"><CheckCircle2 className="w-4 h-4 text-[#717171]" /></button>
                              <button className="p-1.5 rounded-full hover:bg-[#ebebeb] transition-colors" onClick={() => toggleFlag(item.id)} title="Flag"><Flag className={`w-4 h-4 ${item.flagged ? 'text-[#FF385C]' : 'text-[#717171]'}`} /></button>
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

          {/* Worklist Panel - Card style */}
          <div className={`ehr-panel flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-[#222222]">Patient Worklist</span>
                <span className="text-sm text-[#717171]">{worklistPatients.length} patients</span>
              </div>
              <span className="text-[#717171] text-sm">{expandedPanels.worklist ? '−' : '+'}</span>
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
                      className={`ehr-tab ${worklistFilter === filter.key ? 'active' : ''}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="w-px h-5 bg-[#ebebeb] mx-1" />
                  <span className="text-sm text-[#717171]">Sort:</span>
                  <select 
                    value={worklistSort} 
                    onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                    className="ehr-input text-sm py-1.5 px-3 rounded-full"
                  >
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                    <option value="location">Location</option>
                  </select>
                  <button 
                    className="p-1.5 rounded-full hover:bg-[#f7f7f7] text-sm font-semibold text-[#717171] transition-colors" 
                    onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                  >
                    {worklistSortAsc ? '↑' : '↓'}
                  </button>
                  <div className="flex-1" />
                  <button className="flex items-center px-4 py-2 border border-[#dddddd] rounded-lg text-sm font-semibold text-[#222222] hover:border-[#222222] transition-colors" onClick={() => setShowPrintDialog(true)}>
                    <Printer className="w-4 h-4 mr-2" /> Print List
                  </button>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="px-5 py-3 text-left">Patient</th>
                        <th className="px-3 py-3 text-left">Location</th>
                        <th className="px-3 py-3 text-left">Chief Complaint</th>
                        <th className="px-3 py-3 text-left">Vitals</th>
                        <th className="px-3 py-3 text-left">Alerts</th>
                        <th className="px-3 py-3 text-left">Status</th>
                        <th className="px-3 py-3 text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorklist.map((patient) => (
                        <tr 
                          key={patient.id} 
                          className={`cursor-pointer transition-colors hover:bg-[#f7f7f7] ${patient.status === 'critical' ? 'bg-[#fef2f2]' : ''}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="font-semibold text-[#222222]">{patient.name}</div>
                            <div className="text-[#717171] text-xs mt-0.5">{patient.mrn} &middot; {patient.age}{patient.gender}</div>
                            <div className="flex space-x-1 mt-1">
                              {patient.flags.map((flag) => {
                                const style = getFlagStyle(flag);
                                return (
                                  <span key={flag} className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${style.bg} ${style.color}`}>
                                    {style.label}
                                  </span>
                                );
                              })}
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
                                <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-[#991b1b] font-semibold' : ''}>{patient.lastVitals.bp}</span></div>
                                <div className="text-[#717171]">HR: {patient.lastVitals.hr} SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-[#b0b0b0]">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-1">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-xs ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-[#991b1b] font-semibold' : 'text-[#92400e]'}`}>
                                    {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#b0b0b0] text-xs">None</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusStyle(patient.status)}`}>
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-full hover:bg-[#ebebeb] transition-colors" title="Open Chart">
                                <ExternalLink className="w-4 h-4 text-[#717171]" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); }} className="p-1.5 rounded-full hover:bg-[#ebebeb] transition-colors" title="Write Note">
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

        {/* Right Column - Sidebar Cards */}
        <div className="w-72 flex flex-col space-y-4 overflow-auto">
          {/* Unsigned Notes Card */}
          <div className="ehr-panel">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#222222]">Unsigned Notes</span>
                <span className="px-2 py-0.5 bg-[#fffbeb] text-[#92400e] text-xs font-semibold rounded-full">{unsignedNotes.length}</span>
              </div>
              <span className="text-[#717171] text-sm">{expandedPanels.unsigned ? '−' : '+'}</span>
            </div>
            {expandedPanels.unsigned && (
              <div>
                {unsignedNotes.map((note) => (
                  <div key={note.id} className="px-4 py-3 border-t border-[#ebebeb] flex items-center justify-between hover:bg-[#fafafa] transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-[#222222]">{note.patientName}</div>
                      <div className="text-xs text-[#717171] mt-0.5">{note.type} &middot; {note.date}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {note.daysOld >= 2 && <span className="text-xs text-[#991b1b] font-semibold">{note.daysOld}d</span>}
                      <button className="px-3 py-1.5 bg-gradient-to-r from-[#E61E4D] to-[#D70466] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">Sign</button>
                    </div>
                  </div>
                ))}
                <div className="p-3 border-t border-[#ebebeb]">
                  <button className="w-full py-2 border border-[#dddddd] rounded-lg text-sm font-semibold text-[#222222] hover:border-[#222222] transition-colors">Sign All Notes</button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders Card */}
          <div className="ehr-panel">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#222222]">Pending Orders</span>
                <span className="px-2 py-0.5 bg-[#eff6ff] text-[#1e40af] text-xs font-semibold rounded-full">{pendingOrders.length}</span>
              </div>
              <span className="text-[#717171] text-sm">{expandedPanels.orders ? '−' : '+'}</span>
            </div>
            {expandedPanels.orders && (
              <div>
                {pendingOrders.map((order) => (
                  <div key={order.id} className="px-4 py-3 border-t border-[#ebebeb] hover:bg-[#fafafa] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-[#222222]">{order.patientName}</div>
                        <div className="text-xs text-[#484848] mt-0.5">{order.order}</div>
                        <div className="flex space-x-1.5 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 bg-[#f7f7f7] text-[#484848] rounded-full font-semibold">{order.type}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            order.status === 'draft' ? 'bg-[#f7f7f7] text-[#717171]' :
                            order.status === 'pending-approval' ? 'bg-[#fffbeb] text-[#92400e]' :
                            'bg-[#eff6ff] text-[#1e40af]'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 border border-[#dddddd] rounded-lg text-xs font-semibold text-[#222222] hover:border-[#222222] transition-colors">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule Card */}
          <div className="ehr-panel">
            <div 
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fafafa] transition-colors"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <span className="font-bold text-[#222222]">Today&apos;s Schedule</span>
              <span className="text-[#717171] text-sm">{expandedPanels.schedule ? '−' : '+'}</span>
            </div>
            {expandedPanels.schedule && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between mb-3 text-sm">
                  <span className="text-[#717171]">January 18, 2024</span>
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
                    <div key={i} className={`flex items-center justify-between py-2 px-3 text-sm rounded-lg ${
                      slot.status === 'current' ? 'bg-[#FF385C] text-white' :
                      slot.status === 'next' ? 'bg-[#f7f7f7]' :
                      slot.status === 'done' ? 'text-[#b0b0b0]' : ''
                    }`}>
                      <span className={slot.status === 'current' ? 'font-semibold' : ''}>{slot.time}</span>
                      <span className={slot.status === 'current' ? 'font-semibold' : ''}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-3 py-2 border border-[#dddddd] rounded-lg text-sm font-semibold text-[#222222] hover:border-[#222222] transition-colors">View Full Schedule</button>
              </div>
            )}
          </div>

          {/* System Messages Card */}
          <div className="ehr-panel">
            <div className="flex items-center space-x-2 px-4 py-3">
              <span className="font-bold text-[#222222]">System Messages</span>
            </div>
            <div className="text-sm">
              <div className="px-4 py-3 border-t border-[#ebebeb] hover:bg-[#fafafa] transition-colors">
                <span className="text-[#717171] text-xs">01/18 08:00</span>
                <p className="text-[#484848] mt-0.5">System maintenance scheduled for 01/20 2:00 AM</p>
              </div>
              <div className="px-4 py-3 border-t border-[#ebebeb] hover:bg-[#fafafa] transition-colors">
                <span className="text-[#717171] text-xs">01/17 14:30</span>
                <p className="text-[#484848] mt-0.5">New formulary updates available</p>
              </div>
              <div className="px-4 py-3 border-t border-[#ebebeb] hover:bg-[#fafafa] transition-colors">
                <span className="text-[#717171] text-xs">01/16 09:15</span>
                <p className="text-[#484848] mt-0.5">Lab interface upgraded to v3.2</p>
              </div>
            </div>
          </div>

          {/* System Status Card */}
          <div className="ehr-panel">
            <div className="px-4 py-3">
              <span className="font-bold text-[#222222]">System Status</span>
            </div>
            <div className="px-4 pb-4">
              <div className="space-y-2">
                {[
                  { label: 'Database', status: 'Connected', color: 'text-emerald-600' },
                  { label: 'HL7 Interface', status: 'Active', color: 'text-emerald-600' },
                  { label: 'Pharmacy Link', status: 'Online', color: 'text-emerald-600' },
                  { label: 'Last Sync', status: '2 min ago', color: 'text-[#484848]' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 px-3 bg-[#fafafa] rounded-lg">
                    <span className="text-sm text-[#484848]">{item.label}</span>
                    <div className="flex items-center space-x-1.5">
                      {item.color === 'text-emerald-600' && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                      <span className={`text-sm font-semibold ${item.color}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-[#ebebeb] px-6 py-2 flex items-center justify-between text-xs text-[#717171]">
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
