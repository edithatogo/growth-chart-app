import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { calculateBMI, calculateAgeInMonths } from '../utils/calculations'; // Import age calculator
import { convertToMetricForCalc } from '../utils/units';
import FHIR from 'fhirclient';
import { Client, fhirclient } from 'fhirclient/lib/client';

// --- Interfaces ---
export interface Patient {
  id: string; name: string; dob: string;
  sex: 'Male' | 'Female' | 'Other' | 'Unknown';
  condition?: string;
  isFHIRPatient?: boolean;
}
export type NewGrowthRecordData = Omit<GrowthRecord, 'id'>;
export interface GrowthRecord {
  id: string; patientId: string; date: string; ageMonths: number;
  measurementType: 'Weight' | 'Height' | 'Length' | 'HeadCircumference' | 'BMI' | 'Other';
  otherMeasurementName?: string;
  value: number; unit: 'kg' | 'lbs' | 'cm' | 'in' | 'kg/m²' | string;
  notes?: string; interventionType?: string; interventionDetails?: string;
  isFHIRRecord?: boolean;
}
export interface AppSettings {
  defaultChartType: 'WeightForAge' | 'HeightForAge' | 'HCForAge' | 'BMIForAge';
  units: 'Metric' | 'Imperial';
  darkMode: boolean; language: 'English' | 'Spanish';
  notifications: { appointmentReminders: boolean; newDataAlerts: boolean; };
}
export interface FHIRContext {
  client?: Client;
  patientId?: string;
  serverUrl?: string;
  status: FHIRStatus; // More granular status
  error?: string | null;
  isRetrieved?: boolean; // Legacy or specific check, status is primary
  isAuthorized?: boolean; // Legacy or specific check, status is primary
}

export type FHIRStatus =
  | 'idle'              // Initial state, or after user logs out/clears context
  | 'initializing'      // App is trying to initialize fhirclient.js from session or launch
  | 'authorizing'       // FHIR.oauth2.ready() is in progress or client init from stored context
  | 'no_context'        // Initialization complete, but no launch context found (e.g. direct app access)
  | 'fetch_patient'     // Fetching patient resource
  | 'fetch_growth_data' // Fetching observation (growth) data
  | 'ready'             // FHIR client is ready, patient and data (if applicable) loaded
  | 'error';            // An error occurred at some stage

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
  fetchFHIRPatientData: () => Promise<void>;
  fetchFHIRGrowthData: () => Promise<void>;
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
  fhirContext: {
    client: undefined, patientId: undefined, serverUrl: undefined,
    status: 'idle', error: null, isRetrieved: false, isAuthorized: false
  }
};

// --- Store Creator ---
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
  deletePatient: (patientId) => set((state) => {
      const remainingGrowthRecords = state.growthRecords.filter( (r) => r.patientId !== patientId );
      const newSelectedPatientId = state.selectedPatientId === patientId ? null : state.selectedPatientId;
      return {
        patients: state.patients.filter((p) => p.id !== patientId),
        growthRecords: remainingGrowthRecords,
        selectedPatientId: newSelectedPatientId,
      };
  }),
  updateGrowthRecord: (updatedRecord) => set((state) => ({ growthRecords: state.growthRecords.map((r) => r.id === updatedRecord.id ? { ...r, ...updatedRecord } : r) })),
  deleteGrowthRecord: (recordId) => set((state) => {
      const recordToDelete = state.growthRecords.find(r => r.id === recordId);
      let newGrowthRecords = state.growthRecords.filter((r) => r.id !== recordId);
      if (recordToDelete && (recordToDelete.measurementType === 'Height' || recordToDelete.measurementType === 'Length' || recordToDelete.measurementType === 'Weight')) {
          newGrowthRecords = newGrowthRecords.filter(r =>
              !(r.patientId === recordToDelete.patientId && r.ageMonths === recordToDelete.ageMonths && r.measurementType === 'BMI')
          );
      }
      return { growthRecords: newGrowthRecords };
  }),

  setFHIRContext: (context) =>
    set((state) => ({ fhirContext: { ...state.fhirContext, ...context } })),

  clearFHIRContext: () =>
    set({ fhirContext: {
      ...initialAppState.fhirContext,
      status: 'idle', // Or 'no_context' if preferred after a clear
      isRetrieved: true, // Mark as retrieved to prevent auto-reinitialization by App.tsx logic if not desired
      isAuthorized: false
    } }),

  initializeFHIRClient: async () => {
    const currentStatus = get().fhirContext.status;
    // Avoid re-initializing if already in a non-idle/non-error state, unless specifically desired
    if (currentStatus !== 'idle' && currentStatus !== 'error' && currentStatus !== 'no_context') { // Allow re-init from no_context
      // console.log("FHIR client initialization skipped, status:", currentStatus);
      return get().fhirContext.client || null;
    }

    get().setFHIRContext({ status: 'initializing', error: null, isRetrieved: false, isAuthorized: false });
    let clientInstance: Client | null = null;

    try {
        // This part simulates FHIR.oauth2.ready() which would handle redirect and get credentials
        // In our case, we try to load from sessionStorage which is populated by launch.html/index-fhir.html
        const storedContextString = sessionStorage.getItem('fhirContext');
        if (storedContextString) {
            get().setFHIRContext({ status: 'authorizing' });
            const storedContext = JSON.parse(storedContextString);

            if (storedContext.serverUrl && storedContext.tokenResponse) {
                clientInstance = FHIR.client({
                    serverUrl: storedContext.serverUrl,
                    tokenResponse: storedContext.tokenResponse
                });
                if (storedContext.patientId) {
                    clientInstance.patient.id = storedContext.patientId;
                }

                get().setFHIRContext({
                    client: clientInstance,
                    patientId: clientInstance.patient.id,
                    serverUrl: clientInstance.serverUrl,
                    status: 'ready', // Initially ready, subsequent fetches will change status
                    error: null,
                    isRetrieved: true,
                    isAuthorized: true,
                });
                // console.log("FHIR client initialized successfully from session storage.");
            } else {
                throw new Error("Stored FHIR context is incomplete (missing serverUrl or tokenResponse).");
            }
        } else {
            // console.log("No FHIR context found in session storage.");
            get().setFHIRContext({ status: 'no_context', isRetrieved: true, isAuthorized: false, error: null });
        }
    } catch (error: any) {
        console.error("Error initializing FHIR client:", error);
        get().setFHIRContext({
            status: 'error',
            error: error.message || "Failed to initialize FHIR client.",
            isRetrieved: true,
            isAuthorized: false
        });
    }
    return clientInstance;
  },

  fetchFHIRPatientData: async () => {
    const { client, patientId: currentFhirPatientIdFromContext } = get().fhirContext;

    if (!client || !client.patient?.id || !currentFhirPatientIdFromContext) {
      const errorMsg = "FHIR client not ready or patient ID missing for fetching patient data.";
      // console.warn(errorMsg);
      // Don't set error status here if initializeFHIRClient already set 'no_context' or 'error'
      if (get().fhirContext.status !== 'no_context' && get().fhirContext.status !== 'error') {
        get().setFHIRContext({ status: 'error', error: errorMsg });
      }
      return;
    }

    get().setFHIRContext({ status: 'fetch_patient', error: null });
    try {
      const fhirPatient: fhirclient.FHIR.Patient = await client.patient.read();
      // console.log("Fetched FHIR Patient:", fhirPatient);
      let name = "Unknown FHIR Patient";
      if (fhirPatient.name && fhirPatient.name.length > 0) {
          const primaryName = fhirPatient.name.find(n => n.use === 'official') || fhirPatient.name[0];
          name = `${primaryName.given?.join(" ") || ""} ${primaryName.family || ""}`.trim();
      }
      const appPatient: Patient = {
        id: `FHIR-${fhirPatient.id}`, name: name, dob: fhirPatient.birthDate || "Unknown",
        sex: (fhirPatient.gender === "male" ? "Male" : fhirPatient.gender === "female" ? "Female" : fhirPatient.gender === "other" ? "Other" : "Unknown"),
        isFHIRPatient: true,
      };
      let existingPatient = get().patients.find(p => p.id === appPatient.id);
      if (existingPatient) {
        get().updatePatient({ ...existingPatient, ...appPatient }); // Ensure all fields are spread, including isFHIRPatient
      } else {
        existingPatient = get().addPatient(appPatient); // addPatient will receive the full appPatient including isFHIRPatient
      }
      get().selectPatient(existingPatient.id);
      // Don't set error to null here, let fetchFHIRGrowthData manage the final status/error
      // get().setFHIRContext({ error: null }); // This might prematurely clear an error from init if growth data fails

      // Now that patient is processed, fetch their growth data
      await get().fetchFHIRGrowthData(); // This will set status to 'fetch_growth_data' then 'ready' or 'error'

    } catch (error: any) {
      console.error("Error fetching FHIR Patient data:", error);
      get().setFHIRContext({ status: 'error', error: error.message || "Failed to fetch FHIR patient data." });
    }
  },

  fetchFHIRGrowthData: async () => {
    const { client, patientId: fhirPatientIdFromContext } = get().fhirContext;
    const fhirAppPatient = get().patients.find(p => p.id === `FHIR-${fhirPatientIdFromContext}`);

    if (!client || !fhirPatientIdFromContext || !fhirAppPatient || !fhirAppPatient.dob || fhirAppPatient.dob === "Unknown") {
      const errorMsg = "FHIR client/patient ID not ready, or patient DOB unknown for fetching/processing growth data.";
      // console.warn(errorMsg);
       // Don't set error status here if initializeFHIRClient or fetchFHIRPatientData already set 'no_context' or 'error'
      if (get().fhirContext.status !== 'no_context' && get().fhirContext.status !== 'error') {
        get().setFHIRContext({ status: 'error', error: errorMsg });
      }
      return;
    }

    get().setFHIRContext({ status: 'fetch_growth_data', error: null });
    const loincToMeasurementType: Record<string, GrowthRecord['measurementType']> = {
      '29463-7': 'Weight', '8302-2': 'Height', '8306-3': 'Length',
      '8287-5': 'HeadCircumference', '39156-5': 'BMI',
    };
    const growthLoincCodes = Object.keys(loincToMeasurementType).join(',');

    try {
      const bundle = await client.request(`Observation?patient=${fhirPatientId}&code=${growthLoincCodes}&_sort=date&_count=100`);
      let fetchedGrowthRecords: GrowthRecord[] = [];
      if (bundle && bundle.entry && Array.isArray(bundle.entry)) {
        const observations = bundle.entry.map((entry: any) => entry.resource as fhirclient.FHIR.Observation);
        observations.forEach(obs => {
          if (obs.valueQuantity && obs.effectiveDateTime) {
            const loincCode = obs.code?.coding?.[0]?.code;
            const measurementType = loincCode ? loincToMeasurementType[loincCode] : undefined;
            if (measurementType) {
              let unit = obs.valueQuantity.unit || obs.valueQuantity.code || '';
              if (unit === 'kg' || unit.toLowerCase() === 'kilograms') unit = 'kg';
              else if (unit === '[lb_av]' || unit.toLowerCase() === 'pounds') unit = 'lbs';
              else if (unit === 'cm' || unit.toLowerCase() === 'centimeters') unit = 'cm';
              else if (unit === '[in_i]' || unit.toLowerCase() === 'inches') unit = 'in';
              else if (unit === 'kg/m2') unit = 'kg/m²';
              const ageMonths = calculateAgeInMonths(fhirAppPatient.dob, obs.effectiveDateTime);
              if (!isNaN(obs.valueQuantity.value!) && !isNaN(ageMonths)) {
                fetchedGrowthRecords.push({
                  id: `FHIR-${obs.id}`, patientId: fhirAppPatient.id,
                  date: obs.effectiveDateTime.split('T')[0], ageMonths: ageMonths,
                  measurementType: measurementType, value: obs.valueQuantity.value!,
                  unit: unit as GrowthRecord['unit'],
                  isFHIRRecord: true,
                });
              }
            }
          }
        });
      }
      set((state) => {
        const otherPatientRecords = state.growthRecords.filter(r => r.patientId !== fhirAppPatient.id);
        const newTotalRecords = [...otherPatientRecords, ...fetchedGrowthRecords];
        const patientRecordsPostFetch = newTotalRecords.filter(r => r.patientId === fhirAppPatient.id);
        const uniqueAgeMonths = [...new Set(patientRecordsPostFetch.filter(r => r.measurementType === 'Weight' || r.measurementType === 'Height' || r.measurementType === 'Length').map(r => r.ageMonths))];
        let recordsIncludingNewBMIs = [...newTotalRecords];
        uniqueAgeMonths.forEach(age => {
            const weightRecord = patientRecordsPostFetch.find(r => r.ageMonths === age && r.measurementType === 'Weight');
            const heightRecord = patientRecordsPostFetch.find(r => r.ageMonths === age && (r.measurementType === 'Height' || r.measurementType === 'Length'));
            if (weightRecord && heightRecord) {
                const weightInKg = convertToMetricForCalc(weightRecord.value, weightRecord.unit as GrowthRecord['unit']);
                const heightInCm = convertToMetricForCalc(heightRecord.value, heightRecord.unit as GrowthRecord['unit']);
                const recordDate = new Date(weightRecord.date) > new Date(heightRecord.date) ? weightRecord.date : heightRecord.date;
                if (!isNaN(weightInKg) && !isNaN(heightInCm) && heightInCm > 0) {
                    const bmi = calculateBMI(weightInKg, heightInCm);
                    if (!isNaN(bmi)) {
                        const existingBMIRecordIndex = recordsIncludingNewBMIs.findIndex((r) => r.patientId === fhirAppPatient.id && r.ageMonths === age && r.measurementType === 'BMI');
                        if (existingBMIRecordIndex > -1) {
                            recordsIncludingNewBMIs[existingBMIRecordIndex] = { ...recordsIncludingNewBMIs[existingBMIRecordIndex], value: bmi, date: recordDate,};
                        } else {
                            recordsIncludingNewBMIs.push({
                                id: uuidv4(), patientId: fhirAppPatient.id, ageMonths: age, date: recordDate,
                                measurementType: 'BMI', value: bmi, unit: 'kg/m²',
                            });
                        }}}}});
        return {
          growthRecords: recordsIncludingNewBMIs,
          fhirContext: { ...get().fhirContext, status: 'ready', error: null }
        };
      });
    } catch (error: any) {
      console.error("Error fetching/mapping FHIR growth data:", error);
      get().setFHIRContext({ status: 'error', error: error.message || "Failed to fetch/map FHIR growth data." });
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
      partialize: (state) => ({
        ...state,
        fhirContext: {
            patientId: state.fhirContext.patientId,
            serverUrl: state.fhirContext.serverUrl,
            error: state.fhirContext.error,
            isRetrieved: state.fhirContext.isRetrieved,
            isAuthorized: state.fhirContext.isAuthorized,
        }
      })
    }
  )
);

// --- Helper Hooks ---
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
