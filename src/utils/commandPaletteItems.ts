import { defaultPatientSearch, type DefaultPatient } from '../data/defaultPatients';
import { fuzzyMatch, type FuzzyMatch } from './fuzzyMatch';

export type PaletteSectionName = 'Recent' | 'Patients' | 'Navigate' | 'Actions';
export type PaletteItemKind = 'patient' | 'navigate' | 'action';

export interface PaletteCandidate {
  id: string;
  label: string;
  detail?: string;
  section: PaletteSectionName;
  kind: PaletteItemKind;
  target?: string;
  patient?: DefaultPatient;
  match: FuzzyMatch | null;
  matchField?: 'label' | 'detail';
}

export interface PaletteSection {
  section: PaletteSectionName;
  items: PaletteCandidate[];
}

const navigationItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/patients', label: 'Patients' },
  { path: '/schedule', label: 'Schedule' },
  { path: '/labs', label: 'Lab Results' },
  { path: '/vitals', label: 'Vitals' },
  { path: '/medications', label: 'Medications' },
  { path: '/reports', label: 'Reports' },
  { path: '/settings', label: 'Settings' },
];

function actionItems(activePatient: DefaultPatient | undefined) {
  return [
    { path: '/medications', label: 'New Prescription', detail: 'Open medication workspace' },
    activePatient
      ? { path: `/patients/${activePatient.id}`, label: 'New Order', detail: `Open order entry for ${activePatient.name}` }
      : { path: '/patients', label: 'New Order', detail: 'Select a patient to enter orders' },
    { path: '/patients', label: 'Print Chart', detail: 'Open patient workspace' },
  ];
}

function patientCandidate(patient: DefaultPatient, section: 'Recent' | 'Patients', query: string): PaletteCandidate {
  const nameMatch = fuzzyMatch(query, patient.name);
  const mrnMatch = fuzzyMatch(query, patient.mrn);
  const match = nameMatch && mrnMatch ? (nameMatch.score >= mrnMatch.score ? nameMatch : mrnMatch)
    : nameMatch || mrnMatch;
  const matchField = match === mrnMatch && mrnMatch ? 'detail' : 'label';
  return {
    id: `${section.toLowerCase()}-patient-${patient.id}`,
    label: patient.name,
    detail: `${patient.mrn} • DOB: ${patient.dob}`,
    section,
    kind: 'patient',
    patient,
    match,
    matchField,
  };
}

function sortMatches(items: PaletteCandidate[], query: string): PaletteCandidate[] {
  if (!query.trim()) return items;
  return items
    .filter((item) => item.match)
    .sort((left, right) => (right.match?.score ?? 0) - (left.match?.score ?? 0));
}

export function buildCommandPaletteSections(
  query: string,
  apiPatients: DefaultPatient[],
  recentPatients: DefaultPatient[],
): PaletteSection[] {
  const trimmedQuery = query.trim();
  const sections: PaletteSection[] = [];

  if (!trimmedQuery && recentPatients.length > 0) {
    sections.push({
      section: 'Recent',
      items: recentPatients.map((patient) => patientCandidate(patient, 'Recent', query)),
    });
  }

  if (trimmedQuery) {
    const patients = [...apiPatients, ...defaultPatientSearch]
      .filter((patient, index, all) => all.findIndex((candidate) => candidate.id === patient.id) === index);
    sections.push({
      section: 'Patients',
      items: sortMatches(patients.map((patient) => patientCandidate(patient, 'Patients', query)), query),
    });
  }

  sections.push({
    section: 'Navigate',
    items: sortMatches(navigationItems.map((item) => ({
      id: `navigate-${item.path}`,
      label: item.label,
      section: 'Navigate' as const,
      kind: 'navigate' as const,
      target: item.path,
      match: fuzzyMatch(query, item.label),
    })), query),
  });
  sections.push({
    section: 'Actions',
    items: sortMatches(actionItems(recentPatients[0]).map((item) => ({
      id: `action-${item.label}`,
      label: item.label,
      detail: item.detail,
      section: 'Actions' as const,
      kind: 'action' as const,
      target: item.path,
      match: fuzzyMatch(query, item.label),
    })), query),
  });

  return sections.filter((section) => section.items.length > 0);
}
