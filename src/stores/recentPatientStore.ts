import { create } from 'zustand';
import type { DefaultPatient } from '../data/defaultPatients';

interface RecentPatientState {
  recentPatients: DefaultPatient[];
  addRecentPatient: (patient: DefaultPatient) => void;
  clearRecentPatients: () => void;
}

export const useRecentPatientStore = create<RecentPatientState>((set) => ({
  recentPatients: [],
  addRecentPatient: (patient) => set((state) => ({
    recentPatients: [
      patient,
      ...state.recentPatients.filter((recent) => recent.id !== patient.id),
    ].slice(0, 8),
  })),
  clearRecentPatients: () => set({ recentPatients: [] }),
}));
