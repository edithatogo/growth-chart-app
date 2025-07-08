import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// 1. Define Interfaces
export interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: 'Male' | 'Female' | 'Other' | 'Unknown';
}

export type NewGrowthRecordData = Omit<GrowthRecord, 'id'>;

export interface GrowthRecord {
  id: string;
  patientId: string;
  date: string;
  ageMonths: number;
  measurementType: 'Weight' | 'Height' | 'Length' | 'HeadCircumference' | 'BMI';
  value: number;
  unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²';
  notes?: string;
}

export interface AppSettings {
  defaultChartType: 'WeightForAge' | 'HeightForAge' | 'HCForAge' | 'BMIForAge';
  units: 'Metric' | 'Imperial';
  darkMode: boolean;
  language: 'English' | 'Spanish';
  notifications: {
    appointmentReminders: boolean;
    newDataAlerts: boolean;
  };
}

export interface AppStateValues {
  patients: Patient[];
  growthRecords: GrowthRecord[];
  settings: AppSettings;
  selectedPatientId: string | null;
}

export interface AppStateActions {
  addPatient: (patientData: Omit<Patient, 'id'>) => Patient;
  selectPatient: (patientId: string | null) => void;
  addGrowthRecord: (recordData: NewGrowthRecordData) => GrowthRecord;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  getPatientById: (patientId: string) => Patient | undefined;
  getRecordsForPatient: (patientId: string) => GrowthRecord[];
}

export type AppStoreState = AppStateValues & AppStateActions;

// 2. Define Initial State Values
export const initialAppState: AppStateValues = { // Export for test reset
  patients: [],
  growthRecords: [],
  settings: {
    defaultChartType: 'WeightForAge',
    units: 'Metric',
    darkMode: false,
    language: 'English',
    notifications: {
      appointmentReminders: true,
      newDataAlerts: false,
    },
  },
  selectedPatientId: null,
};

// Export storeCreator for testing without persist middleware
export const storeCreator: StateCreator<AppStoreState> = (set, get) => ({
  ...initialAppState,

  addPatient: (patientData) => {
    const newPatient = { ...patientData, id: uuidv4() };
    set((state) => ({ patients: [...state.patients, newPatient] }));
    return newPatient;
  },
  selectPatient: (patientId) => set({ selectedPatientId: patientId }),
  addGrowthRecord: (recordData) => {
    if (!recordData.patientId) {
        console.error("Attempted to add growth record without patientId", recordData);
        throw new Error("patientId is required to add a growth record.");
    }
    const newRecord = { ...recordData, id: uuidv4() };
    set((state) => ({ growthRecords: [...state.growthRecords, newRecord] }));
    return newRecord;
  },
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  getPatientById: (patientId) => {
    return get().patients.find(p => p.id === patientId);
  },
  getRecordsForPatient: (patientId) => {
    return get().growthRecords.filter(r => r.patientId === patientId);
  }
});

// This is the main store hook for the application, with persistence
export const useAppStore = create<AppStoreState>()(
  persist(
    storeCreator,
    {
      name: 'growth-chart-app-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Helper hooks remain the same, using the persisted store
export const useCurrentPatient = (): Patient | null => {
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const getPatientById = useAppStore((state) => state.getPatientById);
  if (!selectedPatientId) return null;
  return getPatientById(selectedPatientId) || null;
};

export const useCurrentPatientRecords = (): GrowthRecord[] => {
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const getRecordsForPatient = useAppStore((state) => state.getRecordsForPatient);
  if (!selectedPatientId) return [];
  return getRecordsForPatient(selectedPatientId);
};

export default useAppStore;
