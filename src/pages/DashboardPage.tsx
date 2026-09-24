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
      case 'critical': return 'bg-gray-300 text-gray-800 font-bold';
      case 'waiting': return 'bg-gray-200 text-gray-700';
      case 'roomed': return 'bg-gray-200 text-gray-700';
      case 'in-progress': return 'bg-gray-300 text-gray-800';
      case 'ready-discharge': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getFlagStyle = (flag: string) => {
    switch (flag) {
      case 'fall-risk': return { label: 'FALL', bg: 'bg-gray-200', color: 'text-gray-800' };
      case 'isolation': return { label: 'ISO', bg: 'bg-gray-200', color: 'text-gray-800' };
      case 'npo': return { label: 'NPO', bg: 'bg-gray-200', color: 'text-gray-800' };
      case 'allergy': return { label: 'ALLERGY', bg: 'bg-gray-200', color: 'text-gray-800' };
      case 'code-status': return { label: 'DNR', bg: 'bg-gray-300', color: 'text-gray-800' };
      case 'vip': return { label: 'VIP', bg: 'bg-gray-100', color: 'text-gray-700' };
      default: return { label: flag, bg: 'bg-gray-100', color: 'text-gray-700' };
    }
  };

  return (
    <div className="h-full flex flex-col relative ehr-desktop">
      <LoadingOverlay isLoading={loading} text="Loading dashboard..." />
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Dashboard data has been refreshed.', type: 'info' })}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </button>
          <span className="text-gray-400">|</span>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowRxDialog(true)}>
            <Pill className="w-3.5 h-3.5 mr-1" /> e-Prescribe
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowLabDialog(true)}>
            <FlaskConical className="w-3.5 h-3.5 mr-1" /> Order Labs
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowImagingDialog(true)}>
            <Radio className="w-3.5 h-3.5 mr-1" /> Order Imaging
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowAlert({ title: 'New Note', message: 'Select a patient first to create a clinical note.', type: 'info' })}>
            <FileText className="w-3.5 h-3.5 mr-1" /> New Note
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowAlert({ title: 'Referral', message: 'Select a patient first to create a referral.', type: 'info' })}>
            <Send className="w-3.5 h-3.5 mr-1" /> Referral
          </button>
          <span className="text-gray-400">|</span>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button className="ehr-toolbar-button relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-600 text-white text-[9px] flex items-center justify-center border border-gray-700">3</span>
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="ehr-alert-critical px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2" />
              <span className="font-semibold text-[11px]">CRITICAL ALERTS ({criticalAlerts.length})</span>
            </div>
            <div className="flex items-center space-x-4">
              {criticalAlerts.slice(0, 2).map((alert) => (
                <span key={alert.id} className="text-[11px]">
                  <strong>{alert.patient}:</strong> {alert.alert} - {alert.action}
                </span>
              ))}
              <button className="ehr-button text-[10px] px-2 py-0.5">Review All</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-1 space-x-1">
        {/* Left Column - Inbox & Worklist */}
        <div className="flex-1 flex flex-col space-y-1 overflow-hidden">
          {/* Inbox Panel */}
          <div className={`ehr-panel flex flex-col overflow-hidden ${expandedPanels.inbox ? 'flex-1' : ''}`}>
            <div 
              className="ehr-header flex items-center justify-between cursor-pointer"
              onClick={(e) => { e.stopPropagation(); togglePanel('inbox'); }}
            >
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 flex items-center justify-center border border-white/50 text-[10px] font-bold">
                  {expandedPanels.inbox ? '-' : '+'}
                </span>
                <span>Inbox</span>
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 text-[10px]">{inboxCounts.all} unread</span>
              </div>
            </div>
            {expandedPanels.inbox && (
              <>
                <div className="ehr-subheader flex items-center space-x-1">
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
                      {tab.label} {tab.count > 0 && <span className="ml-1 text-[9px]">({tab.count})</span>}
                    </button>
                  ))}
                  <span className="text-gray-400 mx-1">|</span>
                  <select 
                    value={inboxPriority} 
                    onChange={(e) => setInboxPriority(e.target.value as InboxPriority)}
                    className="ehr-input text-[10px] py-0"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                  <select 
                    value={inboxReadFilter} 
                    onChange={(e) => setInboxReadFilter(e.target.value as InboxReadFilter)}
                    className="ehr-input text-[10px] py-0"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                  <div className="flex-1" />
                  <button className="ehr-toolbar-button p-0.5 text-[10px]" onClick={markAllAsRead}>Mark All Read</button>
                  <button className="ehr-toolbar-button p-0.5"><RefreshCw className="w-3 h-3" /></button>
                </div>
                <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="px-1 py-1 text-left w-6"></th>
                        <th className="px-1 py-1 text-left w-6">Type</th>
                        <th className="px-1 py-1 text-left">Patient</th>
                        <th className="px-1 py-1 text-left">Subject</th>
                        <th className="px-1 py-1 text-left w-20">Time</th>
                        <th className="px-1 py-1 text-center w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInbox.map((item, idx) => (
                        <tr 
                          key={item.id} 
                          className={`cursor-pointer ${item.priority === 'critical' ? 'ehr-alert-critical' : idx % 2 === 1 ? 'bg-gray-50' : ''} ${!item.read ? 'font-semibold' : ''}`}
                        >
                          <td className="px-1 py-0.5">
                            {!item.read && <span className="w-2 h-2 bg-gray-600 inline-block border border-gray-700" />}
                            {item.flagged && <Flag className="w-3 h-3 text-red-600 inline" />}
                          </td>
                          <td className="px-1 py-0.5">{getInboxIcon(item.type)}</td>
                          <td className="px-1 py-0.5">
                            <span>{item.patientName}</span>
                            <span className="text-gray-500 ml-1 text-[10px]">{item.patientMrn}</span>
                          </td>
                          <td className="px-1 py-0.5">
                            <div className={item.priority === 'critical' ? 'text-red-800' : ''}>{item.title}</div>
                            <div className="text-gray-500 text-[10px] truncate max-w-[300px]">{item.detail}</div>
                          </td>
                          <td className="px-1 py-0.5 text-gray-500">{item.timestamp}</td>
                          <td className="px-1 py-0.5 text-center">
                            <button className="ehr-toolbar-button p-0.5" onClick={() => { markAsRead(item.id); navigate(`/patients/1`); }} title="View"><Eye className="w-3 h-3" /></button>
                            <button className="ehr-toolbar-button p-0.5" onClick={() => markAsRead(item.id)} title="Mark Read"><CheckCircle2 className="w-3 h-3" /></button>
                            <button className="ehr-toolbar-button p-0.5" onClick={() => toggleFlag(item.id)} title="Flag"><Flag className={`w-3 h-3 ${item.flagged ? 'text-red-600' : ''}`} /></button>
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
          <div className={`ehr-panel flex flex-col overflow-hidden ${expandedPanels.worklist ? 'flex-1' : ''}`}>
            <div 
              className="ehr-header flex items-center justify-between cursor-pointer"
              onClick={(e) => { e.stopPropagation(); togglePanel('worklist'); }}
            >
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 flex items-center justify-center border border-white/50 text-[10px] font-bold">
                  {expandedPanels.worklist ? '-' : '+'}
                </span>
                <span>Patient Worklist</span>
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 text-[10px]">{worklistPatients.length} patients</span>
              </div>
            </div>
            {expandedPanels.worklist && (
              <>
                <div className="ehr-subheader flex items-center space-x-1">
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
                  <span className="text-gray-400 mx-1">|</span>
                  <span className="text-[10px] text-gray-600">Sort:</span>
                  <select 
                    value={worklistSort} 
                    onChange={(e) => setWorklistSort(e.target.value as WorklistSort)}
                    className="ehr-input text-[10px] py-0"
                  >
                    <option value="status">Status</option>
                    <option value="name">Name</option>
                    <option value="location">Location</option>
                  </select>
                  <button 
                    className="ehr-toolbar-button p-0.5 text-[10px]" 
                    onClick={() => setWorklistSortAsc(!worklistSortAsc)}
                  >
                    {worklistSortAsc ? '↑' : '↓'}
                  </button>
                  <div className="flex-1" />
                  <button className="ehr-button text-[10px] px-2 py-0.5 flex items-center" onClick={() => setShowPrintDialog(true)}>
                    <Printer className="w-3 h-3 mr-1" /> Print List
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0">
                      <tr>
                        <th className="px-1 py-1 text-left">Patient</th>
                        <th className="px-1 py-1 text-left">Location</th>
                        <th className="px-1 py-1 text-left">Chief Complaint</th>
                        <th className="px-1 py-1 text-left">Vitals</th>
                        <th className="px-1 py-1 text-left">Alerts</th>
                        <th className="px-1 py-1 text-left">Status</th>
                        <th className="px-1 py-1 text-center w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorklist.map((patient, idx) => (
                        <tr 
                          key={patient.id} 
                          className={`cursor-pointer hover:bg-blue-50 ${patient.status === 'critical' ? 'ehr-alert-critical' : idx % 2 === 1 ? 'bg-gray-50' : ''}`}
                          onClick={() => navigate(`/patients/${patient.id}`)}
                        >
                          <td className="px-1 py-0.5">
                            <div className="font-semibold">{patient.name}</div>
                            <div className="text-gray-500 text-[10px]">{patient.mrn} • {patient.age}{patient.gender}</div>
                            <div className="flex space-x-0.5 mt-0.5">
                              {patient.flags.map((flag) => {
                                const style = getFlagStyle(flag);
                                return (
                                  <span key={flag} className={`px-1 py-0 text-[9px] ${style.bg} ${style.color}`}>
                                    {style.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-1 py-0.5">
                            <div>{patient.room || patient.appointmentTime}</div>
                            <div className="text-gray-500 text-[10px]">{patient.location}</div>
                          </td>
                          <td className="px-1 py-0.5">
                            <div>{patient.chiefComplaint}</div>
                            {patient.admitDate && <div className="text-gray-500 text-[10px]">Admit: {patient.admitDate}</div>}
                          </td>
                          <td className="px-1 py-0.5 text-[10px]">
                            {patient.lastVitals ? (
                              <>
                                <div>BP: <span className={parseInt(patient.lastVitals.bp) > 140 ? 'text-red-600 font-semibold' : ''}>{patient.lastVitals.bp}</span></div>
                                <div>HR: {patient.lastVitals.hr} SpO2: {patient.lastVitals.spo2}%</div>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-1 py-0.5">
                            {patient.alerts.length > 0 ? (
                              <div className="space-y-0.5">
                                {patient.alerts.slice(0, 2).map((alert, i) => (
                                  <div key={i} className={`text-[10px] ${alert.includes('CRITICAL') || alert.includes('Troponin') ? 'text-red-700 font-semibold' : 'text-amber-700'}`}>
                                    • {alert}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[10px]">None</span>
                            )}
                          </td>
                          <td className="px-1 py-0.5">
                            <span className={`px-1.5 py-0.5 text-[10px] ${getStatusStyle(patient.status)}`}>
                              {patient.status.replace('-', ' ')}
                            </span>
                          </td>
                          <td className="px-1 py-0.5 text-center">
                            <button onClick={(e) => { e.stopPropagation(); }} className="ehr-toolbar-button p-0.5" title="Open Chart">
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); }} className="ehr-toolbar-button p-0.5" title="Write Note">
                              <Edit3 className="w-3 h-3" />
                            </button>
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
        <div className="w-64 flex flex-col space-y-1 overflow-auto">
          {/* Unsigned Notes */}
          <div className="ehr-panel">
            <div 
              className="ehr-header flex items-center justify-between cursor-pointer"
              onClick={(e) => { e.stopPropagation(); togglePanel('unsigned'); }}
            >
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 flex items-center justify-center border border-white/50 text-[10px] font-bold">
                  {expandedPanels.unsigned ? '-' : '+'}
                </span>
                <span>Unsigned Notes ({unsignedNotes.length})</span>
              </div>
            </div>
            {expandedPanels.unsigned && (
              <div className="bg-white">
                {unsignedNotes.map((note, idx) => (
                  <div key={note.id} className={`px-2 py-1.5 border-b border-gray-200 flex items-center justify-between ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <div>
                      <div className="font-semibold text-[11px]">{note.patientName}</div>
                      <div className="text-[10px] text-gray-500">{note.type} • {note.date}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {note.daysOld >= 2 && <span className="text-[9px] text-red-600 font-semibold">{note.daysOld}d</span>}
                      <button className="ehr-button ehr-button-primary text-[10px] px-2 py-0.5">Sign</button>
                    </div>
                  </div>
                ))}
                <div className="p-1 bg-gray-100 border-t">
                  <button className="ehr-button w-full text-[10px]">Sign All Notes</button>
                </div>
              </div>
            )}
          </div>

          {/* Pending Orders */}
          <div className="ehr-panel">
            <div 
              className="ehr-header flex items-center justify-between cursor-pointer"
              onClick={(e) => { e.stopPropagation(); togglePanel('orders'); }}
            >
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 flex items-center justify-center border border-white/50 text-[10px] font-bold">
                  {expandedPanels.orders ? '-' : '+'}
                </span>
                <span>Pending Orders ({pendingOrders.length})</span>
              </div>
            </div>
            {expandedPanels.orders && (
              <div className="bg-white">
                {pendingOrders.map((order, idx) => (
                  <div key={order.id} className={`px-2 py-1.5 border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-[11px]">{order.patientName}</div>
                        <div className="text-[10px] text-gray-700">{order.order}</div>
                        <div className="flex space-x-1 mt-0.5">
                          <span className="text-[9px] px-1 py-0 bg-gray-200 text-gray-700 border border-gray-400">{order.type}</span>
                          <span className={`text-[9px] px-1 py-0 border border-gray-400 ${
                            order.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                            order.status === 'pending-approval' ? 'bg-gray-200 text-gray-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{order.status}</span>
                        </div>
                      </div>
                      <button className="ehr-button text-[10px] px-2 py-0.5">Review</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="ehr-panel">
            <div 
              className="ehr-header flex items-center justify-between cursor-pointer"
              onClick={(e) => { e.stopPropagation(); togglePanel('schedule'); }}
            >
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 flex items-center justify-center border border-white/50 text-[10px] font-bold">
                  {expandedPanels.schedule ? '-' : '+'}
                </span>
                <span>Today's Schedule</span>
              </div>
            </div>
            {expandedPanels.schedule && (
              <div className="bg-white p-2">
                <div className="flex items-center justify-between mb-2 text-[11px]">
                  <span className="text-gray-500">January 18, 2024</span>
                  <span className="font-semibold">8 appointments</span>
                </div>
                <div className="space-y-1">
                  {[
                    { time: '9:00 AM', patient: 'Completed (3)', status: 'done' },
                    { time: '10:30 AM', patient: 'Johnson, Sarah', status: 'current' },
                    { time: '11:00 AM', patient: 'Williams, Michael', status: 'next' },
                    { time: '11:30 AM', patient: 'Brown, Emily', status: 'upcoming' },
                    { time: '2:00 PM', patient: 'Wilson, Patricia', status: 'upcoming' },
                  ].map((slot, i) => (
                    <div key={i} className={`flex items-center justify-between py-1 px-2 text-[11px] ${
                      slot.status === 'current' ? 'bg-gray-200 border border-gray-400' :
                      slot.status === 'next' ? 'bg-gray-100' :
                      slot.status === 'done' ? 'bg-gray-50 text-gray-400' : ''
                    }`}>
                      <span>{slot.time}</span>
                      <span className={slot.status === 'current' ? 'font-semibold' : ''}>{slot.patient}</span>
                    </div>
                  ))}
                </div>
                <button className="ehr-button w-full mt-2 text-[10px]">View Full Schedule</button>
              </div>
            )}
          </div>

          {/* System Messages */}
          <div className="ehr-panel">
            <div className="ehr-header flex items-center">
              <span className="w-4 h-4 mr-2 flex items-center justify-center border border-white/50 text-[10px] font-bold">!</span>
              <span>System Messages</span>
            </div>
            <div className="bg-white text-[10px]">
              <div className="px-2 py-1 border-b border-gray-200">
                <span className="text-gray-500">01/18 08:00</span> - System maintenance scheduled for 01/20 2:00 AM
              </div>
              <div className="px-2 py-1 border-b border-gray-200">
                <span className="text-gray-500">01/17 14:30</span> - New formulary updates available
              </div>
              <div className="px-2 py-1">
                <span className="text-gray-500">01/16 09:15</span> - Lab interface upgraded to v3.2
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="ehr-panel">
            <div className="ehr-header flex items-center">
              <span>System Status</span>
            </div>
            <div className="bg-white p-2 text-[10px]">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-1 py-0.5">Database</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-green-700">Connected</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-1 py-0.5 bg-gray-50">HL7 Interface</td>
                    <td className="border border-gray-300 px-1 py-0.5 bg-gray-50 text-green-700">Active</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-1 py-0.5">Pharmacy Link</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-green-700">Online</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-1 py-0.5 bg-gray-50">Last Sync</td>
                    <td className="border border-gray-300 px-1 py-0.5 bg-gray-50">2 min ago</td>
                  </tr>
                </tbody>
              </table>
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
