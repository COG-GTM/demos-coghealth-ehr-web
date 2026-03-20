import type { Patient } from '../types';

export type InboxTab = 'all' | 'results' | 'messages' | 'rxRefills' | 'orders' | 'cosign';
export type WorklistFilter = 'all' | 'inpatient' | 'outpatient' | 'critical';
export type InboxPriority = 'all' | 'critical' | 'high' | 'normal';
export type InboxReadFilter = 'all' | 'unread' | 'read';
export type WorklistSort = 'name' | 'location' | 'status' | 'time';

export interface InboxItem {
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

export interface WorklistPatient {
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

export function mapPatientToWorklist(patient: Patient, index: number): WorklistPatient {
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

export function mapPatientToInbox(patient: Patient, index: number): InboxItem {
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

export function computeInboxCounts(inboxItems: InboxItem[]) {
  return {
    all: inboxItems.filter(i => !i.read).length,
    results: inboxItems.filter(i => !i.read && (i.type === 'lab' || i.type === 'imaging')).length,
    messages: inboxItems.filter(i => !i.read && i.type === 'message').length,
    rxRefills: inboxItems.filter(i => !i.read && i.type === 'refill').length,
    orders: inboxItems.filter(i => !i.read && i.type === 'order').length,
    cosign: inboxItems.filter(i => !i.read && (i.type === 'cosign' || i.type === 'consult')).length,
  };
}

export function filterInboxItems(
  inboxItems: InboxItem[],
  inboxTab: InboxTab,
  inboxPriority: InboxPriority,
  inboxReadFilter: InboxReadFilter
): InboxItem[] {
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
}

export function filterWorklistPatients(
  worklistPatients: WorklistPatient[],
  worklistFilter: WorklistFilter,
  worklistSort: WorklistSort,
  worklistSortAsc: boolean
): WorklistPatient[] {
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
      cmp = (order[a.status] ?? 5) - (order[b.status] ?? 5);
    }
    return worklistSortAsc ? cmp : -cmp;
  });
  return patients;
}
