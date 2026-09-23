import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Pill, 
  AlertTriangle,
  User,
  RefreshCw,
  Plus,
  Printer,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  ShieldAlert,
  Info,
  Ban,
  Zap,
  Calendar,
  Building2,
  Phone
} from 'lucide-react';
import type { MedicationOrderStatus } from '../types';
import { AlertDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';
import { PrescriptionDialog } from '../components/ui/PrescriptionDialog';

interface MedicationOrderExtended {
  id: number;
  orderNumber: string;
  patientId: number;
  patientName: string;
  patientMrn: string;
  patientDob: string;
  medicationName: string;
  genericName: string;
  strength: string;
  form: string;
  ndc: string;
  rxnorm: string;
  prescriberId: number;
  prescriberName: string;
  orderDateTime: string;
  status: MedicationOrderStatus;
  dose: string;
  route: string;
  frequency: string;
  sig: string;
  startDate: string;
  endDate?: string;
  quantity: number;
  refills: number;
  refillsRemaining: number;
  daysSupply: number;
  dispenseAsWritten: boolean;
  prn: boolean;
  prnReason?: string;
  pharmacy: string;
  pharmacyPhone: string;
  pharmacyNpi: string;
  lastFilled?: string;
  nextRefillDate?: string;
  controlled: boolean;
  schedule?: string;
  formularyStatus: 'preferred' | 'non-preferred' | 'not-covered' | 'prior-auth';
  therapeuticClass: string;
  interactions: { drug: string; severity: 'high' | 'moderate' | 'low'; description: string }[];
  allergies: string[];
  duplicateTherapy?: string;
  renalDoseAlert?: string;
  geriatricAlert?: string;
}

const defaultMedicationOrders: MedicationOrderExtended[] = [
  {
    id: 1, orderNumber: 'RX-2024-00147', patientId: 1, patientName: 'Smith, John', patientMrn: 'MRN001234', patientDob: '03/15/1965',
    medicationName: 'Metformin HCl ER', genericName: 'Metformin', strength: '500mg', form: 'Tablet, Extended Release', ndc: '00378-7252-01', rxnorm: '861007',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-15T10:30:00', status: 'ACTIVE',
    dose: '500mg', route: 'Oral', frequency: 'BID', sig: 'Take 1 tablet by mouth twice daily with meals',
    startDate: '2024-01-15', quantity: 60, refills: 3, refillsRemaining: 2, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'CVS Pharmacy #4521', pharmacyPhone: '(555) 123-4567', pharmacyNpi: '1234567890',
    lastFilled: '2024-01-15', nextRefillDate: '2024-02-10', controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'Antidiabetic - Biguanide',
    interactions: [], allergies: [],
    renalDoseAlert: 'eGFR 72 - Monitor renal function'
  },
  {
    id: 2, orderNumber: 'RX-2024-00148', patientId: 1, patientName: 'Smith, John', patientMrn: 'MRN001234', patientDob: '03/15/1965',
    medicationName: 'Lisinopril', genericName: 'Lisinopril', strength: '10mg', form: 'Tablet', ndc: '00378-0839-01', rxnorm: '314076',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-15T10:32:00', status: 'ACTIVE',
    dose: '10mg', route: 'Oral', frequency: 'Daily', sig: 'Take 1 tablet by mouth once daily in the morning',
    startDate: '2024-01-15', quantity: 30, refills: 5, refillsRemaining: 4, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'CVS Pharmacy #4521', pharmacyPhone: '(555) 123-4567', pharmacyNpi: '1234567890',
    lastFilled: '2024-01-15', nextRefillDate: '2024-02-10', controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'ACE Inhibitor',
    interactions: [{ drug: 'Potassium Chloride', severity: 'moderate', description: 'May increase risk of hyperkalemia' }],
    allergies: [],
  },
  {
    id: 3, orderNumber: 'RX-2024-00152', patientId: 2, patientName: 'Johnson, Sarah', patientMrn: 'MRN001235', patientDob: '07/22/1978',
    medicationName: 'Atorvastatin Calcium', genericName: 'Atorvastatin', strength: '20mg', form: 'Tablet', ndc: '00378-3952-01', rxnorm: '617312',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-16T14:00:00', status: 'ACTIVE',
    dose: '20mg', route: 'Oral', frequency: 'QHS', sig: 'Take 1 tablet by mouth at bedtime',
    startDate: '2024-01-16', quantity: 30, refills: 5, refillsRemaining: 5, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'Walgreens #1892', pharmacyPhone: '(555) 234-5678', pharmacyNpi: '2345678901',
    lastFilled: '2024-01-16', nextRefillDate: '2024-02-12', controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'HMG-CoA Reductase Inhibitor',
    interactions: [], allergies: [],
  },
  {
    id: 4, orderNumber: 'RX-2024-00158', patientId: 3, patientName: 'Williams, Michael', patientMrn: 'MRN001236', patientDob: '11/08/1961',
    medicationName: 'Omeprazole', genericName: 'Omeprazole', strength: '20mg', form: 'Capsule, Delayed Release', ndc: '00378-5220-01', rxnorm: '402014',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-17T09:15:00', status: 'PENDING',
    dose: '20mg', route: 'Oral', frequency: 'Daily AC', sig: 'Take 1 capsule by mouth once daily before breakfast',
    startDate: '2024-01-17', quantity: 30, refills: 2, refillsRemaining: 2, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'CVS Pharmacy #4521', pharmacyPhone: '(555) 123-4567', pharmacyNpi: '1234567890',
    controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'Proton Pump Inhibitor',
    interactions: [], allergies: [],
  },
  {
    id: 5, orderNumber: 'RX-2024-00161', patientId: 4, patientName: 'Brown, Emily', patientMrn: 'MRN001237', patientDob: '04/30/1989',
    medicationName: 'Amlodipine Besylate', genericName: 'Amlodipine', strength: '5mg', form: 'Tablet', ndc: '00378-0055-01', rxnorm: '329528',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-17T11:30:00', status: 'ACTIVE',
    dose: '5mg', route: 'Oral', frequency: 'Daily', sig: 'Take 1 tablet by mouth once daily',
    startDate: '2024-01-17', quantity: 30, refills: 5, refillsRemaining: 5, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'Rite Aid #892', pharmacyPhone: '(555) 345-6789', pharmacyNpi: '3456789012',
    lastFilled: '2024-01-17', nextRefillDate: '2024-02-13', controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'Calcium Channel Blocker',
    interactions: [], allergies: [],
  },
  {
    id: 6, orderNumber: 'RX-2024-00165', patientId: 5, patientName: 'Davis, Robert', patientMrn: 'MRN001238', patientDob: '09/12/1952',
    medicationName: 'Hydrocodone/Acetaminophen', genericName: 'Hydrocodone/APAP', strength: '5-325mg', form: 'Tablet', ndc: '00406-0367-01', rxnorm: '857001',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-18T08:00:00', status: 'ACTIVE',
    dose: '5-325mg', route: 'Oral', frequency: 'Q6H PRN', sig: 'Take 1 tablet by mouth every 6 hours as needed for pain',
    startDate: '2024-01-18', endDate: '2024-01-25', quantity: 20, refills: 0, refillsRemaining: 0, daysSupply: 7, dispenseAsWritten: true, prn: true, prnReason: 'Pain',
    pharmacy: 'CVS Pharmacy #4521', pharmacyPhone: '(555) 123-4567', pharmacyNpi: '1234567890',
    lastFilled: '2024-01-18', controlled: true, schedule: 'C-II', formularyStatus: 'preferred',
    therapeuticClass: 'Opioid Analgesic',
    interactions: [
      { drug: 'Sertraline', severity: 'high', description: 'Increased risk of serotonin syndrome' },
      { drug: 'Lorazepam', severity: 'high', description: 'CNS depression, respiratory depression risk' }
    ],
    allergies: [],
    geriatricAlert: 'Age 71 - Use caution with opioids in elderly'
  },
  {
    id: 7, orderNumber: 'RX-2024-00142', patientId: 6, patientName: 'Martinez, Ana', patientMrn: 'MRN001241', patientDob: '02/28/1956',
    medicationName: 'Levothyroxine Sodium', genericName: 'Levothyroxine', strength: '50mcg', form: 'Tablet', ndc: '00378-1805-01', rxnorm: '966224',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-10T10:00:00', status: 'DISCONTINUED',
    dose: '50mcg', route: 'Oral', frequency: 'Daily', sig: 'Take 1 tablet by mouth once daily on empty stomach',
    startDate: '2024-01-10', endDate: '2024-01-17', quantity: 30, refills: 5, refillsRemaining: 5, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'Walgreens #1892', pharmacyPhone: '(555) 234-5678', pharmacyNpi: '2345678901',
    controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'Thyroid Hormone',
    interactions: [], allergies: [],
  },
  {
    id: 8, orderNumber: 'RX-2024-00168', patientId: 6, patientName: 'Martinez, Ana', patientMrn: 'MRN001241', patientDob: '02/28/1956',
    medicationName: 'Levothyroxine Sodium', genericName: 'Levothyroxine', strength: '75mcg', form: 'Tablet', ndc: '00378-1810-01', rxnorm: '966230',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-17T14:05:00', status: 'ACTIVE',
    dose: '75mcg', route: 'Oral', frequency: 'Daily', sig: 'Take 1 tablet by mouth once daily on empty stomach',
    startDate: '2024-01-17', quantity: 30, refills: 5, refillsRemaining: 5, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'Walgreens #1892', pharmacyPhone: '(555) 234-5678', pharmacyNpi: '2345678901',
    lastFilled: '2024-01-17', nextRefillDate: '2024-02-13', controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'Thyroid Hormone',
    interactions: [], allergies: [],
  },
  {
    id: 9, orderNumber: 'RX-2024-00171', patientId: 7, patientName: 'Garcia, Carlos', patientMrn: 'MRN001240', patientDob: '06/15/1968',
    medicationName: 'Gabapentin', genericName: 'Gabapentin', strength: '300mg', form: 'Capsule', ndc: '00378-4130-01', rxnorm: '310429',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-18T09:30:00', status: 'PENDING',
    dose: '300mg', route: 'Oral', frequency: 'TID', sig: 'Take 1 capsule by mouth three times daily',
    startDate: '2024-01-18', quantity: 90, refills: 2, refillsRemaining: 2, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'CVS Pharmacy #4521', pharmacyPhone: '(555) 123-4567', pharmacyNpi: '1234567890',
    controlled: false, formularyStatus: 'prior-auth',
    therapeuticClass: 'Anticonvulsant - GABA Analog',
    interactions: [], allergies: [],
    renalDoseAlert: 'Verify renal function - dose adjustment may be needed'
  },
  {
    id: 10, orderNumber: 'RX-2024-00175', patientId: 8, patientName: 'Wilson, Patricia', patientMrn: 'MRN001239', patientDob: '12/03/1975',
    medicationName: 'Sertraline HCl', genericName: 'Sertraline', strength: '50mg', form: 'Tablet', ndc: '00378-4187-01', rxnorm: '312938',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-18T10:15:00', status: 'ACTIVE',
    dose: '50mg', route: 'Oral', frequency: 'Daily', sig: 'Take 1 tablet by mouth once daily in the morning',
    startDate: '2024-01-18', quantity: 30, refills: 5, refillsRemaining: 5, daysSupply: 30, dispenseAsWritten: false, prn: false,
    pharmacy: 'Rite Aid #892', pharmacyPhone: '(555) 345-6789', pharmacyNpi: '3456789012',
    lastFilled: '2024-01-18', nextRefillDate: '2024-02-14', controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'SSRI Antidepressant',
    interactions: [], allergies: [],
  },
  {
    id: 11, orderNumber: 'RX-2024-00178', patientId: 9, patientName: 'Lee, David', patientMrn: 'MRN001242', patientDob: '08/20/1982',
    medicationName: 'Alprazolam', genericName: 'Alprazolam', strength: '0.5mg', form: 'Tablet', ndc: '00378-4003-01', rxnorm: '308047',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-18T11:00:00', status: 'PENDING',
    dose: '0.5mg', route: 'Oral', frequency: 'BID PRN', sig: 'Take 1 tablet by mouth twice daily as needed for anxiety',
    startDate: '2024-01-18', quantity: 60, refills: 0, refillsRemaining: 0, daysSupply: 30, dispenseAsWritten: false, prn: true, prnReason: 'Anxiety',
    pharmacy: 'CVS Pharmacy #4521', pharmacyPhone: '(555) 123-4567', pharmacyNpi: '1234567890',
    controlled: true, schedule: 'C-IV', formularyStatus: 'preferred',
    therapeuticClass: 'Benzodiazepine',
    interactions: [
      { drug: 'Bupropion', severity: 'moderate', description: 'May lower seizure threshold' }
    ],
    allergies: [],
  },
  {
    id: 12, orderNumber: 'RX-2024-00112', patientId: 1, patientName: 'Smith, John', patientMrn: 'MRN001234', patientDob: '03/15/1965',
    medicationName: 'Amoxicillin', genericName: 'Amoxicillin', strength: '500mg', form: 'Capsule', ndc: '00378-0510-01', rxnorm: '308182',
    prescriberId: 1, prescriberName: 'Dr. Anderson', orderDateTime: '2024-01-05T09:00:00', status: 'COMPLETED',
    dose: '500mg', route: 'Oral', frequency: 'TID', sig: 'Take 1 capsule by mouth three times daily for 10 days',
    startDate: '2024-01-05', endDate: '2024-01-15', quantity: 30, refills: 0, refillsRemaining: 0, daysSupply: 10, dispenseAsWritten: false, prn: false,
    pharmacy: 'CVS Pharmacy #4521', pharmacyPhone: '(555) 123-4567', pharmacyNpi: '1234567890',
    lastFilled: '2024-01-05', controlled: false, formularyStatus: 'preferred',
    therapeuticClass: 'Penicillin Antibiotic',
    interactions: [], allergies: ['Penicillin - ALLERGY OVERRIDE'],
    duplicateTherapy: 'Patient has documented Penicillin allergy - verify override'
  },
];

const statusConfig: Record<MedicationOrderStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100' },
  PENDING: { label: 'Pending', color: 'text-gray-700', bg: 'bg-gray-200' },
  ACTIVE: { label: 'Active', color: 'text-gray-800', bg: 'bg-gray-300' },
  ON_HOLD: { label: 'On Hold', color: 'text-gray-700', bg: 'bg-gray-200' },
  COMPLETED: { label: 'Completed', color: 'text-gray-600', bg: 'bg-gray-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-600', bg: 'bg-gray-100' },
  DISCONTINUED: { label: 'D/C', color: 'text-gray-600', bg: 'bg-gray-100' },
  ENTERED_IN_ERROR: { label: 'Error', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const formularyConfig = {
  'preferred': { label: 'Preferred', color: 'text-gray-700', bg: 'bg-gray-100', icon: CheckCircle2 },
  'non-preferred': { label: 'Non-Preferred', color: 'text-gray-700', bg: 'bg-gray-200', icon: Info },
  'not-covered': { label: 'Not Covered', color: 'text-gray-800', bg: 'bg-gray-200', icon: XCircle },
  'prior-auth': { label: 'Prior Auth Req', color: 'text-gray-700', bg: 'bg-gray-200', icon: FileText },
};

type FilterStatus = 'all' | 'active' | 'pending' | 'discontinued' | 'controlled';
type ViewMode = 'all' | 'by-patient';

export default function MedicationsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<MedicationOrderExtended | null>(defaultMedicationOrders[5]);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set(['MRN001234']));
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [expandedPanels, setExpandedPanels] = useState<Record<string, boolean>>({
    details: true,
    pharmacy: true,
    alerts: true,
  });
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showRxDialog, setShowRxDialog] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);

  const togglePanel = (panel: string) => {
    setExpandedPanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  };

  const filteredOrders = defaultMedicationOrders.filter(order => {
    const matchesSearch = 
      order.medicationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.orderNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && order.status === 'ACTIVE') ||
      (filterStatus === 'pending' && order.status === 'PENDING') ||
      (filterStatus === 'discontinued' && (order.status === 'DISCONTINUED' || order.status === 'COMPLETED')) ||
      (filterStatus === 'controlled' && order.controlled);
    
    return matchesSearch && matchesFilter;
  });

  const ordersByPatient = filteredOrders.reduce((acc, order) => {
    if (!acc[order.patientMrn]) {
      acc[order.patientMrn] = { patient: { name: order.patientName, mrn: order.patientMrn, dob: order.patientDob, id: order.patientId }, orders: [] };
    }
    acc[order.patientMrn].orders.push(order);
    return acc;
  }, {} as Record<string, { patient: { name: string; mrn: string; dob: string; id: number }; orders: MedicationOrderExtended[] }>);

  const stats = {
    total: defaultMedicationOrders.length,
    active: defaultMedicationOrders.filter(o => o.status === 'ACTIVE').length,
    pending: defaultMedicationOrders.filter(o => o.status === 'PENDING').length,
    controlled: defaultMedicationOrders.filter(o => o.controlled && o.status === 'ACTIVE').length,
    withAlerts: defaultMedicationOrders.filter(o => o.interactions.length > 0 || o.allergies.length > 0 || o.renalDoseAlert || o.geriatricAlert).length,
  };

  const togglePatient = (mrn: string) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(mrn)) {
      newExpanded.delete(mrn);
    } else {
      newExpanded.add(mrn);
    }
    setExpandedPatients(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  };

  const getInteractionIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <ShieldAlert className="w-3 h-3 text-red-600" />;
      case 'moderate': return <AlertTriangle className="w-3 h-3 text-amber-600" />;
      default: return <Info className="w-3 h-3 text-blue-600" />;
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--ehr-desktop)' }}>
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowAlert({ title: 'Refreshed', message: 'Medication list has been refreshed.', type: 'info' })}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </button>
          <span className="text-gray-400">|</span>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowRxDialog(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Rx
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Search:</span>
          <input
            type="text"
            placeholder="Medication, patient, Rx#..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ehr-input w-48"
          />
          <button className="ehr-button ehr-button-primary flex items-center">
            <Search className="w-3 h-3 mr-1" /> Find
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="ehr-subheader flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="flex items-center"><Pill className="w-3 h-3 mr-1" /> Total: <strong className="ml-1">{stats.total}</strong></span>
          <span>Active: <strong>{stats.active}</strong></span>
          <span>Pending: <strong>{stats.pending}</strong></span>
          <span>Controlled: <strong>{stats.controlled}</strong></span>
          <span>w/Alerts: <strong>{stats.withAlerts}</strong></span>
        </div>
        <div className="flex items-center space-x-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'pending', label: 'Pending' },
            { key: 'controlled', label: 'Controlled' },
            { key: 'discontinued', label: 'D/C' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key as FilterStatus)}
              className={`ehr-tab ${filterStatus === filter.key ? 'active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
          <span className="text-gray-400 mx-1">|</span>
          <button
            onClick={() => setViewMode('all')}
            className={`ehr-tab ${viewMode === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode('by-patient')}
            className={`ehr-tab ${viewMode === 'by-patient' ? 'active' : ''}`}
          >
            By Patient
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Medication List */}
        <div className="flex-1 overflow-auto bg-white border-r border-gray-500">
          {viewMode === 'by-patient' ? (
            <div>
              {Object.entries(ordersByPatient).map(([mrn, { patient, orders }]) => (
                <div key={mrn} className="border-b border-gray-300">
                  <div
                    onClick={() => togglePatient(mrn)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-4 h-4 border border-gray-500 bg-white flex items-center justify-center text-[10px] font-bold">
                        {expandedPatients.has(mrn) ? '-' : '+'}
                      </span>
                      <span className="font-semibold">{patient.name}</span>
                      <span className="text-gray-500">{patient.mrn}</span>
                      <span className="text-gray-400">DOB: {patient.dob}</span>
                    </div>
                    <span className="text-gray-500">{orders.length} meds</span>
                  </div>
                  {expandedPatients.has(mrn) && (
                    <div>
                      {orders.map((order, idx) => (
                        <OrderRow key={order.id} order={order} selected={selectedOrder?.id === order.id} onSelect={() => setSelectedOrder(order)} idx={idx} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0">
                <tr>
                  <th className="px-1 py-1 text-left">Medication</th>
                  <th className="px-1 py-1 text-left">Patient</th>
                  <th className="px-1 py-1 text-left">Sig</th>
                  <th className="px-1 py-1 text-left w-16">Status</th>
                  <th className="px-1 py-1 text-left w-14">Refills</th>
                  <th className="px-1 py-1 text-center w-16">Alerts</th>
                  <th className="px-1 py-1 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => {
                  const status = statusConfig[order.status];
                  const hasAlerts = order.interactions.length > 0 || order.allergies.length > 0 || order.renalDoseAlert || order.geriatricAlert;
                  const isSelected = selectedOrder?.id === order.id;
                  
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`cursor-pointer ${
                        isSelected ? 'ehr-grid-row selected' : 
                        order.status === 'DISCONTINUED' || order.status === 'COMPLETED' ? 'opacity-50' : 
                        idx % 2 === 1 ? 'bg-gray-50' : ''
                      }`}
                      style={isSelected ? { background: '#316ac5', color: 'white' } : undefined}
                    >
                      <td className="px-1 py-1">
                        <div className="flex items-center space-x-1">
                          {order.controlled && (
                            <span className={`px-0.5 py-0 text-[9px] font-bold ${isSelected ? 'bg-white/30' : 'bg-gray-200 text-gray-800 border border-gray-400'}`}>
                              {order.schedule}
                            </span>
                          )}
                          <div>
                            <div className="font-semibold">{order.medicationName} {order.strength}</div>
                            <div className="text-[10px]" style={isSelected ? { color: '#ccc' } : { color: '#666' }}>
                              {order.form} • {order.orderNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-1 py-1">
                        <div>{order.patientName}</div>
                        <div className="text-[10px]" style={isSelected ? { color: '#ccc' } : { color: '#666' }}>{order.patientMrn}</div>
                      </td>
                      <td className="px-1 py-1">
                        <div className="truncate max-w-[180px]">{order.sig}</div>
                        {order.prn && (
                          <span className={`text-[9px] ${isSelected ? 'text-yellow-200' : 'text-amber-600'}`}>PRN - {order.prnReason}</span>
                        )}
                      </td>
                      <td className="px-1 py-1">
                        <span className={`px-1 py-0.5 text-[9px] ${isSelected ? 'bg-white/30' : `${status.bg} ${status.color}`}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-1 py-1">
                        <span className={order.refillsRemaining === 0 && !isSelected ? 'text-red-600 font-semibold' : ''}>
                          {order.refillsRemaining}/{order.refills}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        {hasAlerts ? (
                          <div className="flex items-center justify-center space-x-0.5">
                            {order.interactions.length > 0 && <AlertTriangle className={`w-3 h-3 ${isSelected ? 'text-yellow-200' : 'text-red-500'}`} />}
                            {order.allergies.length > 0 && <Ban className={`w-3 h-3 ${isSelected ? 'text-orange-200' : 'text-orange-500'}`} />}
                            {order.renalDoseAlert && <Zap className={`w-3 h-3 ${isSelected ? 'text-purple-200' : 'text-purple-500'}`} />}
                            {order.geriatricAlert && <User className={`w-3 h-3 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`} />}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-1 py-1 text-center">
                        {order.status === 'PENDING' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowAlert({ title: 'Order Signed', message: `${order.medicationName} ${order.strength} has been signed and sent to pharmacy.`, type: 'success' }); }}
                            className="ehr-button text-[9px] px-1 py-0" 
                            style={{ background: 'linear-gradient(to bottom, #66cc66 0%, #339933 100%)', color: 'white', border: '1px solid #206020' }}
                          >
                            Sign
                          </button>
                        )}
                        {order.status === 'ACTIVE' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShowAlert({ title: 'Renewal Sent', message: `Renewal request for ${order.medicationName} has been sent to pharmacy.`, type: 'success' }); }}
                            className="ehr-button text-[9px] px-1 py-0"
                          >
                            Renew
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        <div className="w-80 flex flex-col overflow-hidden" style={{ background: 'var(--ehr-sidebar)' }}>
          {selectedOrder ? (
            <>
              {/* Medication Header */}
              <div className="ehr-header flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {selectedOrder.controlled && (
                    <span className="px-1 py-0.5 bg-gray-300 text-gray-800 text-[9px] font-bold border border-gray-500">{selectedOrder.schedule}</span>
                  )}
                  <span className="truncate">{selectedOrder.medicationName}</span>
                </div>
                <span className={`px-1 py-0.5 text-[9px] ${statusConfig[selectedOrder.status].bg} ${statusConfig[selectedOrder.status].color}`}>
                  {statusConfig[selectedOrder.status].label}
                </span>
              </div>
              
              <div className="flex-1 overflow-auto p-2 space-y-2">
                {/* Patient Info */}
                <fieldset className="ehr-fieldset">
                  <legend>Patient</legend>
                  <div className="flex items-center justify-between text-[10px]">
                    <div>
                      <div className="font-semibold">{selectedOrder.patientName}</div>
                      <div className="text-gray-500">{selectedOrder.patientMrn} • DOB: {selectedOrder.patientDob}</div>
                    </div>
                    <button 
                      onClick={() => navigate(`/patients/${selectedOrder.patientId}`)}
                      className="ehr-button flex items-center text-[9px]"
                    >
                      <ExternalLink className="w-3 h-3 mr-0.5" /> Chart
                    </button>
                  </div>
                </fieldset>

                {/* Medication Info */}
                <fieldset className="ehr-fieldset">
                  <legend>Medication</legend>
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr><td className="text-gray-500 pr-2">Drug:</td><td className="font-semibold">{selectedOrder.medicationName} {selectedOrder.strength}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Form:</td><td>{selectedOrder.form}</td></tr>
                      <tr><td className="text-gray-500 pr-2">NDC:</td><td className="font-mono">{selectedOrder.ndc}</td></tr>
                      <tr><td className="text-gray-500 pr-2">RxNorm:</td><td className="font-mono">{selectedOrder.rxnorm}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Class:</td><td>{selectedOrder.therapeuticClass}</td></tr>
                    </tbody>
                  </table>
                </fieldset>

                {/* Prescription Details */}
                <div className="ehr-panel">
                  <div 
                    className="ehr-header flex items-center justify-between cursor-pointer text-[11px]"
                    onClick={() => togglePanel('details')}
                  >
                    <div className="flex items-center">
                      <span className="w-4 h-4 border border-gray-400 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                        {expandedPanels.details ? '-' : '+'}
                      </span>
                      <FileText className="w-3 h-3 mr-1" /> Rx Details
                    </div>
                  </div>
                  {expandedPanels.details && (
                    <div className="bg-white p-2">
                      <div className="p-1.5 bg-gray-100 border border-gray-300 mb-2">
                        <div className="text-[9px] text-gray-500 uppercase">Sig</div>
                        <div className="text-[11px]">{selectedOrder.sig}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                        <div className="flex justify-between"><span className="text-gray-500">Dose:</span><span className="font-medium">{selectedOrder.dose}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Route:</span><span className="font-medium">{selectedOrder.route}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Freq:</span><span className="font-medium">{selectedOrder.frequency}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Qty:</span><span className="font-medium">{selectedOrder.quantity}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Days:</span><span className="font-medium">{selectedOrder.daysSupply}</span></div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Refills:</span>
                          <span className={`font-medium ${selectedOrder.refillsRemaining === 0 ? 'text-red-600' : ''}`}>
                            {selectedOrder.refillsRemaining}/{selectedOrder.refills}
                          </span>
                        </div>
                        <div className="flex justify-between"><span className="text-gray-500">Start:</span><span className="font-medium">{formatDate(selectedOrder.startDate)}</span></div>
                        {selectedOrder.endDate && <div className="flex justify-between"><span className="text-gray-500">End:</span><span className="font-medium">{formatDate(selectedOrder.endDate)}</span></div>}
                        <div className="flex justify-between"><span className="text-gray-500">DAW:</span><span className="font-medium">{selectedOrder.dispenseAsWritten ? 'Yes' : 'No'}</span></div>
                        {selectedOrder.prn && <div className="flex justify-between"><span className="text-gray-500">PRN:</span><span className="font-medium text-amber-600">{selectedOrder.prnReason}</span></div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pharmacy */}
                <div className="ehr-panel">
                  <div 
                    className="ehr-header flex items-center justify-between cursor-pointer text-[11px]"
                    onClick={() => togglePanel('pharmacy')}
                  >
                    <div className="flex items-center">
                      <span className="w-4 h-4 border border-gray-400 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                        {expandedPanels.pharmacy ? '-' : '+'}
                      </span>
                      <Building2 className="w-3 h-3 mr-1" /> Pharmacy
                    </div>
                  </div>
                  {expandedPanels.pharmacy && (
                    <div className="bg-white p-2 text-[10px]">
                      <div className="font-semibold">{selectedOrder.pharmacy}</div>
                      <div className="flex items-center text-gray-600"><Phone className="w-3 h-3 mr-1" /> {selectedOrder.pharmacyPhone}</div>
                      <div className="text-gray-400">NPI: {selectedOrder.pharmacyNpi}</div>
                      {selectedOrder.lastFilled && (
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <div>Last Filled: <span className="font-medium">{formatDate(selectedOrder.lastFilled)}</span></div>
                          {selectedOrder.nextRefillDate && <div>Next Refill: <span className="font-medium">{formatDate(selectedOrder.nextRefillDate)}</span></div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Formulary */}
                <div className={`p-2 border ${formularyConfig[selectedOrder.formularyStatus].bg} border-gray-400`}>
                  <div className="flex items-center space-x-1 text-[11px]">
                    {(() => { const F = formularyConfig[selectedOrder.formularyStatus]; return <F.icon className={`w-3.5 h-3.5 ${F.color}`} />; })()}
                    <span className={`font-semibold ${formularyConfig[selectedOrder.formularyStatus].color}`}>
                      {formularyConfig[selectedOrder.formularyStatus].label}
                    </span>
                  </div>
                </div>

                {/* Clinical Alerts */}
                {(selectedOrder.interactions.length > 0 || selectedOrder.allergies.length > 0 || selectedOrder.renalDoseAlert || selectedOrder.geriatricAlert || selectedOrder.duplicateTherapy) && (
                  <div className="ehr-panel">
                    <div 
                      className="flex items-center justify-between cursor-pointer text-[11px] px-2 py-1"
                      style={{ background: '#cc0000', color: 'white' }}
                      onClick={() => togglePanel('alerts')}
                    >
                      <div className="flex items-center">
                        <span className="w-4 h-4 border border-gray-400 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                          {expandedPanels.alerts ? '-' : '+'}
                        </span>
                        <ShieldAlert className="w-3 h-3 mr-1" /> Clinical Alerts
                      </div>
                    </div>
                    {expandedPanels.alerts && (
                      <div className="bg-red-50 p-2 space-y-1.5">
                        {selectedOrder.interactions.map((interaction, i) => (
                          <div key={i} className="flex items-start space-x-1.5 text-[10px]">
                            {getInteractionIcon(interaction.severity)}
                            <div>
                              <div className="font-semibold">Drug Interaction: {interaction.drug}</div>
                              <div className="text-gray-600">{interaction.description}</div>
                            </div>
                          </div>
                        ))}
                        {selectedOrder.allergies.map((allergy, i) => (
                          <div key={i} className="flex items-start space-x-1.5 text-[10px]">
                            <Ban className="w-3 h-3 text-orange-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-orange-800">Allergy Alert</div>
                              <div className="text-gray-600">{allergy}</div>
                            </div>
                          </div>
                        ))}
                        {selectedOrder.renalDoseAlert && (
                          <div className="flex items-start space-x-1.5 text-[10px]">
                            <Zap className="w-3 h-3 text-purple-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-purple-800">Renal Dosing</div>
                              <div className="text-gray-600">{selectedOrder.renalDoseAlert}</div>
                            </div>
                          </div>
                        )}
                        {selectedOrder.geriatricAlert && (
                          <div className="flex items-start space-x-1.5 text-[10px]">
                            <User className="w-3 h-3 text-blue-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-blue-800">Geriatric Alert</div>
                              <div className="text-gray-600">{selectedOrder.geriatricAlert}</div>
                            </div>
                          </div>
                        )}
                        {selectedOrder.duplicateTherapy && (
                          <div className="flex items-start space-x-1.5 text-[10px]">
                            <AlertCircle className="w-3 h-3 text-red-600 mt-0.5" />
                            <div>
                              <div className="font-semibold text-red-800">Override</div>
                              <div className="text-gray-600">{selectedOrder.duplicateTherapy}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <fieldset className="ehr-fieldset">
                  <legend>Actions</legend>
                  <div className="grid grid-cols-4 gap-1">
                    {selectedOrder.status === 'PENDING' && (
                      <button className="ehr-button flex flex-col items-center py-1 text-[9px]" style={{ background: 'linear-gradient(to bottom, #66cc66 0%, #339933 100%)', color: 'white', border: '1px solid #206020' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sign
                      </button>
                    )}
                    {selectedOrder.status === 'ACTIVE' && (
                      <>
                        <button className="ehr-button flex flex-col items-center py-1 text-[9px]">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Renew
                        </button>
                        <button className="ehr-button flex flex-col items-center py-1 text-[9px]">
                          <FileText className="w-3.5 h-3.5" />
                          Modify
                        </button>
                        <button className="ehr-button flex flex-col items-center py-1 text-[9px]" style={{ background: 'linear-gradient(to bottom, #ff6666 0%, #cc0000 100%)', color: 'white', border: '1px solid #800000' }}>
                          <XCircle className="w-3.5 h-3.5" />
                          D/C
                        </button>
                      </>
                    )}
                    <button className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                    <button className="ehr-button flex flex-col items-center py-1 text-[9px]">
                      <Calendar className="w-3.5 h-3.5" />
                      History
                    </button>
                  </div>
                </fieldset>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Pill className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-[11px]">Select a medication</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>Medications | {filteredOrders.length} order(s) displayed</span>
        <span>Prescriber: Dr. Anderson</span>
      </div>

      {/* Dialogs */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={(options) => {
          console.log('Print options:', options);
          setShowPrintDialog(false);
          setShowAlert({ title: 'Print Sent', message: `Medication list sent to printer (${options.action}).`, type: 'success' });
        }}
        title="Print Medication List"
        documentName="Medication List Report"
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

function OrderRow({ order, selected, onSelect, idx }: { order: MedicationOrderExtended; selected: boolean; onSelect: () => void; idx: number }) {
  const status = statusConfig[order.status];
  const hasAlerts = order.interactions.length > 0 || order.allergies.length > 0;
  
  return (
    <div
      onClick={onSelect}
      className={`px-3 py-1 cursor-pointer flex items-center justify-between text-[11px] ${
        selected ? '' : idx % 2 === 1 ? 'bg-gray-50' : ''
      }`}
      style={selected ? { background: '#316ac5', color: 'white' } : undefined}
    >
      <div className="flex items-center space-x-2">
        <div className="w-6">
          {order.controlled && <span className={`text-[9px] font-bold ${selected ? 'text-white' : 'text-red-600'}`}>{order.schedule}</span>}
        </div>
        <div>
          <div className="font-semibold">{order.medicationName} {order.strength}</div>
          <div style={selected ? { color: '#ccc' } : { color: '#666' }}>{order.sig}</div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {hasAlerts && <AlertTriangle className={`w-3 h-3 ${selected ? 'text-yellow-200' : 'text-red-500'}`} />}
        <span className={`px-1 py-0.5 border border-gray-400 text-[9px] ${selected ? 'bg-white/30' : `${status.bg} ${status.color}`}`}>
          {status.label}
        </span>
      </div>
    </div>
  );
}
