import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { calculateBMI } from '../utils/calculations'; // Import BMI calculator

// Interfaces (Patient, GrowthRecord, AppSettings, etc. remain the same)
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
  unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²'; // Added 'lbs', 'in' for potential future use
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
  addGrowthRecord: (recordData: NewGrowthRecordData) => GrowthRecord; // This will now trigger BMI calc
  _addOrUpdateBMIRecordInternal: (patientId: string, ageMonths: number, date: string, bmiValue: number) => void; // Internal helper
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  getPatientById: (patientId: string) => Patient | undefined;
  getRecordsForPatient: (patientId: string) => GrowthRecord[];
}

export type AppStoreState = AppStateValues & AppStateActions;

export const initialAppState: AppStateValues = {
  patients: [],
  growthRecords: [],
  settings: {
    defaultChartType: 'WeightForAge',
    units: 'Metric', // Default to Metric
    darkMode: false,
    language: 'English',
    notifications: {
      appointmentReminders: true,
      newDataAlerts: false,
    },
  },
  selectedPatientId: null,
};

export const storeCreator: StateCreator<AppStoreState> = (set, get) => ({
  ...initialAppState,

  addPatient: (patientData) => {
    const newPatient = { ...patientData, id: uuidv4() };
    set((state) => ({ patients: [...state.patients, newPatient] }));
    return newPatient;
  },
  selectPatient: (patientId) => set({ selectedPatientId: patientId }),

  _addOrUpdateBMIRecordInternal: (patientId, ageMonths, date, bmiValue) => {
    set((state) => {
      const existingBMIRecordIndex = state.growthRecords.findIndex(
        (r) => r.patientId === patientId && r.ageMonths === ageMonths && r.measurementType === 'BMI'
      );
      let newGrowthRecords = [...state.growthRecords];
      if (existingBMIRecordIndex > -1) {
        // Update existing BMI record
        const updatedRecord = {
          ...newGrowthRecords[existingBMIRecordIndex],
          value: bmiValue,
          date: date, // Update date too, in case H/W were on slightly different dates but same age rounded
          unit: 'kg/m²' as 'kg/m²', // Explicitly type
        };
        newGrowthRecords[existingBMIRecordIndex] = updatedRecord;
      } else {
        // Add new BMI record
        const bmiRecord: GrowthRecord = {
          id: uuidv4(),
          patientId,
          ageMonths,
          date,
          measurementType: 'BMI',
          value: bmiValue,
          unit: 'kg/m²',
        };
        newGrowthRecords.push(bmiRecord);
      }
      return { growthRecords: newGrowthRecords };
    });
  },

  addGrowthRecord: (recordData) => {
    if (!recordData.patientId) {
        console.error("Attempted to add growth record without patientId", recordData);
        throw new Error("patientId is required to add a growth record.");
    }
    // Ensure units are metric for internal calculation, assuming UI converts if necessary
    // For simplicity, this example assumes recordData.value is already in kg or cm.
    // A real app would check recordData.unit and convert if settings.units is Imperial.

    const newRecord = { ...recordData, id: uuidv4() };
    set((state) => ({ growthRecords: [...state.growthRecords, newRecord] }));

    // --- Automatic BMI calculation ---
    if (newRecord.measurementType === 'Weight' || newRecord.measurementType === 'Height' || newRecord.measurementType === 'Length') {
      const { growthRecords, settings, _addOrUpdateBMIRecordInternal } = get();
      const patientId = newRecord.patientId;
      const ageMonths = newRecord.ageMonths;

      let weightInKg: number | undefined;
      let heightInCm: number | undefined;
      let recordDate = newRecord.date; // Use date of the triggering record

      if (newRecord.measurementType === 'Weight') {
        weightInKg = newRecord.value; // Assuming it's in kg as per current simplified unit handling
        const heightRecord = growthRecords.find(
          (r) => r.patientId === patientId && r.ageMonths === ageMonths && (r.measurementType === 'Height' || r.measurementType === 'Length')
        );
        if (heightRecord) heightInCm = heightRecord.value; // Assuming cm
      } else { // Height or Length
        heightInCm = newRecord.value; // Assuming cm
        const weightRecord = growthRecords.find(
          (r) => r.patientId === patientId && r.ageMonths === ageMonths && r.measurementType === 'Weight'
        );
        if (weightRecord) weightInKg = weightRecord.value; // Assuming kg
      }

      if (weightInKg !== undefined && heightInCm !== undefined) {
        // TODO: Add unit conversion if store supports imperial units based on settings.units
        // For now, assuming inputs to calculateBMI are always kg and cm.
        // If settings.units === 'Imperial', convert lbs to kg and inches to cm before calculating.
        // Example: if (newRecord.unit === 'lbs') weightInKg = newRecord.value * 0.453592;
        //          if (newRecord.unit === 'in') heightInCm = newRecord.value * 2.54;
        // And do similarly for the found counterpart record.
        // This example assumes metric storage or that conversion happened before addGrowthRecord.

        const bmi = calculateBMI(weightInKg, heightInCm);
        if (!isNaN(bmi)) {
            // Use the internal action to add/update BMI to prevent recursive calls
            _addOrUpdateBMIRecordInternal(patientId, ageMonths, recordDate, bmi);
        }
      }
    }
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

export const useAppStore = create<AppStoreState>()(
  persist(
    storeCreator,
    {
      name: 'growth-chart-app-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

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
