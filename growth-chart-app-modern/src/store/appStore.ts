import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { calculateBMI } from '../utils/calculations';
import { convertToMetricForCalc } from '../utils/units'; // Import metric converter


export interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: 'Male' | 'Female' | 'Other' | 'Unknown';
  condition?: string; // Optional: For condition-specific context
}

export type NewGrowthRecordData = Omit<GrowthRecord, 'id'>;

export interface GrowthRecord {
  id: string;
  patientId: string;
  date: string;
  ageMonths: number;
  measurementType: 'Weight' | 'Height' | 'Length' | 'HeadCircumference' | 'BMI' | 'Other'; // Added 'Other'
  otherMeasurementName?: string; // Name if measurementType is 'Other'
  value: number;
  unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²' | string; // Allow generic string for 'Other' units
  notes?: string;
  interventionType?: string;    // e.g., 'Growth Hormone', 'Dietary Change'
  interventionDetails?: string; // e.g., Dosage, specifics of diet
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
  _addOrUpdateBMIRecordInternal: (patientId: string, ageMonths: number, date: string, bmiValue: number) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  getPatientById: (patientId: string) => Patient | undefined;
  getRecordsForPatient: (patientId: string) => GrowthRecord[];
  // CRUD actions for Patient
  updatePatient: (updatedPatient: Patient) => void;
  deletePatient: (patientId: string) => void;
  // CRUD actions for GrowthRecord
  updateGrowthRecord: (updatedRecord: GrowthRecord) => void;
  deleteGrowthRecord: (recordId: string) => void;
}

export type AppStoreState = AppStateValues & AppStateActions;

export const initialAppState: AppStateValues = {
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
        const updatedRecord = {
          ...newGrowthRecords[existingBMIRecordIndex],
          value: bmiValue, date: date, unit: 'kg/m²' as 'kg/m²',
        };
        newGrowthRecords[existingBMIRecordIndex] = updatedRecord;
      } else {
        const bmiRecord: GrowthRecord = {
          id: uuidv4(), patientId, ageMonths, date,
          measurementType: 'BMI', value: bmiValue, unit: 'kg/m²',
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

    const newRecord = { ...recordData, id: uuidv4() };
    set((state) => ({ growthRecords: [...state.growthRecords, newRecord] }));

    if (newRecord.measurementType === 'Weight' || newRecord.measurementType === 'Height' || newRecord.measurementType === 'Length') {
      const { growthRecords, _addOrUpdateBMIRecordInternal } = get();
      const patientId = newRecord.patientId;
      const ageMonths = newRecord.ageMonths;
      let recordDate = newRecord.date;

      let weightRecordForBMI: GrowthRecord | undefined;
      let heightRecordForBMI: GrowthRecord | undefined;

      if (newRecord.measurementType === 'Weight') {
        weightRecordForBMI = newRecord;
        // Find a corresponding height/length record, ensuring it's not the same record if multiple weights were added at the same age.
        heightRecordForBMI = growthRecords.find(
          (r) => r.patientId === patientId && r.ageMonths === ageMonths &&
                 (r.measurementType === 'Height' || r.measurementType === 'Length') &&
                 r.id !== newRecord.id
        );
         // If newRecord is weight, and we found a height, we can use newRecord's date.
         // If newRecord is weight, and we didn't find height yet, try finding an existing height.
         if (!heightRecordForBMI) {
            heightRecordForBMI = growthRecords.find(
                (r) => r.patientId === patientId && r.ageMonths === ageMonths &&
                       (r.measurementType === 'Height' || r.measurementType === 'Length')
            );
         }


      } else { // newRecord is Height or Length
        heightRecordForBMI = newRecord;
        weightRecordForBMI = growthRecords.find(
          (r) => r.patientId === patientId && r.ageMonths === ageMonths &&
                 r.measurementType === 'Weight' &&
                 r.id !== newRecord.id
        );
        if (!weightRecordForBMI) {
            weightRecordForBMI = growthRecords.find(
                (r) => r.patientId === patientId && r.ageMonths === ageMonths &&
                       r.measurementType === 'Weight'
            );
        }
      }

      // Determine the most recent date if both records exist
      if (weightRecordForBMI && heightRecordForBMI) {
          if (new Date(weightRecordForBMI.date) > new Date(heightRecordForBMI.date)) {
              recordDate = weightRecordForBMI.date;
          } else {
              recordDate = heightRecordForBMI.date;
          }
          // If newRecord is one of them, its date is already considered.
          if(newRecord.id === weightRecordForBMI.id || newRecord.id === heightRecordForBMI.id) {
            recordDate = newRecord.date;
          }


        const weightInKg = convertToMetricForCalc(weightRecordForBMI.value, weightRecordForBMI.unit as GrowthRecord['unit']);
        const heightInCm = convertToMetricForCalc(heightRecordForBMI.value, heightRecordForBMI.unit as GrowthRecord['unit']);

        if (!isNaN(weightInKg) && !isNaN(heightInCm) && heightInCm > 0) { // Ensure height is positive for BMI calc
            const bmi = calculateBMI(weightInKg, heightInCm);
            if (!isNaN(bmi)) {
                _addOrUpdateBMIRecordInternal(patientId, ageMonths, recordDate, bmi);
            }
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
  },

  updatePatient: (updatedPatient) =>
    set((state) => ({
      patients: state.patients.map((p) =>
        p.id === updatedPatient.id ? { ...p, ...updatedPatient } : p
      ),
    })),

  deletePatient: (patientId) =>
    set((state) => {
      // Also delete associated growth records and BMI records
      const remainingGrowthRecords = state.growthRecords.filter(
        (r) => r.patientId !== patientId
      );
      // If the deleted patient was selected, clear selection
      const newSelectedPatientId = state.selectedPatientId === patientId ? null : state.selectedPatientId;
      return {
        patients: state.patients.filter((p) => p.id !== patientId),
        growthRecords: remainingGrowthRecords,
        selectedPatientId: newSelectedPatientId,
      };
    }),

  updateGrowthRecord: (updatedRecord) =>
    set((state) => {
      const newGrowthRecords = state.growthRecords.map((r) =>
        r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r
      );
      // After updating a record, we might need to re-calculate BMI if it was a H/W record
      // For simplicity, this example won't auto-trigger BMI re-calc on simple update.
      // A more robust solution would check if a H/W record influencing a BMI was changed.
      // Or, deleting the old BMI and letting addGrowthRecord re-evaluate IF a H or W record that was updated
      // was one of the pair that formed an existing BMI. This gets complex quickly.
      // For now, direct update. If H/W values change, BMI won't auto-update from this action alone.
      return { growthRecords: newGrowthRecords };
    }),

  deleteGrowthRecord: (recordId) =>
    set((state) => {
      const recordToDelete = state.growthRecords.find(r => r.id === recordId);
      const newGrowthRecords = state.growthRecords.filter((r) => r.id !== recordId);

      // If a Height, Weight, or Length record was deleted, we need to delete any BMI record
      // that was derived from it (i.e., at the same ageMonths for that patient).
      if (recordToDelete && (recordToDelete.measurementType === 'Height' || recordToDelete.measurementType === 'Length' || recordToDelete.measurementType === 'Weight')) {
          const finalRecords = newGrowthRecords.filter(r =>
              !(r.patientId === recordToDelete.patientId &&
                r.ageMonths === recordToDelete.ageMonths &&
                r.measurementType === 'BMI')
          );
          return { growthRecords: finalRecords };
      }
      return { growthRecords: newGrowthRecords };
    }),
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
