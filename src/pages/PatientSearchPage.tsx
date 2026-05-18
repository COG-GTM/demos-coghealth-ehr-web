import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  User, 
  AlertTriangle, 
  Flag,
  Calendar,
  Phone,
  FileText,
  Activity,
  Heart,
  Pill,
  ChevronRight,
  ChevronDown,
  Download,
  Plus,
  Star,
  AlertCircle,
  Stethoscope,
  Printer,
  RefreshCw,
  X
} from 'lucide-react';
type PatientFlag = 'FALL_RISK' | 'ALLERGY' | 'ISOLATION' | 'DNR' | 'VIP' | 'DIFFICULT_IV';

import { AlertDialog } from '../components/ui/Modal';
import { PrintDialog } from '../components/ui/PrintDialog';
import { PrescriptionDialog } from '../components/ui/PrescriptionDialog';
import { OrderDialog } from '../components/ui/OrderDialog';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { patientService } from '../services/patientService';
import type { Patient } from '../types';

interface PatientListItem {
  id: number;
  mrn: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  dob: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  ssn?: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  pcp: string;
  pcpId: string;
  insurance: string;
  insuranceId: string;
  insuranceType: 'COMMERCIAL' | 'MEDICARE' | 'MEDICAID' | 'SELF_PAY';
  lastVisit?: string;
  nextAppt?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DECEASED';
  alerts: string[];
  flags: PatientFlag[];
  balance: number;
  openEncounters: number;
  recentLabs: boolean;
  recentImaging: boolean;
  location: string;
}

function mapPatientToListItem(patient: Patient): PatientListItem {
  const dob = patient.dateOfBirth;
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const genderMap: Record<string, 'M' | 'F' | 'O'> = { MALE: 'M', FEMALE: 'F', OTHER: 'O', UNKNOWN: 'O' };
  return {
    id: patient.id || 0,
    mrn: patient.mrn || '',
    lastName: patient.lastName,
    firstName: patient.firstName,
    middleName: patient.middleName,
    dob,
    age,
    gender: genderMap[patient.gender || 'UNKNOWN'] || 'O',
    phone: patient.phoneMobile || patient.phoneHome || patient.phoneWork || '',
    address: patient.address?.street1 || '',
    city: patient.address?.city || '',
    state: patient.address?.state || '',
    zip: patient.address?.zipCode || '',
    pcp: 'Unassigned',
    pcpId: '',
    insurance: 'Unknown',
    insuranceId: '',
    insuranceType: 'SELF_PAY',
    status: patient.deceased ? 'DECEASED' : (patient.active ? 'ACTIVE' : 'INACTIVE'),
    alerts: [],
    flags: [],
    balance: 0,
    openEncounters: 0,
    recentLabs: false,
    recentImaging: false,
    location: 'Main Clinic',
  };
}

const flagConfig: Record<string, { label: string; color: string; bg: string }> = {
  FALL_RISK: { label: 'Fall Risk', color: 'text-gray-800', bg: 'bg-gray-200' },
  ALLERGY: { label: 'Allergy', color: 'text-gray-800', bg: 'bg-gray-200' },
  ISOLATION: { label: 'Isolation', color: 'text-gray-800', bg: 'bg-gray-200' },
  DNR: { label: 'DNR/DNI', color: 'text-gray-800', bg: 'bg-gray-300' },
  VIP: { label: 'VIP', color: 'text-gray-700', bg: 'bg-gray-100' },
  DIFFICULT_IV: { label: 'Diff IV', color: 'text-gray-700', bg: 'bg-gray-100' },
};

interface FilterState {
  status: string[];
  gender: string[];
  insuranceType: string[];
  pcp: string[];
  location: string[];
  hasBalance: boolean | null;
  hasOpenEncounters: boolean | null;
  hasAlerts: boolean | null;
  flags: string[];
}

export default function PatientSearchPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PatientListItem[]>([]);
  const [allPatients, setAllPatients] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    quickFilters: true,
    status: true,
    demographics: false,
    insurance: false,
    provider: false,
    location: false,
    flags: false,
  });
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    gender: [],
    insuranceType: [],
    pcp: [],
    location: [],
    hasBalance: null,
    hasOpenEncounters: null,
    hasAlerts: null,
    flags: [],
  });
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showRxDialog, setShowRxDialog] = useState(false);
  const [showLabDialog, setShowLabDialog] = useState(false);
  const [showAlert, setShowAlert] = useState<{ title: string; message: string; type: 'success' | 'info' } | null>(null);

  const fetchPatients = async (query = '') => {
    setLoading(true);
    try {
      const result = await patientService.search(query, 0, 100);
      const mapped = result.content.map(mapPatientToListItem);
      setAllPatients(mapped);
      setSearchResults(mapped);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
      setShowAlert({ title: 'Error', message: 'Failed to load patients from server.', type: 'info' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSearch = () => {
    const term = searchTerm.toLowerCase();
    let results = allPatients;
    
    if (term) {
      results = results.filter(p =>
        p.lastName.toLowerCase().includes(term) ||
        p.firstName.toLowerCase().includes(term) ||
        p.mrn.toLowerCase().includes(term) ||
        p.phone.includes(term) ||
        p.dob.includes(term)
      );
    }

    if (filters.status.length > 0) {
      results = results.filter(p => filters.status.includes(p.status));
    }
    if (filters.gender.length > 0) {
      results = results.filter(p => filters.gender.includes(p.gender));
    }
    if (filters.insuranceType.length > 0) {
      results = results.filter(p => filters.insuranceType.includes(p.insuranceType));
    }
    if (filters.pcp.length > 0) {
      results = results.filter(p => filters.pcp.includes(p.pcpId));
    }
    if (filters.location.length > 0) {
      results = results.filter(p => filters.location.includes(p.location));
    }
    if (filters.hasBalance === true) {
      results = results.filter(p => p.balance > 0);
    } else if (filters.hasBalance === false) {
      results = results.filter(p => p.balance === 0);
    }
    if (filters.hasOpenEncounters === true) {
      results = results.filter(p => p.openEncounters > 0);
    }
    if (filters.hasAlerts === true) {
      results = results.filter(p => p.alerts.length > 0);
    }
    if (filters.flags.length > 0) {
      results = results.filter(p => filters.flags.some(f => p.flags.includes(f as PatientFlag)));
    }

    setSearchResults(results);
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters(prev => {
      const arr = prev[category] as string[];
      const newArr = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
      return { ...prev, [category]: newArr };
    });
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      gender: [],
      insuranceType: [],
      pcp: [],
      location: [],
      hasBalance: null,
      hasOpenEncounters: null,
      hasAlerts: null,
      flags: [],
    });
    setSearchResults(allPatients);
  };

  const handleSelectPatient = (patient: PatientListItem) => {
    setSelectedPatient(patient);
  };

  const handleOpenChart = (patientId: number) => {
    navigate(`/patients/${patientId}`);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const [date, time] = dateStr.split(' ');
    return `${formatDate(date)} ${time}`;
  };

  const activeFilterCount = filters.status.length + filters.gender.length + filters.insuranceType.length + 
    filters.pcp.length + filters.location.length + filters.flags.length +
    (filters.hasBalance !== null ? 1 : 0) + (filters.hasOpenEncounters !== null ? 1 : 0) + (filters.hasAlerts !== null ? 1 : 0);

  return (
    <div className="h-full flex flex-col" style={{ background: '#d4d0c8' }}>
      {/* Toolbar */}
      <div className="ehr-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button className="ehr-toolbar-button flex items-center" onClick={() => { fetchPatients(); setShowAlert({ title: 'Refreshed', message: 'Patient list has been refreshed.', type: 'info' }); }}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </button>
          <span className="text-gray-400">|</span>
          <button className="ehr-toolbar-button flex items-center" onClick={() => navigate('/patients/new')}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Patient
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowPrintDialog(true)}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Print List
          </button>
          <button className="ehr-toolbar-button flex items-center" onClick={() => setShowAlert({ title: 'Export', message: `Exported ${searchResults.length} patient(s) to CSV.`, type: 'success' })}>
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Search:</span>
          <input
            type="text"
            placeholder="Name, MRN, DOB, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="ehr-input w-48"
          />
          <button onClick={handleSearch} className="ehr-button ehr-button-primary flex items-center">
            <Search className="w-3 h-3 mr-1" /> Find
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Filter Panel */}
        <div className="w-52 flex flex-col border-r border-gray-500" style={{ background: '#ece9d8' }}>
          <div className="ehr-header text-xs flex items-center justify-between">
            <span>Filter Patients</span>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-white/80 hover:text-white flex items-center text-[10px]">
                <X className="w-3 h-3 mr-0.5" /> Clear ({activeFilterCount})
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto p-1">
            {/* Quick Filters */}
            <div className="mb-1">
              <button 
                onClick={() => toggleSection('quickFilters')}
                className="w-full flex items-center text-left px-1 py-0.5 hover:bg-gray-200 font-semibold text-gray-700"
              >
                <span className="w-4 h-4 border border-gray-500 bg-white flex items-center justify-center text-[10px] font-bold mr-1">
                  {expandedSections.quickFilters ? '-' : '+'}
                </span>
                Quick Filters
              </button>
              {expandedSections.quickFilters && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  <label className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                    <input 
                      type="checkbox" 
                      className="ehr-checkbox"
                      checked={filters.hasOpenEncounters === true}
                      onChange={() => setFilters(prev => ({ ...prev, hasOpenEncounters: prev.hasOpenEncounters === true ? null : true }))}
                    />
                    <span className="ehr-label">Open Encounters</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                    <input 
                      type="checkbox" 
                      className="ehr-checkbox"
                      checked={filters.hasBalance === true}
                      onChange={() => setFilters(prev => ({ ...prev, hasBalance: prev.hasBalance === true ? null : true }))}
                    />
                    <span className="ehr-label">Outstanding Balance</span>
                  </label>
                  <label className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                    <input 
                      type="checkbox" 
                      className="ehr-checkbox"
                      checked={filters.hasAlerts === true}
                      onChange={() => setFilters(prev => ({ ...prev, hasAlerts: prev.hasAlerts === true ? null : true }))}
                    />
                    <span className="ehr-label">Has Clinical Alerts</span>
                  </label>
                </div>
              )}
            </div>

            {/* Status */}
            <div className="mb-1">
              <button 
                onClick={() => toggleSection('status')}
                className="w-full flex items-center text-left px-1 py-0.5 hover:bg-gray-200 font-semibold text-gray-700"
              >
                {expandedSections.status ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                Patient Status
              </button>
              {expandedSections.status && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {['ACTIVE', 'INACTIVE', 'DECEASED'].map(status => (
                    <label key={status} className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                      <input 
                        type="checkbox" 
                        className="ehr-checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => toggleFilter('status', status)}
                      />
                      <span className="ehr-label">{status}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Demographics */}
            <div className="mb-1">
              <button 
                onClick={() => toggleSection('demographics')}
                className="w-full flex items-center text-left px-1 py-0.5 hover:bg-gray-200 font-semibold text-gray-700"
              >
                {expandedSections.demographics ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                Demographics
              </button>
              {expandedSections.demographics && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  <div className="text-[10px] text-gray-500 px-1">Gender:</div>
                  {[{ v: 'M', l: 'Male' }, { v: 'F', l: 'Female' }, { v: 'O', l: 'Other' }].map(g => (
                    <label key={g.v} className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                      <input 
                        type="checkbox" 
                        className="ehr-checkbox"
                        checked={filters.gender.includes(g.v)}
                        onChange={() => toggleFilter('gender', g.v)}
                      />
                      <span className="ehr-label">{g.l}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Insurance */}
            <div className="mb-1">
              <button 
                onClick={() => toggleSection('insurance')}
                className="w-full flex items-center text-left px-1 py-0.5 hover:bg-gray-200 font-semibold text-gray-700"
              >
                {expandedSections.insurance ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                Insurance Type
              </button>
              {expandedSections.insurance && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {[{ v: 'COMMERCIAL', l: 'Commercial' }, { v: 'MEDICARE', l: 'Medicare' }, { v: 'MEDICAID', l: 'Medicaid' }, { v: 'SELF_PAY', l: 'Self Pay' }].map(ins => (
                    <label key={ins.v} className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                      <input 
                        type="checkbox" 
                        className="ehr-checkbox"
                        checked={filters.insuranceType.includes(ins.v)}
                        onChange={() => toggleFilter('insuranceType', ins.v)}
                      />
                      <span className="ehr-label">{ins.l}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Provider */}
            <div className="mb-1">
              <button 
                onClick={() => toggleSection('provider')}
                className="w-full flex items-center text-left px-1 py-0.5 hover:bg-gray-200 font-semibold text-gray-700"
              >
                {expandedSections.provider ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                Primary Care Provider
              </button>
              {expandedSections.provider && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {[{ id: 'PCP001', name: 'Williams, Mark MD' }, { id: 'PCP002', name: 'Chen, Lisa MD' }, { id: 'PCP003', name: 'Patel, Raj MD' }].map(pcp => (
                    <label key={pcp.id} className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                      <input 
                        type="checkbox" 
                        className="ehr-checkbox"
                        checked={filters.pcp.includes(pcp.id)}
                        onChange={() => toggleFilter('pcp', pcp.id)}
                      />
                      <span className="ehr-label truncate">{pcp.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="mb-1">
              <button 
                onClick={() => toggleSection('location')}
                className="w-full flex items-center text-left px-1 py-0.5 hover:bg-gray-200 font-semibold text-gray-700"
              >
                {expandedSections.location ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                Location
              </button>
              {expandedSections.location && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {['Main Clinic', 'East Campus', 'West Wing'].map(loc => (
                    <label key={loc} className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                      <input 
                        type="checkbox" 
                        className="ehr-checkbox"
                        checked={filters.location.includes(loc)}
                        onChange={() => toggleFilter('location', loc)}
                      />
                      <span className="ehr-label">{loc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Flags */}
            <div className="mb-1">
              <button 
                onClick={() => toggleSection('flags')}
                className="w-full flex items-center text-left px-1 py-0.5 hover:bg-gray-200 font-semibold text-gray-700"
              >
                {expandedSections.flags ? <ChevronDown className="w-3.5 h-3.5 mr-1" /> : <ChevronRight className="w-3.5 h-3.5 mr-1" />}
                Patient Flags
              </button>
              {expandedSections.flags && (
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {Object.entries(flagConfig).map(([key, cfg]) => (
                    <label key={key} className="flex items-center cursor-pointer hover:bg-gray-200 px-1">
                      <input 
                        type="checkbox" 
                        className="ehr-checkbox"
                        checked={filters.flags.includes(key)}
                        onChange={() => toggleFilter('flags', key)}
                      />
                      <span className={`ehr-label px-1 ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-400 p-1">
            <button onClick={handleSearch} className="ehr-button ehr-button-primary w-full">Apply Filters</button>
          </div>
        </div>

        {/* Patient List */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="ehr-subheader flex items-center justify-between">
            <span>Patient List - {searchResults.length} record(s) found</span>
            <span className="text-gray-500">Double-click to open chart</span>
          </div>
          <div className="flex-1 overflow-auto bg-white relative">
            <LoadingOverlay isLoading={loading} text="Loading patients..." />
            <table className="w-full text-[11px]">
              <thead className="sticky top-0">
                <tr>
                  <th className="px-1 py-1 text-left w-16">Flags</th>
                  <th className="px-1 py-1 text-left">MRN</th>
                  <th className="px-1 py-1 text-left">Patient Name</th>
                  <th className="px-1 py-1 text-left">DOB</th>
                  <th className="px-1 py-1 text-left w-8">Sex</th>
                  <th className="px-1 py-1 text-left">Phone</th>
                  <th className="px-1 py-1 text-left">PCP</th>
                  <th className="px-1 py-1 text-left">Insurance</th>
                  <th className="px-1 py-1 text-left">Last Visit</th>
                  <th className="px-1 py-1 text-left">Next Appt</th>
                  <th className="px-1 py-1 text-right">Balance</th>
                  <th className="px-1 py-1 text-center w-12">Info</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12 text-gray-500">
                      No patients found
                    </td>
                  </tr>
                ) : searchResults.map((patient, idx) => {
                  const isSelected = selectedPatient?.id === patient.id;
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      onDoubleClick={() => handleOpenChart(patient.id)}
                      className={`cursor-pointer ${isSelected ? 'ehr-grid-row selected' : `ehr-grid-row ${idx % 2 === 0 ? '' : ''}`}`}
                      style={isSelected ? { background: '#316ac5', color: 'white' } : idx % 2 === 1 ? { background: '#f0f4f8' } : {}}
                    >
                      <td className="px-1 py-0.5">
                        <div className="flex items-center space-x-0.5">
                          {patient.flags.slice(0, 3).map((flag) => (
                            <span
                              key={flag}
                              className={`px-0.5 py-0 text-[9px] font-medium ${isSelected ? 'bg-white/30 text-white' : `${flagConfig[flag].bg} ${flagConfig[flag].color}`}`}
                              title={flagConfig[flag].label}
                            >
                              {flag === 'FALL_RISK' && <AlertTriangle className="w-2.5 h-2.5 inline" />}
                              {flag === 'ALLERGY' && <AlertCircle className="w-2.5 h-2.5 inline" />}
                              {flag === 'DNR' && 'DNR'}
                              {flag === 'VIP' && <Star className="w-2.5 h-2.5 inline" />}
                              {flag === 'ISOLATION' && <Flag className="w-2.5 h-2.5 inline" />}
                              {flag === 'DIFFICULT_IV' && 'IV'}
                            </span>
                          ))}
                          {patient.flags.length > 3 && <span className="text-[9px]">+{patient.flags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-1 py-0.5 font-mono">{patient.mrn}</td>
                      <td className="px-1 py-0.5 font-semibold">
                        {patient.lastName}, {patient.firstName} {patient.middleName ? patient.middleName.charAt(0) + '.' : ''}
                      </td>
                      <td className="px-1 py-0.5">{formatDate(patient.dob)} ({patient.age}y)</td>
                      <td className="px-1 py-0.5">{patient.gender}</td>
                      <td className="px-1 py-0.5">{patient.phone}</td>
                      <td className="px-1 py-0.5 truncate max-w-[100px]">{patient.pcp}</td>
                      <td className="px-1 py-0.5 truncate max-w-[100px]">{patient.insurance}</td>
                      <td className="px-1 py-0.5">{patient.lastVisit ? formatDate(patient.lastVisit) : '-'}</td>
                      <td className="px-1 py-0.5">{patient.nextAppt ? formatDateTime(patient.nextAppt) : '-'}</td>
                      <td className="px-1 py-0.5 text-right">
                        {patient.balance > 0 ? (
                          <span className={isSelected ? 'text-white' : 'text-gray-800 font-semibold'}>${patient.balance.toFixed(2)}</span>
                        ) : (
                          <span className={isSelected ? 'text-gray-200' : 'text-gray-600'}>$0.00</span>
                        )}
                      </td>
                      <td className="px-1 py-0.5">
                        <div className="flex items-center justify-center space-x-0.5">
                          {patient.openEncounters > 0 && (
                            <span className={`px-0.5 text-[9px] border border-gray-400 ${isSelected ? 'bg-white/30' : 'bg-gray-100 text-gray-700'}`} title="Open encounters">
                              {patient.openEncounters}E
                            </span>
                          )}
                          {patient.recentLabs && (
                            <span title="Recent labs"><Activity className={`w-3 h-3 ${isSelected ? 'text-gray-200' : 'text-gray-600'}`} /></span>
                          )}
                          {patient.recentImaging && (
                            <span title="Recent imaging"><FileText className={`w-3 h-3 ${isSelected ? 'text-gray-200' : 'text-gray-600'}`} /></span>
                          )}
                          {patient.alerts.length > 0 && (
                            <span title={patient.alerts.join(', ')}><AlertTriangle className={`w-3 h-3 ${isSelected ? 'text-gray-200' : 'text-gray-600'}`} /></span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {searchResults.length === 0 && (
              <div className="text-center py-3 text-gray-500 text-[11px]">
                No patients found matching your criteria
              </div>
            )}
          </div>
        </div>

        {/* Patient Detail Panel */}
        {selectedPatient && (
          <div className="w-72 flex flex-col border-l border-gray-500" style={{ background: '#f5f5f5' }}>
            <div className="ehr-header text-xs flex items-center justify-between">
              <span>Patient Details</span>
              <button onClick={() => setSelectedPatient(null)} className="text-white/80 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {/* Patient Header */}
              <div className="p-2 border-b border-gray-400" style={{ background: '#e8e8e8' }}>
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 flex items-center justify-center border border-gray-500" style={{ background: '#6699cc' }}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{selectedPatient.lastName}, {selectedPatient.firstName}</div>
                    <div className="text-[10px] text-gray-600">{selectedPatient.mrn} | {selectedPatient.age}y {selectedPatient.gender}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenChart(selectedPatient.id)}
                  className="ehr-button ehr-button-primary w-full mt-2 flex items-center justify-center"
                >
                  Open Chart <ChevronRight className="w-3 h-3 ml-1" />
                </button>
              </div>

              <div className="p-2 space-y-2">
                {/* Flags & Alerts */}
                {(selectedPatient.flags.length > 0 || selectedPatient.alerts.length > 0) && (
                  <fieldset className="ehr-fieldset">
                    <legend>Flags & Alerts</legend>
                    {selectedPatient.flags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {selectedPatient.flags.map((flag) => (
                          <span key={flag} className={`px-1 py-0.5 text-[10px] font-medium ${flagConfig[flag].bg} ${flagConfig[flag].color}`}>
                            {flagConfig[flag].label}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedPatient.alerts.length > 0 && (
                      <div className="ehr-alert-critical p-1 text-[10px]">
                        {selectedPatient.alerts.map((alert, i) => (
                          <div key={i} className="flex items-start space-x-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{alert}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </fieldset>
                )}

                {/* Demographics */}
                <fieldset className="ehr-fieldset">
                  <legend>Demographics</legend>
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr><td className="text-gray-500 pr-2">DOB:</td><td>{formatDate(selectedPatient.dob)}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Age/Sex:</td><td>{selectedPatient.age} years / {selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</td></tr>
                      <tr><td className="text-gray-500 pr-2">SSN:</td><td>{selectedPatient.ssn}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Phone:</td><td>{selectedPatient.phone}</td></tr>
                      <tr><td className="text-gray-500 pr-2 align-top">Address:</td><td>{selectedPatient.address}<br/>{selectedPatient.city}, {selectedPatient.state} {selectedPatient.zip}</td></tr>
                    </tbody>
                  </table>
                </fieldset>

                {/* Care Team */}
                <fieldset className="ehr-fieldset">
                  <legend>Care Team</legend>
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr><td className="text-gray-500 pr-2">PCP:</td><td>{selectedPatient.pcp}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Location:</td><td>{selectedPatient.location}</td></tr>
                    </tbody>
                  </table>
                </fieldset>

                {/* Insurance */}
                <fieldset className="ehr-fieldset">
                  <legend>Insurance</legend>
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr><td className="text-gray-500 pr-2">Plan:</td><td>{selectedPatient.insurance}</td></tr>
                      <tr><td className="text-gray-500 pr-2">ID:</td><td className="font-mono">{selectedPatient.insuranceId}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Type:</td><td>{selectedPatient.insuranceType}</td></tr>
                    </tbody>
                  </table>
                </fieldset>

                {/* Visit Info */}
                <fieldset className="ehr-fieldset">
                  <legend>Visit Information</legend>
                  <table className="w-full text-[10px]">
                    <tbody>
                      <tr><td className="text-gray-500 pr-2">Last Visit:</td><td>{selectedPatient.lastVisit ? formatDate(selectedPatient.lastVisit) : 'N/A'}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Next Appt:</td><td>{selectedPatient.nextAppt ? formatDateTime(selectedPatient.nextAppt) : 'None'}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Open Enc:</td><td className={selectedPatient.openEncounters > 0 ? 'font-semibold' : ''}>{selectedPatient.openEncounters}</td></tr>
                      <tr><td className="text-gray-500 pr-2">Balance:</td><td className={selectedPatient.balance > 0 ? 'font-semibold' : ''}>${selectedPatient.balance.toFixed(2)}</td></tr>
                    </tbody>
                  </table>
                </fieldset>

                {/* Quick Actions */}
                <fieldset className="ehr-fieldset">
                  <legend>Quick Actions</legend>
                  <div className="grid grid-cols-3 gap-1">
                    <button className="ehr-button flex flex-col items-center py-1" onClick={() => navigate('/schedule')}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Schedule</span>
                    </button>
                    <button className="ehr-button flex flex-col items-center py-1" onClick={() => setShowAlert({ title: 'Call Patient', message: `Initiating call to ${selectedPatient.phone}...`, type: 'info' })}>
                      <Phone className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Call</span>
                    </button>
                    <button className="ehr-button flex flex-col items-center py-1" onClick={() => setShowRxDialog(true)}>
                      <Pill className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Rx</span>
                    </button>
                    <button className="ehr-button flex flex-col items-center py-1" onClick={() => setShowLabDialog(true)}>
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Labs</span>
                    </button>
                    <button className="ehr-button flex flex-col items-center py-1" onClick={() => setShowAlert({ title: 'Record Vitals', message: 'Vitals entry form would open here.', type: 'info' })}>
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Vitals</span>
                    </button>
                    <button className="ehr-button flex flex-col items-center py-1" onClick={() => setShowAlert({ title: 'New Note', message: 'Clinical note editor would open here.', type: 'info' })}>
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span className="text-[9px]">Note</span>
                    </button>
                  </div>
                </fieldset>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="ehr-status-bar flex items-center justify-between">
        <span>Ready | {searchResults.length} patient(s) | {activeFilterCount > 0 ? `${activeFilterCount} filter(s) active` : 'No filters'}</span>
        <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Dialogs */}
      <PrintDialog
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onPrint={(options) => {
          console.log('Print options:', options);
          setShowPrintDialog(false);
          setShowAlert({ title: 'Print Sent', message: `Patient list sent to printer (${options.action}).`, type: 'success' });
        }}
        title="Print Patient List"
        documentName={`Patient List (${searchResults.length} patients)`}
      />

      {selectedPatient && (
        <>
          <PrescriptionDialog
            isOpen={showRxDialog}
            onClose={() => setShowRxDialog(false)}
            patientName={`${selectedPatient.lastName}, ${selectedPatient.firstName}`}
            patientMrn={selectedPatient.mrn}
            patientAllergies={selectedPatient.flags.includes('ALLERGY') ? ['See chart for details'] : []}
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
            patientName={`${selectedPatient.lastName}, ${selectedPatient.firstName}`}
            patientMrn={selectedPatient.mrn}
            onSubmit={(orders) => {
              console.log('Lab order:', orders);
              setShowLabDialog(false);
              setShowAlert({ title: 'Lab Order Placed', message: `${orders.length} test(s) ordered for ${selectedPatient.lastName}, ${selectedPatient.firstName}.`, type: 'success' });
            }}
          />
        </>
      )}

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
