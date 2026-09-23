import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User,
  Video,
  MapPin,
  Phone,
  AlertTriangle,
  FileText,
  Pill,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Calendar,
  Printer,
  Plus,
  RefreshCw,
  Stethoscope,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import type { EncounterStatus } from '../types';
import { Modal, AlertDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';
import { OrderDialog } from '../components/ui/OrderDialog';
import { PrescriptionDialog } from '../components/ui/PrescriptionDialog';

interface ScheduleAppointment {
  id: number;
  patientId: number;
  patientName: string;
  patientMrn: string;
  patientDob: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  appointmentTime: string;
  duration: number;
  encounterType: 'OUTPATIENT' | 'TELEHEALTH' | 'PROCEDURE' | 'NEW_PATIENT' | 'FOLLOW_UP' | 'URGENT' | 'PHYSICAL';
  status: EncounterStatus;
  chiefComplaint: string;
  visitType: string;
  provider: string;
  room?: string;
  insurancePrimary: string;
  copay?: number;
  copayCollected: boolean;
  checkedInTime?: string;
  roomedTime?: string;
  alerts: string[];
  flags: ('allergy' | 'fall-risk' | 'interpreter' | 'wheelchair' | 'vip' | 'new-patient')[];
  lastVitals?: {
    bp: string;
    hr: number;
    temp: number;
    weight: number;
    spo2: number;
  };
  prepNotes?: string[];
  pendingOrders?: string[];
  recentLabs?: { name: string; value: string; date: string; abnormal?: boolean }[];
  medications?: { name: string; dose: string }[];
}

const defaultAppointments: ScheduleAppointment[] = [
  {
    id: 1, patientId: 1, patientName: 'Smith, John', patientMrn: 'MRN001234', patientDob: '03/15/1965', patientAge: 58, patientGender: 'M',
    patientPhone: '(555) 123-4567', appointmentTime: '08:00', duration: 30, encounterType: 'FOLLOW_UP', status: 'FINISHED',
    chiefComplaint: 'Diabetes follow-up, medication adjustment', visitType: 'Follow-up', provider: 'Dr. Anderson', room: '101',
    insurancePrimary: 'Blue Cross PPO', copay: 30, copayCollected: true, checkedInTime: '07:52', roomedTime: '08:05',
    alerts: [], flags: ['allergy'],
    lastVitals: { bp: '138/88', hr: 78, temp: 98.4, weight: 198, spo2: 97 },
    recentLabs: [{ name: 'HbA1c', value: '7.8%', date: '01/10/2024' }, { name: 'eGFR', value: '72', date: '01/10/2024' }],
    medications: [{ name: 'Metformin', dose: '500mg BID' }, { name: 'Lisinopril', dose: '10mg daily' }]
  },
  {
    id: 2, patientId: 2, patientName: 'Johnson, Sarah', patientMrn: 'MRN001235', patientDob: '07/22/1978', patientAge: 45, patientGender: 'F',
    patientPhone: '(555) 234-5678', appointmentTime: '08:30', duration: 30, encounterType: 'FOLLOW_UP', status: 'FINISHED',
    chiefComplaint: 'HTN follow-up, BP check', visitType: 'Follow-up', provider: 'Dr. Anderson', room: '102',
    insurancePrimary: 'Aetna HMO', copay: 25, copayCollected: true, checkedInTime: '08:25', roomedTime: '08:35',
    alerts: [], flags: [],
    lastVitals: { bp: '128/82', hr: 72, temp: 98.2, weight: 156, spo2: 98 },
    medications: [{ name: 'Amlodipine', dose: '5mg daily' }]
  },
  {
    id: 3, patientId: 3, patientName: 'Williams, Michael', patientMrn: 'MRN001236', patientDob: '11/08/1961', patientAge: 62, patientGender: 'M',
    patientPhone: '(555) 345-6789', appointmentTime: '09:00', duration: 45, encounterType: 'NEW_PATIENT', status: 'FINISHED',
    chiefComplaint: 'New patient, establish care, multiple chronic conditions', visitType: 'New Patient', provider: 'Dr. Anderson', room: '101',
    insurancePrimary: 'Medicare', copay: 0, copayCollected: true, checkedInTime: '08:48', roomedTime: '09:05',
    alerts: ['Review outside records'], flags: ['new-patient'],
    lastVitals: { bp: '142/90', hr: 82, temp: 98.6, weight: 210, spo2: 96 },
    prepNotes: ['Records received from Dr. Thompson', 'Needs med reconciliation'],
    medications: [{ name: 'Metoprolol', dose: '25mg BID' }, { name: 'Atorvastatin', dose: '40mg daily' }, { name: 'Aspirin', dose: '81mg daily' }]
  },
  {
    id: 4, patientId: 4, patientName: 'Brown, Emily', patientMrn: 'MRN001237', patientDob: '04/30/1989', patientAge: 34, patientGender: 'F',
    patientPhone: '(555) 456-7890', appointmentTime: '10:00', duration: 20, encounterType: 'TELEHEALTH', status: 'IN_PROGRESS',
    chiefComplaint: 'Anxiety follow-up, medication refill', visitType: 'Telehealth', provider: 'Dr. Anderson',
    insurancePrimary: 'United Healthcare', copay: 20, copayCollected: true, checkedInTime: '09:58',
    alerts: [], flags: [],
    medications: [{ name: 'Sertraline', dose: '50mg daily' }]
  },
  {
    id: 5, patientId: 5, patientName: 'Davis, Robert', patientMrn: 'MRN001238', patientDob: '09/12/1952', patientAge: 71, patientGender: 'M',
    patientPhone: '(555) 567-8901', appointmentTime: '10:30', duration: 30, encounterType: 'FOLLOW_UP', status: 'TRIAGED',
    chiefComplaint: 'CHF follow-up, weight check, diuretic adjustment', visitType: 'Follow-up', provider: 'Dr. Anderson', room: '103',
    insurancePrimary: 'Medicare Advantage', copay: 0, copayCollected: true, checkedInTime: '10:22', roomedTime: '10:28',
    alerts: ['Weight up 4 lbs from last visit', 'BNP pending'], flags: ['fall-risk'],
    lastVitals: { bp: '118/72', hr: 68, temp: 98.0, weight: 186, spo2: 95 },
    recentLabs: [{ name: 'BNP', value: 'Pending', date: '01/18/2024' }, { name: 'Cr', value: '1.4', date: '01/15/2024', abnormal: true }],
    medications: [{ name: 'Furosemide', dose: '40mg daily' }, { name: 'Carvedilol', dose: '12.5mg BID' }, { name: 'Lisinopril', dose: '20mg daily' }]
  },
  {
    id: 6, patientId: 6, patientName: 'Martinez, Ana', patientMrn: 'MRN001241', patientDob: '02/28/1956', patientAge: 67, patientGender: 'F',
    patientPhone: '(555) 678-9012', appointmentTime: '11:00', duration: 30, encounterType: 'URGENT', status: 'ARRIVED',
    chiefComplaint: 'Chest pain, SOB x 2 days', visitType: 'Urgent', provider: 'Dr. Anderson',
    insurancePrimary: 'Blue Cross PPO', copay: 30, copayCollected: false, checkedInTime: '10:55',
    alerts: ['URGENT - Chest pain', 'Cardiac history'], flags: ['allergy', 'interpreter'],
    prepNotes: ['EKG ordered', 'Troponin ordered', 'Spanish interpreter requested'],
    pendingOrders: ['EKG', 'Troponin I', 'BMP', 'Chest X-ray'],
    medications: [{ name: 'Metoprolol', dose: '50mg BID' }, { name: 'Aspirin', dose: '81mg daily' }, { name: 'Atorvastatin', dose: '40mg daily' }]
  },
  {
    id: 7, patientId: 7, patientName: 'Garcia, Carlos', patientMrn: 'MRN001240', patientDob: '06/15/1968', patientAge: 55, patientGender: 'M',
    patientPhone: '(555) 789-0123', appointmentTime: '11:30', duration: 30, encounterType: 'FOLLOW_UP', status: 'PLANNED',
    chiefComplaint: 'Post-op follow-up, cholecystectomy 2 weeks ago', visitType: 'Follow-up', provider: 'Dr. Anderson',
    insurancePrimary: 'Cigna PPO', copay: 35, copayCollected: false,
    alerts: [], flags: [],
    prepNotes: ['Review surgical pathology', 'Check incision healing']
  },
  {
    id: 8, patientId: 8, patientName: 'Wilson, Patricia', patientMrn: 'MRN001239', patientDob: '12/03/1975', patientAge: 48, patientGender: 'F',
    patientPhone: '(555) 890-1234', appointmentTime: '13:00', duration: 45, encounterType: 'PHYSICAL', status: 'PLANNED',
    chiefComplaint: 'Annual physical, preventive care', visitType: 'Annual Physical', provider: 'Dr. Anderson',
    insurancePrimary: 'Aetna PPO', copay: 0, copayCollected: false,
    alerts: ['Overdue: Mammogram', 'Overdue: Colonoscopy'], flags: ['vip'],
    prepNotes: ['Pre-visit labs completed', 'PHQ-9 pending', 'Health maintenance review'],
    recentLabs: [{ name: 'Lipid Panel', value: 'LDL 142', date: '01/15/2024', abnormal: true }, { name: 'TSH', value: '2.1', date: '01/15/2024' }]
  },
  {
    id: 9, patientId: 9, patientName: 'Lee, David', patientMrn: 'MRN001242', patientDob: '08/20/1982', patientAge: 41, patientGender: 'M',
    patientPhone: '(555) 901-2345', appointmentTime: '14:00', duration: 20, encounterType: 'TELEHEALTH', status: 'PLANNED',
    chiefComplaint: 'Medication refill, depression stable', visitType: 'Telehealth', provider: 'Dr. Anderson',
    insurancePrimary: 'United Healthcare', copay: 20, copayCollected: false,
    alerts: [], flags: [],
    medications: [{ name: 'Bupropion', dose: '150mg BID' }]
  },
  {
    id: 10, patientId: 10, patientName: 'Thompson, Mary', patientMrn: 'MRN001243', patientDob: '01/10/1970', patientAge: 54, patientGender: 'F',
    patientPhone: '(555) 012-3456', appointmentTime: '14:30', duration: 30, encounterType: 'FOLLOW_UP', status: 'PLANNED',
    chiefComplaint: 'Thyroid follow-up, dose adjustment', visitType: 'Follow-up', provider: 'Dr. Anderson',
    insurancePrimary: 'Blue Shield HMO', copay: 25, copayCollected: false,
    alerts: [], flags: [],
    recentLabs: [{ name: 'TSH', value: '0.3', date: '01/12/2024', abnormal: true }, { name: 'Free T4', value: '1.8', date: '01/12/2024', abnormal: true }],
    medications: [{ name: 'Levothyroxine', dose: '100mcg daily' }]
  },
];

const statusConfig: Record<EncounterStatus, { label: string; color: string; bg: string }> = {
  PLANNED: { label: 'Scheduled', color: 'text-gray-700', bg: 'bg-gray-100' },
  ARRIVED: { label: 'Arrived', color: 'text-gray-700', bg: 'bg-gray-200' },
  TRIAGED: { label: 'Roomed', color: 'text-gray-700', bg: 'bg-gray-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-gray-800', bg: 'bg-gray-300' },
  ON_HOLD: { label: 'On Hold', color: 'text-gray-700', bg: 'bg-gray-200' },
  FINISHED: { label: 'Completed', color: 'text-gray-600', bg: 'bg-gray-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-600', bg: 'bg-gray-100' },
  ENTERED_IN_ERROR: { label: 'Error', color: 'text-gray-600', bg: 'bg-gray-100' },
  UNKNOWN: { label: 'Unknown', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const encounterTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
  OUTPATIENT: { label: 'Office', color: 'text-gray-700', bg: 'bg-gray-100' },
  TELEHEALTH: { label: 'Telehealth', color: 'text-gray-700', bg: 'bg-gray-100' },
  PROCEDURE: { label: 'Procedure', color: 'text-gray-700', bg: 'bg-gray-100' },
  NEW_PATIENT: { label: 'New Patient', color: 'text-gray-700', bg: 'bg-gray-100' },
  FOLLOW_UP: { label: 'Follow-up', color: 'text-gray-700', bg: 'bg-gray-100' },
  URGENT: { label: 'Urgent', color: 'text-gray-800', bg: 'bg-gray-200' },
  PHYSICAL: { label: 'Physical', color: 'text-gray-700', bg: 'bg-gray-100' },
};

const flagConfig: Record<string, { label: string; color: string; bg: string }> = {
  allergy: { label: 'ALLERGY', color: 'text-gray-800', bg: 'bg-gray-200' },
  'fall-risk': { label: 'FALL', color: 'text-gray-800', bg: 'bg-gray-200' },
  interpreter: { label: 'INTERP', color: 'text-gray-700', bg: 'bg-gray-100' },
  wheelchair: { label: 'WC', color: 'text-gray-700', bg: 'bg-gray-100' },
  vip: { label: 'VIP', color: 'text-gray-700', bg: 'bg-gray-100' },
  'new-patient': { label: 'NEW', color: 'text-gray-700', bg: 'bg-gray-100' },
};

type StatusFilter = 'all' | 'waiting' | 'in-progress' | 'completed';

export default function SchedulePage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date('2024-01-18'));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<ScheduleAppointment | null>(defaultAppointments[5]);
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    vitals: true,
    labs: true,
    meds: true,
    prep: true,
    orders: true,
  });
  const [appointments, setAppointments] = useState(defaultAppointments);

  // Modal states
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showNewApptDialog, setShowNewApptDialog] = useState(false);
  const [showLabDialog, setShowLabDialog] = useState(false);
  const [showRxDialog, setShowRxDialog] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const handleCheckIn = (apt: ScheduleAppointment) => {
    setAppointments(prev => prev.map(a => 
      a.id === apt.id ? { ...a, status: 'ARRIVED' as EncounterStatus, checkedInTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) } : a
    ));
    setShowAlert({ title: 'Patient Checked In', message: `${apt.patientName} has been checked in successfully.`, type: 'success' });
  };

  const handleRoom = (apt: ScheduleAppointment) => {
    setAppointments(prev => prev.map(a => 
      a.id === apt.id ? { ...a, status: 'TRIAGED' as EncounterStatus, roomedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), room: '104' } : a
    ));
    setShowAlert({ title: 'Patient Roomed', message: `${apt.patientName} has been roomed in Room 104.`, type: 'success' });
  };

  const handleStartVisit = (apt: ScheduleAppointment) => {
    setAppointments(prev => prev.map(a => 
      a.id === apt.id ? { ...a, status: 'IN_PROGRESS' as EncounterStatus } : a
    ));
    navigate(`/patients/${apt.patientId}`);
  };

  const filteredAppointments = appointments.filter(apt => {
    if (statusFilter === 'waiting') return apt.status === 'ARRIVED' || apt.status === 'TRIAGED';
    if (statusFilter === 'in-progress') return apt.status === 'IN_PROGRESS';
    if (statusFilter === 'completed') return apt.status === 'FINISHED';
    return true;
  }).filter(() => {
    return true;
  });

  const stats = {
    total: appointments.length,
    completed: appointments.filter(a => a.status === 'FINISHED').length,
    inProgress: appointments.filter(a => a.status === 'IN_PROGRESS').length,
    waiting: appointments.filter(a => a.status === 'ARRIVED' || a.status === 'TRIAGED').length,
    upcoming: appointments.filter(a => a.status === 'PLANNED').length,
  };

  return (
    <div className="h-full flex flex-col ehr-desktop">
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button className="ehr-toolbar-button flex items-center" onClick={() => setAppointments(defaultAppointments)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </button>
          <span className="text-gray-400">|</span>
          <button onClick={() => changeDate(-1)} className="ehr-toolbar-button p-1">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="ehr-toolbar-button flex items-center px-2">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            {formatDate(selectedDate)}
          </button>
          <button onClick={() => changeDate(1)} className="ehr-toolbar-button p-1">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setSelectedDate(new Date('2024-01-18'))} className="ehr-button text-[10px] px-2 py-0.5">
            Today
          </button>
          <span className="text-gray-400">|</span>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowNewApptDialog(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Appt
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="ehr-subheader flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>Total: <strong>{stats.total}</strong></span>
          <span>Completed: <strong>{stats.completed}</strong></span>
          <span>In Progress: <strong>{stats.inProgress}</strong></span>
          <span>Waiting: <strong>{stats.waiting}</strong></span>
          <span>Upcoming: <strong>{stats.upcoming}</strong></span>
        </div>
        <div className="flex items-center space-x-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'waiting', label: 'Waiting' },
            { key: 'in-progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key as StatusFilter)}
              className={`ehr-tab ${statusFilter === filter.key ? 'active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Appointment List */}
        <div className="flex-1 overflow-auto bg-white border-r border-gray-500">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0">
              <tr>
                <th className="px-1 py-1 text-left w-16">Time</th>
                <th className="px-1 py-1 text-left">Patient</th>
                <th className="px-1 py-1 text-left">Chief Complaint</th>
                <th className="px-1 py-1 text-left w-20">Type</th>
                <th className="px-1 py-1 text-left w-16">Room</th>
                <th className="px-1 py-1 text-left w-20">Status</th>
                <th className="px-1 py-1 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((apt, idx) => {
                const status = statusConfig[apt.status];
                const encounterType = encounterTypeConfig[apt.encounterType];
                const isSelected = selectedAppointment?.id === apt.id;
                const isUrgent = apt.encounterType === 'URGENT';
                
                return (
                  <tr
                    key={apt.id}
                    onClick={() => setSelectedAppointment(apt)}
                    className={`cursor-pointer ${
                      isSelected ? 'ehr-grid-row selected' : 
                      isUrgent ? 'ehr-alert-critical' : 
                      apt.status === 'FINISHED' ? 'opacity-50' : 
                      idx % 2 === 1 ? 'bg-gray-50' : ''
                    }`}
                    style={isSelected ? { background: '#316ac5', color: 'white' } : undefined}
                  >
                    <td className="px-1 py-1">
                      <div className="font-semibold">{formatTime(apt.appointmentTime)}</div>
                      <div className="text-[9px] text-gray-500">{apt.duration}m</div>
                    </td>
                    <td className="px-1 py-1">
                      <div className="font-semibold">{apt.patientName}</div>
                      <div className="text-[10px]" style={isSelected ? { color: '#ccc' } : { color: '#666' }}>
                        {apt.patientMrn} • {apt.patientAge}{apt.patientGender}
                      </div>
                      <div className="flex space-x-0.5 mt-0.5">
                        {apt.flags.map((flag) => {
                          const cfg = flagConfig[flag];
                          return (
                            <span key={flag} className={`px-0.5 py-0 text-[9px] ${isSelected ? 'bg-white/30' : `${cfg.bg} ${cfg.color}`}`}>
                              {cfg.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <div className="truncate max-w-[200px]">{apt.chiefComplaint}</div>
                      {apt.alerts.length > 0 && (
                        <div className={`text-[10px] flex items-center ${isSelected ? 'text-yellow-200' : 'text-red-600'}`}>
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          {apt.alerts[0]}
                        </div>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <span className={`px-1 py-0.5 text-[9px] ${isSelected ? 'bg-white/30' : `${encounterType.bg} ${encounterType.color}`}`}>
                        {encounterType.label}
                      </span>
                      {apt.encounterType === 'TELEHEALTH' && <Video className="w-3 h-3 inline ml-1" />}
                    </td>
                    <td className="px-1 py-1">
                      {apt.room ? (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-0.5" />{apt.room}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-1 py-1">
                      <span className={`px-1 py-0.5 text-[9px] ${isSelected ? 'bg-white/30' : `${status.bg} ${status.color}`}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-center">
                      {apt.status === 'PLANNED' && (
                        <button onClick={(e) => { e.stopPropagation(); handleCheckIn(apt); }} className="ehr-button ehr-button-primary text-[9px] px-1 py-0">
                          Check In
                        </button>
                      )}
                      {apt.status === 'ARRIVED' && (
                        <button onClick={(e) => { e.stopPropagation(); handleRoom(apt); }} className="ehr-button text-[9px] px-1 py-0" style={{ background: 'linear-gradient(to bottom, #9966cc 0%, #663399 100%)', color: 'white', border: '1px solid #4a2080' }}>
                          Room
                        </button>
                      )}
                      {(apt.status === 'TRIAGED' || apt.status === 'ARRIVED') && (
                        <button onClick={(e) => { e.stopPropagation(); handleStartVisit(apt); }} className="ehr-button text-[9px] px-1 py-0 ml-0.5" style={{ background: 'linear-gradient(to bottom, #66cc66 0%, #339933 100%)', color: 'white', border: '1px solid #206020' }}>
                          Start
                        </button>
                      )}
                      {apt.status === 'IN_PROGRESS' && apt.encounterType === 'TELEHEALTH' && (
                        <button onClick={(e) => { e.stopPropagation(); setShowAlert({ title: 'Telehealth', message: 'Launching video visit...', type: 'info' }); }} className="ehr-button ehr-button-primary text-[9px] px-1 py-0 flex items-center">
                          <Video className="w-3 h-3 mr-0.5" /> Join
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        <div className="w-80 flex flex-col overflow-hidden ehr-sidebar">
          {selectedAppointment ? (
            <>
              {/* Patient Header */}
              <div className="ehr-header flex items-center justify-between">
                <span>{selectedAppointment.patientName}</span>
                <button 
                  onClick={() => navigate(`/patients/${selectedAppointment.patientId}`)}
                  className="text-white/80 hover:text-white flex items-center text-[10px]"
                >
                  <ExternalLink className="w-3 h-3 mr-0.5" /> Chart
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-2 space-y-2">
                {/* Demographics */}
                <fieldset className="ehr-fieldset">
                  <legend>Patient Info</legend>
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr><td className="text-gray-500 pr-2">MRN:</td><td className="font-mono">{selectedAppointment.patientMrn}</td></tr>
                      <tr><td className="text-gray-500 pr-2">DOB:</td><td>{selectedAppointment.patientDob} ({selectedAppointment.patientAge}y {selectedAppointment.patientGender})</td></tr>
                      <tr><td className="text-gray-500 pr-2">Phone:</td><td>{selectedAppointment.patientPhone}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Insurance:</td><td>{selectedAppointment.insurancePrimary}</td></tr>
                      <tr>
                        <td className="text-gray-500 pr-2">Copay:</td>
                        <td className="flex items-center">
                          ${selectedAppointment.copay || 0}
                          {selectedAppointment.copayCollected ? (
                            <CheckCircle2 className="w-3 h-3 ml-1 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 ml-1 text-red-600" />
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {selectedAppointment.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedAppointment.flags.map((flag) => {
                        const cfg = flagConfig[flag];
                        return (
                          <span key={flag} className={`px-1 py-0.5 text-[9px] ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </fieldset>

                {/* Chief Complaint */}
                <fieldset className="ehr-fieldset">
                  <legend>Chief Complaint</legend>
                  <p className="text-[11px]">{selectedAppointment.chiefComplaint}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{selectedAppointment.visitType} • {selectedAppointment.duration} min</p>
                </fieldset>

                {/* Alerts */}
                {selectedAppointment.alerts.length > 0 && (
                  <div className="ehr-alert-critical p-2 border border-gray-400">
                    <div className="flex items-center font-semibold text-[11px] mb-1">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Alerts
                    </div>
                    {selectedAppointment.alerts.map((alert, i) => (
                      <div key={i} className="text-[10px]">• {alert}</div>
                    ))}
                  </div>
                )}

                {/* Pending Orders */}
                {selectedAppointment.pendingOrders && selectedAppointment.pendingOrders.length > 0 && (
                  <div className="ehr-alert-warning p-2 border border-gray-400">
                    <div className="flex items-center font-semibold text-[11px] mb-1">
                      <Clock className="w-3 h-3 mr-1" /> Pending Orders
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAppointment.pendingOrders.map((order, i) => (
                        <span key={i} className="px-1 py-0.5 bg-white border border-gray-400 text-[10px]">{order}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vitals */}
                {selectedAppointment.lastVitals && (
                  <div className="ehr-panel">
                    <div 
                      className="ehr-header flex items-center justify-between cursor-pointer text-[11px]"
                      onClick={(e) => { e.stopPropagation(); togglePanel('vitals'); }}
                    >
                      <div className="flex items-center">
                        <span className="w-3 h-3 mr-1 flex items-center justify-center border border-white/50 text-[9px] font-bold">
                          {expandedPanels.vitals ? '-' : '+'}
                        </span>
                        Vitals
                      </div>
                    </div>
                    {expandedPanels.vitals && (
                      <div className="bg-white p-2">
                        <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                          <div className="p-1 bg-gray-100 border border-gray-300">
                            <div className="text-gray-500">BP</div>
                            <div className={`font-semibold ${parseInt(selectedAppointment.lastVitals.bp) > 140 ? 'text-red-600' : ''}`}>
                              {selectedAppointment.lastVitals.bp}
                            </div>
                          </div>
                          <div className="p-1 bg-gray-100 border border-gray-300">
                            <div className="text-gray-500">HR</div>
                            <div className="font-semibold">{selectedAppointment.lastVitals.hr}</div>
                          </div>
                          <div className="p-1 bg-gray-100 border border-gray-300">
                            <div className="text-gray-500">Temp</div>
                            <div className="font-semibold">{selectedAppointment.lastVitals.temp}°</div>
                          </div>
                          <div className="p-1 bg-gray-100 border border-gray-300">
                            <div className="text-gray-500">SpO2</div>
                            <div className="font-semibold">{selectedAppointment.lastVitals.spo2}%</div>
                          </div>
                          <div className="p-1 bg-gray-100 border border-gray-300">
                            <div className="text-gray-500">Wt</div>
                            <div className="font-semibold">{selectedAppointment.lastVitals.weight}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Prep Notes */}
                {selectedAppointment.prepNotes && selectedAppointment.prepNotes.length > 0 && (
                  <div className="ehr-panel">
                    <div 
                      className="ehr-header flex items-center justify-between cursor-pointer text-[11px]"
                      onClick={(e) => { e.stopPropagation(); togglePanel('prep'); }}
                    >
                      <div className="flex items-center">
                        <span className="w-3 h-3 mr-1 flex items-center justify-center border border-white/50 text-[9px] font-bold">
                          {expandedPanels.prep ? '-' : '+'}
                        </span>
                        Prep Notes
                      </div>
                    </div>
                    {expandedPanels.prep && (
                      <div className="bg-white p-2 text-[10px]">
                        {selectedAppointment.prepNotes.map((note, i) => (
                          <div key={i} className="flex items-start mb-1">
                            <span className="mr-1.5">•</span>
                            {note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Labs */}
                {selectedAppointment.recentLabs && selectedAppointment.recentLabs.length > 0 && (
                  <div className="ehr-panel">
                    <div 
                      className="ehr-header flex items-center justify-between cursor-pointer text-[11px]"
                      onClick={(e) => { e.stopPropagation(); togglePanel('labs'); }}
                    >
                      <div className="flex items-center">
                        <span className="w-3 h-3 mr-1 flex items-center justify-center border border-white/50 text-[9px] font-bold">
                          {expandedPanels.labs ? '-' : '+'}
                        </span>
                        Recent Labs
                      </div>
                    </div>
                    {expandedPanels.labs && (
                      <div className="bg-white">
                        {selectedAppointment.recentLabs.map((lab, i) => (
                          <div key={i} className={`flex items-center justify-between px-2 py-1 text-[10px] ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                            <span>{lab.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className={lab.abnormal ? 'text-red-600 font-semibold' : ''}>{lab.value}</span>
                              <span className="text-gray-400">{lab.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Medications */}
                {selectedAppointment.medications && selectedAppointment.medications.length > 0 && (
                  <div className="ehr-panel">
                    <div 
                      className="ehr-header flex items-center justify-between cursor-pointer text-[11px]"
                      onClick={(e) => { e.stopPropagation(); togglePanel('meds'); }}
                    >
                      <div className="flex items-center">
                        <span className="w-3 h-3 mr-1 flex items-center justify-center border border-white/50 text-[9px] font-bold">
                          {expandedPanels.meds ? '-' : '+'}
                        </span>
                        Medications
                      </div>
                    </div>
                    {expandedPanels.meds && (
                      <div className="bg-white">
                        {selectedAppointment.medications.map((med, i) => (
                          <div key={i} className={`flex items-center justify-between px-2 py-1 text-[10px] ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                            <span className="font-medium">{med.name}</span>
                            <span className="text-gray-500">{med.dose}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <fieldset className="ehr-fieldset">
                  <legend>Quick Actions</legend>
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => navigate(`/patients/${selectedAppointment.patientId}`)} className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <FileText className="w-3.5 h-3.5" />
                      Note
                    </button>
                    <button onClick={() => setShowRxDialog(true)} className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <Pill className="w-3.5 h-3.5" />
                      Rx
                    </button>
                    <button onClick={() => setShowLabDialog(true)} className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <FlaskConical className="w-3.5 h-3.5" />
                      Labs
                    </button>
                    <button onClick={() => setShowAlert({ title: 'Message', message: 'Opening secure messaging...', type: 'info' })} className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </button>
                    <button onClick={() => setShowAlert({ title: 'Call Patient', message: `Calling ${selectedAppointment.patientPhone}...`, type: 'info' })} className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </button>
                    <button onClick={() => setShowAlert({ title: 'Consult', message: 'Opening consult order form...', type: 'info' })} className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <Stethoscope className="w-3.5 h-3.5" />
                      Consult
                    </button>
                  </div>
                </fieldset>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <User className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-[11px]">Select an appointment</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>Schedule for {formatDate(selectedDate)} | {filteredAppointments.length} appointment(s)</span>
        <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Dialogs */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        title="Print Schedule"
        documentName={`Daily Schedule - ${formatDate(selectedDate)}`}
        onPrint={(options) => {
          setShowAlert({ title: 'Print', message: `Sending schedule to printer (${options.copies} copies, ${options.orientation})...`, type: 'info' });
        }}
      />

      <Modal
        isOpen={showNewApptDialog}
        onClose={() => setShowNewApptDialog(false)}
        title="Schedule New Appointment"
        width="lg"
        footer={
          <>
            <button onClick={() => setShowNewApptDialog(false)} className="ehr-button px-4">Cancel</button>
            <button onClick={() => { setShowNewApptDialog(false); setShowAlert({ title: 'Appointment Scheduled', message: 'New appointment has been added to the schedule.', type: 'success' }); }} className="ehr-button ehr-button-primary px-4">Schedule</button>
          </>
        }
      >
        <div className="space-y-3">
          <fieldset className="ehr-fieldset">
            <legend>Patient</legend>
            <div className="flex items-center space-x-2">
              <input type="text" placeholder="Search patient by name or MRN..." className="ehr-input flex-1" />
              <button className="ehr-button">Search</button>
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <fieldset className="ehr-fieldset">
              <legend>Date & Time</legend>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Date</label>
                  <input type="date" defaultValue="2024-01-18" className="ehr-input w-full" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Time</label>
                  <select className="ehr-input w-full">
                    <option>9:00 AM</option>
                    <option>9:30 AM</option>
                    <option>10:00 AM</option>
                    <option>10:30 AM</option>
                    <option>11:00 AM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Duration</label>
                  <select className="ehr-input w-full">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>45 minutes</option>
                    <option>60 minutes</option>
                  </select>
                </div>
              </div>
            </fieldset>
            <fieldset className="ehr-fieldset">
              <legend>Visit Details</legend>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Visit Type</label>
                  <select className="ehr-input w-full">
                    <option>Follow-up</option>
                    <option>New Patient</option>
                    <option>Annual Physical</option>
                    <option>Urgent</option>
                    <option>Telehealth</option>
                    <option>Procedure</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Provider</label>
                  <select className="ehr-input w-full">
                    <option>Dr. Anderson</option>
                    <option>Dr. Chen</option>
                    <option>Dr. Patel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 mb-0.5">Reason for Visit</label>
                  <input type="text" placeholder="Chief complaint..." className="ehr-input w-full" />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </Modal>

      <OrderDialog
        isOpen={showLabDialog}
        onClose={() => setShowLabDialog(false)}
        type="lab"
        patientName={selectedAppointment?.patientName}
        patientMrn={selectedAppointment?.patientMrn}
        onSubmit={(orders) => {
          setShowAlert({ title: 'Labs Ordered', message: `${orders.length} lab test(s) have been ordered and sent to the lab.`, type: 'success' });
        }}
      />

      <PrescriptionDialog
        isOpen={showRxDialog}
        onClose={() => setShowRxDialog(false)}
        patientName={selectedAppointment?.patientName}
        patientMrn={selectedAppointment?.patientMrn}
        patientAllergies={selectedAppointment?.flags.includes('allergy') ? ['Penicillin', 'Sulfa'] : []}
        onSubmit={(rx) => {
          setShowAlert({ title: 'Prescription Sent', message: `${rx.medication} ${rx.strength} has been sent to ${rx.pharmacy}.`, type: 'success' });
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
