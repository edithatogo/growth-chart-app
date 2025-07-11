import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { calculateBMI } from '../utils/calculations';
import { convertToMetricForCalc } from '../utils/units';
import FHIR from 'fhirclient'; // Import fhirclient for FHIR.client and types
import { Client,fhirclient } from 'fhirclient/lib/client'; // Import Client type directly
// fhirclient.FHIR.Patient etc for FHIR resource types if needed, or use a more specific import

// --- Interfaces ---
export interface Patient {
  id: string; name: string; dob: string;
  sex: 'Male' | 'Female' | 'Other' | 'Unknown';
  condition?: string;
}
export type NewGrowthRecordData = Omit<GrowthRecord, 'id'>;
export interface GrowthRecord {
  id: string; patientId: string; date: string; ageMonths: number;
  measurementType: 'Weight' | 'Height' | 'Length' | 'HeadCircumference' | 'BMI' | 'Other';
  otherMeasurementName?: string;
  value: number; unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²' | string;
  notes?: string; interventionType?: string; interventionDetails?: string;
}
export interface AppSettings {
  defaultChartType: 'WeightForAge' | 'HeightForAge' | 'HCForAge' | 'BMIForAge';
  units: 'Metric' | 'Imperial';
  darkMode: boolean; language: 'English' | 'Spanish';
  notifications: { appointmentReminders: boolean; newDataAlerts: boolean; };
}
export interface FHIRContext {
  client?: Client; // The fhirclient instance
  patientId?: string; // FHIR Patient ID
  serverUrl?: string;
  error?: string | null;
  isRetrieved?: boolean; // Flag if context was attempted to be retrieved from session
  isAuthorized?: boolean; // Flag if successfully authorized and client is ready
}
export interface AppStateValues {
  patients: Patient[]; growthRecords: GrowthRecord[]; settings: AppSettings;
  selectedPatientId: string | null; fhirContext: FHIRContext;
}
export interface AppStateActions {
  addPatient: (patientData: Omit<Patient, 'id'>) => Patient;
  selectPatient: (patientId: string | null) => void;
  addGrowthRecord: (recordData: NewGrowthRecordData) => GrowthRecord;
  _addOrUpdateBMIRecordInternal: (patientId: string, ageMonths: number, date: string, bmiValue: number) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  getPatientById: (patientId: string) => Patient | undefined;
  getRecordsForPatient: (patientId: string) => GrowthRecord[];
  updatePatient: (updatedPatient: Patient) => void;
  deletePatient: (patientId: string) => void;
  updateGrowthRecord: (updatedRecord: GrowthRecord) => void;
  deleteGrowthRecord: (recordId: string) => void;
  initializeFHIRClient: () => Promise<Client | null>;
  setFHIRContext: (context: Partial<FHIRContext>) => void;
  clearFHIRContext: () => void;
  fetchFHIRPatientData: () => Promise<void>; // Fetches FHIR patient and potentially syncs
}
export type AppStoreState = AppStateValues & AppStateActions;

// --- Initial State ---
export const initialAppState: AppStateValues = {
  patients: [], growthRecords: [],
  settings: {
    defaultChartType: 'WeightForAge', units: 'Metric', darkMode: false, language: 'English',
    notifications: { appointmentReminders: true, newDataAlerts: false },
  },
  selectedPatientId: null,
  fhirContext: { client: undefined, patientId: undefined, serverUrl: undefined, error: null, isRetrieved: false, isAuthorized: false }
};

// --- Store Creator ---
export const storeCreator: StateCreator<AppStoreState> = (set, get) => ({
  ...initialAppState,

  // Patient & Record CRUD (existing actions remain largely the same)
  addPatient: (patientData) => { /* ... */
    const newPatient = { ...patientData, id: uuidv4() };
    set((state) => ({ patients: [...state.patients, newPatient] }));
    return newPatient;
  },
  selectPatient: (patientId) => set({ selectedPatientId: patientId }),
  _addOrUpdateBMIRecordInternal: (patientId, ageMonths, date, bmiValue) => { /* ... */
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
  addGrowthRecord: (recordData) => { /* ... includes call to _addOrUpdateBMIRecordInternal and convertToMetricForCalc for BMI ... */
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
        heightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && (r.measurementType === 'Height' || r.measurementType === 'Length') && r.id !== newRecord.id );
        if (!heightRecordForBMI) heightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && (r.measurementType === 'Height' || r.measurementType === 'Length'));
      } else {
        heightRecordForBMI = newRecord;
        weightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && r.measurementType === 'Weight' && r.id !== newRecord.id );
        if (!weightRecordForBMI) weightRecordForBMI = growthRecords.find( (r) => r.patientId === patientId && r.ageMonths === ageMonths && r.measurementType === 'Weight');
      }

      if (weightRecordForBMI && heightRecordForBMI) {
          if (new Date(weightRecordForBMI.date) > new Date(heightRecordForBMI.date)) recordDate = weightRecordForBMI.date; else recordDate = heightRecordForBMI.date;
          if(newRecord.id === weightRecordForBMI.id || newRecord.id === heightRecordForBMI.id) recordDate = newRecord.date;

        const weightInKg = convertToMetricForCalc(weightRecordForBMI.value, weightRecordForBMI.unit as GrowthRecord['unit']);
        const heightInCm = convertToMetricForCalc(heightRecordForBMI.value, heightRecordForBMI.unit as GrowthRecord['unit']);
        if (!isNaN(weightInKg) && !isNaN(heightInCm) && heightInCm > 0) {
            const bmi = calculateBMI(weightInKg, heightInCm);
            if (!isNaN(bmi)) _addOrUpdateBMIRecordInternal(patientId, ageMonths, recordDate, bmi);
        }
      }
    }
    return newRecord;
  },
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  getPatientById: (patientId) => get().patients.find(p => p.id === patientId),
  getRecordsForPatient: (patientId) => get().growthRecords.filter(r => r.patientId === patientId),
  updatePatient: (updatedPatient) => set((state) => ({ patients: state.patients.map((p) => p.id === updatedPatient.id ? { ...p, ...updatedPatient } : p) })),
  deletePatient: (patientId) => set((state) => { /* ... */
      const remainingGrowthRecords = state.growthRecords.filter( (r) => r.patientId !== patientId );
      const newSelectedPatientId = state.selectedPatientId === patientId ? null : state.selectedPatientId;
      return {
        patients: state.patients.filter((p) => p.id !== patientId),
        growthRecords: remainingGrowthRecords,
        selectedPatientId: newSelectedPatientId,
      };
  }),
  updateGrowthRecord: (updatedRecord) => set((state) => ({ growthRecords: state.growthRecords.map((r) => r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r) })),
  deleteGrowthRecord: (recordId) => set((state) => { /* ... includes BMI cascade delete ... */
      const recordToDelete = state.growthRecords.find(r => r.id === recordId);
      let newGrowthRecords = state.growthRecords.filter((r) => r.id !== recordId);
      if (recordToDelete && (recordToDelete.measurementType === 'Height' || recordToDelete.measurementType === 'Length' || recordToDelete.measurementType === 'Weight')) {
          newGrowthRecords = newGrowthRecords.filter(r =>
              !(r.patientId === recordToDelete.patientId && r.ageMonths === recordToDelete.ageMonths && r.measurementType === 'BMI')
          );
      }
      return { growthRecords: newGrowthRecords };
  }),

  // --- FHIR Actions Implementation ---
  setFHIRContext: (context) =>
    set((state) => ({ fhirContext: { ...state.fhirContext, ...context } })),

  clearFHIRContext: () => // Also sets isRetrieved to true, indicating an attempt was made or context cleared.
    set({ fhirContext: { ...initialAppState.fhirContext, isRetrieved: true, isAuthorized: false } }),

  initializeFHIRClient: async () => {
    const currentFhirContext = get().fhirContext;
    if (currentFhirContext.client || currentFhirContext.isRetrieved) {
        // If already attempted or initialized, return current client or null
        get().setFHIRContext({ isRetrieved: true }); // Ensure isRetrieved is true
        return currentFhirContext.client || null;
    }

    let clientInstance: Client | null = null;
    try {
        const storedContextString = sessionStorage.getItem('fhirContext');
        if (storedContextString) {
            const storedContext = JSON.parse(storedContextString);
            if (storedContext.serverUrl && storedContext.tokenResponse) {
                // Re-initialize the client object from stored state.
                // The fhirclient instance itself is not directly serializable.
                clientInstance = FHIR.client({
                    serverUrl: storedContext.serverUrl,
                    tokenResponse: storedContext.tokenResponse,
                });
                // If patientId was also stored, pass it to ensure client.patient.id is set
                if (storedContext.patientId) {
                    clientInstance.patient.id = storedContext.patientId;
                }

                get().setFHIRContext({
                    client: clientInstance,
                    patientId: clientInstance.patient.id, // Should be set by FHIR.client if tokenResponse has patient
                    serverUrl: clientInstance.serverUrl,
                    error: null,
                    isRetrieved: true,
                    isAuthorized: true,
                });
                // sessionStorage.removeItem('fhirContext'); // Good practice to clear after use
            } else { throw new Error("Stored FHIR context is incomplete."); }
        } else {
             get().setFHIRContext({ isRetrieved: true, error: null, isAuthorized: false }); // No stored context
        }
    } catch (error: any) {
        console.error("Error initializing FHIR client from session storage:", error);
        get().setFHIRContext({ error: error.message || "Failed to initialize FHIR client.", isRetrieved: true, isAuthorized: false });
    }
    return clientInstance;
  },

  fetchFHIRPatientData: async () => {
    const { client } = get().fhirContext; // client should have patientId if properly initialized by SMART launch
    const currentFhirPatientId = get().fhirContext.patientId;

    if (!client || !client.patient?.id || !currentFhirPatientId) {
      const errorMsg = "FHIR client not ready or patient ID missing for fetching patient data.";
      console.warn(errorMsg);
      get().setFHIRContext({ error: errorMsg });
      return;
    }

    try {
      const fhirPatient: fhirclient.FHIR.Patient = await client.patient.read(); // client.patient.read() uses client.patient.id
      console.log("Fetched FHIR Patient:", fhirPatient);

      let name = "Unknown FHIR Patient";
      if (fhirPatient.name && fhirPatient.name.length > 0) {
          const primaryName = fhirPatient.name.find(n => n.use === 'official') || fhirPatient.name[0];
          name = `${primaryName.given?.join(" ") || ""} ${primaryName.family || ""}`.trim();
      }

      const appPatient: Patient = {
        id: `FHIR-${fhirPatient.id}`,
        name: name,
        dob: fhirPatient.birthDate || "Unknown",
        sex: (fhirPatient.gender === "male" ? "Male" : fhirPatient.gender === "female" ? "Female" : fhirPatient.gender === "other" ? "Other" : "Unknown"),
        // condition: TODO: map from FHIR Condition resource if needed
      };

      let existingPatient = get().patients.find(p => p.id === appPatient.id);
      if (existingPatient) {
        get().updatePatient(appPatient);
      } else {
        existingPatient = get().addPatient(appPatient);
      }
      get().selectPatient(existingPatient.id);
      get().setFHIRContext({ error: null });

    } catch (error: any) {
      console.error("Error fetching FHIR Patient data:", error);
      get().setFHIRContext({ error: error.message || "Failed to fetch FHIR patient data." });
    }
  }
});

// --- Main Store Hook ---
export const useAppStore = create<AppStoreState>()(
  persist(
    storeCreator,
    {
      name: 'growth-chart-app-storage',
      storage: createJSONStorage(() => localStorage),
      // Note: Persisting the fhirclient instance itself is problematic as it's complex and may contain non-serializable parts.
      // The initializeFHIRClient action re-constructs it from serializable parts (tokenResponse, serverUrl).
      // So, we might want to partialize the fhirContext to only store serializable bits if client itself causes issues.
      // For now, the default behavior of persist might handle it, or it might store an empty object for client.
      // A custom partialize or merge function for fhirContext might be needed for robust persistence of the client state.
      // Let's partialize to avoid storing the client instance directly.
      partialize: (state) => ({
        ...state,
        fhirContext: {
            // DO NOT persist client instance directly
            patientId: state.fhirContext.patientId,
            serverUrl: state.fhirContext.serverUrl,
            error: state.fhirContext.error, // Persist error state
            isRetrieved: state.fhirContext.isRetrieved, // Persist if retrieval was attempted
            isAuthorized: state.fhirContext.isAuthorized, // Persist authorization status
            // tokenResponse could be stored here if needed for re-auth without full launch,
            // but initializeFHIRClient expects it from sessionStorage set by index-fhir.html
        }
      })
    }
  )
);

// --- Helper Hooks ---
export const useCurrentPatient = (): Patient | null => { /* ... */
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const getPatientById = useAppStore((state) => state.getPatientById);
  if (!selectedPatientId) return null;
  return getPatientById(selectedPatientId) || null;
};
export const useCurrentPatientRecords = (): GrowthRecord[] => { /* ... */
  const selectedPatientId = useAppStore((state) => state.selectedPatientId);
  const getRecordsForPatient = useAppStore((state) => state.getRecordsForPatient);
  if (!selectedPatientId) return [];
  return getRecordsForPatient(selectedPatientId);
};

export default useAppStore;
